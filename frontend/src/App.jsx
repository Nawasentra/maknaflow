import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LoginPage from './features/auth/LoginPage'
import AuthenticatedLayout from './layout/AuthenticatedLayout'
import { fetchTransactions } from './lib/api/transactions'
import { googleLogout } from '@react-oauth/google'

// CONFIG: tipe + cabang + default kategori
const initialBusinessConfigs = [
  {
    id: 'Laundry',
    unitBusiness: 'Laundry',
    defaultIncomeCategories: ['Cuci Kering', 'Cuci Basah', 'Setrika'],
    defaultExpenseCategories: ['Gaji Karyawan'],
    branches: [
      {
        id: 'Laundry Antapani',
        name: 'Laundry Antapani',
        incomeCategories: null,
        expenseCategories: null,
        active: true,
      },
      {
        id: 'Laundry Buah Batu',
        name: 'Laundry Buah Batu',
        incomeCategories: null,
        expenseCategories: null,
        active: true,
      },
    ],
    active: true,
  },
  {
    id: 'Carwash',
    unitBusiness: 'Carwash',
    defaultIncomeCategories: ['Cuci Motor'],
    defaultExpenseCategories: ['Beli Sabun'],
    branches: [
      {
        id: 'Carwash',
        name: 'Carwash',
        incomeCategories: null,
        expenseCategories: null,
        active: true,
      },
    ],
    active: true,
  },
  {
    id: 'Kos-kosan',
    unitBusiness: 'Kos-kosan',
    defaultIncomeCategories: ['Sewa Kamar'],
    defaultExpenseCategories: [],
    branches: [
      {
        id: 'Kos-kosan',
        name: 'Kos-kosan',
        incomeCategories: null,
        expenseCategories: null,
        active: true,
      },
    ],
    active: true,
  },
]

const initialAppSettings = {
  currency: 'IDR',
  defaultTransactionType: 'Income',
  defaultDateMode: 'today',
}

// INITIAL THEME HELPER
const getInitialTheme = () => {
  const stored = localStorage.getItem('theme')
  console.log('stored theme =', stored)
  if (stored === 'light' || stored === 'dark') return stored

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    console.log('system prefers dark, using dark')
    return 'dark'
  }

  console.log('no stored theme, using light')
  return 'light'
}

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1]
    const padded = base64.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

function App() {
  const [transactions, setTransactions] = useState([])
  const [businessConfigs, setBusinessConfigs] = useState(initialBusinessConfigs)
  const [appSettings, setAppSettings] = useState(initialAppSettings)
  const [lastUsedType, setLastUsedType] = useState('Income')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // notification state (in-app bell)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // auth + user profile
  // IMPORTANT: use backend token as truth
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem('auth_token')),
  )
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('google_user')
    return stored ? JSON.parse(stored) : null
  })

  // theme state
  const [theme, setTheme] = useState(getInitialTheme)

  // toast state (stacked)
  const [toasts, setToasts] = useState([]) // [{ id, message, type }]

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    const toast = { id, message, type }

    setToasts((prev) => [toast, ...prev])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }

  // LOAD TRANSACTIONS
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setIsLoading(true)
        const raw = await fetchTransactions({})

        if (cancelled) return

        setTransactions(raw)
        setError('')
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to load transactions:', e)
          setError('Gagal memuat data transaksi.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    if (isAuthenticated) {
      // only try backend when logged in
      load()
    }
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  // BUILD NOTIFICATIONS
  useEffect(() => {
    if (!transactions || transactions.length === 0) return

    const latest = transactions.slice(-5).map((t) => ({
      id: t.id,
      branchName: t.branch || 'Unknown',
      date: t.date || t.createdAt || '',
      description: t.description || t.category || 'Transaksi baru',
      type: t.type || 'Income',
      amountFormatted: new Intl.NumberFormat('id-ID').format(t.amount || 0),
      read: false,
    }))

    setNotifications(latest)
    setUnreadCount(latest.length)
  }, [transactions])

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  // APPLY THEME TO <html> AND PERSIST
  useEffect(() => {
    console.log('applying theme to html:', theme)
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      console.log('toggling theme:', prev, '->', next)
      return next
    })
  }

  // NEW: login that talks to backend
  const handleLoginSuccess = async (googleIdToken) => {
    try {
      // 1) Call backend Google social login endpoint
      const res = await fetch(
        'https://maknaflow-staging.onrender.com/api/auth/google/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Confirm with backend: id_token or access_token.
            id_token: googleIdToken,
          }),
        },
      )

      if (!res.ok) {
        const text = await res.text()
        console.error('Backend Google login failed:', text)
        showToast('Login gagal. Coba lagi atau hubungi admin.', 'error')
        return
      }

      const data = await res.json() // expect { key: '...' } or JWT
      const backendToken = data.key

      if (!backendToken) {
        console.error('No token in backend response:', data)
        showToast('Login gagal. Token tidak ditemukan.', 'error')
        return
      }

      // 2) Store Django token
      localStorage.setItem('auth_token', backendToken)

      // 3) Keep Google profile just for UI
      const payload = parseJwt(googleIdToken)
      if (payload) {
        const u = {
          name: payload.name || '',
          email: payload.email || '',
          picture: payload.picture || '',
        }
        setUser(u)
        localStorage.setItem('google_user', JSON.stringify(u))
      }

      setIsAuthenticated(true)
      showToast('Berhasil masuk.', 'success')
    } catch (err) {
      console.error('Login error:', err)
      showToast('Terjadi kesalahan saat login.', 'error')
    }
  }

  const handleLogout = () => {
    googleLogout()
    localStorage.removeItem('auth_token')
    localStorage.removeItem('google_user')
    setUser(null)
    setIsAuthenticated(false)
  }

  const authenticatedElement = (
    <AuthenticatedLayout
      transactions={transactions}
      setTransactions={setTransactions}
      businessConfigs={businessConfigs}
      setBusinessConfigs={setBusinessConfigs}
      appSettings={appSettings}
      setAppSettings={setAppSettings}
      lastUsedType={lastUsedType}
      setLastUsedType={setLastUsedType}
      isLoading={isLoading}
      error={error}
      notifications={notifications}
      unreadCount={unreadCount}
      onAllNotificationsRead={handleMarkAllNotificationsRead}
      user={user}
      onLogout={handleLogout}
      theme={theme}
      onToggleTheme={toggleTheme}
      showToast={showToast}
    />
  )

  return (
    <Router>
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg)',
          color: 'var(--text)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLoginSuccess} />} />
          <Route
            path="/dashboard/*"
            element={
              isAuthenticated ? (
                authenticatedElement
              ) : (
                <LoginPage onLogin={handleLoginSuccess} />
              )
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                authenticatedElement
              ) : (
                <LoginPage onLogin={handleLoginSuccess} />
              )
            }
          />
        </Routes>

        {toasts.length > 0 && (
          <div
            style={{
              position: 'fixed',
              top: '1.25rem',
              right: '1.25rem',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              alignItems: 'flex-end',
            }}
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                style={{
                  backgroundColor:
                    toast.type === 'error'
                      ? 'rgba(239, 68, 68, 0.96)'
                      : 'rgba(34, 197, 94, 0.96)',
                  color: '#f9fafb',
                  padding: '0.75rem 1rem',
                  borderRadius: 12,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
                  fontSize: '0.85rem',
                  maxWidth: 320,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
                <span>{toast.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Router>
  )
}

export default App
