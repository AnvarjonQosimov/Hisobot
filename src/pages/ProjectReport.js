import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "../styles/ProjectReport.css";

const CATEGORIES = ["hammasi", "material", "ishchi", "texnika", "boshqa"];

function ProjectReport({ projectId, projectName }) {
  const { t } = useTranslation();

  const [username, setUsername] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState({ sum: 0, dollar: 0 });
  const [initialBudget, setInitialBudget] = useState({ sum: 0, dollar: 0 });

  // UI state
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("hammasi");
  const [searchTerm, setSearchTerm] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editItem, setEditItem] = useState(null);

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

  // LocalStorage keys
  const expKey = (u) => `project_${projectId}_expenses_${u}`;
  const budgetKey = (u) => `project_${projectId}_budget_${u}`;
  const initBudgetKey = (u) => `project_${projectId}_initBudget_${u}`;

  useEffect(() => {
    const u = localStorage.getItem("username") || "";
    setUsername(u);
    if (!u) return;
    const storedExp = localStorage.getItem(expKey(u));
    if (storedExp) setExpenses(JSON.parse(storedExp));
    const storedBudget = localStorage.getItem(budgetKey(u));
    if (storedBudget) setBudget(JSON.parse(storedBudget));
    const storedInit = localStorage.getItem(initBudgetKey(u));
    if (storedInit) setInitialBudget(JSON.parse(storedInit));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(expKey(username), JSON.stringify(expenses));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, username, projectId]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(budgetKey(username), JSON.stringify(budget));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget, username, projectId]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(initBudgetKey(username), JSON.stringify(initialBudget));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBudget, username, projectId]);

  // Computed stats
  const totalAmount = (currency) =>
    expenses.filter((e) => e.currency === currency)
      .reduce((acc, e) => acc + parseFloat(e.amountPerUnit || 0) * parseFloat(e.quantity || 1), 0);

  const paidAmount = (currency) =>
    expenses.filter((e) => e.currency === currency && e.isPaid)
      .reduce((acc, e) => acc + parseFloat(e.amountPerUnit || 0) * parseFloat(e.quantity || 1), 0);

  const remaining = (currency) => budget[currency] - totalAmount(currency);

  const catStats = ["material", "ishchi", "texnika", "boshqa"].map((cat) => {
    const items = expenses.filter((e) => e.category === cat);
    return {
      cat,
      count: items.length,
      sumTotal: items.filter((e) => e.currency === "sum")
        .reduce((a, e) => a + parseFloat(e.amountPerUnit || 0) * parseFloat(e.quantity || 1), 0),
      dolTotal: items.filter((e) => e.currency === "dollar")
        .reduce((a, e) => a + parseFloat(e.amountPerUnit || 0) * parseFloat(e.quantity || 1), 0),
    };
  });

  const filtered = expenses.filter((e) => {
    const matchCat = activeCategory === "hammasi" ? true : e.category === activeCategory;
    return matchCat && e.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const catLabel = (cat) => ({
    hammasi: t("pr_hammasi"), material: t("pr_material"),
    ishchi: t("pr_ishchi"), texnika: t("pr_texnika"), boshqa: t("pr_boshqa"),
  }[cat] || cat);

  const catIcon = (cat) => ({ material: "🧱", ishchi: "👷", texnika: "🚜", boshqa: "📋" }[cat] || "📦");

  const unitOptions = ["dona", "kg", "t", "m", "m²", "m³", "l", "kun", "soat"];

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", category: "material", quantity: "", unit: "dona", amountPerUnit: "", currency: "sum",
      date: new Date().toISOString().split("T")[0], isPaid: false, note: "" });
    setAddModal(true);
  };

  const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setAddModal(true); };
  const closeAdd = () => { setAddModal(false); setEditItem(null); };

  const handleSave = () => {
    if (!form.name || !form.amountPerUnit) return;
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

  const handleDelete = () => {
    const item = expenses.find((e) => e.id === deleteId);
    if (item) {
      const total = parseFloat(item.amountPerUnit) * parseFloat(item.quantity || 1);
      setBudget((prev) => ({ ...prev, [item.currency]: prev[item.currency] + total }));
    }
    setExpenses(expenses.filter((e) => e.id !== deleteId));
    setDeleteId(null);
  };

  const handleTogglePaid = (id) =>
    setExpenses(expenses.map((e) => (e.id === id ? { ...e, isPaid: !e.isPaid } : e)));

  const handleBudgetSave = () => {
    const s = parseFloat(budgetForm.sum || 0);
    const d = parseFloat(budgetForm.dollar || 0);
    setBudget((prev) => ({ sum: prev.sum + s, dollar: prev.dollar + d }));
    setInitialBudget((prev) => ({ sum: prev.sum + s, dollar: prev.dollar + d }));
    setBudgetForm({ sum: "", dollar: "" });
    setBudgetModal(false);
  };

  const isFormValid = form.name.trim() && form.amountPerUnit;

  // Paid percent for the donut
  const paidPercent = expenses.length === 0 ? 0
    : Math.round((expenses.filter((e) => e.isPaid).length / expenses.length) * 100);
  const dashArray = `${paidPercent * 2.51} 251.2`;

  return (
    <div className="ProjectReport">
      {/* Mobile right panel toggle button */}
      <button className="right-panel-toggle-btn" onClick={() => setIsRightPanelOpen(true)}>‹</button>

      {/* === MAIN AREA (left/center) === */}
      <div className="pr-main">
        {/* Header */}
        <div className="pr-header">
          <div className="pr-title-area">
            <span className="pr-icon">🏗️</span>
            <h2 className="pr-title">{projectName}</h2>
          </div>
          <div className="pr-header-actions">
            <button className="pr-btn pr-btn-budget" onClick={() => setBudgetModal(true)}>
              + {t("pr_byudjet")}
            </button>
            <button className="pr-btn pr-btn-add" onClick={openAdd}>
              + {t("pr_xarajat_qoshish")}
            </button>
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
              const itemTotal = parseFloat(item.amountPerUnit || 0) * parseFloat(item.quantity || 1);
              return (
                <div key={item.id} className={`pr-item ${item.isPaid ? "pr-item-paid" : ""}`}>
                  <div className="pr-item-left">
                    <input type="checkbox" className="pr-checkbox" checked={item.isPaid}
                      onChange={() => handleTogglePaid(item.id)} />
                    <span className="pr-item-cat-icon">{catIcon(item.category)}</span>
                    <div className="pr-item-info">
                      <h4 className="pr-item-name">{item.name}</h4>
                      <div className="pr-item-meta">
                        <span className="pr-badge pr-badge-cat">{catLabel(item.category)}</span>
                        <span className="pr-badge">{item.date}</span>
                        {item.quantity && <span className="pr-badge">{item.quantity} {item.unit}</span>}
                        {item.isPaid && <span className="pr-badge pr-badge-paid">✓ {t("pr_tolangan")}</span>}
                      </div>
                      {item.note && <p className="pr-item-note">{item.note}</p>}
                    </div>
                  </div>
                  <div className="pr-item-right">
                    <div className="pr-item-amount">
                      <strong>{itemTotal.toLocaleString()} {item.currency === "sum" ? "so'm" : "$"}</strong>
                      {parseFloat(item.quantity) > 1 && (
                        <span className="pr-item-per-unit">
                          ({parseFloat(item.amountPerUnit).toLocaleString()}/{item.unit})
                        </span>
                      )}
                    </div>
                    <div className="pr-item-actions">
                      <button className="pr-action-btn pr-edit-btn" onClick={() => openEdit(item)}>✏️</button>
                      <button className="pr-action-btn pr-delete-btn" onClick={() => setDeleteId(item.id)}>🗑️</button>
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
        <div className="statistic">
          <h2>{t("statistika")}</h2>

          {/* Budget */}
          <div className="statistic1">
            <h3>{t("pr_byudjet_qoldiq")}:</h3>
            <p className={remaining("sum") < 0 || remaining("dollar") < 0 ? "negative-balance" : ""}>
              {remaining("sum").toLocaleString()} so'm / {remaining("dollar").toLocaleString()} $
            </p>
          </div>

          {/* Initial budget */}
          <div className="statistic2">
            <h3>{t("Boshlang'ich balans")}:</h3>
            <p>{initialBudget.sum.toLocaleString()} so'm / {initialBudget.dollar.toLocaleString()} $</p>
          </div>

          {/* Total expenses */}
          <div className="statistic3">
            <h3>{t("pr_jami_xarajat")}:</h3>
            <p>{totalAmount("sum").toLocaleString()} so'm / {totalAmount("dollar").toLocaleString()} $</p>
          </div>

          {/* Paid */}
          <div className="statistic4">
            <h3>{t("pr_tolangan")}:</h3>
            <p>{paidAmount("sum").toLocaleString()} so'm / {paidAmount("dollar").toLocaleString()} $</p>
          </div>

          {/* Category breakdown */}
          <div className="linear-stats" style={{ width: "100%", padding: "0 15px" }}>
            <h2 style={{ textAlign: "center", marginTop: "20px" }}>{t("pr_kategoriya")}</h2>
            {catStats.map(({ cat, count, sumTotal, dolTotal }) => (
              <div key={cat} className="statistic1" style={{ marginBottom: "8px" }}>
                <h3>{catIcon(cat)} {catLabel(cat)} <span style={{ color: "rgba(180,170,255,0.5)", fontSize: "12px" }}>({count})</span></h3>
                {sumTotal > 0 && <p>{sumTotal.toLocaleString()} so'm</p>}
                {dolTotal > 0 && <p>{dolTotal.toLocaleString()} $</p>}
                {sumTotal === 0 && dolTotal === 0 && <p style={{ color: "rgba(200,190,255,0.3)", fontSize: "12px" }}>—</p>}
              </div>
            ))}
          </div>

          {/* Donut chart */}
          <div className="circular-stats" style={{ marginTop: "20px" }}>
            <h2>{t("aylanastatistika")}</h2>
            <div className="pie-container">
              <svg className="pie-chart" viewBox="0 0 100 100">
                <circle className="pie-bg" cx="50" cy="50" r="40"
                  fill="transparent" stroke="rgba(161,161,241,0.1)" strokeWidth="10" />
                <circle className="pie-segment" cx="50" cy="50" r="40"
                  fill="transparent" stroke="#5656ff" strokeWidth="10"
                  strokeDasharray={dashArray} strokeDashoffset="0"
                  strokeLinecap="round" transform="rotate(-90 50 50)" />
                <text x="50" y="55" className="pie-text">{paidPercent}%</text>
              </svg>
              <div className="pie-legend">
                <div className="legend-item">
                  <span className="dot paid"></span>
                  <span>{t("pr_tolangan")}: {expenses.filter((e) => e.isPaid).length}</span>
                </div>
                <div className="legend-item">
                  <span className="dot unpaid"></span>
                  <span>{t("qolgan")}: {expenses.filter((e) => !e.isPaid).length}</span>
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
              <div className="pr-form-row">
                <div className="pr-form-group">
                  <label>{t("pr_miqdor")}</label>
                  <input type="number" value={form.quantity} placeholder="1"
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="pr-form-group">
                  <label>{t("pr_olchov")}</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
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
                    <option value="sum">So'm</option>
                    <option value="dollar">Dollar ($)</option>
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
              <button className="pr-btn pr-btn-save" disabled={!isFormValid} onClick={handleSave}>
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
              <h3>{t("pr_byudjet_qoshish")}</h3>
              <button className="pr-close-btn" onClick={() => setBudgetModal(false)}>✕</button>
            </div>
            <div className="pr-modal-body">
              <div className="pr-budget-current">
                <p>{t("pr_joriy_byudjet")}:</p>
                <strong>{initialBudget.sum.toLocaleString()} so'm / {initialBudget.dollar.toLocaleString()} $</strong>
              </div>
              <div className="pr-form-group">
                <label>{t("pr_qoshish_som")} (so'm)</label>
                <input type="number" value={budgetForm.sum} placeholder="0"
                  onChange={(e) => setBudgetForm({ ...budgetForm, sum: e.target.value })} />
              </div>
              <div className="pr-form-group">
                <label>{t("pr_qoshish_dollar")} ($)</label>
                <input type="number" value={budgetForm.dollar} placeholder="0"
                  onChange={(e) => setBudgetForm({ ...budgetForm, dollar: e.target.value })} />
              </div>
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn pr-btn-cancel" onClick={() => setBudgetModal(false)}>{t("bekorqilish")}</button>
              <button className="pr-btn pr-btn-save" onClick={handleBudgetSave}>{t("yangilash")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="pr-overlay" onClick={() => setDeleteId(null)}>
          <div className="pr-modal pr-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h3>{t("pr_ochirish_tasdiq")}</h3>
            </div>
            <div className="pr-modal-body">
              <p style={{ color: "rgba(200,190,255,0.75)", textAlign: "center" }}>{t("pr_ochirish_savol")}</p>
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn pr-btn-cancel" onClick={() => setDeleteId(null)}>{t("yo'q")}</button>
              <button className="pr-btn pr-btn-delete" onClick={handleDelete}>{t("ha")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectReport;