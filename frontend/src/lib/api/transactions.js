// src/lib/api/transactions.js

import api from '../axios'

// --- MOCK DATA (fallback only) ---
const mockTransactions = [
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

// Map backend TransactionSerializer -> frontend shape
function mapTransaction(t) {
  const type =
    t.transaction_type === 'INCOME'
      ? 'Income'
      : t.transaction_type === 'EXPENSE'
      ? 'Expense'
      : 'Income'

  const source =
    t.source === 'EMAIL'
      ? 'Email'
      : t.source === 'WHATSAPP'
      ? 'Whatsapp'
      : 'Manual'

  return {
    id: t.id,
    date: t.date,
    unitBusiness: t.branch_name || 'Unknown',
    branch: t.branch_name || 'Unknown',
    category: t.category_name || 'Lainnya',
    type,
    amount: Number(t.amount ?? 0),
    payment: t.reported_by_email || 'Unknown', // temporary label
    source,
    description: t.description,
    createdAt: t.created_at,
    branchId: t.branch,
    categoryId: t.category,
  }
}

export async function fetchTransactions(params = {}) {
  try {
    const res = await api.get('/transactions/', { params })
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    return data.map(mapTransaction)
  } catch (err) {
    console.error('fetchTransactions failed, using mock:', err)
    return mockTransactions
  }
}

export async function createTransaction(payload) {
  try {
    const res = await api.post('/transactions/', payload)
    return mapTransaction(res.data)
  } catch (err) {
    console.error('createTransaction failed, falling back to mock:', err)
    const newId =
      mockTransactions.length === 0
        ? 1
        : Math.max(...mockTransactions.map((t) => t.id)) + 1
    const tx = { id: newId, ...payload }
    mockTransactions.push(tx)
    return tx
  }
}

export async function deleteTransaction(id) {
  try {
    await api.delete(`/transactions/${id}/`)
  } catch (err) {
    console.error('deleteTransaction failed, removing only from mock:', err)
  }
  const idx = mockTransactions.findIndex((t) => t.id === id)
  if (idx !== -1) {
    mockTransactions.splice(idx, 1)
  }
}
