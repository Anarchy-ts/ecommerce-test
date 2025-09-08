import React, { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import Navbar from "./Components/Navbar/Navbar.jsx";

import Home from "./Pages/Home.jsx";
import LoginSignUp from "./Pages/LoginSignUp.jsx";
import Cart from "./Pages/Cart.jsx";
import Address from "./Pages/Address.jsx";
import Payment from "./Pages/Payment.jsx";
import Orders from "./Pages/Orders.jsx";
import Footer from "./Components/Footer/Footer.jsx";
import PrivacyPolicy from "./Pages/PrivacyPolicy.jsx";
import ShippingPolicy from "./Pages/ShippingPolicy.jsx";
import CancellationPolicy from "./Pages/CancellationPolicy.jsx";
import TermsPolicy from "./Pages/Terms.jsx";

const App = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = localStorage.getItem("token"); // customer token
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1])); // decode JWT
        const expiry = payload.exp * 1000; // ms
        const now = Date.now();

        if (now >= expiry) {
          // expired -> logout
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          // auto logout exactly when token expires
          setTimeout(() => {
            localStorage.removeItem("token");
            navigate("/login");
          }, expiry - now);
        }
      } catch (err) {
        console.error("Invalid token:", err);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    checkTokenExpiry();
  }, [navigate]);

  return (
    <div>
      <Navbar />
      <Routes>
        {/* Customer routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginSignUp />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/address" element={<Address />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/shipping-policy" element={<ShippingPolicy />} />
        <Route path="/cancellation-policy" element={<CancellationPolicy />} />
        <Route path="/terms" element={<TermsPolicy />} />
        {/* fallback route */}
        <Route path="*" element={<h2>404 Page Not Found</h2>} />
      </Routes>
      <Footer />
    </div>
  );
};

export default App;
