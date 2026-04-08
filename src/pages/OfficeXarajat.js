import React, { useState, useEffect } from "react";
import "../styles/OfficeXarajat.css";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

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
  const [age, setAge] = useState("uz");

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

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); 

  // Custom Delete Modal State
  const [deleteExpenseId, setDeleteExpenseId] = useState(null);

  // Linear Stats State
  const [chartPeriod, setChartPeriod] = useState("week"); 

  // Draggable State
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

    const storedExpenses = localStorage.getItem(`office_expenses_${storedUsername}`);
    if (storedExpenses) setExpenses(JSON.parse(storedExpenses));

    const storedBalance = localStorage.getItem(`office_balance_${storedUsername}`);
    if (storedBalance) setTotalBalance(JSON.parse(storedBalance));

    const storedInitialBalance = localStorage.getItem(`office_initial_balance_${storedUsername}`);
    if (storedInitialBalance) setInitialBalance(JSON.parse(storedInitialBalance));
  }, [navigate]);

  // Save to localStorage (Account Scoped)
  useEffect(() => {
    if (!username) return;
    localStorage.setItem(`office_expenses_${username}`, JSON.stringify(expenses));
  }, [expenses, username]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(`office_balance_${username}`, JSON.stringify(totalBalance));
  }, [totalBalance, username]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(`office_initial_balance_${username}`, JSON.stringify(initialBalance));
  }, [initialBalance, username]);

  const handleLogout = () => {
    setLogoutDialog(true);
  };

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

  const handleUndo = () => {
    if (!undoState) return;
    setExpenses(undoState.expenses);
    setTotalBalance(undoState.totalBalance);
    setInitialBalance(undoState.initialBalance);
    setUndoState(null);
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
        (hAcc, hCurr) => hCurr.currency === balanceCurrency ? hAcc + (parseFloat(hCurr.amount) || 0) : hAcc,
        0
      );
      const lastPaid = curr.currencyAlreadyPaid === balanceCurrency ? parseFloat(curr.amountAlreadyPaid) || 0 : 0;
      
      return acc + currentCost + historyCost + lastPaid;
    }, 0);

    setInitialBalance({
      sum: balanceCurrency === "sum" ? newAmount : 0,
      dollar: balanceCurrency === "dollar" ? newAmount : 0,
    });

    setTotalBalance({
      sum: balanceCurrency === "sum" ? newAmount - totalSpent : 0,
      dollar: balanceCurrency === "dollar" ? newAmount - totalSpent : 0,
    });

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
          .filter((p) => p.date.getHours() === d.getHours() && p.date.getDate() === d.getDate())
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
          .filter((p) => p.date.getMonth() === d.getMonth() && p.date.getFullYear() === d.getFullYear())
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
      case "+": return prev + curr;
      case "-": return prev - curr;
      case "*": return prev * curr;
      case "/": return prev / curr;
      default: return curr;
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

  const isFormValid = expenseName && amountToPay && dateToPay && amountAlreadyPaid && dateAlreadyPaid;

  return (
    <div className="OfficeXarajat">
      <div className="OfficeXarajatLeft">
        <div className="hisobotLeftText">
          <div className="leftTop">
            <h1>HisobotUz</h1>
            <p>{username}</p>
            <Link to="/profil"><h3>Profil</h3></Link>
            <Link to="/calculator2"><h3>{t("Kalkulator")}</h3></Link>
            <Link to="/hisobot"><h3>Ishchilar hisoboti</h3></Link>
          </div>
          <div className="leftBottom">
            <button className="logout-btn" onClick={handleLogout}><h3>Chiqish</h3></button>
          </div>
        </div>
        <div className="leftLine"></div>
      </div>

      <div className="OfficeXarajatRight">
        <div className="rightTop">
          <h3 className="addH3" onClick={handleAddExpenseClick}>+ Qo'shish</h3>
          <h3 className="addH3" onClick={handleBalansClick}>+ Balans</h3>
          <div className="ql"><div className="qoshishLine"></div></div>
          <input
            className="searchWorker"
            type="search"
            placeholder="Xarajatni izlash"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="filterIshchilar">
            <h3 className={activeFilter === "recent" ? "active-filter" : ""} 
                onClick={() => setActiveFilter(activeFilter === "recent" ? "all" : "recent")}>Yangilar</h3>
            <h3 className={activeFilter === "high" ? "active-filter" : ""}
                onClick={() => setActiveFilter(activeFilter === "high" ? "all" : "high")}>Katta sarf</h3>
            {undoState && (
              <div className="undo-group">
                <button className="undo-btn icon-only" onClick={handleUndo}>↩️</button>
                <button className="undo-close-btn" onClick={handleDismissUndoClick}>✕</button>
              </div>
            )}
          </div>
        </div>

        <div className="rightBottom">
          {(() => {
            let filtered = expenses.filter((e) => e.expenseName.toLowerCase().includes(searchTerm.toLowerCase()));
            if (activeFilter === "recent") {
              filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
            } else if (activeFilter === "high") {
              filtered = filtered.filter((e) => {
                const val = parseFloat(e.amountToPay) || 0;
                return e.currencyToPay === "sum" ? val > 5000000 : val > 500;
              });
            }

            if (filtered.length === 0) {
              return (
                <div className="no-workers">
                  <p>{searchTerm ? "Qidiruv bo'yicha hech narsa topilmadi." : "Hozircha xarajatlar yo'q. \"+ Qo'shish\" tugmasini bosing."}</p>
                </div>
              );
            }

            return (
              <div className="worker-list">
                {filtered.map((expense) => (
                  <div key={expense.id} className={`worker-item ${expense.isPaid ? "paid-row" : ""}`}>
                    <div className="worker-item-main">
                      <div className="worker-info">
                        <input type="checkbox" className="paid-checkbox" checked={expense.isPaid} onChange={() => handleTogglePaid(expense.id)} />
                        <div className="name-date">
                          <h3>{expense.expenseName}</h3>
                          <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="worker-values">
                        <div className="val-group">
                          <p>To'lanishi kerak:</p>
                          <strong className="to-receive">{expense.amountToPay} {expense.currencyToPay === "sum" ? "so'm" : "$"}</strong>
                          <span className="small-date">Sana: {expense.dateToPay}</span>
                        </div>
                        <div className="val-group">
                          <p>To'langan summa:</p>
                          <strong className="received">{expense.amountAlreadyPaid} {expense.currencyAlreadyPaid === "sum" ? "so'm" : "$"}</strong>
                          <span className="small-date">Sana: {expense.dateAlreadyPaid}</span>
                        </div>
                      </div>
                      <div className="worker-actions">
                        <button className="month-btn" onClick={() => handleNextCycle(expense.id)} title="Yangi sikl">🔄</button>
                        <button className="history-toggle-btn" onClick={() => toggleHistory(expense.id)}>📜</button>
                        <button className="edit-btn" onClick={() => handleEditExpenseClick(expense)}>✏️</button>
                        <button className="delete-btn" onClick={() => handleDeleteExpenseClick(expense.id)}>🗑️</button>
                      </div>
                    </div>
                    {expandedHistory.includes(expense.id) && (
                      <div className="history-section">
                        <h4>Xarajatlar tarixi:</h4>
                        {(expense.history || []).length === 0 ? <p className="no-history">Tarix mavjud emas</p> :
                          expense.history.map((h, idx) => (
                            <div key={idx} className="history-item">
                              <span>{h.date}</span>
                              <span>{h.amount} {h.currency === "sum" ? "so'm" : "$"}</span>
                              <span className="h-type">{h.type === "archived" ? "Arxivlandi" : "To'landi"}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="OfficeXarajatRightMain">
          <div className="lrLine"></div>
          <div className="statistic">
            <h2>Statistika</h2>
            <div className="statistic1">
              <h3>Boshlang'ich balans:</h3>
              <p>{initialBalance.sum.toLocaleString()} so'm / {initialBalance.dollar.toLocaleString()} $</p>
            </div>
            <div className="statistic2">
              <h3>Jami xarajatlar:</h3>
              <p>{expenses.length}</p>
            </div>
            <div className="statistic3">
              <h3>Eng katta xarajat:</h3>
              <p>
                {(() => {
                  const sumHigh = expenses.filter(e => e.currencyToPay === "sum").sort((a, b) => (parseFloat(b.amountToPay) || 0) - (parseFloat(a.amountToPay) || 0))[0];
                  const dolHigh = expenses.filter(e => e.currencyToPay === "dollar").sort((a, b) => (parseFloat(b.amountToPay) || 0) - (parseFloat(a.amountToPay) || 0))[0];
                  return `${sumHigh ? sumHigh.expenseName + ': ' + parseFloat(sumHigh.amountToPay).toLocaleString() + ' so\'m' : 'yo\'q'} / ${dolHigh ? dolHigh.expenseName + ': ' + parseFloat(dolHigh.amountToPay).toLocaleString() + ' $' : 'yo\'q'}`;
                })()}
              </p>
            </div>
            <div className="statistic4">
              <h3>Qolgan balans:</h3>
              <p className={totalBalance.sum < 0 || totalBalance.dollar < 0 ? "negative-balance" : ""}>
                {totalBalance.sum.toLocaleString()} so'm / {totalBalance.dollar.toLocaleString()} $
              </p>
            </div>
            
            <div className="linear-stats">
              <h2>Xarajatlar o'zgarishi</h2>
              <div className="chart-controls">
                {['day', 'week', 'month', 'year'].map(p => (
                  <button key={p} className={chartPeriod === p ? 'active' : ''} onClick={() => setChartPeriod(p)}>
                    {p === 'day' ? 'Kun' : p === 'week' ? 'Hafta' : p === 'month' ? 'Oy' : 'Yil'}
                  </button>
                ))}
              </div>
              <div className="chart-container">
                <svg className="chart-svg" viewBox="0 0 300 150">
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#5656ff" />
                      <stop offset="100%" stopColor="#28ec70" />
                    </linearGradient>
                  </defs>
                  <path className="chart-path" d={getChartData()} />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {logoutDialog && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <p className="confirm-message">Haqiqatan ham chiqishni xohlaysizmi?</p>
            <div className="confirm-buttons">
              <button className="confirm-btn confirm-cancel" onClick={handleLogoutCancel}>Bekor qilish</button>
              <button className="confirm-btn confirm-logout" onClick={confirmLogout}>Chiqish</button>
            </div>
          </div>
        </div>
      )}

      {addExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>{editMode ? "Xarajatni tahrirlash" : "Yangi xarajat qo'shish"}</h2>
              <button className="close-btn" onClick={handleAddExpenseModalClose}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-section">
                <div className="input-group">
                  <label>Xarajat nomi / turi</label>
                  <div className="input-wrapper">
                    <input type="text" placeholder="Masalan: Ijara, Elektr..." value={expenseName} onChange={handleExpenseNameChange} />
                  </div>
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>To'lanishi kerak</label>
                    <div className="input-wrapper">
                      <input type="number" value={amountToPay} onChange={(e) => setAmountToPay(e.target.value)} />
                      <button className="calc-btn-trigger" onClick={() => setMiniCalcOpen(!miniCalcOpen)}>🧮</button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Valyuta</label>
                    <select value={currencyToPay} onChange={(e) => setCurrencyToPay(e.target.value)} className="modal-select">
                      <option value="sum">So'm</option>
                      <option value="dollar">Dollar ($)</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>To'lov muddati (sana)</label>
                  <div className="input-wrapper">
                    <input type="date" value={dateToPay} onChange={(e) => setDateToPay(e.target.value)} />
                  </div>
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>To'langan summa</label>
                    <div className="input-wrapper">
                      <input type="number" value={amountAlreadyPaid} onChange={(e) => setAmountAlreadyPaid(e.target.value)} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Valyuta</label>
                    <select value={currencyAlreadyPaid} onChange={(e) => setCurrencyAlreadyPaid(e.target.value)} className="modal-select">
                      <option value="sum">So'm</option>
                      <option value="dollar">Dollar ($)</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>To'langan sana</label>
                  <div className="input-wrapper">
                    <input type="date" value={dateAlreadyPaid} onChange={(e) => setDateAlreadyPaid(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleAddExpenseModalClose}>Bekor qilish</button>
              <button className="btn-submit" disabled={!isFormValid} onClick={handleAddExpense}>
                {editMode ? "Saqlash" : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {balansQoshish && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Balansni yangilash</h2>
              <button className="close-btn" onClick={handleBalansModalClose}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-section">
                <div className="input-group">
                  <label>Yangi balans miqdori</label>
                  <div className="input-wrapper">
                    <input type="number" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} />
                    <button className="calc-btn-trigger" onClick={() => setMiniCalcOpen(!miniCalcOpen)}>🧮</button>
                  </div>
                </div>
                <div className="input-group">
                  <label>Valyuta</label>
                  <select value={balanceCurrency} onChange={(e) => setBalanceCurrency(e.target.value)} className="modal-select">
                    <option value="sum">So'm</option>
                    <option value="dollar">Dollar ($)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleBalansModalClose}>Bekor qilish</button>
              <button className="btn-submit" onClick={handleUpdateBalans}>Yangilash</button>
            </div>
          </div>
        </div>
      )}

      {miniCalcOpen && (
        <div className="mini-calc" style={{ left: calcPosition.x, top: calcPosition.y }}>
          <div className="calc-header" onMouseDown={handleMouseDown}>
            <span>Kalkulator</span>
            <button className="close-btn" onClick={() => setMiniCalcOpen(false)}>✕</button>
          </div>
          <div className="calc-screen">{calcDisplay}</div>
          <div className="calc-grid">
            <button onClick={handleCalcClear}>C</button>
            <button className="op-btn" onClick={() => handleCalcOperation("/")}>÷</button>
            <button className="op-btn" onClick={() => handleCalcOperation("*")}>×</button>
            <button onClick={() => setCalcDisplay(calcDisplay.slice(0,-1) || "0")}>⌫</button>
            {[7,8,9].map(n => <button key={n} onClick={() => handleCalcNumber(n)}>{n}</button>)}
            <button className="op-btn" onClick={() => handleCalcOperation("-")}>-</button>
            {[4,5,6].map(n => <button key={n} onClick={() => handleCalcNumber(n)}>{n}</button>)}
            <button className="op-btn" onClick={() => handleCalcOperation("+")}>+</button>
            {[1,2,3].map(n => <button key={n} onClick={() => handleCalcNumber(n)}>{n}</button>)}
            <button className="eq-btn" style={{ gridRow: 'span 2' }} onClick={handleCalcEquals}>=</button>
            <button style={{ gridColumn: 'span 2' }} onClick={() => handleCalcNumber(0)}>0</button>
            <button onClick={() => !calcDisplay.includes(".") && setCalcDisplay(calcDisplay + ".")}>.</button>
          </div>
          <div className="calc-footer">
            <button onClick={() => handleUseCalcValue("toPay")}>To'lovga</button>
            <button onClick={() => handleUseCalcValue("alreadyPaid")}>Olgan sum-ga</button>
          </div>
        </div>
      )}

      {deleteExpenseId && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <p className="confirm-message">Ushbu xarajatni o'chirib tashlamoqchimisiz?</p>
            <div className="confirm-buttons">
              <button className="confirm-btn confirm-cancel" onClick={() => setDeleteExpenseId(null)}>Bekor qilish</button>
              <button className="confirm-btn confirm-logout" onClick={confirmDeleteExpense}>O'chirish</button>
            </div>
          </div>
        </div>
      )}

      {showUndoConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <p className="confirm-message">Bekor qilish imkoniyatini o'chirasizmi? (Amalni ortga qaytarib bo'lmaydi)</p>
            <div className="confirm-buttons">
              <button className="confirm-btn confirm-cancel" onClick={() => setShowUndoConfirm(false)}>Yo'q</button>
              <button className="confirm-btn confirm-logout" onClick={confirmDismissUndo}>Ha, o'chirilsin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfficeXarajat;