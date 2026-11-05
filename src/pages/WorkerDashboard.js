import React, { useState, useEffect } from "react";
import "../styles/WorkerDashboard.css";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { HiMenu, HiX } from "react-icons/hi";
import { db, auth } from "../Firebase/Firebase";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import Loading from "../components/Loading";
import { getWorkerDataId } from "../auth/firestoreOwnership";
import AttendanceCamera from "../components/AttendanceCamera";
import { getAttendanceDateParts, getAttendanceDay, getAttendanceRecordId } from "../utils/attendance";
import "../styles/Davomat.css";

const getStoredWorkerId = () => {
  const storedWorkerId = localStorage.getItem("workerId");
  if (!storedWorkerId) return "";
  try {
    return JSON.parse(storedWorkerId);
  } catch {
    return storedWorkerId;
  }
};

function WorkerDashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [isOffline, setIsOffline] = useState(!window.navigator.onLine);

  // useEffect(() => {
  //   const handleStatus = () => setIsOffline(!window.navigator.onLine);
  //   window.addEventListener("online", handleStatus);
  //   window.addEventListener("offline", handleStatus);
  //   return () => {
  //     window.removeEventListener("online", handleStatus);
  //     window.removeEventListener("offline", handleStatus);
  //   };
  // }, []);

const [worker, setWorker] = useState(null);
const [loading, setLoading] = useState(true);
const [workerLoadError, setWorkerLoadError] = useState("");
const [isSidebarOpen, setIsSidebarOpen] = useState(false);
const [logoutDialog, setLogoutDialog] = useState(false);
const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
const [attendanceRecord, setAttendanceRecord] = useState(null);
const [attendanceDayKey, setAttendanceDayKey] = useState(getAttendanceDay());
const [isAttendanceCameraOpen, setIsAttendanceCameraOpen] = useState(false);
const [isAttendanceSaving, setIsAttendanceSaving] = useState(false);
const currencySettingsEmail = auth.currentUser?.email?.toLowerCase() || "";
const [currencyDisplayMode, setCurrencyDisplayMode] = useState(() => {
  const savedMode = localStorage.getItem(`workerCurrencyDisplayMode_${currencySettingsEmail}`);
  return ["combined", "sum", "dollar"].includes(savedMode) ? savedMode : "combined";
});
const [dollarRate, setDollarRate] = useState(() => {
  const savedRate = Number(localStorage.getItem(`workerDollarRate_${currencySettingsEmail}`));
  return savedRate > 0 ? String(savedRate) : "12000";
});
const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

useEffect(() => {
  const role = localStorage.getItem("role");
  const bossEmail = localStorage.getItem("bossEmail");
  const workerId = getStoredWorkerId();

  if (role !== "worker" || !bossEmail || !workerId) {
    navigate("/login");
    return undefined;
  }

  const workerRef = doc(
    db,
    "workerData",
    getWorkerDataId(bossEmail, workerId),
  );
  return onSnapshot(
    workerRef,
    (workerSnapshot) => {
      if (workerSnapshot.exists()) {
        setWorker(workerSnapshot.data().worker);
        setWorkerLoadError("");
      } else {
        setWorker(null);
        setWorkerLoadError(
          t("worker_data_unavailable") ||
            "Worker data is not available. Ask your manager to sync the report and sign in again with your invite code.",
        );
      }
      setLoading(false);
    },
    (error) => {
      console.error("Worker data sync failed:", error);
      setWorkerLoadError(
        t("worker_data_unavailable") ||
          "Worker data is not available. Ask your manager to sync the report and sign in again with your invite code.",
      );
      setLoading(false);
    },
  );
}, [navigate, t]);

useEffect(() => {
  const timer = window.setInterval(() => setAttendanceDayKey(getAttendanceDay()), 60000);
  return () => window.clearInterval(timer);
}, []);

useEffect(() => {
  const bossEmail = localStorage.getItem("bossEmail")?.toLowerCase();
  const workerId = getStoredWorkerId();
  const workerEmail = auth.currentUser?.email?.toLowerCase();
  if (!bossEmail || !workerId || !workerEmail) return undefined;

  const recordRef = doc(
    db,
    "attendanceRecords",
    getAttendanceRecordId(workerEmail, new Date(`${attendanceDayKey}T00:00:00.000Z`)),
  );
  return onSnapshot(
    recordRef,
    (snapshot) => setAttendanceRecord(snapshot.exists() ? snapshot.data() : null),
    (error) => {
      console.error("Could not load today's attendance record:", error);
    },
  );
}, [worker, attendanceDayKey]);

const handleAttendanceCapture = async (imageData) => {
  const bossEmail = localStorage.getItem("bossEmail")?.toLowerCase();
  const workerId = getStoredWorkerId();
  const workerEmail = auth.currentUser?.email?.toLowerCase();
  if (!bossEmail || !workerId || !workerEmail || attendanceRecord) return;

  const date = new Date();
  const { year, month, day } = getAttendanceDateParts(date);
  setIsAttendanceSaving(true);
  try {
    await setDoc(doc(db, "attendanceRecords", getAttendanceRecordId(workerEmail, date)), {
      bossEmail,
      ownerEmail: bossEmail,
      workerId,
      workerEmail,
      year,
      month,
      day,
      dateKey: getAttendanceDay(date),
      checkedInAt: serverTimestamp(),
      imageData,
    });
    setIsAttendanceCameraOpen(false);
  } catch (error) {
    console.error("Could not submit attendance check-in:", error);
    throw new Error(
      error.code === "permission-denied"
        ? "Davomatni belgilashga Firestore ruxsat bermadi. Yangilangan firestore.rules qoidalarini e'lon qiling; bugungi belgi mavjud bo'lsa, qayta belgilab bo'lmaydi."
        : "Davomatni saqlab bo'lmadi. Qayta urinib ko'ring.",
    );
  } finally {
    setIsAttendanceSaving(false);
  }
};

const handleOpenDetail = () => {
if (!worker) return;

setIsDetailModalOpen(true);
};

  const handleCurrencyDisplayModeChange = (mode) => {
    setCurrencyDisplayMode(mode);
    localStorage.setItem(`workerCurrencyDisplayMode_${currencySettingsEmail}`, mode);
  };

  const handleDollarRateChange = (value) => {
    setDollarRate(value);
    localStorage.setItem(`workerDollarRate_${currencySettingsEmail}`, value);
  };

  const formatWorkerAmount = (value, currency) => {
    const amount = Number.parseFloat(value) || 0;
    const rate = Number.parseFloat(dollarRate);
    const currencyLabel = currency === "sum" ? t("som") : "$";

    if (currencyDisplayMode === "combined" || rate <= 0) {
      return `${amount.toLocaleString()} ${currencyLabel}`;
    }

    const convertedAmount = currencyDisplayMode === "sum"
      ? currency === "sum" ? amount : amount * rate
      : currency === "dollar" ? amount : amount / rate;
    return `${convertedAmount.toLocaleString()} ${currencyDisplayMode === "sum" ? t("som") : "$"}`;
  };

  // Stats Period
  const [chartPeriod, setChartPeriod] = useState("week");

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      localStorage.clear();
      navigate("/login");
    }
  };

  const getCircularData = () => {
    if (!worker) return { paid: 0, unpaid: 1, percent: 0 };
    const paidCount = worker.isPaid ? 1 : 0;
    const percent = worker.isPaid ? 100 : 0;
    return { paid: paidCount, unpaid: 1 - paidCount, percent };
  };

  const getChartData = () => {
    const now = new Date();
    let data = [];
    if (!worker) return "M 0,150 L 300,150";

    // Aggregating historical and current payments for THIS WORKER ONLY
    let allPayments = [];
    if (parseFloat(worker.amountAlreadyReceived) > 0) {
      allPayments.push({
        date: new Date(worker.createdAt),
        amount: parseFloat(worker.amountAlreadyReceived),
        currency: worker.currencyAlreadyReceived,
      });
    }
    (worker.history || []).forEach((h) => {
      allPayments.push({
        date: new Date(h.date),
        amount: parseFloat(h.amount),
        currency: h.currency,
      });
    });

    if (chartPeriod === "day") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 2 * 60 * 60 * 1000);
        const sum = allPayments
          .filter(
            (p) =>
              p.date.getHours() === d.getHours() &&
              p.date.getDate() === d.getDate(),
          )
          .reduce((acc, curr) => acc + curr.amount, 0);
        data.push(sum);
      }
    } else if (chartPeriod === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const sum = allPayments
          .filter((p) => p.date.toLocaleDateString() === d.toLocaleDateString())
          .reduce((acc, curr) => acc + curr.amount, 0);
        data.push(sum);
      }
    } else if (chartPeriod === "month") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const sum = allPayments
          .filter((p) => p.date.toLocaleDateString() === d.toLocaleDateString())
          .reduce((acc, curr) => acc + curr.amount, 0);
        data.push(sum);
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const sum = allPayments
          .filter(
            (p) =>
              p.date.getMonth() === d.getMonth() &&
              p.date.getFullYear() === d.getFullYear(),
          )
          .reduce((acc, curr) => acc + curr.amount, 0);
        data.push(sum);
      }
    }

    const max = Math.max(...data, 1);
    const height = 150;
    const width = 300;

    let path = data
      .map((val, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - (val / max) * height;
        return (i === 0 ? "M " : "L ") + `${x},${y}`;
      })
      .join(" ");

    return path;
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };
  const [age, setAge] = React.useState(i18n.language || "uz");

  if (loading) return <Loading />;

  return (
    <div className="Hisobot WorkerDashboard">
      <button
        className="mobile-menu-btn"
        onClick={() => setIsSidebarOpen(true)}
      >
        <HiMenu />
      </button>

      <div className={`HisobotLeft ${isSidebarOpen ? "open" : ""}`}>
        <button
          className="mobile-close-btn"
          onClick={() => setIsSidebarOpen(false)}
        >
          <HiX />
        </button>
        <div className="hisobotLeftText">
          <div className="leftTop">
            <h1 onClick={() => setIsSidebarOpen(false)}>OfficeReport</h1>
            <p style={{ color: "rgba(40, 236, 112, 1)" }}>Worker: {worker?.workerName}</p>
            {isOffline && (
              <div style={{ color: '#ffa500', fontSize: '10px', marginTop: '5px' }}>
                ⚠️ {t("Working Offline")}
              </div>
            )}
          </div>
          <div className="leftBottom">
            <div className="logout-btn-container" onClick={() => setLogoutDialog(true)}>
              <h3>{t("chiqish")}</h3>
            </div>
            <div className="translation">
              <select
                className="translationSelect"
                value={age}
                onChange={(e) => {
                  const value = e.target.value;
                  setAge(value);
                  changeLanguage(value);
                }}
              >
                <option className="languageOption" value={"uz"}>UZ</option>
                <option className="languageOption" value={"ru"}>RU</option>
                <option className="languageOption" value={"en"}>EN</option>
              </select>
            </div>
          </div>
        </div>
        <div className="leftLine"></div>
      </div>

      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <div className="HisobotRight" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="rightTop">
          <h2 style={{ color: "#fff", marginLeft: "30px", marginTop: "20px" }}>{t("Ishchining Shaxsiy Paneli")}</h2>
          <button
            type="button"
            className="currency-open-btn worker-currency-open-btn"
            onClick={() => setIsCurrencyModalOpen(true)}
          >
            {t("valyuta")}
          </button>
        </div>

        <div className="rightBottom" style={{ flex: 1, padding: "30px" }}>
          {workerLoadError && (
            <p role="alert" style={{ color: "#ff8a8a", textAlign: "center" }}>
              {workerLoadError}
            </p>
          )}
          {worker ? (
            <div className="worker-list" style={{ height: "auto" }}>
              <section className={`worker-attendance-checkin ${attendanceRecord ? "has-attendance-card" : ""}`}>
                {attendanceRecord ? (
                  <article className="worker-attendance-card">
                    <div className="worker-attendance-photo">
                      {attendanceRecord.imageData ? (
                        <img
                          src={attendanceRecord.imageData}
                          alt={`${worker.workerName} ${t("worker_attendance_photo_alt")}`}
                        />
                      ) : (
                        <span>{t("attendance_no_photo")}</span>
                      )}
                    </div>
                    <div className="worker-attendance-card-info">
                      <h3>
                        {worker.workerName}
                        <span className="worker-attendance-status-dot" />
                      </h3>
                      <span>{new Date().toLocaleDateString()}</span>
                      <p>{t("worker_attendance_marked")}</p>
                    </div>
                    {attendanceRecord.checkedInAt?.toDate && (
                      <time className="worker-attendance-time">
                        {attendanceRecord.checkedInAt.toDate().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    )}
                  </article>
                ) : (
                  <>
                    <h3>{t("worker_attendance_today")}</h3>
                    <p>{t("worker_attendance_prompt")}</p>
                    <button
                      type="button"
                      className="davomat-save-button"
                      onClick={() => setIsAttendanceCameraOpen(true)}
                    >
                      {t("worker_attendance_mark_button")}
                    </button>
                  </>
                )}
              </section>
              <div
  className={`worker-item ${worker.isPaid ? "paid-row" : ""}`}
  onClick={handleOpenDetail}
>
                <div className="worker-item-main">
                  <div className="worker-info" style={{ width: '25%' }}>
                    <div className="name-date">
                      <h3>{worker.workerName}</h3>
                      <span>{new Date(worker.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="worker-values" style={{ width: '55%' }}>
                    <div className="val-group">
                      <p>{t("qilayotganishi")}</p>
                      <strong>
                        {worker.currentWork || t("yo'q")} ({worker.workPercent || "0%"})
                      </strong>
                    </div>
                    <div className="val-group">
                      <p>{t("olishikerak")}:</p>
                      <strong className="to-receive">
                        {formatWorkerAmount(worker.amountToReceive, worker.currencyToReceive)}
                      </strong>
                      <span className="small-date">
                        {t("sana")}: {worker.dateToGive}
                      </span>
                    </div>
                    <div className="val-group">
                      <p>{t("olgansumma")}:</p>
                      <strong className="received">
                        {formatWorkerAmount(worker.amountAlreadyReceived, worker.currencyAlreadyReceived)}
                      </strong>
                      <span className="small-date">
                        {t("olgan")}: {worker.dateAlreadyReceived}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Circular stats below the card */}
              <div style={{ display: 'flex', gap: '20px', marginTop: '40px', flexWrap: 'wrap' }}>
                <div className="linear-stats" style={{ flex: 1, minWidth: '300px', background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h2 style={{ color: '#fff', marginBottom: '10px' }}>{t("chiziqlistatistika")}</h2>
                  <div className="chart-controls" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button className={chartPeriod === "day" ? "active" : ""} onClick={() => setChartPeriod("day")}>{t("kun")}</button>
                    <button className={chartPeriod === "week" ? "active" : ""} onClick={() => setChartPeriod("week")}>{t("hafta")}</button>
                    <button className={chartPeriod === "month" ? "active" : ""} onClick={() => setChartPeriod("month")}>{t("oy")}</button>
                    <button className={chartPeriod === "year" ? "active" : ""} onClick={() => setChartPeriod("year")}>{t("yil")}</button>
                  </div>
                  <div className="chart-container" style={{ position: 'relative', width: '100%', aspectRatio: '2/1' }}>
                    <svg className="chart-svg" viewBox="0 0 300 150" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgb(86, 86, 255)" stopOpacity="1" />
                          <stop offset="100%" stopColor="rgb(204, 194, 255)" stopOpacity="0.2" />
                        </linearGradient>
                      </defs>
                      <path className="chart-path" d={getChartData()} style={{ fill: 'none', stroke: 'url(#chartGradient)', strokeWidth: '3', strokeLinecap: 'round', strokeLinejoin: 'round' }} />
                    </svg>
                  </div>
                </div>

                <div className="circular-stats" style={{ flex: 1, minWidth: '300px', background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h2 style={{ color: '#fff', marginBottom: '10px' }}>{t("aylanastatistika")}</h2>
                  <div className="pie-container" style={{ display: 'flex', alignItems: 'center', gap: '30px', marginTop: '20px' }}>
                    <svg className="pie-chart" viewBox="0 0 100 100" style={{ width: '140px', height: '140px' }}>
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(161, 161, 241, 0.1)" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgb(86, 86, 255)" strokeWidth="10" strokeDasharray={`${getCircularData().percent * 2.51} 251.2`} strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                      <text x="50" y="55" fontSize="20" fill="#fff" textAnchor="middle" fontWeight="bold">{getCircularData().percent}%</text>
                    </svg>
                    <div className="pie-legend">
                      <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: '#fff' }}>
                        <span className="dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgb(86, 86, 255)' }}></span>
                        <span>{t("to'langan")}: {getCircularData().paid}</span>
                      </div>
                      <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                        <span className="dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(161, 161, 241, 0.2)' }}></span>
                        <span>{t("qolgan")}: {getCircularData().unpaid}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "#fff", textAlign: "center", marginTop: "100px" }}>Worker Data Not Found</div>
          )}
        </div>
      </div>

      {isAttendanceCameraOpen && (
        <AttendanceCamera
          title="Bugungi davomat uchun rasm"
          onCapture={handleAttendanceCapture}
          onClose={() => !isAttendanceSaving && setIsAttendanceCameraOpen(false)}
          isSaving={isAttendanceSaving}
        />
      )}

      {isDetailModalOpen && worker && (
  <div
    className="modal-overlay"
    onClick={() => setIsDetailModalOpen(false)}
  >
    <div
      className="modal-container finishedworks"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px"
          }}
        >
          <h2 style={{ margin: 0 }}>
            {worker.workerName}
          </h2>

          {worker.workerCode && (
            <span
              style={{
                fontSize: "0.8rem",
                color: "rgb(146, 151, 223)",
                fontWeight: "600",
                background: "rgba(146, 151, 223, 0.15)",
                padding: "4px 10px",
                borderRadius: "12px",
                marginLeft: "10px"
              }}
            >
              Password: {worker.workerCode}
            </span>
          )}
        </div>

        <button
          className="close-btn"
          onClick={() => setIsDetailModalOpen(false)}
        >
          ✕
        </button>
      </div>

      <div className="modal-body">

        <div className="aboutTop">

          {/* ЛЕВАЯ ЧАСТЬ */}
          <div className="aboutTopLeft">

            <div className="val-group">
              <p>{t("olishikerak")}:</p>

              <strong className="to-receive">
                {formatWorkerAmount(worker.amountToReceive, worker.currencyToReceive)}
              </strong>

              <span className="small-date">
                {t("sana")}: {worker.dateToGive}
              </span>
            </div>

            <div className="work-field">
              <label>
                {t("qilayotganishi")}:
              </label>

              <span
                style={{
                  color: "#fff",
                  fontWeight: "600"
                }}
              >
                {worker.currentWork || t("yo'q")}
              </span>
            </div>

            <div className="work-field">
              <label>
                {t("qilinayotganishfoizi")}:
              </label>

              <strong className="progress-text">
                {worker.workPercent || "0%"}
              </strong>
            </div>

          </div>


          {/* ПРАВАЯ ЧАСТЬ */}
          <div className="aboutTopRight">

            <div className="val-group">
              <p>{t("olgansumma")}:</p>

              <strong className="received">
                {formatWorkerAmount(worker.amountAlreadyReceived, worker.currencyAlreadyReceived)}
              </strong>

              <span className="small-date">
                {t("olgan")}: {worker.dateAlreadyReceived}
              </span>
            </div>

            <div className="work-field">
              <label>
                {t("oldin_qilingan_ish")}:
              </label>

              <span
                style={{
                  color: "#fff",
                  fontWeight: "600"
                }}
              >
                {worker.prevWork || t("yo'q")}
              </span>
            </div>

            <div className="work-field">
              <label>
                {t("oldin_qilingan_foiz")}:
              </label>

              <strong className="progress-text">
                {worker.prevWorkPercent || "0%"}
              </strong>
            </div>

          </div>
        </div>


        {/* СТАТУС ОПЛАТЫ */}
        <div
          className="payment-status"
          data-paid={worker.isPaid ? "true" : "false"}
          style={{
            marginTop: "20px",
            padding: "15px 20px",
            borderRadius: "10px"
          }}
        >
          <span className="payment-status-label">
            {t("to'langan") || "Оплата"}:
          </span>

          <strong className="payment-status-value">
            {worker.isPaid
              ? `✓ ${t("worker_paid_status")}`
              : `○ ${t("worker_unpaid_status")}`}
          </strong>
        </div>


        {/* ИСТОРИЯ ПРОЕКТОВ */}
        <div className="aboutBottom">

          <h3>
            {t("loyiha_tarixi")}
          </h3>

          <div className="project-history-list">

            {(() => {
              const projectHistory = [
                ...(worker.objectWorkHistory || []),
                ...(worker.history || []).filter(
                  (item) => item.type === "project_completed" || item.type === "archived",
                ),
              ].filter(
                (item, index, items) =>
                  items.findIndex((candidate) =>
                    candidate.work === item.work &&
                    candidate.objectName === item.objectName &&
                    candidate.date === item.date &&
                    candidate.percent === item.percent,
                  ) === index,
              );

              if (projectHistory.length === 0) {
                return <p className="no-history">{t("tarix_mavjud_emas")}</p>;
              }

              return projectHistory.slice().reverse().map((item, index) => (
                <div key={`${item.objectName || "work"}-${item.date || "work"}-${index}`} className="project-history-item">
                  <div className="history-main">
                    <div className="history-text">
                      <strong>{item.work || t("noma'lum_ish")}</strong>
                      <span>{item.percent || "100%"}</span>
                      {item.objectName && (
                        <span className="worker-object-name">{item.objectName}</span>
                      )}
                    </div>
                  </div>
                  {item.date && (
                    <div className="history-details">
                      <small>{item.date}</small>
                    </div>
                  )}
                </div>
              ));
            })()}

          </div>

        </div>

      </div>


      {/* ТОЛЬКО КНОПКА ЗАКРЫТЬ */}
      <div className="modal-footer">

        <button
          className="btn cancel"
          onClick={() =>
            setIsDetailModalOpen(false)
          }
        >
          {t("yopish")}
        </button>

      </div>

    </div>
  </div>
)}

      {isCurrencyModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsCurrencyModalOpen(false)}
        >
          <div
            className="modal-container currency-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>{t("valyuta")}</h2>
                <p className="modal-description">{t("currency_popup_description")}</p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsCurrencyModalOpen(false)}
                aria-label={t("yopish")}
              >
                ✕
              </button>
            </div>
            <div className="modal-body filter-modal-body">
              <div className="currency-modal-body">
                <div className="rate-row">
                  <button
                    type="button"
                    className={`filter-btn ${currencyDisplayMode === "sum" ? "active" : ""}`}
                    onClick={() => handleCurrencyDisplayModeChange("sum")}
                  >
                    {t("currency_mode_sum_short")}
                  </button>
                  <button
                    type="button"
                    className={`filter-btn ${currencyDisplayMode === "dollar" ? "active" : ""}`}
                    onClick={() => handleCurrencyDisplayModeChange("dollar")}
                  >
                    {t("currency_mode_dollar_short")}
                  </button>
                  <button
                    type="button"
                    className={`filter-btn ${currencyDisplayMode === "combined" ? "active" : ""}`}
                    onClick={() => handleCurrencyDisplayModeChange("combined")}
                  >
                    {t("currency_mode_combined_short")}
                  </button>
                </div>
                {currencyDisplayMode !== "combined" && (
                  <div className="rate-row">
                    <label htmlFor="worker-dollar-rate">{t("dollar_rate_short")}</label>
                    <div className="rate-input-wrap">
                      <input
                        id="worker-dollar-rate"
                        type="number"
                        className="rate-input"
                        min="1"
                        inputMode="decimal"
                        value={dollarRate}
                        onChange={(event) => handleDollarRateChange(event.target.value)}
                      />
                      <span>UZS / USD</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn cancel"
                onClick={() => setIsCurrencyModalOpen(false)}
              >
                {t("bekor_qilish_btn")}
              </button>
              <button
                type="button"
                className="btn add"
                onClick={() => setIsCurrencyModalOpen(false)}
              >
                {t("saqlash_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {logoutDialog && (
        <div className="confirm-overlay" onClick={() => setLogoutDialog(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">
              {t("Haqiqatdan ham chiqishni xohlaysizmi?")}
            </div>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => setLogoutDialog(false)}
              >
                {t("bekorqilish")}
              </button>
              <button
                className="confirm-btn confirm-logout"
                onClick={confirmLogout}
              >
                {t("chiqish")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerDashboard;
