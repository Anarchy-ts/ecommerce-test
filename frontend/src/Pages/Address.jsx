// src/pages/Address.jsx
import React, { useEffect, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./CSS/Address.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const Address = () => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null); // store which address to delete

  // 📌 Form state
  const [form, setForm] = useState({
    label: "Home",
    customLabel: "",
    fullName: "",
    phone: "",
    street: "",
    landmark: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    formattedAddress: "",
    latitude: 20.5937,
    longitude: 78.9629,
    placeId: "",
    mapUrl: "",
    isDefault: false,
  });

  const token = localStorage.getItem("token");
  const pickerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // ---------- Helpers ----------
  const updateMap = (lat, lng) => {
    if (mapRef.current?.map && markerRef.current) {
      const pos = { lat, lng };
      markerRef.current.setPosition(pos);
      mapRef.current.map.setCenter(pos);
    }
  };

  // 🔹 Fetch all addresses
  const fetchAddresses = async () => {
    try {
      const res = await fetch(`${API_BASE}/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAddresses(data.addresses || []);
      setSelectedAddress(data.selectedAddress || null);
    } catch (err) {
      console.error("Error fetching addresses:", err);
      toast.error("⚠️ Failed to fetch addresses");
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // 📍 Place picker listener
  useEffect(() => {
    if (!showForm || !pickerRef.current) return;
    const picker = pickerRef.current;

    const handlePlaceChange = () => {
      const place = pickerRef.current.value;
      if (!place?.location) return;

      const components = place.addressComponents || [];
      const getComponent = (type) =>
        components.find((c) => c.types.includes(type))?.longText || "";

      const lat = place.location.lat();
      const lng = place.location.lng();

      setForm((prev) => ({
        ...prev,
        street: getComponent("route") || place.displayName?.text || "",
        city: getComponent("locality"),
        state: getComponent("administrative_area_level_1"),
        postalCode: getComponent("postal_code"),
        country: getComponent("country") || "India",
        formattedAddress: place.formattedAddress || place.displayName?.text,
        latitude: lat,
        longitude: lng,
        placeId: place.id || "",
        mapUrl: `https://maps.google.com/maps?q=${lat},${lng}`,
      }));

      updateMap(lat, lng);
    };

    picker.addEventListener("gmpx-placechange", handlePlaceChange);
    return () =>
      picker.removeEventListener("gmpx-placechange", handlePlaceChange);
  }, [showForm]);

  // ---------- Map + Marker init ----------
  useEffect(() => {
    if (!showForm || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: Number(form.latitude), lng: Number(form.longitude) },
      zoom: 14,
    });

    const marker = new window.google.maps.Marker({
      position: { lat: Number(form.latitude), lng: Number(form.longitude) },
      map,
      draggable: true,
    });

    marker.addListener("dragend", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setForm((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        mapUrl: `https://maps.google.com/maps?q=${lat},${lng}`,
      }));
    });

    mapRef.current.map = map;
    markerRef.current = marker;
  }, [showForm]);

  // Sync map when lat/lng changes
  useEffect(() => {
    if (markerRef.current && mapRef.current?.map) {
      const pos = { lat: Number(form.latitude), lng: Number(form.longitude) };
      if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return;
      markerRef.current.setPosition(pos);
      mapRef.current.map.setCenter(pos);
    }
  }, [form.latitude, form.longitude]);

  // 🔹 Handle input
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔹 Add / Update
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE}/addresses/${editingId}`
        : `${API_BASE}/addresses`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          label: form.label === "Other" ? form.customLabel : form.label,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message || "❌ Unable to save address");
        return;
      }

      // ✅ Success
      toast.success(editingId ? "Address updated!" : "Address saved!");
      setForm({
        label: "Home",
        customLabel: "",
        fullName: "",
        phone: "",
        street: "",
        landmark: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
        formattedAddress: "",
        latitude: 20.5937,
        longitude: 78.9629,
        placeId: "",
        mapUrl: "",
        isDefault: false,
      });
      setEditingId(null);
      setShowForm(false);
      fetchAddresses();
    } catch (err) {
      console.error("Error saving address:", err);
      toast.error("⚠️ Network or server error");
    }
  };

  // 🔹 Delete
  const handleDelete = async (id) => {
    setDeleteId(id); // open modal
  };

  const confirmDelete = async () => {
    try {
      await fetch(`${API_BASE}/addresses/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("🗑️ Address deleted");
      fetchAddresses();
    } catch (err) {
      console.error("Error deleting address:", err);
      toast.error("❌ Failed to delete address");
    } finally {
      setDeleteId(null); // close modal
    }
  };

  // 🔹 Edit
  const handleEdit = (addr) => {
    setEditingId(addr._id);
    setForm({ ...addr, customLabel: addr.label });
    setShowForm(true);
  };

  // 🔹 Select
  const handleSelect = async (id) => {
    try {
      await fetch(`${API_BASE}/addresses/select/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedAddress(id);
      toast.success("📦 Delivery address selected");
      fetchAddresses();
    } catch (err) {
      console.error("Error selecting address:", err);
      toast.error("❌ Failed to select address");
    }
  };

  return (
    <div className="address-page">
      <ToastContainer position="top-right" autoClose={3000} />

      <h2>My Addresses</h2>

      {!showForm && (
        <button className="p-add-address-btn" onClick={() => setShowForm(true)}>
          ➕ Add Address
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="p-address-form">
          {/* Label */}
          <div>
            <label>Label:</label>
            <select name="label" value={form.label} onChange={handleChange}>
              <option>Home</option>
              <option>Work</option>
              <option>Other</option>
            </select>
            {form.label === "Other" && (
              <input
                type="text"
                name="customLabel"
                placeholder="Custom label"
                value={form.customLabel}
                onChange={handleChange}
                required
              />
            )}
          </div>

          {/* ✅ Place Picker */}
          <gmpx-place-picker
            ref={pickerRef}
            placeholder="Search location"
            style={{ width: "100%", height: "40px", marginBottom: "10px" }}
          ></gmpx-place-picker>

          {/* Mini Map Preview */}
          <div
            ref={mapRef}
            style={{
              width: "100%",
              height: "250px",
              marginBottom: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          ></div>

          {/* Lat / Lng */}
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              className="lat-row"
              type="text"
              name="latitude"
              value={form.latitude}
              readOnly
              style={{ flex: 1, background: "#f9f9f9" }}
            />
            <input
              className="long-row"
              type="text"
              name="longitude"
              value={form.longitude}
              readOnly
              style={{ flex: 1, background: "#f9f9f9" }}
            />
          </div>
          <small style={{ color: "#666" }}>
            (Drag the pin to change Latitude & Longitude)
          </small>

          {/* Inputs */}
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={form.fullName}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="phone"
            placeholder="Phone"
            value={form.phone}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="street"
            placeholder="Street Address"
            value={form.street}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="landmark"
            placeholder="Landmark (optional)"
            value={form.landmark}
            onChange={handleChange}
          />
          <input
            type="text"
            name="city"
            placeholder="City"
            value={form.city}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="state"
            placeholder="State"
            value={form.state}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="postalCode"
            placeholder="Postal Code"
            value={form.postalCode}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="country"
            placeholder="Country"
            value={form.country}
            onChange={handleChange}
          />

          {/* Default Checkbox */}
          <label>
            <input
              type="checkbox"
              name="isDefault"
              checked={form.isDefault}
              onChange={(e) =>
                setForm({ ...form, isDefault: e.target.checked })
              }
            />
            Set as default
          </label>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit">
              {editingId ? "Update" : "Save"} Address
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Address List */}
      {addresses.length === 0 && !showForm ? (
        <p className="p-no-address">No addresses saved yet.</p>
      ) : (
        <div className="p-address-list">
          {addresses.map((addr) => (
            <div
              key={addr._id}
              className={`p-address-card ${
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
                  className="p1-map-link"
                >
                  📍 View on Google Maps
                </a>
              )}

              {addr.isDefault && <span>⭐ Default</span>}
              <div className="p-address-actions">
                <button onClick={() => handleSelect(addr._id)}>
                  Deliver Here
                </button>
                <button onClick={() => handleEdit(addr)}>Edit</button>
                <button onClick={() => handleDelete(addr._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
  <div className="delete-modal-overlay">
    <div className="delete-modal">
      <h3>Confirm Delete</h3>
      <p>Are you sure you want to delete this address?</p>
      <div className="modal-actions">
        <button className="btn-cancel" onClick={() => setDeleteId(null)}>
          Cancel
        </button>
        <button className="btn-delete" onClick={confirmDelete}>
          Delete
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default Address;
