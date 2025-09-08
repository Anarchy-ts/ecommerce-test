// src/context/ShopContext.jsx
import React, { createContext, useState, useEffect, useMemo } from "react";

export const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
  const [cart, setCart] = useState({});
  const [products, setProducts] = useState([]);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  // ✅ Fetch products on mount
  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error("Fetch products error:", err));
  }, []);

  // ✅ Fetch cart whenever token changes
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setCart(data))
        .catch((err) => console.error("Fetch cart error:", err));
    } else {
      setCart({});
    }
  }, [token]);

  // ✅ Add to cart
  const addToCart = async (productId, size) => {
    if (!token) {
      alert("Please log in first");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, size }),
      });
      const data = await res.json();
      setCart(data.cartData);
    } catch (err) {
      console.error("Add to cart error:", err);
    }
  };

  // ✅ Remove one quantity
  const removeFromCart = async (productId, size) => {
    if (!token) {
      alert("Please log in first");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/cart/remove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, size }),
      });
      const data = await res.json();
      setCart(data.cartData);
    } catch (err) {
      console.error("Remove from cart error:", err);
    }
  };

  // ✅ Remove all of a product-size
  const removeAllFromCart = async (productId, size) => {
    if (!token) {
      alert("Please log in first");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/cart/removeAll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, size }),
      });
      const data = await res.json();
      setCart(data.cartData);
    } catch (err) {
      console.error("Remove all from cart error:", err);
    }
  };

  // ✅ Clear cart on logout
  const clearCart = () => setCart({});

  // ✅ Convert backend cartData → array with product info
  const cartArray = useMemo(() => {
    if (!cart || typeof cart !== "object") return [];

    const cleanupTasks = [];

    const result = Object.entries(cart).flatMap(([productId, sizes]) =>
      Object.entries(sizes).map(([size, count]) => {
        if (count > 0) {
          const product = products.find((p) => p._id === productId);

          if (!product) {
            // ❌ Product removed → clear from server cart
            cleanupTasks.push(removeAllFromCart(productId, size));
            return null;
          }

          if (!(size in (product.quantity_price || {}))) {
            // ❌ Size removed → clear from server cart
            cleanupTasks.push(removeAllFromCart(productId, size));
            return null;
          }

          return {
            id: productId,
            size,
            count,
            name: product.name,
            image: product.image,
            price: product.quantity_price?.[size] || 0,
          };
        }
        return null;
      })
    ).filter(Boolean);

    // ✅ Run cleanup tasks async
    if (cleanupTasks.length > 0) {
      Promise.all(cleanupTasks).catch((err) =>
        console.error("Cart cleanup error:", err)
      );
    }

    return result;
  }, [cart, products]);

  // ✅ Total price
  const total = useMemo(() => {
    return cartArray.reduce(
      (sum, item) => sum + item.price * item.count,
      0
    );
  }, [cartArray]);

  return (
    <ShopContext.Provider
      value={{
        products,
        cart,
        cartArray,
        addToCart,
        removeFromCart,
        removeAllFromCart,
        clearCart,
        total,
        setToken,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};
