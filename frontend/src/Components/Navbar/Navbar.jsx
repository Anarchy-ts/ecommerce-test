// src/components/Navbar/Navbar.jsx
import React, { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import cartIcon from "../../assets/cart_icon.png"; 
import { Menu, X } from "lucide-react"; // ✅ hamburger + close icons
import "./Navbar.css";
import { ShopContext } from "../../Context/ShopContext";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart, setToken, cartArray } = useContext(ShopContext);

  const [menuOpen, setMenuOpen] = useState(false); // 🔥 mobile menu state
  const token = localStorage.getItem("token");

  const totalItems = cartArray.reduce((sum, item) => sum + item.count, 0);

  const handleLogout = () => {
    localStorage.removeItem("token");
    clearCart();
    setToken(null);
    navigate("/login");
  };

  // ✅ Special case: On /payment page
  if (location.pathname === "/payment") {
    return (
      <nav className="navbar payment-nav">
        <div className="navbar-left">
          <img src={logo} alt="Logo" className="logo-img" />
          <h2 className="logo-text">Ecommerce Shopping</h2>
        </div>
        <div className="nav-links">
          <button 
            onClick={() => navigate("/cart")} 
            className="back-btn"
          >
            ⬅ Back to Cart
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img src={logo} alt="Logo" className="logo-img" />
        <h2 className="logo-text">Ecommerce Shopping</h2>
      </div>

      {/* 🔥 Toggle button only visible on mobile */}
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={26} /> : <Menu size={26} />}
      </button>

      {/* 🔥 Desktop + Mobile Menu */}
      <div className={`nav-links ${menuOpen ? "open" : ""}`}>
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>
          Home
        </Link>

        {token ? (
          <>
            <button 
              onClick={() => navigate("/orders")} 
              className={`orders-btn ${location.pathname === "/orders" ? "active" : ""}`}
            >
              My Orders
            </button>
            <button 
              onClick={() => navigate("/address")} 
              className="address-btn"
            >
              Address
            </button>
            <button 
              onClick={handleLogout} 
              className="logout-btn"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className={location.pathname === "/login" ? "active" : ""}
          >
            Login
          </Link>
        )}

        <Link
          to="/cart"
          className={`cart-link ${location.pathname === "/cart" ? "active" : ""}`}
        >
          <img src={cartIcon} alt="Cart" className="cart-icon" />
          {location.pathname !== "/cart" && totalItems > 0 && (
            <span className="cart-badge">{totalItems}</span>
          )}
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
