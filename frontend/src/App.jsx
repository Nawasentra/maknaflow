import React, { useState, useMemo } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts'

// SAMPLE DATA
const rawTransactions = [
  {
    id: 1,
    date: '2026-01-07',
    unitBusiness: 'Laundry',
    branch: 'Laundry Antapani',
    category: 'Cuci Kering',
    type: 'Income',
    amount: 250000,
    payment: 'Cash',
  },
  {
    id: 2,
    date: '2026-01-07',
    unitBusiness: 'Laundry',
    branch: 'Laundry Antapani',
    category: 'Setrika',
    type: 'Income',
    amount: 150000,
    payment: 'QRIS',
  },
  {
    id: 3,
    date: '2026-01-06',
    unitBusiness: 'Carwash',
    branch: 'Carwash',
    category: 'Cuci Motor',
    type: 'Income',
    amount: 75000,
    payment: 'Cash',
  },
  {
    id: 4,
    date: '2026-01-06',
    unitBusiness: 'Laundry',
    branch: 'Laundry Buah Batu',
    category: 'Cuci Basah',
    type: 'Income',
    amount: 180000,
    payment: 'QRIS',
  },
  {
    id: 5,
    date: '2026-01-05',
    unitBusiness: 'Kos-kosan',
    branch: 'Kos-kosan',
    category: 'Sewa Kamar',
    type: 'Income',
    amount: 800000,
    payment: 'Cash',
  },
  {
    id: 6,
    date: '2026-01-04',
    unitBusiness: 'Laundry',
    branch: 'Laundry Antapani',
    category: 'Gaji Karyawan',
    type: 'Expense',
    amount: 500000,
    payment: 'Cash',
  },
  {
    id: 7,
    date: '2026-01-03',
    unitBusiness: 'Carwash',
    branch: 'Carwash',
    category: 'Beli Sabun',
    type: 'Expense',
    amount: 150000,
    payment: 'Cash',
  },
]

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
  defaultTransactionType: 'Income', // 'Income' | 'Expense' | 'LastUsed'
  defaultDateMode: 'today', // 'today' | 'empty'
}

function App() {
  return (
    <Router>
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#09090b',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard/*" element={<AuthenticatedLayout />} />
          <Route path="/" element={<LoginPage />} />
        </Routes>
      </div>
    </Router>
  )
}

// LOGIN PAGE
function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = () => {
    setIsLoading(true)
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 1500)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#1c1c1c',
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '3rem',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, white, #d1d5db)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem',
          }}
        >
          MaknaFlow
        </h1>
        <p style={{ color: '#a1a1aa', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Dashboard Keuangan Bisnis
        </p>
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          style={{
            width: '100%',
            backgroundColor: 'white',
            color: 'black',
            padding: '1rem 2rem',
            borderRadius: '12px',
            fontSize: '1.1rem',
            fontWeight: '600',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            transition: 'all 0.2s',
          }}
        >
          {isLoading ? '🔄 Sedang Masuk...' : '👤 Masuk dengan Akun Google'}
        </button>
        <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '1.5rem' }}>
          Hanya pemilik bisnis yang dapat mengakses
        </p>
      </div>
    </div>
  )
}

// LAYOUT INSIDE /dashboard/*
function AuthenticatedLayout() {
  const [transactions, setTransactions] = useState(rawTransactions)
  const [businessConfigs, setBusinessConfigs] = useState(initialBusinessConfigs)
  const [appSettings, setAppSettings] = useState(initialAppSettings)
  const [lastUsedType, setLastUsedType] = useState('Income')

  return (
    <>
      <NavBar />
      <Routes>
        <Route
          path="/"
          element={<DashboardPage transactions={transactions} />}
        />
        <Route
          path="/transactions"
          element={
            <TransactionsPage
              transactions={transactions}
              setTransactions={setTransactions}
              businessConfigs={businessConfigs}
              appSettings={appSettings}
              lastUsedType={lastUsedType}
              setLastUsedType={setLastUsedType}
            />
          }
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              businessConfigs={businessConfigs}
              setBusinessConfigs={setBusinessConfigs}
              appSettings={appSettings}
              setAppSettings={setAppSettings}
            />
          }
        />
        <Route
          path="/add-business"
          element={
            <AddBusinessPage
              businessConfigs={businessConfigs}
              setBusinessConfigs={setBusinessConfigs}
            />
          }
        />
      </Routes>
    </>
  )
}

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
          <NavLinkItem
            to="/dashboard/transactions"
            label="Transactions"
            currentPath={location.pathname}
          />
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

// DASHBOARD PAGE
function DashboardPage({ transactions }) {
  const [filterDate, setFilterDate] = useState('Hari Ini')
  const [filterUnit, setFilterUnit] = useState('Semua Unit')
  const [filterBranch, setFilterBranch] = useState('Semua Cabang')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // dynamic today
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const sevenDaysAgo = new Date(startOfToday)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const unitOptions = useMemo(
    () => ['Semua Unit', ...Array.from(new Set(transactions.map((t) => t.unitBusiness)))],
    [transactions],
  )

  const branchOptions = useMemo(() => {
    const filteredByUnit =
      filterUnit === 'Semua Unit'
        ? transactions
        : transactions.filter((t) => t.unitBusiness === filterUnit)
    return ['Semua Cabang', ...Array.from(new Set(filteredByUnit.map((t) => t.branch)))]
  }, [transactions, filterUnit])

  const filteredTransactions = transactions.filter((t) => {
    const txDate = new Date(t.date)

    let inRange = true
    if (filterDate === 'Hari Ini') {
      inRange = txDate.toDateString() === startOfToday.toDateString()
    } else if (filterDate === '7 Hari Terakhir') {
      inRange = txDate >= sevenDaysAgo && txDate <= today
    } else if (filterDate === 'Bulan Ini') {
      inRange = txDate >= startOfMonth && txDate <= today
    } else if (filterDate === 'Custom' && customStart && customEnd) {
      const start = new Date(customStart)
      const end = new Date(customEnd)
      inRange = txDate >= start && txDate <= end
    }

    const unitMatch = filterUnit === 'Semua Unit' || t.unitBusiness === filterUnit
    const branchMatch = filterBranch === 'Semua Cabang' || t.branch === filterBranch

    return inRange && unitMatch && branchMatch
  })

  const incomeTotal = filteredTransactions
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0)
  const expenseTotal = filteredTransactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const netProfit = incomeTotal - expenseTotal
  const totalTransactions = filteredTransactions.length

  const dailyMap = filteredTransactions.reduce((acc, t) => {
    const key = t.date
    if (!acc[key]) {
      acc[key] = { date: key, income: 0, expense: 0 }
    }
    if (t.type === 'Income') {
      acc[key].income += t.amount
    } else if (t.type === 'Expense') {
      acc[key].expense += t.amount
    }
    return acc
  }, {})

  const trendData = Object.values(dailyMap).sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  )

  const incomeSourcesMap = filteredTransactions
    .filter((t) => t.type === 'Income')
    .reduce((acc, t) => {
      acc[t.payment] = (acc[t.payment] || 0) + t.amount
      return acc
    }, {})

  const incomeSources = Object.entries(incomeSourcesMap).map(([name, value]) => ({
    name,
    value,
  }))

  const expenseCatMap = filteredTransactions
    .filter((t) => t.type === 'Expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {})

  const expenseByCategory = Object.entries(expenseCatMap).map(([name, value]) => ({
    name,
    value,
  }))

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    })
      .format(amount)
      .replace('Rp', '')
      .trim()

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* FILTERS */}
      <div
        style={{
          backgroundColor: '#1c1c1c',
          border: '1px solid #27272a',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          🌐 Filter Global
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
            alignItems: 'flex-end',
          }}
        >
          {/* Rentang Tanggal */}
          <div>
            <label
              style={{
                display: 'block',
                color: '#a1a1aa',
                fontSize: '0.875rem',
                marginBottom: '0.5rem',
              }}
            >
              Rentang Tanggal
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 125px 125px',
                gap: '0.5rem',
                justifyContent: 'flex-start',
              }}
            >
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{
                  width: '140px',
                  maxWidth: '210px',
                  backgroundColor: '#1c1c1c',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  padding: '0.7rem 0.9rem',
                  color: 'white',
                  fontSize: '0.95rem',
                }}
              >
                <option>Hari Ini</option>
                <option>7 Hari Terakhir</option>
                <option>Bulan Ini</option>
                <option>Custom</option>
              </select>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}
              >
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  disabled={filterDate !== 'Custom'}
                  style={{
                    width: '140px',             // FIXED WIDTH
                    backgroundColor: filterDate === 'Custom' ? '#111827' : '#020617',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '0.45rem 0.5rem',
                    color: filterDate === 'Custom' ? 'white' : '#6b7280',
                    fontSize: '0.8rem',
                    cursor: filterDate === 'Custom' ? 'pointer' : 'not-allowed',
                    opacity: filterDate === 'Custom' ? 1 : 0.5,
                  }}
                />
              </div>

              {/* end date */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  paddingRight: '0.4rem',   // jarak ekstra dari Unit Bisnis
                }}
              >
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  disabled={filterDate !== 'Custom'}
                  style={{
                    width: '140px',           // SAMA dengan start date
                    backgroundColor: filterDate === 'Custom' ? '#111827' : '#020617',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '0.45rem 0.5rem',
                    color: filterDate === 'Custom' ? 'white' : '#6b7280',
                    fontSize: '0.8rem',
                    cursor: filterDate === 'Custom' ? 'pointer' : 'not-allowed',
                    opacity: filterDate === 'Custom' ? 1 : 0.5,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Unit Bisnis */}
          <div>
            <label
              style={{
                display: 'block',
                color: '#a1a1aa',
                fontSize: '0.875rem',
                marginBottom: '0.5rem',
              }}
            >
              Unit Bisnis
            </label>
            <select
              value={filterUnit}
              onChange={(e) => {
                setFilterUnit(e.target.value)
                setFilterBranch('Semua Cabang')
              }}
              style={{
                width: '100%',
                backgroundColor: '#1c1c1c',
                border: '1px solid #27272a',
                borderRadius: '8px',
                padding: '0.75rem',
                color: 'white',
                fontSize: '1rem',
              }}
            >
              {unitOptions.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Cabang */}
          <div>
            <label
              style={{
                display: 'block',
                color: '#a1a1aa',
                fontSize: '0.875rem',
                marginBottom: '0.5rem',
              }}
            >
              Cabang
            </label>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#1c1c1c',
                border: '1px solid #27272a',
                borderRadius: '8px',
                padding: '0.75rem',
                color: 'white',
                fontSize: '1rem',
              }}
            >
              {branchOptions.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <KpiCard
          title="Total Pendapatan"
          value={`Rp ${formatCurrency(incomeTotal)}`}
          icon="💰"
          color="#10b981"
        />
        <KpiCard
          title="Total Pengeluaran"
          value={`Rp ${formatCurrency(expenseTotal)}`}
          icon="💸"
          color="#ef4444"
        />
        <KpiCard
          title="Pendapatan Bersih"
          value={`Rp ${formatCurrency(netProfit)}`}
          icon="✅"
          color="#10b981"
        />
        <KpiCard title="Jumlah Transaksi" value={totalTransactions} icon="📊" color="#8b5cf6" />
      </div>

      {/* Charts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#1c1c1c',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            📈 Tren Pendapatan vs Pengeluaran
          </h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Pendapatan"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Pengeluaran"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#1c1c1c',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          <div>
            <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
              🥧 Sumber Pendapatan
            </h4>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeSources}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {incomeSources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
              📊 Top Pengeluaran
            </h4>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expenseByCategory}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
                >
                  <CartesianGrid stroke="#27272a" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis type="category" dataKey="name" stroke="#9ca3af" />
                  <Tooltip />
                  <Bar dataKey="value" name="Jumlah" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// TRANSACTIONS PAGE
function TransactionsPage({
  transactions,
  setTransactions,
  businessConfigs,
  appSettings,
  lastUsedType,
  setLastUsedType,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc',
  })

  const filteredTransactions = transactions.filter((t) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      t.branch.toLowerCase().includes(q) ||
      t.unitBusiness.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q) ||
      t.payment.toLowerCase().includes(q)
    )
  })

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const { key, direction } = sortConfig
    let cmp = 0

    if (key === 'date') {
      cmp = new Date(a.date) - new Date(b.date)
    } else if (key === 'amount') {
      cmp = a.amount - b.amount
    } else {
      cmp = String(a[key]).localeCompare(String(b[key]))
    }

    return direction === 'asc' ? cmp : -cmp
  })

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      if (key === 'date' || key === 'amount') {
        return { key, direction: 'desc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleAskDelete = (transaction) => {
    setTransactionToDelete(transaction)
    setConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      setTransactions((prev) => prev.filter((t) => t.id !== transactionToDelete.id))
    }
    setConfirmOpen(false)
    setTransactionToDelete(null)
  }

  const handleCancelDelete = () => {
    setConfirmOpen(false)
    setTransactionToDelete(null)
  }

  const handleAddTransaction = (newTx) => {
    setTransactions((prev) => [
      ...prev,
      { ...newTx, id: prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1 },
    ])
    setLastUsedType(newTx.type)
    setAddOpen(false)
  }

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1.5rem' }}>
        📋 Transaksi
      </h1>

      <div
        style={{
          backgroundColor: '#1c1c1c',
          border: '1px solid #27272a',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #27272a',
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                Tabel Transaksi
              </h3>
              <p
                style={{
                  color: '#a1a1aa',
                  fontSize: '0.875rem',
                  margin: '0.25rem 0 0 0',
                }}
              >
                {sortedTransactions.length} transaksi ditemukan
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                width: '100%',
                maxWidth: '500px',
              }}
            >
              <input
                placeholder="🔍 Cari transaksi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: '#1c1c1c',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: 'white',
                  fontSize: '0.875rem',
                }}
              />
              <button
                onClick={() => setAddOpen(true)}
                style={{
                  backgroundColor: 'white',
                  color: 'black',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '0.875rem',
                }}
              >
                + Tambah Transaksi
              </button>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid #27272a',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
              >
                <ThSortable label="Tanggal" onClick={() => handleSort('date')} />
                <ThSortable label="Unit Bisnis" onClick={() => handleSort('unitBusiness')} />
                <ThSortable label="Cabang" onClick={() => handleSort('branch')} />
                <ThSortable label="Kategori" onClick={() => handleSort('category')} />
                <ThSortable label="Tipe" onClick={() => handleSort('type')} />
                <ThSortable label="Jumlah" onClick={() => handleSort('amount')} />
                <ThSortable label="Pembayaran" onClick={() => handleSort('payment')} />
                <th
                  style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#a1a1aa',
                    textTransform: 'uppercase',
                  }}
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((t) => (
                <TransactionRow key={t.id} transaction={t} onAskDelete={handleAskDelete} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="Hapus Permanen"
          description="Transaksi ini akan dihapus secara permanen dari sistem."
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />
      )}

      {addOpen && (
        <AddTransactionModal
          onClose={() => setAddOpen(false)}
          onSave={handleAddTransaction}
          existingData={transactions}
          businessConfigs={businessConfigs}
          appSettings={appSettings}
          lastUsedType={lastUsedType}
        />
      )}
    </main>
  )
}

function ThSortable({ label, onClick }) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: '1rem 1.5rem',
        textAlign: 'left',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#a1a1aa',
        textTransform: 'uppercase',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {label}
    </th>
  )
}

// CONFIRM DIALOG
function ConfirmDialog({ title, description, onCancel, onConfirm }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: 380,
          backgroundColor: '#020617',
          borderRadius: 16,
          border: '1px solid #27272a',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{title}</h2>
        <p style={{ fontSize: '0.9rem', color: '#a1a1aa', marginBottom: '1.5rem' }}>
          {description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.6rem 1.3rem',
              borderRadius: 9999,
              border: '1px solid #27272a',
              backgroundColor: 'transparent',
              color: '#e5e5e5',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: 9999,
              border: 'none',
              backgroundColor: '#ef4444',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

// ADD TRANSACTION MODAL
function AddTransactionModal({
  onClose,
  onSave,
  existingData,
  businessConfigs,
  appSettings,
  lastUsedType,
}) {
  const unique = (arr) => Array.from(new Set(arr))

  const unitOptions = useMemo(
    () =>
      unique([
        ...businessConfigs.filter((b) => b.active).map((b) => b.unitBusiness),
        ...existingData.map((t) => t.unitBusiness),
      ]),
    [businessConfigs, existingData],
  )

  const [unitBusiness, setUnitBusiness] = useState(unitOptions[0] || '')
  const configForUnit = useMemo(
    () => businessConfigs.find((b) => b.unitBusiness === unitBusiness && b.active),
    [businessConfigs, unitBusiness],
  )

  const [branch, setBranch] = useState('')
  const [date, setDate] = useState(
    appSettings.defaultDateMode === 'today'
      ? new Date().toISOString().slice(0, 10)
      : '',
  )

  const initialType =
    appSettings.defaultTransactionType === 'Income' ||
    appSettings.defaultTransactionType === 'Expense'
      ? appSettings.defaultTransactionType
      : lastUsedType || 'Income'

  const [type, setType] = useState(initialType)
  const [category, setCategory] = useState('')
  const [payment, setPayment] = useState('')
  const [amountInput, setAmountInput] = useState('')

  const branchOptions = useMemo(() => {
    if (configForUnit && configForUnit.branches.length) {
      return configForUnit.branches.filter((b) => b.active !== false).map((b) => b.name)
    }
    if (!unitBusiness) return []
    return unique(
      existingData.filter((t) => t.unitBusiness === unitBusiness).map((t) => t.branch),
    )
  }, [configForUnit, existingData, unitBusiness])

  const kategoriOptions = useMemo(() => {
    if (!unitBusiness) return []
    if (configForUnit) {
      const branchConfig =
        configForUnit.branches.find((b) => b.name === branch && b.active !== false) ||
        null
      const defaultIncome = configForUnit.defaultIncomeCategories || []
      const defaultExpense = configForUnit.defaultExpenseCategories || []

      if (type === 'Income') {
        const list = branchConfig?.incomeCategories ?? defaultIncome
        if (list && list.length) return list
      } else {
        const list = branchConfig?.expenseCategories ?? defaultExpense
        if (list && list.length) return list
      }
    }
    return unique(existingData.map((t) => t.category))
  }, [configForUnit, branch, type, existingData, unitBusiness])

  const pembayaranOptions = useMemo(
    () => unique(existingData.map((t) => t.payment)),
    [existingData],
  )

  React.useEffect(() => {
    if (branchOptions.length && !branchOptions.includes(branch)) {
      setBranch(branchOptions[0])
    }
  }, [branchOptions, branch])

  React.useEffect(() => {
    if (!payment && pembayaranOptions.length) {
      setPayment(pembayaranOptions[0])
    }
  }, [pembayaranOptions, payment])

  React.useEffect(() => {
    if (kategoriOptions.length && !kategoriOptions.includes(category)) {
      setCategory(kategoriOptions[0])
    }
  }, [kategoriOptions, category])

  const formatAmountDisplay = (raw) => {
    const digits = raw.replace(/[^\d]/g, '')
    if (!digits) return ''
    return new Intl.NumberFormat('id-ID').format(Number(digits))
  }

  const handleAmountChange = (e) => {
    const raw = e.target.value
    setAmountInput(formatAmountDisplay(raw))
  }

  const handleSubmit = () => {
    const digits = amountInput.replace(/[^\d]/g, '')
    if (!date || !unitBusiness || !branch || !category || !type || !payment || !digits) {
      return
    }
    onSave({
      date,
      unitBusiness,
      branch,
      category,
      type,
      amount: Number(digits),
      payment,
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: 420,
          backgroundColor: '#020617',
          borderRadius: 16,
          border: '1px solid #27272a',
          padding: '1.5rem',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tambah Transaksi</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              fontSize: '1.25rem',
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <Field label="Tanggal">
            <div style={{ display: 'flex' }}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
          </Field>

          <Field label="Unit Bisnis">
            <select
              value={unitBusiness}
              onChange={(e) => {
                setUnitBusiness(e.target.value)
                setBranch('')
              }}
              style={inputStyle}
            >
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Cabang">
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              style={inputStyle}
            >
              {branchOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tipe">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={inputStyle}
            >
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
          </Field>

          <Field label="Kategori">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              {kategoriOptions.length === 0 ? (
                <option value="">Belum ada kategori untuk tipe ini</option>
              ) : (
                kategoriOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field label="Jumlah">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>Rp</span>
              <input
                type="text"
                value={amountInput}
                onChange={handleAmountChange}
                placeholder="250000"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </Field>

          <Field label="Pembayaran">
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              style={inputStyle}
            >
              {pembayaranOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.6rem 1.3rem',
              borderRadius: 9999,
              border: '1px solid #27272a',
              backgroundColor: 'transparent',
              color: '#e5e5e5',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: 9999,
              border: 'none',
              backgroundColor: 'white',
              color: 'black',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  backgroundColor: '#020617',
  borderRadius: 8,
  border: '1px solid #27272a',
  padding: '0.5rem 0.75rem',
  color: 'white',
  fontSize: '0.85rem',
  outline: 'none',
}

function Field({ label, children }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.8rem',
          color: '#e5e5e5',
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

// TRANSACTION ROW
function TransactionRow({ transaction, onAskDelete }) {
  return (
    <tr style={{ borderBottom: '1px solid #27272a' }}>
      <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'white' }}>
        {new Date(transaction.date).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
        })}
      </td>
      <td style={{ padding: '1rem 1.5rem', color: '#d1d5db' }}>{transaction.unitBusiness}</td>
      <td style={{ padding: '1rem 1.5rem' }}>
        <span
          style={{
            padding: '0.375rem 0.75rem',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500',
          }}
        >
          {transaction.branch}
        </span>
      </td>
      <td style={{ padding: '1rem 1.5rem', color: '#d1d5db' }}>{transaction.category}</td>
      <td style={{ padding: '1rem 1.5rem' }}>
        <span
          style={{
            padding: '0.375rem 0.75rem',
            backgroundColor:
              transaction.type === 'Income'
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
            color: transaction.type === 'Income' ? '#4ade80' : '#f87171',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500',
          }}
        >
          {transaction.type}
        </span>
      </td>
      <td
        style={{
          padding: '1rem 1.5rem',
          fontWeight: '600',
          color: transaction.type === 'Income' ? '#10b981' : '#ef4444',
        }}
      >
        Rp {new Intl.NumberFormat('id-ID').format(transaction.amount)}
      </td>
      <td style={{ padding: '1rem 1.5rem', color: '#a1a1aa' }}>{transaction.payment}</td>
      <td style={{ padding: '1rem 1.5rem' }}>
        <button
          onClick={() => onAskDelete(transaction)}
          title="Hapus Permanen"
          style={{
            color: '#f87171',
            padding: '0.5rem',
            borderRadius: '8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '1.25rem',
            transition: 'all 0.2s',
          }}
        >
          🗑️
        </button>
      </td>
    </tr>
  )
}

// KPI CARD
function KpiCard({ title, value, icon, color }) {
  return (
    <div
      style={{
        backgroundColor: '#1c1c1c',
        border: '1px solid #27272a',
        borderRadius: '12px',
        padding: '1.5rem',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            width: '3rem',
            height: '3rem',
            backgroundColor: color + '20',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>{icon}</span>
        </div>
        <div>
          <p
            style={{
              color: '#a1a1aa',
              fontSize: '0.875rem',
              margin: 0,
              marginBottom: '0.25rem',
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: '1.875rem',
              fontWeight: '700',
              margin: 0,
              color: 'white',
            }}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

// SETTINGS PAGE
function SettingsPage({ businessConfigs, setBusinessConfigs, appSettings, setAppSettings }) {
  const [selectedUnitId, setSelectedUnitId] = useState(
    businessConfigs.length ? businessConfigs[0].id : '',
  )
  const selectedUnit = businessConfigs.find((b) => b.id === selectedUnitId) || null

  const [selectedBranchId, setSelectedBranchId] = useState(
    selectedUnit && selectedUnit.branches.length ? selectedUnit.branches[0].id : '',
  )

  React.useEffect(() => {
    if (!selectedUnit) return
    if (!selectedUnit.branches.length) {
      setSelectedBranchId('')
      return
    }
    if (!selectedUnit.branches.find((b) => b.id === selectedBranchId)) {
      setSelectedBranchId(selectedUnit.branches[0].id)
    }
  }, [selectedUnitId, businessConfigs])

  const selectedBranch =
    selectedUnit && selectedUnit.branches.find((b) => b.id === selectedBranchId)

  const handleRenameUnit = (newName) => {
    setBusinessConfigs((prev) =>
      prev.map((b) =>
        b.id === selectedUnitId
          ? {
              ...b,
              unitBusiness: newName,
              id: newName,
            }
          : b,
      ),
    )
    setSelectedUnitId(newName)
  }

  const handleToggleUnitActive = () => {
    setBusinessConfigs((prev) =>
      prev.map((b) =>
        b.id === selectedUnitId
          ? {
              ...b,
              active: !b.active,
            }
          : b,
      ),
    )
  }

  const handleRenameBranch = (newName) => {
    if (!selectedUnit || !selectedBranch) return
    setBusinessConfigs((prev) =>
      prev.map((u) =>
        u.id === selectedUnit.id
          ? {
              ...u,
              branches: u.branches.map((br) =>
                br.id === selectedBranch.id
                  ? { ...br, name: newName, id: newName }
                  : br,
              ),
            }
          : u,
      ),
    )
    setSelectedBranchId(newName)
  }

  const handleToggleBranchActive = () => {
    if (!selectedUnit || !selectedBranch) return
    setBusinessConfigs((prev) =>
      prev.map((u) =>
        u.id === selectedUnit.id
          ? {
              ...u,
              branches: u.branches.map((br) =>
                br.id === selectedBranch.id
                  ? { ...br, active: br.active === false ? true : false }
                  : br,
              ),
            }
          : u,
      ),
    )
  }

  // Edit default kategori
  const [editSelectedId, setEditSelectedId] = useState(
    businessConfigs.length ? businessConfigs[0].id : '',
  )
  const editSelected = businessConfigs.find((b) => b.id === editSelectedId)
  const [incomeInput, setIncomeInput] = useState('')
  const [expenseInput, setExpenseInput] = useState('')

  const handleAddIncome = () => {
    if (!editSelected) return
    const trimmed = incomeInput.trim()
    if (!trimmed) return
    if (!(editSelected.defaultIncomeCategories || []).includes(trimmed)) {
      const updated = businessConfigs.map((b) =>
        b.id === editSelected.id
          ? {
              ...b,
              defaultIncomeCategories: [
                ...(b.defaultIncomeCategories || []),
                trimmed,
              ],
            }
          : b,
      )
      setBusinessConfigs(updated)
    }
    setIncomeInput('')
  }

  const handleAddExpense = () => {
    if (!editSelected) return
    const trimmed = expenseInput.trim()
    if (!trimmed) return
    if (!(editSelected.defaultExpenseCategories || []).includes(trimmed)) {
      const updated = businessConfigs.map((b) =>
        b.id === editSelected.id
          ? {
              ...b,
              defaultExpenseCategories: [
                ...(b.defaultExpenseCategories || []),
                trimmed,
              ],
            }
          : b,
      )
      setBusinessConfigs(updated)
    }
    setExpenseInput('')
  }

  const handleRemoveIncome = (cat) => {
    if (!editSelected) return
    const updated = businessConfigs.map((b) =>
      b.id === editSelected.id
        ? {
            ...b,
            defaultIncomeCategories: (b.defaultIncomeCategories || []).filter(
              (c) => c !== cat,
            ),
          }
        : b,
    )
    setBusinessConfigs(updated)
  }

  const handleRemoveExpense = (cat) => {
    if (!editSelected) return
    const updated = businessConfigs.map((b) =>
      b.id === editSelected.id
        ? {
            ...b,
            defaultExpenseCategories: (b.defaultExpenseCategories || []).filter(
              (c) => c !== cat,
            ),
          }
        : b,
    )
    setBusinessConfigs(updated)
  }

  const handleExport = () => {
    alert('Export CSV coming soon (dummy).')
  }

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '2rem' }}>
        ⚙️ Settings
      </h1>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Struktur Bisnis */}
        <div
          style={{
            backgroundColor: '#1c1c1c',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Struktur Bisnis
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Tipe Unit Bisnis</p>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#020617',
                borderRadius: 12,
                border: '1px solid #27272a',
                padding: '0.7rem 1rem',
                fontSize: 13,
                color: 'white',
                outline: 'none',
              }}
            >
              {businessConfigs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.unitBusiness}
                </option>
              ))}
            </select>
          </div>

          {selectedUnit && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                  Ganti nama tipe unit
                </p>
                <input
                  value={selectedUnit.unitBusiness}
                  onChange={(e) => handleRenameUnit(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#020617',
                    borderRadius: 12,
                    border: '1px solid #27272a',
                    padding: '0.7rem 1rem',
                    fontSize: 13,
                    color: 'white',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleToggleUnitActive}
                style={{
                  backgroundColor: selectedUnit.active ? '#22c55e' : '#6b7280',
                  borderRadius: 9999,
                  border: 'none',
                  color: 'black',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '0.45rem 1.1rem',
                  cursor: 'pointer',
                }}
              >
                {selectedUnit.active ? 'Nonaktifkan Tipe' : 'Aktifkan Tipe'}
              </button>
            </>
          )}
        </div>

        {/* Cabang */}
        <div
          style={{
            backgroundColor: '#1c1c1c',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Cabang
          </h2>
          {selectedUnit ? (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                  Pilih cabang dari tipe ini
                </p>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#020617',
                    borderRadius: 12,
                    border: '1px solid #27272a',
                    padding: '0.7rem 1rem',
                    fontSize: 13,
                    color: 'white',
                    outline: 'none',
                  }}
                >
                  {selectedUnit.branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBranch && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                      Ganti nama cabang
                    </p>
                    <input
                      value={selectedBranch.name}
                      onChange={(e) => handleRenameBranch(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#020617',
                        borderRadius: 12,
                        border: '1px solid #27272a',
                        padding: '0.7rem 1rem',
                        fontSize: 13,
                        color: 'white',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBranchActive}
                    style={{
                      backgroundColor:
                        selectedBranch.active === false ? '#6b7280' : '#22c55e',
                      borderRadius: 9999,
                      border: 'none',
                      color: 'black',
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '0.45rem 1.1rem',
                      cursor: 'pointer',
                    }}
                  >
                    {selectedBranch.active === false
                      ? 'Aktifkan Cabang'
                      : 'Nonaktifkan Cabang'}
                  </button>
                </>
              )}
            </>
          ) : (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>
              Belum ada tipe unit bisnis yang dikonfigurasi.
            </p>
          )}
        </div>

        {/* Default kategori per tipe */}
        <div
          style={{
            backgroundColor: '#1c1c1c',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Default Kategori per Tipe
          </h2>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 6,
                color: '#e5e5e5',
              }}
            >
              Pilih Tipe Unit Bisnis
            </label>
            <select
              value={editSelectedId}
              onChange={(e) => setEditSelectedId(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#020617',
                borderRadius: 12,
                border: '1px solid #27272a',
                padding: '0.7rem 1rem',
                fontSize: 13,
                color: 'white',
                outline: 'none',
              }}
            >
              {businessConfigs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.unitBusiness}
                </option>
              ))}
            </select>
          </div>

          {editSelected && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem',
                marginTop: '1rem',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: '#bbf7d0',
                  }}
                >
                  Default Kategori Pendapatan
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <input
                    placeholder="Tambah kategori pendapatan…"
                    value={incomeInput}
                    onChange={(e) => setIncomeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddIncome()
                      }
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#020617',
                      borderRadius: 9999,
                      border: '1px solid #27272a',
                      padding: '0.5rem 0.9rem',
                      fontSize: 12,
                      color: 'white',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddIncome}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 9999,
                      border: 'none',
                      color: 'black',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '0.45rem 0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    Tambah
                  </button>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  {(editSelected.defaultIncomeCategories || []).map((cat) => (
                    <span
                      key={cat}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '0.3rem 0.7rem',
                        borderRadius: 9999,
                        backgroundColor: 'rgba(34, 197, 94, 0.15)',
                        color: '#4ade80',
                        fontSize: 11,
                      }}
                    >
                      {cat}
                      <button
                        type="button"
                        onClick={() => handleRemoveIncome(cat)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#6ee7b7',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {!editSelected.defaultIncomeCategories?.length && (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#6b7280',
                      }}
                    >
                      Belum ada kategori pendapatan default.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: '#fecaca',
                  }}
                >
                  Default Kategori Pengeluaran
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <input
                    placeholder="Tambah kategori pengeluaran…"
                    value={expenseInput}
                    onChange={(e) => setExpenseInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddExpense()
                      }
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#020617',
                      borderRadius: 9999,
                      border: '1px solid #27272a',
                      padding: '0.5rem 0.9rem',
                      fontSize: 12,
                      color: 'white',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddExpense}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 9999,
                      border: 'none',
                      color: 'black',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '0.45rem 0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    Tambah
                  </button>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  {(editSelected.defaultExpenseCategories || []).map((cat) => (
                    <span
                      key={cat}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '0.3rem 0.7rem',
                        borderRadius: 9999,
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#fca5a5',
                        fontSize: 11,
                      }}
                    >
                      {cat}
                      <button
                        type="button"
                        onClick={() => handleRemoveExpense(cat)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#fecaca',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {!editSelected.defaultExpenseCategories?.length && (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#6b7280',
                      }}
                    >
                      Belum ada kategori pengeluaran default.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preferensi Transaksi */}
        <div
          style={{
            backgroundColor: '#1c1c1c',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Preferensi Transaksi
          </h2>
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
              Default tipe transaksi
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['Income', 'Expense', 'LastUsed'].map((opt) => (
                <label
                  key={opt}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <input
                    type="radio"
                    checked={appSettings.defaultTransactionType === opt}
                    onChange={() =>
                      setAppSettings((prev) => ({
                        ...prev,
                        defaultTransactionType: opt,
                      }))
                    }
                  />
                  <span>
                    {opt === 'Income'
                      ? 'Income'
                      : opt === 'Expense'
                      ? 'Expense'
                      : 'Gunakan tipe terakhir'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
              Default tanggal transaksi
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['today', 'empty'].map((mode) => (
                <label
                  key={mode}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <input
                    type="radio"
                    checked={appSettings.defaultDateMode === mode}
                    onChange={() =>
                      setAppSettings((prev) => ({
                        ...prev,
                        defaultDateMode: mode,
                      }))
                    }
                  />
                  <span>
                    {mode === 'today'
                      ? 'Otomatis isi hari ini'
                      : 'Biarkan kosong (isi manual)'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Export */}
        <div
          style={{
            backgroundColor: '#1c1c1c',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Export Data
          </h2>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: '0.75rem' }}>
            Simpan transaksi dan konfigurasi dalam format CSV.
          </p>
          <button
            type="button"
            onClick={handleExport}
            style={{
              backgroundColor: 'white',
              borderRadius: 9999,
              border: 'none',
              color: 'black',
              fontSize: 13,
              fontWeight: 600,
              padding: '0.55rem 1.4rem',
              cursor: 'pointer',
            }}
          >
            Export CSV (Dummy)
          </button>
        </div>
      </div>
    </main>
  )
}

// ADD BUSINESS PAGE
function AddBusinessPage({ businessConfigs, setBusinessConfigs }) {
  const [step, setStep] = useState(1)
  const [branchName, setBranchName] = useState('')
  const [unitType, setUnitType] = useState('')
  const [newUnitType, setNewUnitType] = useState('')
  const [incomeCategories, setIncomeCategories] = useState([])
  const [expenseCategories, setExpenseCategories] = useState([])
  const [incomeInput, setIncomeInput] = useState('')
  const [expenseInput, setExpenseInput] = useState('')

  const effectiveUnitType =
    unitType === 'Custom' && newUnitType.trim() ? newUnitType.trim() : unitType

  const steps = [
    { id: 1, label: 'Informasi Dasar' },
    { id: 2, label: 'Konfirmasi & Aktivasi' },
  ]

  // sync kategori dengan default ketika pilih tipe existing
  React.useEffect(() => {
    if (!unitType || unitType === 'Custom') {
      setIncomeCategories([])
      setExpenseCategories([])
      return
    }
    const cfg = businessConfigs.find((b) => b.unitBusiness === unitType)
    if (!cfg) {
      setIncomeCategories([])
      setExpenseCategories([])
      return
    }
    setIncomeCategories(cfg.defaultIncomeCategories || [])
    setExpenseCategories(cfg.defaultExpenseCategories || [])
  }, [unitType, businessConfigs])

  const handleAddIncomeCategory = () => {
    const trimmed = incomeInput.trim()
    if (!trimmed) return
    if (!incomeCategories.includes(trimmed)) {
      setIncomeCategories([...incomeCategories, trimmed])
    }
    setIncomeInput('')
  }

  const handleAddExpenseCategory = () => {
    const trimmed = expenseInput.trim()
    if (!trimmed) return
    if (!expenseCategories.includes(trimmed)) {
      setExpenseCategories([...expenseCategories, trimmed])
    }
    setExpenseInput('')
  }

  const handleRemoveIncome = (cat) => {
    setIncomeCategories((prev) => prev.filter((c) => c !== cat))
  }

  const handleRemoveExpense = (cat) => {
    setExpenseCategories((prev) => prev.filter((c) => c !== cat))
  }

  const canGoNext =
    branchName.trim() &&
    effectiveUnitType &&
    (incomeCategories.length > 0 || expenseCategories.length > 0)

  const handleActivate = () => {
    if (!canGoNext) return

    const existingIndex = businessConfigs.findIndex(
      (b) => b.unitBusiness === effectiveUnitType,
    )

    if (existingIndex >= 0) {
      const existing = businessConfigs[existingIndex]
      const newBranch = {
        id: branchName.trim(),
        name: branchName.trim(),
        incomeCategories: incomeCategories.length ? incomeCategories : null,
        expenseCategories: expenseCategories.length ? expenseCategories : null,
        active: true,
      }
      const updated = [...businessConfigs]
      updated[existingIndex] = {
        ...existing,
        branches: [...existing.branches, newBranch],
      }
      setBusinessConfigs(updated)
    } else {
      const newConfig = {
        id: effectiveUnitType,
        unitBusiness: effectiveUnitType,
        defaultIncomeCategories: incomeCategories,
        defaultExpenseCategories: expenseCategories,
        branches: [
          {
            id: branchName.trim(),
            name: branchName.trim(),
            incomeCategories: null,
            expenseCategories: null,
            active: true,
          },
        ],
        active: true,
      }
      setBusinessConfigs([...businessConfigs, newConfig])
    }

    setStep(1)
    setBranchName('')
    setUnitType('')
    setNewUnitType('')
    setIncomeCategories([])
    setExpenseCategories([])
  }

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Tambah Unit Bisnis Baru
      </h1>
      <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Ikuti langkah-langkah di bawah ini untuk mendefinisikan tipe unit bisnis dan cabang.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px minmax(0, 1fr)',
          gap: '2rem',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            backgroundColor: '#050505',
            borderRadius: '9999px',
            padding: '1.25rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {steps.map((s) => {
            const isActive = s.id === step
            const isDone = s.id < step
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '9999px',
                    border: isActive ? 'none' : '1px solid #27272a',
                    backgroundColor: isActive ? 'white' : '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    color: isActive ? 'black' : isDone ? '#22c55e' : '#a1a1aa',
                  }}
                >
                  {isDone ? '✓' : s.id}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: 'white',
                  }}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        {step === 1 && (
          <div
            style={{
              backgroundColor: '#050505',
              borderRadius: 18,
              border: '1px solid #27272a',
              padding: '1.75rem 1.75rem 1.5rem',
              maxWidth: 720,
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
                Informasi Dasar
              </h2>
              <p style={{ color: '#a1a1aa', fontSize: 12 }}>
                Masukkan nama cabang/bisnis, tipe unit bisnis, dan kategori service untuk unit ini.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: '#e5e5e5',
                  }}
                >
                  Nama Cabang / Bisnis
                </label>
                <input
                  placeholder="Contoh: Laundry Buah Batu"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#020617',
                    borderRadius: 9999,
                    border: '1px solid #27272a',
                    padding: '0.7rem 1rem',
                    fontSize: 13,
                    color: 'white',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: '#e5e5e5',
                  }}
                >
                  Tipe Unit Bisnis
                </label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#020617',
                    borderRadius: 9999,
                    border: '1px solid #27272a',
                    padding: '0.7rem 1rem',
                    fontSize: 13,
                    color: 'white',
                    outline: 'none',
                    appearance: 'none',
                  }}
                >
                  <option value="">Pilih tipe…</option>
                  {businessConfigs.map((b) => (
                    <option key={b.id} value={b.unitBusiness}>
                      {b.unitBusiness}
                    </option>
                  ))}
                  <option value="Custom">Tambah tipe baru…</option>
                </select>
                {unitType === 'Custom' && (
                  <input
                    placeholder="Contoh: Barbershop"
                    value={newUnitType}
                    onChange={(e) => setNewUnitType(e.target.value)}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      backgroundColor: '#020617',
                      borderRadius: 9999,
                      border: '1px solid #27272a',
                      padding: '0.7rem 1rem',
                      fontSize: 13,
                      color: 'white',
                      outline: 'none',
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.25rem',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 6,
                      color: '#e5e5e5',
                    }}
                  >
                    Kategori Pendapatan
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <input
                      placeholder="Contoh: Cuci Kering"
                      value={incomeInput}
                      onChange={(e) => setIncomeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddIncomeCategory()
                        }
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#020617',
                        borderRadius: 9999,
                        border: '1px solid #27272a',
                        padding: '0.5rem 0.9rem',
                        fontSize: 12,
                        color: 'white',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddIncomeCategory}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: 9999,
                        border: 'none',
                        color: 'black',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '0.45rem 0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      Tambah
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    {incomeCategories.map((cat) => (
                      <span
                        key={cat}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '0.3rem 0.7rem',
                          borderRadius: 9999,
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          color: '#4ade80',
                          fontSize: 11,
                        }}
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleRemoveIncome(cat)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#6ee7b7',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {incomeCategories.length === 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: '#6b7280',
                        }}
                      >
                        Belum ada kategori pendapatan.
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 6,
                      color: '#e5e5e5',
                    }}
                  >
                    Kategori Pengeluaran
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <input
                      placeholder="Contoh: Beli Sabun"
                      value={expenseInput}
                      onChange={(e) => setExpenseInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddExpenseCategory()
                        }
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#020617',
                        borderRadius: 9999,
                        border: '1px solid #27272a',
                        padding: '0.5rem 0.9rem',
                        fontSize: 12,
                        color: 'white',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddExpenseCategory}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: 9999,
                        border: 'none',
                        color: 'black',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '0.45rem 0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      Tambah
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    {expenseCategories.map((cat) => (
                      <span
                        key={cat}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '0.3rem 0.7rem',
                          borderRadius: 9999,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#fca5a5',
                          fontSize: 11,
                        }}
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleRemoveExpense(cat)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#fecaca',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {expenseCategories.length === 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: '#6b7280',
                        }}
                      >
                        Belum ada kategori pengeluaran.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => window.history.back()}
                style={{
                  backgroundColor: 'transparent',
                  borderRadius: 9999,
                  border: '1px solid #27272a',
                  color: '#e5e5e5',
                  fontSize: 13,
                  padding: '0.55rem 1.3rem',
                  cursor: 'pointer',
                }}
              >
                ‹ Kembali
              </button>

              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setStep(2)}
                style={{
                  backgroundColor: canGoNext ? 'white' : '#4b5563',
                  borderRadius: 9999,
                  border: 'none',
                  color: canGoNext ? 'black' : '#9ca3af',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '0.6rem 1.6rem',
                  cursor: canGoNext ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Lanjutkan
                <span>›</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div
            style={{
              backgroundColor: '#050505',
              borderRadius: 18,
              border: '1px solid #27272a',
              padding: '1.75rem 1.75rem 1.5rem',
              maxWidth: 640,
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
                Konfirmasi & Aktivasi
              </h2>
              <p style={{ color: '#a1a1aa', fontSize: 12 }}>
                Tinjau kembali detail unit bisnis sebelum diaktivasi.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  backgroundColor: '#020617',
                  borderRadius: 12,
                  border: '1px solid #27272a',
                  padding: '1rem 1.25rem',
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: 'white',
                  }}
                >
                  Ringkasan Unit Bisnis
                </h3>
                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                  Nama cabang / bisnis:
                  <span style={{ color: 'white', marginLeft: 4 }}>
                    {branchName || '-'}
                  </span>
                </p>
                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                  Tipe unit bisnis:
                  <span style={{ color: 'white', marginLeft: 4 }}>
                    {effectiveUnitType || '-'}
                  </span>
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#020617',
                    borderRadius: 12,
                    border: '1px solid #27272a',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: '#bbf7d0',
                    }}
                  >
                    Kategori Pendapatan
                  </h4>
                  {incomeCategories.length === 0 ? (
                    <p style={{ fontSize: 11, color: '#6b7280' }}>
                      Belum ada kategori pendapatan.
                    </p>
                  ) : (
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      {incomeCategories.map((cat) => (
                        <li
                          key={cat}
                          style={{
                            fontSize: 11,
                            color: '#e5e5e5',
                          }}
                        >
                          • {cat}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div
                  style={{
                    backgroundColor: '#020617',
                    borderRadius: 12,
                    border: '1px solid #27272a',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: '#fecaca',
                    }}
                  >
                    Kategori Pengeluaran
                  </h4>
                  {expenseCategories.length === 0 ? (
                    <p style={{ fontSize: 11, color: '#6b7280' }}>
                      Belum ada kategori pengeluaran.
                    </p>
                  ) : (
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      {expenseCategories.map((cat) => (
                        <li
                          key={cat}
                          style={{
                            fontSize: 11,
                            color: '#e5e5e5',
                          }}
                        >
                          • {cat}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  backgroundColor: 'transparent',
                  borderRadius: 9999,
                  border: '1px solid #27272a',
                  color: '#e5e5e5',
                  fontSize: 13,
                  padding: '0.55rem 1.3rem',
                  cursor: 'pointer',
                }}
              >
                ‹ Kembali ke bagian sebelumnya
              </button>

              <button
                type="button"
                onClick={handleActivate}
                disabled={!canGoNext}
                style={{
                  backgroundColor: canGoNext ? 'white' : '#4b5563',
                  borderRadius: 9999,
                  border: 'none',
                  color: canGoNext ? 'black' : '#9ca3af',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '0.6rem 1.8rem',
                  cursor: canGoNext ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                Aktivasi Unit Bisnis
                <span>✓</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default App
