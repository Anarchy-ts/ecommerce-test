// src/pages/Charges.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./CSS/Charges.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL; 

// Create axios instance with auth header
const getAuthAxios = () => {
  const token = localStorage.getItem("adminToken"); // make sure token is stored on login
  return axios.create({
    baseURL: API_BASE,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const Charges = () => {
  const [charges, setCharges] = useState(null);

  const [deliveryCharge, setDeliveryCharge] = useState({
    freeUptoKm: 0,
    ratePerKm: 0,
  });
  const [otherCharges, setOtherCharges] = useState([]);

  // Modal state
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showOtherModal, setShowOtherModal] = useState(false);

  // Fetch charges on mount
  useEffect(() => {
    fetchCharges();
  }, []);

  const fetchCharges = async () => {
    try {
      const res = await axios.get(`${API_BASE}/charges`);
      setCharges(res.data);
      setDeliveryCharge(res.data.deliveryCharge);
      setOtherCharges(res.data.otherCharges || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Update Delivery Charges
  const updateDeliveryCharge = async () => {
    try {
      const authAxios = getAuthAxios();
      await authAxios.post(`/charges`, {
        deliveryCharge,
        otherCharges,
      });
      alert("Delivery charges updated successfully!");
      fetchCharges();
      setShowDeliveryModal(false);
    } catch (err) {
      console.error(err);
      alert("Error updating delivery charges");
    }
  };

  // Add new Other Charge
  const addOtherCharge = () => {
    setOtherCharges([...otherCharges, { name: "", percent: 0 }]);
  };

  // Update Other Charges
  const updateOtherCharges = async () => {
    try {
      const authAxios = getAuthAxios();
      await authAxios.post(`/charges`, {
        deliveryCharge,
        otherCharges,
      });
      alert("Other charges updated successfully!");
      fetchCharges();
      setShowOtherModal(false);
    } catch (err) {
      console.error(err);
      alert("Error updating other charges");
    }
  };

  // Delete a specific other charge
  const deleteOtherCharge = async (index, id) => {
    try {
      const authAxios = getAuthAxios();
      if (id) {
        await authAxios.delete(`/charges/other/${id}`);
      }
      const updated = [...otherCharges];
      updated.splice(index, 1);
      setOtherCharges(updated);
      fetchCharges();
    } catch (err) {
      console.error(err);
      alert("Error deleting other charge");
    }
  };

  return (
    <div className="charges-admin-container">
      <h2 className="charges-admin-title">Manage Charges</h2>

      <div className="charges-admin-button-group">
        <button
          className="charges-admin-button"
          onClick={() => setShowDeliveryModal(true)}
        >
          Manage Delivery Charges
        </button>
        <button
          className="charges-admin-button"
          onClick={() => setShowOtherModal(true)}
        >
          Manage Other Charges
        </button>
      </div>

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <div className="charges-admin-modal-overlay">
          <div className="charges-admin-modal">
            <h3 className="charges-admin-modal-title">Edit Delivery Charges</h3>
            <label className="charges-admin-label">
              Free up to (Km):
              <input
                type="number"
                className="charges-admin-input"
                value={deliveryCharge.freeUptoKm}
                onChange={(e) =>
                  setDeliveryCharge({
                    ...deliveryCharge,
                    freeUptoKm: e.target.value,
                  })
                }
              />
            </label>
            <label className="charges-admin-label">
              Rate per Km (after free limit):
              <input
                type="number"
                className="charges-admin-input"
                value={deliveryCharge.ratePerKm}
                onChange={(e) =>
                  setDeliveryCharge({
                    ...deliveryCharge,
                    ratePerKm: e.target.value,
                  })
                }
              />
            </label>
            <div className="charges-admin-modal-actions">
              <button
                className="charges-admin-button"
                onClick={updateDeliveryCharge}
              >
                Save
              </button>
              <button
                className="charges-admin-button cancel"
                onClick={() => setShowDeliveryModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Other Charges Modal */}
      {showOtherModal && (
        <div className="charges-admin-modal-overlay">
          <div className="charges-admin-modal">
            <h3 className="charges-admin-modal-title">Edit Other Charges</h3>
            {otherCharges.map((charge, index) => (
              <div
                key={charge._id || index}
                className="charges-admin-charge-row"
              >
                <input
                  type="text"
                  className="charges-admin-input"
                  placeholder="Charge Name"
                  value={charge.name}
                  onChange={(e) => {
                    const updated = [...otherCharges];
                    updated[index].name = e.target.value;
                    setOtherCharges(updated);
                  }}
                />
                <input
                  type="number"
                  className="charges-admin-input"
                  placeholder="%"
                  value={charge.percent}
                  onChange={(e) => {
                    const updated = [...otherCharges];
                    updated[index].percent = e.target.value;
                    setOtherCharges(updated);
                  }}
                />
                <button
                  className="charges-admin-delete-icon"
                  onClick={() => deleteOtherCharge(index, charge._id)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className="charges-admin-button add"
              onClick={addOtherCharge}
            >
              + Add Charge
            </button>
            <div className="charges-admin-modal-actions">
              <button
                className="charges-admin-button"
                onClick={updateOtherCharges}
              >
                Save
              </button>
              <button
                className="charges-admin-button cancel"
                onClick={() => setShowOtherModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Charges;
