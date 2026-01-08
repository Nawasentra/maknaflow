import React, { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts'

function DashboardPage({ transactions, isLoading, error }) {
  const [filterDate, setFilterDate] = useState('Hari Ini')
  const [filterUnit, setFilterUnit] = useState('Semua Unit')
  const [filterBranch, setFilterBranch] = useState('Semua Cabang')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

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

  if (isLoading) {
    return (
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <p style={{ color: '#a1a1aa' }}>Memuat data transaksi...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <p style={{ color: '#f97316' }}>{error}</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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

              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                disabled={filterDate !== 'Custom'}
                style={{
                  width: '125px',
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

              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                disabled={filterDate !== 'Custom'}
                style={{
                  width: '125px',
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
                      <Cell key={entry.name} fill={index === 0 ? '#22c55e' : '#3b82f6'} />
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

export default DashboardPage
