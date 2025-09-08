// models/Order.js
const mongoose = require("mongoose");

// 📍 Reuse Address Schema for orders
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },

    street: { type: String },
    landmark: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, default: "India" },

    formattedAddress: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    placeId: { type: String },
    mapUrl: { type: String },

    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // 🧑 User Info
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true }, // username snapshot
    email: { type: String, required: true },

    // 🛒 Items
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: { type: String, required: true },
        size: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],

    // 💰 Pricing
    totalPrice: { type: Number, required: true },

    // 📍 Delivery Address (snapshot)
    deliveryAddress: { type: addressSchema, required: true },

    // 📦 Order Status (internal)
    status: {
      type: String,
      enum: [
        "Pending",      // order created but not yet paid
        "Paid",         
        "Online",      
        "Refunded",     // full refund processed
        "Partially Refunded", // partial refund
      ],
      default: "Pending",
    },

    // 🚚 Delivery lifecycle
    deliveryStatus: {
      type: String,
      enum: ["Received", "Preparing", "Out for Delivery", "Delivered"],
      default: "Received",
    },

    // 💳 Razorpay payment tracking
    razorpay_order_id: { type: String },
    razorpay_payment_id: { type: String },
    razorpay_signature: { type: String },

    // 🔄 Refund tracking
    refund: {
      refund_id: { type: String },   // Razorpay refund ID
      amount: { type: Number },      // refunded amount
      status: {                      // refund status from Razorpay
        type: String,
        enum: ["pending", "processed", "failed"],
      },
      processedAt: { type: Date },   // when refund completed
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
