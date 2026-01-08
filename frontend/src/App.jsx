import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LoginPage from './features/auth/LoginPage'
import AuthenticatedLayout from './layout/AuthenticatedLayout'
import { fetchTransactions } from './lib/api/transactions'

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

function App() {
  const [transactions, setTransactions] = useState([])
  const [businessConfigs, setBusinessConfigs] = useState(initialBusinessConfigs)
  const [appSettings, setAppSettings] = useState(initialAppSettings)
  const [lastUsedType, setLastUsedType] = useState('Income')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setIsLoading(true)
        const data = await fetchTransactions({})
        if (!cancelled) {
          setTransactions(data)
          setError('')
        }
      } catch (e) {
        if (!cancelled) {
          setError('Gagal memuat data transaksi (mode mock).')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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
          <Route
            path="/dashboard/*"
            element={
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
              />
            }
          />
          <Route path="/" element={<LoginPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
