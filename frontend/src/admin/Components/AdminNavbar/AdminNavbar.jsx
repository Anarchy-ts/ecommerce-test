// src/components/AdminNavbar.jsx
import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FaUserCircle } from "react-icons/fa"   // ✅ user icon
import "./AdminNavbar.css"

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const AdminNavbar = () => {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("isAdmin")
    navigate("/admin/login")
  }

  return (
    <nav className="admin-navbar">
      {/* Left - Logo / Title */}
      <h2>
        <Link to="/admin/dashboard" className="admin-logo-link">
          Admin Panel
        </Link>
      </h2>

      {/* Center - Nav links */}
      <ul className={`admin-nav-links ${menuOpen ? "show" : ""}`}>
        <li><Link to="/admin/add-product">Add Product</Link></li>
        <li><Link to="/admin/existing-products">Existing Products</Link></li>
        <li><Link to="/admin/promo-codes">Promo Codes</Link></li>
        <li><Link to="/admin/customer-orders">Customer Orders</Link></li>  
        <li><Link to="/admin/deliverable-addresses">Deliverable Areas</Link></li>
        <li><Link to="/admin/charges">Delivery Charges</Link></li>
      </ul>

      {/* Right - Account (icon) + Logout + Hamburger */}
      <div className="admin-right-section">
        <button
          className="admin-account-icon"
          onClick={() => navigate("/admin/account")}
        >
          <FaUserCircle size={22} />
        </button>
        <button className="admin-logout-btn" onClick={handleLogout}>
          Logout
        </button>
        <div
          className={`admin-hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  )
}

export default AdminNavbar
