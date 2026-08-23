import { Navigate, useLocation } from "react-router-dom";

function PrivateRoute({ children }) {
  const user = localStorage.getItem("userEmail");
  const role = localStorage.getItem("role");
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" />;
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
