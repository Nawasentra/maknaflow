// src/lib/api/transactions.js
// Sekarang: coba ke backend, kalau gagal pakai mockTransactions.

import api from '../axios'

// --- MOCK DATA LOKAL ---
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

// Helper ID untuk mock
function getNextId(list) {
  if (!list || list.length === 0) return 1
  return Math.max(...list.map((t) => Number(t.id) || 0)) + 1
}

// --- FUNGSI API ---

export async function fetchTransactions(params) {
  try {
    // PANGGIL BACKEND BENARAN
    const res = await api.get('/transactions/', { params })
    return res.data
  } catch (err) {
    console.warn('fetchTransactions failed, using mock:', err)
    return mockTransactions
  }
}

export async function createTransaction(payload) {
  try {
    const res = await api.post('/transactions/', payload)
    return res.data
  } catch (err) {
    console.warn('createTransaction failed, falling back to mock:', err)
    const newId = getNextId(mockTransactions)
    const tx = { id: newId, ...payload }
    mockTransactions.push(tx)
    return tx
  }
}

export async function deleteTransaction(id) {
  try {
    await api.delete(`/transactions/${id}/`)
  } catch (err) {
    console.warn('deleteTransaction failed, deleting from mock only:', err)
  }
  const idx = mockTransactions.findIndex((t) => t.id === id)
  if (idx !== -1) {
    mockTransactions.splice(idx, 1)
  }
}
