import React, { Fragment, useCallback, useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../Firebase/Firebase";
import {
  addManagedAccount,
  getAdminDashboard,
  removeManagedAccount,
} from "../auth/accountAccess";
import "../styles/AdminPanel.css";

const getAdminErrorMessage = (error, action) => {
  if (error?.code === "permission-denied" || error?.code === "firestore/permission-denied") {
    return "Firestore запрещает чтение или изменение данных. Проверьте правила доступа для аккаунта администратора.";
  }
  return error?.message || action;
};

function AdminPanel() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expandedBossEmail, setExpandedBossEmail] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDashboard(await getAdminDashboard());
    } catch (loadError) {
      console.error("Failed to load admin dashboard:", loadError);
      setError(getAdminErrorMessage(loadError, "Не удалось загрузить статистику."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleAddAccount = async (event) => {
    event.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await addManagedAccount(email);
      setEmail("");
      await loadDashboard();
    } catch (saveError) {
      console.error("Failed to add boss account:", saveError);
      setError(getAdminErrorMessage(saveError, "Не удалось добавить аккаунт."));
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveAccount = async (accountEmail) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await removeManagedAccount(accountEmail);
      await loadDashboard();
    } catch (removeError) {
      console.error("Failed to remove boss account:", removeError);
      setError(getAdminErrorMessage(removeError, "Не удалось удалить аккаунт."));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (logoutError) {
      console.error("Failed to sign out admin:", logoutError);
      setError(logoutError.message || "Не удалось выйти из аккаунта.");
      return;
    }
    ["userEmail", "username", "role"].forEach((key) => localStorage.removeItem(key));
    navigate("/login", { replace: true });
    setShowLogoutConfirm(false);
  };

  const stats = dashboard?.stats;
  const monthlyLabels = Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (11 - index));
    return date;
  });
  const registeredHistory = dashboard?.registeredBossHistory || [];
  const monthlyRegistrations = monthlyLabels.map((month) =>
    registeredHistory.filter((boss) => {
      if (!boss.registeredAt) return false;
      const registeredAt = new Date(boss.registeredAt);
      return registeredAt.getFullYear() === month.getFullYear() &&
        registeredAt.getMonth() === month.getMonth();
    }).length,
  );
  const firstMonth = monthlyLabels[0];
  let cumulativeRegisteredBosses = registeredHistory.filter((boss) => {
    if (!boss.registeredAt) return false;
    const registeredAt = new Date(boss.registeredAt);
    return registeredAt < firstMonth;
  }).length;
  const monthlyRegisteredBosses = monthlyRegistrations.map((count) => {
    cumulativeRegisteredBosses += count;
    return cumulativeRegisteredBosses;
  });
  const chartHeight = 250;
  const chartPadding = { top: 20, right: 28, bottom: 65, left: 44 };
  const chartWidth = Math.max(760, monthlyLabels.length * 76);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const maxRegisteredBosses = Math.max(1, ...monthlyRegisteredBosses);
  const chartTicks = [...new Set([
    0,
    Math.round(maxRegisteredBosses * 0.25),
    Math.round(maxRegisteredBosses * 0.5),
    Math.round(maxRegisteredBosses * 0.75),
    maxRegisteredBosses,
  ])];
  const chartPoints = monthlyLabels.map((month, index) => ({
    month,
    count: monthlyRegisteredBosses[index],
    x: chartPadding.left + (index / (monthlyLabels.length - 1)) * plotWidth,
    y: chartPadding.top + plotHeight -
      (monthlyRegisteredBosses[index] / maxRegisteredBosses) * plotHeight,
  }));
  const chartLine = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">OFFICEREPORT / CONTROL CENTER</p>
          <h1>Панель администратора</h1>
          <p className="admin-subtitle">Управление аккаунтами и общая статистика</p>
        </div>
        <div className="admin-header-actions">
          <span className="admin-current-user">{auth.currentUser?.email}</span>
          <button className="admin-secondary-button" type="button" onClick={() => setShowLogoutConfirm(true)}>
            Выйти
          </button>
        </div>
      </header>

      {error && <div className="admin-error" role="alert">{error}</div>}

      <section className="admin-stats-grid" aria-label="Общая статистика">
        <article className="admin-stat-card">
          <span>Зарегистрировано пользователей</span>
          <strong>{loading ? "—" : stats?.registeredUsers ?? 0}</strong>
          <small>Пользователи, впервые вошедшие через Google</small>
        </article>
        <article className="admin-stat-card">
          <span>Аккаунты боссов</span>
          <strong>{loading ? "—" : stats?.bossAccounts ?? 0}</strong>
          <small>Разрешённые аккаунты для страницы отчётов</small>
        </article>
        <article className="admin-stat-card">
          <span>Зарегистрированные боссы</span>
          <strong>{loading ? "—" : stats?.registeredBosses ?? 0}</strong>
          <small>Боссы, которые уже входили в систему</small>
        </article>
        <article className="admin-stat-card">
          <span>Рабочие, подключённые по email</span>
          <strong>{loading ? "—" : stats?.registeredWorkers ?? 0}</strong>
          <small>Уникальные адреса работников в системе</small>
        </article>
      </section>

      <section className="admin-panel-card admin-chart-card">
        <div className="admin-card-heading">
          <div>
            <h2>Регистрация боссов</h2>
            <p>Накопительное количество аккаунтов боссов, впервые вошедших за последние 12 месяцев.</p>
          </div>
        </div>
        {loading ? (
          <p className="admin-chart-empty">Загрузка данных...</p>
        ) : stats?.registeredBosses === 0 ? (
          <p className="admin-chart-empty">Пока нет зарегистрированных аккаунтов боссов.</p>
        ) : (
          <div className="admin-chart-scroll">
            <svg
              className="admin-line-chart"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="Накопительное количество зарегистрированных боссов за последние 12 месяцев"
            >
              {chartTicks.map((tickValue) => {
                const y = chartPadding.top + plotHeight * (1 - tickValue / maxRegisteredBosses);
                return (
                  <g key={tickValue}>
                    <line
                      x1={chartPadding.left}
                      x2={chartWidth - chartPadding.right}
                      y1={y}
                      y2={y}
                      className="admin-chart-gridline"
                    />
                    <text x={chartPadding.left - 10} y={y + 4} textAnchor="end" className="admin-chart-tick">
                      {tickValue}
                    </text>
                  </g>
                );
              })}
              <path d={chartLine} className="admin-chart-line" />
              {chartPoints.map((point) => (
                <g key={`${point.month.getFullYear()}-${point.month.getMonth()}`}>
                  <circle cx={point.x} cy={point.y} r="5" className="admin-chart-point" />
                  <text x={point.x} y={point.y - 12} textAnchor="middle" className="admin-chart-value">
                    {point.count}
                  </text>
                  <text
                    x={point.x}
                    y={chartHeight - 28}
                    textAnchor="middle"
                    className="admin-chart-label"
                  >
                    {point.month.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </section>

      <section className="admin-content-grid">
        <article className="admin-panel-card admin-accounts-card">
          <div className="admin-card-heading">
            <div>
              <h2>Аккаунты боссов</h2>
              <p>Добавьте Google-почту, чтобы разрешить вход в отчёты.</p>
            </div>
            <button
              type="button"
              className="admin-refresh-button"
              onClick={loadDashboard}
              disabled={loading}
            >
              Обновить
            </button>
          </div>
          <form className="admin-add-account-form" onSubmit={handleAddAccount}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@gmail.com"
              aria-label="Google email нового босса"
              required
            />
            <button type="submit" disabled={busy}>
              {busy ? "Сохранение..." : "Добавить аккаунт"}
            </button>
          </form>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Почта босса</th>
                  <th>Статус</th>
                  <th>Рабочие</th>
                  <th>Последний вход</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {dashboard?.bosses.map((boss) => (
                  <Fragment key={boss.email}>
                    <tr
                      className="admin-boss-row"
                      onClick={() => setExpandedBossEmail((current) => current === boss.email ? "" : boss.email)}
                    >
                      <td>
                        <button
                          type="button"
                          className="admin-boss-toggle"
                          aria-expanded={expandedBossEmail === boss.email}
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedBossEmail((current) => current === boss.email ? "" : boss.email);
                          }}
                        >
                          <span className="admin-boss-chevron">{expandedBossEmail === boss.email ? "▾" : "▸"}</span>
                          <span>
                            <strong>{boss.displayName || boss.email}</strong>
                            {boss.displayName && <small>{boss.email}</small>}
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className={`admin-status ${boss.registered ? "is-registered" : ""}`}>
                          {boss.registered ? "Зарегистрирован" : "Ожидает входа"}
                        </span>
                      </td>
                      <td>{boss.workerCount}</td>
                      <td>
                        {boss.lastLogin
                          ? new Date(boss.lastLogin).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        {!boss.administrator && (
                          <button
                            type="button"
                            className="admin-remove-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemoveAccount(boss.email);
                            }}
                            disabled={busy}
                          >
                            Удалить
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedBossEmail === boss.email && (
                      <tr className="admin-boss-details-row">
                        <td colSpan="5">
                          <div className="admin-boss-details">
                            <div>
                              <span>Email для работников</span>
                              <strong>{boss.hasWorkerEmail ? boss.workerEmail : "Не указан"}</strong>
                            </div>
                            <div>
                              <span>Рабочие, зарегистрированные через этот аккаунт</span>
                              <strong>{boss.hasWorkerEmail ? boss.workerCount : 0}</strong>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {!loading && dashboard?.bosses.length === 0 && (
                  <tr><td colSpan="5" className="admin-empty-state">Аккаунтов пока нет.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
      {showLogoutConfirm && (
        <div
          className="admin-confirm-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLogoutConfirm(false);
          }}
        >
          <section className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-logout-title">
            <h2 id="admin-logout-title">Выйти из панели?</h2>
            <p>Вы уверены, что хотите выйти из аккаунта администратора?</p>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-secondary-button" onClick={() => setShowLogoutConfirm(false)}>
                Отмена
              </button>
              <button type="button" className="admin-confirm-logout" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default AdminPanel;
