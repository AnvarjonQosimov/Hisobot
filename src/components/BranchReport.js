import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "../styles/ProjectReport.css"; // Reuse ProjectReport styles for consistency

function BranchReport({ branchId, branchName, onBack }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState({ sum: 0, dollar: 0 });
  const [initialBudget, setInitialBudget] = useState({ sum: 0, dollar: 0 });
  const [addModal, setAddModal] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    amount: "",
    currency: "sum",
    date: new Date().toISOString().split("T")[0],
    isPaid: false,
    note: "",
  });

  const [budgetForm, setBudgetForm] = useState({ sum: "", dollar: "" });

  const expKey = `branch_${branchId}_expenses_${username}`;
  const budgetKey = `branch_${branchId}_budget_${username}`;
  const initBudgetKey = `branch_${branchId}_initBudget_${username}`;

  useEffect(() => {
    if (!username) return;
    const storedExp = localStorage.getItem(expKey);
    if (storedExp) setExpenses(JSON.parse(storedExp));
    const storedBudget = localStorage.getItem(budgetKey);
    if (storedBudget) setBudget(JSON.parse(storedBudget));
    const storedInit = localStorage.getItem(initBudgetKey);
    if (storedInit) setInitialBudget(JSON.parse(storedInit));
  }, [branchId, username]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(expKey, JSON.stringify(expenses));
    localStorage.setItem(budgetKey, JSON.stringify(budget));
    localStorage.setItem(initBudgetKey, JSON.stringify(initialBudget));
  }, [expenses, budget, initialBudget, username]);

  const handleSave = () => {
    if (!form.name || !form.amount) return;
    const amount = parseFloat(form.amount);
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
  };

  const filtered = expenses.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalAmount = (currency) => expenses
    .filter(e => e.currency === currency)
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const paidAmount = (currency) => expenses
    .filter(e => e.currency === currency && e.isPaid)
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const unpaidAmount = (currency) => totalAmount(currency) - paidAmount(currency);
  const highestExpense = (currency) => expenses
    .filter(e => e.currency === currency)
    .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0))[0];

  return (
    <div className="ProjectReport BranchReport">
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
            <button className="pr-btn pr-btn-budget" onClick={() => setBudgetModal(true)}>+ {t("pr_byudjet")}</button>
          </div>
        </div>

        <div className="pr-toolbar">
           <input className="pr-search" type="search" placeholder={t("pr_qidiruv")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="pr-list">
          {filtered.length === 0 ? (
            <div className="pr-empty"><p>{t("pr_bosh_holat")}</p></div>
          ) : (
            filtered.map(item => (
              <div key={item.id} className={`pr-item ${item.isPaid ? "pr-item-paid" : ""}`}>
                <div className="pr-item-left">
                  <input type="checkbox" checked={item.isPaid} onChange={() => setExpenses(expenses.map(e => e.id === item.id ? { ...e, isPaid: !e.isPaid } : e))} />
                  <div className="pr-item-info">
                    <h4 className="pr-item-name">{item.name}</h4>
                    <div className="pr-item-meta">
                      <span className="pr-badge">{item.date}</span>
                    </div>
                  </div>
                </div>
                <div className="pr-item-right">
                  <strong>{parseFloat(item.amount).toLocaleString()} {item.currency === "sum" ? "so'm" : "$"}</strong>
                  <div className="pr-item-actions">
                    <button onClick={() => { setEditItem(item); setForm({ ...item }); setAddModal(true); }}>✏️</button>
                    <button onClick={() => setDeleteItem(item)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))
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
            <p>{(budget.sum - totalAmount("sum")).toLocaleString()} {t("som")} / {(budget.dollar - totalAmount("dollar")).toLocaleString()} $</p>
          </div>
          <div className="statistic2">
            <h3>{t("pr_jami_yozuvlar")}:</h3>
            <p>{expenses.length}</p>
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
              <button className="pr-close-btn" onClick={() => setAddModal(false)}>✕</button>
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
              <button className="pr-btn pr-btn-cancel" onClick={() => setAddModal(false)}>{t("bekorqilish")}</button>
              <button className="pr-btn pr-btn-save" onClick={handleSave}>{t("saqlash")}</button>
            </div>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="pr-overlay" onClick={() => setDeleteItem(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
             <p>{t("pr_ochirish_savol")}</p>
             <button onClick={() => { setExpenses(expenses.filter(e => e.id !== deleteItem.id)); setDeleteItem(null); }}>{t("ha")}</button>
             <button onClick={() => setDeleteItem(null)}>{t("yo'q")}</button>
          </div>
        </div>
      )}

      {budgetModal && (
        <div className="pr-overlay" onClick={() => setBudgetModal(false)}>
           <div className="pr-modal" onClick={e => e.stopPropagation()}>
              <div className="pr-modal-header">
                <h3>{t("pr_byudjet")}</h3>
                <button className="pr-close-btn" onClick={() => setBudgetModal(false)}>✕</button>
              </div>
              <div className="pr-modal-body">
                <div className="pr-form-group">
                  <label>{t("som")}</label>
                  <input type="number" value={budgetForm.sum} placeholder="0" onChange={e => setBudgetForm({ ...budgetForm, sum: e.target.value })} />
                </div>
                <div className="pr-form-group">
                  <label>$</label>
                  <input type="number" value={budgetForm.dollar} placeholder="0" onChange={e => setBudgetForm({ ...budgetForm, dollar: e.target.value })} />
                </div>
              </div>
              <div className="pr-modal-footer">
                <button className="pr-btn pr-btn-cancel" onClick={() => setBudgetModal(false)}>{t("bekorqilish")}</button>
                <button className="pr-btn pr-btn-save" onClick={() => { setBudget({ sum: parseFloat(budgetForm.sum || 0), dollar: parseFloat(budgetForm.dollar || 0) }); setBudgetModal(false); }}>{t("yangilash")}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default BranchReport;
