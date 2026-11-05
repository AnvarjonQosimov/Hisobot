import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db, auth } from "../Firebase/Firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
    let authStep = "invite-code lookup";

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

      if (
        codeSnap.exists() &&
        (!pendingWorker.data?.bossEmail ||
          codeSnap.data().bossEmail === pendingWorker.data.bossEmail)
      ) {
        const codeData = codeSnap.data();
        const workerEmail = pendingWorker.email.toLowerCase();
        if (!auth.currentUser) {
          throw new Error("The worker account is no longer authenticated.");
        }
        authStep = "worker access save";
        await setDoc(doc(db, "workerAccess", workerEmail), {
          bossEmail: codeData.bossEmail,
          workerId: codeData.workerId,
          inviteCode: workerCode.trim(),
          ownerEmail: workerEmail,
          ownerUid: auth.currentUser.uid,
        });
        localStorage.setItem("username", pendingWorker.email);
        localStorage.setItem("userEmail", workerEmail);
        localStorage.setItem("role", "worker");
        localStorage.setItem("bossEmail", codeData.bossEmail);
        localStorage.setItem("workerId", JSON.stringify(codeData.workerId));
        navigate("/workerdashboard");
      } else {
        setError(t("worker_auth_wrong_code", { defaultValue: "Parol noto'g'ri. Qaytadan kiriting." }));
      }
    } catch (err) {
      console.error(`Worker sign-in failed during ${authStep}:`, err);
      if (err.code === "unavailable") {
        setError(t("Internet ulanishida xatolik! Tarmoqni tekshiring."));
      } else if (err.code === "permission-denied") {
        setError(t("worker_auth_failed", {
          defaultValue: "Kirish amalga oshmadi. Parolni tekshiring yoki rahbar bilan bog'laning.",
        }));
      } else {
        setError(t("worker_auth_failed", {
          defaultValue: "Kirish amalga oshmadi. Parolni tekshiring yoki rahbar bilan bog'laning.",
        }));
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
      <div className="LoginType worker-auth-card">
        <h1>{t("Kodni kiriting", { defaultValue: "Kodni kiriting" })}</h1>
        <p className="worker-auth-description">
          {t("worker_auth_desc", {
            defaultValue: "Siz ishchi sifatida ro'yxatdan o'tgansiz. Davom etish uchun bossingiz bergan maxsus kodni kiriting.",
          })}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="worker-auth-input-group">
            <input
              type="text"
              placeholder={t("Parol/Kod")}
              value={workerCode}
              onChange={(e) => setWorkerCode(e.target.value)}
              autoFocus
              className="worker-code-input"
              autoComplete="off"
              aria-invalid={Boolean(error)}
            />
            {error && <p role="alert" className="error worker-auth-error">{error}</p>}
          </div>

          <div className="worker-auth-actions">
            <button
              type="button"
              onClick={handleCancel}
            >
              {t("bekorqilish")}
            </button>
            <button
              type="submit"
              disabled={loading || !workerCode.trim()}
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
