import React, { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'

function NavBar({
  user,
  onLogout,
  notifications,
  unreadCount,
  onAllNotificationsRead,
  theme,
  onToggleTheme,
}) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = useMemo(() => {
    if (!user?.name) return 'JD'
    return user.name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }, [user])

  const handleLogoutClick = () => {
    setMenuOpen(false)
    onLogout?.()
  }

  return (
    <nav
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
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
            background:
              theme === 'dark'
                ? 'linear-gradient(to right, #f9fafb, #d1d5db)'
                : 'linear-gradient(to right, #0f172a, #6b7280)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          MaknaFlow Dashboard
        </h1>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <NavLinkItem to="/dashboard" label="Dashboard" currentPath={location.pathname} />
          <NavLinkItem
            to="/dashboard/transactions"
            label="Transactions"
            currentPath={location.pathname}
          />
          <NavLinkItem
            to="/dashboard/settings"
            label="Settings"
            currentPath={location.pathname}
          />
          <NavLinkItem
            to="/dashboard/add-business"
            label="Tambah Unit"
            currentPath={location.pathname}
          />

          {/* theme toggle */}
          <button
            onClick={onToggleTheme}
            style={{
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: '9999px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* avatar + dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || 'User'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span
                  style={{
                    fontWeight: 600,
                    color: 'var(--text)',
                    fontSize: '0.9rem',
                  }}
                >
                  {initials}
                </span>
              )}
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  marginTop: 8,
                  backgroundColor: 'var(--bg)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  minWidth: 180,
                  padding: '0.5rem 0',
                  zIndex: 40,
                }}
              >
                <div
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: 12,
                    color: 'var(--subtext)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {user?.name || 'User'}
                  <br />
                  <span style={{ color: 'var(--subtext)' }}>{user?.email}</span>
                </div>
                <button
                  onClick={handleLogoutClick}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    textAlign: 'left',
                    fontSize: 13,
                    background: 'none',
                    border: 'none',
                    color: '#f97373',
                    cursor: 'pointer',
                  }}
                >
                  Log out
                </button>
              </div>
            )}
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
        color: isActive ? 'var(--text)' : 'var(--subtext)',
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
