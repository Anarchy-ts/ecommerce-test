// src/pages/AddProduct.jsx
import React, { useState } from "react"
import "./CSS/AddProduct.css"

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// 🔹 helper fetch wrapper for authenticated requests
const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("adminToken")
  const headers = {
    ...(options.headers || {}),
    ...(token && { Authorization: `Bearer ${token}` }),
  }
  return fetch(url, { ...options, headers })
}

const AddProduct = () => {
  const [name, setName] = useState("")
  const [image, setImage] = useState(null) // preview URL
  const [imageUrl, setImageUrl] = useState("") // ✅ backend full URL
  const [sizes, setSizes] = useState([{ size: "", price: "" }])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [category, setCategory] = useState("")
  const [statusType, setStatusType] = useState("") // ✅ success / error

  const handleAddSize = () => {
    setSizes([...sizes, { size: "", price: "" }])
  }

  // 🔹 Upload image to backend immediately
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formDataFile = new FormData()
    formDataFile.append("product", file) // must match backend field name

    try {
      const res = await authFetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formDataFile,
      })

      const data = await res.json()
      if (res.ok) {
        console.log(data.image_url)
        setImage(data.image_url)      // ✅ preview
        setImageUrl(data.image_url)   // ✅ save full URL for DB (same as ExistingProducts)
        setMessage("Image uploaded successfully ✅")
        setStatusType("success")
      } else {
        console.error("Upload failed:", data.message)
        setMessage(data.message || "Image upload failed ❌")
        setStatusType("error")
      }
    } catch (err) {
      console.error("Error uploading image:", err)
      setMessage("Image upload failed ❌")
      setStatusType("error")
    }
  }

  // 🔹 Submit product
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const token = localStorage.getItem("adminToken")
    if (!token) {
      setMessage("Not authorized — please log in as admin ❌")
      setStatusType("error")
      setLoading(false)
      return
    }

    try {
      const quantity_price = {}
      sizes.forEach((s) => {
        if (s.size && s.price) {
          quantity_price[s.size] = parseInt(s.price)
        }
      })

      const res = await authFetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          image: imageUrl, // ✅ now saving full image_url
          quantity_price,
          category: category,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(data.message || "Product added successfully ✅")
        setStatusType("success")
        setName("")
        setImage(null)
        setImageUrl("")
        setSizes([{ size: "", price: "" }])
      } else {
        setMessage(data.message || "Error adding product ❌")
        setStatusType("error")
      }
    } catch (err) {
      console.error(err)
      setMessage("Error adding product ❌")
      setStatusType("error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-add-product-container">
      <div className="admin-add-product">
        <h2>Add Product</h2>
        <form onSubmit={handleSubmit}>
          {/* Product Name */}
          <input
            className="product-name-input"
            type="text"
            placeholder="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* File Upload */}
          <input
            type="file"
            id="product-image"
            accept="image/*"
            onChange={handleImageUpload}
            hidden
          />
          <label htmlFor="product-image" className="custom-file-upload">
            {imageUrl ? "Image Selected ✅" : "Upload Product Image"}
          </label>

          {/* Preview */}
          {image && (
            <img src={image} alt="Preview" className="image-preview" />
          )}

          {/* Category */}
          <h3>Category</h3>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Select a category</option>
            <option value="Men">Men</option>
            <option value="Women">Women</option>
            <option value="Kids">Kids</option>
          </select>


          {/* Sizes */}
          <h3>Sizes & Prices</h3>
          {sizes.map((s, i) => (
            <div key={i} className="size-row">
              <input
                type="text"
                placeholder="Size (e.g., XL)"
                value={s.size}
                onChange={(e) => {
                  const updated = [...sizes]
                  updated[i].size = e.target.value
                  setSizes(updated)
                }}
              />
              <input
                type="number"
                placeholder="Price"
                value={s.price}
                onChange={(e) => {
                  const updated = [...sizes]
                  updated[i].price = e.target.value
                  setSizes(updated)
                }}
              />
            </div>
          ))}

          <button type="button" className="add-size-btn" onClick={handleAddSize}>
            + Add Size
          </button>
          <button
            type="submit"
            className="save-btn"
            disabled={loading || !imageUrl}
          >
            {loading ? "Saving..." : "Save Product"}
          </button>
        </form>

        {message && <p className={`status-message ${statusType}`}>{message}</p>}
      </div>
    </div>
  )
}

export default AddProduct
