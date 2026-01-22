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
import { fetchDailySummaries, fetchPaymentBreakdown } from '../../lib/api/dailySummaries'


// --- helpers --------------------------------------------------


function parseLocalDate(isoDateStr) {
  if (!isoDateStr) return null
  const [year, month, day] = isoDateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}


function formatLocalDate(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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


// --- main component -------------------------------------------


function DashboardPage({ transactions, isLoading, error }) {
  const [filterDate, setFilterDate] = useState('7 Hari Terakhir')
  const [filterUnit, setFilterUnit] = useState('Semua Unit')
  const [filterBranch, setFilterBranch] = useState('Semua Cabang')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [dailySummaries, setDailySummaries] = useState([])
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


  // ---------- FILTER DAILY SUMMARIES ----------


  const filteredDailySummaries = useMemo(() => {
    if (!Array.isArray(dailySummaries)) return []
    
    return dailySummaries.filter((summary) => {
      if (!summary.date) return false
      const summaryDate = parseLocalDate(summary.date)
      if (!summaryDate || isNaN(summaryDate.getTime())) return false


      // Date range filter
      let inRange = true
      if (filterDate === 'Hari Ini') {
        inRange = summaryDate.toDateString() === startOfToday.toDateString()
      } else if (filterDate === '7 Hari Terakhir') {
        inRange = summaryDate >= sevenDaysAgo && summaryDate <= startOfToday
      } else if (filterDate === 'Bulan Ini') {
        inRange = summaryDate >= startOfMonth && summaryDate <= startOfToday
      } else if (filterDate === 'Custom' && customStart && customEnd) {
        const start = parseLocalDate(customStart)
        const end = parseLocalDate(customEnd)
        if (!start || !end) return false
        inRange = summaryDate >= start && summaryDate <= end
      }


      // Unit filter
      const normalizedUnit = normalizeUnit(summary.branch_type)
      const unitMatch =
        filterUnit === 'Semua Unit' || normalizedUnit === filterUnit


      // Branch filter
      const branchMatch =
        filterBranch === 'Semua Cabang' || summary.branch_name === filterBranch


      return inRange && unitMatch && branchMatch
    })
  }, [
    dailySummaries,
    filterDate,
    customStart,
    customEnd,
    filterUnit,
    filterBranch,
    startOfToday,
    sevenDaysAgo,
    startOfMonth,
  ])


  // ---------- UNIQUE DATES ----------


  const uniqueDates = useMemo(() => {
    const dateSet = new Set()
    
    // Add dates from manual transactions
    filteredTransactions.forEach((t) => {
      if (t.date) dateSet.add(t.date)
    })
    
    // Add dates from POS summaries
    filteredDailySummaries.forEach((s) => {
      if (s.date) dateSet.add(s.date)
    })
    
    return Array.from(dateSet).sort()
  }, [filteredTransactions, filteredDailySummaries])


  // ---------- DAILY MAP + TREND DATA (FIXED) ----------


  const dailyMap = useMemo(() => {
    const map = {}


    // 1. Build map from manual transactions (exclude Email source)
    filteredTransactions.forEach((t) => {
      if (t.source === 'Email') return // Skip Email items (handled by DailySummary)
      
      const key = t.date
      if (!map[key]) map[key] = { date: key, income: 0, expense: 0 }
      
      if (t.type === 'Income') map[key].income += t.amount || 0
      else if (t.type === 'Expense') map[key].expense += t.amount || 0
    })


    // 2. Add POS income from DailySummary (actual daily amounts)
    filteredDailySummaries.forEach((summary) => {
      const key = summary.date
      const dailyPosIncome =
        (Number(summary.cash_amount) || 0) +
        (Number(summary.qris_amount) || 0) +
        (Number(summary.transfer_amount) || 0)
      
      if (!map[key]) map[key] = { date: key, income: 0, expense: 0 }
      map[key].income += dailyPosIncome
    })


    // 3. Ensure all uniqueDates exist in map
    uniqueDates.forEach((date) => {
      if (!map[date]) {
        map[date] = { date, income: 0, expense: 0 }
      }
    })


    console.log('=== DAILY MAP ===')
    console.log('Daily income by date:', 
      Object.fromEntries(Object.entries(map).map(([d, v]) => [d, v.income])))
    console.log('Daily expense by date:', 
      Object.fromEntries(Object.entries(map).map(([d, v]) => [d, v.expense])))


    return map
  }, [filteredTransactions, filteredDailySummaries, uniqueDates])


  // ---------- SMART NODE SAMPLING (Per Friend's Spec) ----------


  const trendData = useMemo(() => {
    if (uniqueDates.length === 0) return []
    
    const sortedDates = [...uniqueDates].sort()
    let selectedDates = []
    
    const totalDays = sortedDates.length
    
    if (totalDays <= 2) {
      // Show all for 1-2 days
      selectedDates = sortedDates
    } else if (totalDays === 3) {
      // First + 1 middle + Last
      selectedDates = [sortedDates[0], sortedDates[1], sortedDates[2]]
    } else if (totalDays === 4) {
      // First + 2 middle + Last
      selectedDates = [sortedDates[0], sortedDates[1], sortedDates[2], sortedDates[3]]
    } else if (totalDays >= 5 && totalDays <= 7) {
      // For 7 days: show days 1, 2, 4, 6, 7
      if (totalDays === 7) {
        selectedDates = [
          sortedDates[0],  // day 1
          sortedDates[1],  // day 2
          sortedDates[3],  // day 4
          sortedDates[5],  // day 6
          sortedDates[6],  // day 7
        ]
      } else {
        // 5-6 days: First + 3 evenly-spaced middle + Last
        const step = (totalDays - 1) / 4
        selectedDates = [
          sortedDates[0],
          sortedDates[Math.round(step)],
          sortedDates[Math.round(step * 2)],
          sortedDates[Math.round(step * 3)],
          sortedDates[totalDays - 1],
        ]
      }
    } else if (totalDays >= 8 && totalDays <= 30) {
      // For 30 days: show days 1, 8, 16, 24, 30
      if (totalDays === 30) {
        selectedDates = [
          sortedDates[0],   // day 1
          sortedDates[7],   // day 8
          sortedDates[15],  // day 16
          sortedDates[23],  // day 24
          sortedDates[29],  // day 30
        ]
      } else {
        // 8-29 days: First + 3 evenly-spaced middle + Last
        const step = (totalDays - 1) / 4
        selectedDates = [
          sortedDates[0],
          sortedDates[Math.round(step)],
          sortedDates[Math.round(step * 2)],
          sortedDates[Math.round(step * 3)],
          sortedDates[totalDays - 1],
        ]
      }
    } else {
      // > 30 days: First + 3 evenly-spaced middle + Last
      const step = (totalDays - 1) / 4
      selectedDates = [
        sortedDates[0],
        sortedDates[Math.round(step)],
        sortedDates[Math.round(step * 2)],
        sortedDates[Math.round(step * 3)],
        sortedDates[totalDays - 1],
      ]
    }
    
    const data = selectedDates.map((date) => dailyMap[date])
    
    console.log('=== TREND DATA ===')
    console.log('Selected dates:', selectedDates)
    console.log('Trend data:', data)
    
    return data
  }, [dailyMap, uniqueDates])


  // ---------- KPI ----------


  // Manual income (exclude Email source)
  const manualIncome = filteredTransactions
    .filter((t) => t.type === 'Income' && t.source !== 'Email')
    .reduce((sum, t) => sum + (t.amount || 0), 0)


  // POS income from DailySummary
  const emailIncome = filteredDailySummaries.reduce((sum, s) => {
    return sum + 
      (Number(s.cash_amount) || 0) + 
      (Number(s.qris_amount) || 0) + 
      (Number(s.transfer_amount) || 0)
  }, 0)


  const incomeTotal = manualIncome + emailIncome


  const expenseTotal = filteredTransactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0)


  const netProfit = incomeTotal - expenseTotal


  // Total transactions: manual/WA count + POS transaction count
  const totalTransactions =
    filteredTransactions.filter((t) => t.source !== 'Email').length +
    filteredDailySummaries.reduce((sum, s) => sum + (Number(s.transaction_count) || 0), 0)


  // ---------- FETCH DAILY SUMMARIES ----------


  useEffect(() => {
    const loadDailySummaries = async () => {
      try {
        const params = {}


        if (filterDate === 'Hari Ini') {
          const d = formatLocalDate(startOfToday)
          params.start_date = d
          params.end_date = d
        } else if (filterDate === '7 Hari Terakhir') {
          params.start_date = formatLocalDate(sevenDaysAgo)
          params.end_date = formatLocalDate(startOfToday)
        } else if (filterDate === 'Bulan Ini') {
          params.start_date = formatLocalDate(startOfMonth)
          params.end_date = formatLocalDate(startOfToday)
        } else if (filterDate === 'Custom' && customStart && customEnd) {
          params.start_date = customStart
          params.end_date = customEnd
        }


        // Note: Don't filter by branch/unit here - we'll filter in useMemo
        // This allows us to cache the full dataset


        const data = await fetchDailySummaries(params)
        setDailySummaries(Array.isArray(data) ? data : data.results || [])
      } catch (err) {
        console.error('Failed to load daily summaries:', err)
        setDailySummaries([])
      }
    }


    loadDailySummaries()
  }, [
    filterDate,
    customStart,
    customEnd,
    startOfToday,
    sevenDaysAgo,
    startOfMonth,
  ])


  // ---------- FETCH PAYMENT BREAKDOWN (for pie chart) ----------


  useEffect(() => {
    const loadPaymentBreakdown = async () => {
      try {
        const params = {}


        if (filterDate === 'Hari Ini') {
          const d = formatLocalDate(startOfToday)
          params.start_date = d
          params.end_date = d
        } else if (filterDate === '7 Hari Terakhir') {
          params.start_date = formatLocalDate(sevenDaysAgo)
          params.end_date = formatLocalDate(startOfToday)
        } else if (filterDate === 'Bulan Ini') {
          params.start_date = formatLocalDate(startOfMonth)
          params.end_date = formatLocalDate(startOfToday)
        } else if (filterDate === 'Custom' && customStart && customEnd) {
          params.start_date = customStart
          params.end_date = customEnd
        }


        if (filterBranch !== 'Semua Cabang') {
          params.branch_name = filterBranch
        }
        if (filterUnit !== 'Semua Unit') {
          params.branch_type = filterUnit.toUpperCase()
        }


        const data = await fetchPaymentBreakdown(params)
        setPaymentBreakdown(data)
      } catch (err) {
        console.error('Failed to load payment breakdown:', err)
        setPaymentBreakdown(null)
      }
    }


    loadPaymentBreakdown()
  }, [
    filterDate,
    customStart,
    customEnd,
    filterUnit,
    filterBranch,
    startOfToday,
    sevenDaysAgo,
    startOfMonth,
  ])


  // ---------- INCOME SOURCES (PIE) ----------


  const incomeSources = useMemo(() => {
    const hasEmailData =
      paymentBreakdown && typeof paymentBreakdown.count === 'number'
        ? paymentBreakdown.count > 0
        : false


    const emailCash = hasEmailData ? paymentBreakdown.cash || 0 : 0
    const emailQris = hasEmailData ? paymentBreakdown.qris || 0 : 0
    const emailTransfer = hasEmailData ? paymentBreakdown.transfer || 0 : 0


    const manualAgg =
      filteredTransactions
        .filter((t) => t.type === 'Income' && t.source !== 'Email')
        .reduce(
          (acc, t) => {
            const method = (t.payment || '').toUpperCase()
            const amount = t.amount || 0
            if (method === 'CASH') acc.cash += amount
            else if (method === 'QRIS') acc.qris += amount
            else if (method === 'TRANSFER') acc.transfer += amount
            return acc
          },
          { cash: 0, qris: 0, transfer: 0 },
        ) || { cash: 0, qris: 0, transfer: 0 }


    const totalCash = emailCash + manualAgg.cash
    const totalQris = emailQris + manualAgg.qris
    const totalTransfer = emailTransfer + manualAgg.transfer


    const result = []
    if (totalCash > 0) result.push({ name: 'Cash', value: totalCash })
    if (totalQris > 0) result.push({ name: 'QRIS', value: totalQris })
    if (totalTransfer > 0)
      result.push({ name: 'Transfer', value: totalTransfer })


    return result
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
                margin={{ top: 20, right: 20, left: 60, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis
                  stroke="#9ca3af"
                  domain={[0, (dataMax) => dataMax * 1.1]}
                  allowDecimals={false}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat('id-ID').format(v)
                  }
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Pendapatan"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Pengeluaran"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
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
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#9ca3af"
                  />
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


// --- KPI card -------------------------------------------------


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
