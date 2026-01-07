import React, { useState, useMemo } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  BarChart, Bar, ResponsiveContainer
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

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
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

  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<DashboardPage transactions={transactions} />} />
        <Route
          path="/transactions"
          element={<TransactionsPage transactions={transactions} setTransactions={setTransactions} />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/add-business" element={<AddBusinessPage />} />
      </Routes>
    </>
  )
}

function NavBar() {
  const location = useLocation()

  return (
    <nav style={{ backgroundColor: '#1c1c1c', borderBottom: '1px solid #27272a', padding: '1rem 1.5rem' }}>
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

// DASHBOARD PAGE
function DashboardPage({ transactions }) {
  const [filterDate, setFilterDate] = useState('Hari Ini')
  const [filterUnit, setFilterUnit] = useState('Semua Unit')
  const [filterBranch, setFilterBranch] = useState('Semua Cabang')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const today = new Date('2026-01-07')
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            alignItems: 'flex-end',
          }}
        >
          {/* Tanggal */}
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
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
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
              <option>Hari Ini</option>
              <option>7 Hari Terakhir</option>
              <option>Bulan Ini</option>
              <option>Custom</option>
            </select>

            {filterDate === 'Custom' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: '#111827',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    color: 'white',
                    fontSize: '0.875rem',
                  }}
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: '#111827',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    color: 'white',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            )}
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
        <KpiCard title="Total Pendapatan" value={`Rp ${formatCurrency(incomeTotal)}`} icon="💰" color="#10b981" />
        <KpiCard title="Total Pengeluaran" value={`Rp ${formatCurrency(expenseTotal)}`} icon="💸" color="#ef4444" />
        <KpiCard title="Pendapatan Bersih" value={`Rp ${formatCurrency(netProfit)}`} icon="✅" color="#10b981" />
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
            <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>🥧 Sumber Pendapatan</h4>
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
            <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>📊 Top Pengeluaran</h4>
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
function TransactionsPage({ transactions, setTransactions }) {
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
    setAddOpen(false)
  }

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1.5rem' }}>📋 Transaksi</h1>

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
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>Tabel Transaksi</h3>
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
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '500px' }}>
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
        <p style={{ fontSize: '0.9rem', color: '#a1a1aa', marginBottom: '1.5rem' }}>{description}</p>
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

// ADD TRANSACTION MODAL (Unit Bisnis -> Cabang dependent)
function AddTransactionModal({ onClose, onSave, existingData }) {
  const unique = (arr) => Array.from(new Set(arr))

  const unitOptions = useMemo(
    () => unique(existingData.map((t) => t.unitBusiness)),
    [existingData],
  )

  const [unitBusiness, setUnitBusiness] = useState(unitOptions[0] || '')
  const [date, setDate] = useState('')
  const [branch, setBranch] = useState('')
  const [category, setCategory] = useState('')
  const [type, setType] = useState('Income')
  const [payment, setPayment] = useState('')
  const [amountInput, setAmountInput] = useState('')

  const branchOptions = useMemo(() => {
    if (!unitBusiness) return []
    return unique(
      existingData
        .filter((t) => t.unitBusiness === unitBusiness)
        .map((t) => t.branch),
    )
  }, [existingData, unitBusiness])

  const kategoriOptions = useMemo(
    () => unique(existingData.map((t) => t.category)),
    [existingData],
  )

  const pembayaranOptions = useMemo(
    () => unique(existingData.map((t) => t.payment)),
    [existingData],
  )

  const tipeOptions = ['Income', 'Expense']

  React.useEffect(() => {
    if (branchOptions.length && !branchOptions.includes(branch)) {
      setBranch(branchOptions[0])
    }
    if (!payment && pembayaranOptions.length) {
      setPayment(pembayaranOptions[0])
    }
    if (!category && kategoriOptions.length) {
      setCategory(kategoriOptions[0])
    }
  }, [branchOptions, pembayaranOptions, kategoriOptions])

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
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />
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

          <Field label="Kategori">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              {kategoriOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
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
              {tipeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
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
function SettingsPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '2rem' }}>⚙️ Settings</h1>
      <div
        style={{
          backgroundColor: '#1c1c1c',
          border: '1px solid #27272a',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          color: '#a1a1aa',
        }}
      >
        Pengaturan Bisnis - Cabang, Kategori, dll
      </div>
    </main>
  )
}

// ADD BUSINESS PAGE (Stepper)
function AddBusinessPage() {
  const [step, setStep] = useState(1)

  const steps = [
    { id: 1, label: 'Informasi Dasar' },
    { id: 2, label: 'Integrasi Sumber' },
    { id: 3, label: 'Konfirmasi & Aktivasi' },
  ]

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Tambah Unit Bisnis Baru
      </h1>
      <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Ikuti langkah-langkah di bawah ini untuk mengintegrasikan cabang baru ke MaknaFlow.
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
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>Informasi Dasar</h2>
            <p style={{ color: '#a1a1aa', fontSize: 12 }}>
              Masukkan detail nama dan kategori bisnis Anda.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                Tipe Bisnis
              </label>
              <select
                defaultValue=""
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
                <option value="" disabled>
                  Pilih tipe…
                </option>
                <option>Laundry</option>
                <option>Carwash</option>
                <option>Kos-kosan</option>
                <option>Lainnya</option>
              </select>
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
              onClick={() => setStep(2)}
              style={{
                backgroundColor: 'white',
                borderRadius: 9999,
                border: 'none',
                color: 'black',
                fontSize: 13,
                fontWeight: 600,
                padding: '0.6rem 1.6rem',
                cursor: 'pointer',
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
      </div>
    </main>
  )
}

export default App
