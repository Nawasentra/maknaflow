// src/lib/api/transactions.js
import api from '../axios'

// --- OPTIONAL: remove once backend is stable ---
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
  // ... you can keep or delete the rest
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
    // assuming backend returns branch_name & category_name
    unitBusiness: t.branch_name || 'Unknown',
    branch: t.branch_name || 'Unknown',
    category: t.category_name || 'Lainnya',
    type,
    amount: Number(t.amount ?? 0),
    payment: t.payment_method || t.reported_by_email || 'Unknown', // adjust to your field
    source,
    description: t.description,
    createdAt: t.created_at,
    branchId: t.branch,
    categoryId: t.category,
  }
}

// Map frontend payload -> backend serializer shape
function mapToBackendPayload(frontendTx) {
  return {
    date: frontendTx.date,                         // 'YYYY-MM-DD'
    branch: frontendTx.branchId,                  // FK id
    category: frontendTx.categoryId,              // FK id
    amount: frontendTx.amount,
    description: frontendTx.description || '',
    payment_method: frontendTx.payment,           // field name in your serializer
    transaction_type: frontendTx.type === 'Income' ? 'INCOME' : 'EXPENSE',
    source: 'MANUAL',
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

export async function createTransaction(frontendTx) {
  try {
    const payload = mapToBackendPayload(frontendTx)
    const res = await api.post('/transactions/', payload)
    return mapTransaction(res.data)
  } catch (err) {
    console.error('createTransaction failed, falling back to mock:', err)
    const newId =
      mockTransactions.length === 0
        ? 1
        : Math.max(...mockTransactions.map((t) => t.id)) + 1
    const tx = { id: newId, ...frontendTx }
    mockTransactions.push(tx)
    return tx
  }
}

export async function deleteTransaction(id) {
  try {
    await api.delete(`/transactions/${id}/`)
  } catch (err) {
    console.error('deleteTransaction failed:', err)
  }
  const idx = mockTransactions.findIndex((t) => t.id === id)
  if (idx !== -1) {
    mockTransactions.splice(idx, 1)
  }
}
