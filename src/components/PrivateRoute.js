import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../Firebase/Firebase";
import { checkAccountAccess } from "../auth/accountAccess";

function PrivateRoute({ children }) {
  const user = localStorage.getItem("userEmail");
  const role = localStorage.getItem("role");
  const location = useLocation();
  const [accountAccess, setAccountAccess] = useState("checking");

  useEffect(() => {
    const isAdminRoute = location.pathname === "/admin";
    const isBossRoute = location.pathname === "/hisobot";
    if (!isAdminRoute && !isBossRoute) return undefined;
    let isCurrent = true;
    setAccountAccess("checking");

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (
        !firebaseUser?.email ||
        firebaseUser.email.toLowerCase() !== user?.toLowerCase() ||
        role !== (isAdminRoute ? "admin" : "boss")
      ) {
        if (isCurrent) setAccountAccess("denied");
        return;
      }

      try {
        const access = await checkAccountAccess();
        const isAllowed = isAdminRoute
          ? access.admin
          : access.allowed && !access.admin;
        if (isCurrent) setAccountAccess(isAllowed ? "allowed" : "denied");
      } catch (error) {
        console.error("Failed to verify account access:", error);
        if (isCurrent) setAccountAccess("denied");
      }
    });

    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [location.pathname, role, user]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (role === "admin" && location.pathname === "/hisobot") {
    return <Navigate to="/admin" replace />;
  }

  if (location.pathname === "/admin" || location.pathname === "/hisobot") {
    if (accountAccess === "checking") return null;
    if (accountAccess !== "allowed") return <Navigate to="/login" replace />;
  }

  // If a worker tries to access boss routes (like /hisobot)
  if (role === "worker" && location.pathname === "/hisobot") {
    return <Navigate to="/workerdashboard" />;
  }

  // If a boss tries to access worker dashboard
  if (role === "boss" && location.pathname === "/workerdashboard") {
    return <Navigate to="/hisobot" />;
  }

  return children;
}

export default PrivateRoute;
