import React, { useState, useEffect } from "react";
import "../styles/Hisobot.css";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { HiMenu, HiX } from "react-icons/hi";
import ProjectReport from "./ProjectReport";
import BranchReport from "../components/BranchReport";
import NewProject from "../images/new-project.png";
import { db, auth } from "../Firebase/Firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import FloatingCalculator from "../components/FloatingCalculator";
import { AnimatePresence } from "framer-motion";

function Hisobot() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // State Definitions
  const [username, setUsername] = useState(localStorage.getItem("username")?.toLowerCase() || "");
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [addWorkerModal, setAddWorkerModal] = useState(false);
  const [balansQoshish, setBalansQoshish] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [workerCode, setWorkerCode] = useState("");
  const [amountToReceive, setAmountToReceive] = useState("");
  const [dateToGive, setDateToGive] = useState("");
  const [amountAlreadyReceived, setAmountAlreadyReceived] = useState("");
  const [dateAlreadyReceived, setDateAlreadyReceived] = useState("");
  const [currencyToReceive, setCurrencyToReceive] = useState("sum");
  const [currencyAlreadyReceived, setCurrencyAlreadyReceived] = useState("sum");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceCurrency, setBalanceCurrency] = useState("sum");

  // New Work Fields States
  const [currentWork, setCurrentWork] = useState("");
  const [workPercent, setWorkPercent] = useState("");
  const [isOtherWork, setIsOtherWork] = useState(false);
  const [isOtherWorkPercent, setIsOtherWorkPercent] = useState(false);
  const [customWork, setCustomWork] = useState("");
  const [customWorkPercent, setCustomWorkPercent] = useState("");
  const [prevWork, setPrevWork] = useState("");
  const [prevWorkPercent, setPrevWorkPercent] = useState("");
  const [isOtherPrevWork, setIsOtherPrevWork] = useState(false);
  const [isOtherPrevWorkPercent, setIsOtherPrevWorkPercent] = useState(false);
  const [customPrevWork, setCustomPrevWork] = useState("");
  const [customPrevWorkPercent, setCustomPrevWorkPercent] = useState("");

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

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [newProjectConfirmId, setNewProjectConfirmId] = useState(null);

  // Responsive State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isConstructionExpanded, setIsConstructionExpanded] = useState(false);

  // Dynamic Project Files State
  const [projectFiles, setProjectFiles] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null); // null = workers view
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [deleteProjectId, setDeleteProjectId] = useState(null);

  // New Categories State
  const [showFloatingCalc, setShowFloatingCalc] = useState(false);
  const [isOfficeExpanded, setIsOfficeExpanded] = useState(false);
  const [isWorkersExpanded, setIsWorkersExpanded] = useState(false);
  const [officeBranches, setOfficeBranches] = useState([]);
  const [workerObjects, setWorkerObjects] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [activeWorkerObjectId, setActiveWorkerObjectId] = useState(null);
  const [fileModalType, setFileModalType] = useState("project"); // "project", "branch", "object"
  const [deleteItemId, setDeleteItemId] = useState(null); // reuse for branch/object deletion

  // Global Worker Email State
  const [globalWorkerEmail, setGlobalWorkerEmail] = useState("");
  const [savedGlobalWorkerEmail, setSavedGlobalWorkerEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [syncStatus, setSyncStatus] = useState("synced"); // synced, syncing, offline
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showInitialLoader, setShowInitialLoader] = useState(false);

  // Language State
  const [age, setAge] = useState(i18n.language || "uz");
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

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleSaveGlobalEmail = async () => {
    const val = globalWorkerEmail.trim();
    if (!val) return;

    if (!validateEmail(val)) {
      setEmailError(true);
      return;
    }

    setEmailError(false);
    try {
      // 1. Save to the global lookup collection
      await setDoc(doc(db, "globalWorkerEmails", val.toLowerCase()), { bossEmail: username });

      // 2. Ensure it's in the state and trigger cabinet sync
      setSavedGlobalWorkerEmail(val);
      setGlobalWorkerEmail(val);

      // Force immediate sync to cabinet for this field
      await setDoc(doc(db, "cabinets", username), {
        globalWorkerEmail: val
      }, { merge: true });

    } catch (err) {
      console.error(err);
    }
  };

  // --- RELIABLE SYNC & LOAD LOGIC ---
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) { navigate("/login"); return; }
    setUsername(storedUsername);

    // 1. Initial Load from Local
    const sw = localStorage.getItem(`workers_${storedUsername}`);
    if (sw) setWorkers(JSON.parse(sw));
    const sb = localStorage.getItem(`totalBalance_${storedUsername}`);
    if (sb) setTotalBalance(JSON.parse(sb));
    const sib = localStorage.getItem(`initialBalance_${storedUsername}`);
    if (sib) setInitialBalance(JSON.parse(sib));
    const sp = localStorage.getItem(`projects_${storedUsername}`);
    if (sp) setProjectFiles(JSON.parse(sp));
    const sob = localStorage.getItem(`officeBranches_${storedUsername}`);
    if (sob) setOfficeBranches(JSON.parse(sob));
    const swo = localStorage.getItem(`workerObjects_${storedUsername}`);
    if (swo) setWorkerObjects(JSON.parse(swo));
    const sge = localStorage.getItem(`globalEmail_${storedUsername}`);
    if (sge) { setGlobalWorkerEmail(sge); setSavedGlobalWorkerEmail(sge); }

    // 2. Conditional Loader
    const hasLocal = sw || sb || sib || sp || sge;
    if (!hasLocal) {
      setShowInitialLoader(true);
    }
    setDataLoaded(false);

    // 3. Fetch from Cloud
    const loadCloud = async () => {
      try {
        console.log("Fetching from cloud for:", storedUsername);
        const snap = await getDoc(doc(db, "cabinets", storedUsername));
        if (snap.exists()) {
          const d = snap.data();
          if (d.workers?.length) setWorkers(d.workers);
          if (d.totalBalance) setTotalBalance(d.totalBalance);
          if (d.initialBalance) setInitialBalance(d.initialBalance);
          if (d.projectFiles?.length) setProjectFiles(d.projectFiles);
          if (d.globalWorkerEmail) { 
            setGlobalWorkerEmail(d.globalWorkerEmail); 
            setSavedGlobalWorkerEmail(d.globalWorkerEmail); 
          }
          if (d.officeBranches?.length) setOfficeBranches(d.officeBranches);
          if (d.workerObjects?.length) setWorkerObjects(d.workerObjects);
        }
      } catch (e) { 
        console.error("Cloud load failed/offline:", e); 
      } finally {
        setDataLoaded(true);
        setShowInitialLoader(false);
        console.log("Data load sequence completed.");
      }
    };
    
    loadCloud();
    
    // Safety fallback (removed per user request to not have "special time")
    // But we keep it very long (60s) just as an absolute emergency fallback for browser hangs
    const safetyTimer = setTimeout(() => { 
      setDataLoaded(true); 
      setShowInitialLoader(false); 
    }, 60000);

    return () => clearTimeout(safetyTimer);
  }, [navigate]);

  // 1. Local Save Effect (Immediate)
  useEffect(() => {
    if (!username) return;
    localStorage.setItem(`workers_${username}`, JSON.stringify(workers));
    localStorage.setItem(`totalBalance_${username}`, JSON.stringify(totalBalance));
    localStorage.setItem(`initialBalance_${username}`, JSON.stringify(initialBalance));
    localStorage.setItem(`projects_${username}`, JSON.stringify(projectFiles));
    localStorage.setItem(`officeBranches_${username}`, JSON.stringify(officeBranches));
    localStorage.setItem(`workerObjects_${username}`, JSON.stringify(workerObjects));
    localStorage.setItem(`globalEmail_${username}`, globalWorkerEmail);
  }, [workers, totalBalance, initialBalance, projectFiles, username, globalWorkerEmail]);

  // 2. Cloud Save Effect (Synced)
  useEffect(() => {
    // CRITICAL: Only sync to cloud if data is actually loaded and we are NOT in the middle of initial sync
    if (!username || !dataLoaded) return;
    
    // Safety: Don't save if everything is empty and we just started (prevents overwriting cloud with empty data)
    const isTotallyEmpty = workers.length === 0 && totalBalance.sum === 0 && totalBalance.dollar === 0 && projectFiles.length === 0;
    if (isTotallyEmpty) {
       // Check if we have been loaded for a while (more than 5 seconds) before allowing an empty save
       const loadedTime = window.sessionStorage.getItem('loaded_at') || Date.now();
       if (Date.now() - loadedTime < 5000) {
         console.log("Skipping potentially dangerous empty save...");
         return;
       }
    }

    // Cloud Sync
    const saveCloud = async () => {
      try {
        console.log("Syncing to cloud...");
        await setDoc(doc(db, "cabinets", username), {
          workers, totalBalance, initialBalance, projectFiles, globalWorkerEmail, officeBranches, workerObjects
        }, { merge: true });
      } catch (e) { console.error("Cloud save failed", e); }
    };
    saveCloud();
  }, [workers, totalBalance, initialBalance, projectFiles, username, globalWorkerEmail, dataLoaded]);

  // Track mount time
  useEffect(() => {
    window.sessionStorage.setItem('loaded_at', Date.now().toString());
  }, []);

  // --- END SYNC LOGIC ---


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

  const handleLogoutCancel = () => {
    setLogoutDialog(false);
  };

  const handleAddWorkerClick = () => {
    handleAddWorkerModalClose(); // Reset all states
    setAddWorkerModal(true);
  };

  const handleAddWorkerModalClose = () => {
    setAddWorkerModal(false);
    setEditMode(false);
    setEditingWorkerId(null);
    setWorkerName("");
    setWorkerCode("");
    setAmountToReceive("");
    setDateToGive("");
    setAmountAlreadyReceived("");
    setDateAlreadyReceived("");
    setCurrencyToReceive("sum");
    setCurrencyAlreadyReceived("sum");
    setCurrentWork("");
    setWorkPercent("");
    setIsOtherWork(false);
    setIsOtherWorkPercent(false);
    setCustomWork("");
    setCustomWorkPercent("");
    setPrevWork("");
    setPrevWorkPercent("");
    setIsOtherPrevWork(false);
    setIsOtherPrevWorkPercent(false);
    setCustomPrevWork("");
    setCustomPrevWorkPercent("");
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

  const handleAddWorker = async () => {
    const finalWork = isOtherWork ? customWork : currentWork;
    const finalPercent = isOtherWorkPercent
      ? (customWorkPercent && !customWorkPercent.includes('%') ? `${customWorkPercent}%` : customWorkPercent)
      : workPercent;

    const finalPrevWork = isOtherPrevWork ? customPrevWork : prevWork;
    const finalPrevPercent = isOtherPrevWorkPercent
      ? (customPrevWorkPercent && !customPrevWorkPercent.includes('%') ? `${customPrevWorkPercent}%` : customPrevWorkPercent)
      : prevWorkPercent;

    if (editMode) {
      saveForUndo();
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
              currentWork: finalWork,
              workPercent: finalPercent,
              prevWork: finalPrevWork,
              prevWorkPercent: finalPrevPercent,
              workerCode: workerCode.trim()
            }
            : w,
        ),
      );
      if (workerCode.trim()) {
        // Non-blocking write
        setDoc(doc(db, "inviteCodes", workerCode.trim()), { bossEmail: username, workerId: editingWorkerId })
          .catch(e => console.error("Failed to save invite code:", e));
      }
    } else {
      saveForUndo();
      const newWorkerId = Date.now();
      const newWorker = {
        id: newWorkerId,
        workerName,
        amountToReceive,
        currencyToReceive,
        dateToGive,
        amountAlreadyReceived,
        currencyAlreadyReceived,
        dateAlreadyReceived,
        currentWork: finalWork,
        workPercent: finalPercent,
        prevWork: finalPrevWork,
        prevWorkPercent: finalPrevPercent,
        createdAt: new Date().toISOString(),
        isPaid: false,
        history: [],
        workerCode: workerCode.trim()
      };
      setWorkers([newWorker, ...workers]);
      if (workerCode.trim()) {
        // Non-blocking write
        setDoc(doc(db, "inviteCodes", workerCode.trim()), { bossEmail: username, workerId: newWorkerId })
          .catch(e => console.error("Failed to save invite code:", e));
      }
    }
    handleAddWorkerModalClose();
  };

  const handleOpenDetail = (worker) => {
    setSelectedWorker(worker);
    setIsDetailModalOpen(true);
  };

  const handleNewProject = (e, id) => {
    e.stopPropagation();
    setNewProjectConfirmId(id);
  };

  const confirmNewProject = () => {
    const id = newProjectConfirmId;
    saveForUndo();
    setWorkers(workers.map(w => {
      if (w.id !== id) return w;

      const archiveItem = {
        date: new Date().toISOString().split('T')[0],
        amount: w.amountToReceive,
        currency: w.currencyToReceive,
        received: w.amountAlreadyReceived,
        receivedCurrency: w.currencyAlreadyReceived,
        work: w.currentWork,
        percent: w.workPercent,
        type: "project_completed"
      };

      return {
        ...w,
        history: [...(w.history || []), archiveItem],
        amountToReceive: "0",
        amountAlreadyReceived: "0",
        currentWork: "",
        workPercent: "",
        isPaid: false
      };
    }));
    setNewProjectConfirmId(null);
  };

  const handleDeleteHistoryProject = (workerId, idx) => {
    setDeleteHistoryData({ workerId, index: idx });
  };

  const handleEditWorkerClick = (worker) => {
    setEditMode(true);
    setEditingWorkerId(worker.id);
    setWorkerName(worker.workerName);
    setWorkerCode(worker.workerCode || "");
    setAmountToReceive(worker.amountToReceive);
    setDateToGive(worker.dateToGive);
    setAmountAlreadyReceived(worker.amountAlreadyReceived);
    setDateAlreadyReceived(worker.dateAlreadyReceived);
    setCurrencyToReceive(worker.currencyToReceive);
    setCurrencyAlreadyReceived(worker.currencyAlreadyReceived);

    // Set work fields
    const workOptions = ["Dizayn", "Plan", "Barchasi"];
    if (worker.currentWork) {
      if (workOptions.includes(worker.currentWork)) {
        setCurrentWork(worker.currentWork);
        setIsOtherWork(false);
      } else {
        setCurrentWork("Boshqasi");
        setIsOtherWork(true);
        setCustomWork(worker.currentWork);
      }
    } else {
      setCurrentWork("");
      setIsOtherWork(false);
    }

    const percentOptions = ["5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%", "55%", "60%", "65%", "70%", "75%", "80%", "85%", "90%", "95%", "100%"];
    if (worker.workPercent) {
      if (percentOptions.includes(worker.workPercent)) {
        setWorkPercent(worker.workPercent);
        setIsOtherWorkPercent(false);
      } else {
        setWorkPercent("Boshqasi");
        setIsOtherWorkPercent(true);
        setCustomWorkPercent(worker.workPercent ? worker.workPercent.replace('%', '') : "");
      }
    } else {
      setWorkPercent("");
      setIsOtherWorkPercent(false);
    }

    // Set previous work fields
    if (worker.prevWork) {
      if (workOptions.includes(worker.prevWork)) {
        setPrevWork(worker.prevWork);
        setIsOtherPrevWork(false);
      } else {
        setPrevWork("Boshqasi");
        setIsOtherPrevWork(true);
        setCustomPrevWork(worker.prevWork);
      }
    } else {
      setPrevWork("");
      setIsOtherPrevWork(false);
    }

    if (worker.prevWorkPercent) {
      if (percentOptions.includes(worker.prevWorkPercent)) {
        setPrevWorkPercent(worker.prevWorkPercent);
        setIsOtherPrevWorkPercent(false);
      } else {
        setPrevWorkPercent("Boshqasi");
        setIsOtherPrevWorkPercent(true);
        setCustomPrevWorkPercent(worker.prevWorkPercent.replace('%', ''));
      }
    } else {
      setPrevWorkPercent("");
      setIsOtherPrevWorkPercent(false);
    }

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
      const { workerId, index } = deleteHistoryData;

      setWorkers(
        workers.map((w) => {
          if (w.id === workerId) {
            const newHistory = [...(w.history || [])];
            newHistory.splice(index, 1);
            return { ...w, history: newHistory };
          }
          return w;
        }),
      );

      // Update selectedWorker if it's currently open
      if (selectedWorker && selectedWorker.id === workerId) {
        setSelectedWorker((prev) => {
          const newHistory = [...(prev.history || [])];
          newHistory.splice(index, 1);
          return { ...prev, history: newHistory };
        });
      }

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
          amount: w.amountAlreadyReceived || "0",
          currency: w.currencyAlreadyReceived || "sum",
          date: w.dateAlreadyReceived || new Date().toISOString().split("T")[0],
          type: "project_completed", // Standard type for history list in detail modal
          work: w.currentWork || t("yo'q"),
          percent: w.workPercent || "0%",
          received: w.amountAlreadyReceived || "0",
          receivedCurrency: w.currencyAlreadyReceived || "sum",
        };

        return {
          ...w,
          history: [...(w.history || []), newHistoryItem],
          amountAlreadyReceived: w.amountToReceive,
          currencyAlreadyReceived: w.currencyToReceive,
          dateAlreadyReceived: new Date().toISOString().split("T")[0], // Today's date for the transition
          amountToReceive: "", // Reset for new month
          prevWork: w.currentWork,
          prevWorkPercent: w.workPercent,
          currentWork: "",
          workPercent: "",
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
  const handleAddProject = () => {
    if (!newFileName.trim()) return;
    const newItem = {
      id: Date.now(),
      name: newFileName.trim(),
    };

    if (fileModalType === "project") {
      setProjectFiles([...projectFiles, newItem]);
      setActiveProjectId(newItem.id);
      setActiveBranchId(null);
      setActiveWorkerObjectId(null);
    } else if (fileModalType === "branch") {
      setOfficeBranches([...officeBranches, newItem]);
      setActiveBranchId(newItem.id);
      setActiveProjectId(null);
      setActiveWorkerObjectId(null);
    } else if (fileModalType === "object") {
      setWorkerObjects([...workerObjects, newItem]);
      setActiveWorkerObjectId(newItem.id);
      setActiveProjectId(null);
      setActiveBranchId(null);
    }

    setNewFileName("");
    setIsFileModalOpen(false);
  };

  const confirmDeleteProject = () => {
    if (deleteProjectId) {
      setProjectFiles(projectFiles.filter(p => p.id !== deleteProjectId));
      if (activeProjectId === deleteProjectId) {
        setActiveProjectId(null); // Back to workers if active project is deleted
      }
      setDeleteProjectId(null);
    }
  };

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
            {isOffline && (
              <div style={{ color: '#ffa500', fontSize: '10px', marginTop: '5px' }}>
                ⚠️ {t("Working Offline")}
              </div>
            )}
            {/* <Link to="/profil" onClick={() => setIsSidebarOpen(false)}>
              <h3>{t("profil")}</h3>
            </Link> */}
            <div className="calc-sidebar-btn" onClick={() => { setShowFloatingCalc(!showFloatingCalc); setIsSidebarOpen(false); }}>
              <h3>{t("Kalkulator")}</h3>
            </div>

            <div className={`QurilishXarajatlari ${isWorkersExpanded ? "expanded" : ""}`}>
              <h2 onClick={() => setIsWorkersExpanded(!isWorkersExpanded)}>
                {t("Ishchilar hisoboti") || "Ishchilar hisoboti"} <span>{">"}</span>
              </h2>
              <div className="project-list-container">
                <h4 onClick={() => { setFileModalType("object"); setIsFileModalOpen(true); }}>+ {t("ob'ekt") || "Ob'ekt"}</h4>
                <div className="project-items">
                  <div
                    className={`project-sidebar-item ${activeProjectId === null && activeBranchId === null && activeWorkerObjectId === null ? "active" : ""}`}
                    onClick={() => {
                      setActiveProjectId(null);
                      setActiveBranchId(null);
                      setActiveWorkerObjectId(null);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <span className="project-name">{t("barcha_ishchilar") || "Barcha ishchilar"}</span>
                  </div>
                  {workerObjects.map((obj) => (
                    <div
                      key={obj.id}
                      className={`project-sidebar-item ${activeWorkerObjectId === obj.id ? "active" : ""}`}
                      onClick={() => {
                        setActiveWorkerObjectId(activeWorkerObjectId === obj.id ? null : obj.id);
                        setActiveProjectId(null);
                        setActiveBranchId(null);
                        setIsSidebarOpen(false);
                      }}
                    >
                      <span className="project-name">{obj.name}</span>
                      <button
                        className="delete-project-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteItemId({ type: 'object', id: obj.id });
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`QurilishXarajatlari ${isOfficeExpanded ? "expanded" : ""}`}>
              <h2 onClick={() => setIsOfficeExpanded(!isOfficeExpanded)}>
                {t("o'fisxarajatlari")} <span>{">"}</span>
              </h2>
              <div className="project-list-container">
                <h4 onClick={() => { setFileModalType("branch"); setIsFileModalOpen(true); }}>+ {t("filial") || "Filial"}</h4>
                <div className="project-items">
                  {officeBranches.map((branch) => (
                    <div
                      key={branch.id}
                      className={`project-sidebar-item ${activeBranchId === branch.id ? "active" : ""}`}
                      onClick={() => {
                        setActiveBranchId(activeBranchId === branch.id ? null : branch.id);
                        setActiveProjectId(null);
                        setActiveWorkerObjectId(null);
                        setIsSidebarOpen(false);
                      }}
                    >
                      <span className="project-name">{branch.name}</span>
                      <button
                        className="delete-project-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteItemId({ type: 'branch', id: branch.id });
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="global-email-section" style={{ padding: "10px 0", marginBottom: "10px" }}>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", marginBottom: "8px" }}>{t("global_worker_email") || "Ishchilar uchun umumiy email"}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                <input
                  type="email"
                  placeholder={t("global_worker_email_placeholder") || "example@gmail.com"}
                  value={globalWorkerEmail}
                  onChange={(e) => {
                    setGlobalWorkerEmail(e.target.value);
                    if (emailError) setEmailError(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: emailError ? "1px solid #ff4d4d" : "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.1)",
                    color: globalWorkerEmail ? "rgba(204, 194, 255, 0.5)" : "#fff",
                    outline: "none",
                    boxSizing: "border-box",
                    fontSize: "14px",
                    fontWeight: globalWorkerEmail ? "500" : "400"
                  }}
                />
                {emailError && (
                  <p style={{ color: "#ff4d4d", fontSize: "12px", margin: "4px 0 0 0" }}>
                    {t("email_xato") || "Email noto'g'ri kiritilgan"}
                  </p>
                )}
                <button
                  onClick={handleSaveGlobalEmail}
                  disabled={globalWorkerEmail === savedGlobalWorkerEmail || !globalWorkerEmail.trim()}
                  style={{
                    width: "100%",
                    padding: "10px 15px",
                    borderRadius: "8px",
                    border: "none",
                    background: globalWorkerEmail === savedGlobalWorkerEmail ? "rgba(0, 0, 0, 0.3)" : "rgb(146, 151, 223)",
                    color: globalWorkerEmail === savedGlobalWorkerEmail ? "rgba(255, 255, 255, 0.2)" : "#fff",
                    cursor: globalWorkerEmail === savedGlobalWorkerEmail ? "default" : "pointer",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                    fontSize: "13px",
                    transition: "all 0.3s ease",
                    border: globalWorkerEmail === savedGlobalWorkerEmail ? "1px solid rgba(255, 255, 255, 0.05)" : "none"
                  }}
                  onMouseOver={(e) => {
                    if (globalWorkerEmail !== savedGlobalWorkerEmail && globalWorkerEmail.trim()) {
                      e.target.style.opacity = "0.8";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (globalWorkerEmail !== savedGlobalWorkerEmail && globalWorkerEmail.trim()) {
                      e.target.style.opacity = "1";
                    }
                  }}
                >
                  {t("saqlash") || "Saqlash"}
                </button>
              </div>
            </div>
            <div className={`QurilishXarajatlari ${isConstructionExpanded ? "expanded" : ""}`}>
              <h2 onClick={() => setIsConstructionExpanded(!isConstructionExpanded)}>
                {t("qurilishxarajatlari")} <span>{">"}</span>
              </h2>
              <div className="project-list-container">
                <h4 onClick={() => { setFileModalType("project"); setIsFileModalOpen(true); }}>+ Fayl</h4>
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

      {activeProjectId !== null ? (
        <ProjectReport
          projectId={activeProjectId}
          projectName={projectFiles.find(p => p.id === activeProjectId)?.name}
          onBack={() => setActiveProjectId(null)}
        />
      ) : activeBranchId !== null ? (
        <BranchReport
          branchId={activeBranchId}
          branchName={officeBranches.find(b => b.id === activeBranchId)?.name}
          onBack={() => setActiveBranchId(null)}
        />
      ) : (
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
              placeholder={t("hisobot_qidiruv_placeholder")}
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
                  title={t("undo_title")}
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
                        ? t("hisobot_no_results")
                        : t("hisobot_no_workers")}
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
                      onClick={() => handleOpenDetail(worker)}
                    >
                      <div className="worker-item-main">
                        <div className="worker-info">
                          {!activeWorkerObjectId && (
                            <input
                              type="checkbox"
                              className="paid-checkbox"
                              checked={worker.isPaid}
                              onChange={() => handleTogglePaid(worker.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <div className="name-date">
                            <h3 style={{ display: 'flex', alignItems: 'center' }}>
                              {worker.workerName}
                              {!activeWorkerObjectId && (
                                <span style={{ fontSize: "14px", marginLeft: "10px", lineHeight: 1 }} title={worker.workerCode ? "Has Access Code" : "No Access Code"}>
                                  {worker.workerCode ? "🟢" : "🔴"}
                                </span>
                              )}
                            </h3>
                            <span>
                              {new Date(worker.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {!activeWorkerObjectId ? (
                          <div className="worker-values">
                            <div className="val-group-procent">
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
                        ) : (
                          <div className="worker-values simple-worker-values">
                             {/* Only basic info here if needed */}
                          </div>
                        )}

                        <div className="worker-actions">
                          {!activeWorkerObjectId ? (
                            <>
                              <button
                                className="month-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNextMonth(worker.id);
                                }}
                                title={t("yangi_oy_sikl") || "Yangi oy/Sikl"}
                              >
                                🔄
                              </button>

                              <button
                                className="addnewproject"
                                onClick={(e) => handleNewProject(e, worker.id)}
                                title={t("yangi_loyiha")}
                              >
                                <img src={NewProject} alt="NewProject" />
                              </button>

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
                            </>
                          ) : null}
                          <button
                            className="edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditWorkerClick(worker);
                            }}
                            title={t("tahrirlash") || "Tahrirlash"}
                          >
                            ✏️
                          </button>
                          <button
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkerClick(worker.id);
                            }}
                            title={t("o'chirish") || "O'chirish"}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingHistoryData({
                                        workerId: worker.id,
                                        index: idx,
                                        ...h,
                                      });
                                    }}
                                    style={{
                                      padding: "5px",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: "16px",
                                    }}
                                    title={t("tahrirlash") || "Tahrirlash"}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="delete-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteHistoryData({
                                        workerId: worker.id,
                                        index: idx,
                                      });
                                    }}
                                    style={{
                                      padding: "5px",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: "16px",
                                    }}
                                    title={t("o'chirish") || "O'chirish"}
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
                      ? `${sumHigh.workerName}: ${parseFloat(sumHigh.amountToReceive).toLocaleString()} ${t("som")}`
                      : t("yo'q");
                    const dolText = dolHigh
                      ? `${dolHigh.workerName}: ${parseFloat(dolHigh.amountToReceive).toLocaleString()} $`
                      : t("yo'q");

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
                  {t("som")} /
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
                  {t("som")} /
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
                  {totalBalance.sum.toLocaleString()} {t("som")} /{" "}
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
      )}

      {/* Floating Calculator */}
      <AnimatePresence>
        {showFloatingCalc && (
          <FloatingCalculator 
            isOpen={showFloatingCalc} 
            onClose={() => setShowFloatingCalc(false)} 
          />
        )}
      </AnimatePresence>

      {/* Item Delete Confirmation Modal (Branch/Object) */}
      {deleteItemId && (
        <div className="confirm-overlay" onClick={() => setDeleteItemId(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">
              {t("Haqiqatdan ham o'chirishni xohlaysizmi?")}
            </div>
            <div className="confirm-buttons">
              <button className="confirm-btn confirm-cancel" onClick={() => setDeleteItemId(null)}>
                {t("bekorqilish")}
              </button>
              <button className="confirm-btn confirm-delete" onClick={() => {
                if (deleteItemId.type === 'branch') {
                  setOfficeBranches(officeBranches.filter(b => b.id !== deleteItemId.id));
                  if (activeBranchId === deleteItemId.id) setActiveBranchId(null);
                } else if (deleteItemId.type === 'object') {
                  setWorkerObjects(workerObjects.filter(o => o.id !== deleteItemId.id));
                  if (activeWorkerObjectId === deleteItemId.id) setActiveWorkerObjectId(null);
                }
                setDeleteItemId(null);
              }}>
                {t("o'chirish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Dialog */}
      {logoutDialog && (
        <div className="confirm-overlay" onClick={handleLogoutCancel}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">
              {t("Haqiqatdan ham chiqishni xohlaysizmi?")}
            </div>
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

      {/* Add Worker Modal */}
      {addWorkerModal && (
        <div className="modal-overlay">
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {/* HEADER */}
            <div className="modal-header">
              <div>
                <h2>{editMode ? t("ishchini_tahrirlash") : t("ishchi_qoshish")}</h2>
                <p>
                  {editMode
                    ? t("malumotlarni_ozgartiring")
                    : t("barcha_malumotlarni_kiriting")}
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
                    placeholder={t("ism_kiriting_placeholder")}
                  />
                </div>

                <div className="input-group">
                  <label>Worker Code (Password)</label>
                  <input
                    type="text"
                    value={workerCode}
                    onChange={(e) => setWorkerCode(e.target.value)}
                    placeholder="Enter worker code"
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
                      <option value="sum">{t("som")}</option>
                      <option value="dollar">$</option>
                    </select>
                  </div>
                </div>



                <div className="row">
                  <div className="input-group">
                    <label>{t("qilayotganishi")}</label>
                    <select
                      value={currentWork}
                      onChange={(e) => {
                        setCurrentWork(e.target.value);
                        setIsOtherWork(e.target.value === "Boshqasi");
                      }}
                    >
                      <option value="">{t("tanlang")}</option>
                      <option value="Dizayn">{t("dizayn")}</option>
                      <option value="Plan">{t("plan")}</option>
                      <option value="Barchasi">{t("barchasi")}</option>
                      <option value="Boshqasi">{t("Boshqasi")}</option>
                    </select>
                    {isOtherWork && (
                      <input
                        type="text"
                        className="custom-input"
                        value={customWork}
                        onChange={(e) => setCustomWork(e.target.value)}
                        placeholder={t("ish_nomi_placeholder")}
                        autoFocus
                      />
                    )}
                  </div>

                  <div className="input-group">
                    <label>{t("qilinayotganishfoizi")}</label>
                    <select
                      value={workPercent}
                      onChange={(e) => {
                        setWorkPercent(e.target.value);
                        setIsOtherWorkPercent(e.target.value === "Boshqasi");
                      }}
                    >
                      <option value="">{t("tanlang")}</option>
                      {["5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%", "55%", "60%", "65%", "70%", "75%", "80%", "85%", "90%", "95%", "100%"].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value="Boshqasi">{t("Boshqasi")}</option>
                    </select>
                    {isOtherWorkPercent && (
                      <div className="custom-input-wrapper">
                        <input
                          type="text"
                          className="custom-input percent-input"
                          value={customWorkPercent}
                          onChange={(e) => setCustomWorkPercent(e.target.value)}
                          placeholder="0"
                          autoFocus
                        />
                        <span className="percent-symbol">%</span>
                      </div>
                    )}
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
                      <option value="sum">{t("som")}</option>
                      <option value="dollar">$</option>
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="input-group">
                    <label>{t("oxirgi_qilingan_ish") || "Oldin qilingan ish"}</label>
                    <select
                      value={prevWork}
                      onChange={(e) => {
                        setPrevWork(e.target.value);
                        setIsOtherPrevWork(e.target.value === "Boshqasi");
                      }}
                    >
                      <option value="">{t("tanlang")}</option>
                      <option value="Dizayn">{t("dizayn")}</option>
                      <option value="Plan">{t("plan")}</option>
                      <option value="Barchasi">{t("barchasi")}</option>
                      <option value="Boshqasi">{t("Boshqasi")}</option>
                    </select>
                    {isOtherPrevWork && (
                      <input
                        type="text"
                        className="custom-input"
                        value={customPrevWork}
                        onChange={(e) => setCustomPrevWork(e.target.value)}
                        placeholder={t("ish_nomi_placeholder")}
                        autoFocus
                      />
                    )}
                  </div>

                  <div className="input-group">
                    <label>{t("oxirgi_qilingan_foiz") || "Oldin qilingan foiz"}</label>
                    <select
                      value={prevWorkPercent}
                      onChange={(e) => {
                        setPrevWorkPercent(e.target.value);
                        setIsOtherPrevWorkPercent(e.target.value === "Boshqasi");
                      }}
                    >
                      <option value="">{t("tanlang")}</option>
                      {["5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%", "55%", "60%", "65%", "70%", "75%", "80%", "85%", "90%", "95%", "100%"].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value="Boshqasi">{t("Boshqasi")}</option>
                    </select>
                    {isOtherPrevWorkPercent && (
                      <div className="custom-input-wrapper">
                        <input
                          type="text"
                          className="custom-input percent-input"
                          value={customPrevWorkPercent}
                          onChange={(e) => setCustomPrevWorkPercent(e.target.value)}
                          placeholder="0"
                          autoFocus
                        />
                        <span className="percent-symbol">%</span>
                      </div>
                    )}
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
                {editMode ? t("saqlash_btn") : t("qoshish_btn")}
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
                      <option value="sum">{t("som")}</option>
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
                {t("bekor_qilish_btn")}
              </button>
              <button
                className="confirm-btn confirm-logout"
                onClick={confirmDeleteHistory}
              >
                {t("ochirish_btn")}
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
                {t("bekor_qilish_btn")}
              </button>
              <button className="btn add" onClick={handleEditHistorySave}>
                {t("saqlash_btn")}
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
                  placeholder={t("ishchini_izlash_placeholder")}
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

      {/* Project Creation Modal */}
      {isFileModalOpen && (
        <div className="confirm-overlay" onClick={() => setIsFileModalOpen(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="confirm-message">
              {fileModalType === "project" ? t("Yangi fayl qo'shish") : 
               fileModalType === "branch" ? t("Yangi filial qo'shish") : 
               t("Yangi ob'ekt qo'shish")}
            </h2>
            <input
              className="modal-input"
              type="text"
              placeholder={fileModalType === "project" ? t("Fayl nomi...") : 
                           fileModalType === "branch" ? t("Filial nomi...") : 
                           t("Ob'ekt nomi...")}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              autoFocus
            />
            <div className="confirm-buttons">
              <button className="confirm-btn confirm-cancel" onClick={() => setIsFileModalOpen(false)}>
                {t("bekorqilish")}
              </button>
              <button className="confirm-btn confirm-logout" style={{ backgroundColor: 'rgba(40, 236, 112, 0.1)', borderColor: 'rgba(40, 236, 112, 0.4)', color: 'rgb(40, 236, 112)' }} onClick={handleAddProject}>
                {t("qo'shish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Deletion Modal */}
      {deleteProjectId && (
        <div className="confirm-overlay" onClick={() => setDeleteProjectId(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="confirm-message">{t("Ushbu faylni o'chirmoqchimisiz?")}</h2>
            <div className="confirm-buttons">
              <button className="confirm-btn confirm-cancel" onClick={() => setDeleteProjectId(null)}>
                {t("yo'q")}
              </button>
              <button className="confirm-btn confirm-logout" onClick={confirmDeleteProject}>
                {t("ha")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Confirmation Modal */}
      {newProjectConfirmId && (
        <div className="confirm-overlay" onClick={() => setNewProjectConfirmId(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="confirm-message">{t("tasdiqlash_yangiprojekt")}</h2>
            <div className="confirm-buttons">
              <button className="confirm-btn confirm-cancel" onClick={() => setNewProjectConfirmId(null)}>
                {t("yo'q")}
              </button>
              <button
                className="confirm-btn confirm-logout"
                style={{ backgroundColor: 'rgba(40, 236, 112, 0.1)', borderColor: 'rgba(40, 236, 112, 0.4)', color: 'rgb(40, 236, 112)' }}
                onClick={confirmNewProject}
              >
                {t("ha")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Worker Detail Modal (About Worker) */}
      {isDetailModalOpen && selectedWorker && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal-container finishedworks" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h2 style={{ margin: 0 }}>{selectedWorker.workerName}</h2>
                {selectedWorker.workerCode && (
                  <span style={{
                    fontSize: '0.8rem',
                    color: 'rgb(146, 151, 223)',
                    fontWeight: '600',
                    background: 'rgba(146, 151, 223, 0.15)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    marginLeft: '10px'
                  }}>
                    Password: {selectedWorker.workerCode}
                  </span>
                )}
              </div>
              <button className="close-btn" onClick={() => setIsDetailModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="aboutTop">
                <div className="aboutTopLeft">
                  <div className="val-group">
                    <p>{t("olishikerak")}:</p>
                    <strong className="to-receive">
                      {selectedWorker.amountToReceive} {selectedWorker.currencyToReceive === "sum" ? t("som") : "$"}
                    </strong>
                    <span className="small-date">{t("sana")}: {selectedWorker.dateToGive}</span>
                  </div>
                  <div className="work-field">
                    <label>{t("qilayotganishi")}:</label>
                    <span style={{ color: "#fff", fontWeight: "600" }}>{selectedWorker.currentWork || t("yo'q")}</span>
                  </div>
                  <div className="work-field">
                    <label>{t("qilinayotganishfoizi")}:</label>
                    <strong className="progress-text">{selectedWorker.workPercent || "0%"}</strong>
                  </div>
                </div>

                <div className="aboutTopRight">
                  <div className="val-group">
                    <p>{t("olgansumma")}:</p>
                    <strong className="received">
                      {selectedWorker.amountAlreadyReceived} {selectedWorker.currencyAlreadyReceived === "sum" ? t("som") : "$"}
                    </strong>
                    <span className="small-date">{t("olgan")}: {selectedWorker.dateAlreadyReceived}</span>
                  </div>
                  <div className="work-field">
                    <label>{t("oldin_qilingan_ish")}:</label>
                    <span style={{ color: "#fff", fontWeight: "600" }}>{selectedWorker.prevWork || t("yo'q")}</span>
                  </div>
                  <div className="work-field">
                    <label>{t("oldin_qilingan_foiz")}:</label>
                    <strong className="progress-text">{selectedWorker.prevWorkPercent || "0%"}</strong>
                  </div>
                </div>
              </div>


              <div className="aboutBottom">
                <h3>{t("loyiha_tarixi")}</h3>
                <div className="project-history-list">
                  {(!selectedWorker.history || selectedWorker.history.filter(h => h.type === "project_completed").length === 0) ? (
                    <p className="no-history">{t("tarix_mavjud_emas")}</p>
                  ) : (
                    selectedWorker.history
                      .map((h, idx) => ({ ...h, originalIdx: idx }))
                      .filter(h => h.type === "project_completed" || h.type === "archived")
                      .reverse()
                      .map((h) => (
                        <div key={h.originalIdx} className="project-history-item">
                          <div className="history-main">
                            <div className="history-text">
                              <strong>{h.work || t("noma'lum_ish")}</strong>
                              <span>{h.percent || "100%"}</span>
                            </div>
                            <button
                              className="delete-history-btn"
                              onClick={() => handleDeleteHistoryProject(selectedWorker.id, h.originalIdx)}
                              title={t("ochirish_btn")}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="history-details">
                            <small>{h.date}</small>
                            <small>
                              {h.amount} {h.currency === "sum" ? t("som") : "$"} / {h.received} {h.receivedCurrency === "sum" ? t("som") : "$"}
                            </small>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn edit"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleEditWorkerClick(selectedWorker);
                }}
              >
                {t("tahrirlash")}
              </button>
              <button className="btn cancel" onClick={() => setIsDetailModalOpen(false)}>
                {t("yopish")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Premium Loading Overlay - ONLY if no local data AND still fetching */}
      {showInitialLoader && !dataLoaded && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(10, 10, 26, 0.98)',
          backdropFilter: 'blur(15px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div className="premium-loader"></div>
          <p style={{
            marginTop: '20px',
            color: 'rgb(161, 161, 241)',
            letterSpacing: '2px',
            fontSize: '14px',
            fontWeight: '300'
          }}>{t("Ma'lumotlar yuklanmoqda...")}</p>

          <style>{`
            .premium-loader {
              width: 50px;
              height: 50px;
              border: 3px solid rgba(86, 86, 255, 0.1);
              border-top: 3px solid rgb(86, 86, 255);
              border-radius: 50%;
              animation: spin 1s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
              box-shadow: 0 0 30px rgba(86, 86, 255, 0.2);
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default Hisobot;