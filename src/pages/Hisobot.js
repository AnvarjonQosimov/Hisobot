import React, { useState, useEffect } from 'react'
import "../styles/Hisobot.css"
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

function Hisobot() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // State Definitions
  const [username, setUsername] = useState('');
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [addWorkerModal, setAddWorkerModal] = useState(false);
  const [balansQoshish, setBalansQoshish] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [amountToReceive, setAmountToReceive] = useState('');
  const [dateToGive, setDateToGive] = useState('');
  const [amountAlreadyReceived, setAmountAlreadyReceived] = useState('');
  const [dateAlreadyReceived, setDateAlreadyReceived] = useState('');
  const [currencyToReceive, setCurrencyToReceive] = useState('sum');
  const [currencyAlreadyReceived, setCurrencyAlreadyReceived] = useState('sum');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceCurrency, setBalanceCurrency] = useState('sum');
  const [age, setAge] = useState("uz");

  // Persistence States
  const [workers, setWorkers] = useState([]);
  const [totalBalance, setTotalBalance] = useState({ sum: 0, dollar: 0 });
  const [initialBalance, setInitialBalance] = useState({ sum: 0, dollar: 0 });

  // UI/Edit Mode States
  const [editMode, setEditMode] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState(null);

  // Mini Calculator State
  const [miniCalcOpen, setMiniCalcOpen] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcPrevious, setCalcPrevious] = useState(null);
  const [calcOperation, setCalcOperation] = useState(null);
  const [calcWaiting, setCalcWaiting] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState([]); // Track which worker's history is shown
  const [undoState, setUndoState] = useState(null); // System state for one-step Undo
  const [showUndoConfirm, setShowUndoConfirm] = useState(false); // For dismissing Undo option

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, recent, high

  // Custom Delete Modal State
  const [deleteWorkerId, setDeleteWorkerId] = useState(null);

  // Linear Stats State
  const [chartPeriod, setChartPeriod] = useState('week'); // day, week, month, year

  // Draggable State
  const [isDragging, setIsDragging] = useState(false);
  const [calcPosition, setCalcPosition] = useState({ x: 100, y: 100 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load from localStorage (Account Scoped)
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
        navigate('/login');
        return;
    }
    setUsername(storedUsername);

    const storedWorkers = localStorage.getItem(`workers_${storedUsername}`);
    if (storedWorkers) setWorkers(JSON.parse(storedWorkers));

    const storedBalance = localStorage.getItem(`totalBalance_${storedUsername}`);
    if (storedBalance) setTotalBalance(JSON.parse(storedBalance));

    const storedInitialBalance = localStorage.getItem(`initialBalance_${storedUsername}`);
    if (storedInitialBalance) setInitialBalance(JSON.parse(storedInitialBalance));
  }, [navigate]);

  // Save to localStorage (Account Scoped)
  useEffect(() => {
    if (!username) return;
    localStorage.setItem(`workers_${username}`, JSON.stringify(workers));
  }, [workers, username]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(`totalBalance_${username}`, JSON.stringify(totalBalance));
  }, [totalBalance, username]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(`initialBalance_${username}`, JSON.stringify(initialBalance));
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

  const handleAddWorkerClick = () => {
    setAddWorkerModal(true);
  };

  const handleAddWorkerModalClose = () => {
    setAddWorkerModal(false);
    setEditMode(false);
    setEditingWorkerId(null);
    setWorkerName('');
    setAmountToReceive('');
    setDateToGive('');
    setAmountAlreadyReceived('');
    setDateAlreadyReceived('');
    setCurrencyToReceive('sum');
    setCurrencyAlreadyReceived('sum');
    setMiniCalcOpen(false);
    setCalcDisplay('0');
    setCalcPrevious(null);
    setCalcOperation(null);
    setCalcPosition({ x: 100, y: 100 });
  };

  const handleBalansModalClose = () => {
    setBalansQoshish(false);
    setBalanceAmount('');
    setBalanceCurrency('sum');
    setMiniCalcOpen(false);
    setCalcDisplay('0');
    setCalcPrevious(null);
    setCalcOperation(null);
    setCalcPosition({ x: 100, y: 100 });
  }

  // Dragging logic
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - calcPosition.x,
      y: e.clientY - calcPosition.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setCalcPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const saveForUndo = () => {
    setUndoState({
      workers: JSON.parse(JSON.stringify(workers)),
      totalBalance: { ...totalBalance },
      initialBalance: { ...initialBalance }
    });
  };

  const handleUndo = () => {
    if (!undoState) return;
    setWorkers(undoState.workers);
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

  const handleWorkerNameChange = (e) => {
    const value = e.target.value;
    // Capitalize first letter
    const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    setWorkerName(capitalizedValue);
  };

  const handleAddWorker = () => {
    if (editMode) {
      saveForUndo(); // Save state before edit
      setWorkers(workers.map(w => w.id === editingWorkerId ? {
        ...w,
        workerName,
        amountToReceive,
        currencyToReceive,
        dateToGive,
        amountAlreadyReceived,
        currencyAlreadyReceived,
        dateAlreadyReceived
      } : w));
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
        history: [] // Added history array
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
      setWorkers(workers.filter(w => w.id !== deleteWorkerId));
      setDeleteWorkerId(null);
    }
  };

  const handleTogglePaid = (id) => {
    const worker = workers.find(w => w.id === id);
    if (!worker) return;

    const newIsPaid = !worker.isPaid;
    
    // Update balance: if marking paid, subtract. If unmarking, add back.
    const amount = parseFloat(worker.amountToReceive || 0);
    const currency = worker.currencyToReceive;

    setTotalBalance(prev => ({
      ...prev,
      [currency]: newIsPaid ? prev[currency] - amount : prev[currency] + amount
    }));

    setWorkers(workers.map(w => w.id === id ? { ...w, isPaid: newIsPaid } : w));
  };

  const handleNextMonth = (id) => {
    saveForUndo(); // Save state before archiving
    setWorkers(workers.map(w => {
      if (w.id !== id) return w;

      // Rotate: old alreadyReceived goes to history, current amountToReceive becomes alreadyReceived
      const newHistoryItem = {
        amount: w.amountAlreadyReceived,
        currency: w.currencyAlreadyReceived,
        date: w.dateAlreadyReceived,
        type: 'archived'
      };

      return {
        ...w,
        history: [...(w.history || []), newHistoryItem],
        amountAlreadyReceived: w.amountToReceive,
        currencyAlreadyReceived: w.currencyToReceive,
        dateAlreadyReceived: new Date().toISOString().split('T')[0], // Today's date for the transition
        amountToReceive: '', // Reset for new month
        isPaid: false // Reset payment status for new month
      };
    }));
  };

  const toggleHistory = (id) => {
    setExpandedHistory(prev => 
      prev.includes(id) ? prev.filter(hid => hid !== id) : [...prev, id]
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
      const currentCost = (parseFloat(curr.amountToReceive) || 0);
      const historyCost = (curr.history || []).reduce((hAcc, hCurr) => hCurr.currency === balanceCurrency ? hAcc + (parseFloat(hCurr.amount) || 0) : hAcc, 0);
      const lastMonthPaid = curr.currencyAlreadyReceived === balanceCurrency ? (parseFloat(curr.amountAlreadyReceived) || 0) : 0;
      return acc + currentCost + historyCost + lastMonthPaid;
    }, 0);

    // Reset initial balance: set the new one and CLEAR the other one
    setInitialBalance({
      sum: balanceCurrency === 'sum' ? newAmount : 0,
      dollar: balanceCurrency === 'dollar' ? newAmount : 0
    });

    // Reset total balance: set the new one (minus expenses) and CLEAR the other one
    setTotalBalance({
      sum: balanceCurrency === 'sum' ? newAmount - totalExpenses : 0,
      dollar: balanceCurrency === 'dollar' ? newAmount - totalExpenses : 0
    });

    handleBalansModalClose();
  }

  const getChartData = () => {
    const now = new Date();
    let data = [];
    
    // Aggregating historical and current payments
    let allPayments = [];
    workers.forEach(w => {
      // Add current month's payment if it exists
      if (parseFloat(w.amountAlreadyReceived) > 0) {
        allPayments.push({
          date: new Date(w.createdAt),
          amount: parseFloat(w.amountAlreadyReceived),
          currency: w.currencyAlreadyReceived
        });
      }
      // Add archived payments
      (w.history || []).forEach(h => {
        allPayments.push({
          date: new Date(h.date),
          amount: parseFloat(h.amount),
          currency: h.currency
        });
      });
    });

    if (chartPeriod === 'day') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 2 * 60 * 60 * 1000);
        const sum = allPayments.filter(p => p.date.getHours() === d.getHours() && p.date.getDate() === d.getDate()).reduce((acc, curr) => acc + curr.amount, 0);
        data.push(sum);
      }
    } else if (chartPeriod === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const sum = allPayments.filter(p => p.date.toLocaleDateString() === d.toLocaleDateString()).reduce((acc, curr) => acc + curr.amount, 0);
        data.push(sum);
      }
    } else if (chartPeriod === 'month') {
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const sum = allPayments.filter(p => p.date.toLocaleDateString() === d.toLocaleDateString()).reduce((acc, curr) => acc + curr.amount, 0);
            data.push(sum);
        }
    } else {
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const sum = allPayments.filter(p => p.date.getMonth() === d.getMonth() && p.date.getFullYear() === d.getFullYear()).reduce((acc, curr) => acc + curr.amount, 0);
            data.push(sum);
        }
    }

    const max = Math.max(...data, 1);
    const height = 150;
    const width = 300;
    
    let path = data.map((val, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - (val / max) * height;
        return (i === 0 ? 'M ' : 'L ') + `${x},${y}`;
    }).join(' ');

    return path;
  };

  // Mini Calculator Logic
  const handleCalcNumber = (num) => {
    if (calcWaiting) {
      setCalcDisplay(String(num));
      setCalcWaiting(false);
    } else {
      setCalcDisplay(calcDisplay === '0' ? String(num) : calcDisplay + num);
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
      case '+': return prev + curr;
      case '-': return prev - curr;
      case '*': return prev * curr;
      case '/': return prev / curr;
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
    setCalcDisplay('0');
    setCalcPrevious(null);
    setCalcOperation(null);
    setCalcWaiting(false);
  };

  const handleUseCalcValue = (field) => {
    if (field === 'toReceive') setAmountToReceive(calcDisplay);
    if (field === 'alreadyReceived') setAmountAlreadyReceived(calcDisplay);
    // setMiniCalcOpen(false);
  };

  const isFormValid = workerName && amountToReceive && dateToGive && amountAlreadyReceived && dateAlreadyReceived;

    const handleChange = (event) => {
    const lang = String(event.target.value);
    setAge(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className='Hisobot'>
        <div className="HisobotLeft">
            <div className="hisobotLeftText">
                <div className="leftTop">
                    <h1>HisobotUz</h1>
                <p>{username}</p>
                    <Link to="/profil"><h3>Profil</h3></Link>
                    <Link to="/calculator2"><h3>{t("Kalkulator")}</h3></Link>
                </div>
                <div className="leftBottom">
                    <button className="logout-btn" onClick={handleLogout}>
                        <h3>Chiqish</h3>
                    </button>
                </div>
            </div>
            <div className="leftLine"></div>
        </div>

        <div className="HisobotRight">
            <div className="rightTop">
                <h3 className='addH3' onClick={handleAddWorkerClick}>+ Qo'shish</h3>
                <h3 className='addH3' onClick={handleBalansClick}>+ Balans</h3>
            <div className="ql">
                <div className="qoshishLine"></div>
            </div>
            <input 
                className='searchWorker' 
                type="search" 
                placeholder="Ishchini izlash" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="filterIshchilar">
                <h3 
                    className={activeFilter === 'recent' ? 'active-filter' : ''} 
                    onClick={() => setActiveFilter(activeFilter === 'recent' ? 'all' : 'recent')}
                >Yangilar</h3>
                <h3 
                    className={activeFilter === 'high' ? 'active-filter' : ''} 
                    onClick={() => setActiveFilter(activeFilter === 'high' ? 'all' : 'high')}
                >Yuqori maosh</h3>
                {undoState && (
                    <div className="undo-group">
                        <button className="undo-btn icon-only" onClick={handleUndo} title="Eng so'nggi amalni bekor qilish">
                            ↩️
                        </button>
                        <button className="undo-close-btn" onClick={handleDismissUndoClick} title="O'chirish">✕</button>
                    </div>
                )}
            </div>
            </div>

            <div className="rightBottom">
                {(() => {
                    let filtered = workers.filter(w => 
                        w.workerName.toLowerCase().includes(searchTerm.toLowerCase())
                    );

                    if (activeFilter === 'recent') {
                        filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
                    } else if (activeFilter === 'high') {
                        filtered = filtered.filter(w => {
                            const val = parseFloat(w.amountToReceive) || 0;
                            return w.currencyToReceive === 'sum' ? val > 5000000 : val > 500;
                        });
                    }

                    if (filtered.length === 0) {
                        return (
                            <div className="no-workers">
                                <p>{searchTerm ? "Qidiruv bo'yicha hech narsa topilmadi." : "Hozircha ishchilar yo'q. \"+ Qo'shish\" tugmasini bosing."}</p>
                            </div>
                        );
                    }

                    return (
                        <div className="worker-list">
                            {filtered.map(worker => (
                                <div key={worker.id} className={`worker-item ${worker.isPaid ? 'paid-row' : ''}`}>
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
                                                <span>{new Date(worker.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="worker-values">
                                            <div className="val-group">
                                                <p>Olishi kerak:</p>
                                                <strong className="to-receive">{worker.amountToReceive} {worker.currencyToReceive === 'sum' ? "so'm" : "$"}</strong>
                                                <span className="small-date">Sana: {worker.dateToGive}</span>
                                            </div>
                                            <div className="val-group">
                                                <p>Olgan summa:</p>
                                                <strong className="received">{worker.amountAlreadyReceived} {worker.currencyAlreadyReceived === 'sum' ? "so'm" : "$"}</strong>
                                                <span className="small-date">Olgan: {worker.dateAlreadyReceived}</span>
                                            </div>
                                        </div>

                                        <div className="worker-actions">
                                            <button className="month-btn" onClick={() => handleNextMonth(worker.id)} title="Yangi oy/Sikl">🔄</button>
                                            <button className="history-toggle-btn" onClick={() => toggleHistory(worker.id)} title="Tarixni ko'rish">📜</button>
                                            <button className="edit-btn" onClick={() => handleEditWorkerClick(worker)} title="Tahrirlash">✏️</button>
                                            <button className="delete-btn" onClick={() => handleDeleteWorkerClick(worker.id)} title="O'chirish">🗑️</button>
                                        </div>
                                    </div>

                                    {/* History Section */}
                                    {expandedHistory.includes(worker.id) && (
                                        <div className="history-section">
                                            <h4>To'lovlar tarixi:</h4>
                                            {(worker.history || []).length === 0 ? (
                                                <p className="no-history">Tarix mavjud emas</p>
                                            ) : (
                                                worker.history.map((h, idx) => (
                                                    <div key={idx} className="history-item">
                                                        <span>{h.date}</span>
                                                        <span>{h.amount} {h.currency === 'sum' ? "so'm" : "$"}</span>
                                                        <span className="h-type">{h.type === 'archived' ? 'Arxivlandi' : 'To\'landi'}</span>
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

            <div className="rightRight">
            <div className="lrLine"></div>
                <div className="statistic">
                    <h2>Statistika</h2>
                <div className="statistic1">
                    <h3>Jami ishchilar:</h3>
                    <p>{workers.length}</p>
                </div>
                <div className="statistic2">
                    <h3>Eng baland maosh:</h3>
                    <p>
                        {(() => {
                            const sumHigh = workers.filter(w => w.currencyToReceive === 'sum').sort((a, b) => (parseFloat(b.amountToReceive) || 0) - (parseFloat(a.amountToReceive) || 0))[0];
                            const dolHigh = workers.filter(w => w.currencyToReceive === 'dollar').sort((a, b) => (parseFloat(b.amountToReceive) || 0) - (parseFloat(a.amountToReceive) || 0))[0];
                            
                            const sumText = sumHigh ? `${sumHigh.workerName}: ${parseFloat(sumHigh.amountToReceive).toLocaleString()} so'm` : "yo'q";
                            const dolText = dolHigh ? `${dolHigh.workerName}: ${parseFloat(dolHigh.amountToReceive).toLocaleString()} $` : "yo'q";
                            
                            return `${sumText} / ${dolText}`;
                        })()}
                    </p>
               </div>
                <div className="statistic3">
                <h3>Jami maoshlar uchun xarajat:</h3>
                <p>
                    {workers.reduce((acc, curr) => {
                        const currentCost = curr.currencyToReceive === 'sum' ? (parseFloat(curr.amountToReceive) || 0) : 0;
                        const historyCost = (curr.history || []).reduce((hAcc, hCurr) => hCurr.currency === 'sum' ? hAcc + (parseFloat(hCurr.amount) || 0) : hAcc, 0);
                        const lastMonthPaid = curr.currencyAlreadyReceived === 'sum' ? (parseFloat(curr.amountAlreadyReceived) || 0) : 0;
                        return acc + currentCost + historyCost + lastMonthPaid;
                    }, 0).toLocaleString()} so'm / 
                    {workers.reduce((acc, curr) => {
                        const currentCost = curr.currencyToReceive === 'dollar' ? (parseFloat(curr.amountToReceive) || 0) : 0;
                        const historyCost = (curr.history || []).reduce((hAcc, hCurr) => hCurr.currency === 'dollar' ? hAcc + (parseFloat(hCurr.amount) || 0) : hAcc, 0);
                        const lastMonthPaid = curr.currencyAlreadyReceived === 'dollar' ? (parseFloat(curr.amountAlreadyReceived) || 0) : 0;
                        return acc + currentCost + historyCost + lastMonthPaid;
                    }, 0).toLocaleString()} $
                </p>
               </div>
               <div className="statistic5">
                <h3>To'lanishi kerak bo'lgan qoldiq:</h3>
                <p>
                    {workers.filter(w => !w.isPaid).reduce((acc, curr) => 
                        curr.currencyToReceive === 'sum' ? acc + (parseFloat(curr.amountToReceive) || 0) : acc, 0).toLocaleString()} so'm / 
                    {workers.filter(w => !w.isPaid).reduce((acc, curr) => 
                        curr.currencyToReceive === 'dollar' ? acc + (parseFloat(curr.amountToReceive) || 0) : acc, 0).toLocaleString()} $
                </p>
               </div>
               <div className="statistic1">
                    <h3>Boshlang'ich balans:</h3>
                    <p>
                        {initialBalance.sum.toLocaleString()} so'm / {initialBalance.dollar.toLocaleString()} $
                    </p>
                </div>
                <div className="statistic1">
                    <h3>Qolgan balans:</h3>
                    <p>
                        {totalBalance.sum.toLocaleString()} so'm / {totalBalance.dollar.toLocaleString()} $
                    </p>
                </div>

                <div className="linear-stats">
                    <h2>Chiziqli Statistika</h2>
                    <div className="chart-controls">
                        <button className={chartPeriod === 'day' ? 'active' : ''} onClick={() => setChartPeriod('day')}>Kun</button>
                        <button className={chartPeriod === 'week' ? 'active' : ''} onClick={() => setChartPeriod('week')}>Hafta</button>
                        <button className={chartPeriod === 'month' ? 'active' : ''} onClick={() => setChartPeriod('month')}>Oy</button>
                        <button className={chartPeriod === 'year' ? 'active' : ''} onClick={() => setChartPeriod('year')}>Yil</button>
                    </div>
                    <div className="chart-container">
                        <svg className="chart-svg" viewBox="0 0 300 150">
                            <defs>
                                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="rgb(86, 86, 255)" stopOpacity="1" />
                                    <stop offset="100%" stopColor="rgb(204, 194, 255)" stopOpacity="0.2" />
                                </linearGradient>
                            </defs>
                            <path 
                                className="chart-path" 
                                d={getChartData()}
                            />
                        </svg>
                    </div>
                </div>
            </div>
            </div>
        </div>

        {/* Logout Dialog */}
        {logoutDialog && (
            <div className="confirm-overlay" onClick={handleLogoutCancel}>
                <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="confirm-message">{t("Are you sure you want to logout?")}</div>
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
          <p>{editMode ? "Ma'lumotlarni o'zgartiring" : "Barcha ma'lumotlarni kiriting"}</p>
        </div>
        <button className="close-btn" onClick={handleAddWorkerModalClose}>✕</button>
      </div>

      {/* BODY */}
      <div className="modal-body">

        {/* LEFT */}
        <div className="form-section">

          <div className="input-group">
            <label>Ishchining ismi</label>
            <input
              type="text"
              value={workerName}
              onChange={handleWorkerNameChange}
              placeholder="Ism kiriting"
            />
          </div>

          <div className="row">
            <div className="input-group">
              <label>Olishi kerak</label>
              <input
                type="number"
                value={amountToReceive}
                onChange={(e) => setAmountToReceive(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="input-group small">
              <label>Valyuta</label>
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
            <label>Berish sanasi</label>
            <input
              type="date"
              value={dateToGive}
              onChange={(e) => setDateToGive(e.target.value)}
            />
          </div>

          <div className="row">
            <div className="input-group">
              <label>Olgan summa</label>
              <input
                type="number"
                value={amountAlreadyReceived}
                onChange={(e) => setAmountAlreadyReceived(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="input-group small">
              <label>Valyuta</label>
              <select
                value={currencyAlreadyReceived}
                onChange={(e) => setCurrencyAlreadyReceived(e.target.value)}
              >
                <option value="sum">So'm</option>
                <option value="dollar">$</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Olgan sana</label>
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
        <button className="btn cancel" onClick={handleAddWorkerModalClose}>
          Bekor qilish
        </button>

        <button
          className={`btn add ${!isFormValid ? 'disabled' : ''}`}
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
          <h2>Balans Yangilash</h2>
          <p>Yangi balans miqdorini kiriting</p>
        </div>
        <button className="close-btn" onClick={handleBalansModalClose}>✕</button>
      </div>

      {/* BODY */}
      <div className="modal-body">
        <div className="form-section">
          <div className="row">
            <div className="input-group">
              <label>Balans miqdori</label>
              <input
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="input-group small">
              <label>Valyuta</label>
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
          Bekor qilish
        </button>
        <button
          className={`btn add ${!balanceAmount ? 'disabled' : ''}`}
          onClick={balanceAmount ? handleUpdateBalans : null}
          disabled={!balanceAmount}
        >
          Yangilash
        </button>
      </div>

    </div>
  </div>
)}
        {deleteWorkerId && (
            <div className="confirm-overlay" onClick={() => setDeleteWorkerId(null)}>
                <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="confirm-message">
                        Haqiqatan ham ushbu ishchini o'chirmoqchimisiz?
                        <br />
                        <small style={{color: 'rgba(204,194,255,0.6)'}}>Ushbu amalni bekor qilish imkoniyati bo'ladi.</small>
                    </div>
                    <div className="confirm-buttons">
                        <button
                            className="confirm-btn confirm-cancel"
                            onClick={() => setDeleteWorkerId(null)}
                        >
                            Bekor qilish
                        </button>
                        <button
                            className="confirm-btn confirm-logout"
                            onClick={confirmDeleteWorker}
                        >
                            O'chirish
                        </button>
                    </div>
                </div>
            </div>
        )}

        {showUndoConfirm && (
            <div className="confirm-overlay" onClick={() => setShowUndoConfirm(false)}>
                <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="confirm-message">Ushbu amalni qaytarish imkoniyatini o'chirib tashlamoqchimisiz?</div>
                    <div className="confirm-buttons">
                        <button
                            className="confirm-btn confirm-cancel"
                            onClick={() => setShowUndoConfirm(false)}
                        >
                            Bekor qilish
                        </button>
                        <button
                            className="confirm-btn confirm-logout"
                            onClick={confirmDismissUndo}
                        >
                            O'chirish
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  )
}

export default Hisobot