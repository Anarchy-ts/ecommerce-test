// src/pages/Orders.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./CSS/Orders.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("current");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(res.data);
      } catch (err) {
        setError("Failed to fetch orders");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <div className="orders-loading">Loading your orders...</div>;
  if (error) return <div className="orders-error">{error}</div>;

  const deliverySteps = ["Received", "Preparing", "Out for Delivery", "Delivered"];

  // ✅ Split orders cleanly
  const refundedOrders = orders.filter((o) =>
    ["Refunded", "Partially Refunded"].includes(o.status)
  );
  const deliveredOrders = orders.filter(
    (o) => o.deliveryStatus === "Delivered" && !refundedOrders.includes(o)
  );
  const currentOrders = orders.filter(
    (o) => o.deliveryStatus !== "Delivered" && !refundedOrders.includes(o)
  );

  // ✅ Which list to show
  let displayedOrders = [];
  if (activeTab === "current") displayedOrders = currentOrders;
  if (activeTab === "past") displayedOrders = deliveredOrders;
  if (activeTab === "refunded") displayedOrders = refundedOrders;

  return (
    <div className="orders-page">
      <h2 className="orders-title">📦 My Orders</h2>

      {/* ✅ Toggle Buttons */}
      <div className="order-tabs">
        <button
          className={`order-tab ${activeTab === "current" ? "active" : ""}`}
          onClick={() => setActiveTab("current")}
        >
          Current Orders
        </button>
        <button
          className={`order-tab ${activeTab === "past" ? "active" : ""}`}
          onClick={() => setActiveTab("past")}
        >
          Delivered Orders
        </button>
        <button
          className={`order-tab ${activeTab === "refunded" ? "active" : ""}`}
          onClick={() => setActiveTab("refunded")}
        >
          Refunded Orders
        </button>
      </div>

      {displayedOrders.length === 0 ? (
        <p className="orders-empty">
          {activeTab === "current"
            ? "You don’t have any current orders."
            : activeTab === "past"
            ? "No past orders found."
            : "No refunded orders."}
        </p>
      ) : (
        <div className="orders-list">
          {displayedOrders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <span className={`order-payment status-${order.status.toLowerCase()}`}>
                  Payment: {order.status}
                </span>

                <span
                  className={`order-delivery status-${order.deliveryStatus.toLowerCase()}`}
                >
                  Status: {order.deliveryStatus}
                </span>

                <span className="order-date">
                  {new Date(order.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="order-items">
                {order.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <span className="item-name">{item.productName}</span>
                    <span className="item-size">({item.size})</span>
                    <span className="item-qty">x{item.quantity}</span>
                    <span className="item-price">₹{item.price}</span>
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <div className="delivery-address">
                  <strong>Deliver to:</strong> {order.deliveryAddress.fullName},{" "}
                  {order.deliveryAddress.phone},{" "}
                  {order.deliveryAddress.formattedAddress},{" "}
                  <a
                    href={order.deliveryAddress.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="cust-map-link"
                  >
                    📍 View on Map
                  </a>
                </div>
                <div className="order-total">
                  Total: <span>₹{order.totalPrice}</span>
                </div>
              </div>

              {/* 🚚 Tracking or Refund Info */}
              {["Refunded", "Partially Refunded"].includes(order.status) ? (
                <div
                  className={`order-refunded status-${order.status
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  <h4>
                    💸 {order.status}
                    {order.refund?.amount > 0 && (
                      <span className="refund-amount"> – ₹{order.refund.amount}</span>
                    )}
                  </h4>
                  <p>
                    This order has been {order.status.toLowerCase()}. <br />
                    Amount will be credited within 5-7 working days.
                  </p>
                </div>
              ) : (
                order.deliveryStatus !== "Delivered" && (
                  <div className="order-tracking">
                    <h4>Track Delivery</h4>
                    <div className="tracking-steps">
                      {deliverySteps.map((step, idx) => {
                        const currentIndex = deliverySteps.indexOf(order.deliveryStatus);
                        return (
                          <div
                            key={idx}
                            className={`tracking-step ${
                              idx === currentIndex ? "active" : ""
                            } ${idx < currentIndex ? "completed" : ""}`}
                          >
                            <span className="step-dot"></span>
                            <span className="step-label">{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
