import React, { useState, useEffect } from "react";
import "../styles/Hisobot.css";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { HiMenu, HiX } from "react-icons/hi";

function Hisobot() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // State Definitions
  const [username, setUsername] = useState("");
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [addWorkerModal, setAddWorkerModal] = useState(false);
  const [balansQoshish, setBalansQoshish] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [amountToReceive, setAmountToReceive] = useState("");
  const [dateToGive, setDateToGive] = useState("");
  const [amountAlreadyReceived, setAmountAlreadyReceived] = useState("");
  const [dateAlreadyReceived, setDateAlreadyReceived] = useState("");
  const [currencyToReceive, setCurrencyToReceive] = useState("sum");
  const [currencyAlreadyReceived, setCurrencyAlreadyReceived] = useState("sum");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceCurrency, setBalanceCurrency] = useState("sum");

  // Persistence States
  const [workers, setWorkers] = useState([]);
  const [totalBalance, setTotalBalance] = useState({ sum: 0, dollar: 0 });
  const [initialBalance, setInitialBalance] = useState({ sum: 0, dollar: 0 });

  // UI/Edit Mode States
  const [editMode, setEditMode] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState(null);

  // Mini Calculator State
  const [expandedHistory, setExpandedHistory] = useState([]); // Track which worker's history is shown

  // Undo Functionality State
  const [undoState, setUndoState] = useState(null);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showPerformUndoConfirm, setShowPerformUndoConfirm] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all, recent, high

  // Custom Delete Modal State
  const [deleteWorkerId, setDeleteWorkerId] = useState(null);

  // History Edit & Delete State
  const [deleteHistoryData, setDeleteHistoryData] = useState(null);
  const [editingHistoryData, setEditingHistoryData] = useState(null);

  // Linear Stats State
  const [chartPeriod, setChartPeriod] = useState("week"); // day, week, month, year

  // Responsive State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isConstructionExpanded, setIsConstructionExpanded] = useState(false);

  // Load from localStorage (Account Scoped)
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) {
      navigate("/login");
      return;
    }
    setUsername(storedUsername);

    const storedWorkers = localStorage.getItem(`workers_${storedUsername}`);
    if (storedWorkers) setWorkers(JSON.parse(storedWorkers));

    const storedBalance = localStorage.getItem(
      `totalBalance_${storedUsername}`,
    );
    if (storedBalance) setTotalBalance(JSON.parse(storedBalance));

    const storedInitialBalance = localStorage.getItem(
      `initialBalance_${storedUsername}`,
    );
    if (storedInitialBalance)
      setInitialBalance(JSON.parse(storedInitialBalance));
  }, [navigate]);

  // Save to localStorage (Account Scoped)
  useEffect(() => {
    if (!username) return;
    localStorage.setItem(`workers_${username}`, JSON.stringify(workers));
  }, [workers, username]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(
      `totalBalance_${username}`,
      JSON.stringify(totalBalance),
    );
  }, [totalBalance, username]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(
      `initialBalance_${username}`,
      JSON.stringify(initialBalance),
    );
  }, [initialBalance, username]);

  const confirmLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("password");
    navigate("/login");
  };

  const handleLogoutCancel = () => {
    setLogoutDialog(false);
  };

  const handleAddWorkerClick = () => {
    setAddWorkerModal(true);
  };

  const handleAddWorkerModalClose = () => {
    setAddWorkerModal(false);
    setEditMode(false);
    setEditingWorkerId(null);
    setWorkerName("");
    setAmountToReceive("");
    setDateToGive("");
    setAmountAlreadyReceived("");
    setDateAlreadyReceived("");
    setCurrencyToReceive("sum");
    setCurrencyAlreadyReceived("sum");
  };

  const handleBalansModalClose = () => {
    setBalansQoshish(false);
    setBalanceAmount("");
    setBalanceCurrency("sum");
  };

  const saveForUndo = () => {
    setUndoState({
      workers: JSON.parse(JSON.stringify(workers)),
      totalBalance: { ...totalBalance },
      initialBalance: { ...initialBalance },
    });
  };

  const handleUndoClick = () => {
    setShowPerformUndoConfirm(true);
  };

  const confirmPerformUndo = () => {
    if (!undoState) return;
    setWorkers(undoState.workers);
    setTotalBalance(undoState.totalBalance);
    setInitialBalance(undoState.initialBalance);
    setUndoState(null);
    setShowPerformUndoConfirm(false);
  };

  const handleDismissUndoClick = () => {
    setShowUndoConfirm(true);
  };

  const confirmDismissUndo = () => {
    setUndoState(null);
    setShowUndoConfirm(false);
  };

  const handleWorkerNameChange = (e) => {
    const value = e.target.value;
    // Capitalize first letter
    const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    setWorkerName(capitalizedValue);
  };

  const handleAddWorker = () => {
    if (editMode) {
      saveForUndo(); // Save state before edit
      setWorkers(
        workers.map((w) =>
          w.id === editingWorkerId
            ? {
              ...w,
              workerName,
              amountToReceive,
              currencyToReceive,
              dateToGive,
              amountAlreadyReceived,
              currencyAlreadyReceived,
              dateAlreadyReceived,
            }
            : w,
        ),
      );
    } else {
      const newWorker = {
        id: Date.now(),
        workerName,
        amountToReceive,
        currencyToReceive,
        dateToGive,
        amountAlreadyReceived,
        currencyAlreadyReceived,
        dateAlreadyReceived,
        createdAt: new Date().toISOString(),
        isPaid: false,
        history: [], // Added history array
      };
      setWorkers([newWorker, ...workers]);
    }
    handleAddWorkerModalClose();
  };

  const handleEditWorkerClick = (worker) => {
    setEditMode(true);
    setEditingWorkerId(worker.id);
    setWorkerName(worker.workerName);
    setAmountToReceive(worker.amountToReceive);
    setDateToGive(worker.dateToGive);
    setAmountAlreadyReceived(worker.amountAlreadyReceived);
    setDateAlreadyReceived(worker.dateAlreadyReceived);
    setCurrencyToReceive(worker.currencyToReceive);
    setCurrencyAlreadyReceived(worker.currencyAlreadyReceived);
    setAddWorkerModal(true);
  };

  const handleDeleteWorkerClick = (id) => {
    setDeleteWorkerId(id);
  };

  const confirmDeleteWorker = () => {
    if (deleteWorkerId) {
      saveForUndo(); // Save state before deletion
      setWorkers(workers.filter((w) => w.id !== deleteWorkerId));
      setDeleteWorkerId(null);
    }
  };

  const confirmDeleteHistory = () => {
    if (deleteHistoryData) {
      saveForUndo();
      setWorkers(
        workers.map((w) => {
          if (w.id === deleteHistoryData.workerId) {
            const newHistory = [...(w.history || [])];
            newHistory.splice(deleteHistoryData.index, 1);
            return { ...w, history: newHistory };
          }
          return w;
        }),
      );
      setDeleteHistoryData(null);
    }
  };

  const handleEditHistorySave = () => {
    if (editingHistoryData) {
      saveForUndo();
      setWorkers(
        workers.map((w) => {
          if (w.id === editingHistoryData.workerId) {
            const newHistory = [...(w.history || [])];
            newHistory[editingHistoryData.index] = {
              amount: editingHistoryData.amount,
              currency: editingHistoryData.currency,
              date: editingHistoryData.date,
              type: editingHistoryData.type,
            };
            return { ...w, history: newHistory };
          }
          return w;
        }),
      );
      setEditingHistoryData(null);
    }
  };

  const handleTogglePaid = (id) => {
    const worker = workers.find((w) => w.id === id);
    if (!worker) return;

    const newIsPaid = !worker.isPaid;

    // Update balance: if marking paid, subtract. If unmarking, add back.
    const amount = parseFloat(worker.amountToReceive || 0);
    const currency = worker.currencyToReceive;

    setTotalBalance((prev) => ({
      ...prev,
      [currency]: newIsPaid ? prev[currency] - amount : prev[currency] + amount,
    }));

    setWorkers(
      workers.map((w) => (w.id === id ? { ...w, isPaid: newIsPaid } : w)),
    );
  };

  const handleNextMonth = (id) => {
    saveForUndo(); // Save state before archiving
    setWorkers(
      workers.map((w) => {
        if (w.id !== id) return w;

        // Rotate: old alreadyReceived goes to history, current amountToReceive becomes alreadyReceived
        const newHistoryItem = {
          amount: w.amountAlreadyReceived,
          currency: w.currencyAlreadyReceived,
          date: w.dateAlreadyReceived,
          type: "archived",
        };

        return {
          ...w,
          history: [...(w.history || []), newHistoryItem],
          amountAlreadyReceived: w.amountToReceive,
          currencyAlreadyReceived: w.currencyToReceive,
          dateAlreadyReceived: new Date().toISOString().split("T")[0], // Today's date for the transition
          amountToReceive: "", // Reset for new month
          isPaid: false, // Reset payment status for new month
        };
      }),
    );
  };

  const toggleHistory = (id) => {
    setExpandedHistory((prev) =>
      prev.includes(id) ? prev.filter((hid) => hid !== id) : [...prev, id],
    );
  };

  const handleBalansClick = () => {
    setBalansQoshish(true);
  };

  const handleUpdateBalans = () => {
    saveForUndo(); // Save state before balance reset
    const newAmount = parseFloat(balanceAmount || 0);

    // Calculate total expenses so far (current + paid last month + history)
    const totalExpenses = workers.reduce((acc, curr) => {
      if (curr.currencyToReceive !== balanceCurrency) {
        // Skip different currencies if they don't match the current balance being updated
        return acc;
      }
      const currentCost = parseFloat(curr.amountToReceive) || 0;
      const historyCost = (curr.history || []).reduce(
        (hAcc, hCurr) =>
          hCurr.currency === balanceCurrency
            ? hAcc + (parseFloat(hCurr.amount) || 0)
            : hAcc,
        0,
      );
      const lastMonthPaid =
        curr.currencyAlreadyReceived === balanceCurrency
          ? parseFloat(curr.amountAlreadyReceived) || 0
          : 0;
      return acc + currentCost + historyCost + lastMonthPaid;
    }, 0);

    // Reset initial balance: set the new one and CLEAR the other one
    setInitialBalance({
      sum: balanceCurrency === "sum" ? newAmount : 0,
      dollar: balanceCurrency === "dollar" ? newAmount : 0,
    });

    // Reset total balance: set the new one (minus expenses) and CLEAR the other one
    setTotalBalance({
      sum: balanceCurrency === "sum" ? newAmount - totalExpenses : 0,
      dollar: balanceCurrency === "dollar" ? newAmount - totalExpenses : 0,
    });

    handleBalansModalClose();
  };

  const getChartData = () => {
    const now = new Date();
    let data = [];

    // Aggregating historical and current payments
    let allPayments = [];
    workers.forEach((w) => {
      // Add current month's payment if it exists
      if (parseFloat(w.amountAlreadyReceived) > 0) {
        allPayments.push({
          date: new Date(w.createdAt),
          amount: parseFloat(w.amountAlreadyReceived),
          currency: w.currencyAlreadyReceived,
        });
      }
      // Add archived payments
      (w.history || []).forEach((h) => {
        allPayments.push({
          date: new Date(h.date),
          amount: parseFloat(h.amount),
          currency: h.currency,
        });
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

  const getCircularData = () => {
    const totalCount = workers.length;
    if (totalCount === 0) return { paid: 0, unpaid: 0, percent: 0 };
    const paidCount = workers.filter((w) => w.isPaid).length;
    const percent = Math.round((paidCount / totalCount) * 100);
    return { paid: paidCount, unpaid: totalCount - paidCount, percent };
  };

  const isFormValid =
    workerName &&
    amountToReceive &&
    dateToGive &&
    amountAlreadyReceived &&
    dateAlreadyReceived;

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };
  const [age, setAge] = React.useState(i18n.language || "uz");
  // const handleChange = (event) => setAge(event.target.value);

  return (
    <div className="Hisobot">
      {/* Left sidebar open button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setIsSidebarOpen(true)}
      >
        <HiMenu />
      </button>

      {/* Right panel open button */}
      <button
        className="right-panel-toggle-btn"
        onClick={() => setIsRightPanelOpen(true)}
      >
        ‹
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
            <p>{username}</p>
            <Link to="/profil" onClick={() => setIsSidebarOpen(false)}>
              <h3>{t("profil")}</h3>
            </Link>
            <Link to="/calculator2" onClick={() => setIsSidebarOpen(false)}>
              <h3>{t("Kalkulator")}</h3>
            </Link>
            <Link to="/officexarajat" onClick={() => setIsSidebarOpen(false)}>
              <h3>{t("o'fisxarajatlari")}</h3>
            </Link>
            <div className={`QurilishXarajatlari ${isConstructionExpanded ? "expanded" : ""}`}>
              <h2 onClick={() => setIsConstructionExpanded(!isConstructionExpanded)}>
                {t("qurilishxarajatlari")} <span>{">"}</span>
              </h2>
              <h4>+ Fayl</h4>
            </div>
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
                <option className="languageOption" value={"uz"}>
                  UZ
                </option>
                <option className="languageOption" value={"ru"}>
                  RU
                </option>
                <option className="languageOption" value={"en"}>
                  EN
                </option>
              </select>
            </div>
          </div>
        </div>
        <div className="leftLine"></div>
      </div>

      {(isSidebarOpen || isRightPanelOpen) && (
        <div
          className="sidebar-overlay"
          onClick={() => {
            setIsSidebarOpen(false);
            setIsRightPanelOpen(false);
          }}
        ></div>
      )}

      <div className="HisobotRight">
        <div className="rightTop">
          <h3 className="addH3" onClick={handleAddWorkerClick}>
            + {t("qo'shish")}
          </h3>
          <h3 className="addH3" onClick={handleBalansClick}>
            + {t("balans")}
          </h3>
          <div className="ql">
            <div className="qoshishLine"></div>
          </div>
          <input
            className="searchWorker desktop-only-filter"
            type="search"
            placeholder="Ishchini izlash"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="filterIshchilar desktop-only-filter">
            <h3
              className={activeFilter === "recent" ? "active-filter" : ""}
              onClick={() =>
                setActiveFilter(activeFilter === "recent" ? "all" : "recent")
              }
            >
              {t("yangi")}
            </h3>
            <h3
              className={activeFilter === "high" ? "active-filter" : ""}
              onClick={() =>
                setActiveFilter(activeFilter === "high" ? "all" : "high")
              }
            >
              {t("yuqorimaosh")}
            </h3>
          </div>

          <button
            className="mobile-filter-btn"
            onClick={() => setIsFilterModalOpen(true)}
          >
            {t("filtrlash")}
          </button>

          {undoState && (
            <div className="undo-group">
              <button
                className="undo-btn icon-only"
                onClick={handleUndoClick}
                title="Eng so'nggi amalni bekor qilish"
              >
                ↩️
              </button>
              <button
                className="undo-close-btn"
                onClick={handleDismissUndoClick}
                title="O'chirish"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="rightBottom">
          {(() => {
            let filtered = workers.filter((w) =>
              w.workerName.toLowerCase().includes(searchTerm.toLowerCase()),
            );

            if (activeFilter === "recent") {
              filtered = [...filtered]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);
            } else if (activeFilter === "high") {
              filtered = filtered.filter((w) => {
                const val = parseFloat(w.amountToReceive) || 0;
                return w.currencyToReceive === "sum"
                  ? val > 5000000
                  : val > 500;
              });
            }

            if (filtered.length === 0) {
              return (
                <div className="no-workers">
                  <p>
                    {searchTerm
                      ? "Qidiruv bo'yicha hech narsa topilmadi."
                      : "Hozircha ishchilar yo'q. \"+ Qo'shish\" tugmasini bosing."}
                  </p>
                </div>
              );
            }

            return (
              <div className="worker-list">
                {filtered.map((worker) => (
                  <div
                    key={worker.id}
                    className={`worker-item ${worker.isPaid ? "paid-row" : ""}`}
                  >
                    <div className="worker-item-main">
                      <div className="worker-info">
                        <input
                          type="checkbox"
                          className="paid-checkbox"
                          checked={worker.isPaid}
                          onChange={() => handleTogglePaid(worker.id)}
                        />
                        <div className="name-date">
                          <h3>{worker.workerName}</h3>
                          <span>
                            {new Date(worker.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="worker-values">
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

                      <div className="worker-actions">
                        <button
                          className="month-btn"
                          onClick={() => handleNextMonth(worker.id)}
                          title="Yangi oy/Sikl"
                        >
                          🔄
                        </button>
                        <button
                          className="history-toggle-btn"
                          onClick={() => toggleHistory(worker.id)}
                          title="Tarixni ko'rish"
                        >
                          📜
                        </button>
                        <button
                          className="edit-btn"
                          onClick={() => handleEditWorkerClick(worker)}
                          title="Tahrirlash"
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteWorkerClick(worker.id)}
                          title="O'chirish"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* History Section */}
                    {expandedHistory.includes(worker.id) && (
                      <div className="history-section">
                        <h4>{t("to'lovlartarixi")}:</h4>
                        {(worker.history || []).length === 0 ? (
                          <p className="no-history">Tarix mavjud emas</p>
                        ) : (
                          worker.history.map((h, idx) => (
                            <div key={idx} className="history-item">
                              <span>{h.date}</span>
                              <span>
                                {h.amount} {h.currency === "sum" ? "so'm" : "$"}
                              </span>
                              <span className="h-type">
                                {h.type === "archived"
                                  ? "Arxivlandi"
                                  : "To'landi"}
                              </span>
                              <div
                                className="history-actions"
                                style={{
                                  display: "flex",
                                  gap: "5px",
                                  marginLeft: "auto",
                                }}
                              >
                                <button
                                  className="edit-btn"
                                  onClick={() =>
                                    setEditingHistoryData({
                                      workerId: worker.id,
                                      index: idx,
                                      ...h,
                                    })
                                  }
                                  style={{
                                    padding: "5px",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "16px",
                                  }}
                                  title="Tahrirlash"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="delete-btn"
                                  onClick={() =>
                                    setDeleteHistoryData({
                                      workerId: worker.id,
                                      index: idx,
                                    })
                                  }
                                  style={{
                                    padding: "5px",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "16px",
                                  }}
                                  title="O'chirish"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div className={`rightRight ${isRightPanelOpen ? "open" : ""}`}>
          <button
            className="right-panel-close-btn"
            onClick={() => setIsRightPanelOpen(false)}
          >
            ›
          </button>
          <div className="lrLine"></div>
          <div className="statistic">
            <h2>{t("statistika")}</h2>
            <div className="statistic1">
              <h3>{t("boshlang'ichbalans")}:</h3>
              <p>
                {initialBalance.sum.toLocaleString()} so'm /{" "}
                {initialBalance.dollar.toLocaleString()} $
              </p>
            </div>
            <div className="statistic2">
              <h3>{t("jamiishchilar")}:</h3>
              <p>{workers.length}</p>
            </div>
            <div className="statistic3">
              <h3>{t("engbalandmaosh")}:</h3>
              <p>
                {(() => {
                  const sumHigh = workers
                    .filter((w) => w.currencyToReceive === "sum")
                    .sort(
                      (a, b) =>
                        (parseFloat(b.amountToReceive) || 0) -
                        (parseFloat(a.amountToReceive) || 0),
                    )[0];
                  const dolHigh = workers
                    .filter((w) => w.currencyToReceive === "dollar")
                    .sort(
                      (a, b) =>
                        (parseFloat(b.amountToReceive) || 0) -
                        (parseFloat(a.amountToReceive) || 0),
                    )[0];

                  const sumText = sumHigh
                    ? `${sumHigh.workerName}: ${parseFloat(sumHigh.amountToReceive).toLocaleString()} so'm`
                    : "yo'q";
                  const dolText = dolHigh
                    ? `${dolHigh.workerName}: ${parseFloat(dolHigh.amountToReceive).toLocaleString()} $`
                    : "yo'q";

                  return `${sumText} / ${dolText}`;
                })()}
              </p>
            </div>
            <div className="statistic4">
              <h3>{t("jamimaoshlaruchunxarajat")}:</h3>
              <p>
                {workers
                  .reduce((acc, curr) => {
                    const currentCost =
                      curr.currencyToReceive === "sum"
                        ? parseFloat(curr.amountToReceive) || 0
                        : 0;
                    const historyCost = (curr.history || []).reduce(
                      (hAcc, hCurr) =>
                        hCurr.currency === "sum"
                          ? hAcc + (parseFloat(hCurr.amount) || 0)
                          : hAcc,
                      0,
                    );
                    const lastMonthPaid =
                      curr.currencyAlreadyReceived === "sum"
                        ? parseFloat(curr.amountAlreadyReceived) || 0
                        : 0;
                    return acc + currentCost + historyCost + lastMonthPaid;
                  }, 0)
                  .toLocaleString()}{" "}
                so'm /
                {workers
                  .reduce((acc, curr) => {
                    const currentCost =
                      curr.currencyToReceive === "dollar"
                        ? parseFloat(curr.amountToReceive) || 0
                        : 0;
                    const historyCost = (curr.history || []).reduce(
                      (hAcc, hCurr) =>
                        hCurr.currency === "dollar"
                          ? hAcc + (parseFloat(hCurr.amount) || 0)
                          : hAcc,
                      0,
                    );
                    const lastMonthPaid =
                      curr.currencyAlreadyReceived === "dollar"
                        ? parseFloat(curr.amountAlreadyReceived) || 0
                        : 0;
                    return acc + currentCost + historyCost + lastMonthPaid;
                  }, 0)
                  .toLocaleString()}{" "}
                $
              </p>
            </div>
            <div className="statistic5">
              <h3>{t("to'lanishikerakbo'lganqoldiq")}:</h3>
              <p>
                {workers
                  .filter((w) => !w.isPaid)
                  .reduce(
                    (acc, curr) =>
                      curr.currencyToReceive === "sum"
                        ? acc + (parseFloat(curr.amountToReceive) || 0)
                        : acc,
                    0,
                  )
                  .toLocaleString()}{" "}
                so'm /
                {workers
                  .filter((w) => !w.isPaid)
                  .reduce(
                    (acc, curr) =>
                      curr.currencyToReceive === "dollar"
                        ? acc + (parseFloat(curr.amountToReceive) || 0)
                        : acc,
                    0,
                  )
                  .toLocaleString()}{" "}
                $
              </p>
            </div>
            <div className="statistic6">
              <h3>{t("qolganbalans")}:</h3>
              <p>
                {totalBalance.sum.toLocaleString()} so'm /{" "}
                {totalBalance.dollar.toLocaleString()} $
              </p>
            </div>

            <div className="linear-stats">
              <h2>{t("chiziqlistatistika")}</h2>
              <div className="chart-controls">
                <button
                  className={chartPeriod === "day" ? "active" : ""}
                  onClick={() => setChartPeriod("day")}
                >
                  {t("kun")}
                </button>
                <button
                  className={chartPeriod === "week" ? "active" : ""}
                  onClick={() => setChartPeriod("week")}
                >
                  {t("hafta")}
                </button>
                <button
                  className={chartPeriod === "month" ? "active" : ""}
                  onClick={() => setChartPeriod("month")}
                >
                  {t("oy")}
                </button>
                <button
                  className={chartPeriod === "year" ? "active" : ""}
                  onClick={() => setChartPeriod("year")}
                >
                  {t("yil")}
                </button>
              </div>
              <div className="chart-container">
                <svg className="chart-svg" viewBox="0 0 300 150">
                  <defs>
                    <linearGradient
                      id="chartGradient"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stopColor="rgb(86, 86, 255)"
                        stopOpacity="1"
                      />
                      <stop
                        offset="100%"
                        stopColor="rgb(204, 194, 255)"
                        stopOpacity="0.2"
                      />
                    </linearGradient>
                  </defs>
                  <path className="chart-path" d={getChartData()} />
                </svg>
              </div>
            </div>

            <div className="circular-stats">
              <h2>{t("aylanastatistika")}</h2>
              <div className="pie-container">
                <svg className="pie-chart" viewBox="0 0 100 100">
                  <circle
                    className="pie-bg"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="rgba(161, 161, 241, 0.1)"
                    strokeWidth="10"
                  />
                  <circle
                    className="pie-segment"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="rgb(86, 86, 255)"
                    strokeWidth="10"
                    strokeDasharray={`${getCircularData().percent * 2.51} 251.2`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  <text x="50" y="55" className="pie-text">
                    {getCircularData().percent}%
                  </text>
                </svg>
                <div className="pie-legend">
                  <div className="legend-item">
                    <span className="dot paid"></span>
                    <span>
                      {t("to'langan")}: {getCircularData().paid}
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="dot unpaid"></span>
                    <span>
                      {t("qolgan")}: {getCircularData().unpaid}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Dialog */}
      {logoutDialog && (
        <div className="confirm-overlay" onClick={handleLogoutCancel}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">
              {t("Are you sure you want to logout?")}
            </div>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-cancel"
                onClick={handleLogoutCancel}
              >
                {t("Cancel")}
              </button>
              <button
                className="confirm-btn confirm-logout"
                onClick={confirmLogout}
              >
                {t("Logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Worker Modal */}
      {addWorkerModal && (
        <div className="modal-overlay">
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {/* HEADER */}
            <div className="modal-header">
              <div>
                <h2>{editMode ? "Ishchini tahrirlash" : "Ishchi qo'shish"}</h2>
                <p>
                  {editMode
                    ? "Ma'lumotlarni o'zgartiring"
                    : "Barcha ma'lumotlarni kiriting"}
                </p>
              </div>
              <button className="close-btn" onClick={handleAddWorkerModalClose}>
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="modal-body">
              {/* LEFT */}
              <div className="form-section">
                <div className="input-group">
                  <label>{t("ishchiningismi")}</label>
                  <input
                    type="text"
                    value={workerName}
                    onChange={handleWorkerNameChange}
                    placeholder="Ism kiriting"
                  />
                </div>

                <div className="row">
                  <div className="input-group">
                    <label>{t("olishikerak")}</label>
                    <input
                      type="number"
                      value={amountToReceive}
                      onChange={(e) => setAmountToReceive(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="input-group small">
                    <label>{t("valyuta")}</label>
                    <select
                      value={currencyToReceive}
                      onChange={(e) => setCurrencyToReceive(e.target.value)}
                    >
                      <option value="sum">So'm</option>
                      <option value="dollar">$</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label>{t("berishsanasi")}</label>
                  <input
                    type="date"
                    value={dateToGive}
                    onChange={(e) => setDateToGive(e.target.value)}
                  />
                </div>

                <div className="row">
                  <div className="input-group">
                    <label>{t("olgansumma")}</label>
                    <input
                      type="number"
                      value={amountAlreadyReceived}
                      onChange={(e) => setAmountAlreadyReceived(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="input-group small">
                    <label>{t("valyuta")}</label>
                    <select
                      value={currencyAlreadyReceived}
                      onChange={(e) =>
                        setCurrencyAlreadyReceived(e.target.value)
                      }
                    >
                      <option value="sum">So'm</option>
                      <option value="dollar">$</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label>{t("olgansana")}</label>
                  <input
                    type="date"
                    value={dateAlreadyReceived}
                    onChange={(e) => setDateAlreadyReceived(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="modal-footer">
              <button
                className="btn cancel"
                onClick={handleAddWorkerModalClose}
              >
                {t("bekorqilish")}
              </button>

              <button
                className={`btn add ${!isFormValid ? "disabled" : ""}`}
                onClick={isFormValid ? handleAddWorker : null}
                disabled={!isFormValid}
              >
                {editMode ? "Saqlash" : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {balansQoshish && (
        <div className="modal-overlay">
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {/* HEADER */}
            <div className="modal-header">
              <div>
                <h2>{t("balansyangilash")}</h2>
                <p>{t("yangibalansmiqdorinikiriting")}</p>
              </div>
              <button className="close-btn" onClick={handleBalansModalClose}>
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="modal-body">
              <div className="form-section">
                <div className="row">
                  <div className="input-group">
                    <label>{t("balansmiqdori")}</label>
                    <input
                      type="number"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      placeholder="0"
                      autoFocus
                    />
                  </div>
                  <div className="input-group small">
                    <label>{t("valyuta")}</label>
                    <select
                      value={balanceCurrency}
                      onChange={(e) => setBalanceCurrency(e.target.value)}
                    >
                      <option value="sum">So'm</option>
                      <option value="dollar">$</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="modal-footer">
              <button className="btn cancel" onClick={handleBalansModalClose}>
                {t("bekorqilish")}
              </button>
              <button
                className={`btn add ${!balanceAmount ? "disabled" : ""}`}
                onClick={balanceAmount ? handleUpdateBalans : null}
                disabled={!balanceAmount}
              >
                {t("yangilash")}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteWorkerId && (
        <div
          className="confirm-overlay"
          onClick={() => setDeleteWorkerId(null)}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">
              {t("Haqiqatan ham ushbu ishchini o'chirmoqchimisiz?")}
              <br />
              <small style={{ color: "rgba(204,194,255,0.6)" }}>
                {t("Ushbu amalni bekor qilish imkoniyati bo'ladi.")}
              </small>
            </div>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => setDeleteWorkerId(null)}
              >
                {t("bekorqilish")}
              </button>
              <button
                className="confirm-btn confirm-logout"
                onClick={confirmDeleteWorker}
              >
                {t("o'chirish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPerformUndoConfirm && (
        <div
          className="confirm-overlay"
          onClick={() => setShowPerformUndoConfirm(false)}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">
              {t("Haqiqatan ham oxirgi harakatni bekor qilmoqchimisiz?")}
            </div>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => setShowPerformUndoConfirm(false)}
              >
                {t("yoq")}
              </button>
              <button
                className="confirm-btn confirm-logout"
                onClick={confirmPerformUndo}
              >
                {t("Ha, bekor qilish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUndoConfirm && (
        <div
          className="confirm-overlay"
          onClick={() => setShowUndoConfirm(false)}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">
              {t(
                "Ushbu amalni qaytarish imkoniyatini o'chirib tashlamoqchimisiz?",
              )}
            </div>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => setShowUndoConfirm(false)}
              >
                {t("bekorqilish")}
              </button>
              <button
                className="confirm-btn confirm-logout"
                onClick={confirmDismissUndo}
              >
                {t("o'chirish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteHistoryData && (
        <div
          className="confirm-overlay"
          onClick={() => setDeleteHistoryData(null)}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">
              {t("Haqiqatan ham ushbu tarixni o'chirmoqchimisiz?")}
              <br />
              <small style={{ color: "rgba(204,194,255,0.6)" }}>
                {t("Ushbu amalni bekor qilish imkoniyati bo'ladi.")}
              </small>
            </div>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => setDeleteHistoryData(null)}
              >
                Bekor qilish
              </button>
              <button
                className="confirm-btn confirm-logout"
                onClick={confirmDeleteHistory}
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {editingHistoryData && (
        <div
          className="modal-overlay"
          onClick={() => setEditingHistoryData(null)}
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{t("Tarixni tahrirlash")}</h2>
                <p>{t("O'zgartirishlarni kiriting")}</p>
              </div>
              <button
                className="close-btn"
                onClick={() => setEditingHistoryData(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-section">
                <div className="row">
                  <div className="input-group">
                    <label>{t("summa")}</label>
                    <input
                      type="number"
                      value={editingHistoryData.amount}
                      onChange={(e) =>
                        setEditingHistoryData({
                          ...editingHistoryData,
                          amount: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="input-group small">
                    <label>{t("valyuta")}</label>
                    <select
                      value={editingHistoryData.currency}
                      onChange={(e) =>
                        setEditingHistoryData({
                          ...editingHistoryData,
                          currency: e.target.value,
                        })
                      }
                    >
                      <option value="sum">So'm</option>
                      <option value="dollar">$</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>{t("sana")}</label>
                  <input
                    type="date"
                    value={editingHistoryData.date}
                    onChange={(e) =>
                      setEditingHistoryData({
                        ...editingHistoryData,
                        date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn cancel"
                onClick={() => setEditingHistoryData(null)}
              >
                Bekor qilish
              </button>
              <button className="btn add" onClick={handleEditHistorySave}>
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal for Mobile */}
      {isFilterModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{t("Filtrlash")}</h2>
                <p>{t("Ishchilarni izlash va saralash")}</p>
              </div>
              <button
                className="close-btn"
                onClick={() => setIsFilterModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body filter-modal-body">
              <div className="input-group">
                <label>{t("Qidiruv")}</label>
                <input
                  className="modal-search"
                  type="search"
                  placeholder="Ishchini izlash..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-options">
                <label>{t("Saralash turi")}</label>
                <button
                  className={`filter-btn ${activeFilter === "recent" ? "active" : ""}`}
                  onClick={() => {
                    setActiveFilter(
                      activeFilter === "recent" ? "all" : "recent",
                    );
                    setIsFilterModalOpen(false);
                  }}
                >
                  {t("Yangi qo'shilganlar")}
                </button>
                <button
                  className={`filter-btn ${activeFilter === "high" ? "active" : ""}`}
                  onClick={() => {
                    setActiveFilter(activeFilter === "high" ? "all" : "high");
                    setIsFilterModalOpen(false);
                  }}
                >
                  {t("Katta oylikli ishchilar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Hisobot;