import React from 'react'
import './CSS/Home.css'
import Products from '../Components/Products/Products'

const Home = () => {
  return (
    <div className="home-container">
      <h1 className="home-title">Our Products</h1>
      <Products />
    </div>
  )
}

export default Home
