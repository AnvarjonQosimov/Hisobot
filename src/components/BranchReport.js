import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "../styles/ProjectReport.css"; // Reuse ProjectReport styles for consistency
import { getBossSectionSnapshot, saveBossSectionSnapshot } from "../auth/assistantSnapshots";
import {
  createAssistantRecord,
  deleteAssistantRecord,
  subscribeAssistantRecords,
  updateAssistantRecord,
} from "../auth/assistantRecords";
import { normalizeEmail } from "../auth/assistantAccess";
import { auth } from "../Firebase/Firebase";
import { downloadReportExcel } from "../utils/exportReportExcel";

function BranchReport({ branchId, branchName, bossEmail, dollarRate = 12000, readOnly = false, onBack, onRegisterExport }) {
  const { t } = useTranslation();
  const username = localStorage.getItem("username") || "";
  const [expenses, setExpenses] = useState([]);
  const [assistantRecords, setAssistantRecords] = useState([]);
  const [budget, setBudget] = useState({ sum: 0, dollar: 0 });
  const [initialBudget, setInitialBudget] = useState({ sum: 0, dollar: 0 });
  const [addModal, setAddModal] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editConfirmModal, setEditConfirmModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadedBranchId, setLoadedBranchId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    amount: "",
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
      .filter((record) => record.type === "officeExpense")
      .map((record) => ({
        ...record.payload,
        id: record.id,
        assistantRecordId: record.id,
        createdByEmail: record.createdByEmail,
      })),
  ];

  const expKey = `branch_${branchId}_expenses_${username}`;
  const budgetKey = `branch_${branchId}_budget_${username}`;
  const initBudgetKey = `branch_${branchId}_initBudget_${username}`;

  useEffect(() => {
    if (!username) return;
    let active = true;
    const loadBranch = async () => {
      try {
        setLoadedBranchId(null);
        if (readOnly) {
          const data = await getBossSectionSnapshot(bossEmail, "office", `branch:${branchId}`);
          if (active && data) {
            setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
            setBudget(data.budget || { sum: 0, dollar: 0 });
            setInitialBudget(data.initialBudget || { sum: 0, dollar: 0 });
          }
        } else {
          const storedExp = localStorage.getItem(expKey);
          if (storedExp) setExpenses(JSON.parse(storedExp));
          const storedBudget = localStorage.getItem(budgetKey);
          if (storedBudget) setBudget(JSON.parse(storedBudget));
          const storedInit = localStorage.getItem(initBudgetKey);
          if (storedInit) setInitialBudget(JSON.parse(storedInit));
        }
      } catch (loadError) {
        console.error("Failed to load branch report:", loadError);
      } finally {
        if (active) {
          setDataLoaded(true);
          setLoadedBranchId(branchId);
        }
      }
    };
    setDataLoaded(false);
    loadBranch();
    return () => {
      active = false;
    };
  }, [branchId, username, readOnly, bossEmail, expKey, budgetKey, initBudgetKey]);

  useEffect(() => {
    if (!username || !dataLoaded || readOnly || loadedBranchId !== branchId) return;
    localStorage.setItem(expKey, JSON.stringify(expenses));
    localStorage.setItem(budgetKey, JSON.stringify(budget));
    localStorage.setItem(initBudgetKey, JSON.stringify(initialBudget));
    saveBossSectionSnapshot(bossEmail || username, "office", {
      expenses,
      budget,
      initialBudget,
    }, `branch:${branchId}`).catch((saveError) => {
      console.error("Failed to publish branch report snapshot:", saveError);
    });
  }, [expenses, budget, initialBudget, username, dataLoaded, readOnly, bossEmail, branchId, loadedBranchId, expKey, budgetKey, initBudgetKey]);

  useEffect(() => {
    if (!bossEmail && !username) return undefined;
    return subscribeAssistantRecords(
      bossEmail || username,
      "office",
      setAssistantRecords,
      (loadError) => console.error("Failed to load office assistant entries:", loadError),
      `branch:${branchId}`,
    );
  }, [bossEmail, username, branchId]);

  const handleSave = async (confirmed = false) => {
    if (!form.name || !form.amount) return;
    if (editItem && !confirmed) {
      setEditConfirmModal(true);
      return;
    }
    const amount = parseFloat(form.amount);
    if (editItem?.assistantRecordId) {
      try {
        const payload = { ...form };
        delete payload.assistantRecordId;
        delete payload.createdByEmail;
        await updateAssistantRecord(editItem.assistantRecordId, "officeExpense", payload);
        setAddModal(false);
        setEditItem(null);
        setEditConfirmModal(false);
      } catch (saveError) {
        console.error("Failed to update assistant office expense:", saveError);
        window.alert(t("assistant_action_failed"));
      }
      return;
    }
    if (readOnly) {
      try {
        await createAssistantRecord(
          bossEmail,
          "office",
          `branch:${branchId}`,
          "officeExpense",
          { ...form, id: Date.now() },
        );
        setAddModal(false);
      } catch (saveError) {
        console.error("Failed to save assistant office expense:", saveError);
        window.alert(t("assistant_action_failed"));
      }
      return;
    }
    if (editItem) {
      const oldAmount = parseFloat(editItem.amount);
      if (editItem.currency === form.currency) {
        setBudget(prev => ({ ...prev, [form.currency]: prev[form.currency] - amount + oldAmount }));
      } else {
        setBudget(prev => ({ ...prev, [editItem.currency]: prev[editItem.currency] + oldAmount, [form.currency]: prev[form.currency] - amount }));
      }
      setExpenses(expenses.map(e => (e.id === editItem.id ? { ...form, id: e.id } : e)));
    } else {
      setExpenses([...expenses, { ...form, id: Date.now() }]);
      setBudget(prev => ({ ...prev, [form.currency]: prev[form.currency] - amount }));
    }
    setAddModal(false);
    setEditItem(null);
    setEditConfirmModal(false);
  };

  const togglePaid = async (item) => {
    if (item.assistantRecordId) {
      if (!readOnly || item.createdByEmail === currentEmail) {
        const payload = { ...item, isPaid: !item.isPaid };
        delete payload.assistantRecordId;
        delete payload.createdByEmail;
        try {
          await updateAssistantRecord(item.assistantRecordId, "officeExpense", payload);
        } catch (updateError) {
          console.error("Failed to update assistant office expense status:", updateError);
          window.alert(t("assistant_action_failed"));
        }
      }
      return;
    }
    if (!readOnly) {
      setExpenses(expenses.map((expense) =>
        expense.id === item.id ? { ...expense, isPaid: !expense.isPaid } : expense,
      ));
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    if (deleteItem.assistantRecordId) {
      try {
        await deleteAssistantRecord(deleteItem.assistantRecordId);
      } catch (deleteError) {
        console.error("Failed to delete assistant office expense:", deleteError);
        window.alert(t("assistant_action_failed"));
      }
    } else if (!readOnly) {
      setExpenses(expenses.filter((expense) => expense.id !== deleteItem.id));
    }
    setDeleteItem(null);
  };

  const filtered = displayedExpenses.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalAmount = (currency) => displayedExpenses
    .filter(e => e.currency === currency)
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const assistantExpenseAmount = (currency) => assistantRecords
    .filter((record) => record.type === "officeExpense" && record.payload.currency === currency)
    .reduce((sum, record) => sum + (Number(record.payload.amount) || 0), 0);
  const remainingBudget = (currency) => (Number(budget[currency]) || 0) - assistantExpenseAmount(currency);
  const paidAmount = (currency) => displayedExpenses
    .filter(e => e.currency === currency && e.isPaid)
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const unpaidAmount = (currency) => totalAmount(currency) - paidAmount(currency);
  const highestExpense = (currency) => displayedExpenses
    .filter(e => e.currency === currency)
    .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0))[0];

  useEffect(() => {
    if (!onRegisterExport) return undefined;
    if (readOnly || !dataLoaded || loadedBranchId !== branchId) {
      onRegisterExport(null);
      return undefined;
    }

    const exportReport = async () => {
      const reportExpenses = [
        ...expenses,
        ...assistantRecords
          .filter((record) => record.type === "officeExpense")
          .map((record) => ({
            ...record.payload,
            createdByEmail: record.createdByEmail,
          })),
      ];

      await downloadReportExcel({
        fileName: `${branchName || "office"}_expenses`,
        title: `${t("report_export_office_title")} — ${branchName || ""}`,
        columns: [
          t("report_export_col_number"),
          t("report_export_col_date"),
          t("report_export_col_name"),
          t("report_export_col_category"),
          t("report_export_col_quantity"),
          t("report_export_col_unit"),
          t("report_export_col_currency"),
          t("report_export_col_unit_price"),
          t("report_export_col_group"),
          t("report_export_col_total_sum"),
          t("report_export_col_total_dollar"),
          t("report_export_col_status"),
          t("report_export_col_note"),
          t("report_export_col_author"),
        ],
        rows: reportExpenses.map((item, index) => {
          const amount = parseFloat(item.amount) || 0;
          const amountSum = item.currency === "sum" ? amount : amount * dollarRate;
          const amountDollar = item.currency === "dollar" ? amount : (dollarRate > 0 ? amount / dollarRate : 0);
          return [
          index + 1,
          item.date ? new Date(`${item.date}T00:00:00`) : "",
          item.name || "",
          t("report_export_category_office"),
          1,
          t("report_export_col_piece"),
          item.currency === "sum" ? t("som") : "$",
          amount,
          item.group || "",
          amountSum,
          amountDollar,
          item.isPaid ? t("worker_paid_status") : t("worker_unpaid_status"),
          item.note || "",
          item.createdByEmail || "",
          ];
        }),
      });
    };

    onRegisterExport(exportReport);
    return () => onRegisterExport(null);
  }, [
    onRegisterExport,
    readOnly,
    dataLoaded,
    loadedBranchId,
    branchId,
    branchName,
    expenses,
    assistantRecords,
    dollarRate,
    t,
  ]);

  const handleBudgetSave = () => {
    const sum = Number(budgetForm.sum || 0);
    const dollar = Number(budgetForm.dollar || 0);
    if (!Number.isFinite(sum) || !Number.isFinite(dollar) || sum < 0 || dollar < 0) {
      setBudgetError(t("balance_invalid_amount") || "Enter valid positive amounts.");
      return;
    }
    if (budgetMode !== "update" && sum === 0 && dollar === 0) {
      setBudgetError(t("balance_invalid_amount") || "Enter valid positive amounts.");
      return;
    }
    if (budgetMode === "subtract" && (sum > remainingBudget("sum") || dollar > remainingBudget("dollar"))) {
      setBudgetError(t("balance_insufficient") || "Insufficient balance.");
      return;
    }
    if (budgetMode === "add") {
      setBudget((prev) => ({ sum: (Number(prev.sum) || 0) + sum, dollar: (Number(prev.dollar) || 0) + dollar }));
      setInitialBudget((prev) => ({ sum: (Number(prev.sum) || 0) + sum, dollar: (Number(prev.dollar) || 0) + dollar }));
    } else if (budgetMode === "subtract") {
      setBudget((prev) => ({
        sum: (Number(prev.sum) || 0) - sum,
        dollar: (Number(prev.dollar) || 0) - dollar,
      }));
    } else {
      setBudget({ sum, dollar });
      setInitialBudget({ sum, dollar });
    }
    setBudgetForm({ sum: "", dollar: "" });
    setBudgetError("");
    setBudgetModal(false);
  };

  return (
    <div className={`ProjectReport BranchReport ${readOnly ? "assistant-read-only" : ""}`}>
      <button className="right-panel-toggle-btn" onClick={() => setIsRightPanelOpen(true)}>‹</button>
      <div className="pr-main">
        <div className="pr-header">
          <div className="pr-title-area">
            <button className="pr-back-btn" onClick={onBack}>‹</button>
            <span className="pr-icon">🏢</span>
            <h2 className="pr-title">{branchName}</h2>
          </div>
          <div className="pr-header-actions">
            <button className="pr-btn pr-btn-add" onClick={() => { setEditItem(null); setAddModal(true); }}>+ {t("xarajat_qoshish") || "Xarajat qo'shish"}</button>
            {!readOnly && <button className="pr-btn pr-btn-budget" onClick={() => { setBudgetError(""); setBudgetModal(true); }}>+ {t("pr_byudjet")}</button>}
          </div>
        </div>

        <div className="pr-toolbar">
           <input className="pr-search" type="search" placeholder={t("pr_qidiruv")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="pr-list">
          {filtered.length === 0 ? (
            <div className="pr-empty"><p>{t("pr_bosh_holat")}</p></div>
          ) : (
            filtered.map(item => {
              const canManageItem = !readOnly || (
                item.assistantRecordId && item.createdByEmail === currentEmail
              );
              return (
              <div key={item.id} className={`pr-item ${item.isPaid ? "pr-item-paid" : ""}`}>
                <div className="pr-item-left">
                  <input className="pr-checkbox" type="checkbox" checked={item.isPaid} disabled={!canManageItem} onChange={() => togglePaid(item)} />
                  <div className="pr-item-info">
                    {item.createdByEmail && <small className="assistant-author-label">{item.createdByEmail}</small>}
                    <h4 className="pr-item-name">{item.name}</h4>
                    <div className="pr-item-meta">
                      <span className="pr-badge">{item.date}</span>
                    </div>
                  </div>
                </div>
                <div className="pr-item-right">
                  <strong>{parseFloat(item.amount).toLocaleString()} {item.currency === "sum" ? "so'm" : "$"}</strong>
                  <div className="pr-item-actions">
                    {canManageItem && <>
                      <button
                        className="pr-action-btn pr-edit-btn"
                        type="button"
                        title={t("pr_tahrirlash")}
                        aria-label={t("pr_tahrirlash")}
                        onClick={() => { setEditItem(item); setForm({ ...item }); setAddModal(true); }}
                      >✏️</button>
                      <button
                        className="pr-action-btn pr-delete-btn"
                        type="button"
                        title={t("Delete")}
                        aria-label={t("Delete")}
                        onClick={() => setDeleteItem(item)}
                      >🗑️</button>
                    </>}
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>

      <div className={`rightRight ${isRightPanelOpen ? "open" : ""}`}>
        <button className="right-panel-close-btn" onClick={() => setIsRightPanelOpen(false)}>›</button>
        <div className="lrLine"></div>
        <div className="statistic">
          <h2>{t("statistika")}</h2>
          <div className="statistic1">
            <h3>{t("pr_byudjet_qoldiq")}:</h3>
            <p>{remainingBudget("sum").toLocaleString()} {t("som")} / {remainingBudget("dollar").toLocaleString()} $</p>
          </div>
          <div className="statistic2">
            <h3>{t("pr_jami_yozuvlar")}:</h3>
            <p>{displayedExpenses.length}</p>
          </div>
          <div className="statistic3">
            <h3>{t("pr_eng_katta_xarajat")}:</h3>
            <p>{highestExpense("sum") ? `${highestExpense("sum").name}: ${parseFloat(highestExpense("sum").amount).toLocaleString()} ${t("som")}` : t("yo'q")} / {highestExpense("dollar") ? `${highestExpense("dollar").name}: ${parseFloat(highestExpense("dollar").amount).toLocaleString()} $` : t("yo'q")}</p>
          </div>
          <div className="statistic4">
            <h3>{t("pr_jami_xarajat")}:</h3>
            <p>{totalAmount("sum").toLocaleString()} {t("som")} / {totalAmount("dollar").toLocaleString()} $</p>
          </div>
          <div className="statistic5">
            <h3>{t("pr_tolangan")}:</h3>
            <p>{paidAmount("sum").toLocaleString()} {t("som")} / {paidAmount("dollar").toLocaleString()} $</p>
          </div>
          <div className="statistic6">
            <h3>{t("pr_tolov_kutilmoqda")}:</h3>
            <p>{unpaidAmount("sum").toLocaleString()} {t("som")} / {unpaidAmount("dollar").toLocaleString()} $</p>
          </div>
          <div className="statistic1">
            <h3>{t("Boshlang'ich balans")}:</h3>
            <p>{initialBudget.sum.toLocaleString()} {t("som")} / {initialBudget.dollar.toLocaleString()} $</p>
          </div>
        </div>
      </div>
      
      {addModal && (
        <div className="pr-overlay" onClick={() => setAddModal(false)}>
          <div className="pr-modal" onClick={e => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h3>{editItem ? t("pr_tahrirlash") : t("pr_yangi_xarajat")}</h3>
              <button className="pr-close-btn" onClick={() => { setAddModal(false); setEditItem(null); setEditConfirmModal(false); }}>✕</button>
            </div>
            <div className="pr-modal-body">
              <div className="pr-form-group">
                <label>{t("pr_xarajat_nomi") || "Xarajat nomi"}</label>
                <input type="text" value={form.name} placeholder={t("pr_xarajat_nomi") || "Xarajat nomi"} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="pr-form-row">
                <div className="pr-form-group">
                  <label>{t("pr_summa") || "Summa"}</label>
                  <input type="number" value={form.amount} placeholder="0" onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="pr-form-group">
                  <label>{t("valyuta")}</label>
                  <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                    <option value="sum">{t("som")}</option>
                    <option value="dollar">$</option>
                  </select>
                </div>
              </div>
              <div className="pr-form-group">
                <label>{t("sana")}</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn pr-btn-cancel" onClick={() => { setAddModal(false); setEditItem(null); setEditConfirmModal(false); }}>{t("bekorqilish")}</button>
              <button className="pr-btn pr-btn-save" onClick={() => handleSave()}>{t("saqlash")}</button>
            </div>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="pr-overlay" onClick={() => setDeleteItem(null)}>
          <div className="pr-modal pr-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h3>{t("pr_ochirish_tasdiq")}</h3>
              <button className="pr-close-btn" type="button" onClick={() => setDeleteItem(null)} aria-label={t("Close")}>×</button>
            </div>
            <div className="pr-modal-body">
              <p className="pr-confirm-message">{t("pr_ochirish_savol")}</p>
              <div className="pr-confirm-item">
                <strong>{deleteItem.name}</strong>
                <span>{parseFloat(deleteItem.amount).toLocaleString()} {deleteItem.currency === "sum" ? t("som") : "$"}</span>
              </div>
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn pr-btn-cancel" type="button" onClick={() => setDeleteItem(null)}>{t("yo'q")}</button>
              <button className="pr-btn pr-btn-delete" type="button" onClick={handleDelete}>{t("ha")}</button>
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
                <span>{parseFloat(form.amount || 0).toLocaleString()} {form.currency === "sum" ? t("som") : "$"}</span>
              </div>
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn pr-btn-cancel" type="button" onClick={() => setEditConfirmModal(false)}>{t("bekorqilish")}</button>
              <button className="pr-btn pr-btn-save" type="button" onClick={() => handleSave(true)}>{t("saqlash")}</button>
            </div>
          </div>
        </div>
      )}

      {budgetModal && (
        <div className="pr-overlay" onClick={() => setBudgetModal(false)}>
           <div className="pr-modal pr-modal-sm" onClick={e => e.stopPropagation()}>
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
                  <strong>{remainingBudget("sum").toLocaleString()} so'm / {remainingBudget("dollar").toLocaleString()} $</strong>
                </div>

                <div className="pr-form-group">
                  <label>
                    {budgetMode === "add"
                      ? `${t("qoshiladigan_miqdor") || "Qo'shiladigan miqdor"} (so'm)`
                      : budgetMode === "subtract"
                        ? `${t("ayiriladigan_miqdor") || "Ayiriladigan miqdor"} (so'm)`
                        : `${t("som")}`}
                  </label>
                  <input type="number" min="0" value={budgetForm.sum} placeholder="0" onChange={e => { setBudgetForm({ ...budgetForm, sum: e.target.value }); setBudgetError(""); }} />
                </div>
                <div className="pr-form-group">
                  <label>
                    {budgetMode === "add"
                      ? `${t("qoshiladigan_miqdor") || "Qo'shiladigan miqdor"} ($)`
                      : budgetMode === "subtract"
                        ? `${t("ayiriladigan_miqdor") || "Ayiriladigan miqdor"} ($)`
                        : `$`}
                  </label>
                  <input type="number" min="0" value={budgetForm.dollar} placeholder="0" onChange={e => { setBudgetForm({ ...budgetForm, dollar: e.target.value }); setBudgetError(""); }} />
                </div>

                {(parseFloat(budgetForm.sum) > 0 || parseFloat(budgetForm.dollar) > 0) && (
                  <div className="pr-budget-preview">
                    <span>{t("yangi_boshlangich_balans") || "Yangi boshlang'ich byudjet"}:</span>
                    <strong>
                      {budgetMode === "add"
                        ? `${((Number(initialBudget.sum) || 0) + (parseFloat(budgetForm.sum) || 0)).toLocaleString()} so'm / ${((Number(initialBudget.dollar) || 0) + (parseFloat(budgetForm.dollar) || 0)).toLocaleString()} $`
                        : budgetMode === "subtract"
                          ? `${(remainingBudget("sum") - (parseFloat(budgetForm.sum) || 0)).toLocaleString()} so'm / ${(remainingBudget("dollar") - (parseFloat(budgetForm.dollar) || 0)).toLocaleString()} $`
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
    </div>
  );
}

export default BranchReport;
