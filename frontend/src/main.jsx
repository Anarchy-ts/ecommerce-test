import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import AdminApp from "./admin/AdminApp.jsx";
import AdminLogin from "../src/admin/Components/AdminLogin/AdminLogin"; // 👈 new
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ShopProvider } from "./Context/ShopContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Customer site */}
        <Route
          path="/*"
          element={
            <ShopProvider>
              <App />
            </ShopProvider>
          }
        />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
