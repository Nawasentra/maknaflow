// src/features/dashboard/DashboardPage.jsx
import React, { useState, useMemo, useEffect } from 'react'
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
import { fetchPaymentBreakdown } from '../../lib/api/dailySummaries'

function parseLocalDate(isoDateStr) {
  if (!isoDateStr) return null
  const [year, month, day] = isoDateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const UNIT_LABELS = ['Laundry', 'Carwash', 'Kos', 'Other']

function normalizeUnit(unit) {
  if (!unit) return ''
  const u = String(unit).toUpperCase()
  if (u === 'LAUNDRY') return 'Laundry'
  if (u === 'CARWASH') return 'Carwash'
  if (u === 'KOS') return 'Kos'
  if (u === 'OTHER') return 'Other'
  return unit
}

function DashboardPage({ transactions, isLoading, error }) {
  const [filterDate, setFilterDate] = useState('7 Hari Terakhir')
  const [filterUnit, setFilterUnit] = useState('Semua Unit')
  const [filterBranch, setFilterBranch] = useState('Semua Cabang')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [paymentBreakdown, setPaymentBreakdown] = useState(null)

  const today = new Date()
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  const sevenDaysAgo = new Date(startOfToday)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const safeTransactions = Array.isArray(transactions) ? transactions : []

  // ---------- OPTIONS: UNIT & CABANG ----------

  const unitOptions = ['Semua Unit', ...UNIT_LABELS]

  const branchOptions = useMemo(() => {
    let source = safeTransactions
    if (filterUnit !== 'Semua Unit') {
      source = source.filter(
        (t) => normalizeUnit(t.unitBusiness) === filterUnit,
      )
    }
    const names = Array.from(
      new Set(
        source
          .map((t) => t.branch)
          .filter(Boolean),
      ),
    )
    return ['Semua Cabang', ...names]
  }, [safeTransactions, filterUnit])

  // ---------- FILTER TRANSAKSI ----------

  const filteredTransactions = useMemo(() => {
    return safeTransactions.filter((t) => {
      if (!t.date) return false
      const txDate = parseLocalDate(t.date)
      if (!txDate || isNaN(txDate.getTime())) return false

      let inRange = true
      if (filterDate === 'Hari Ini') {
        inRange = txDate.toDateString() === startOfToday.toDateString()
      } else if (filterDate === '7 Hari Terakhir') {
        inRange = txDate >= sevenDaysAgo && txDate <= startOfToday
      } else if (filterDate === 'Bulan Ini') {
        inRange = txDate >= startOfMonth && txDate <= startOfToday
      } else if (filterDate === 'Custom' && customStart && customEnd) {
        const start = parseLocalDate(customStart)
        const end = parseLocalDate(customEnd)
        if (!start || !end) return false
        inRange = txDate >= start && txDate <= end
      }

      const normalizedUnit = normalizeUnit(t.unitBusiness)
      const unitMatch =
        filterUnit === 'Semua Unit' || normalizedUnit === filterUnit

      const branchMatch =
        filterBranch === 'Semua Cabang' || t.branch === filterBranch

      return inRange && unitMatch && branchMatch
    })
  }, [
    safeTransactions,
    filterDate,
    customStart,
    customEnd,
    filterUnit,
    filterBranch,
    startOfToday,
    sevenDaysAgo,
    startOfMonth,
  ])

  // ---------- KPI ----------

  const incomeTotal = filteredTransactions
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const expenseTotal = filteredTransactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const netProfit = incomeTotal - expenseTotal
  const totalTransactions = filteredTransactions.length

  // ---------- CHART DATA ----------

  const dailyMap = filteredTransactions.reduce((acc, t) => {
    const key = t.date
    if (!acc[key]) {
      acc[key] = { date: key, income: 0, expense: 0 }
    }
    if (t.type === 'Income') {
      acc[key].income += t.amount || 0
    } else if (t.type === 'Expense') {
      acc[key].expense += t.amount || 0
    }
    return acc
  }, {})

  const trendData = Object.values(dailyMap).sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  )

  // ---------- PAYMENT BREAKDOWN (DailySummary) ----------

  useEffect(() => {
    const loadPaymentBreakdown = async () => {
      try {
        const params = {}

        if (filterDate === 'Hari Ini') {
          const d = startOfToday.toISOString().split('T')[0]
          params.start_date = d
          params.end_date = d
        } else if (filterDate === '7 Hari Terakhir') {
          params.start_date = sevenDaysAgo.toISOString().split('T')[0]
          params.end_date = startOfToday.toISOString().split('T')[0]
        } else if (filterDate === 'Bulan Ini') {
          params.start_date = startOfMonth.toISOString().split('T')[0]
          params.end_date = startOfToday.toISOString().split('T')[0]
        } else if (filterDate === 'Custom' && customStart && customEnd) {
          params.start_date = customStart
          params.end_date = customEnd
        }

        // Cabang filter (future: kirim branch_id kalau sudah ada)
        // For now, backend sudah filter by user/branch di get_queryset

        const data = await fetchPaymentBreakdown(params)
        setPaymentBreakdown(data)
      } catch (err) {
        console.error('Failed to load payment breakdown:', err)
        setPaymentBreakdown(null)
      }
    }

    loadPaymentBreakdown()
  }, [filterDate, customStart, customEnd, filterBranch, startOfToday, sevenDaysAgo, startOfMonth])

  // ---------- INCOME SOURCES (PIE) ----------

  const incomeSources = useMemo(() => {
    // 1) Pakai DailySummary kalau ada data
    if (paymentBreakdown && paymentBreakdown.total > 0) {
      return [
        { name: 'Cash', value: paymentBreakdown.cash },
        { name: 'QRIS', value: paymentBreakdown.qris },
        { name: 'Transfer', value: paymentBreakdown.transfer },
      ].filter((item) => item.value > 0)
    }

    // 2) Fallback: hitung dari transaksi (manual / tanpa email breakdown)
    const incomeSourcesMap = filteredTransactions
      .filter((t) => t.type === 'Income')
      .reduce((acc, t) => {
        const method = t.payment || 'Unknown'
        acc[method] = (acc[method] || 0) + (t.amount || 0)
        return acc
      }, {})

    const entries = Object.entries(incomeSourcesMap)
    if (entries.length === 0) return []

    // Jika semua income tidak punya payment_method (Unknown),
    // tampilkan sebagai satu slice "Lainnya" agar chart tidak kosong.
    if (entries.length === 1 && entries[0][0] === 'Unknown') {
      return [{ name: 'Lainnya', value: entries[0][1] }]
    }

    // Kalau campuran, buang Unknown tapi pertahankan metode yang jelas.
    return entries
      .filter(([name]) => name !== 'Unknown')
      .map(([name, value]) => ({
        name:
          name === 'CASH'
            ? 'Cash'
            : name === 'QRIS'
            ? 'QRIS'
            : name === 'TRANSFER'
            ? 'Transfer'
            : name,
        value,
      }))
  }, [paymentBreakdown, filteredTransactions])

  // ---------- EXPENSE BY CATEGORY ----------

  const expenseCatMap = filteredTransactions
    .filter((t) => t.type === 'Expense')
    .reduce((acc, t) => {
      const key = t.category || 'Lainnya'
      acc[key] = (acc[key] || 0) + (t.amount || 0)
      return acc
    }, {})

  const expenseByCategory = Object.entries(expenseCatMap).map(
    ([name, value]) => ({
      name,
      value,
    }),
  )

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    })
      .format(amount)
      .replace('Rp', '')
      .trim()

  // ---------- RENDER STATES ----------

  if (isLoading) {
    return (
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          color: 'var(--subtext)',
        }}
      >
        <p>Memuat data transaksi...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          color: '#f97316',
        }}
      >
        <p>{error}</p>
      </main>
    )
  }

  return (
    <main
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        color: 'var(--text)',
      }}
    >
      {/* Filter Global */}
      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
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
          {/* Rentang tanggal */}
          <div>
            <label
              style={{
                display: 'block',
                color: 'var(--subtext)',
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
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.7rem 0.9rem',
                  color: 'var(--text)',
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
                  width: '110px',
                  backgroundColor: 'rgba(15,23,42,0.06)',
                  border: '1px solid rgba(148,163,184,0.7)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.5rem',
                  color: 'var(--text)',
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
                  width: '110px',
                  backgroundColor: 'rgba(15,23,42,0.06)',
                  border: '1px solid rgba(148,163,184,0.7)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.5rem',
                  color: 'var(--text)',
                  fontSize: '0.8rem',
                  cursor: filterDate === 'Custom' ? 'pointer' : 'not-allowed',
                  opacity: filterDate === 'Custom' ? 1 : 0.5,
                }}
              />
            </div>
          </div>

          {/* Unit Bisnis */}
          <div>
            <label
              style={{
                display: 'block',
                color: 'var(--subtext)',
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
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: 'var(--text)',
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
                color: 'var(--subtext)',
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
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: 'var(--text)',
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

      {/* KPI cards */}
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
        <KpiCard
          title="Jumlah Transaksi"
          value={totalTransactions}
          icon="📊"
          color="#8b5cf6"
        />
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
        {/* Line chart */}
        <div
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
            }}
          >
            📈 Tren Pendapatan vs Pengeluaran
          </h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
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

        {/* Pie + bar */}
        <div
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          <div>
            <h4
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}
            >
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
                    {incomeSources.map((entry) => {
                      let color = '#6b7280'
                      if (entry.name === 'Cash') color = '#22c55e'
                      if (entry.name === 'QRIS') color = '#3b82f6'
                      if (entry.name === 'Transfer') color = '#f59e0b'
                      if (entry.name === 'Lainnya') color = '#94a3b8'
                      return <Cell key={entry.name} fill={color} />
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}
            >
              📊 Top Pengeluaran
            </h4>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expenseByCategory}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
                >
                  <CartesianGrid stroke="var(--border)" />
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
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.5rem',
        transition: 'all 0.2s',
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
              color: 'var(--subtext)',
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
              color: 'var(--text)',
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
