// src/components/AddressModal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AddressModal.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const AddressModal = ({ onClose, onConfirm, onAddressChange }) => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // 🔹 Fetch addresses
  const fetchAddresses = async () => {
    try {
      const res = await fetch(`${API_BASE}/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      const addrList = data.addresses || [];
      setAddresses(addrList);

      // Auto-select: backend selectedAddress → else default → else first
      const autoSelect =
        data.selectedAddress ||
        (addrList.find((a) => a.isDefault)?._id || addrList[0]?._id || null);

      setSelectedAddress(autoSelect);
    } catch (err) {
      console.error("Error fetching addresses:", err);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Delete address
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      await fetch(`${API_BASE}/addresses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAddresses();
    } catch (err) {
      console.error("Error deleting address:", err);
    }
  };

  // Select address and notify Cart immediately
  const handleSelect = async (addr) => {
    try {
      const res = await fetch(`${API_BASE}/addresses/select/${addr._id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to select address");

      setSelectedAddress(addr._id);

      // Notify Cart immediately with full address object
      if (onAddressChange) onAddressChange(addr);
    } catch (err) {
      console.error("Error selecting address:", err);
    }
  };

  return (
    <div className="cust-modal-overlay">
      <div className="cust-modal-content">
        <h2>Select Delivery Address</h2>

        {/* Edit Addresses button */}
        {addresses.length > 0 && (
          <div className="cust-edit-all-top">
            <button onClick={() => navigate("/address")}>
              ✏️ Edit Addresses
            </button>
          </div>
        )}

        {addresses.length === 0 ? (
          <div className="cust-no-address">
            <p>No addresses saved yet.</p>
            <button
              className="cust-add-address-btn"
              onClick={() => navigate("/address")}
            >
              ➕ Add Address
            </button>
          </div>
        ) : (
          <div className="cust-address-list">
            {addresses.map((addr) => (
              <div
                key={addr._id}
                className={`cust-address-card ${
                  selectedAddress === addr._id ? "selected" : ""
                }`}
              >
                <p>
                  <b>{addr.label}</b> - {addr.fullName} ({addr.phone})
                </p>
                <p>
                  {addr.formattedAddress ||
                    `${addr.street}, ${
                      addr.landmark ? addr.landmark + ", " : ""
                    }${addr.city}, ${addr.state}, ${addr.postalCode}, ${
                      addr.country
                    }`}
                </p>
                {addr.mapUrl && (
                  <a
                    href={addr.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p2-map-link"
                  >
                    📍 View on Google Maps
                  </a>
                )}
                {addr.isDefault && <span>⭐ Default</span>}
                <div className="cust-address-actions">
                  <button onClick={() => handleSelect(addr)}>Deliver Here</button>
                  <button onClick={() => handleDelete(addr._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Footer */}
        <div className="cust-modal-actions">
          <button className="cust-back-btn" onClick={onClose}>
            ⬅ Back to Cart
          </button>
          <button
            className="cust-close-btn"
            disabled={!selectedAddress}
            onClick={() => {
              const chosenAddr = addresses.find(
                (a) => a._id === selectedAddress
              );
              if (chosenAddr) {
                onConfirm(chosenAddr); // send chosen address to Cart
                onClose();
              }
            }}
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressModal;
