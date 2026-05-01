import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAxp5nDt3zA0df6_GpKPa3UpICAg46OLng",
  authDomain: "loginforofficereport.firebaseapp.com",
  projectId: "loginforofficereport",
  storageBucket: "loginforofficereport.firebasestorage.app",
  messagingSenderId: "410103212827",
  appId: "1:410103212827:web:89344319faf08deebb41be",
  measurementId: "G-X25R1XW5TP"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Group all initializations together at the top
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
  experimentalForceLongPolling: true,
});

export { auth, provider, db };