// src/lib/api/transactions.js
import api from '../axios'

// ---------- FETCH HELPERS ----------

export async function fetchBranches() {
  const res = await api.get('/branches/')
  return Array.isArray(res.data) ? res.data : res.data.results || []
}

export async function fetchCategories() {
  const res = await api.get('/categories/')
  return Array.isArray(res.data) ? res.data : res.data.results || []
}

// ---------- TRANSACTIONS ----------

// backend → frontend mapper
function mapTransaction(t) {
  // 1. Robust handling for Transaction Type (Handle potentially lowercase values)
  const typeRaw = (t.transaction_type || 'INCOME').toUpperCase()
  const type =
    typeRaw === 'EXPENSE'
      ? 'Expense'
      : 'Income' // Default to Income

  // 2. Robust handling for Source (Handle mixed case: "WhatsApp", "whatsapp", "WHATSAPP")
  const sourceRaw = (t.source || 'MANUAL').toUpperCase()
  
  let source = 'Manual'
  if (sourceRaw === 'EMAIL') {
    source = 'Email'
  } else if (sourceRaw === 'WHATSAPP') {
    source = 'Whatsapp'
  }

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

    // ONLY hide Email transactions that are INCOME
    // Because we synthesize them from DailySummary
    // Expense transactions from Email should still show
    // Use the cleaned 'source' variable here to be safe
    //isEmailPosItem: source === 'Email' && type === 'Income',
  }
}

// frontend → backend mapper
function mapToBackendPayload(frontendTx) {
  return {
    date: frontendTx.date,
    branch: frontendTx.branchId,
    category: frontendTx.categoryId,
    amount: frontendTx.amount,
    description: frontendTx.description || '',
    payment_method: frontendTx.payment, // "CASH" | "QRIS" | "TRANSFER"
    transaction_type:
      frontendTx.type === 'Income' ? 'INCOME' : 'EXPENSE',

    // Ensure to send uppercase to backend
    source: frontendTx.source
      ? frontendTx.source.toUpperCase()
      : 'MANUAL',

    source_identifier:
      frontendTx.sourceIdentifier || 'manual-entry',
  }
}

export async function fetchTransactions(params = {}) {
  const res = await api.get('/transactions/', { params })
  const data = Array.isArray(res.data) ? res.data : res.data.results || []
  
  // Debug log to see raw data from backend (Check browser console)
  console.log('Raw Backend Transactions:', data)
  
  const mapped = data.map(mapTransaction)
  console.log('Mapped Transactions:', mapped)
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