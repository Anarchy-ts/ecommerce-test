// src/pages/Cart.jsx
import React, { useContext, useState, useEffect } from "react";
import { ShopContext } from "../Context/ShopContext";
import dustbinIcon from "../assets/dustbin_delete.png";
import "./CSS/Cart.css";
import { useNavigate } from "react-router-dom";
import AddressModal from "../Components/AddressModal/AddressModal";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const Cart = () => {
  const { cartArray, addToCart, removeFromCart, removeAllFromCart, total } =
    useContext(ShopContext);

  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [loadingPromo, setLoadingPromo] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [refreshCharges, setRefreshCharges] = useState(false);

  // ✅ New state for dynamic charges
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [otherCharges, setOtherCharges] = useState([]);
  const [loadingCharges, setLoadingCharges] = useState(true);

  // ✅ New state for distance
  const [distanceFromStore, setDistanceFromStore] = useState(null);

  const navigate = useNavigate();

  // Haversine formula
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ✅ Fetch charges + user address + admin deliverable areas
  useEffect(() => {
    const fetchChargesAndAddresses = async () => {
      try {
        setLoadingCharges(true);

        const token = localStorage.getItem("token");

        const [chargeRes, addrRes, adminRes] = await Promise.all([
          fetch(`${API_BASE}/charges`),
          fetch(`${API_BASE}/addresses`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch(`${API_BASE}/public-admin`),
        ]);

        const chargeData = await chargeRes.json();
        const addrData = await addrRes.json();
        const adminData = await adminRes.json();

        if (!chargeRes.ok) throw new Error(chargeData.message);
        if (!addrRes.ok) throw new Error(addrData.message);
        if (!adminRes.ok) throw new Error(adminData.message);

        // ✅ Resolve selected user address
        const selected = addrData.addresses.find(
          (a) => a._id === addrData.selectedAddress
        );
        if (!selected || !selected.latitude || !selected.longitude) {
          setDeliveryCharge(0);
          setOtherCharges(chargeData.otherCharges || []);
          setDistanceFromStore(null);
          return;
        }

        // ✅ Find nearest deliverable area
        let nearest = null;
        let minDist = Infinity;
        adminData.deliverableAreas.forEach((area) => {
          const dist = getDistanceKm(
            selected.latitude,
            selected.longitude,
            area.latitude,
            area.longitude
          );
          if (dist < minDist) {
            minDist = dist;
            nearest = area;
          }
        });

        // ✅ Save distance
        setDistanceFromStore(minDist);

        // ✅ Calculate delivery charge
        const { freeUptoKm, ratePerKm } = chargeData.deliveryCharge;
        let delivery = 0;
        if (minDist > freeUptoKm) {
          delivery = (minDist - freeUptoKm) * ratePerKm;
        }

        setDeliveryCharge(delivery);
        setOtherCharges(chargeData.otherCharges || []);
      } catch (err) {
        console.error("Error fetching charges/address:", err);
      } finally {
        setLoadingCharges(false);
      }
    };

    if (cartArray.length > 0) fetchChargesAndAddresses();
  }, [cartArray, refreshCharges]);

  // ✅ Apply promo
  const applyPromo = async () => {
    if (!promo) return;

    try {
      setLoadingPromo(true);
      const res = await fetch(`${API_BASE}/promos/validate/${promo}`);
      const data = await res.json();

      if (res.ok) {
        const { type, value, code } = data;
        const disc = type === "percent" ? (total * value) / 100 : value;
        setDiscount(disc);
        setAppliedPromo(code);
      } else {
        setDiscount(0);
        setAppliedPromo(null);
        alert(data.message || "Invalid Promo Code");
      }
    } catch (err) {
      console.error("Error applying promo:", err);
      alert("Error checking promo code");
    } finally {
      setLoadingPromo(false);
    }
  };

  const removePromo = () => {
    setDiscount(0);
    setAppliedPromo(null);
    setPromo("");
  };

  // ✅ Final price calculation (rounded)
  const subtotal = total;
  const extraCharges = otherCharges.reduce(
    (acc, oc) => acc + (subtotal * oc.percent) / 100,
    0
  );
  const finalAmount = subtotal + extraCharges + deliveryCharge - discount;
  const roundedFinalAmount = Number(finalAmount.toFixed(2));

  // ✅ Proceed to Payment
  const proceedToPayment = (address) => {
    const orderData = {
      items: cartArray.map((item) => ({
        product: item.id,
        productName: item.name,
        size: item.size,
        quantity: item.count,
        price: item.price,
      })),
      totalPrice: roundedFinalAmount, // ✅ always send rounded price
      deliveryAddress: {
        fullName: address.fullName,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
      },
    };

    navigate("/payment", { state: { orderData } });
  };

  return (
    <div className="cart-container">
      <h1 className="cart-title">🛒 Your Cart</h1>

      {cartArray.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-box">
            <p>Your cart is empty 😔</p>
            <p>Browse products and add them to your cart!</p>
          </div>
        </div>
      ) : (
        <>
          {/* Items List */}
          <div className="cart-items">
            {cartArray.map((item, index) => (
              <div key={index} className="cart-item">
                <div className="cart-item-inner">
                  <img src={item.image} alt={item.name} className="cart-img" />

                  <div className="cart-details">
                    <h3>{item.name}</h3>
                    <p className="cart-meta">Size: {item.size}</p>
                    <p className="cart-meta">Price: ₹{item.price}</p>

                    <div className="cart-quantity-controls">
                      <button
                        onClick={() => removeFromCart(item.id, item.size)}
                        className="qty-btn"
                      >
                        -
                      </button>
                      <span>{item.count}</span>
                      <button
                        onClick={() => addToCart(item.id, item.size)}
                        className="qty-btn"
                      >
                        +
                      </button>
                    </div>

                    <p className="subtotal">
                      Subtotal: ₹{item.price * item.count}
                    </p>
                  </div>

                  <img
                    src={dustbinIcon}
                    alt="Remove"
                    className="remove-icon"
                    onClick={() => removeAllFromCart(item.id, item.size)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="cart-footer">
            {/* Promo Section */}
            <div className="promo-section">
              {appliedPromo ? (
                <div className="applied-promo">
                  <p>
                    ✅ Promo <strong>{appliedPromo}</strong> applied
                  </p>
                  <button className="remove-promo-btn" onClick={removePromo}>
                    Remove Promo
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                  />
                  <button onClick={applyPromo} disabled={loadingPromo}>
                    {loadingPromo ? "Checking..." : "Apply"}
                  </button>
                </>
              )}
            </div>

            {/* Price Breakdown */}
            {loadingCharges ? (
              <p>Loading charges...</p>
            ) : (
              <div className="price-breakdown">
                <p>
                  <span>Subtotal:</span> <span>₹{subtotal}</span>
                </p>
                {otherCharges.map((oc, idx) => (
                  <p key={idx}>
                    <span>
                      {oc.name} ({oc.percent}%):
                    </span>
                    <span>₹{((subtotal * oc.percent) / 100).toFixed(2)}</span>
                  </p>
                ))}
                <p>
                  <span>Delivery:</span>{" "}
                  <span>₹{deliveryCharge.toFixed(2)}</span>
                </p>
                {distanceFromStore !== null && (
                  <p className="distance-note">
                    (Distance from store: {distanceFromStore.toFixed(2)} km)
                  </p>
                )}

                {discount > 0 && (
                  <p className="discount">
                    <span>Discount:</span>{" "}
                    <span>-₹{discount.toFixed(2)}</span>
                  </p>
                )}
                <h3>
                  <span>Total:</span>{" "}
                  <span>₹{roundedFinalAmount.toFixed(2)}</span>
                </h3>
              </div>
            )}

            <button
              className="checkout-btn"
              onClick={() => setShowAddressModal(true)}
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}

      {/* ✅ Address Modal */}
      {showAddressModal && (
        <AddressModal
          onClose={() => setShowAddressModal(false)}
          onConfirm={(address) => {
            setShowAddressModal(false);
            proceedToPayment(address);
          }}
          onAddressChange={() => setRefreshCharges((prev) => !prev)} 
        />
      )}
    </div>
  );
};

export default Cart;
