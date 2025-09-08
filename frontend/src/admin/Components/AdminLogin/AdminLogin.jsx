import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminLogin.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [timer, setTimer] = useState(0); // ⏱ countdown for resend OTP

  const navigate = useNavigate();

  // ✅ Normal login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post(`${API_BASE}/admin/login`, {
        username,
        password,
      });
      if (res.data.token) {
        localStorage.setItem("adminToken", res.data.token);
        localStorage.setItem("isAdmin", "true");
        navigate("/admin/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    }
  };

  // ✅ Send OTP (also used for resend)
  const handleSendOtp = async () => {
    try {
      await axios.post(`${API_BASE}/admin/send-otp`);
      setOtpSent(true);
      setTimer(15); // ⏱ 15 sec cooldown
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    }
  };

  // ✅ Countdown for resend OTP
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // ✅ Reset credentials
  const handleResetCreds = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/admin/reset-creds`, {
        otp,
        username: newUsername,
        password: newPassword,
      });
      alert("Credentials updated. Please login again.");
      setForgotMode(false);
      setOtpSent(false);
      navigate("/admin/login");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset credentials");
    }
  };

  // 🔹 Eye Icon SVGs
  const EyeOpen = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" width="22" height="22">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 
               8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeClosed = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" width="22" height="22">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 
               20c-7 0-11-8-11-8a21.57 21.57 0 0 1 
               5.06-6.06M9.9 9.9a3 3 0 0 0 
               4.2 4.2M1 1l22 22" />
    </svg>
  );

  return (
    <div className="admin-login">
      {!forgotMode ? (
        // 🔹 Normal Login
        <form onSubmit={handleLogin}>
          <h2>Admin Login</h2>
          {error && <p className="error">{error}</p>}

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="admin-eye-icon"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? EyeOpen : EyeClosed}
            </span>
          </div>

          <button type="submit" className="login-btn">Login</button>
          <p className="forgot-link" onClick={() => setForgotMode(true)}>
            Forgot Credentials?
          </p>
        </form>
      ) : (
        // 🔹 Reset Credentials
        <form onSubmit={handleResetCreds}>
          <h2>Reset Credentials</h2>
          {error && <p className="error">{error}</p>}

          {!otpSent ? (
            <button type="button" onClick={handleSendOtp} className="login-btn">
              Send OTP
            </button>
          ) : (
            <>
              {/* OTP + Resend inline */}
              <div className="otp-row">
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />

                <div className="otp-actions">
                  <button
                    type="button"
                    className="admin-resend-btn"
                    disabled={timer > 0}
                    onClick={handleSendOtp}
                  >
                    {timer > 0 ? `Resend in ${timer}s` : "Resend"}
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="New Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
              />
              <div className="password-container">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <span
                  className="admin-eye-icon"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? EyeOpen : EyeClosed}
                </span>
              </div>

              <button type="submit" className="login-btn">
                Reset Credentials
              </button>
            </>
          )}

          <p className="forgot-link" onClick={() => setForgotMode(false)}>
            Back to Login
          </p>
        </form>
      )}
    </div>
  );
};

export default AdminLogin;
