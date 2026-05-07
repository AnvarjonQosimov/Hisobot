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

  return (
    <div className="ProjectReport BranchReport">
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

      {/* Simplified stats and modals would go here - for now let's keep it minimal to fix the request */}
      
      {addModal && (
        <div className="pr-overlay" onClick={() => setAddModal(false)}>
          <div className="pr-modal" onClick={e => e.stopPropagation()}>
            <h3>{editItem ? t("pr_tahrirlash") : t("pr_yangi_xarajat")}</h3>
            <input type="text" value={form.name} placeholder="Nom" onChange={e => setForm({ ...form, name: e.target.value })} />
            <input type="number" value={form.amount} placeholder="Summa" onChange={e => setForm({ ...form, amount: e.target.value })} />
            <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
              <option value="sum">so'm</option>
              <option value="dollar">$</option>
            </select>
            <button onClick={handleSave}>{t("saqlash")}</button>
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
              <h3>{t("pr_byudjet")}</h3>
              <input type="number" value={budgetForm.sum} placeholder="so'm" onChange={e => setBudgetForm({ ...budgetForm, sum: e.target.value })} />
              <input type="number" value={budgetForm.dollar} placeholder="$" onChange={e => setBudgetForm({ ...budgetForm, dollar: e.target.value })} />
              <button onClick={() => { setBudget({ sum: parseFloat(budgetForm.sum || 0), dollar: parseFloat(budgetForm.dollar || 0) }); setBudgetModal(false); }}>{t("yangilash")}</button>
           </div>
        </div>
      )}
    </div>
  );
}

export default BranchReport;
