const mongoose = require("mongoose");

// 📍 Address sub-schema
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" }, // e.g. "Home", "Work", "Other"
    fullName: { type: String, required: true }, // person receiving
    phone: { type: String, required: true },

    // ✅ Traditional fields (manual entry)
    street: { type: String },
    landmark: { type: String }, // 🆕 nearby landmark for clarity
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, default: "India" },

    // ✅ Google Maps fields
    formattedAddress: { type: String }, // nicely formatted address from Google API
    latitude: { type: Number },         // geo coordinates
    longitude: { type: Number },
    placeId: { type: String },          // Google’s unique Place ID
    mapUrl: { type: String },           // shareable Google Maps URL

    isDefault: { type: Boolean, default: false }, // mark as delivery address
  },
  { _id: true } // each address gets its own ID
);

// 🧑 User schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    cartData: {
      type: Object,
      default: {}
    },

    addresses: [addressSchema], // multiple addresses
    selectedAddress: { type: mongoose.Schema.Types.ObjectId } // reference to chosen address in array
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
