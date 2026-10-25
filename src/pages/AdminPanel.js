import React, { useCallback, useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../Firebase/Firebase";
import {
  addManagedAccount,
  getAdminDashboard,
  removeManagedAccount,
  updateManagedAccount,
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
  const [selectedBoss, setSelectedBoss] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [accountDialog, setAccountDialog] = useState(null);
  const [editEmail, setEditEmail] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [chartPeriod, setChartPeriod] = useState("month");

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

  const handleConfirmDelete = async () => {
    if (!accountDialog || accountDialog.type !== "delete" || busy) return;
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await removeManagedAccount(accountDialog.email);
      setAccountDialog(null);
      await loadDashboard();
    } catch (removeError) {
      console.error("Failed to remove boss account:", removeError);
      setError(getAdminErrorMessage(removeError, "Не удалось удалить аккаунт."));
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveAccount = (accountEmail) => {
    setAccountDialog({ type: "delete", email: accountEmail });
  };

  const handleEditAccount = (accountEmail) => {
    setEditEmail(accountEmail);
    setAccountDialog({ type: "edit", email: accountEmail });
  };

  const handleConfirmEdit = async (event) => {
    event.preventDefault();
    if (!accountDialog || accountDialog.type !== "edit" || busy) return;
    setBusy(true);
    setError("");
    try {
      await updateManagedAccount(accountDialog.email, editEmail);
      setAccountDialog(null);
      await loadDashboard();
    } catch (editError) {
      console.error("Failed to update boss account:", editError);
      setError(getAdminErrorMessage(editError, "Не удалось изменить email аккаунта."));
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
  const registeredHistory = dashboard?.registeredBossHistory || [];
  const registrationDates = registeredHistory
    .map((boss) => new Date(boss.registeredAt))
    .filter((date) => Number.isFinite(date.getTime()));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstYear = registrationDates.length
    ? Math.min(...registrationDates.map((date) => date.getFullYear()))
    : today.getFullYear();
  const chartFirstYear = Math.min(firstYear, today.getFullYear());
  const chartDates = chartPeriod === "day"
    ? Array.from({ length: 30 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 29 + index);
      return date;
    })
    : chartPeriod === "year"
      ? Array.from(
        { length: today.getFullYear() - chartFirstYear + 1 },
        (_, index) => new Date(chartFirstYear + index, 0, 1),
      )
      : Array.from({ length: 12 }, (_, index) => {
        const date = new Date(today.getFullYear(), today.getMonth(), 1);
        date.setMonth(date.getMonth() - 11 + index);
        return date;
      });
  const getDatePeriodIndex = (date) => {
    const firstDate = chartDates[0];
    if (chartPeriod === "day") {
      const dateNumber = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      const firstDateNumber = Date.UTC(
        firstDate.getFullYear(),
        firstDate.getMonth(),
        firstDate.getDate(),
      );
      return Math.floor((dateNumber - firstDateNumber) / 86400000);
    }
    if (chartPeriod === "year") {
      return date.getFullYear() - firstDate.getFullYear();
    }
    return (date.getFullYear() - firstDate.getFullYear()) * 12
      + date.getMonth() - firstDate.getMonth();
  };
  const periodRegistrations = Array(chartDates.length).fill(0);
  let cumulativeRegisteredBosses = 0;
  registrationDates.forEach((date) => {
    const periodIndex = getDatePeriodIndex(date);
    if (periodIndex < 0) {
      cumulativeRegisteredBosses += 1;
    } else if (periodIndex < periodRegistrations.length) {
      periodRegistrations[periodIndex] += 1;
    }
  });
  const periodRegisteredBosses = periodRegistrations.map((count) => {
    cumulativeRegisteredBosses += count;
    return cumulativeRegisteredBosses;
  });
  const sortedBosses = [...(dashboard?.bosses || [])].sort((first, second) => {
    const firstTime = Date.parse(first.accountCreatedAt || "");
    const secondTime = Date.parse(second.accountCreatedAt || "");
    const firstHasDate = Number.isFinite(firstTime);
    const secondHasDate = Number.isFinite(secondTime);
    if (firstHasDate !== secondHasDate) return firstHasDate ? -1 : 1;
    if (firstHasDate && secondHasDate && firstTime !== secondTime) {
      return sortOrder === "newest"
        ? secondTime - firstTime
        : firstTime - secondTime;
    }
    return first.email.localeCompare(second.email);
  });
  const chartHeight = 250;
  const chartPadding = { top: 20, right: 28, bottom: 65, left: 44 };
  const chartWidth = Math.max(760, chartDates.length * 76);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const maxRegisteredBosses = Math.max(1, ...periodRegisteredBosses);
  const chartTicks = [...new Set([
    0,
    Math.round(maxRegisteredBosses * 0.25),
    Math.round(maxRegisteredBosses * 0.5),
    Math.round(maxRegisteredBosses * 0.75),
    maxRegisteredBosses,
  ])];
  const chartPoints = chartDates.map((date, index) => ({
    date,
    count: periodRegisteredBosses[index],
    x: chartPadding.left + (index / Math.max(1, chartDates.length - 1)) * plotWidth,
    y: chartPadding.top + plotHeight -
      (periodRegisteredBosses[index] / maxRegisteredBosses) * plotHeight,
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
        <div className="admin-chart-toolbar">
          <label htmlFor="admin-chart-period">Период</label>
          <select
            id="admin-chart-period"
            className="admin-chart-period-select"
            value={chartPeriod}
            onChange={(event) => setChartPeriod(event.target.value)}
          >
            <option value="day">По дням</option>
            <option value="month">По месяцам</option>
            <option value="year">По годам</option>
          </select>
        </div>
        <div className="admin-card-heading">
          <div>
            <h2>Регистрация боссов</h2>
            <p>Накопительное количество аккаунтов боссов, впервые вошедших за последние 12 месяцев.</p>
          </div>
        </div>
        <p className="admin-chart-period-caption">
          {chartPeriod === "day"
            ? "Накопительное число боссов за последние 30 дней."
            : chartPeriod === "year"
              ? "Накопительное число боссов по годам."
              : "Накопительное число боссов за последние 12 месяцев."}
        </p>
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
                <g key={point.date.toISOString()}>
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
                    {chartPeriod === "day"
                      ? point.date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })
                      : chartPeriod === "year"
                        ? point.date.toLocaleDateString("ru-RU", { year: "numeric" })
                        : point.date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })}
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
            <label className="admin-sort-control" htmlFor="admin-account-sort">
              <span>Сортировка</span>
              <select
                id="admin-account-sort"
                className="admin-sort-select"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              >
                <option value="newest">Сначала новые</option>
                <option value="oldest">Сначала старые</option>
              </select>
            </label>
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
                {sortedBosses.map((boss) => (
                    <tr key={boss.email}>
                      <td>
                        <button
                          type="button"
                          className="admin-boss-toggle"
                          onClick={() => setSelectedBoss(boss)}
                        >
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
                          <>
                          <button
                            type="button"
                            className="admin-edit-button"
                            onClick={() => handleEditAccount(boss.email)}
                            disabled={busy}
                          >
                            Изменить
                          </button>
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
                          </>
                        )}
                      </td>
                    </tr>
                ))}
                {!loading && dashboard?.bosses.length === 0 && (
                  <tr><td colSpan="5" className="admin-empty-state">Аккаунтов пока нет.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
      {accountDialog && (
        <div
          className="admin-confirm-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setAccountDialog(null);
          }}
        >
          <section
            className="admin-confirm-dialog admin-account-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-account-dialog-title"
          >
            {accountDialog.type === "edit" ? (
              <form onSubmit={handleConfirmEdit}>
                <h2 id="admin-account-dialog-title">Изменить email для входа?</h2>
                <p>
                  Изменится только адрес доступа. Данные кабинета останутся привязаны к старому email.
                </p>
                <label className="admin-edit-email-label" htmlFor="admin-edit-email">
                  Новый email
                </label>
                <input
                  id="admin-edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  required
                  autoFocus
                />
                <div className="admin-confirm-actions">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => setAccountDialog(null)}
                    disabled={busy}
                  >
                    Отмена
                  </button>
                  <button type="submit" className="admin-dialog-done" disabled={busy}>
                    {busy ? "Сохранение..." : "Изменить email"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2 id="admin-account-dialog-title">Удалить доступ?</h2>
                <p>
                  Для <strong>{accountDialog.email}</strong> вход будет закрыт. Данные кабинета останутся в Firestore.
                </p>
                <div className="admin-confirm-actions">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => setAccountDialog(null)}
                    disabled={busy}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="admin-confirm-logout"
                    onClick={handleConfirmDelete}
                    disabled={busy}
                  >
                    {busy ? "Удаление..." : "Удалить доступ"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {selectedBoss && (
        <div
          className="admin-confirm-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedBoss(null);
          }}
        >
          <section
            className="admin-boss-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-boss-dialog-title"
          >
            <button
              type="button"
              className="admin-dialog-close"
              onClick={() => setSelectedBoss(null)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <p className="admin-eyebrow">АККАУНТ БОССА</p>
            <h2 id="admin-boss-dialog-title">{selectedBoss.displayName || selectedBoss.email}</h2>
            {selectedBoss.displayName && (
              <p className="admin-boss-dialog-email">{selectedBoss.email}</p>
            )}
            <div className="admin-boss-dialog-details">
              <div>
                <span>Email для работников</span>
                <strong>{selectedBoss.hasWorkerEmail ? selectedBoss.workerEmail : "Не указан"}</strong>
              </div>
              <div>
                <span>Рабочие, зарегистрированные через этот аккаунт</span>
                <strong>{selectedBoss.hasWorkerEmail ? selectedBoss.workerCount : 0}</strong>
              </div>
            </div>
            <button
              type="button"
              className="admin-dialog-done"
              onClick={() => setSelectedBoss(null)}
            >
              Закрыть
            </button>
          </section>
        </div>
      )}
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
