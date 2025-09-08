import React, { useState, useEffect } from "react";
import axios from "axios";
import "./CSS/AdminAccount.css";
import { FaUserEdit, FaLock, FaEnvelope, FaKey, FaInbox } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const AdminAccount = () => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [field, setField] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    companyEmail: "",
    companyEmailAppPassword: "",
    deliveryAgentEmails: [""],
    otp: ""
  });
  const [message, setMessage] = useState("");
  const [otpStatus, setOtpStatus] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // ✅ Fetch admin details
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const res = await axios.get(`${API_BASE}/admin`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAdmin(res.data);
      } catch (err) {
        console.error(err);
        setMessage("Failed to fetch admin details");
      } finally {
        setLoading(false);
      }
    };
    fetchAdmin();
  }, []);

  // ✅ Open modal for a field
  const openModal = (field) => {
    setField(field);
    setOtpStatus("");
    setResendTimer(0);

    // Prefill emails when editing deliveryAgentEmails
    if (field === "deliveryAgentEmails" && admin?.deliveryAgentEmails) {
      setFormData({
        ...formData,
        deliveryAgentEmails: admin.deliveryAgentEmails.length
          ? [...admin.deliveryAgentEmails]
          : [""],
      });
    } else {
      setFormData({
        username: "",
        password: "",
        companyEmail: "",
        companyEmailAppPassword: "",
        deliveryAgentEmails: [""],
        otp: ""
      });
    }

    setModalOpen(true);
  };

  // ✅ Handle form input
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Handle multiple deliveryAgentEmails
  const handleEmailChange = (index, value) => {
    const newEmails = [...formData.deliveryAgentEmails];
    newEmails[index] = value;
    setFormData({ ...formData, deliveryAgentEmails: newEmails });
  };

  const addEmailField = () => {
    setFormData({
      ...formData,
      deliveryAgentEmails: [...formData.deliveryAgentEmails, ""],
    });
  };

  const removeEmailField = (index) => {
    const newEmails = formData.deliveryAgentEmails.filter((_, i) => i !== index);
    setFormData({ ...formData, deliveryAgentEmails: newEmails });
  };

  // ✅ Request OTP
  const sendOtp = async () => {
    try {
      setOtpStatus("Sending...");
      const res = await axios.post(`${API_BASE}/admin/send-otp`);
      setOtpStatus("✅ " + res.data.message);

      // start 15s timer
      setResendTimer(15);
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      const backendMsg = err.response?.data?.message || "Failed to send OTP";
      setOtpStatus("❌ " + backendMsg);
    }
  };

  // ✅ Submit reset creds
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.post(
        `${API_BASE}/admin/reset-creds`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      const backendMsg =
        err.response?.data?.message || "Error updating credentials";
      setOtpStatus("❌ " + backendMsg);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="admin-account-container">
      <div className="admin-account-card">
        <h1 className="admin-welcome">👋 Welcome, {admin?.username}</h1>
        <p className="admin-subtitle">
          Manage your account settings and company details below.
        </p>

        {/* Action Buttons */}
        <div className="admin-actions">
          <button className="admin-action-btn" onClick={() => openModal("username")}>
            <FaUserEdit className="admin-btn-icon" /> Change Admin Username
          </button>
          <button className="admin-action-btn" onClick={() => openModal("password")}>
            <FaLock className="admin-btn-icon" /> Change Admin Password
          </button>
          <button className="admin-action-btn" onClick={() => openModal("companyEmailAndPassword")}>
            <FaEnvelope className="admin-btn-icon" /> Change Company Email & App Password
          </button>
          <button className="admin-action-btn" onClick={() => openModal("deliveryAgentEmails")}>
            <FaInbox className="admin-btn-icon" /> Change Delivery Agent Emails
          </button>
        </div>

        {message && <p className="admin-message">{message}</p>}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h2>Update {field}</h2>
            <form onSubmit={handleSubmit}>
              {field === "username" && (
                <input
                  type="text"
                  name="username"
                  placeholder="New Username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              )}
              {field === "password" && (
                <input
                  type="password"
                  name="password"
                  placeholder="New Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              )}
              {field === "companyEmailAndPassword" && (
                <>
                  <input
                    type="email"
                    name="companyEmail"
                    placeholder="New Company Email"
                    value={formData.companyEmail}
                    onChange={handleChange}
                    required
                  />
                  <input
                    type="password"
                    name="companyEmailAppPassword"
                    placeholder="New Company Email App Password"
                    value={formData.companyEmailAppPassword}
                    onChange={handleChange}
                    required
                  />
                </>
              )}
              {field === "deliveryAgentEmails" && (
  <>
    <div className="email-section-header">
      <span className="icon-envelope"><FaEnvelope /></span>
      <span>Manage Delivery Agent Emails</span>
    </div>
    <div className="admin-divider" />

    <div className="email-list">
      {formData.deliveryAgentEmails.map((email, index) => (
        <div key={index} className="email-input-group">
          <input
            type="email"
            placeholder="e.g. agent@email.com"
            value={email}
            onChange={(e) => handleEmailChange(index, e.target.value)}
            required
            autoFocus={index === formData.deliveryAgentEmails.length - 1}
          />
          <button
            type="button"
            onClick={() => removeEmailField(index)}
            className="remove-email-btn"
            aria-label="Remove this email"
            tabIndex={0}
          >
            &times;
          </button>
        </div>
      ))}
    </div>

    <button
      type="button"
      onClick={addEmailField}
      className="add-email-btn"
      aria-label="Add email field"
      tabIndex={0}
    >
      <span>＋ Add Email</span>
    </button>
  </>
)}



              <button
                type="button"
                onClick={sendOtp}
                className="admin-otp-btn"
                disabled={resendTimer > 0}
              >
                {resendTimer > 0
                  ? `Resend OTP in ${resendTimer}s`
                  : "Send OTP"}
              </button>

              {otpStatus && (
                <p
                  className={`admin-otp-status ${
                    otpStatus.includes("Sending")
                      ? "sending"
                      : otpStatus.includes("✅")
                      ? "success"
                      : "error"
                  }`}
                >
                  {otpStatus}
                </p>
              )}

              <input
                type="text"
                name="otp"
                placeholder="Enter OTP"
                value={formData.otp}
                onChange={handleChange}
                required
              />

              <div className="admin-modal-actions">
                <button type="submit" className="admin-save-btn">Save</button>
                <button type="button" className="admin-cancel-btn" onClick={() => setModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccount;
