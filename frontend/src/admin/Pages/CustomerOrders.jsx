// src/pages/admin/UsersOrders.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo.png";
import "./CSS/CustomerOrders.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [view, setView] = useState("pending");
  const [refundAmount, setRefundAmount] = useState("");
  const [showRefundOptions, setShowRefundOptions] = useState(false);

  // modal for download
  const [downloadModal, setDownloadModal] = useState(false);
  const [fileFormat, setFileFormat] = useState("excel"); // 'excel' or 'pdf'
  const [timeframe, setTimeframe] = useState("all"); // 'all','week','month','year','custom'
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // pagination for delivered
  const [deliveredLimit, setDeliveredLimit] = useState(20);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        if (!token) {
          setError("No admin token found. Please login again.");
          setLoading(false);
          return;
        }

        const res = await axios.get(`${API_BASE}/admin/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setOrders(res.data);
      } catch (err) {
        console.error("❌ Error fetching orders:", err);
        setError(
          err.response?.data?.message ||
            "Failed to fetch orders. Check backend."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleOpenModal = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.deliveryStatus);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    setNewStatus("");
    setRefundAmount("");
    setShowRefundOptions(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;

    try {
      setUpdating(true);
      const token = localStorage.getItem("adminToken");

      const res = await axios.put(
        `${API_BASE}/admin/orders/${selectedOrder._id}/delivery-status`,
        { deliveryStatus: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrders((prev) =>
        prev.map((order) =>
          order._id === selectedOrder._id
            ? { ...order, deliveryStatus: res.data.deliveryStatus }
            : order
        )
      );

      handleCloseModal();
    } catch (err) {
      console.error("❌ Error updating status:", err);
      alert("Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  // filter orders
  const deliveredOrders = orders.filter((o) => o.deliveryStatus === "Delivered");
  const refundedOrders = orders.filter(
    (o) => o.status === "Refunded" || o.status === "Partially Refunded"
  );

  const filteredOrders =
    view === "pending"
      ? orders.filter(
          (o) =>
            o.deliveryStatus !== "Delivered" &&
            o.status !== "Refunded" &&
            o.status !== "Partially Refunded"
        )
      : view === "delivered"
      ? deliveredOrders.slice(0, deliveredLimit)
      : refundedOrders;

  // utility: filter orders by timeframe
  const filterByTimeframe = (ordersList, timeframeArg, customStartArg, customEndArg) => {
    // make copy of now so we don't mutate outside
    const now = new Date();
    let cutoff;

    if (timeframeArg === "week") {
      cutoff = new Date();
      cutoff.setDate(now.getDate() - 7);
    } else if (timeframeArg === "month") {
      cutoff = new Date();
      cutoff.setMonth(now.getMonth() - 1);
    } else if (timeframeArg === "year") {
      cutoff = new Date();
      cutoff.setFullYear(now.getFullYear() - 1);
    } else if (timeframeArg === "custom" && customStartArg && customEndArg) {
      const start = new Date(customStartArg);
      const end = new Date(customEndArg);
      // include end day's entire day
      end.setHours(23, 59, 59, 999);
      return ordersList.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= start && d <= end;
      });
    } else {
      // 'all' or invalid -> return original
      return ordersList;
    }

    return ordersList.filter((o) => new Date(o.createdAt) >= cutoff);
  };

  // download Excel
  const downloadExcel = (timeframeArg = "all", customStartArg, customEndArg) => {
    const filtered = filterByTimeframe(deliveredOrders, timeframeArg, customStartArg, customEndArg);
    const data = filtered.map((o) => ({
      OrderID: o._id,
      Customer: o.name,
      Email: o.email,
      Items: o.items.map((i) => `${i.productName} (${i.size}) × ${i.quantity}`).join(", "),
      TotalPrice: o.totalPrice,
      Address: o.deliveryAddress?.formattedAddress || "",
      Status: o.status,
      DeliveryStatus: o.deliveryStatus,
      Date: new Date(o.createdAt).toLocaleString(),
    }));

    if (data.length === 0) {
      alert("No delivered orders found for the selected timeframe.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DeliveredOrders");
    const filename = `DeliveredOrders_${timeframeArg === "custom" ? `${customStartArg}_to_${customEndArg}` : timeframeArg}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // download PDF
  const downloadPDF = (timeframeArg = "all", customStartArg, customEndArg) => {
    const filtered = filterByTimeframe(deliveredOrders, timeframeArg, customStartArg, customEndArg);

    if (filtered.length === 0) {
      alert("No delivered orders found for the selected timeframe.");
      return;
    }

    const data = filtered.map((o) => [
      o._id,
      o.name,
      o.email,
      o.items.map((i) => `${i.productName} (${i.size}) × ${i.quantity}`).join(", "),
      "INR " + o.totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      o.deliveryAddress?.formattedAddress || "",
      o.status,
      o.deliveryStatus,
      new Date(o.createdAt).toLocaleString(),
    ]);

    const totalRevenue = filtered.reduce((sum, o) => sum + o.totalPrice, 0);

    const doc = new jsPDF({ orientation: "landscape" });

    // Logo
    try {
      doc.addImage(logo, "PNG", 14, 10, 35, 20);
    } catch (err) {
      // if logo is not a base64/data URL (e.g., imported as path) addImage may fail in build; ignore to avoid crash
      // console.warn("Logo render failed for PDF:", err);
    }

    // Title
    doc.setFontSize(16);
    doc.text(
      "Ecommerce Shopping - Delivered Orders Report",
      doc.internal.pageSize.getWidth() / 2,
      20,
      { align: "center" }
    );

    // Date
    doc.setFontSize(10);
    doc.text(
      `Generated on: ${new Date().toLocaleString()}`,
      doc.internal.pageSize.getWidth() / 2,
      28,
      { align: "center" }
    );

    autoTable(doc, {
      head: [[
        "Order ID",
        "Customer",
        "Email",
        "Items",
        "Total Price",
        "Address",
        "Status",
        "Delivery Status",
        "Date",
      ]],
      body: data,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 45 },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 50 },
        6: { cellWidth: 20 },
        7: { cellWidth: 30 },
        8: { cellWidth: 30 },
      },
      tableWidth: "auto",
      margin: { left: 5, right: 5 },
      didDrawPage: (dataArg) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(9);
        doc.text(
          `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - 50,
          doc.internal.pageSize.getHeight() - 10
        );
      },
    });

    doc.setFontSize(12);
    doc.text(
      `Total Revenue: INR ${totalRevenue.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}`,
      doc.internal.pageSize.getWidth() - 100,
      doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : doc.internal.pageSize.getHeight() - 30
    );

    const filename = `DeliveredOrders_${timeframeArg === "custom" ? `${customStartArg}_to_${customEndArg}` : timeframeArg}.pdf`;
    doc.save(filename);
  };

  const handleDownload = () => {
    if (timeframe === "custom") {
      if (!customStart || !customEnd) {
        return alert("Please select both start and end dates for custom timeframe.");
      }
      const startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      if (startDate > endDate) {
        return alert("Start date cannot be after end date.");
      }
      // convert to yyyy-mm-dd for filename safety
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);

      if (fileFormat === "excel") {
        downloadExcel("custom", startStr, endStr);
      } else {
        downloadPDF("custom", startStr, endStr);
      }
    } else {
      if (fileFormat === "excel") {
        downloadExcel(timeframe);
      } else {
        downloadPDF(timeframe);
      }
    }
    setDownloadModal(false);
    // reset custom inputs to avoid surprise later
    setCustomStart("");
    setCustomEnd("");
    setTimeframe("all");
    setFileFormat("excel");
  };

  // UI helpers
  const deliveredCountForSelectedFrame = () => {
    const filtered = filterByTimeframe(deliveredOrders, timeframe, customStart, customEnd);
    return filtered.length;
  };

  return (
    <div className="admin-orders-page">
      <h2>Customer Orders</h2>

      {/* Toggle Buttons */}
      <div className="orders-toggle-buttons">
        <button
          className={view === "pending" ? "active" : ""}
          onClick={() => setView("pending")}
        >
          Pending Orders
        </button>
        <button
          className={view === "delivered" ? "active" : ""}
          onClick={() => {
            setView("delivered");
            setDeliveredLimit(20);
          }}
        >
          Delivered Orders
        </button>
        <button
          className={view === "refunded" ? "active" : ""}
          onClick={() => setView("refunded")}
        >
          Refunded Orders
        </button>
      </div>

      {/* Download Button only for Delivered */}
      {view === "delivered" && deliveredOrders.length > 0 && (
        <div className="download-section">
          <button onClick={() => setDownloadModal(true)}>📥 Download Orders</button>
        </div>
      )}

      {loading ? (
        <p>Loading orders...</p>
      ) : error ? (
        <p className="admin-error-message">{error}</p>
      ) : filteredOrders.length === 0 ? (
        <p>No {view} orders found.</p>
      ) : (
        <>
          <div className="admin-orders-table-container">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Items</th>
                  <th>Total Price</th>
                  <th>Delivery Address</th>
                  <th>Status</th>
                  <th>Delivery Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order._id}>
                    <td>{order._id}</td>
                    <td>{order.name}</td>
                    <td>{order.email}</td>
                    <td>
                      <ul>
                        {order.items.map((item, idx) => (
                          <li key={idx}>
                            {item.productName} ({item.size}) × {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      {order.totalPrice.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </td>
                    <td>
                      {order.deliveryAddress.fullName},{" "}
                      {order.deliveryAddress.phone},{" "}
                      {order.deliveryAddress.street},{" "}
                      {order.deliveryAddress.landmark},{" "}
                      {order.deliveryAddress.city},{" "}
                      {order.deliveryAddress.state},{" "}
                      {order.deliveryAddress.postalCode},{" "}
                      {order.deliveryAddress.formattedAddress},{" "}
                      <br />
                      <a
                        href={order.deliveryAddress.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="map-link"
                      >
                        📍 View on Map
                      </a>
                    </td>
                    <td>{order.status}</td>
                    <td>{order.deliveryStatus}</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>
                      {order.status !== "Refunded" && order.status !== "Partially Refunded" && (
                        <button onClick={() => handleOpenModal(order)}>Update</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {view === "delivered" && deliveredOrders.length > deliveredLimit && (
            <div className="download-section">
              <button onClick={() => setDeliveredLimit(deliveredLimit + 20)}>
                ⬇️ Load More
              </button>
            </div>
          )}
        </>
      )}

      {/* Update Order Modal */}
      {selectedOrder && (
        <div className="admin-orders-modal-overlay">
          <div className="admin-orders-modal">
            <h3>Update Order</h3>
            <p>
              Order ID: <strong>{selectedOrder._id}</strong>
            </p>

            <label>
              Delivery Status:
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={
                  updating ||
                  selectedOrder.status === "Refunded" ||
                  selectedOrder.status === "Partially Refunded"
                }
              >
                <option value="Received">Received</option>
                <option value="Preparing">Preparing</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
              </select>
            </label>

            {selectedOrder.status === "Paid" && view !== "refunded" && (
              <div className="refund-section">
                <h4>Refund</h4>
                {!showRefundOptions ? (
                  <button
                    className="refund-btn refund-toggle"
                    onClick={() => setShowRefundOptions(true)}
                    disabled={updating}
                  >
                    💸 Refund
                  </button>
                ) : (
                  <div className="refund-options">
                    <button
                      className="refund-btn full-refund"
                      onClick={async () => {
                        const confirmRefund = window.confirm(
                          `Refund full amount ₹${selectedOrder.totalPrice}?`
                        );
                        if (!confirmRefund) return;
                        try {
                          setUpdating(true);
                          const token = localStorage.getItem("adminToken");
                          const res = await axios.put(
                            `${API_BASE}/admin/orders/${selectedOrder._id}/refund`,
                            {},
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          setOrders((prev) =>
                            prev.map((order) =>
                              order._id === selectedOrder._id ? res.data.order : order
                            )
                          );
                          alert("✅ Full refund processed");
                          handleCloseModal();
                        } catch (err) {
                          console.error("Refund error:", err);
                          alert(err.response?.data?.message || "Refund failed");
                        } finally {
                          setUpdating(false);
                        }
                      }}
                      disabled={updating}
                    >
                      {updating ? "Processing..." : "💰 Full Refund"}
                    </button>

                    <div className="partial-refund">
                      <input
                        type="number"
                        placeholder={`Max: ₹${selectedOrder.totalPrice}`}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        min="1"
                        max={selectedOrder.totalPrice}
                        disabled={updating}
                      />
                      <button
                        className="refund-btn partial-refund-btn"
                        onClick={async () => {
                          if (!refundAmount || refundAmount <= 0) {
                            return alert("Enter a valid refund amount");
                          }
                          const confirmRefund = window.confirm(
                            `Refund partial amount ₹${refundAmount}?`
                          );
                          if (!confirmRefund) return;
                          try {
                            setUpdating(true);
                            const token = localStorage.getItem("adminToken");
                            const res = await axios.put(
                              `${API_BASE}/admin/orders/${selectedOrder._id}/refund`,
                              { refundAmount },
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            setOrders((prev) =>
                              prev.map((order) =>
                                order._id === selectedOrder._id ? res.data.order : order
                              )
                            );
                            alert("✅ Partial refund processed");
                            handleCloseModal();
                          } catch (err) {
                            console.error("Refund error:", err);
                            alert(err.response?.data?.message || "Refund failed");
                          } finally {
                            setUpdating(false);
                          }
                        }}
                        disabled={updating}
                      >
                        {updating ? "Processing..." : "↩️ Partial Refund"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="admin-orders-modal-actions">
              <button onClick={handleCloseModal} disabled={updating}>
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={
                  updating ||
                  selectedOrder.status === "Refunded" ||
                  selectedOrder.status === "Partially Refunded"
                }
              >
                {updating ? "Updating..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal (NEW) */}
      {downloadModal && (
        <div className="admin-orders-modal-overlay">
          <div className="admin-orders-modal" style={{ maxWidth: 640 }}>
            <h3>Download Delivered Orders</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 6 }}>Format</label>
              <label style={{ marginRight: 12 }}>
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={fileFormat === "excel"}
                  onChange={() => setFileFormat("excel")}
                />{" "}
                Excel (.xlsx)
              </label>
              <label>
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={fileFormat === "pdf"}
                  onChange={() => setFileFormat("pdf")}
                />{" "}
                PDF
              </label>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 6 }}>Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="year">Last 1 year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {timeframe === "custom" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>Start</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>End</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div style={{ marginTop: 8, marginBottom: 8, fontSize: 14 }}>
              <strong>{deliveredCountForSelectedFrame()}</strong>{" "}
              delivered order(s) will be included in this export.
            </div>

            <div className="admin-orders-modal-actions">
              <button
                onClick={() => {
                  setDownloadModal(false);
                  setTimeframe("all");
                  setCustomStart("");
                  setCustomEnd("");
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                disabled={deliveredCountForSelectedFrame() === 0}
                title={deliveredCountForSelectedFrame() === 0 ? "No delivered orders in timeframe" : "Download"}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrders;
