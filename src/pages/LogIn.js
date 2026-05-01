import React, { useState, useEffect } from 'react';
import "../styles/LogIn.css";
import { FaGoogle } from "react-icons/fa";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { auth, provider, db } from "../Firebase/Firebase.js";
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
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoURL,
        lastLogin: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      // Silently handle firestore errors during background sync
      console.log("Firestore background sync paused (offline).");
    }
  };

  // 1. IMMEDIATE OPTIMISTIC CHECK (Synchronous)
  useEffect(() => {
    const cachedEmail = localStorage.getItem("userEmail");
    const cachedRole = localStorage.getItem("role");
    
    if (cachedEmail && cachedRole) {
      console.log("Optimistic redirect to:", cachedRole);
      navigate(cachedRole === "worker" ? "/workerdashboard" : "/hisobot", { replace: true });
    }
  }, [navigate]);

  // 2. BACKGROUND SESSION VERIFICATION
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const email = currentUser.email.toLowerCase();
        localStorage.setItem("userEmail", email);
        localStorage.setItem("username", email);
        
        // Background sync, no 'await'
        checkAndAddUserToFirestore(currentUser);

        // Update role if missing
        if (!localStorage.getItem("role")) {
          try {
            const workerRef = doc(db, "globalWorkerEmails", email);
            // Try fetching, but with a very quick timeout/catch for offline
            const workerSnap = await getDoc(workerRef).catch(err => {
              if (err.code === 'unavailable' || err.message.includes('offline') || err.message.includes('RESOLVED')) {
                return { exists: () => false }; // Assume boss if offline/DNS error
              }
              throw err;
            });
            
            const userRole = workerSnap.exists() ? "worker" : "boss";
            localStorage.setItem("role", userRole);
            navigate(userRole === "worker" ? "/workerdashboard" : "/hisobot", { replace: true });
          } catch (e) {
            console.log("Background role check skipped or failed (offline), defaulting to boss.");
            localStorage.setItem("role", "boss");
            navigate("/hisobot", { replace: true });
          }
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const googleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    console.log("Starting Google Sign-In...");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const email = user.email.toLowerCase();
      console.log("User authenticated:", email);

      localStorage.setItem("userEmail", email);
      localStorage.setItem("username", email);
      console.log("LocalStorage set for email.");

      // Save user to Firestore (Non-blocking background call)
      checkAndAddUserToFirestore(user).then(() => console.log("User record updated in Firestore."));

      // Determine role with a FAST timeout (1 second)
      console.log("Fetching role from Firestore (fast check)...");
      const workerRef = doc(db, "globalWorkerEmails", email);
      
      try {
        const workerSnap = await Promise.race([
          getDoc(workerRef),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000))
        ]).catch(err => {
          console.warn("Role check timed out or offline, defaulting to boss for speed.");
          return { exists: () => false }; 
        });


        console.log("Role fetch completed.");
        const role = workerSnap.exists() ? "worker" : "boss";
        localStorage.setItem("role", role);



        console.log("User role determined:", role);

        if (role === "worker") {
          console.log("Redirecting to Worker Auth...");
          const workerData = workerSnap.data();
          navigate("/worker-auth", { state: { pendingWorker: { email: email, data: workerData } } });
        } else {
          console.log("Redirecting to Hisobot...");
          navigate("/hisobot");
        }
      } catch (roleError) {
        console.log("Role fetch error (offline fallback):", roleError.message);
        localStorage.setItem("role", "boss");
        navigate("/hisobot");
      }

    } catch (err) {
      console.error("Sign-in error details:", err);
      if (err.code === "auth/popup-blocked") {
        setError("Popup was blocked by your browser. Please allow popups for this site.");
      } else if (err.code === "auth/network-request-failed" || err.message.includes('RESOLVED')) {
        setError("Network connection issue detected. Try using a VPN or check your connection.");
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