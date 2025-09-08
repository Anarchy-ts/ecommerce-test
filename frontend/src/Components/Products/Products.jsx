import React, { useState, useContext, useEffect } from "react";
import "./Products.css";
import { ShopContext } from "../../Context/ShopContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const Products = () => {
  const { products } = useContext(ShopContext); // ✅ get from context
  const [activeCategory, setActiveCategory] = useState("All");

  // categories shown as buttons; edit or extend as needed
  const categories = ["All", "Men", "Women", "Kids"];

  // filter products by category (case-insensitive)
  const filtered = products.filter((p) => {
    if (!activeCategory || activeCategory === "All") return true;
    const cat = (p.category || "").toString().toLowerCase();
    return cat === activeCategory.toLowerCase();
  });

  return (
    <div className="products-page">
      <div className="category-bar">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${activeCategory === cat ? "active" : ""}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="products-container">
        {filtered.length === 0 ? (
          <p className="no-products">No products found in "{activeCategory}"</p>
        ) : (
          filtered.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))
        )}
      </div>
    </div>
  );
};

const ProductCard = ({ product }) => {
  const quantities = Object.keys(product.quantity_price || {});
  const [selectedQuantity, setSelectedQuantity] = useState(quantities[0] || "");

  // ensure selectedQuantity resets when product changes (e.g., after filtering)
  useEffect(() => {
    setSelectedQuantity(Object.keys(product.quantity_price || {})[0] || "");
  }, [product]);

  const { addToCart, removeFromCart, cartArray } = useContext(ShopContext);

  // Check if this product+size is already in cart
  const cartItem = cartArray.find(
    (item) => item.id === product._id && item.size === selectedQuantity
  );

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} className="product-img" />
      <h3 className="product-name">{product.name}</h3>

      {/* Quantity + Price in same row */}
      <div className="product-actions">
        <select
          className="quantity-select"
          value={selectedQuantity}
          onChange={(e) => setSelectedQuantity(e.target.value)}
        >
          {quantities.map((qty) => (
            <option key={qty} value={qty}>
              {qty}
            </option>
          ))}
        </select>
        <span className="product-price">
          {selectedQuantity ? `₹${product.quantity_price[selectedQuantity]}` : "—"}
        </span>
      </div>

      {/* Show controls if product is in cart, else show Add button */}
      {cartItem ? (
        <div className="product-quantity-controls">
          <button
            className="qty-btn"
            onClick={() => removeFromCart(product._id, selectedQuantity)}
          >
            -
          </button>
          <span>{cartItem.count}</span>
          <button
            className="qty-btn"
            onClick={() => addToCart(product._id, selectedQuantity)}
          >
            +
          </button>
        </div>
      ) : (
        <button
          className="add-cart-btn"
          onClick={() => addToCart(product._id, selectedQuantity)}
          disabled={!selectedQuantity}
        >
          Add to Cart
        </button>
      )}
    </div>
  );
};

export default Products;
