import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "../styles/ProjectReport.css";
import { auth } from "../Firebase/Firebase";
import { getBossSectionSnapshot, saveBossSectionSnapshot } from "../auth/assistantSnapshots";
import {
  createAssistantRecord,
  deleteAssistantRecord,
  subscribeAssistantRecords,
  updateAssistantRecord,
} from "../auth/assistantRecords";
import { normalizeEmail } from "../auth/assistantAccess";
import { downloadReportExcel } from "../utils/exportReportExcel";

const CATEGORIES = ["hammasi", "material", "ishchi", "texnika", "boshqa"];

function ProjectReport({ projectId, projectName, bossEmail, dollarRate = 12000, readOnly = false, onBack, onRegisterExport }) {
  const { t } = useTranslation();

  const [username, setUsername] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [assistantRecords, setAssistantRecords] = useState([]);
  const [budget, setBudget] = useState({ sum: 0, dollar: 0 });
  const [initialBudget, setInitialBudget] = useState({ sum: 0, dollar: 0 });
  const [loadedProjectId, setLoadedProjectId] = useState(null);

  // UI state
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("hammasi");
  const [searchTerm, setSearchTerm] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editConfirmModal, setEditConfirmModal] = useState(false);
  const [chartPeriod, setChartPeriod] = useState("week");

  // Form state
  const [form, setForm] = useState({
    name: "",
    category: "material",
    quantity: "",
    unit: "dona",
    amountPerUnit: "",
    currency: "sum",
    date: new Date().toISOString().split("T")[0],
    isPaid: false,
    note: "",
  });

  const [budgetForm, setBudgetForm] = useState({ sum: "", dollar: "" });
  const [budgetMode, setBudgetMode] = useState("add");
  const [budgetError, setBudgetError] = useState("");
  const currentEmail = normalizeEmail(auth.currentUser?.email);
  const displayedExpenses = [
    ...expenses,
    ...assistantRecords
      .filter((record) => record.type === "constructionExpense")
      .map((record) => ({
        ...record.payload,
        id: record.id,
        assistantRecordId: record.id,
        createdByEmail: record.createdByEmail,
      })),
  ];

  // Undo state
  const [undoStack, setUndoStack] = useState([]);
  const [undoConfirmModal, setUndoConfirmModal] = useState(false);
  const [clearUndoModal, setClearUndoModal] = useState(false);

  // LocalStorage keys
  const expKey = `project_${projectId}_expenses_`;
  const budgetKey = `project_${projectId}_budget_`;
  const initBudgetKey = `project_${projectId}_initBudget_`;

  useEffect(() => {
    const ownerEmail = bossEmail || username;
    if (!ownerEmail) return undefined;
    return subscribeAssistantRecords(
      ownerEmail,
      "construction",
      setAssistantRecords,
      (loadError) => console.error("Failed to load construction assistant entries:", loadError),
      `project:${projectId}`,
    );
  }, [bossEmail, username, projectId]);

  useEffect(() => {
    const u = localStorage.getItem("username") || "";
    setUsername(u);
    if (!u) return;
    let active = true;
    setLoadedProjectId(null);
    setUndoStack([]);
    setChartPeriod("week");
    const loadProject = async () => {
      try {
        if (readOnly) {
          const data = await getBossSectionSnapshot(bossEmail, "construction", `project:${projectId}`);
          if (active && data) {
            setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
            setBudget(data.budget || { sum: 0, dollar: 0 });
            setInitialBudget(data.initialBudget || { sum: 0, dollar: 0 });
          }
        } else {
          const storedExp = localStorage.getItem(`${expKey}${u}`);
          setExpenses(storedExp ? JSON.parse(storedExp) : []);
          const storedBudget = localStorage.getItem(`${budgetKey}${u}`);
          setBudget(storedBudget ? JSON.parse(storedBudget) : { sum: 0, dollar: 0 });
          const storedInit = localStorage.getItem(`${initBudgetKey}${u}`);
          setInitialBudget(storedInit ? JSON.parse(storedInit) : { sum: 0, dollar: 0 });
        }
      } catch (loadError) {
        console.error("Failed to load construction report:", loadError);
      } finally {
        if (active) setLoadedProjectId(projectId);
      }
    };
    loadProject();
    return () => {
      active = false;
    };
  }, [projectId, readOnly, bossEmail, expKey, budgetKey, initBudgetKey]);

  useEffect(() => {
    if (!username || readOnly || loadedProjectId !== projectId) return;
    localStorage.setItem(`${expKey}${username}`, JSON.stringify(expenses));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, username, projectId, readOnly, loadedProjectId]);

  useEffect(() => {
    if (!username || readOnly || loadedProjectId !== projectId) return;
    localStorage.setItem(`${budgetKey}${username}`, JSON.stringify(budget));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget, username, projectId, readOnly, loadedProjectId]);

  useEffect(() => {
    if (!username || readOnly || loadedProjectId !== projectId) return;
    localStorage.setItem(`${initBudgetKey}${username}`, JSON.stringify(initialBudget));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBudget, username, projectId, readOnly, loadedProjectId]);

  useEffect(() => {
    if (!username || readOnly || loadedProjectId !== projectId) return;
    saveBossSectionSnapshot(bossEmail || username, "construction", {
      expenses,
      budget,
      initialBudget,
    }, `project:${projectId}`).catch((saveError) => {
      console.error("Failed to publish construction report snapshot:", saveError);
    });
  }, [username, readOnly, loadedProjectId, projectId, bossEmail, expenses, budget, initialBudget]);

  // Computed stats
  const totalAmount = (currency) =>
    displayedExpenses.filter((e) => e.currency === currency)
      .reduce((acc, e) => acc + parseFloat(e.amountPerUnit || 0) * parseFloat(e.quantity || 1), 0);

  const assistantExpenseAmount = (currency) =>
    assistantRecords
      .filter((record) => record.type === "constructionExpense" && record.payload.currency === currency)
      .reduce((total, record) => total + (Number(record.payload.amountPerUnit) || 0) * (Number(record.payload.quantity) || 1), 0);

  const paidAmount = (currency) =>
    displayedExpenses.filter((e) => e.currency === currency && e.isPaid)
      .reduce((acc, e) => acc + parseFloat(e.amountPerUnit || 0) * parseFloat(e.quantity || 1), 0);

  const remaining = (currency) => (Number(budget[currency]) || 0) - assistantExpenseAmount(currency);

  const catStats = ["material", "ishchi", "texnika", "boshqa"].map((cat) => {
    const items = displayedExpenses.filter((e) => e.category === cat);
    return {
      cat,
      count: items.length,
      sumTotal: items.filter((e) => e.currency === "sum")
        .reduce((a, e) => a + parseFloat(e.amountPerUnit || 0) * parseFloat(e.quantity || 1), 0),
      dolTotal: items.filter((e) => e.currency === "dollar")
        .reduce((a, e) => a + parseFloat(e.amountPerUnit || 0) * parseFloat(e.quantity || 1), 0),
    };
  });

  const filtered = displayedExpenses.filter((e) => {
    const matchCat = activeCategory === "hammasi" ? true : e.category === activeCategory;
    return matchCat && e.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const catLabel = useCallback((cat) => ({
    hammasi: t("pr_hammasi"), material: t("pr_material"),
    ishchi: t("pr_ishchi"), texnika: t("pr_texnika"), boshqa: t("pr_boshqa"),
  }[cat] || cat), [t]);

  const expenseCategoryLabel = useCallback((expense) =>
    expense.category === "boshqa" && expense.customCategoryName?.trim()
      ? expense.customCategoryName
      : catLabel(expense.category), [catLabel]);

  useEffect(() => {
    if (!onRegisterExport) return undefined;
    if (readOnly || loadedProjectId !== projectId) {
      onRegisterExport(null);
      return undefined;
    }

    const exportReport = async () => {
      const reportExpenses = [
        ...expenses,
        ...assistantRecords
          .filter((record) => record.type === "constructionExpense")
          .map((record) => ({
            ...record.payload,
            createdByEmail: record.createdByEmail,
          })),
      ];

      await downloadReportExcel({
        fileName: `${projectName || "construction"}_expenses`,
        title: `${t("report_export_construction_title")} — ${projectName || ""}`,
        columns: [
          t("report_export_col_date") || "Sana",
          "$",
          t("report_export_col_name") || "Nomi",
          t("report_export_col_type") || "turi",
          t("report_export_col_size") || "O'lcham",
          t("report_export_col_count") || "Soni",
          t("report_export_col_measurement") || "o'lchov",
          t("report_export_col_price_sum") || "Narxi so'm",
          t("report_export_col_group_uz") || "Guruhi",
          t("report_export_col_total_narxi") || "Umumiy narxi",
          t("report_export_col_total_usd") || "Umumiy $",
          t("report_export_col_worker") || "Xodim",
        ],
        rows: reportExpenses.map((item) => {
          const itemRate = parseFloat(item.dollarRate) || dollarRate || 12000;
          const qty = parseFloat(item.quantity) || 1;
          const rawPrice = parseFloat(item.amountPerUnit) || 0;
          const priceInSum = item.currency === "dollar" ? rawPrice * itemRate : rawPrice;
          const amountSum = priceInSum * qty;
          const amountDollar = itemRate > 0 ? amountSum / itemRate : 0;
          const typeLabel =
            item.category === "ishchi"
              ? "mehnat"
              : item.category === "material"
              ? "material"
              : item.category === "boshqa" && item.customCategoryName?.trim()
              ? item.customCategoryName
              : expenseCategoryLabel(item) || item.category || "";

          return [
            item.date ? new Date(`${item.date}T00:00:00`) : "",
            itemRate,
            item.name || "",
            typeLabel,
            item.note || item.dimension || item.size || "",
            qty,
            item.unit || "",
            priceInSum,
            item.group || item.customCategoryName || "",
            amountSum,
            amountDollar,
            item.workerName || item.createdByEmail || "",
          ];
        }),
      });
    };

    onRegisterExport(exportReport);
    return () => onRegisterExport(null);
  }, [
    onRegisterExport,
    readOnly,
    loadedProjectId,
    projectId,
    projectName,
    expenses,
    assistantRecords,
    budget,
    dollarRate,
    t,
    expenseCategoryLabel,
  ]);

  const catIcon = (cat) => ({ material: "🧱", ishchi: "👷", texnika: "🚜", boshqa: "📋" }[cat] || "📦");

  const unitOptions = ["dona", "kg", "t", "m", "m²", "m³", "l", "kun", "soat"];

  const getChartData = () => {
    const now = new Date();
    let data = [];
    let allPayments = [];

    displayedExpenses.forEach((e) => {
      if (e.isPaid) {
        allPayments.push({
          date: new Date(e.date),
          amount: parseFloat(e.amountPerUnit || 0) * parseFloat(e.quantity || 1),
          currency: e.currency,
        });
      }
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
    const totalCount = displayedExpenses.length;
    if (totalCount === 0) return { paid: 0, unpaid: 0, percent: 0 };
    const paidCount = displayedExpenses.filter((e) => e.isPaid).length;
    const percent = Math.round((paidCount / totalCount) * 100);
    return { paid: paidCount, unpaid: totalCount - paidCount, percent };
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", category: "material", quantity: "", unit: "dona", amountPerUnit: "", currency: "sum",
      date: new Date().toISOString().split("T")[0], isPaid: false, note: "", customCategoryName: "" });
    setAddModal(true);
  };

  const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setAddModal(true); };
  const closeAdd = () => {
    setAddModal(false);
    setEditItem(null);
    setEditConfirmModal(false);
  };

  const handleSave = async (confirmed = false) => {
    if (!form.name || !form.amountPerUnit ||
      (form.category === "boshqa" && !form.customCategoryName?.trim())) return;
    if (editItem && !confirmed) {
      setEditConfirmModal(true);
      return;
    }
    if (editItem?.assistantRecordId) {
      try {
        const payload = { ...form };
        delete payload.assistantRecordId;
        delete payload.createdByEmail;
        await updateAssistantRecord(editItem.assistantRecordId, "constructionExpense", payload);
        closeAdd();
      } catch (saveError) {
        console.error("Failed to update assistant construction expense:", saveError);
        window.alert(t("assistant_action_failed"));
      }
      return;
    }
    if (readOnly) {
      try {
        await createAssistantRecord(
          bossEmail,
          "construction",
          `project:${projectId}`,
          "constructionExpense",
          { ...form, id: Date.now() },
        );
        closeAdd();
      } catch (saveError) {
        console.error("Failed to save assistant construction expense:", saveError);
        window.alert(t("assistant_action_failed"));
      }
      return;
    }
    saveForUndo();
    const total = parseFloat(form.amountPerUnit) * parseFloat(form.quantity || 1);
    if (editItem) {
      const oldTotal = parseFloat(editItem.amountPerUnit) * parseFloat(editItem.quantity || 1);
      if (editItem.currency === form.currency) {
        setBudget((prev) => ({ ...prev, [form.currency]: prev[form.currency] - total + oldTotal }));
      } else {
        setBudget((prev) => ({
          ...prev,
          [editItem.currency]: prev[editItem.currency] + oldTotal,
          [form.currency]: prev[form.currency] - total,
        }));
      }
      setExpenses(expenses.map((e) => (e.id === editItem.id ? { ...form, id: e.id } : e)));
    } else {
      setExpenses([...expenses, { ...form, id: Date.now() }]);
      setBudget((prev) => ({ ...prev, [form.currency]: prev[form.currency] - total }));
    }
    closeAdd();
  };

  const handleDelete = async () => {
    if (deleteItem) {
      if (deleteItem.assistantRecordId) {
        try {
          await deleteAssistantRecord(deleteItem.assistantRecordId);
        } catch (deleteError) {
          console.error("Failed to delete assistant construction expense:", deleteError);
          window.alert(t("assistant_action_failed"));
        }
      } else if (!readOnly) {
        saveForUndo();
        const total = parseFloat(deleteItem.amountPerUnit) * parseFloat(deleteItem.quantity || 1);
        setBudget((prev) => ({ ...prev, [deleteItem.currency]: prev[deleteItem.currency] + total }));
        setExpenses(expenses.filter((e) => e.id !== deleteItem.id));
      }
    }
    setDeleteItem(null);
  };

  const handleTogglePaid = async (id) => {
    const item = displayedExpenses.find((expense) => expense.id === id);
    if (!item) return;
    if (item.assistantRecordId) {
      const payload = { ...item, isPaid: !item.isPaid };
      delete payload.assistantRecordId;
      delete payload.createdByEmail;
      try {
        await updateAssistantRecord(item.assistantRecordId, "constructionExpense", payload);
      } catch (updateError) {
        console.error("Failed to update assistant construction expense status:", updateError);
        window.alert(t("assistant_action_failed"));
      }
    } else if (!readOnly) {
      setExpenses(expenses.map((expense) =>
        expense.id === id ? { ...expense, isPaid: !expense.isPaid } : expense,
      ));
    }
  };

  // Save state for undo
  const saveForUndo = () => {
    setUndoStack([...undoStack, { expenses, budget, initialBudget }]);
  };

  // Undo function - show confirmation first
  const handleUndoClick = () => {
    if (undoStack.length === 0) return;
    setUndoConfirmModal(true);
  };

  // Confirm undo
  const confirmUndo = () => {
    if (undoStack.length === 0) return;
    const lastState = undoStack[undoStack.length - 1];
    setExpenses(lastState.expenses);
    setBudget(lastState.budget);
    setInitialBudget(lastState.initialBudget);
    setUndoStack(undoStack.slice(0, -1));
    setUndoConfirmModal(false);
  };

  // Clear all undo history
  const confirmClearUndo = () => {
    setUndoStack([]);
    setClearUndoModal(false);
  };

  const handleBudgetSave = () => {
    const s = Number(budgetForm.sum || 0);
    const d = Number(budgetForm.dollar || 0);
    if (!Number.isFinite(s) || !Number.isFinite(d) || s < 0 || d < 0) {
      setBudgetError(t("balance_invalid_amount") || "Enter valid positive amounts.");
      return;
    }
    if (budgetMode !== "update" && s === 0 && d === 0) {
      setBudgetError(t("balance_invalid_amount") || "Enter valid positive amounts.");
      return;
    }
    if (budgetMode === "subtract" && (s > remaining("sum") || d > remaining("dollar"))) {
      setBudgetError(t("balance_insufficient") || "Insufficient balance.");
      return;
    }
    saveForUndo();
    if (budgetMode === "add") {
      setBudget((prev) => ({
        sum: (Number(prev.sum) || 0) + s,
        dollar: (Number(prev.dollar) || 0) + d,
      }));
      setInitialBudget((prev) => ({
        sum: (Number(prev.sum) || 0) + s,
        dollar: (Number(prev.dollar) || 0) + d,
      }));
    } else if (budgetMode === "subtract") {
      setBudget((prev) => ({
        sum: (Number(prev.sum) || 0) - s,
        dollar: (Number(prev.dollar) || 0) - d,
      }));
    } else {
      setBudget({ sum: s, dollar: d });
      setInitialBudget({ sum: s, dollar: d });
    }
    setBudgetForm({ sum: "", dollar: "" });
    setBudgetError("");
    setBudgetModal(false);
  };

  const isFormValid =
    form.name.trim() &&
    form.amountPerUnit &&
    (form.category !== "boshqa" || form.customCategoryName?.trim());

  return (
    <div className={`ProjectReport ${readOnly ? "assistant-read-only" : ""}`}>
      {/* Mobile right panel toggle button */}
      <button className="right-panel-toggle-btn" onClick={() => setIsRightPanelOpen(true)}>‹</button>

      {/* === MAIN AREA (left/center) === */}
      <div className="pr-main">
        {/* Header */}
        <div className="pr-header">
          <div className="pr-title-area">
            <button className="pr-back-btn" onClick={onBack} title={t("ortga")}>
              ‹
            </button>
            <span className="pr-icon">🏗️</span>
            <h2 className="pr-title">{projectName}</h2>
          </div>
          <div className="pr-header-actions">
            <button className="pr-btn pr-btn-add" onClick={openAdd}>
              + {t("pr_xarajat_qoshish")}
            </button>
            {!readOnly && <button className="pr-btn pr-btn-budget" onClick={() => { setBudgetError(""); setBudgetModal(true); }}>
              + {t("pr_byudjet")}
            </button>}
            {undoStack.length > 0 && (
              <div className="undo-group">
                <button className="pr-btn pr-btn-undo" onClick={handleUndoClick} title="Undo">
                  ↶
                </button>
                <button className="pr-btn pr-btn-undo-clear" onClick={() => setClearUndoModal(true)} title="Clear Undo">
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Category tabs + search */}
        <div className="pr-toolbar">
          <div className="pr-tabs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`pr-tab ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat !== "hammasi" && catIcon(cat)} {catLabel(cat)}
              </button>
            ))}
          </div>
          <input
            className="pr-search"
            type="search"
            placeholder={t("pr_qidiruv")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Expense list */}
        <div className="pr-list">
          {filtered.length === 0 ? (
            <div className="pr-empty">
              <span>📋</span>
              <p>{searchTerm ? t("pr_topilmadi") : t("pr_bosh_holat")}</p>
            </div>
          ) : (
            filtered.map((item) => {
              const canManageItem = !readOnly || (
                item.assistantRecordId && item.createdByEmail === currentEmail
              );
              const itemTotal = parseFloat(item.amountPerUnit || 0) * parseFloat(item.quantity || 1);
              return (
                <div key={item.id} className={`pr-item ${item.isPaid ? "pr-item-paid" : ""}`}>
                  <div className="pr-item-left">
                    <input type="checkbox" className="pr-checkbox" checked={item.isPaid} disabled={!canManageItem}
                      onChange={() => handleTogglePaid(item.id)} />
                    <span className="pr-item-cat-icon">{catIcon(item.category)}</span>
                    <div className="pr-item-info">
                      {item.createdByEmail && <small className="assistant-author-label">{item.createdByEmail}</small>}
                      <h4 className="pr-item-name">{item.name}</h4>
                      <div className="pr-item-meta">
                        <span className="pr-badge pr-badge-cat">{expenseCategoryLabel(item)}</span>
                        <span className="pr-badge">{item.date}</span>
                        {item.quantity && <span className="pr-badge">{item.quantity} {item.unit}</span>}
                        {item.isPaid && <span className="pr-badge pr-badge-paid">✓ {t("pr_tolangan")}</span>}
                      </div>
                      {item.note && <p className="pr-item-note">{item.note}</p>}
                    </div>
                  </div>
                  <div className="pr-item-right">
                    <div className="pr-item-amount">
                      <strong>{itemTotal.toLocaleString()} {item.currency === "sum" ? t("som") : "$"}</strong>
                      {parseFloat(item.quantity) > 1 && (
                        <span className="pr-item-per-unit">
                          ({parseFloat(item.amountPerUnit).toLocaleString()}/{item.unit})
                        </span>
                      )}
                    </div>
                    <div className="pr-item-actions">
                      {canManageItem && <>
                        <button className="pr-action-btn pr-edit-btn" onClick={() => openEdit(item)}>✏️</button>
                        <button className="pr-action-btn pr-delete-btn" onClick={() => setDeleteItem(item)}>🗑️</button>
                      </>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* === RIGHT STATS PANEL === */}
      <div className={`rightRight ${isRightPanelOpen ? "open" : ""}`}>
        <button className="right-panel-close-btn" onClick={() => setIsRightPanelOpen(false)}>›</button>
        <div className="lrLine"></div>
          {/* Statistics Section - like Hisobot */}
          <div className="statistic">
            <h2>{t("statistika")}</h2>

              {/* Remaining budget */}
            <div className="statistic1">
            <h3>{t("pr_byudjet_qoldiq")}:</h3>
            <p className={remaining("sum") < 0 || remaining("dollar") < 0 ? "negative-balance" : ""}>
              {remaining("sum").toLocaleString()} {t("som")} / {remaining("dollar").toLocaleString()} $
            </p>
          </div>

            {/* Total items */}
            <div className="statistic2">
              <h3>{t("jami_xarajatlar")}:</h3>
              <p>{displayedExpenses.length}</p>
            </div>

            {/* Highest expense */}
            <div className="statistic3">
              <h3>{t("eng_qimmat_xarajat")}:</h3>
              <p>
                {(() => {
                  const sumHigh = displayedExpenses
                    .filter((e) => e.currency === "sum")
                    .sort((a, b) => (parseFloat(b.amountPerUnit) || 0) - (parseFloat(a.amountPerUnit) || 0))[0];
                  const dolHigh = displayedExpenses
                    .filter((e) => e.currency === "dollar")
                    .sort((a, b) => (parseFloat(b.amountPerUnit) || 0) - (parseFloat(a.amountPerUnit) || 0))[0];

                  const sumText = sumHigh ? `${sumHigh.name}: ${parseFloat(sumHigh.amountPerUnit).toLocaleString()} ${t("som")}` : t("yo'q");
                  const dolText = dolHigh ? `${dolHigh.name}: ${parseFloat(dolHigh.amountPerUnit).toLocaleString()} $` : t("yo'q");

                  return `${sumText} / ${dolText}`;
                })()}
              </p>
            </div>

            {/* Total expenses */}
            <div className="statistic4">
              <h3>{t("pr_jami_xarajat")}:</h3>
              <p>{totalAmount("sum").toLocaleString()} {t("som")} / {totalAmount("dollar").toLocaleString()} $</p>
            </div>

            {/* Paid expenses */}
            <div className="statistic5">
              <h3>{t("pr_tolangan")}:</h3>
              <p>{paidAmount("sum").toLocaleString()} {t("som")} / {paidAmount("dollar").toLocaleString()} $</p>
            </div>

            {/* Initial budget */}
            <div className="statistic1">
              <h3>{t("Boshlang'ich balans")}:</h3>
              <p>{initialBudget.sum.toLocaleString()} {t("som")} / {initialBudget.dollar.toLocaleString()} $</p>
            </div>

            {/* Category breakdown */}
            <div className="linear-stats" style={{ width: "80%" }}>
              <h2>{t("pr_kategoriya")}</h2>
              {catStats.map(({ cat, count, sumTotal, dolTotal }) => (
                <div key={cat} className="statistic1" style={{ width: "100%" }}>
                  <h3>{catIcon(cat)} {catLabel(cat)} <span style={{ color: "rgba(180,170,255,0.5)", fontSize: "12px" }}>({count})</span></h3>
                  <p style={{ flexDirection: "column", height: "auto", padding: "10px", width: "100%", boxSizing: "border-box" }}>
                    {sumTotal > 0 && <span style={{ margin: "5px 0" }}>{sumTotal.toLocaleString()} {t("som")}</span>}
                    {dolTotal > 0 && <span style={{ margin: "5px 0" }}>{dolTotal.toLocaleString()} $</span>}
                    {sumTotal === 0 && dolTotal === 0 && <span style={{ color: "rgba(200,190,255,0.3)", fontSize: "12px" }}>—</span>}
                  </p>
                </div>
              ))}
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

      {/* === MODALS === */}

      {/* Add / Edit Modal */}
      {addModal && (
        <div className="pr-overlay" onClick={closeAdd}>
          <div className="pr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h3>{editItem ? t("pr_tahrirlash") : t("pr_yangi_xarajat")}</h3>
              <button className="pr-close-btn" onClick={closeAdd}>✕</button>
            </div>
            <div className="pr-modal-body">
              <div className="pr-form-group">
                <label>{t("pr_nom")}</label>
                <input type="text" value={form.name} placeholder={t("pr_nom_placeholder")}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="pr-form-group">
                <label>{t("pr_kategoriya")}</label>
                <div className="pr-cat-select-row">
                  {["material", "ishchi", "texnika", "boshqa"].map((cat) => (
                    <button key={cat} className={`pr-cat-opt ${form.category === cat ? "active" : ""}`}
                      onClick={() => setForm({ ...form, category: cat })}>
                      {catIcon(cat)} {catLabel(cat)}
                    </button>
                  ))}
                </div>
              </div>
              {form.category === "boshqa" && (
                <div className="pr-form-group">
                  <label>{t("pr_custom_category_name")}</label>
                  <input
                    type="text"
                    value={form.customCategoryName || ""}
                    placeholder={t("pr_custom_category_placeholder")}
                    onChange={(e) => setForm({ ...form, customCategoryName: e.target.value })}
                  />
                </div>
              )}
              <div className="pr-form-row">
                <div className="pr-form-group">
                  <label>{t("pr_miqdor")}</label>
                  <input type="number" value={form.quantity} placeholder="1"
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="pr-form-group">
                  <label>{t("pr_olchov")}</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>
                        {t(`unit_${u === "m²" ? "m2" : u === "m³" ? "m3" : u}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pr-form-row">
                <div className="pr-form-group">
                  <label>{t("pr_birlik_narxi")} ({form.unit})</label>
                  <input type="number" value={form.amountPerUnit} placeholder="0"
                    onChange={(e) => setForm({ ...form, amountPerUnit: e.target.value })} />
                </div>
                <div className="pr-form-group">
                  <label>{t("valyuta")}</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                    <option value="sum">{t("som")}</option>
                    <option value="dollar">{t("dollar")} ($)</option>
                  </select>
                </div>
              </div>
              {form.amountPerUnit && (
                <div className="pr-total-preview">
                  {t("pr_jami")}: <strong>
                    {(parseFloat(form.amountPerUnit || 0) * parseFloat(form.quantity || 1)).toLocaleString()}
                    {" "}{form.currency === "sum" ? "so'm" : "$"}
                  </strong>
                </div>
              )}
              <div className="pr-form-group">
                <label>{t("sana")}</label>
                <input type="date" value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="pr-form-group">
                <label>{t("pr_izoh")}</label>
                <textarea value={form.note} placeholder={t("pr_izoh_placeholder")} rows={2}
                  onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <div className="pr-form-check">
                <input type="checkbox" id="isPaidCheck" checked={form.isPaid}
                  onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} />
                <label htmlFor="isPaidCheck">{t("pr_tolandi_deb_belgilash")}</label>
              </div>
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn pr-btn-cancel" onClick={closeAdd}>{t("bekorqilish")}</button>
              <button className="pr-btn pr-btn-save" disabled={!isFormValid} onClick={() => handleSave()}>
                {editItem ? t("saqlash") : t("qo'shish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {budgetModal && (
        <div className="pr-overlay" onClick={() => setBudgetModal(false)}>
          <div className="pr-modal pr-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h3>
                {budgetMode === "add"
                  ? (t("byudjet_qoshish_tab") || "Byudjetga qo'shish")
                  : budgetMode === "subtract"
                    ? (t("byudjet_ayirish_tab") || "Byudjetdan ayirish")
                    : (t("byudjet_yangilash_tab") || "Byudjetni yangilash")}
              </h3>
              <button className="pr-close-btn" onClick={() => setBudgetModal(false)}>✕</button>
            </div>
            <div className="pr-modal-body">
              <div className="pr-budget-tabs">
                <button
                  type="button"
                  className={`pr-budget-tab ${budgetMode === "add" ? "active tab-add" : ""}`}
                  onClick={() => { setBudgetMode("add"); setBudgetError(""); }}
                >
                  ➕ {t("byudjet_qoshish_tab") || "Byudjetga qo'shish"}
                </button>
                <button
                  type="button"
                  className={`pr-budget-tab ${budgetMode === "subtract" ? "active tab-subtract" : ""}`}
                  onClick={() => { setBudgetMode("subtract"); setBudgetError(""); }}
                >
                  ➖ {t("byudjet_ayirish_tab") || "Byudjetdan ayirish"}
                </button>
                <button
                  type="button"
                  className={`pr-budget-tab ${budgetMode === "update" ? "active" : ""}`}
                  onClick={() => { setBudgetMode("update"); setBudgetError(""); }}
                >
                  🔄 {t("byudjet_yangilash_tab") || "Byudjetni yangilash"}
                </button>
              </div>

              <div className="pr-budget-current">
                <p>{t("pr_joriy_byudjet")}:</p>
                <strong>{remaining("sum").toLocaleString()} so'm / {remaining("dollar").toLocaleString()} $</strong>
              </div>
              <div className="pr-form-group">
                <label>
                  {budgetMode === "add"
                    ? `${t("qoshiladigan_miqdor") || "Qo'shiladigan miqdor"} (so'm)`
                    : budgetMode === "subtract"
                      ? `${t("ayiriladigan_miqdor") || "Ayiriladigan miqdor"} (so'm)`
                      : `${t("pr_qoshish_som")} (so'm)`}
                </label>
                <input type="number" min="0" value={budgetForm.sum} placeholder="0"
                  onChange={(e) => { setBudgetForm({ ...budgetForm, sum: e.target.value }); setBudgetError(""); }} />
              </div>
              <div className="pr-form-group">
                <label>
                  {budgetMode === "add"
                    ? `${t("qoshiladigan_miqdor") || "Qo'shiladigan miqdor"} ($)`
                    : budgetMode === "subtract"
                      ? `${t("ayiriladigan_miqdor") || "Ayiriladigan miqdor"} ($)`
                      : `${t("pr_qoshish_dollar")} ($)`}
                </label>
                <input type="number" min="0" value={budgetForm.dollar} placeholder="0"
                  onChange={(e) => { setBudgetForm({ ...budgetForm, dollar: e.target.value }); setBudgetError(""); }} />
              </div>

              {(parseFloat(budgetForm.sum) > 0 || parseFloat(budgetForm.dollar) > 0) && (
                <div className="pr-budget-preview">
                  <span>{t("yangi_boshlangich_balans") || "Yangi boshlang'ich byudjet"}:</span>
                  <strong>
                    {budgetMode === "add"
                      ? `${((Number(initialBudget.sum) || 0) + (parseFloat(budgetForm.sum) || 0)).toLocaleString()} so'm / ${((Number(initialBudget.dollar) || 0) + (parseFloat(budgetForm.dollar) || 0)).toLocaleString()} $`
                      : budgetMode === "subtract"
                        ? `${(remaining("sum") - (parseFloat(budgetForm.sum) || 0)).toLocaleString()} so'm / ${(remaining("dollar") - (parseFloat(budgetForm.dollar) || 0)).toLocaleString()} $`
                        : `${(parseFloat(budgetForm.sum) || 0).toLocaleString()} so'm / ${(parseFloat(budgetForm.dollar) || 0).toLocaleString()} $`}
                  </strong>
                </div>
              )}
              {budgetError && <p className="pr-budget-error" role="alert">{budgetError}</p>}
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn pr-btn-cancel" onClick={() => setBudgetModal(false)}>{t("bekorqilish")}</button>
              <button className={`pr-btn pr-btn-save ${budgetMode === "subtract" ? "pr-btn-subtract" : ""}`} onClick={handleBudgetSave}
                disabled={budgetMode !== "update" && !(Number(budgetForm.sum) > 0 || Number(budgetForm.dollar) > 0)}>
                {budgetMode === "add"
                  ? (t("qoshish_btn") || "Qo'shish")
                  : budgetMode === "subtract"
                    ? (t("byudjet_ayirish_tab") || "Byudjetdan ayirish")
                    : t("yangilash")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteItem && (
        <div className="pr-overlay" onClick={() => setDeleteItem(null)}>
          <div className="pr-modal pr-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h3>{t("pr_ochirish_tasdiq")}</h3>
              <button className="pr-close-btn" onClick={() => setDeleteItem(null)}>✕</button>
            </div>
            <div className="pr-modal-body">
              <p style={{ color: "rgba(200,190,255,0.6)", fontSize: "14px", marginBottom: "15px" }}>
                {t("pr_ochirish_savol")}
              </p>
              <div style={{ background: "rgba(255, 60, 60, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 60, 60, 0.3)" }}>
                <p style={{ fontSize: "12px", color: "rgba(200,190,255,0.5)", margin: "0 0 6px 0" }}>{t("ochiriladigan")}:</p>
                <p style={{ fontSize: "15px", fontWeight: "600", color: "#fff", margin: "0" }}>📍 {deleteItem.name}</p>
                <p style={{ fontSize: "12px", color: "rgba(200,190,255,0.5)", margin: "6px 0 0 0" }}>
                  {parseFloat(deleteItem.amountPerUnit).toLocaleString()} {deleteItem.currency === "sum" ? t("som") : "$"} × {deleteItem.quantity} {deleteItem.unit}
                </p>
              </div>
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn pr-btn-cancel" onClick={() => setDeleteItem(null)}>{t("yo'q")}</button>
              <button className="pr-btn pr-btn-delete" onClick={handleDelete}>{t("ha")}</button>
            </div>
          </div>
        </div>
      )}

      {editConfirmModal && editItem && (
        <div className="pr-overlay pr-confirm-overlay" onClick={() => setEditConfirmModal(false)}>
          <div className="pr-modal pr-modal-sm" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="pr-modal-header">
              <h3>{t("pr_edit_confirm_title")}</h3>
              <button className="pr-close-btn" type="button" onClick={() => setEditConfirmModal(false)} aria-label={t("Close")}>×</button>
            </div>
            <div className="pr-modal-body">
              <p className="pr-confirm-message">{t("pr_edit_confirm_savol")}</p>
              <div className="pr-confirm-item">
                <strong>{form.name}</strong>
                <span>
                  {(parseFloat(form.amountPerUnit || 0) * parseFloat(form.quantity || 1)).toLocaleString()}
                  {" "}{form.currency === "sum" ? t("som") : "$"}
                </span>
              </div>
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn pr-btn-cancel" type="button" onClick={() => setEditConfirmModal(false)}>{t("bekorqilish")}</button>
              <button className="pr-btn pr-btn-save" type="button" onClick={() => handleSave(true)}>{t("saqlash")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Confirmation Modal */}
      {undoConfirmModal && (
        <div className="pr-overlay" onClick={() => setUndoConfirmModal(false)}>
          <div className="pr-modal pr-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h3>{t("qaytarish") || "Undo"}</h3>
              <button className="pr-close-btn" onClick={() => setUndoConfirmModal(false)}>✕</button>
            </div>
            <div className="pr-modal-body">
              <p style={{ color: "rgba(200,190,255,0.75)", textAlign: "center" }}>
                {t("oxirgi_ozgarishni_qaytarish")}
              </p>
              <p style={{ fontSize: "13px", color: "rgba(200,190,255,0.5)", textAlign: "center", marginTop: "8px" }}>
                {t("operatsiyani_qayta_bajarib_bolmaydi")}
              </p>
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn pr-btn-cancel" onClick={() => setUndoConfirmModal(false)}>{t("bekorqilish")}</button>
              <button className="pr-btn pr-btn-undo" onClick={confirmUndo}>{t("qaytarish")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Undo History Modal */}
      {clearUndoModal && (
        <div className="pr-overlay" onClick={() => setClearUndoModal(false)}>
          <div className="pr-modal pr-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h3>{t("undo_ochirilsin")}</h3>
              <button className="pr-close-btn" onClick={() => setClearUndoModal(false)}>✕</button>
            </div>
            <div className="pr-modal-body">
              <p style={{ color: "rgba(200,190,255,0.75)", textAlign: "center" }}>
                {t("undo_tarixini_ochirilsinmi")}
              </p>
              <p style={{ fontSize: "13px", color: "rgba(255, 60, 60, 0.75)", textAlign: "center", marginTop: "8px" }}>
                {t("operatsiyani_qayta_bajarib_bolmaydi")}
              </p>
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn pr-btn-cancel" onClick={() => setClearUndoModal(false)}>{t("bekorqilish")}</button>
              <button className="pr-btn pr-btn-delete" onClick={confirmClearUndo}>{t("ochirilsin")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectReport;