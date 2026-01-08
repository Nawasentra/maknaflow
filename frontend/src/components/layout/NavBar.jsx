import React from 'react'
import { Link, useLocation } from 'react-router-dom'

function NavBar() {
  const location = useLocation()

  return (
    <nav
      style={{
        backgroundColor: '#1c1c1c',
        borderBottom: '1px solid #27272a',
        padding: '1rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, white, #d1d5db)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          MaknaFlow Dashboard
        </h1>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <NavLinkItem to="/dashboard" label="Dashboard" currentPath={location.pathname} />
          <NavLinkItem to="/dashboard/transactions" label="Transactions" currentPath={location.pathname} />
          <NavLinkItem to="/dashboard/settings" label="Settings" currentPath={location.pathname} />
          <NavLinkItem to="/dashboard/add-business" label="Tambah Unit" currentPath={location.pathname} />
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              backgroundColor: '#a1a1aa',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
            }}
          >
            JD
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLinkItem({ to, label, currentPath }) {
  const isActive = currentPath === to
  return (
    <Link
      to={to}
      style={{
        color: isActive ? 'white' : '#a1a1aa',
        textDecoration: 'none',
        fontWeight: isActive ? '600' : '500',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </Link>
  )
}

export default NavBar
