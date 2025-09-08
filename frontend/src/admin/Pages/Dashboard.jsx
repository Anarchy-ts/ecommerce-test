// src/admin/Pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Legend
} from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./CSS/Dashboard.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0, bestProduct: "" });
  const [timeRange, setTimeRange] = useState("week");
  const [customRange, setCustomRange] = useState({ start: null, end: null });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const res = await axios.get(`${API_BASE}/admin/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(res.data);
      } catch (err) {
        console.error("❌ Dashboard data fetch error:", err);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!orders.length) return;
    processData();
    // eslint-disable-next-line
  }, [orders, timeRange, customRange]);

  const processData = () => {
    let filteredOrders = [...orders];
    const now = new Date();

    if (timeRange === "week") {
      const last7 = new Date();
      last7.setDate(now.getDate() - 6);
      filteredOrders = orders.filter(o => new Date(o.createdAt) >= last7);
    } else if (timeRange === "month") {
      const last30 = new Date();
      last30.setDate(now.getDate() - 30);
      filteredOrders = orders.filter(o => new Date(o.createdAt) >= last30);
    } else if (timeRange === "year") {
      const lastYear = new Date();
      lastYear.setFullYear(now.getFullYear() - 1);
      filteredOrders = orders.filter(o => new Date(o.createdAt) >= lastYear);
    } else if (timeRange === "custom" && customRange.start && customRange.end) {
      filteredOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= customRange.start && d <= customRange.end;
      });
    }
    // else "all" => leave as-is

    // --- Sales by Date (Net Sales = total - refund) ---
    const salesMap = {};
    let totalSales = 0;
    filteredOrders.forEach(order => {
      const d = new Date(order.createdAt);

      // Net sales = totalPrice - processed refund amount
      const refundAmount =
        order.refund && order.refund.status === "processed"
          ? order.refund.amount || 0
          : 0;
      const netSales = order.totalPrice - refundAmount;

      let key;
      if (timeRange === "week" || timeRange === "custom") {
        key = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      } else if (timeRange === "month") {
        key = `Week ${Math.ceil(d.getDate() / 7)}`;
      } else if (timeRange === "year") {
        key = d.toLocaleDateString("en-IN", { month: "short" });
      } else {
        key = d.getFullYear();
      }

      salesMap[key] = (salesMap[key] || 0) + netSales;
      totalSales += netSales;
    });

    const salesArray = Object.keys(salesMap)
      .map(k => ({ date: k, sales: salesMap[k] }))
      .sort((a, b) => {
        if (!isNaN(a.date) && !isNaN(b.date)) return a.date - b.date;
        return a.date.localeCompare(b.date);
      });

    setSalesData(salesArray);

    // --- Product Units Sold (by size and total units) ---
    // productMap: { productName: { totalUnits: Number, sizes: { S: 10, M: 5 } } }
    const productMap = {};
    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const productName = item.productName || item.name || "Unknown Product";
        const size = item.size || "One Size";
        const qty = Number(item.quantity) || 0;

        if (!productMap[productName]) {
          productMap[productName] = { totalUnits: 0, sizes: {} };
        }
        productMap[productName].totalUnits += qty;
        productMap[productName].sizes[size] = (productMap[productName].sizes[size] || 0) + qty;
      });
    });

    const productArray = Object.keys(productMap)
      .filter(name => productMap[name].totalUnits > 0)
      .map(name => ({
        name,
        totalUnits: productMap[name].totalUnits,
        sizes: productMap[name].sizes, // keep breakdown for tooltip
      }))
      // sort descending for display
      .sort((a, b) => b.totalUnits - a.totalUnits);

    setProductData(productArray);

    // --- Stats Summary ---
    const bestProduct = productArray[0]?.name || "N/A";
    setStats({ totalSales, totalOrders: filteredOrders.length, bestProduct });
  };

  // Custom tooltip for product bar chart: shows size breakdown
  const ProductTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload; // our data entry
    const { name, totalUnits, sizes } = data;

    return (
      <div style={{
        background: "#1e1e2f",
        padding: 12,
        borderRadius: 8,
        color: "#fff",
        minWidth: 180,
        boxShadow: "0 6px 18px rgba(0,0,0,0.5)"
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{name}</div>
        <div style={{ marginBottom: 6 }}>Total: {totalUnits} units</div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>By size:</div>
        <div style={{ marginTop: 6 }}>
          {Object.entries(sizes).map(([sz, cnt]) => (
            <div key={sz} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>{sz}</span>
              <span>{cnt}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <h2>📊 Ecommerce Shopping Admin Dashboard</h2>
      <p>Monitor sales trends, product performance, and key insights</p>

      {/* Stats Summary */}
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Sales</h4>
          <p>₹{stats.totalSales.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h4>Total Orders</h4>
          <p>{stats.totalOrders}</p>
        </div>
        <div className="stat-card">
          <h4>Best Seller</h4>
          <p>{stats.bestProduct}</p>
        </div>
      </div>

      {/* Time Filters */}
      <div className="time-filters">
        {["week", "month", "year", "all"].map(r => (
          <button
            key={r}
            className={timeRange === r ? "active" : ""}
            onClick={() => setTimeRange(r)}
          >
            {r === "week" && "Last Week"}
            {r === "month" && "Last Month"}
            {r === "year" && "Last Year"}
            {r === "all" && "All Time"}
          </button>
        ))}
        <button
          className={timeRange === "custom" ? "active" : ""}
          onClick={() => setTimeRange("custom")}
        >
          Custom
        </button>
        {timeRange === "custom" && (
          <div className="custom-range">
            <DatePicker
              selected={customRange.start}
              onChange={(date) => setCustomRange(prev => ({ ...prev, start: date }))}
              selectsStart
              startDate={customRange.start}
              endDate={customRange.end}
              placeholderText="Start Date"
            />
            <DatePicker
              selected={customRange.end}
              onChange={(date) => setCustomRange(prev => ({ ...prev, end: date }))}
              selectsEnd
              startDate={customRange.start}
              endDate={customRange.end}
              minDate={customRange.start}
              placeholderText="End Date"
            />
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Sales Over Time */}
        <div className="chart-container">
          <h3>💰 Sales Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip contentStyle={{ background: "#1e1e2f", borderRadius: "8px", border: "none" }} />
              <Line type="monotone" dataKey="sales" stroke="#feb47b" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Product Units Sold Comparison */}
        <div className="chart-container">
          <h3>🛒 Product Sales Comparison (Units)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={productData}
              margin={{ right: 40, left: 20 }}
              barCategoryGap="30%"
              barSize={42}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="name"
                stroke="#ccc"
                interval={0}
                angle={-32}
                textAnchor="end"
                height={85}
                tick={{ fontSize: 14, fill: "#eee" }}
                tickFormatter={name =>
                  name.length > 18
                    ? name.split(" ").join("\n")
                    : name
                }
              />
              <YAxis
                stroke="#ccc"
                tickFormatter={val => `${val}`} // plain counts
                domain={[0, dataMax => Math.ceil(dataMax * 1.18)]}
                label={{
                  value: "Units",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#ccc"
                }}
              />
              <Tooltip
                content={<ProductTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={() => "Units Sold"}
              />
              <Bar
                dataKey="totalUnits"
                name="Units Sold"
                fill="#82ca9d"
                radius={[12, 12, 0, 0]}
                stroke="#3ad29f"
                strokeWidth={2}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
