// src/lib/api/transactions.js
import api from '../axios'

// ---------- FETCH HELPERS ----------

export async function fetchBranches() {
  const res = await api.get('/branches/')
  // expected: [{id, name, branch_type, address}, ...]
  return Array.isArray(res.data) ? res.data : res.data.results || []
}

export async function fetchCategories() {
  const res = await api.get('/categories/')
  // expected: [{id, name, transaction_type}, ...]
  return Array.isArray(res.data) ? res.data : res.data.results || []
}

// ---------- TRANSACTIONS ----------

// backend → frontend mapper
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

    // Unit bisnis pakai enum branch_type (LAUNDRY, CARWASH, KOS, OTHER)
    unitBusiness: t.branch_type || 'Unknown',

    // Cabang pakai nama cabang
    branch: t.branch_name || 'Unknown',

    // Nama kategori dari expanded field di TransactionSerializer
    category: t.category_name || 'Lainnya',

    type,
    amount: Number(t.amount ?? 0),

    // HANYA payment_method → CASH / QRIS / TRANSFER / null
    payment: t.payment_method || 'Unknown',

    source,
    description: t.description,
    createdAt: t.created_at,

    // Id mentah untuk keperluan form
    branchId: t.branch,
    categoryId: t.category,
  }
}

// frontend → backend mapper
function mapToBackendPayload(frontendTx) {
  return {
    date: frontendTx.date,
    branch: frontendTx.branchId,        // integer, required
    category: frontendTx.categoryId,    // integer, required
    amount: frontendTx.amount,
    description: frontendTx.description || '',
    payment_method: frontendTx.payment, // "CASH" | "QRIS" | "TRANSFER"
    transaction_type:
      frontendTx.type === 'Income' ? 'INCOME' : 'EXPENSE',

    // sumber transaksi (Manual / Whatsapp / Email).
    // untuk halaman transaksi manual: selalu 'MANUAL'
    source: frontendTx.source
      ? frontendTx.source.toUpperCase()
      : 'MANUAL',

    // WAJIB untuk serializer → minimal string sederhana
    source_identifier:
      frontendTx.sourceIdentifier || 'manual-entry',
  }
}

export async function fetchTransactions(params = {}) {
  const res = await api.get('/transactions/', { params })
  const data = Array.isArray(res.data) ? res.data : res.data.results || []
  const mapped = data.map(mapTransaction)
  console.log('fetchTransactions ->', mapped)
  return mapped
}

export async function createTransaction(frontendTx) {
  console.log('createTransaction frontendTx:', frontendTx)
  const payload = mapToBackendPayload(frontendTx)
  console.log('createTransaction backend payload:', payload)
  try {
    const res = await api.post('/transactions/', payload)
    console.log('createTransaction response:', res.data)
    return mapTransaction(res.data)
  } catch (e) {
    console.error(
      'createTransaction error:',
      e.response?.data || e.message || e,
    )
    throw e
  }
}

export async function deleteTransaction(id) {
  await api.delete(`/transactions/${id}/`)
}
