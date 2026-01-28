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
  const type =
    (t.transaction_type || '').toUpperCase() === 'INCOME'
      ? 'Income'
      : (t.transaction_type || '').toUpperCase() === 'EXPENSE'
      ? 'Expense'
      : 'Income'

  // Normalize source to handle case sensitivity
  const sourceRaw = (t.source || 'MANUAL').toUpperCase()
  let source = 'Manual'
  if (sourceRaw === 'EMAIL') source = 'Email'
  else if (sourceRaw === 'WHATSAPP') source = 'Whatsapp'

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
    isEmailPosItem: source === 'Email' && type === 'Income',
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

    source: frontendTx.source
      ? frontendTx.source.toUpperCase()
      : 'MANUAL',

    source_identifier:
      frontendTx.sourceIdentifier || 'manual-entry',
  }
}

// FIXED: Fetch ALL pages recursively to ensure we don't miss manual transactions
// pushed off the first page by email transactions.
export async function fetchTransactions(params = {}) {
  let allResults = []
  let nextUrl = '/transactions/'
  let page = 1
  
  // Safety limit to prevent infinite loops if API is misbehaving
  const MAX_PAGES = 20 

  try {
    // Initial fetch
    // We explicitly request a larger page size to minimize requests
    const config = { params: { ...params, page_size: 100 } }
    
    while (nextUrl && page <= MAX_PAGES) {
      // If nextUrl is a full URL (from DRF 'next' field), use it directly
      // Otherwise use the relative path for the first request
      const urlToFetch = nextUrl.startsWith('http') 
        ? nextUrl.replace(import.meta.env.VITE_API_URL || '', '') // strip base URL if needed for axios interceptor
        : nextUrl

      const res = await api.get(urlToFetch, config)
      
      const data = res.data
      let results = []

      if (Array.isArray(data)) {
        // Not paginated
        results = data
        nextUrl = null
      } else {
        // Paginated
        results = data.results || []
        nextUrl = data.next // URL for the next page
      }

      allResults = [...allResults, ...results]
      page += 1
      
      // Clear params for subsequent requests since 'next' URL already contains them
      if (nextUrl) delete config.params
    }
  } catch (err) {
    console.error("Error fetching transactions:", err)
    // Return whatever we managed to fetch
  }

  const mapped = allResults.map(mapTransaction)
  console.log(`Fetched ${mapped.length} transactions total.`)
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