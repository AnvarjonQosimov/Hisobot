import React, { useState, useEffect } from 'react';
import "../styles/LogIn.css";
import { FaGoogle } from "react-icons/fa";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { auth, provider, db } from "../Firebase/Firebase.js";
import {
  ADMIN_EMAIL,
  checkAccountAccess,
} from "../auth/accountAccess";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function LogIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!window.navigator.onLine);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleStatus = () => setIsOffline(!window.navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  const checkAndAddUserToFirestore = async (user) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);
      const now = new Date().toISOString();
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoURL,
        ownerEmail: user.email?.toLowerCase(),
        ownerUid: user.uid,
        registeredAt: userSnapshot.data()?.registeredAt || now,
        lastLogin: now
      }, { merge: true });
    } catch (e) {
      console.error("Firestore user profile sync failed:", e);
    }
  };

  // 1. IMMEDIATE OPTIMISTIC CHECK (Synchronous)
  // useEffect(() => {
  //   const cachedEmail = localStorage.getItem("userEmail");
  //   const cachedRole = localStorage.getItem("role");

  //   if (cachedEmail && cachedRole) {
  //     console.log("Optimistic redirect to:", cachedRole);
  //     navigate(cachedRole === "worker" ? "/workerdashboard" : "/hisobot", { replace: true });
  //   }
  // }, [navigate]);

  useEffect(() => {
  const cachedEmail = localStorage.getItem("userEmail");
  const cachedRole = localStorage.getItem("role");

  if (!cachedEmail || !cachedRole) return;

  if (cachedRole === "worker") {
    navigate("/workerdashboard", { replace: true });
    return;
  }

  if (
    cachedRole === "admin" &&
    cachedEmail.toLowerCase() === ADMIN_EMAIL
  ) {
    navigate("/admin", { replace: true });
    return;
  }

  if (cachedRole === "boss") {
    navigate("/hisobot", { replace: true });
    return;
  }

  // The private route validates the cached role and account access.
  localStorage.removeItem("role");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("username");
}, [navigate]);

  // 2. BACKGROUND SESSION VERIFICATION
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
      return;
    }

    const email = currentUser.email?.toLowerCase();

    if (!email) {
      await auth.signOut();
      return;
    }

    localStorage.setItem("userEmail", email);
    localStorage.setItem("username", email);

    try {
      // Сначала проверяем, является ли пользователь работником
      const workerRef = doc(db, "globalWorkerEmails", email);
      const workerSnap = await getDoc(workerRef);

      // =========================
      // РАБОТНИК
      // =========================
      if (workerSnap.exists()) {
        const workerData = workerSnap.data();

        localStorage.setItem("role", "worker");
        await checkAndAddUserToFirestore(currentUser);

        navigate("/worker-auth", {
          state: {
            pendingWorker: {
              email: email,
              data: workerData
            }
          },
          replace: true
        });

        return;
      }

      const access = await checkAccountAccess();
      if (access.allowed) {
        await checkAndAddUserToFirestore(currentUser);
        if (access.admin) {
          localStorage.setItem("role", "admin");
          navigate("/admin", { replace: true });
          return;
        }

        localStorage.setItem("role", "boss");

        navigate("/hisobot", {
          replace: true
        });

        return;
      }

      // =========================
      // ДРУГОЙ АККАУНТ
      // =========================
      console.log("Access denied:", email);

      localStorage.removeItem("role");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("username");

      await auth.signOut();

      setError(t("login_boss_access_denied"));

    } catch (error) {
      console.error("Account access check failed:", error);

      // При ошибке Firestore НЕ считаем пользователя boss
      localStorage.removeItem("role");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("username");

      await auth.signOut();

      setError(t("login_access_check_failed"));
    }
  });

  return () => unsubscribe();
}, [navigate, t]);

  const googleSignIn = async () => {
  if (loading) return;

  setLoading(true);
  setError("");

  console.log("Starting Google Sign-In...");

  try {
    // Вход через Google
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const email = user.email.toLowerCase();

    console.log("User authenticated:", email);

    localStorage.setItem("userEmail", email);
    localStorage.setItem("username", email);

    console.log("Checking user role...");

    // Проверяем, является ли пользователь работником
    const workerRef = doc(db, "globalWorkerEmails", email);

    const workerSnap = await Promise.race([
      getDoc(workerRef),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      )
    ]);

    console.log("Role check completed.");

    // =========================
    // РАБОТНИК
    // =========================
    if (workerSnap.exists()) {
      const workerData = workerSnap.data();
      await checkAndAddUserToFirestore(user);

      localStorage.setItem("role", "worker");

      console.log("Worker detected.");

      navigate("/worker-auth", {
        state: {
          pendingWorker: {
            email: email,
            data: workerData
          }
        }
      });

      return;
    }

    const access = await checkAccountAccess();
    if (access.allowed) {
      await checkAndAddUserToFirestore(user);
      if (access.admin) {
        localStorage.setItem("role", "admin");
        navigate("/admin", { replace: true });
        return;
      }

      localStorage.setItem("role", "boss");

      console.log("Authorized boss detected. Redirecting to Hisobot...");

      navigate("/hisobot", { replace: true });

      return;
    }

    // =========================
    // НЕТ ДОСТУПА
    // =========================
    console.log("Access denied:", email);

    localStorage.removeItem("role");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("username");

    setError(t("login_boss_access_denied"));

    await auth.signOut();

  } catch (err) {
    console.error("Sign-in error details:", err);

    if (err.message === "timeout") {
      setError(t("login_access_check_failed"));
    } else if (err.code === "auth/popup-blocked") {
      setError(
        "Popup was blocked by your browser. Please allow popups for this site."
      );
    } else if (
      err.code === "auth/network-request-failed" ||
      err.message.includes("RESOLVED")
    ) {
      setError(
        "Network connection issue detected. Try using a VPN or check your connection."
      );
    } else {
      setError(err.message);
    }

  } finally {
    setLoading(false);
  }
};

  return (
    <div className='LogIn'>
      <div className="LoginType">
        <h1>Log In</h1>
        {isOffline && (
          <div className="offline-status" style={{ background: '#ffa500', color: '#000', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', marginBottom: '15px' }}>
            ⚠️ {t("Working Offline")}
          </div>
        )}
        <button onClick={googleSignIn} className="google_signin_btn" disabled={loading}>
          {loading ? (
            <span style={{ fontSize: '16px', fontWeight: '500' }}>{t("tekshirilmoqda...") || "Tekshirilmoqda..."}</span>
          ) : (
            <FaGoogle />
          )}
        </button>
        {error && <p className="error" style={{ textAlign: 'center', marginTop: '20px', color: '#ff4d4d' }}>{error}</p>}
      </div>
    </div>
  );
}

export default LogIn;