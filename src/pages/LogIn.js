import React, { useState, useEffect } from 'react'
import "../styles/LogIn.css"
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from "react-router-dom";
import { FaGoogle } from "react-icons/fa";
import {
  signInWithPopup,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc
} from "firebase/firestore";
import { auth, provider, db } from "../Firebase/Firebase.js";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Loading from '../components/Loading.js';

function LogIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [user, setUser] = useState(null);
  const [isUser, setIsUser] = useState(false);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Auto Worker Login detection
  const [pendingWorker, setPendingWorker] = useState(null);
  const [workerCode, setWorkerCode] = useState("");
  const [showWorkerCodeModal, setShowWorkerCodeModal] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    const filled = username.trim().length >= 3 && password.trim().length >= 8;
    setIsButtonEnabled(filled);
    if (filled) {
      setButtonPosition({ x: 0, y: 0 }); 
      setGeneralError(''); 
    } else {
      setButtonPosition({ x: 0, y: 0 }); 
      setGeneralError(''); 
    }
  }, [username, password]);

  const handleMouseMove = (e) => {
    if (!isButtonEnabled) { 
      const button = e.target;
      const rect = button.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const distance = Math.sqrt(
        Math.pow(mouseX - (rect.left + rect.width / 2), 2) +
        Math.pow(mouseY - (rect.top + rect.height / 2), 2)
      );

      if (distance < 80) { 
        const maxX = window.innerWidth < 500 ? 80 : 125;
        const maxY = window.innerWidth < 500 ? 80 : 125;

        const newX = Math.random() * maxX * 2 - maxX;
        const newY = Math.random() * maxY * 2 - maxY;
        setButtonPosition({ x: newX, y: newY });
      }
    }
  };

  const handleMouseDown = (e) => {
    if (!isButtonEnabled) { 
      const newX = Math.random() * 400 - 200; 
      const newY = Math.random() * 400 - 200; 
      setButtonPosition({ x: newX, y: newY });
      e.preventDefault(); 
    }
  };

  const handleLogin = (e) => {
    if (isButtonEnabled) {
      localStorage.setItem('username', username);
      localStorage.setItem('password', password);
      navigate("/hisobot");
    } else {
      e.preventDefault(); 
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsUser(true);
        await checkAndAddUserToFirestore(currentUser);
      } else {
        localStorage.removeItem("userEmail");
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        localStorage.removeItem("bossEmail");
        localStorage.removeItem("workerId");
        setUser(null);
        setIsUser(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const checkAndAddUserToFirestore = async (user) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", user.email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      await addDoc(usersRef, {
        email: user.email,
        displayName: user.displayName || user.email,
        photoUrl: user.photoURL || "",
      });
    }
  };

  const googleSignIn = async () => {
    try {
      setGeneralError("");
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user.email.toLowerCase();

      // Check if the email belongs to a globally assigned worker email mapped by a boss
      const docRef = doc(db, "globalWorkerEmails", userEmail);
      
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (err) {
        if (err.code === 'unavailable') {
          // One-time retry after short delay
          await new Promise(res => setTimeout(res, 1000));
          docSnap = await getDoc(docRef);
        } else {
          throw err;
        }
      }

      if (docSnap.exists()) {
        const data = docSnap.data();
        setPendingWorker({ email: result.user.email, data, authResult: result });
        setShowWorkerCodeModal(true);
      } else {
        // Normal Boss Flow
        localStorage.setItem("username", result.user.email);
        localStorage.setItem("userEmail", result.user.email);
        localStorage.setItem("role", "boss");
        navigate("/hisobot");
      }
    } catch (error) {
      console.log(`Error firebase --- ${error}`);
      if (error.code === 'unavailable' || !navigator.onLine) {
        setGeneralError(t("Internet ulanishida xatolik! Tarmoqni tekshiring va qayta urinib ko'ring."));
      } else {
        setGeneralError(error.message);
      }
    }
  };

  const handleWorkerCodeSubmit = async () => {
    if (!pendingWorker) return;

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
        setShowWorkerCodeModal(false);
        navigate("/workerdashboard");
      } else {
        setGeneralError(t("Noto'g'ri kod! Parolni tekshiring."));
      }
    } catch (error) {
      console.error(error);
      if (error.code === 'unavailable' || !navigator.onLine) {
        setGeneralError(t("Internet ulanishida xatolik! Tarmoqni tekshiring."));
      } else {
        setGeneralError(t("Ulanishda xatolik yuz berdi."));
      }
    }
  };

  return (
    <div className='LogIn'>
        <div className="LoginType">
            <h1>LogIn</h1>
            <button className="login_btn" onClick={googleSignIn}>
            <FaGoogle />
          </button>
            {generalError && <p className="error" style={{marginTop: '20px'}}>{generalError}</p>}
        </div>

        {/* Worker Code Modal overrides main UI if triggered */}
        {showWorkerCodeModal && (
          <div className="modal-overlay" style={{background: 'rgba(0,0,0,0.85)', zIndex: 999}}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{background: 'rgb(18, 17, 36)', padding: '30px', borderRadius: '16px', maxWidth: '400px', width: '90%', textAlign: 'center'}}>
              <h2 style={{color: '#fff', marginBottom: '10px'}}>Kodni kiriting</h2>
              <p style={{color: '#ccc', marginBottom: '20px'}}>Siz ishchi sifatida ro'yxatdan o'tgansiz. Davom etish uchun parolingizni (kod) kiriting.</p>
              
              <input 
                type="text" 
                placeholder="Parol/Kod" 
                value={workerCode}
                onChange={(e) => setWorkerCode(e.target.value)}
                autoFocus
                style={{ 
                  padding: "12px", 
                  borderRadius: "8px", 
                  width: "100%", 
                  border: "1px solid rgba(255,255,255,0.1)", 
                  outline: "none", 
                  background: "rgba(255,255,255,0.05)", 
                  color: "#fff",
                  boxSizing: "border-box",
                  marginBottom: '20px',
                  fontSize: '16px',
                  textAlign: 'center'
                }}
              />
              <div style={{display: 'flex', gap: '10px'}}>
                 <button 
                   onClick={() => {
                     setShowWorkerCodeModal(false);
                     setWorkerCode("");
                     signOut(auth);
                   }}
                   style={{flex: 1, padding: "12px", borderRadius: "8px", background: "transparent", color: "#ccc", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer"}}
                 >
                   Bekor qilish
                 </button>
                 <button 
                   onClick={handleWorkerCodeSubmit}
                   style={{flex: 1, padding: "12px", borderRadius: "8px", background: "rgb(86, 86, 255)", color: "#fff", border: "none", cursor: "pointer", fontWeight: "bold"}}
                 >
                   Tasdiqlash
                 </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default LogIn