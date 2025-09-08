import React from "react"
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa"
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa"
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        
        {/* About Section */}
        <div className="footer-section">
          <h3>About Us</h3>
          <p>
            Welcome to <strong>Ecommerce Shopping</strong> 🛒 — your one-stop shop for
            authentic Indian products. Made with love,
            delivered with care.
          </p>
        </div>

        {/* Contact Section */}
        <div className="footer-section">
          <h3>Contact Us</h3>
          <p className="contact-item"><FaPhone /> +91 12345 6789</p>
          <p className="contact-item"><FaPhone /> +91 12345 6789</p>
          <p className="contact-item"><FaEnvelope /> example@gmail.com </p>
          <p className="contact-item">
            <FaMapMarkerAlt /> Address line1, line2, City, State-123456
          </p>
        </div>

        {/* Social Section */}
        <div className="footer-section">
          <h3>Follow Us</h3>
          <div className="social-icons">
            <a href="https://facebook.com" target="_blank" rel="noreferrer">
              <FaFacebook />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              <FaInstagram />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer">
              <FaTwitter />
            </a>
          </div>
        </div>

        {/* Policies Section */}
        <div className="footer-section">
          <h3>Policies</h3>
          <ul className="footer-links">
            <li>
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
              >
                Terms & Conditions
              </a>
            </li>
            <li>
              <a href="/privacy-policy">Privacy Policy</a>
            </li>   

            <li>
              <a
                href="/cancellation-policy"
                target="_blank"
                rel="noreferrer"
              >
                Cancellation & Refund Policy
              </a>
            </li>
            <li>
              <a
                href="/shipping-policy"
                target="_blank"
                rel="noreferrer"
              >
                Shipping Policy
              </a>
            </li>
          </ul>
        </div>

      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} Ecommerce Shopping. All rights reserved.
      </div>
    </footer>
  )
}

export default Footer
