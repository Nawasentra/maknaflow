// src/lib/api/transactions.js
import api from '../axios'

// fallback only if GET fails
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
]

// backend → frontend
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
    payment: t.payment_method || t.reported_by_email || 'Unknown',
    source,
    description: t.description,
    createdAt: t.created_at,
    branchId: t.branch,
    categoryId: t.category,
  }
}

// frontend → backend (branch/category optional for now)
function mapToBackendPayload(frontendTx) {
  return {
    date: frontendTx.date,
    branch: frontendTx.branchId || null,
    category: frontendTx.categoryId || null,
    amount: frontendTx.amount,
    description: frontendTx.description || '',
    payment_method: frontendTx.payment,
    transaction_type: frontendTx.type === 'Income' ? 'INCOME' : 'EXPENSE',
    source: 'MANUAL',
  }
}

export async function fetchTransactions(params = {}) {
  try {
    const res = await api.get('/transactions/', { params })
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    const mapped = data.map(mapTransaction)
    console.log('fetchTransactions ->', mapped)
    return mapped
  } catch (err) {
    console.error('fetchTransactions failed, using mock:', err)
    return mockTransactions
  }
}

export async function createTransaction(frontendTx) {
  try {
    console.log('createTransaction frontendTx:', frontendTx)
    const payload = mapToBackendPayload(frontendTx)
    console.log('createTransaction backend payload:', payload)
    const res = await api.post('/transactions/', payload)
    console.log('createTransaction response:', res.data)
    return mapTransaction(res.data)
  } catch (err) {
    console.error(
      'createTransaction error:',
      err.response?.status,
      err.response?.data || err.message,
    )
    throw err
  }
}

export async function deleteTransaction(id) {
  try {
    await api.delete(`/transactions/${id}/`)
  } catch (err) {
    console.error('deleteTransaction error:', err.response?.status, err.response?.data)
  }
}
