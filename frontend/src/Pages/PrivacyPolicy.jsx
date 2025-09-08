import React from "react";
import "./CSS/Policy.css"; // you can reuse the same style for all policy pages

const PrivacyPolicy = () => {
  return (
    <div className="policy-container">
      <h1>Privacy Policy</h1>
      <p>
        At <strong>ECOMMERCE SHOPPING</strong>, we are committed to protecting your
        privacy. This Privacy Policy explains how we collect, use, and safeguard
        your information when you visit our website or make purchases from us.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        We may collect personal information such as your name, phone number,
        email address, billing/delivery address, and payment details when you
        place an order.
      </p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To process and deliver your orders</li>
        <li>To send order updates, invoices, and support messages</li>
        <li>To improve our services and customer experience</li>
        <li>To comply with legal and regulatory requirements</li>
      </ul>

      <h2>3. Sharing of Information</h2>
      <p>
        We do not sell or rent your personal data. We may share information only
        with trusted third parties like payment gateways (Razorpay) and delivery
        partners, strictly for order fulfillment.
      </p>

      <h2>4. Data Security</h2>
      <p>
        We use secure technologies and industry best practices to protect your
        data. However, no online transmission can be guaranteed 100% secure.
      </p>

      <h2>5. Cookies</h2>
      <p>
        Our website may use cookies to enhance your browsing experience and
        analyze site traffic.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        You can request access, correction, or deletion of your personal data by
        contacting us at <strong>capeela7@gmail.com</strong>.
      </p>

      <h2>7. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy, please reach out to us
        at: <br />
        <strong>ECOMMERCE SHOPPING</strong> <br />
        Example address <br />
        Phone: +91 12345 6789
      </p>

      <p className="last-updated">
        📅 Last Updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
};

export default PrivacyPolicy;
