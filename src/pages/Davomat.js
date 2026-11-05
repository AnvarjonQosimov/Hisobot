import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
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
import { saveBossCabinet } from "../auth/firestoreOwnership";
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

const compareCheckIn = (record, startTime) => {
  const checkInDate = getCheckInTime(record);
  if (!checkInDate || !startTime) return "onTime";
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const scheduledMinutes = startHour * 60 + startMinute;
  const arrivalMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
  return arrivalMinutes > scheduledMinutes ? "late" : "onTime";
};

const getWorkerAttendanceStats = (worker, records, attendanceData, now) => {
  const schedule = attendanceData.workDays || [];
  const startDay = attendanceData.trackingStartDay;
  const startTime = attendanceData.startTime;
  if (!startDay || !startTime) {
    return { onTime: 0, late: 0, absent: 0, todayStatus: "", history: [] };
  }

  const createdAt = worker.createdAt ? new Date(worker.createdAt) : null;
  const workerStartDay =
    createdAt && !Number.isNaN(createdAt.getTime()) ? getAttendanceDay(createdAt) : startDay;
  const firstDay = workerStartDay > startDay ? workerStartDay : startDay;
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
  const [cameraTarget, setCameraTarget] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
        );
        return stats;
      }, {}),
    [attendanceWorkers, attendanceRecords, attendanceData, currentTime],
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
              const { workerId, pose, imageData } = faceDoc.data();
              if (!images[String(workerId)]) images[String(workerId)] = {};
              images[String(workerId)][pose] = imageData;
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
      window.alert("Oxirgi amalni bekor qilib bo'lmadi. Qayta urinib ko'ring.");
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
      window.alert("Ish kunlarini saqlab bo'lmadi. Qayta urinib ko'ring.");
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
        updatedAt: serverTimestamp(),
      });
      setFaceImages((currentImages) => ({
        ...currentImages,
        [String(cameraTarget.workerId)]: {
          ...(currentImages[String(cameraTarget.workerId)] || {}),
          [cameraTarget.pose]: imageData,
        },
      }));
      setCameraTarget(null);
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
      window.alert("Bu kod boshqa ishchiga berilgan. Boshqa kod kiriting.");
      return;
    }

    const shouldIssueInviteCode = syncWithAllWorkers || editingWorker?.source === "master";
    if (trimmedCode && shouldIssueInviteCode) {
      try {
        const codeRef = doc(db, "inviteCodes", trimmedCode);
        await setDoc(codeRef, {
          bossEmail: ownerEmail,
          workerId: updatedWorker.id,
          ownerEmail,
          ownerUid: auth.currentUser.uid,
        });
      } catch (error) {
        console.error("Could not reserve unique worker code:", error);
        window.alert(
          "Bu kod band yoki saqlashga ruxsat yo'q. Boshqa kod kiriting yoki ishchini umumiy ro'yxatga qo'shish belgisini tekshiring.",
        );
        return;
      }
    }
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
      setIsModalOpen(false);
      setEditingWorker(null);
    } catch (error) {
      console.error("Failed to save attendance worker:", error);
      window.alert("Ishchini saqlab bo'lmadi. Qayta urinib ko'ring.");
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
      window.alert("Ishchini o'chirib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="Davomat">
      <header className="davomat-header">
        <div className="davomat-brand">
          <Link to="/hisobot" className="davomat-logo">Office<span>Report</span></Link>
          <div className="davomat-title">
            <h1>Davomat</h1>
            <p>{t("barcha_ishchilar", { defaultValue: "Barcha ishchilar" })}</p>
          </div>
        </div>
        <div className="davomat-header-info">
          <span className="davomat-worker-count">
            {attendanceWorkers.length} {t("report_export_worker_count") || "Ishchilar"}
          </span>
          <div className="davomat-header-stats" aria-label="Davomat statistikasi">
            <span className="on-time">Vaqtida: {totalAttendanceStats.onTime}</span>
            <span className="late">Kechikdi: {totalAttendanceStats.late}</span>
            <span className="absent">Kelmagan: {totalAttendanceStats.absent}</span>
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
                title="Bekor qilish bildirishnomasini yopish"
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
              Ish jadvali
            </button>
          )}
          <label className="davomat-language-switcher">
            <span aria-hidden="true">🌐</span>
            <select
              aria-label="Language"
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
              + {t("qo'shish") || "Ishchi qo'shish"}
            </button>
          )}
          <Link to="/hisobot" className="davomat-back-link">
            Hisobotga qaytish
          </Link>
        </div>
      </header>

      <section className="davomat-content" aria-label="Davomat">
        {isLoading ? (
          <div className="davomat-empty">Yuklanmoqda...</div>
        ) : attendanceWorkers.length === 0 ? (
          <div className="davomat-empty">
            {t("hisobot_no_workers") || "Ishchilar hozircha yo'q"}
          </div>
        ) : (
          <div className="davomat-worker-list">
            {attendanceWorkers.map((worker) => (
              <article
                className={`davomat-worker-card ${
                  workerStats[String(worker.id)]?.todayStatus
                    ? `status-${workerStats[String(worker.id)].todayStatus}`
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
                      {checkInsByWorker[String(worker.id)]?.[0]?.imageData ? (
                        <img
                          src={checkInsByWorker[String(worker.id)][0].imageData}
                          alt={`${worker.workerName} oxirgi kelish rasmi`}
                        />
                      ) : (
                        <span>Kelish rasmi yo'q</span>
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
                      </h2>
                      {worker.createdAt && (
                        <span className="davomat-worker-date">
                          {new Date(worker.createdAt).toLocaleDateString()}
                        </span>
                      )}
                      {worker.source === "attendance" && (
                        <span className="davomat-local-label">Faqat Davomat</span>
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
                        : entry.status}`}
                    >
                      {entry.record?.checkedInAt?.toDate
                        ? entry.record.checkedInAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : entry.status === "absent" ? "—" : "✓"}
                    </span>
                  ))}
                  {(workerStats[String(worker.id)]?.history.length || 0) > 3 && (
                    <span className="davomat-more-history" aria-label="To'liq tarix uchun bosing">...</span>
                  )}
                </div>
                {isOwner && (
                  <div className="worker-actions davomat-worker-actions">
                    <button
                      type="button"
                      className="edit-btn"
                      title="Tahrirlash"
                      aria-label="Tahrirlash"
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
                      title="O'chirish"
                      aria-label="O'chirish"
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
            ))}
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
            <h2>{editingWorker ? "Ishchini tahrirlash" : "Ishchi qo'shish"}</h2>
            <label>
              Ishchining ismi
              <input
                autoFocus
                value={workerName}
                onChange={(event) => setWorkerName(event.target.value)}
                required
              />
            </label>
            <label>
              Ishchi kodi (Parol)
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
                  ? "O'zgarishlarni Barcha ishchilar ro'yxatiga ham qo'llash"
                  : "Ushbu ishchini Barcha ishchilar ro'yxatiga ham qo'shish"}
              </span>
            </label>
            <div className="davomat-modal-actions">
              <button type="button" onClick={closeModal} disabled={isSaving}>
                Bekor qilish
              </button>
              <button type="submit" className="davomat-save-button" disabled={isSaving || !workerName.trim()}>
                {isSaving ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isSettingsOpen && (
        <div className="davomat-modal-overlay" onMouseDown={() => setIsSettingsOpen(false)}>
          <div className="davomat-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h2>Ish jadvali</h2>
            <label>
              Ish boshlanish vaqti
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </label>
            <p>Kechikish va kelmaganlik statistikasi ish vaqti va kunlari asosida hisoblanadi.</p>
            <div className="davomat-weekdays">
              {[
                [1, "Du"],
                [2, "Se"],
                [3, "Ch"],
                [4, "Pa"],
                [5, "Ju"],
                [6, "Sh"],
                [7, "Ya"],
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
              <button type="button" onClick={() => setIsSettingsOpen(false)} disabled={isSaving}>
                Bekor qilish
              </button>
              <button
                type="button"
                className="davomat-save-button"
                onClick={handleSaveWorkDays}
                disabled={isSaving || selectedWorkDays.length === 0 || !startTime}
              >
                {isSaving ? "Saqlanmoqda..." : "Saqlash"}
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
                <p>Kod: {selectedWorker.workerCode || "—"}</p>
              </div>
              <button type="button" onClick={() => setSelectedWorker(null)} aria-label="Yopish">✕</button>
            </div>
            <div className="davomat-detail-stats">
              <span className="on-time">Vaqtida: {workerStats[String(selectedWorker.id)]?.onTime || 0}</span>
              <span className="late">Kechikdi: {workerStats[String(selectedWorker.id)]?.late || 0}</span>
              <span className="absent">Kelmagan: {workerStats[String(selectedWorker.id)]?.absent || 0}</span>
            </div>
            {isOwner && (
              <>
                <p className="davomat-face-notice">Rasmlarni bosingiz qo'lda tekshiradi.</p>
                <div className="davomat-face-grid">
                  {[
                    ["front", "To'g'ridan"],
                    ["left", "Chapdan"],
                    ["right", "O'ngdan"],
                  ].map(([pose, label]) => (
                    <button
                      type="button"
                      className="davomat-face-slot"
                      key={pose}
                      onClick={() => setCameraTarget({ workerId: selectedWorker.id, pose })}
                    >
                      {faceImages[String(selectedWorker.id)]?.[pose] ? (
                        <img src={faceImages[String(selectedWorker.id)][pose]} alt={`${label} yuz rasmi`} />
                      ) : (
                        <span>+</span>
                      )}
                      <small>{label}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
            <hr />
            <h3>Kelishlar tarixi</h3>
            <div className="davomat-full-history">
              {checkInsByWorker[String(selectedWorker.id)]?.length ? (
                checkInsByWorker[String(selectedWorker.id)].map((record) => {
                  const checkInTime = getCheckInTime(record);
                  const status = compareCheckIn(record, attendanceData.startTime);
                  return (
                    <div className={`davomat-full-history-row status-${status}`} key={record.dateKey}>
                      <span>{record.dateKey}</span>
                      <span>
                        {checkInTime
                          ? checkInTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "Vaqt noma'lum"}
                      </span>
                      {record.imageData && (
                    <img
                      className="davomat-checkin-thumbnail"
                          src={record.imageData}
                          alt={`${selectedWorker.workerName} ${record.dateKey} kelish rasmi`}
                    />
                  )}
                    </div>
                  );
                })
              ) : (
                <p>Hozircha kelish rasmi yo'q.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {cameraTarget && (
        <AttendanceCamera
          title={`Face ID: ${cameraTarget.pose === "front" ? "To'g'ridan" : cameraTarget.pose === "left" ? "Chapdan" : "O'ngdan"}`}
          onCapture={handleFaceCapture}
          onClose={() => !isSaving && setCameraTarget(null)}
          isSaving={isSaving}
        />
      )}

      {deleteWorker && (
        <div className="davomat-modal-overlay" onMouseDown={() => !isSaving && setDeleteWorker(null)}>
          <div className="davomat-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h2>Ishchini o'chirish</h2>
            <p>
              {deleteWorker.workerName} ni Davomat ro'yxatidan o'chirmoqchimisiz?
            </p>
            {deleteWorker.source === "master" && (
              <label className="davomat-sync-option">
                <input
                  type="checkbox"
                  checked={syncDeleteWithAllWorkers}
                  onChange={(event) => setSyncDeleteWithAllWorkers(event.target.checked)}
                />
                <span>Barcha ishchilar ro'yxatidan ham o'chirish</span>
              </label>
            )}
            <div className="davomat-modal-actions">
              <button type="button" onClick={() => setDeleteWorker(null)} disabled={isSaving}>
                Bekor qilish
              </button>
              <button
                type="button"
                className="davomat-delete-button"
                onClick={handleDeleteWorker}
                disabled={isSaving}
              >
                {isSaving ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUndoConfirm && undoSnapshot && (
        <div className="davomat-modal-overlay" onMouseDown={() => setShowUndoConfirm(false)}>
          <div className="davomat-modal davomat-confirm-modal" onMouseDown={(event) => event.stopPropagation()}>
            <p>Oxirgi amalni bekor qilmoqchimisiz?</p>
            <div className="davomat-modal-actions">
              <button type="button" onClick={() => setShowUndoConfirm(false)} disabled={isSaving}>
                {t("bekorqilish") || "Yo'q"}
              </button>
              <button
                type="button"
                className="davomat-save-button"
                onClick={handleUndo}
                disabled={isSaving}
              >
                {isSaving ? "Bekor qilinmoqda..." : t("ha") || "Ha"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDismissUndoConfirm && undoSnapshot && (
        <div className="davomat-modal-overlay" onMouseDown={() => setShowDismissUndoConfirm(false)}>
          <div className="davomat-modal davomat-confirm-modal" onMouseDown={(event) => event.stopPropagation()}>
            <p>Bekor qilish imkoniyatini yopmoqchimisiz?</p>
            <div className="davomat-modal-actions">
              <button type="button" onClick={() => setShowDismissUndoConfirm(false)}>
                {t("bekorqilish") || "Yo'q"}
              </button>
              <button
                type="button"
                className="davomat-delete-button"
                onClick={() => {
                  setUndoSnapshot(null);
                  setShowDismissUndoConfirm(false);
                }}
              >
                {t("ha") || "Ha"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Davomat;
