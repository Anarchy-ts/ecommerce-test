// src/pages/DeliverableAddress.jsx
import React, { useEffect, useRef, useState } from "react";
import "./CSS/DeliverableAddress.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const DeliverableAddress = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // 📌 Form state
  const [form, setForm] = useState({
    label: "",
    formattedAddress: "",
    latitude: 20.5937, // Default India
    longitude: 78.9629,
    placeId: "",
    mapUrl: "",
    radiusKm: 5,
  });

  const token = localStorage.getItem("adminToken");
  const pickerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  // ---------- Helpers ----------
  const toMeters = (km) => {
    const n = Number(km);
    return Number.isFinite(n) && n > 0 ? n * 1000 : 0;
  };

  const updateMap = (lat, lng) => {
    if (mapRef.current?.map && markerRef.current) {
      const pos = { lat, lng };
      markerRef.current.setPosition(pos);
      mapRef.current.map.setCenter(pos);
      if (circleRef.current) circleRef.current.setCenter(pos);
    }
  };

  const updateFormWithCoords = (lat, lng, place) => {
    setForm((prev) => ({
      ...prev,
      label: place?.displayName?.text || prev.label,
      formattedAddress: place?.formattedAddress || place?.displayName?.text,
      latitude: lat,
      longitude: lng,
      placeId: place?.id || "",
      mapUrl: `https://maps.google.com/maps?q=${lat},${lng}`,
    }));
  };

  // ---------- Data ----------
  const fetchAreas = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAreas(data.deliverableAreas || []);
    } catch (err) {
      console.error("Error fetching areas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  // ---------- Place Picker ----------
  useEffect(() => {
    if (!showForm || !pickerRef.current) return;

    const picker = pickerRef.current;

    const handlePlaceChange = () => {
      const place = picker.value;
      if (!place?.location) return;

      const lat = place.location.lat();
      const lng = place.location.lng();

      updateFormWithCoords(lat, lng, place);
      updateMap(lat, lng);
    };

    picker.addEventListener("gmpx-placechange", handlePlaceChange);
    return () => picker.removeEventListener("gmpx-placechange", handlePlaceChange);
  }, [showForm]);

  // ---------- Map + Marker + Circle init ----------
  useEffect(() => {
    if (!showForm || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: Number(form.latitude), lng: Number(form.longitude) },
      zoom: 13,
    });

    const marker = new window.google.maps.Marker({
      position: { lat: Number(form.latitude), lng: Number(form.longitude) },
      map,
      draggable: true,
    });

    const circle = new window.google.maps.Circle({
      map,
      center: marker.getPosition(),
      radius: toMeters(form.radiusKm),
      strokeColor: "#1a73e8",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#1a73e8",
      fillOpacity: 0.1,
    });

    // Move circle while dragging
    marker.addListener("drag", () => {
      const pos = marker.getPosition();
      circle.setCenter(pos);
    });

    // Update form on drag end
    marker.addListener("dragend", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      circle.setCenter({ lat, lng });
      setForm((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        mapUrl: `https://maps.google.com/maps?q=${lat},${lng}`,
      }));
    });

    mapRef.current.map = map;
    markerRef.current = marker;
    circleRef.current = circle;
  }, [showForm]);

  // ---------- Sync map objects when form changes ----------
  // Recenter marker & circle on lat/lng change (typing or place picker)
  useEffect(() => {
    if (markerRef.current && mapRef.current?.map) {
      const pos = { lat: Number(form.latitude), lng: Number(form.longitude) };
      if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return;
      markerRef.current.setPosition(pos);
      mapRef.current.map.setCenter(pos);
      if (circleRef.current) circleRef.current.setCenter(pos);
    }
  }, [form.latitude, form.longitude]);

  // Resize circle when radius changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(toMeters(form.radiusKm));
    }
  }, [form.radiusKm]);

  // ---------- Form events ----------
  const handleChange = (e) => {
    const { name, value } = e.target;

    // keep numeric state as numbers for map sync
    if (name === "latitude" || name === "longitude") {
      const num = parseFloat(value);
      setForm((prev) => ({ ...prev, [name]: Number.isFinite(num) ? num : "" }));
      return;
    }
    if (name === "radiusKm") {
      const num = parseFloat(value);
      setForm((prev) => ({ ...prev, radiusKm: Number.isFinite(num) ? num : "" }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Add / Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editingIndex !== null ? "PUT" : "POST";
      const url =
        editingIndex !== null
          ? `${API_BASE}/admin/delivery-area/${editingIndex}`
          : `${API_BASE}/admin/delivery-area`;

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      setForm({
        label: "",
        formattedAddress: "",
        latitude: 20.5937,
        longitude: 78.9629,
        placeId: "",
        mapUrl: "",
        radiusKm: 5,
      });
      setEditingIndex(null);
      setShowForm(false);
      fetchAreas();
    } catch (err) {
      console.error("Error saving area:", err);
    }
  };

  // Delete
  const handleDelete = async (index) => {
    if (!window.confirm("Delete this area?")) return;
    try {
      await fetch(`${API_BASE}/admin/delivery-area/${index}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAreas();
    } catch (err) {
      console.error("Error deleting area:", err);
    }
  };

  // Edit
  const handleEdit = (area, index) => {
    setEditingIndex(index);
    setForm(area);
    setShowForm(true);
  };

  return (
    <div className="deliverable-container">
      <h2>📍 Deliverable Areas</h2>

      {!showForm && (
        <button onClick={() => setShowForm(true)}>➕ Add Deliverable Area</button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="area-form">
          {/* Google Place Picker */}
          <gmpx-place-picker
            ref={pickerRef}
            placeholder="Search deliverable area"
            style={{ width: "100%", height: "40px", marginBottom: "10px" }}
          ></gmpx-place-picker>

          <input
            type="text"
            name="label"
            placeholder="Label (e.g. South Kolkata)"
            value={form.label}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="formattedAddress"
            placeholder="Formatted Address"
            value={form.formattedAddress}
            onChange={handleChange}
            required
          />

          {/* Latitude & Longitude (autofilled but editable) */}
          <input
            type="number"
            name="latitude"
            step="any"
            placeholder="Latitude"
            value={form.latitude}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="longitude"
            step="any"
            placeholder="Longitude"
            value={form.longitude}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="radiusKm"
            placeholder="Radius (in Km)"
            value={form.radiusKm}
            onChange={handleChange}
            min="0"
          />

          {/* Mini Map Preview */}
          <div
            ref={mapRef}
            style={{
              width: "100%",
              height: "260px",
              marginTop: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          ></div>

          <div className="form-buttons">
            <button type="submit">
              {editingIndex !== null ? "Update" : "Save"} Area
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingIndex(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Area List */}
      {areas.length === 0 && !showForm ? (
        <p>No deliverable areas yet.</p>
      ) : (
        <ul className="area-list">
          {areas.map((area, index) => (
            <li key={index} className="area-item">
              <b>{area.label}</b> – {area.formattedAddress} (Radius: {area.radiusKm} km)
              <br />
              🌍 Lat: {area.latitude}, Lng: {area.longitude}
              <br />
              {area.mapUrl && (
                <a
                  href={area.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-deliver-map-link"
                >
                  📍 View on Map
                </a>
              )}
              <div className="area-actions">
                <button onClick={() => handleEdit(area, index)}>Edit</button>
                <button onClick={() => handleDelete(index)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DeliverableAddress;
