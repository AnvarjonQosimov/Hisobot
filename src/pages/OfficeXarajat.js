import React, { useState, useEffect } from "react";
import "../styles/OfficeXarajat.css";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { HiMenu, HiX } from "react-icons/hi";
import ProjectReport from "./ProjectReport";

function OfficeXarajat() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // State Definitions
  const [username, setUsername] = useState("");
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [addExpenseModal, setAddExpenseModal] = useState(false);
  const [balansQoshish, setBalansQoshish] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [amountToPay, setAmountToPay] = useState("");
  const [dateToPay, setDateToPay] = useState("");
  const [amountAlreadyPaid, setAmountAlreadyPaid] = useState("");
  const [dateAlreadyPaid, setDateAlreadyPaid] = useState("");
  const [currencyToPay, setCurrencyToPay] = useState("sum");
  const [currencyAlreadyPaid, setCurrencyAlreadyPaid] = useState("sum");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceCurrency, setBalanceCurrency] = useState("sum");

  // Persistence States
  const [expenses, setExpenses] = useState([]);
  const [totalBalance, setTotalBalance] = useState({ sum: 0, dollar: 0 });
  const [initialBalance, setInitialBalance] = useState({ sum: 0, dollar: 0 });

  // UI/Edit Mode States
  const [editMode, setEditMode] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  // Mini Calculator State
  const [miniCalcOpen, setMiniCalcOpen] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPrevious, setCalcPrevious] = useState(null);
  const [calcOperation, setCalcOperation] = useState(null);
  const [calcWaiting, setCalcWaiting] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState([]);
  const [undoState, setUndoState] = useState(null);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showPerformUndoConfirm, setShowPerformUndoConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [deleteExpenseId, setDeleteExpenseId] = useState(null);

  // History Edit & Delete State
  const [deleteHistoryData, setDeleteHistoryData] = useState(null);
  const [editingHistoryData, setEditingHistoryData] = useState(null);

  const [chartPeriod, setChartPeriod] = useState("week");

  // Responsive State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isConstructionExpanded, setIsConstructionExpanded] = useState(false);

  // Dynamic Project Files State
  const [projectFiles, setProjectFiles] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null); // null = office view
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [deleteProjectId, setDeleteProjectId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [calcPosition, setCalcPosition] = useState({ x: 100, y: 100 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load from localStorage (Account Scoped)
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) {
      navigate("/login");
      return;
    }
    setUsername(storedUsername);

    const storedExpenses = localStorage.getItem(
      `office_expenses_${storedUsername}`,
    );
    if (storedExpenses) setExpenses(JSON.parse(storedExpenses));

    const storedBalance = localStorage.getItem(
      `office_balance_${storedUsername}`,
    );
    if (storedBalance) setTotalBalance(JSON.parse(storedBalance));

    const storedInitialBalance = localStorage.getItem(
      `office_initial_balance_${storedUsername}`,
    );
    if (storedInitialBalance)
      setInitialBalance(JSON.parse(storedInitialBalance));

    // Load Project Files
    const storedProjects = localStorage.getItem(`projects_${storedUsername}`);
    if (storedProjects) setProjectFiles(JSON.parse(storedProjects));
  }, [navigate]);

  // Save to localStorage (Account Scoped)
  useEffect(() => {
    if (!username) return;
    localStorage.setItem(`projects_${username}`, JSON.stringify(projectFiles));
  }, [projectFiles, username]);
  useEffect(() => {
    if (!username) return;
    localStorage.setItem(
      `office_expenses_${username}`,
      JSON.stringify(expenses),
    );
  }, [expenses, username]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(
      `office_balance_${username}`,
      JSON.stringify(totalBalance),
    );
  }, [totalBalance, username]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(
      `office_initial_balance_${username}`,
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

  const handleAddExpenseClick = () => {
    setAddExpenseModal(true);
  };

  const handleAddExpenseModalClose = () => {
    setAddExpenseModal(false);
    setEditMode(false);
    setEditingExpenseId(null);
    setExpenseName("");
    setAmountToPay("");
    setDateToPay("");
    setAmountAlreadyPaid("");
    setDateAlreadyPaid("");
    setCurrencyToPay("sum");
    setCurrencyAlreadyPaid("sum");
    setMiniCalcOpen(false);
    setCalcDisplay("0");
    setCalcPrevious(null);
    setCalcOperation(null);
    setCalcPosition({ x: 100, y: 100 });
  };

  const handleBalansModalClose = () => {
    setBalansQoshish(false);
    setBalanceAmount("");
    setBalanceCurrency("sum");
    setMiniCalcOpen(false);
    setCalcDisplay("0");
    setCalcPrevious(null);
    setCalcOperation(null);
    setCalcPosition({ x: 100, y: 100 });
  };

  // Dragging logic
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - calcPosition.x,
      y: e.clientY - calcPosition.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setCalcPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const saveForUndo = () => {
    setUndoState({
      expenses: JSON.parse(JSON.stringify(expenses)),
      totalBalance: { ...totalBalance },
      initialBalance: { ...initialBalance },
    });
  };

  const handleUndoClick = () => {
    setShowPerformUndoConfirm(true);
  };

  const confirmPerformUndo = () => {
    if (!undoState) return;
    setExpenses(undoState.expenses);
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

  const handleExpenseNameChange = (e) => {
    const value = e.target.value;
    const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    setExpenseName(capitalizedValue);
  };

  const handleAddExpense = () => {
    if (editMode) {
      saveForUndo();
      setExpenses(
        expenses.map((e) =>
          e.id === editingExpenseId
            ? {
                ...e,
                expenseName,
                amountToPay,
                currencyToPay,
                dateToPay,
                amountAlreadyPaid,
                currencyAlreadyPaid,
                dateAlreadyPaid,
              }
            : e,
        ),
      );
    } else {
      const newExpense = {
        id: Date.now(),
        expenseName,
        amountToPay,
        currencyToPay,
        dateToPay,
        amountAlreadyPaid,
        currencyAlreadyPaid,
        dateAlreadyPaid,
        createdAt: new Date().toISOString(),
        isPaid: false,
        history: [],
      };
      setExpenses([newExpense, ...expenses]);
    }
    handleAddExpenseModalClose();
  };

  const handleEditExpenseClick = (expense) => {
    setEditMode(true);
    setEditingExpenseId(expense.id);
    setExpenseName(expense.expenseName);
    setAmountToPay(expense.amountToPay);
    setDateToPay(expense.dateToPay);
    setAmountAlreadyPaid(expense.amountAlreadyPaid);
    setDateAlreadyPaid(expense.dateAlreadyPaid);
    setCurrencyToPay(expense.currencyToPay);
    setCurrencyAlreadyPaid(expense.currencyAlreadyPaid);
    setAddExpenseModal(true);
  };

  const handleDeleteExpenseClick = (id) => {
    setDeleteExpenseId(id);
  };

  const confirmDeleteExpense = () => {
    if (deleteExpenseId) {
      saveForUndo();
      setExpenses(expenses.filter((e) => e.id !== deleteExpenseId));
      setDeleteExpenseId(null);
    }
  };

  const confirmDeleteHistory = () => {
    if (deleteHistoryData) {
      saveForUndo();
      setExpenses(
        expenses.map((e) => {
          if (e.id === deleteHistoryData.expenseId) {
            const newHistory = [...(e.history || [])];
            newHistory.splice(deleteHistoryData.index, 1);
            return { ...e, history: newHistory };
          }
          return e;
        }),
      );
      setDeleteHistoryData(null);
    }
  };

  const handleEditHistorySave = () => {
    if (editingHistoryData) {
      saveForUndo();
      setExpenses(
        expenses.map((e) => {
          if (e.id === editingHistoryData.expenseId) {
            const newHistory = [...(e.history || [])];
            newHistory[editingHistoryData.index] = {
              amount: editingHistoryData.amount,
              currency: editingHistoryData.currency,
              date: editingHistoryData.date,
              type: editingHistoryData.type,
            };
            return { ...e, history: newHistory };
          }
          return e;
        }),
      );
      setEditingHistoryData(null);
    }
  };

  const handleTogglePaid = (id) => {
    const expense = expenses.find((e) => e.id === id);
    if (!expense) return;

    const newIsPaid = !expense.isPaid;
    const amount = parseFloat(expense.amountToPay || 0);
    const currency = expense.currencyToPay;

    setTotalBalance((prev) => ({
      ...prev,
      [currency]: newIsPaid ? prev[currency] - amount : prev[currency] + amount,
    }));

    setExpenses(
      expenses.map((e) => (e.id === id ? { ...e, isPaid: newIsPaid } : e)),
    );
  };

  const handleNextCycle = (id) => {
    saveForUndo();
    setExpenses(
      expenses.map((e) => {
        if (e.id !== id) return e;

        const newHistoryItem = {
          amount: e.amountAlreadyPaid,
          currency: e.currencyAlreadyPaid,
          date: e.dateAlreadyPaid,
          type: "archived",
        };

        return {
          ...e,
          history: [...(e.history || []), newHistoryItem],
          amountAlreadyPaid: e.amountToPay,
          currencyAlreadyPaid: e.currencyToPay,
          dateAlreadyPaid: new Date().toISOString().split("T")[0],
          amountToPay: "",
          isPaid: false,
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
    saveForUndo();
    const newAmount = parseFloat(balanceAmount || 0);

    const totalSpent = expenses.reduce((acc, curr) => {
      if (curr.currencyToPay !== balanceCurrency) return acc;

      const currentCost = parseFloat(curr.amountToPay) || 0;
      const historyCost = (curr.history || []).reduce(
        (hAcc, hCurr) =>
          hCurr.currency === balanceCurrency
            ? hAcc + (parseFloat(hCurr.amount) || 0)
            : hAcc,
        0,
      );
      const lastPaid =
        curr.currencyAlreadyPaid === balanceCurrency
          ? parseFloat(curr.amountAlreadyPaid) || 0
          : 0;

      return acc + currentCost + historyCost + lastPaid;
    }, 0);

    setInitialBalance((prev) => ({
      ...prev,
      [balanceCurrency]: newAmount,
    }));

    setTotalBalance((prev) => ({
      ...prev,
      [balanceCurrency]: newAmount - totalSpent,
    }));

    handleBalansModalClose();
  };

  const getChartData = () => {
    const now = new Date();
    let data = [];
    let allPayments = [];

    expenses.forEach((e) => {
      if (parseFloat(e.amountAlreadyPaid) > 0) {
        allPayments.push({
          date: new Date(e.createdAt),
          amount: parseFloat(e.amountAlreadyPaid),
          currency: e.currencyAlreadyPaid,
        });
      }
      (e.history || []).forEach((h) => {
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
    const totalCount = expenses.length;
    if (totalCount === 0) return { paid: 0, unpaid: 0, percent: 0 };
    const paidCount = expenses.filter((e) => e.isPaid).length;
    const percent = Math.round((paidCount / totalCount) * 100);
    return { paid: paidCount, unpaid: totalCount - paidCount, percent };
  };

  const handleCalcNumber = (num) => {
    if (calcWaiting) {
      setCalcDisplay(String(num));
      setCalcWaiting(false);
    } else {
      setCalcDisplay(calcDisplay === "0" ? String(num) : calcDisplay + num);
    }
  };

  const handleCalcOperation = (op) => {
    const input = parseFloat(calcDisplay);
    if (calcPrevious === null) {
      setCalcPrevious(input);
    } else if (calcOperation) {
      const result = performCalculation(calcPrevious, input, calcOperation);
      setCalcDisplay(String(result));
      setCalcPrevious(result);
    }
    setCalcOperation(op);
    setCalcWaiting(true);
  };

  const performCalculation = (prev, curr, op) => {
    switch (op) {
      case "+":
        return prev + curr;
      case "-":
        return prev - curr;
      case "*":
        return prev * curr;
      case "/":
        return prev / curr;
      default:
        return curr;
    }
  };

  const handleCalcEquals = () => {
    const input = parseFloat(calcDisplay);
    if (calcPrevious !== null && calcOperation) {
      const result = performCalculation(calcPrevious, input, calcOperation);
      setCalcDisplay(String(result));
      setCalcPrevious(null);
      setCalcOperation(null);
      setCalcWaiting(true);
    }
  };

  const handleCalcClear = () => {
    setCalcDisplay("0");
    setCalcPrevious(null);
    setCalcOperation(null);
    setCalcWaiting(false);
  };

  const handleUseCalcValue = (field) => {
    if (field === "toPay") setAmountToPay(calcDisplay);
    if (field === "alreadyPaid") setAmountAlreadyPaid(calcDisplay);
  };

  const isFormValid =
    expenseName &&
    amountToPay &&
    dateToPay &&
    amountAlreadyPaid &&
    dateAlreadyPaid;

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };
  const [age, setAge] = React.useState(i18n.language || "uz");
  // const handleChange = (event) => setAge(event.target.value);

  const handleAddProject = () => {
    if (!newFileName.trim()) return;
    const newProject = {
      id: Date.now(),
      name: newFileName.trim(),
    };
    setProjectFiles([...projectFiles, newProject]);
    setNewFileName("");
    setIsFileModalOpen(false);
    setActiveProjectId(newProject.id); // Open the new project immediately
  };

  const confirmDeleteProject = () => {
    if (deleteProjectId) {
      setProjectFiles(projectFiles.filter((p) => p.id !== deleteProjectId));
      if (activeProjectId === deleteProjectId) {
        setActiveProjectId(null); // Back to office if active project is deleted
      }
      setDeleteProjectId(null);
    }
  };

  return (
    <div className="OfficeXarajat">
      <button
        className="mobile-menu-btn"
        onClick={() => setIsSidebarOpen(true)}
      >
        <HiMenu />
      </button>

      {/* Sidebar and Main Layout */}

      <div className={`OfficeXarajatLeft ${isSidebarOpen ? "open" : ""}`}>
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
            <Link to="/hisobot" onClick={() => setIsSidebarOpen(false)}>
              <h3>{t("Ishchilar hisoboti")}</h3>
            </Link>
            <div className={`QurilishXarajatlari ${isConstructionExpanded ? "expanded" : ""}`}>
              <h2 onClick={() => setIsConstructionExpanded(!isConstructionExpanded)}>
                {t("qurilishxarajatlari")} <span>{">"}</span>
              </h2>
              <div className="project-list-container">
                <h4 onClick={() => setIsFileModalOpen(true)}>+ Fayl</h4>
                <div className="project-items">
                  {projectFiles.map((project) => (
                    <div
                      key={project.id}
                      className={`project-sidebar-item ${activeProjectId === project.id ? "active" : ""}`}
                      onClick={() => {
                        setActiveProjectId(activeProjectId === project.id ? null : project.id);
                        setIsSidebarOpen(false);
                      }}
                    >
                      <span className="project-name">{project.name}</span>
                      <button
                        className="delete-project-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteProjectId(project.id);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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

      {activeProjectId === null ? (
        <div className="OfficeXarajatRight">
          {isRightPanelOpen && (
            <div
              className="sidebar-overlay"
              onClick={() => setIsRightPanelOpen(false)}
            ></div>
          )}
          <button
            className="right-panel-toggle-btn"
            onClick={() => setIsRightPanelOpen(true)}
          >
            ‹
          </button>
        <div className="rightTop">
          <h3 className="addH3" onClick={handleAddExpenseClick}>
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
            placeholder={t("qidiruv")}
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
              {t("Yangi qo'shilganlar")}
            </h3>
            <h3
              className={activeFilter === "high" ? "active-filter" : ""}
              onClick={() =>
                setActiveFilter(activeFilter === "high" ? "all" : "high")
              }
            >
              {t("Katta sarflar")}
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
              <button className="undo-btn icon-only" onClick={handleUndoClick}>
                ↩️
              </button>
              <button
                className="undo-close-btn"
                onClick={handleDismissUndoClick}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="rightBottom">
          {(() => {
            let filtered = expenses.filter((e) =>
              e.expenseName.toLowerCase().includes(searchTerm.toLowerCase()),
            );
            if (activeFilter === "recent") {
              filtered = [...filtered]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);
            } else if (activeFilter === "high") {
              filtered = filtered.filter((e) => {
                const val = parseFloat(e.amountToPay) || 0;
                return e.currencyToPay === "sum" ? val > 5000000 : val > 500;
              });
            }

            if (filtered.length === 0) {
              return (
                <div className="no-workers">
                  <p>
                    {searchTerm
                      ? t("hisobot_qidiruv_placeholder")
                      : t("hisobot_no_workers")}
                  </p>
                </div>
              );
            }

            return (
              <div className="worker-list">
                {filtered.map((expense) => (
                  <div
                    key={expense.id}
                    className={`worker-item ${expense.isPaid ? "paid-row" : ""}`}
                  >
                    <div className="worker-item-main">
                      <div className="worker-info">
                        <input
                          type="checkbox"
                          className="paid-checkbox"
                          checked={expense.isPaid}
                          onChange={() => handleTogglePaid(expense.id)}
                        />
                        <div className="name-date">
                          <h3>{expense.expenseName}</h3>
                          <span>
                            {new Date(expense.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="worker-values">
                        <div className="val-group">
                          <p>{t("To'lanishi kerak")}:</p>
                          <strong className="to-receive">
                            {parseFloat(expense.amountToPay || 0).toLocaleString()}{" "}
                            {expense.currencyToPay === "sum" ? t("som") : "$"}
                          </strong>
                          <span className="small-date">
                            {t("sana")}: {expense.dateToPay}
                          </span>
                        </div>
                        <div className="val-group">
                          <p>{t("To'langan summa")}:</p>
                          <strong className="received">
                            {parseFloat(expense.amountAlreadyPaid || 0).toLocaleString()}{" "}
                            {expense.currencyAlreadyPaid === "sum"
                              ? t("som")
                              : "$"}
                          </strong>
                          <span className="small-date">
                            {t("sana")}: {expense.dateAlreadyPaid}
                          </span>
                        </div>
                      </div>
                      <div className="worker-actions">
                        <button
                          className="month-btn"
                          onClick={() => handleNextCycle(expense.id)}
                          title="Yangi sikl"
                        >
                          🔄
                        </button>
                        <button
                          className="history-toggle-btn"
                          onClick={() => toggleHistory(expense.id)}
                        >
                          📜
                        </button>
                        <button
                          className="edit-btn"
                          onClick={() => handleEditExpenseClick(expense)}
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteExpenseClick(expense.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {expandedHistory.includes(expense.id) && (
                      <div className="history-section">
                        <h4>{t("Xarajatlar tarixi")}:</h4>
                        {(expense.history || []).length === 0 ? (
                          <p className="no-history">{t("tarix_mavjud_emas")}</p>
                        ) : (
                          expense.history.map((h, idx) => (
                            <div key={idx} className="history-item">
                              <span>{h.date}</span>
                              <span>
                                {h.amount} {h.currency === "sum" ? t("som") : "$"}
                              </span>
                              <span className="h-type">
                                {h.type === "archived"
                                  ? t("arxivlandi")
                                  : t("To'langan")}
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
                                      expenseId: expense.id,
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
                                      expenseId: expense.id,
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
              <h3>{t("Boshlang'ich balans")}:</h3>
              <p>
                {initialBalance.sum.toLocaleString()} so'm /{" "}
                {initialBalance.dollar.toLocaleString()} $
              </p>
            </div>
            <div className="statistic2">
              <h3>{t("Jami xarajatlar")}:</h3>
              <p>{expenses.length}</p>
            </div>
            <div className="statistic3">
              <h3>{t("Eng katta xarajat")}:</h3>
              <p>
                {(() => {
                  const sumHigh = expenses
                    .filter((e) => e.currencyToPay === "sum")
                    .sort(
                      (a, b) =>
                        (parseFloat(b.amountToPay) || 0) -
                        (parseFloat(a.amountToPay) || 0),
                    )[0];
                  const dolHigh = expenses
                    .filter((e) => e.currencyToPay === "dollar")
                    .sort(
                      (a, b) =>
                        (parseFloat(b.amountToPay) || 0) -
                        (parseFloat(a.amountToPay) || 0),
                    )[0];
                  return `${sumHigh ? sumHigh.expenseName + ": " + parseFloat(sumHigh.amountToPay).toLocaleString() + " so'm" : t("yo'q")} / ${dolHigh ? dolHigh.expenseName + ": " + parseFloat(dolHigh.amountToPay).toLocaleString() + " $" : t("yo'q")}`;
                })()}
              </p>
            </div>
            <div className="statistic4">
              <h3>{t("Qolgan balans")}:</h3>
              <p
                className={
                  totalBalance.sum < 0 || totalBalance.dollar < 0
                    ? "negative-balance"
                    : ""
                }
              >
                {totalBalance.sum.toLocaleString()} {t("som")} /{" "}
                {totalBalance.dollar.toLocaleString()} $
              </p>
            </div>

            <div className="linear-stats">
              <h2>{t("Xarajatlar o'zgarishi")}</h2>
              <div className="chart-controls">
                {["day", "week", "month", "year"].map((p) => (
                  <button
                    key={p}
                    className={chartPeriod === p ? "active" : ""}
                    onClick={() => setChartPeriod(p)}
                  >
                    {p === "day"
                      ? t("kun")
                      : p === "week"
                        ? t("hafta")
                        : p === "month"
                          ? t("oy")
                          : t("yil")}
                  </button>
                ))}
              </div>
              <div className="chart-container">
                <svg className="chart-svg" viewBox="0 0 300 150">
                  <defs>
                    <linearGradient
                      id="chartGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#5656ff" />
                      <stop offset="100%" stopColor="#28ec70" />
                    </linearGradient>
                  </defs>
                  <path className="chart-path" d={getChartData()} />
                </svg>
              </div>
            </div>

            <div className="circular-stats">
              <h2>{t("Aylana Statistika")}</h2>
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
                    stroke="#5656ff"
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
                      {t("To'langan")}: {getCircularData().paid}
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="dot unpaid"></span>
                    <span>
                      {t("Qolgan")}: {getCircularData().unpaid}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>) : (
        <ProjectReport
          projectId={activeProjectId}
          onClose={() => setActiveProjectId(null)}
          projectName={
            projectFiles.find((p) => p.id === activeProjectId)
              ? projectFiles.find((p) => p.id === activeProjectId).name
              : ""
          }
        />
      )}

      {/* Modals */}
      {logoutDialog && (
        <div className="confirm-overlay" onClick={handleLogoutCancel}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message">
              {t("Haqiqatdan ham chiqishni xohlaysizmi?")}
            </p>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-cancel"
                onClick={handleLogoutCancel}
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

      {addExpenseModal && (
        <div className="modal-overlay" onClick={handleAddExpenseModalClose}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? t("pr_tahrirlash") : t("qo'shish")}</h2>
              <button
                className="close-btn"
                onClick={handleAddExpenseModalClose}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-section">
                <div className="input-group">
                  <label>{t("Xarajat nomi / turi")}</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      placeholder={t("office_nom_placeholder")}
                      value={expenseName}
                      onChange={handleExpenseNameChange}
                    />
                  </div>
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>{t("To'lanishi kerak")}</label>
                    <div className="input-wrapper">
                      <input
                        type="number"
                        value={amountToPay}
                        onChange={(e) => setAmountToPay(e.target.value)}
                      />
                      <button
                        className="calc-btn-trigger"
                        onClick={() => setMiniCalcOpen(!miniCalcOpen)}
                      >
                        🧮
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>{t("valyuta")}</label>
                    <select
                      value={currencyToPay}
                      onChange={(e) => setCurrencyToPay(e.target.value)}
                      className="modal-select"
                    >
                      <option value="sum">{t("som")}</option>
                      <option value="dollar">{t("dollar")} ($)</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>{t("To'lov muddati (sana)")}</label>
                  <div className="input-wrapper">
                    <input
                      type="date"
                      value={dateToPay}
                      onChange={(e) => setDateToPay(e.target.value)}
                    />
                  </div>
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>{t("To'langan summa")}</label>
                    <div className="input-wrapper">
                      <input
                        type="number"
                        value={amountAlreadyPaid}
                        onChange={(e) => setAmountAlreadyPaid(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>{t("valyuta")}</label>
                    <select
                      value={currencyAlreadyPaid}
                      onChange={(e) => setCurrencyAlreadyPaid(e.target.value)}
                      className="modal-select"
                    >
                      <option value="sum">{t("som")}</option>
                      <option value="dollar">{t("dollar")} ($)</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>{t("To'langan sana")}</label>
                  <div className="input-wrapper">
                    <input
                      type="date"
                      value={dateAlreadyPaid}
                      onChange={(e) => setDateAlreadyPaid(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={handleAddExpenseModalClose}
              >
                {t("bekorqilish")}
              </button>
              <button
                className="btn-submit"
                disabled={!isFormValid}
                onClick={handleAddExpense}
              >
                {editMode ? t("saqlash") : t("qo'shish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {balansQoshish && (
        <div className="modal-overlay" onClick={handleBalansModalClose}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("Balansni yangilash")}</h2>
              <button className="close-btn" onClick={handleBalansModalClose}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-section">
                <div className="input-group">
                  <label>{t("Yangi balans miqdori")}</label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                    />
                    <button
                      className="calc-btn-trigger"
                      onClick={() => setMiniCalcOpen(!miniCalcOpen)}
                    >
                      🧮
                    </button>
                  </div>
                </div>
                <div className="input-group">
                  <label>{t("valyuta")}</label>
                  <select
                    value={balanceCurrency}
                    onChange={(e) => setBalanceCurrency(e.target.value)}
                    className="modal-select"
                  >
                    <option value="sum">So'm</option>
                    <option value="dollar">Dollar ($)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleBalansModalClose}>
                {t("bekorqilish")}
              </button>
              <button className="btn-submit" onClick={handleUpdateBalans}>
                {t("yangilash")}
              </button>
            </div>
          </div>
        </div>
      )}

      {miniCalcOpen && (
        <div
          className="mini-calc"
          style={{ left: calcPosition.x, top: calcPosition.y }}
        >
          <div className="calc-header" onMouseDown={handleMouseDown}>
            <span>{t("Kalkulator")}</span>
            <button
              className="close-btn"
              onClick={() => setMiniCalcOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="calc-screen">{calcDisplay}</div>
          <div className="calc-grid">
            <button onClick={handleCalcClear}>C</button>
            <button className="op-btn" onClick={() => handleCalcOperation("/")}>
              ÷
            </button>
            <button className="op-btn" onClick={() => handleCalcOperation("*")}>
              ×
            </button>
            <button
              onClick={() => setCalcDisplay(calcDisplay.slice(0, -1) || "0")}
            >
              ⌫
            </button>
            {[7, 8, 9].map((n) => (
              <button key={n} onClick={() => handleCalcNumber(n)}>
                {n}
              </button>
            ))}
            <button className="op-btn" onClick={() => handleCalcOperation("-")}>
              -
            </button>
            {[4, 5, 6].map((n) => (
              <button key={n} onClick={() => handleCalcNumber(n)}>
                {n}
              </button>
            ))}
            <button className="op-btn" onClick={() => handleCalcOperation("+")}>
              +
            </button>
            {[1, 2, 3].map((n) => (
              <button key={n} onClick={() => handleCalcNumber(n)}>
                {n}
              </button>
            ))}
            <button
              className="eq-btn"
              style={{ gridRow: "span 2" }}
              onClick={handleCalcEquals}
            >
              =
            </button>
            <button
              style={{ gridColumn: "span 2" }}
              onClick={() => handleCalcNumber(0)}
            >
              0
            </button>
            <button
              onClick={() =>
                !calcDisplay.includes(".") && setCalcDisplay(calcDisplay + ".")
              }
            >
              .
            </button>
          </div>
          <div className="calc-footer">
            <button onClick={() => handleUseCalcValue("toPay")}>
              {t("To'lovga")}
            </button>
            <button onClick={() => handleUseCalcValue("alreadyPaid")}>
              {t("Olgan sum-ga")}
            </button>
          </div>
        </div>
      )}

      {deleteExpenseId && (
        <div className="confirm-overlay" onClick={() => setDeleteExpenseId(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message">
              {t("Ushbu xarajatni o'chirib tashlamoqchimisiz?")}
            </p>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => setDeleteExpenseId(null)}
              >
                {t("bekorqilish")}
              </button>
              <button
                className="confirm-btn confirm-logout"
                onClick={confirmDeleteExpense}
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
            <p className="confirm-message">
              {t("Haqiqatan ham oxirgi harakatni bekor qilmoqchimisiz?")}
            </p>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => setShowPerformUndoConfirm(false)}
              >
                {t("yo'q")}
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
        <div className="confirm-overlay" onClick={() => setShowUndoConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message">
              {t("bekor_qilish_imkoniyati_ochirilsinmi")}
            </p>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => setShowUndoConfirm(false)}
              >
                {t("yo'q")}
              </button>
              <button
                className="confirm-btn confirm-logout"
                onClick={confirmDismissUndo}
              >
                {t("Ha, o'chirilsin")}
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
                {t("bekorqilish")}
              </button>
              <button
                className="confirm-btn confirm-logout"
                onClick={confirmDeleteHistory}
              >
                {t("o'chirish")}
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
                      <option value="sum">{t("som")}</option>
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
                {t("bekorqilish")}
              </button>
              <button className="btn save" onClick={handleEditHistorySave}>
                {t("saqlash")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isFileModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsFileModalOpen(false)}
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t("pr_fayl_ochish_header")}</h3>
              <button
                className="close-btn"
                onClick={() => setIsFileModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>{t("pr_fayl_nomi_label")}</label>
                <input
                  type="text"
                  placeholder={t("pr_fayl_nomi_placeholder")}
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setIsFileModalOpen(false)}
              >
                {t("bekorqilish")}
              </button>
              <button className="btn-submit" onClick={handleAddProject}>
                {t("qo'shish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteProjectId && (
        <div
          className="confirm-overlay"
          onClick={() => setDeleteProjectId(null)}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message">
              {t("pr_faylni_ochirish_savoli")}
            </p>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => setDeleteProjectId(null)}
              >
                {t("yo'q")}
              </button>
              <button
                className="confirm-btn confirm-logout"
                onClick={confirmDeleteProject}
              >
                {t("Ha, o'chirilsin")}
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
                <h2>{t("filtrlash")}</h2>
                <p>{t("Xarajatlarni izlash va saralash")}</p>
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
                <label>{t("qidiruv")}</label>
                <input
                  className="modal-search"
                  type="search"
                  placeholder={t("office_qidiruv_placeholder")}
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
                  {t("Katta sarflar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfficeXarajat;