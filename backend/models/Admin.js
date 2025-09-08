const mongoose = require("mongoose");

const deliverableAreaSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Shop Location" }, // e.g. "Main Shop", "Branch 1"
    formattedAddress: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    placeId: { type: String }, // optional, from Google Maps
    mapUrl: { type: String }, // optional
    radiusKm: { type: Number, required: true, default: 5 }, // delivery radius in KM
  },
  { _id: false }
);

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true }, // encrypted
    password: { type: String, required: true }, // hashed
    companyEmail: { type: String, required: true }, // encrypted
    companyEmailAppPassword: { type: String, required: true }, // encrypted
    deliveryAgentEmails: [{ type: String, required: true }], // encrypted
    // 🚚 NEW FIELD: Deliverable areas
    deliverableAreas: [deliverableAreaSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
