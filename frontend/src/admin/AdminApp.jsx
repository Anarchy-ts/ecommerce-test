// src/admin/AdminApp.jsx
import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import AdminNavbar from "./Components/AdminNavbar/AdminNavbar";
import AddProduct from "./Pages/AddProduct";
import ExistingProducts from "./Pages/ExistingProducts";
import PromoCodes from "./Pages/PromoCodes";
import Dashboard from "./Pages/Dashboard";
import AdminAccount from "./Pages/AdminAccount";
import CustomerOrders from "./Pages/CustomerOrders";
import DeliverableAddress from "./Pages/DeliverableAddress";
import Charges from "./Pages/Charges";
import ProtectedRoute from "./ProtectedRoute";

const AdminApp = () => {
  const navigate = useNavigate();

  // auto logout when token expires
  useEffect(() => {
    const checkAdminToken = () => {
      const token = localStorage.getItem("adminToken");
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const expiry = payload.exp * 1000;
        const now = Date.now();

        if (now >= expiry) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("isAdmin");
          navigate("/admin/login");
        } else {
          setTimeout(() => {
            localStorage.removeItem("adminToken");
            localStorage.removeItem("isAdmin");
            navigate("/admin/login");
          }, expiry - now);
        }
      } catch (err) {
        console.error("Invalid admin token:", err);
        localStorage.removeItem("adminToken");
        localStorage.removeItem("isAdmin");
        navigate("/admin/login");
      }
    };

    checkAdminToken();
  }, [navigate]);

  return (
    <div className="admin-app">
      <AdminNavbar />
      <div className="admin-content">
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* All protected admin routes */}
          <Route
            path="add-product"
            element={
              <ProtectedRoute>
                <AddProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="existing-products"
            element={
              <ProtectedRoute>
                <ExistingProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="promo-codes"
            element={
              <ProtectedRoute>
                <PromoCodes />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="account"
            element={
              <ProtectedRoute>
                <AdminAccount />
              </ProtectedRoute>
            }
          />
          <Route
            path="customer-orders"
            element={
              <ProtectedRoute>
                <CustomerOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="deliverable-addresses"
            element={
              <ProtectedRoute>
                <DeliverableAddress />
              </ProtectedRoute>
            }
          />
          <Route
            path="charges"
            element={
              <ProtectedRoute>
                <Charges />
              </ProtectedRoute>
            }
          />

          {/* fallback */}
          <Route path="*" element={<h2>404 Page Not Found</h2>} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminApp;
