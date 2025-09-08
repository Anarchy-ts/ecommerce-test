// src/pages/Payment.jsx
import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./CSS/Payment.css";
import { ShopContext } from "../Context/ShopContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.orderData || null);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const { clearCart: clearCartContext } = useContext(ShopContext);

  // ✅ modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState(
    "Please wait while we confirm your order..."
  );

  // 🔹 Fetch selected address
  useEffect(() => {
    const fetchSelectedAddress = async () => {
      try {
        const res = await axios.get(`${API_BASE}/addresses`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const { addresses, selectedAddress } = res.data;

        if (!addresses || addresses.length === 0) {
          alert("❌ No delivery address found. Please add one.");
          navigate("/address");
          return;
        }

        const chosen =
          addresses.find((a) => a._id === selectedAddress) || addresses[0];

        setSelectedAddress(chosen);
        setOrder((prev) =>
          prev ? { ...prev, deliveryAddress: chosen } : prev
        );
      } catch (err) {
        console.error("Error fetching selected address:", err);
      }
    };

    fetchSelectedAddress();
  }, [navigate]);

  const loadRazorpayScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const clearCart = async () => {
    try {
      await axios.post(
        `${API_BASE}/cart/clear`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      clearCartContext();
    } catch (err) {
      console.error("❌ Failed to clear cart:", err);
    }
  };

  const sendOrderMails = async (orderId) => {
    try {
      setShowModal(true);
      setModalMessage("Please wait while we confirm your order...");

      await axios.post(
        `${API_BASE}/orders/send-mails`,
        { orderId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      setModalMessage("✅ Order Confirmed! Redirecting...");
      setTimeout(() => {
        setShowModal(false);
        navigate("/");
      }, 800);
    } catch (err) {
      console.error("❌ Failed to send mails:", err);
      setModalMessage(
        "❌ Something went wrong. Please check your order in 'My Orders'."
      );
      setTimeout(() => {
        setShowModal(false);
        navigate("/orders");
      }, 800);
    }
  };

  const handlePay = async () => {
    if (!order || !selectedAddress) {
      alert("❌ Missing order or delivery address.");
      return;
    }

    const res = await loadRazorpayScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );
    if (!res) {
      alert("Razorpay SDK failed to load.");
      return;
    }

    try {
      // Step 1: Create Razorpay order
      const { data: paymentOrder } = await axios.post(
        `${API_BASE}/payment/orders`,
        { amount: order.totalPrice },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      if (!paymentOrder.id) {
        alert("❌ Failed to create payment order.");
        return;
      }

      // Step 2: Create DB Order with razorpay_order_id (Pending)
      const { data: savedOrder } = await axios.post(
        `${API_BASE}/orders`,
        {
          ...order,
          deliveryAddress: selectedAddress,
          razorpay_order_id: paymentOrder.id,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      // Step 3: Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "Ecommerce Shopping",
        description: "Order Payment",
        order_id: paymentOrder.id,
        handler: async function (response) {
          try {
            const verifyRes = await axios.post(
              `${API_BASE}/payment/verify`,
              response,
              { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );

            if (verifyRes.data.success) {
              // Order status is updated in backend verify → Paid
              await clearCart();
              await sendOrderMails(savedOrder._id);
            } else {
              alert("❌ Payment Verification Failed!");
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("❌ Payment verification failed.");
          }
        },
        prefill: {
          name: selectedAddress?.fullName,
          email: order.email,
          contact: selectedAddress?.phone,
        },
        theme: { color: "#3399cc" },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed. Try again.");
    }
  };

  return (
    <div className="payment-container">
      <h2>Choose Payment Method</h2>

      {order && selectedAddress ? (
        <>
          <div className="payment-summary">
            <p>
              <strong>Deliver to:</strong> {selectedAddress.fullName},{" "}
              {selectedAddress.phone}
            </p>
            <p>{selectedAddress.formattedAddress}</p>
            <p>
              <a
                href={selectedAddress.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="pay-map-link-btn"
              >
                📍 View on Map
              </a>
            </p>
            <p>
              <strong>Total Price:</strong> ₹{order.totalPrice}
            </p>
          </div>

          <button className="pay-btn" onClick={handlePay}>
            Pay ₹{order.totalPrice}
          </button>
        </>
      ) : (
        <p>Loading order & address...</p>
      )}

      {showModal && (
        <div className="pay-modal-overlay">
          <div className="pay-modal-content">
            {modalMessage.startsWith("Please") ? (
              <div className="pay-loader"></div>
            ) : (
              <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🎉</div>
            )}
            <p>{modalMessage}</p>
          </div>
        </div>
      )}

      <div className="payment-policies">
        <p style={{ fontSize: "0.85rem", marginTop: "10px" }}>
          By proceeding, you agree to our{" "}
          <a href="/terms" target="_blank" rel="noreferrer">
            Terms & Conditions
          </a>
          ,{" "}
          <a href="/cancellation-policy" target="_blank" rel="noreferrer">
            Cancellation & Refund Policy
          </a>
          ,{" "}
          <a href="/shipping-policy" target="_blank" rel="noreferrer">
            Shipping Policy
          </a>{" "}
          and{" "}
          <a href="/privacy-policy" target="_blank" rel="noreferrer">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default Payment;
