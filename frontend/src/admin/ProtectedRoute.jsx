// src/admin/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("adminToken");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  if (!token || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiry = payload.exp * 1000;
    const now = Date.now();

    if (now >= expiry) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("isAdmin");
      return <Navigate to="/admin/login" replace />;
    }
  } catch (err) {
    console.error("Invalid admin token:", err);
    localStorage.removeItem("adminToken");
    localStorage.removeItem("isAdmin");
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
