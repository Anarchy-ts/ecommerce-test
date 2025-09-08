const mongoose = require("mongoose");

const chargeSchema = new mongoose.Schema(
  {
    deliveryCharge: {
      freeUptoKm: {
        type: Number,
        required: true,
        min: 0, // No negative distance
      },
      ratePerKm: {
        type: Number,
        required: true,
        min: 0, // No negative charges
      },
    },
    otherCharges: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        percent: {
          type: Number,
          required: true,
          min: 0,
          max: 100, // percentage of final amount
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Charge", chargeSchema);
