import React, { useCallback, useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../Firebase/Firebase";
import {
  addManagedAccount,
  getAdminDashboard,
  removeManagedAccount,
} from "../auth/accountAccess";
import "../styles/AdminPanel.css";

function AdminPanel() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDashboard(await getAdminDashboard());
    } catch (loadError) {
      console.error("Failed to load admin dashboard:", loadError);
      setError(loadError.message || "Не удалось загрузить статистику.");
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
      setError(saveError.message || "Не удалось добавить аккаунт.");
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
      setError(removeError.message || "Не удалось удалить аккаунт.");
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
  };

  const stats = dashboard?.stats;

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
          <button className="admin-secondary-button" type="button" onClick={handleLogout}>
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
                  <tr key={boss.email}>
                    <td>
                      <strong>{boss.displayName || boss.email}</strong>
                      {boss.displayName && <small>{boss.email}</small>}
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
                          onClick={() => handleRemoveAccount(boss.email)}
                          disabled={busy}
                        >
                          Удалить
                        </button>
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
    </main>
  );
}

export default AdminPanel;
