import { Navigate } from "react-router-dom";

function PrivateRoute({ children }) {
  const user = localStorage.getItem("userEmail");

  return user ? children : <Navigate to="/login" />;
}

export default PrivateRoute;