// src/LoginSignUp.jsx
import React, { useState, useContext } from "react"
import { useNavigate } from "react-router-dom"
import "./CSS/LoginSignUp.css"
import { ShopContext } from "../Context/ShopContext"

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const LoginSignUp = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })
  const [message, setMessage] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [forgotMode, setForgotMode] = useState(false)
  const [resetStep, setResetStep] = useState(1) // 1=email, 2=otp, 3=new password
  const [newPassword, setNewPassword] = useState("")
  const navigate = useNavigate()

  const { setToken } = useContext(ShopContext)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // ---------------- REGISTER FLOW ----------------
  const sendOtp = async () => {
    setMessage("Sending OTP...")
    try {
      const res = await fetch(`${API_BASE}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      })
      const data = await res.json()
      if (!res.ok) return setMessage(data.message || "Failed to send OTP")
      setOtpSent(true)
      setMessage("OTP sent, check your email")
    } catch (err) {
      console.error(err)
      setMessage("Error sending OTP")
    }
  }

  const verifyOtpAndRegister = async () => {
    setMessage("Verifying OTP...")
    try {
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otp }),
      })
      const data = await res.json()
      if (!res.ok) return setMessage(data.message || "Invalid OTP")

      // OTP verified → register user
      const regRes = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const regData = await regRes.json()
      if (!regRes.ok) return setMessage(regData.message || "Signup failed")

      setMessage("Signup successful, please login now.")
      setIsLogin(true)
      setOtpSent(false)
      setOtp("")
    } catch (err) {
      console.error(err)
      setMessage("Error verifying OTP")
    }
  }

  // ---------------- LOGIN FLOW ----------------
  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) return setMessage(data.message || "Login failed")

      localStorage.setItem("token", data.token)
      setToken(data.token)
      navigate("/")
    } catch (err) {
      console.error(err)
      setMessage("Server error")
    }
  }

  // ---------------- FORGOT PASSWORD FLOW ----------------
  const handleForgotPassword = async () => {
    if (resetStep === 1) {
      // Step 1: send OTP
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      })
      const data = await res.json()
      setMessage(data.message)
      if (res.ok) setResetStep(2)
    } else if (resetStep === 2) {
      // Step 2: verify OTP
      const res = await fetch(`${API_BASE}/verify-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otp }),
      })
      const data = await res.json()
      setMessage(data.message)
      if (res.ok) setResetStep(3)
    } else if (resetStep === 3) {
      // Step 3: reset password
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, newPassword }),
      })
      const data = await res.json()
      setMessage(data.message)
      if (res.ok) {
        setForgotMode(false)
        setResetStep(1)
        setNewPassword("")
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")

    if (forgotMode) return handleForgotPassword()
    if (!isLogin && !otpSent) return sendOtp()
    if (!isLogin && otpSent) return verifyOtpAndRegister()
    if (isLogin) return handleLogin()
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>
          {forgotMode
            ? "Reset Password"
            : isLogin
            ? "Login"
            : "Sign Up"}
        </h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* ---------- SIGNUP NAME ---------- */}
          {!isLogin && !otpSent && !forgotMode && (
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              className="auth-input"
              value={formData.name}
              onChange={handleChange}
              required
            />
          )}

          {/* ---------- EMAIL FIELD ---------- */}
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            className="auth-input"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={!isLogin && otpSent}
          />

          {/* ---------- PASSWORD FIELD (login/signup only) ---------- */}
          {!otpSent && !forgotMode && (
            <div className="password-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                className="auth-input"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <span
                className="eye-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg"
                       fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" width="22" height="22">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 
                             8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg"
                       fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" width="22" height="22">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 
                             20c-7 0-11-8-11-8a21.57 21.57 0 0 1 
                             5.06-6.06M9.9 9.9a3 3 0 0 0 
                             4.2 4.2M1 1l22 22" />
                  </svg>
                )}
              </span>
            </div>
          )}

          {/* ---------- SIGNUP OTP ---------- */}
          {!isLogin && otpSent && !forgotMode && (
            <div className="otp-container">
              <input
                type="text"
                name="otp"
                placeholder="Enter OTP"
                className="auth-input otp-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <button
                type="button"
                className="resend-btn"
                onClick={sendOtp}
              >
                Resend
              </button>
            </div>
          )}

          {/* ---------- FORGOT PASSWORD FLOW ---------- */}
          {forgotMode && (
            <>
              {resetStep === 2 && (
                <input
                  type="text"
                  placeholder="Enter OTP"
                  className="auth-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              )}
              {resetStep === 3 && (
                <div className="password-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="auth-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <span
                    className="eye-icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg"
                          fill="none" viewBox="0 0 24 24"
                          stroke="currentColor" width="22" height="22">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 
                                8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg"
                          fill="none" viewBox="0 0 24 24"
                          stroke="currentColor" width="22" height="22">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 
                                20c-7 0-11-8-11-8a21.57 21.57 0 0 1 
                                5.06-6.06M9.9 9.9a3 3 0 0 0 
                                4.2 4.2M1 1l22 22" />
                      </svg>
                    )}
                  </span>
                </div>
              )}

            </>
          )}

          {/* ---------- BUTTON TEXT ---------- */}
          <button type="submit" className="auth-btn">
            {forgotMode
              ? resetStep === 1
                ? "Send OTP"
                : resetStep === 2
                ? "Verify OTP"
                : "Reset Password"
              : isLogin
              ? "Login"
              : otpSent
              ? "Verify OTP & Sign Up"
              : "Send OTP"}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        {/* ---------- TOGGLE LINKS ---------- */}
        {!forgotMode && (
          <p className="auth-toggle">
            {isLogin ? (
              <>
                Don’t have an account?{" "}
                <span onClick={() => setIsLogin(false)}>Click here</span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span onClick={() => setIsLogin(true)}>Click here</span>
              </>
            )}
          </p>
        )}

        {/* ---------- FORGOT PASSWORD LINK ---------- */}
        {isLogin && !forgotMode && (
          <p className="forgot-link" onClick={() => setForgotMode(true)}>
            Forgot Password?
          </p>
        )}

        {/* ---------- BACK TO LOGIN LINK ---------- */}
        {forgotMode && (
          <p className="auth-toggle">
            Remembered password?{" "}
            <span
              onClick={() => {
                setForgotMode(false)
                setResetStep(1)
              }}
            >
              Back to Login
            </span>
          </p>
        )}
      </div>
    </div>
  )
}

export default LoginSignUp
