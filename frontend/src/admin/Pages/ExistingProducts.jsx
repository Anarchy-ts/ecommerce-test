// src/pages/ExistingProducts.jsx
import React, { useState, useEffect } from "react"
import "./CSS/ExistingProducts.css"

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const ExistingProducts = () => {
  const [products, setProducts] = useState([])
  const [editProduct, setEditProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    category: "",
    quantity_price: [],
  })
  const [showCustomCategory, setShowCustomCategory] = useState(false)

  // ✅ Define your category options (edit as needed)
  const categories = ["", "Men", "Women", "Kids"]

  // ✅ helper for authenticated fetch
  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("adminToken")
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  }

  // ✅ Fetch products
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`)
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      console.error("Error fetching products:", err)
    }
  }

  // ✅ Delete
  const handleDelete = async (id) => {
    try {
      const res = await authFetch(`${API_BASE}/products/${id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (res.ok) {
        setProducts(products.filter((p) => p._id !== id))
      } else {
        console.error("Delete failed:", data.message)
      }
    } catch (err) {
      console.error("Error deleting product:", err)
    }
  }

  // ✅ Edit mode
  const handleEdit = (product) => {
    setEditProduct(product._id)
    const qp = Object.entries(product.quantity_price || {}).map(([size, price]) => ({
      size,
      price,
    }))
    setFormData({
      name: product.name,
      image: product.image,
      category: product.category || "",
      quantity_price: qp,
    })
    // show custom input if category is not one of the known options
    setShowCustomCategory(product.category && !categories.includes(product.category))
  }

  // ✅ Update product
  const handleUpdate = async () => {
    try {
      const qpObj = {}
      formData.quantity_price.forEach((row) => {
        if (row.size && row.price) {
          qpObj[row.size] = Number(row.price)
        }
      })

      const payload = { ...formData, quantity_price: qpObj }

      const res = await authFetch(
        `${API_BASE}/products/${editProduct}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      const data = await res.json()

      if (res.ok) {
        setProducts(
          products.map((p) => (p._id === editProduct ? data.product : p))
        )
        setEditProduct(null)
        setShowCustomCategory(false)
      } else {
        console.error("Update failed:", data.message)
      }
    } catch (err) {
      console.error("Error updating product:", err)
    }
  }

  // ✅ Handle size/price change
  const handleQuantityChange = (index, field, value) => {
    const updated = [...formData.quantity_price]
    updated[index][field] = value
    setFormData({ ...formData, quantity_price: updated })
  }

  const addRow = () => {
    setFormData({
      ...formData,
      quantity_price: [...formData.quantity_price, { size: "", price: "" }],
    })
  }

  const removeRow = (index) => {
    const updated = formData.quantity_price.filter((_, i) => i !== index)
    setFormData({ ...formData, quantity_price: updated })
  }

  // ✅ Image upload handler (field name fixed)
  const handleImageUpload = async (file) => {
    const formDataFile = new FormData()
    formDataFile.append("product", file) // must match backend field name

    try {
      const res = await authFetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formDataFile,
      })
      const data = await res.json()
      if (res.ok) {
        setFormData({ ...formData, image: data.image_url }) // backend sends "image_url"
      } else {
        console.error("Upload failed:", data.message)
      }
    } catch (err) {
      console.error("Error uploading image:", err)
    }
  }

  return (
    <div className="existing-products">
      <h2>Existing Products</h2>
      <div className="product-list">
        {products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          products.map((p) => (
            <div key={p._id} className="product-item">
              <div className="product-info">
                <img src={p.image} alt={p.name} />
                <span>{p.name}</span>
              </div>
              <div className="product-actions">
                <button onClick={() => handleEdit(p)}>Edit</button>
                <button onClick={() => handleDelete(p._id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🟢 Edit Modal */}
      {editProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Product</h3>

            <label>
              Product Name
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </label>

            <label>
              Product Image
              {formData.image && (
                <div className="preview-image">
                  <img src={formData.image} alt="Current" />
                </div>
              )}
              <label htmlFor="file-upload" className="upload-btn">
                Upload New Image
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files[0]) handleImageUpload(e.target.files[0])
                }}
              />
            </label>

            <label>
              Category
              <select
                value={showCustomCategory ? "Other" : (formData.category || "")}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "Other") {
                    setShowCustomCategory(true)
                    setFormData({ ...formData, category: "" })
                  } else {
                    setShowCustomCategory(false)
                    setFormData({ ...formData, category: val })
                  }
                }}
              >
                {categories.map((c) => (
                  <option value={c} key={c || "empty"}>
                    {c === "" ? "Select category" : c}
                  </option>
                ))}
              </select>

              {/* If admin chooses Other, show a small input to type */}
              {showCustomCategory && (
                <input
                  type="text"
                  placeholder="Custom category (type then Save)"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  style={{ marginTop: "8px" }}
                />
              )}
            </label>

            <div className="quantity-price-section">
              <h4>Sizes & Prices</h4>
              {formData.quantity_price.map((row, index) => (
                <div key={index} className="qp-row">
                  <input
                    type="text"
                    placeholder="Size (e.g. XL)"
                    value={row.size}
                    onChange={(e) =>
                      handleQuantityChange(index, "size", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={row.price}
                    onChange={(e) =>
                      handleQuantityChange(index, "price", e.target.value)
                    }
                  />
                  <button type="button" onClick={() => removeRow(index)}>
                    ❌
                  </button>
                </div>
              ))}
              <button type="button" onClick={addRow}>
                + Add Size
              </button>
            </div>

            <div className="product-edit-actions">
              <button className="save-btn" onClick={handleUpdate}>
                Save
              </button>
              <button className="cancel-btn" onClick={() => { setEditProduct(null); setShowCustomCategory(false) }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExistingProducts
