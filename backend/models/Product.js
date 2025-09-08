const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String, // stored as URL (from upload folder)
      required: true,
    },
    quantity_price: {
      type: Map,
      of: Number, // Example: { "S": 120, "M": 240, "XL": 1000 }
      required: true,
    },
    category: {
      type: String,
      default: "Men", 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
