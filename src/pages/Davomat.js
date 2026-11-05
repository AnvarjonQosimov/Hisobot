import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth, db } from "../Firebase/Firebase";
import {
  saveAttendanceWorkerData,
  saveBossCabinet,
  syncAttendanceWorkerAccess,
} from "../auth/firestoreOwnership";
import AttendanceCamera from "../components/AttendanceCamera";
import {
  getAttendanceDay,
  getAttendanceFaceId,
} from "../utils/attendance";
import "../styles/Davomat.css";

const EMPTY_ATTENDANCE_DATA = {
  workers: [],
  overrides: {},
  hiddenWorkerIds: [],
  workDays: [1, 2, 3, 4, 5],
  trackingStartDay: "",
  startTime: "",
};

const readStoredWorkers = (key) => {
  const storedWorkers = localStorage.getItem(key);
  if (!storedWorkers) return [];

  try {
    const parsedWorkers = JSON.parse(storedWorkers);
    if (!Array.isArray(parsedWorkers)) {
      throw new Error("Stored worker data is not an array.");
    }
    return parsedWorkers;
  } catch (error) {
    console.error("Failed to load workers for attendance:", error);
    return [];
  }
};

const normalizeAttendanceData = (data) => ({
  workers: Array.isArray(data?.workers) ? data.workers : [],
  overrides:
    data?.overrides && typeof data.overrides === "object" && !Array.isArray(data.overrides)
      ? { ...data.overrides }
      : {},
  hiddenWorkerIds: Array.isArray(data?.hiddenWorkerIds)
    ? [...data.hiddenWorkerIds].map(String)
    : [],
  workDays: Array.isArray(data?.workDays) ? [...data.workDays] : [1, 2, 3, 4, 5],
  trackingStartDay: typeof data?.trackingStartDay === "string" ? data.trackingStartDay : "",
  startTime: typeof data?.startTime === "string" ? data.startTime : "",
});

const makeWorker = (workerName, workerCode) => ({
  id: Date.now(),
  workerName,
  workerCode,
  amountToReceive: "0",
  currencyToReceive: "sum",
  dateToGive: "",
  amountAlreadyReceived: "0",
  currencyAlreadyReceived: "sum",
  dateAlreadyReceived: "",
  currentWork: "",
  workPercent: "",
  prevWork: "",
  prevWorkPercent: "",
  createdAt: new Date().toISOString(),
  isPaid: false,
  history: [],
});

const getDayOfWeek = (dayKey) => {
  const [year, month, day] = dayKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
};

const getDateFromDayKey = (dayKey) => new Date(`${dayKey}T00:00:00.000Z`);

const getCheckInTime = (record) => {
  const timestamp = record.checkedInAt;
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getFaceRegistrationDay = (faces) => {
  const poses = ["front", "left", "right"].map((pose) => faces?.[pose]);
  if (poses.some((face) => !face?.imageData || !(face.registeredAt instanceof Date))) {
    return "";
  }
  const latestRegistration = poses
    .map((face) => face.registeredAt)
    .sort((left, right) => right - left)[0];
  return getAttendanceDay(latestRegistration);
};

const getNextAttendanceDay = (dayKey) => {
  const date = getDateFromDayKey(dayKey);
  date.setUTCDate(date.getUTCDate() + 1);
  return getAttendanceDay(date);
};

const compareCheckIn = (record, startTime) => {
  const checkInDate = getCheckInTime(record);
  if (!checkInDate || !startTime) return "onTime";
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const scheduledMinutes = startHour * 60 + startMinute;
  const arrivalMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
  return arrivalMinutes > scheduledMinutes ? "late" : "onTime";
};

const getWorkerAttendanceStats = (worker, records, attendanceData, now, faces) => {
  const schedule = attendanceData.workDays || [];
  const startDay = attendanceData.trackingStartDay;
  const startTime = attendanceData.startTime;
  const registeredPoses = Object.values(faces || {}).filter((face) => face?.imageData);
  const faceRegistrationDay = getFaceRegistrationDay(faces);
  if (!startDay || !startTime || !registeredPoses.length || !faceRegistrationDay) {
    return { onTime: 0, late: 0, absent: 0, todayStatus: "", history: [] };
  }

  const createdAt = worker.createdAt ? new Date(worker.createdAt) : null;
  const workerStartDay =
    createdAt && !Number.isNaN(createdAt.getTime()) ? getAttendanceDay(createdAt) : startDay;
  const firstDayOptions = [
    workerStartDay,
    startDay,
    getNextAttendanceDay(faceRegistrationDay),
  ].sort();
  const firstDay = firstDayOptions[firstDayOptions.length - 1];
  const today = getAttendanceDay(now);
  const matchingRecords = records
    .filter((record) => String(record.workerId) === String(worker.id))
    .reduce((recordMap, record) => {
      recordMap[record.dateKey] = record;
      return recordMap;
    }, {});
  const stats = { onTime: 0, late: 0, absent: 0, todayStatus: "", history: [] };

  for (
    let date = getDateFromDayKey(firstDay);
    getAttendanceDay(date) <= today;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const dateKey = getAttendanceDay(date);
    if (!schedule.includes(getDayOfWeek(dateKey))) continue;
    const record = matchingRecords[dateKey];
    let status = "";
    if (record) {
      status = compareCheckIn(record, startTime);
    } else {
      const cutoff = new Date(`${dateKey}T${startTime}:00`);
      if (now >= cutoff) status = "absent";
    }

    if (!status) continue;
    stats[status] += 1;
    if (dateKey === today) stats.todayStatus = status;
    stats.history.push({ dateKey, status, record });
  }

  return { ...stats, history: stats.history.reverse() };
};

function Davomat() {
  const { t, i18n } = useTranslation();
  const [ownerEmail, setOwnerEmail] = useState("");
  const [workers, setWorkers] = useState([]);
  const [workerObjects, setWorkerObjects] = useState([]);
  const [attendanceData, setAttendanceData] = useState(EMPTY_ATTENDANCE_DATA);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [faceImages, setFaceImages] = useState({});
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [zoomedPhoto, setZoomedPhoto] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [faceToDelete, setFaceToDelete] = useState(null);
  const [selectedAttendanceStat, setSelectedAttendanceStat] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [selectedWorkDays, setSelectedWorkDays] = useState([1, 2, 3, 4, 5]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [workerName, setWorkerName] = useState("");
  const [workerCode, setWorkerCode] = useState("");
  const [syncWithAllWorkers, setSyncWithAllWorkers] = useState(false);
  const [deleteWorker, setDeleteWorker] = useState(null);
  const [syncDeleteWithAllWorkers, setSyncDeleteWithAllWorkers] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState(null);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showDismissUndoConfirm, setShowDismissUndoConfirm] = useState(false);
  const [startTime, setStartTime] = useState("");
  const syncedAttendanceWorkerKeys = useRef(new Set());

  const attendanceWorkers = useMemo(() => {
    const hiddenIds = new Set(attendanceData.hiddenWorkerIds);
    const masterWorkers = workers
      .filter((worker) => !hiddenIds.has(String(worker.id)))
      .map((worker) => ({
        ...worker,
        ...(attendanceData.overrides[String(worker.id)] || {}),
        id: worker.id,
        source: "master",
      }));
    return [
      ...masterWorkers,
      ...attendanceData.workers.map((worker) => ({ ...worker, source: "attendance" })),
    ];
  }, [workers, attendanceData]);

  const workerStats = useMemo(
    () =>
      attendanceWorkers.reduce((stats, worker) => {
        stats[String(worker.id)] = getWorkerAttendanceStats(
          worker,
          attendanceRecords,
          attendanceData,
          currentTime,
          faceImages[String(worker.id)],
        );
        return stats;
      }, {}),
    [attendanceWorkers, attendanceRecords, attendanceData, currentTime, faceImages],
  );

  const totalAttendanceStats = useMemo(
    () =>
      Object.values(workerStats).reduce(
        (total, stats) => ({
          onTime: total.onTime + stats.onTime,
          late: total.late + stats.late,
          absent: total.absent + stats.absent,
        }),
        { onTime: 0, late: 0, absent: 0 },
      ),
    [workerStats],
  );

  const attendanceStatDetails = useMemo(
    () =>
      ["onTime", "late", "absent"].reduce((details, status) => {
        details[status] = attendanceWorkers.reduce(
          (groups, worker) => {
            const count = workerStats[String(worker.id)]?.[status] || 0;
            if (count) {
              const group = worker.source === "master" ? "shared" : "attendanceOnly";
              groups[group].total += count;
              groups[group].workers.push({ worker, count });
            }
            return groups;
          },
          {
            shared: { total: 0, workers: [] },
            attendanceOnly: { total: 0, workers: [] },
          },
        );
        return details;
      }, {}),
    [attendanceWorkers, workerStats],
  );

  const checkInsByWorker = useMemo(
    () => {
      const recordsByWorker = attendanceRecords.reduce((workerRecords, record) => {
        const workerId = String(record.workerId);
        if (!workerRecords[workerId]) workerRecords[workerId] = [];
        workerRecords[workerId].push(record);
        return workerRecords;
      }, {});
      Object.values(recordsByWorker).forEach((records) => {
        records.sort((a, b) => {
          const timeA = getCheckInTime(a)?.getTime() || 0;
          const timeB = getCheckInTime(b)?.getTime() || 0;
          return timeB - timeA;
        });
      });
      return recordsByWorker;
    },
    [attendanceRecords],
  );

  useEffect(() => {
    let unsubscribeData = () => {};
    let currentOwnerEmail = "";
    let isCurrent = true;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeData();
      unsubscribeData = () => {};

      const sessionEmail = localStorage.getItem("userEmail")?.toLowerCase();
      const role = localStorage.getItem("role");
      const assistantEmail = user?.email?.toLowerCase();
      const bossEmail = role === "assistant"
        ? localStorage.getItem("bossEmail")?.toLowerCase()
        : assistantEmail;

      if (!user?.email || assistantEmail !== sessionEmail || !bossEmail) {
        setOwnerEmail("");
        setWorkers([]);
        setWorkerObjects([]);
        setAttendanceData(EMPTY_ATTENDANCE_DATA);
        setIsOwner(false);
        setIsLoading(false);
        return;
      }

      currentOwnerEmail = bossEmail;
      setOwnerEmail(bossEmail);
      setIsOwner(role === "boss" && assistantEmail === bossEmail);
      setIsLoading(true);

      if (role === "assistant") {
        const snapshotId = encodeURIComponent(`${bossEmail}:workers:root`);
        unsubscribeData = onSnapshot(
          doc(db, "assistantSectionSnapshots", snapshotId),
          (snapshot) => {
            const snapshotWorkers = snapshot.data()?.data?.workers;
            if (Array.isArray(snapshotWorkers)) setWorkers(snapshotWorkers);
            setIsLoading(false);
          },
          (error) => {
            console.error("Failed to load assistant attendance workers:", error);
            setIsLoading(false);
          },
        );
        return;
      }

      const workersKey = `workers_${bossEmail}`;
      const attendanceKey = `attendanceData_${bossEmail}`;
      setWorkers(readStoredWorkers(workersKey));
      setWorkerObjects(readStoredWorkers(`workerObjects_${bossEmail}`));
      try {
        const storedAttendanceData = localStorage.getItem(attendanceKey);
        const savedAttendanceData = storedAttendanceData
          ? normalizeAttendanceData(JSON.parse(storedAttendanceData))
          : EMPTY_ATTENDANCE_DATA;
        setAttendanceData(savedAttendanceData);
        setSelectedWorkDays([...savedAttendanceData.workDays]);
        setStartTime(
          savedAttendanceData.startTime ||
            readStoredWorkers(workersKey).find((worker) => worker.startTime)?.startTime ||
            "",
        );
      } catch (error) {
        console.error("Failed to load saved attendance workers:", error);
        setAttendanceData(EMPTY_ATTENDANCE_DATA);
      }

      const unsubscribeCabinet = onSnapshot(
        doc(db, "cabinets", bossEmail),
        (snapshot) => {
          if (!isCurrent || currentOwnerEmail !== bossEmail) return;
          const cabinet = snapshot.data() || {};
          if (Array.isArray(cabinet.workers)) {
            setWorkers(cabinet.workers);
            localStorage.setItem(workersKey, JSON.stringify(cabinet.workers));
          }
          if (Array.isArray(cabinet.workerObjects)) {
            setWorkerObjects(cabinet.workerObjects);
            localStorage.setItem(`workerObjects_${bossEmail}`, JSON.stringify(cabinet.workerObjects));
          }
          if (cabinet.attendanceData) {
            const nextAttendanceData = normalizeAttendanceData(cabinet.attendanceData);
            setAttendanceData(nextAttendanceData);
            setStartTime(
              nextAttendanceData.startTime ||
                cabinet.workers?.find((worker) => worker.startTime)?.startTime ||
                "",
            );
            localStorage.setItem(attendanceKey, JSON.stringify(nextAttendanceData));
            if (role === "boss" && nextAttendanceData.workers.length) {
              const workersWithCodes = nextAttendanceData.workers.filter(
                (worker) => worker.workerCode?.trim(),
              );
              const syncKey = JSON.stringify(
                [bossEmail, ...workersWithCodes.map((worker) => [worker.id, worker.workerCode])],
              );
              if (
                workersWithCodes.length &&
                !syncedAttendanceWorkerKeys.current.has(syncKey)
              ) {
                syncedAttendanceWorkerKeys.current.add(syncKey);
                syncAttendanceWorkerAccess(bossEmail, workersWithCodes).catch((error) => {
                  console.error("Could not activate existing attendance worker codes:", error);
                  window.alert(
                    "Ba'zi Davomat ishchilarining kirish kodlarini faollashtirib bo'lmadi. Firestore Rules yangilanganini tekshiring.",
                  );
                });
              }
            }
          }
          setIsLoading(false);
        },
        (error) => {
          console.error("Failed to sync attendance workers:", error);
          setIsLoading(false);
        },
      );
      const unsubscribeRecords = onSnapshot(
        query(
          collection(db, "attendanceRecords"),
          where("bossEmail", "==", bossEmail),
          where("ownerEmail", "==", bossEmail),
        ),
        (snapshot) => {
          setAttendanceRecords(snapshot.docs.map((record) => record.data()));
        },
        (error) => {
          console.error("Failed to load attendance history:", error);
        },
      );
      const unsubscribeFaces = onSnapshot(
        query(
          collection(db, "attendanceFaces"),
          where("bossEmail", "==", bossEmail),
          where("ownerEmail", "==", bossEmail),
        ),
        (snapshot) => {
          setFaceImages(
            snapshot.docs.reduce((images, faceDoc) => {
              const { workerId, pose, imageData, registeredAt, updatedAt } = faceDoc.data();
              if (!images[String(workerId)]) images[String(workerId)] = {};
              images[String(workerId)][pose] = {
                imageData,
                registeredAt: registeredAt?.toDate?.() || updatedAt?.toDate?.() || new Date(),
              };
              return images;
            }, {}),
          );
        },
        (error) => {
          console.error("Failed to load worker face photos:", error);
        },
      );
      unsubscribeData = () => {
        unsubscribeCabinet();
        unsubscribeRecords();
        unsubscribeFaces();
      };
    });

    return () => {
      isCurrent = false;
      unsubscribeAuth();
      unsubscribeData();
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  const persistChanges = async (nextAttendanceData, nextWorkers, recordUndo = true) => {
    if (!isOwner || !ownerEmail || auth.currentUser?.email?.toLowerCase() !== ownerEmail) {
      throw new Error("Only the cabinet owner can change attendance workers.");
    }

    const previousState = recordUndo
      ? {
          attendanceData: normalizeAttendanceData(attendanceData),
          workers: JSON.parse(JSON.stringify(workers)),
          masterWorkersChanged: Boolean(nextWorkers),
        }
      : null;
    const payload = {
      attendanceData: nextAttendanceData,
      ...(nextWorkers && {
        workers: nextWorkers,
        workerObjects,
      }),
    };
    await saveBossCabinet(ownerEmail, payload);
    setAttendanceData(nextAttendanceData);
    localStorage.setItem(`attendanceData_${ownerEmail}`, JSON.stringify(nextAttendanceData));
    if (previousState) setUndoSnapshot(previousState);
    if (nextWorkers) {
      setWorkers(nextWorkers);
      localStorage.setItem(`workers_${ownerEmail}`, JSON.stringify(nextWorkers));
    }
  };

  const handleUndo = async () => {
    if (!undoSnapshot || isSaving) return;
    setIsSaving(true);
    try {
      await persistChanges(
        undoSnapshot.attendanceData,
        undoSnapshot.masterWorkersChanged ? undoSnapshot.workers : null,
        false,
      );
      setUndoSnapshot(null);
      setShowUndoConfirm(false);
    } catch (error) {
      console.error("Failed to undo attendance change:", error);
      window.alert(t("attendance_undo_failed"));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleWorkDay = (day) => {
    setSelectedWorkDays((currentDays) =>
      currentDays.includes(day)
        ? currentDays.filter((currentDay) => currentDay !== day)
        : [...currentDays, day].sort((a, b) => a - b),
    );
  };

  const handleSaveWorkDays = async () => {
    if (selectedWorkDays.length === 0 || !startTime || isSaving) return;
    const nextAttendanceData = normalizeAttendanceData(attendanceData);
    nextAttendanceData.workDays = [...selectedWorkDays];
    nextAttendanceData.startTime = startTime;
    if (!nextAttendanceData.trackingStartDay) {
      nextAttendanceData.trackingStartDay = getAttendanceDay();
    }

    setIsSaving(true);
    try {
      await persistChanges(nextAttendanceData);
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Failed to save attendance work days:", error);
      window.alert(t("attendance_schedule_save_failed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestartAttendanceTracking = async () => {
    if (isSaving) return;
    const nextAttendanceData = normalizeAttendanceData(attendanceData);
    nextAttendanceData.trackingStartDay = getAttendanceDay();
    setIsSaving(true);
    try {
      await persistChanges(nextAttendanceData);
      setShowRestartConfirm(false);
    } catch (error) {
      console.error("Failed to restart attendance tracking:", error);
      window.alert(t("attendance_restart_failed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFaceCapture = async (imageData) => {
    if (!cameraTarget || !selectedWorker || !isOwner) return;
    const faceId = getAttendanceFaceId(ownerEmail, cameraTarget.workerId, cameraTarget.pose);
    setIsSaving(true);
    try {
      await setDoc(doc(db, "attendanceFaces", faceId), {
        bossEmail: ownerEmail,
        ownerEmail,
        ownerUid: auth.currentUser.uid,
        workerId: String(cameraTarget.workerId),
        pose: cameraTarget.pose,
        imageData,
        registeredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setFaceImages((currentImages) => ({
        ...currentImages,
        [String(cameraTarget.workerId)]: {
          ...(currentImages[String(cameraTarget.workerId)] || {}),
          [cameraTarget.pose]: { imageData, registeredAt: new Date() },
        },
      }));
      setCameraTarget(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFace = async (workerId, pose) => {
    if (!isOwner || isSaving) return;
    const faceId = getAttendanceFaceId(ownerEmail, workerId, pose);
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, "attendanceFaces", faceId));
      setFaceImages((currentImages) => {
        const nextImages = { ...currentImages };
        const workerFaces = { ...(nextImages[String(workerId)] || {}) };
        delete workerFaces[pose];
        if (Object.keys(workerFaces).length) {
          nextImages[String(workerId)] = workerFaces;
        } else {
          delete nextImages[String(workerId)];
        }
        return nextImages;
      });
      setFaceToDelete(null);
    } catch (error) {
      console.error("Could not delete attendance face photo:", error);
      window.alert(t("attendance_face_delete_failed"));
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingWorker(null);
    setWorkerName("");
    setWorkerCode("");
    setSyncWithAllWorkers(false);
    setIsModalOpen(true);
  };

  const openEditModal = (worker) => {
    setEditingWorker(worker);
    setWorkerName(worker.workerName || "");
    setWorkerCode(worker.workerCode || "");
    setSyncWithAllWorkers(worker.source === "master");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingWorker(null);
  };

  const handleSaveWorker = async (event) => {
    event.preventDefault();
    const trimmedName = workerName.trim();
    const trimmedCode = workerCode.trim();
    if (!trimmedName || isSaving) return;

    const updatedWorker = editingWorker
      ? { ...editingWorker, workerName: trimmedName, workerCode: trimmedCode }
      : makeWorker(trimmedName, trimmedCode);
    const duplicateWorker = attendanceWorkers.find(
      (worker) =>
        String(worker.id) !== String(updatedWorker.id) &&
        worker.workerCode?.trim() === trimmedCode &&
        trimmedCode,
    );
    if (duplicateWorker) {
      window.alert(t("attendance_duplicate_code"));
      return;
    }

    const shouldIssueInviteCode = Boolean(trimmedCode);
    const nextAttendanceData = normalizeAttendanceData(attendanceData);
    let nextWorkers = null;

    if (!editingWorker && syncWithAllWorkers) {
      nextWorkers = [updatedWorker, ...workers];
    } else if (editingWorker && syncWithAllWorkers) {
      const masterWorker = { ...updatedWorker };
      delete masterWorker.source;
      nextWorkers = workers.some((worker) => String(worker.id) === String(updatedWorker.id))
        ? workers.map((worker) =>
            String(worker.id) === String(updatedWorker.id) ? { ...worker, ...masterWorker } : worker,
          )
        : [masterWorker, ...workers];
      nextAttendanceData.workers = nextAttendanceData.workers.filter(
        (worker) => String(worker.id) !== String(updatedWorker.id),
      );
      delete nextAttendanceData.overrides[String(updatedWorker.id)];
      nextAttendanceData.hiddenWorkerIds = nextAttendanceData.hiddenWorkerIds.filter(
        (id) => id !== String(updatedWorker.id),
      );
    } else if (!editingWorker) {
      nextAttendanceData.workers = [updatedWorker, ...nextAttendanceData.workers];
    } else if (editingWorker.source === "master") {
      nextAttendanceData.overrides[String(updatedWorker.id)] = {
        workerName: trimmedName,
        workerCode: trimmedCode,
      };
    } else {
      nextAttendanceData.workers = nextAttendanceData.workers.map((worker) =>
        String(worker.id) === String(updatedWorker.id) ? updatedWorker : worker,
      );
    }

    setIsSaving(true);
    try {
      await persistChanges(nextAttendanceData, nextWorkers);
      if (shouldIssueInviteCode) {
        await setDoc(doc(db, "inviteCodes", trimmedCode), {
          bossEmail: ownerEmail,
          workerId: updatedWorker.id,
          ownerEmail,
          ownerUid: auth.currentUser.uid,
        });
        if (!syncWithAllWorkers && updatedWorker.source !== "master") {
          await saveAttendanceWorkerData(ownerEmail, updatedWorker);
        }
      }
      setIsModalOpen(false);
      setEditingWorker(null);
    } catch (error) {
      console.error("Failed to save attendance worker:", error);
      window.alert(
        shouldIssueInviteCode
          ? t("attendance_worker_saved_login_failed")
          : t("attendance_worker_save_failed"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirm = (worker) => {
    setDeleteWorker(worker);
    setSyncDeleteWithAllWorkers(false);
  };

  const handleDeleteWorker = async () => {
    if (!deleteWorker || isSaving) return;
    const nextAttendanceData = normalizeAttendanceData(attendanceData);
    let nextWorkers = null;

    if (deleteWorker.source === "attendance") {
      nextAttendanceData.workers = nextAttendanceData.workers.filter(
        (worker) => String(worker.id) !== String(deleteWorker.id),
      );
    } else if (syncDeleteWithAllWorkers) {
      nextWorkers = workers.filter(
        (worker) => String(worker.id) !== String(deleteWorker.id),
      );
      delete nextAttendanceData.overrides[String(deleteWorker.id)];
      nextAttendanceData.hiddenWorkerIds = nextAttendanceData.hiddenWorkerIds.filter(
        (id) => id !== String(deleteWorker.id),
      );
    } else if (!nextAttendanceData.hiddenWorkerIds.includes(String(deleteWorker.id))) {
      nextAttendanceData.hiddenWorkerIds.push(String(deleteWorker.id));
    }

    setIsSaving(true);
    try {
      await persistChanges(nextAttendanceData, nextWorkers);
      setDeleteWorker(null);
    } catch (error) {
      console.error("Failed to delete attendance worker:", error);
      window.alert(t("attendance_worker_delete_failed"));
    } finally {
      setIsSaving(false);
    }
  };

  const selectedWorkerFaces = faceImages[String(selectedWorker?.id)] || {};
  const selectedWorkerFaceRegistrationDay = getFaceRegistrationDay(selectedWorkerFaces);
  const selectedWorkerCheckIns = checkInsByWorker[String(selectedWorker?.id)] || [];

  return (
    <main className="Davomat">
      <header className="davomat-header">
        <div className="davomat-brand">
          <Link to="/hisobot" className="davomat-logo">Office<span>Report</span></Link>
          <div className="davomat-title">
            <h1>{t("attendance_page_title")}</h1>
            <p>{t("attendance_all_workers")}</p>
          </div>
        </div>
        <div className="davomat-header-info">
          <span className="davomat-worker-count">
            {attendanceWorkers.length} {t("attendance_worker_count")}
          </span>
          <div className="davomat-header-stats" aria-label={t("attendance_page_title")}>
            <button
              type="button"
              className="on-time"
              onClick={() => setSelectedAttendanceStat("onTime")}
              aria-label={t("attendance_stat_details", { status: t("attendance_on_time") })}
            >
              {t("attendance_on_time")}: {totalAttendanceStats.onTime}
            </button>
            <button
              type="button"
              className="late"
              onClick={() => setSelectedAttendanceStat("late")}
              aria-label={t("attendance_stat_details", { status: t("attendance_late") })}
            >
              {t("attendance_late")}: {totalAttendanceStats.late}
            </button>
            <button
              type="button"
              className="absent"
              onClick={() => setSelectedAttendanceStat("absent")}
              aria-label={t("attendance_stat_details", { status: t("attendance_absent") })}
            >
              {t("attendance_absent")}: {totalAttendanceStats.absent}
            </button>
          </div>
          {undoSnapshot && isOwner && (
            <div className="davomat-undo-group">
              <button
                type="button"
                className="davomat-undo-button"
                onClick={() => setShowUndoConfirm(true)}
                title={t("undo_title") || "Bekor qilish"}
                disabled={isSaving}
              >
                ↩️
              </button>
              <button
                type="button"
                className="davomat-undo-dismiss"
                onClick={() => setShowDismissUndoConfirm(true)}
                title={t("attendance_close_undo_notice")}
                disabled={isSaving}
              >
                ✕
              </button>
            </div>
          )}
          {isOwner && (
            <button
              type="button"
              className="davomat-settings-button"
              onClick={() => {
                setSelectedWorkDays([...(attendanceData.workDays || [1, 2, 3, 4, 5])]);
                setStartTime(attendanceData.startTime || startTime);
                setIsSettingsOpen(true);
              }}
            >
              {t("attendance_schedule")}
            </button>
          )}
          <label className="davomat-language-switcher">
            <span aria-label={t("attendance_language")} title={t("attendance_language")} aria-hidden="true">🌐</span>
            <select
              aria-label={t("attendance_language")}
              value={i18n.language?.slice(0, 2) || "uz"}
              onChange={(event) => i18n.changeLanguage(event.target.value)}
            >
              <option value="uz">UZ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </label>
          {isOwner && (
            <button type="button" className="addH3 davomat-header-add" onClick={openAddModal}>
              {t("attendance_add_button")}
            </button>
          )}
          <Link to="/hisobot" className="davomat-back-link">
            {t("attendance_back_to_report")}
          </Link>
        </div>
      </header>

      <section className="davomat-content" aria-label={t("attendance_page_title")}>
        {isLoading ? (
          <div className="davomat-empty">{t("attendance_loading")}</div>
        ) : attendanceWorkers.length === 0 ? (
          <div className="davomat-empty">
            {t("hisobot_no_workers") || "Ishchilar hozircha yo'q"}
          </div>
        ) : (
          <div className="davomat-worker-list">
            {attendanceWorkers.map((worker) => {
              const workerId = String(worker.id);
              const workerCheckIns = checkInsByWorker[workerId] || [];
              const todayKey = getAttendanceDay(currentTime);
              const todayCheckIn = workerCheckIns.find((record) => record.dateKey === todayKey);
              const latestCheckIn = workerCheckIns[0];
              const todayStatus =
                workerStats[workerId]?.todayStatus ||
                (todayCheckIn ? compareCheckIn(todayCheckIn, attendanceData.startTime) : "");
              const cardStatus =
                todayStatus ||
                (latestCheckIn ? compareCheckIn(latestCheckIn, attendanceData.startTime) : "");
              const previewCheckIn = todayCheckIn || workerCheckIns[0];
              return (
              <article
                className={`davomat-worker-card ${
                  cardStatus
                    ? `status-${cardStatus}`
                    : ""
                }`}
                key={`${worker.source}-${worker.id}`}
                onClick={() => setSelectedWorker(worker)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setSelectedWorker(worker);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="davomat-worker-info">
                  <div className="davomat_info_face">
                    <div className="face_id_image">
                      {previewCheckIn?.imageData ? (
                        <button
                          type="button"
                          className="davomat-photo-zoom-trigger"
                          aria-label={t("attendance_zoom_photo")}
                          onClick={(event) => {
                            event.stopPropagation();
                            setZoomedPhoto({
                              src: previewCheckIn.imageData,
                              alt: `${worker.workerName} ${t("attendance_checkin_history")}`,
                            });
                          }}
                        >
                          <img
                            src={previewCheckIn.imageData}
                            alt={`${worker.workerName} ${t("attendance_checkin_history")}`}
                          />
                        </button>
                      ) : (
                        <span
                          className={getFaceRegistrationDay(faceImages[String(worker.id)])
                            ? ""
                            : "davomat-face-missing"}
                        >
                          {t("attendance_no_photo")}
                        </span>
                      )}
                    </div>
                    <div className="davomat-worker-details">
                      <h2 className="davomat_worker_name">
                        {worker.workerName}
                        <span
                          className={`davomat-access-status ${
                            worker.workerCode ? "has-access-code" : "no-access-code"
                          }`}
                          title={worker.workerCode ? "Has Access Code" : "No Access Code"}
                        />
                        {latestCheckIn && (
                          <span
                            className={`davomat-checkin-time status-${compareCheckIn(latestCheckIn, attendanceData.startTime)}`}
                            title={latestCheckIn.dateKey}
                          >
                            {getCheckInTime(latestCheckIn)?.toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            ) || t("attendance_unknown_time")}
                          </span>
                        )}
                      </h2>
                      {worker.createdAt && (
                        <span className="davomat-worker-date">
                          {new Date(worker.createdAt).toLocaleDateString()}
                        </span>
                      )}
                      {worker.source === "attendance" && (
                        <span className="davomat-local-label">{t("attendance_only")}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="davomat-card-history">
                  {(workerStats[String(worker.id)]?.history || []).slice(0, 3).map((entry) => (
                    <span
                      className={`davomat-history-pill status-${entry.status}`}
                      key={entry.dateKey}
                      title={`${entry.dateKey} ${entry.record?.checkedInAt?.toDate
                        ? entry.record.checkedInAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : t(entry.status === "late"
                          ? "attendance_late"
                          : entry.status === "absent"
                            ? "attendance_absent"
                            : "attendance_on_time")}`}
                    >
                      {entry.record?.checkedInAt?.toDate
                        ? entry.record.checkedInAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : entry.status === "absent" ? "—" : "✓"}
                    </span>
                    ))}
                  {(workerStats[String(worker.id)]?.history.length || 0) > 3 && (
                    <span className="davomat-more-history" aria-label={t("attendance_full_history")}>...</span>
                  )}
                </div>
                {isOwner && (
                  <div className="worker-actions davomat-worker-actions">
                    <button
                      type="button"
                      className="edit-btn"
                      title={t("attendance_edit")}
                      aria-label={t("attendance_edit")}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(worker);
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="delete-btn"
                      title={t("attendance_delete")}
                      aria-label={t("attendance_delete")}
                      onClick={(event) => {
                        event.stopPropagation();
                        openDeleteConfirm(worker);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </article>
              );
            })}
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="davomat-modal-overlay" onMouseDown={closeModal}>
          <form
            className="davomat-modal"
            onSubmit={handleSaveWorker}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>{editingWorker ? t("attendance_edit_worker") : t("attendance_add_worker")}</h2>
            <label>
              {t("attendance_worker_name")}
              <input
                autoFocus
                value={workerName}
                onChange={(event) => setWorkerName(event.target.value)}
                required
              />
            </label>
            <label>
              {t("worker_code_label")}
              <input
                value={workerCode}
                onChange={(event) => setWorkerCode(event.target.value)}
              />
            </label>
            <label className="davomat-sync-option">
              <input
                type="checkbox"
                checked={syncWithAllWorkers}
                onChange={(event) => setSyncWithAllWorkers(event.target.checked)}
              />
              <span>
                {editingWorker?.source === "master"
                  ? t("attendance_sync_edit")
                  : t("attendance_sync_add")}
              </span>
            </label>
            <div className="davomat-modal-actions">
              <button type="button" onClick={closeModal} disabled={isSaving}>
                {t("bekorqilish")}
              </button>
              <button type="submit" className="davomat-save-button" disabled={isSaving || !workerName.trim()}>
                {isSaving ? t("attendance_saving") : t("attendance_save")}
              </button>
            </div>
          </form>
        </div>
      )}

      {isSettingsOpen && (
        <div className="davomat-modal-overlay" onMouseDown={() => setIsSettingsOpen(false)}>
          <div className="davomat-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h2>{t("attendance_schedule")}</h2>
            <label>
              {t("attendance_schedule_start")}
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </label>
            <p>{t("attendance_schedule_hint")}</p>
            <div className="davomat-weekdays">
              {[
                [1, t("attendance_weekday_mon")],
                [2, t("attendance_weekday_tue")],
                [3, t("attendance_weekday_wed")],
                [4, t("attendance_weekday_thu")],
                [5, t("attendance_weekday_fri")],
                [6, t("attendance_weekday_sat")],
                [7, t("attendance_weekday_sun")],
              ].map(([day, label]) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={selectedWorkDays.includes(day)}
                    onChange={() => toggleWorkDay(day)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="davomat-modal-actions">
              <button
                type="button"
                className="davomat-restart-button"
                onClick={() => setShowRestartConfirm(true)}
                disabled={isSaving}
              >
                {isSaving ? t("attendance_saving") : t("attendance_restart_today")}
              </button>
              <button
                type="button"
                className="davomat-save-button"
                onClick={handleSaveWorkDays}
                disabled={isSaving || selectedWorkDays.length === 0 || !startTime}
              >
                {isSaving ? t("attendance_saving") : t("attendance_save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedWorker && (
        <div className="davomat-modal-overlay" onMouseDown={() => setSelectedWorker(null)}>
          <div className="davomat-modal davomat-worker-detail" onMouseDown={(event) => event.stopPropagation()}>
            <div className="davomat-detail-heading">
              <div>
                <h2>{selectedWorker.workerName}</h2>
                <p>{t("attendance_worker_code")}: {selectedWorker.workerCode || "—"}</p>
              </div>
              <button type="button" onClick={() => setSelectedWorker(null)} aria-label={t("attendance_close")}>✕</button>
            </div>
            <div className="davomat-detail-stats">
              <span className="on-time">{t("attendance_on_time")}: {workerStats[String(selectedWorker.id)]?.onTime || 0}</span>
              <span className="late">{t("attendance_late")}: {workerStats[String(selectedWorker.id)]?.late || 0}</span>
              <span className="absent">{t("attendance_absent")}: {workerStats[String(selectedWorker.id)]?.absent || 0}</span>
            </div>
            {isOwner && (
              <>
                <p className="davomat-face-notice">{t("attendance_face_review_notice")}</p>
                <div className="davomat-face-grid">
                  {[
                    ["front", t("attendance_face_front")],
                    ["left", t("attendance_face_left")],
                    ["right", t("attendance_face_right")],
                  ].map(([pose, label]) => (
                    <div className="davomat-face-slot" key={pose}>
                      <button
                        type="button"
                        className="davomat-face-capture"
                        onClick={() => setCameraTarget({ workerId: selectedWorker.id, pose })}
                      >
                        {selectedWorkerFaces[pose]?.imageData ? (
                          <img src={selectedWorkerFaces[pose].imageData} alt={`${label} yuz rasmi`} />
                        ) : (
                          <span>+</span>
                        )}
                        <small>{label}</small>
                      </button>
                      {selectedWorkerFaces[pose]?.imageData && (
                        <button
                          type="button"
                          className="davomat-face-delete-button"
                          aria-label={t("attendance_face_delete", { pose: label })}
                          title={t("attendance_face_delete", { pose: label })}
                          disabled={isSaving}
                          onClick={(event) => {
                            event.stopPropagation();
                            setFaceToDelete({
                              workerId: selectedWorker.id,
                              pose,
                              label,
                            });
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            <hr />
            <h3>{t("attendance_checkin_history")}</h3>
            <div className="davomat-full-history">
              {selectedWorkerCheckIns.length ? (
                selectedWorkerCheckIns.map((record) => {
                  const checkInTime = getCheckInTime(record);
                  const status = compareCheckIn(record, attendanceData.startTime);
                  return (
                    <div className={`davomat-full-history-row status-${status}`} key={record.dateKey}>
                      <span>{record.dateKey}</span>
                      <span>
                        {checkInTime
                          ? checkInTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : t("attendance_unknown_time")}
                      </span>
                      {record.imageData && (
                        <button
                          type="button"
                          className="davomat-history-photo-zoom-trigger"
                          aria-label={t("attendance_zoom_photo")}
                          onClick={() =>
                            setZoomedPhoto({
                              src: record.imageData,
                              alt: `${selectedWorker.workerName} ${record.dateKey} ${t("attendance_checkin_history")}`,
                            })
                          }
                        >
                          <img
                            className="davomat-checkin-thumbnail"
                            src={record.imageData}
                            alt={`${selectedWorker.workerName} ${record.dateKey} ${t("attendance_checkin_history")}`}
                          />
                        </button>
                      )}
                    </div>
                  );
                  })
              ) : !selectedWorkerFaceRegistrationDay ? (
                <p>{t("attendance_face_required")}</p>
              ) : (
                <p>{t("attendance_no_checkin_photo")}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {faceToDelete && (
        <div
          className="davomat-modal-overlay"
          onMouseDown={() => !isSaving && setFaceToDelete(null)}
        >
          <div
            className="davomat-modal davomat-confirm-modal davomat-face-confirm-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>{t("attendance_face_delete_title")}</h2>
            <p>{t("attendance_face_delete_confirm", { pose: faceToDelete.label })}</p>
            <div className="davomat-modal-actions">
              <button
                type="button"
                onClick={() => setFaceToDelete(null)}
                disabled={isSaving}
              >
                {t("bekorqilish")}
              </button>
              <button
                type="button"
                className="davomat-delete-button"
                onClick={() => handleDeleteFace(faceToDelete.workerId, faceToDelete.pose)}
                disabled={isSaving}
              >
                {isSaving ? t("attendance_deleting") : t("attendance_delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAttendanceStat && (
        <div
          className="davomat-modal-overlay"
          onMouseDown={() => setSelectedAttendanceStat("")}
        >
          <div
            className="davomat-modal davomat-stat-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-stat-detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="davomat-detail-heading">
              <h2 id="attendance-stat-detail-title">
                {t("attendance_stat_details", {
                  status: t(
                    selectedAttendanceStat === "onTime"
                      ? "attendance_on_time"
                      : selectedAttendanceStat === "late"
                        ? "attendance_late"
                        : "attendance_absent",
                  ),
                })}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedAttendanceStat("")}
                aria-label={t("attendance_close")}
              >
                ✕
              </button>
            </div>
            {["shared", "attendanceOnly"].map((group) => {
              const groupDetails = attendanceStatDetails[selectedAttendanceStat][group];
              return (
                <section className="davomat-stat-group" key={group}>
                  <h3>
                    {t(group === "shared" ? "attendance_group_shared" : "attendance_group_only")}
                    <span>{groupDetails.total}</span>
                  </h3>
                  {groupDetails.workers.length ? (
                    <ul>
                      {groupDetails.workers.map(({ worker, count }) => (
                        <li key={`${worker.source}-${worker.id}`}>
                          <span>{worker.workerName}</span>
                          <strong>{count}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t("attendance_group_empty")}</p>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {zoomedPhoto && (
        <div
          className="davomat-photo-zoom-overlay"
          onMouseDown={() => setZoomedPhoto(null)}
          role="presentation"
        >
          <img
            src={zoomedPhoto.src}
            alt={zoomedPhoto.alt}
            onMouseDown={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {showRestartConfirm && (
        <div
          className="davomat-modal-overlay"
          onMouseDown={() => !isSaving && setShowRestartConfirm(false)}
        >
          <div
            className="davomat-modal davomat-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-restart-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="attendance-restart-title">{t("attendance_restart_title")}</h2>
            <p>{t("attendance_restart_confirm")}</p>
            <div className="davomat-modal-actions">
              <button
                type="button"
                onClick={() => setShowRestartConfirm(false)}
                disabled={isSaving}
              >
                {t("bekorqilish")}
              </button>
              <button
                type="button"
                className="davomat-restart-button"
                onClick={handleRestartAttendanceTracking}
                disabled={isSaving}
              >
                {isSaving ? t("attendance_saving") : t("ha")}
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraTarget && (
        <AttendanceCamera
          title={t("attendance_camera_face_title", {
            pose: cameraTarget.pose === "front"
              ? t("attendance_face_front")
              : cameraTarget.pose === "left"
                ? t("attendance_face_left")
                : t("attendance_face_right"),
          })}
          onCapture={handleFaceCapture}
          onClose={() => !isSaving && setCameraTarget(null)}
          isSaving={isSaving}
        />
      )}

      {deleteWorker && (
        <div className="davomat-modal-overlay" onMouseDown={() => !isSaving && setDeleteWorker(null)}>
          <div className="davomat-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h2>{t("attendance_delete_worker_title")}</h2>
            <p>
              {t("attendance_delete_worker_confirm", { name: deleteWorker.workerName })}
            </p>
            {deleteWorker.source === "master" && (
              <label className="davomat-sync-option">
                <input
                  type="checkbox"
                  checked={syncDeleteWithAllWorkers}
                  onChange={(event) => setSyncDeleteWithAllWorkers(event.target.checked)}
                />
                <span>{t("attendance_delete_from_all")}</span>
              </label>
            )}
            <div className="davomat-modal-actions">
              <button type="button" onClick={() => setDeleteWorker(null)} disabled={isSaving}>
                {t("bekorqilish")}
              </button>
              <button
                type="button"
                className="davomat-delete-button"
                onClick={handleDeleteWorker}
                disabled={isSaving}
              >
                {isSaving ? t("attendance_deleting") : t("attendance_delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUndoConfirm && undoSnapshot && (
        <div className="davomat-modal-overlay" onMouseDown={() => setShowUndoConfirm(false)}>
          <div className="davomat-modal davomat-confirm-modal" onMouseDown={(event) => event.stopPropagation()}>
            <p>{t("attendance_undo_confirm")}</p>
            <div className="davomat-modal-actions">
              <button type="button" onClick={() => setShowUndoConfirm(false)} disabled={isSaving}>
                {t("bekorqilish")}
              </button>
              <button
                type="button"
                className="davomat-save-button"
                onClick={handleUndo}
                disabled={isSaving}
              >
                {isSaving ? t("attendance_undoing") : t("ha")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDismissUndoConfirm && undoSnapshot && (
        <div className="davomat-modal-overlay" onMouseDown={() => setShowDismissUndoConfirm(false)}>
          <div className="davomat-modal davomat-confirm-modal" onMouseDown={(event) => event.stopPropagation()}>
            <p>{t("attendance_dismiss_undo_confirm")}</p>
            <div className="davomat-modal-actions">
              <button type="button" onClick={() => setShowDismissUndoConfirm(false)}>
                {t("bekorqilish")}
              </button>
              <button
                type="button"
                className="davomat-delete-button"
                onClick={() => {
                  setUndoSnapshot(null);
                  setShowDismissUndoConfirm(false);
                }}
              >
                {t("ha")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Davomat;
