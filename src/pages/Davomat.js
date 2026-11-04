import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth, db } from "../Firebase/Firebase";
import { saveBossCabinet } from "../auth/firestoreOwnership";
import "../styles/Davomat.css";

const EMPTY_ATTENDANCE_DATA = {
  workers: [],
  overrides: {},
  hiddenWorkerIds: [],
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

function Davomat() {
  const { t } = useTranslation();
  const [ownerEmail, setOwnerEmail] = useState("");
  const [workers, setWorkers] = useState([]);
  const [workerObjects, setWorkerObjects] = useState([]);
  const [attendanceData, setAttendanceData] = useState(EMPTY_ATTENDANCE_DATA);
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
        setAttendanceData(
          storedAttendanceData
            ? normalizeAttendanceData(JSON.parse(storedAttendanceData))
            : EMPTY_ATTENDANCE_DATA,
        );
      } catch (error) {
        console.error("Failed to load saved attendance workers:", error);
        setAttendanceData(EMPTY_ATTENDANCE_DATA);
      }

      unsubscribeData = onSnapshot(
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
            localStorage.setItem(attendanceKey, JSON.stringify(nextAttendanceData));
          }
          setIsLoading(false);
        },
        (error) => {
          console.error("Failed to sync attendance workers:", error);
          setIsLoading(false);
        },
      );
    });

    return () => {
      isCurrent = false;
      unsubscribeAuth();
      unsubscribeData();
    };
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
      if (syncWithAllWorkers && trimmedCode) {
        try {
          await setDoc(doc(db, "inviteCodes", trimmedCode), {
            bossEmail: ownerEmail,
            workerId: updatedWorker.id,
            ownerEmail,
            ownerUid: auth.currentUser.uid,
          });
        } catch (error) {
          console.error("Failed to save invite code:", error);
          window.alert("Ishchi kodi saqlanmadi. Qayta urinib ko'ring.");
        }
      }
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
              <article className="davomat-worker-card" key={`${worker.source}-${worker.id}`}>
                <div className="davomat-worker-info">
                    <div className="davomat_info_face">
                        <div className="face_id_image">
                        
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
                {isOwner && (
                  <div className="worker-actions davomat-worker-actions">
                    <button
                      type="button"
                      className="edit-btn"
                      title="Tahrirlash"
                      aria-label="Tahrirlash"
                      onClick={() => openEditModal(worker)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="delete-btn"
                      title="O'chirish"
                      aria-label="O'chirish"
                      onClick={() => openDeleteConfirm(worker)}
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
