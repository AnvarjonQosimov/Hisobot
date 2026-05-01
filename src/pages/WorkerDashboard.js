import React, { useState, useEffect } from "react";
import "../styles/WorkerDashboard.css";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { HiMenu, HiX } from "react-icons/hi";
import { db, auth } from "../Firebase/Firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import Loading from "../components/Loading";

function WorkerDashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [isOffline, setIsOffline] = useState(!window.navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOffline(!window.navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState([]);

  const [bossEmail, setBossEmail] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [fullWorkers, setFullWorkers] = useState([]);
  const [cabinetData, setCabinetData] = useState(null);

  // Stats Period
  const [chartPeriod, setChartPeriod] = useState("week");

  useEffect(() => {
    const role = localStorage.getItem("role");
    const bEmail = localStorage.getItem("bossEmail");
    const wId = localStorage.getItem("workerId");

    if (role !== "worker" || !bEmail || !wId) {
      navigate("/login");
      return;
    }
    setBossEmail(bEmail);
    setWorkerId(wId);

    const checkCloud = async () => {
      try {
        const docRef = doc(db, "cabinets", bEmail);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCabinetData(data);
          if (data.workers) {
            setFullWorkers(data.workers);
            const pWorker = data.workers.find(w => w.id === parseInt(wId) || w.id === wId);
            if (pWorker) {
              setWorker(pWorker);
            }
          }
        }
      } catch (e) {
        console.log("Worker cloud sync paused (offline).");
      } finally {
        setLoading(false);
      }
    };
    checkCloud();
  }, [navigate]);

  const saveToCloud = async (newWorkers) => {
    if (!bossEmail || !cabinetData) return;
    try {
      await setDoc(doc(db, "cabinets", bossEmail), {
        ...cabinetData,
        workers: newWorkers
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePaid = (id) => {
    if (!worker) return;
    const newIsPaid = !worker.isPaid;
    const newWorkerDetails = { ...worker, isPaid: newIsPaid };
    setWorker(newWorkerDetails);

    const updatedWorkers = fullWorkers.map(w => w.id === worker.id ? newWorkerDetails : w);
    setFullWorkers(updatedWorkers);
    saveToCloud(updatedWorkers);
  };

  const toggleHistory = (id) => {
    setExpandedHistory((prev) =>
      prev.includes(id) ? prev.filter((hid) => hid !== id) : [...prev, id],
    );
  };

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
        </div>

        <div className="rightBottom" style={{ flex: 1, padding: "30px" }}>
          {worker ? (
            <div className="worker-list" style={{ height: "auto" }}>
              <div className={`worker-item ${worker.isPaid ? "paid-row" : ""}`}>
                <div className="worker-item-main">
                  <div className="worker-info" style={{ width: '25%' }}>
                    <input
                      type="checkbox"
                      className="paid-checkbox"
                      checked={worker.isPaid}
                      onChange={() => handleTogglePaid()}
                      onClick={(e) => e.stopPropagation()}
                    />
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
                        {worker.amountToReceive}{" "}
                        {worker.currencyToReceive === "sum" ? "so'm" : "$"}
                      </strong>
                      <span className="small-date">
                        {t("sana")}: {worker.dateToGive}
                      </span>
                    </div>
                    <div className="val-group">
                      <p>{t("olgansumma")}:</p>
                      <strong className="received">
                        {worker.amountAlreadyReceived}{" "}
                        {worker.currencyAlreadyReceived === "sum"
                          ? "so'm"
                          : "$"}
                      </strong>
                      <span className="small-date">
                        {t("olgan")}: {worker.dateAlreadyReceived}
                      </span>
                    </div>
                  </div>

                  <div className="worker-actions" style={{ width: '20%', justifyContent: 'flex-end' }}>
                    <button
                      className="history-toggle-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHistory(worker.id);
                      }}
                      title={t("tarixni_korish") || "Tarixni ko'rish"}
                    >
                      📜
                    </button>
                    {/* Hiding other controls like delete and month rotate for a worker account to prevent destructive acts. They can still mark paid. */}
                  </div>
                </div>

                {/* History Section */}
                {expandedHistory.includes(worker.id) && (
                  <div className="history-section">
                    <h4>{t("to'lovlartarixi")}:</h4>
                    {(worker.history || []).length === 0 ? (
                      <p className="no-history">{t("tarix_mavjud_emas")}</p>
                    ) : (
                      worker.history.map((h, idx) => (
                        <div key={idx} className="history-item">
                          <span>{h.date}</span>
                          <span>
                            {h.amount} {h.currency === "sum" ? "so'm" : "$"}
                          </span>
                          <span className="h-type">
                            {h.type === "archived"
                              ? t("arxivlandi")
                              : t("tolandi")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
