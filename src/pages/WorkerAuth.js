import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db, auth } from "../Firebase/Firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useTranslation } from "react-i18next";
import Loading from "../components/Loading";
import "../styles/LogIn.css"; // Reuse login styles

function WorkerAuth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingWorker } = location.state || {};

  const [workerCode, setWorkerCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pendingWorker) {
      navigate("/login");
    }
  }, [pendingWorker, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workerCode.trim() || !pendingWorker) return;

    setLoading(true);
    setError("");

    try {
      const codeRef = doc(db, "inviteCodes", workerCode.trim());
      
      let codeSnap;
      try {
        codeSnap = await getDoc(codeRef);
      } catch (err) {
        if (err.code === 'unavailable') {
          await new Promise(res => setTimeout(res, 1000));
          codeSnap = await getDoc(codeRef);
        } else {
          throw err;
        }
      }

      if (codeSnap.exists() && codeSnap.data().bossEmail === pendingWorker.data.bossEmail) {
        const codeData = codeSnap.data();
        localStorage.setItem("username", pendingWorker.email);
        localStorage.setItem("userEmail", pendingWorker.email);
        localStorage.setItem("role", "worker");
        localStorage.setItem("bossEmail", codeData.bossEmail);
        localStorage.setItem("workerId", codeData.workerId);
        navigate("/workerdashboard");
      } else {
        setError(t("Noto'g'ri kod! Parolni tekshiring."));
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'unavailable') {
        setError(t("Internet ulanishida xatolik! Tarmoqni tekshiring."));
      } else {
        setError(t("Ulanishda xatolik yuz berdi."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await signOut(auth);
    localStorage.clear();
    navigate("/login");
  };

  if (!pendingWorker) return <Loading />;

  return (
    <div className="LogIn">
      <div className="LoginType" style={{ maxWidth: '440px', padding: '40px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>{t("Kodni kiriting") || "Parolni kiriting"}</h1>
        <p style={{ 
          color: 'rgba(204, 194, 255, 0.7)', 
          textAlign: 'center', 
          marginBottom: '30px',
          fontSize: '15px',
          lineHeight: '1.5'
        }}>
          {t("worker_auth_desc") || "Siz ishchi sifatida ro'yxatdan o'tgansiz. Davom etish uchun bossingiz bergan maxsus kodni kiriting."}
        </p>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder={t("Parol/Kod")}
              value={workerCode}
              onChange={(e) => setWorkerCode(e.target.value)}
              autoFocus
              className="worker-code-input"
              style={{
                textAlign: 'center',
                fontSize: '20px',
                letterSpacing: '2px',
                fontWeight: 'bold',
                padding: '16px'
              }}
            />
            {error && <p className="error" style={{ textAlign: 'center', marginTop: '10px' }}>{error}</p>}
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                margin: 0
              }}
            >
              {t("bekorqilish")}
            </button>
            <button
              type="submit"
              disabled={loading || !workerCode.trim()}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, rgb(86, 86, 255) 0%, rgb(50, 50, 200) 100%)',
                boxShadow: '0 10px 20px rgba(86, 86, 255, 0.2)',
                margin: 0
              }}
            >
              {loading ? (t("tekshirilmoqda...") || "...") : t("ha")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WorkerAuth;
