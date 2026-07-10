import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Storefront from './features/storefront/Storefront'
import OwnerSetup from './features/owner-setup/OwnerSetup'
import AdminDashboard from './features/admin-dashboard/AdminDashboard'
import CustomerChat from './features/customer-chat/CustomerChat'
import ItemDetail from './features/storefront/ItemDetail'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <Link to="/" className="brand">🐾 Outdoor Hounds</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/chat">Ask Us</Link>
          <Link to="/setup">Owner Setup</Link>
          <Link to="/admin">Admin</Link>
        </div>
      </nav>
      <main className="container">
        <Routes>
          <Route path="/" element={<Storefront />} />
          <Route path="/chat" element={<CustomerChat />} />
          <Route path="/setup" element={<OwnerSetup />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/items/:id" element={<ItemDetail />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
