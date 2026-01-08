// src/lib/api/transactions.js
// Sementara masih pakai data dummy dari paste.txt (rawTransactions).

import api from '../axios'

// Bentuk data transaksi untuk referensi:
// {
//   id: number,
//   date: string (YYYY-MM-DD),
//   unitBusiness: string,
//   branch: string,
//   category: string,
//   type: 'Income' | 'Expense',
//   amount: number,
//   payment: string,
// }

// --- MOCK DATA LOKAL (boleh import dari file lain kalau mau) ---
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

// --- FUNGSI API (nanti tinggal ganti ke backend beneran) ---

export async function fetchTransactions(params) {
  // NANTI:
  // const res = await api.get('/transactions/', { params })
  // return res.data

  // SEKARANG: ignore params, balikin mock
  return Promise.resolve(mockTransactions)
}

export async function createTransaction(payload) {
  // NANTI:
  // const res = await api.post('/transactions/', payload)
  // return res.data

  const newId =
    mockTransactions.length === 0
      ? 1
      : Math.max(...mockTransactions.map((t) => t.id)) + 1

  const tx = { id: newId, ...payload }
  mockTransactions.push(tx)
  return Promise.resolve(tx)
}

export async function deleteTransaction(id) {
  // NANTI:
  // await api.delete(`/transactions/${id}/`)

  const idx = mockTransactions.findIndex((t) => t.id === id)
  if (idx !== -1) {
    mockTransactions.splice(idx, 1)
  }
  return Promise.resolve()
}
