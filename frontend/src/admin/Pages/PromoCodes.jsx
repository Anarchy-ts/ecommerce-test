import React, { useEffect, useState } from "react"
import "./CSS/PromoCodes.css"

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const PromoCodes = () => {
  const [codes, setCodes] = useState([])
  const [newCode, setNewCode] = useState("")
  const [type, setType] = useState("percent")
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)

  // 🔹 Fetch all promo codes on mount
  useEffect(() => {
    const token = localStorage.getItem("adminToken")
    fetch(`${API_BASE}/promos`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCodes(data)
        } else if (data.promos && Array.isArray(data.promos)) {
          setCodes(data.promos)
        } else {
          setCodes([])
        }
      })
      .catch((err) => {
        console.error("Error fetching promos:", err)
        setCodes([])
      })
  }, [])

  // 🔹 Add new promo
  const handleAdd = async () => {
    if (!newCode || !value) return

    const token = localStorage.getItem("adminToken")
    if (!token) {
      alert("Not authorized — please log in again")
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/promos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ send token
        },
        body: JSON.stringify({
          code: newCode.toUpperCase(),
          type,
          value: parseInt(value),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setCodes((prev) => [...prev, data.promo])
        setNewCode("")
        setValue("")
      } else {
        alert(data.message || "Error adding promo")
      }
    } catch (err) {
      console.error("Error adding promo:", err)
    } finally {
      setLoading(false)
    }
  }

  // 🔹 Delete promo
  const handleDelete = async (id) => {
    const token = localStorage.getItem("adminToken")
    if (!token) {
      alert("Not authorized — please log in again")
      return
    }

    try {
      const res = await fetch(`${API_BASE}/promos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`, // ✅ send token
        },
      })

      const data = await res.json()
      if (res.ok) {
        setCodes((prev) => prev.filter((c) => c._id !== id))
      } else {
        alert(data.message || "Error deleting promo")
      }
    } catch (err) {
      console.error("Error deleting promo:", err)
    }
  }

  return (
    <div className="promo-codes">
      <h2>Promo Codes</h2>

      <div className="promo-list">
        {codes.length > 0 ? (
          codes.map((promo) => (
            <div key={promo._id} className="promo-item">
              <span>
                {promo.code} - {promo.type} - {promo.value}
              </span>
              <button onClick={() => handleDelete(promo._id)}>Delete</button>
            </div>
          ))
        ) : (
          <p>No promo codes found.</p>
        )}
      </div>

      <h3>Add Promo Code</h3>
      <div className="add-promo">
        <input
          type="text"
          placeholder="Code"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="percent">Percent</option>
          <option value="flat">Flat</option>
        </select>
        <input
          type="number"
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button onClick={handleAdd} disabled={loading}>
          {loading ? "Adding..." : "Add"}
        </button>
      </div>
    </div>
  )
}

export default PromoCodes
