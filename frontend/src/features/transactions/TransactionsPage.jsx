// src/features/transactions/TransactionsPage.jsx
import React, { useState, useMemo, useEffect } from 'react'
import {
  createTransaction,
  deleteTransaction,
  fetchBranches,
  fetchCategories,
  fetchTransactions,
} from '../../lib/api/transactions'
import { fetchDailySummaries } from '../../lib/api/dailySummaries'

const inputStyle = {
  width: '100%',
  backgroundColor: 'var(--bg)',
  borderRadius: 8,
  border: '1px solid var(--border)',
  padding: '0.5rem 0.75rem',
  color: 'var(--text)',
  fontSize: '0.85rem',
  outline: 'none',
}

function Field({ label, children }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.8rem',
          color: 'var(--subtext)',
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function TransactionsPage({
  transactions,
  setTransactions,
  businessConfigs,
  appSettings,
  lastUsedType,
  setLastUsedType,
  showToast,
}) {
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterUnit, setFilterUnit] = useState('Semua Unit')
  const [filterBranch, setFilterBranch] = useState('Semua Cabang')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const [branches, setBranches] = useState([])
  const [categories, setCategories] = useState([])
  const [dailySummaries, setDailySummaries] = useState([])

  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc',
  })

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const setSafeBranches = (br) => setBranches(Array.isArray(br) ? br : [])
  const setSafeCategories = (cat) => setCategories(Array.isArray(cat) ? cat : [])

  // --- fetch ulang transaksi dari API ---
  const reloadTransactions = async () => {
    try {
      setLoading(true)
      const data = await fetchTransactions()
      setTransactions(Array.isArray(data) ? data : [])
      showToast?.('Transaksi berhasil dimuat ulang.')
    } catch (e) {
      console.error(e)
      showToast?.('Gagal memuat ulang transaksi.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // --- initial load (branches, categories, transactions, daily summaries) ---
  useEffect(() => {
    const loadMeta = async () => {
      try {
        setLoading(true)
        const [br, cat, tx, ds] = await Promise.all([
          fetchBranches(),
          fetchCategories(),
          fetchTransactions(),
          fetchDailySummaries(),
        ])
        setSafeBranches(br)
        setSafeCategories(cat)
        setTransactions(Array.isArray(tx) ? tx : [])
        setDailySummaries(Array.isArray(ds) ? ds : ds.results || [])
      } catch (e) {
        console.error(e)
        showToast?.('Gagal memuat data referensi.', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const safeTransactions = Array.isArray(transactions) ? transactions : []
  const safeDailySummaries = Array.isArray(dailySummaries)
    ? dailySummaries
    : []

  // --- synthesize one Email POS row per DailySummary ---
  const emailSummaryRows = safeDailySummaries.map((s) => ({
    id: `email-summary-${s.id}`,
    date: s.date,
    unitBusiness: s.branch_type || 'Unknown', // serializer should expose branch_type
    branch: s.branch_name || 'Unknown', // serializer should expose branch_name
    category: 'Penjualan via POS',
    type: 'Income',
    amount: Number(s.total_collected ?? 0),
    payment: '-', // POS summary, no specific payment method
    source: 'Email',
    description: 'Ringkasan harian LUNA POS',
    createdAt: s.created_at,
    branchId: s.branch || null,
    categoryId: null,
    sourceIdentifier: s.source_identifier || `luna-summary-${s.id}`,
  }))

  // --- merge real transactions + email rows, dedupe by sourceIdentifier if present ---
  const mergedTransactions = useMemo(() => {
    const byKey = new Map()

    // real transactions first
    safeTransactions.forEach((t) => {
      const key = t.sourceIdentifier
        ? `${t.source}-${t.sourceIdentifier}`
        : `tx-${t.id}`
      byKey.set(key, t)
    })

    // add email summary rows only if not already present
    emailSummaryRows.forEach((t) => {
      const key = t.sourceIdentifier
        ? `${t.source}-${t.sourceIdentifier}`
        : t.id
      if (!byKey.has(key)) {
        byKey.set(key, t)
      }
    })

    return Array.from(byKey.values())
  }, [safeTransactions, emailSummaryRows])

  // --- opsi Unit & Cabang ---
  const unitOptions = useMemo(() => {
    const units = Array.from(
      new Set(mergedTransactions.map((t) => t.unitBusiness).filter(Boolean)),
    )
    return ['Semua Unit', ...units]
  }, [mergedTransactions])

  const branchOptions = useMemo(() => {
    let source = mergedTransactions
    if (filterUnit !== 'Semua Unit') {
      source = source.filter((t) => t.unitBusiness === filterUnit)
    }
    const names = Array.from(
      new Set(source.map((t) => t.branch).filter(Boolean)),
    )
    return ['Semua Cabang', ...names]
  }, [mergedTransactions, filterUnit])

  useEffect(() => {
    if (!branchOptions.includes(filterBranch)) {
      setFilterBranch('Semua Cabang')
    }
  }, [branchOptions, filterBranch])

  // --- filter transaksi ---
  const filteredTransactions = mergedTransactions.filter((t) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      const matchSearch =
        t.branch?.toLowerCase().includes(q) ||
        t.unitBusiness?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.type?.toLowerCase().includes(q) ||
        t.payment?.toLowerCase().includes(q) ||
        (t.source || '').toLowerCase().includes(q)
      if (!matchSearch) return false
    }

    if (filterUnit !== 'Semua Unit' && t.unitBusiness !== filterUnit) {
      return false
    }

    if (filterBranch !== 'Semua Cabang' && t.branch !== filterBranch) {
      return false
    }

    return true
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterUnit, filterBranch])

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const { key, direction } = sortConfig
    let cmp = 0

    if (key === 'date') {
      cmp = new Date(a.date) - new Date(b.date)
    } else if (key === 'amount') {
      cmp = a.amount - b.amount
    } else {
      cmp = String(a[key] ?? '').localeCompare(String(b[key] ?? ''))
    }

    return direction === 'asc' ? cmp : -cmp
  })

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      if (key === 'date' || key === 'amount') {
        return { key, direction: 'desc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleAskDelete = (transaction) => {
    setTransactionToDelete(transaction)
    setConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (transactionToDelete && typeof transactionToDelete.id === 'number') {
      try {
        await deleteTransaction(transactionToDelete.id)
        setTransactions((prev) =>
          (Array.isArray(prev) ? prev : []).filter(
            (t) => t.id !== transactionToDelete.id,
          ),
        )
        showToast?.('Berhasil menghapus transaksi.')
      } catch (e) {
        console.error(e)
        showToast?.('Gagal menghapus transaksi.', 'error')
      }
    }
    setConfirmOpen(false)
    setTransactionToDelete(null)
  }

  const handleCancelDelete = () => {
    setConfirmOpen(false)
    setTransactionToDelete(null)
  }

  // prevent duplikat transaksi (tanggal + cabang + kategori + type + amount + payment)
  const handleAddTransaction = async (newTx) => {
    const isDuplicate = safeTransactions.some((t) => {
      return (
        t.date === newTx.date &&
        t.branchId === newTx.branchId &&
        t.categoryId === newTx.categoryId &&
        t.type === newTx.type &&
        Number(t.amount) === Number(newTx.amount) &&
        (t.payment || '').toUpperCase() ===
          (newTx.payment || '').toUpperCase()
      )
    })

    if (isDuplicate) {
      showToast?.(
        'Transaksi dengan data yang sama sudah ada. Cek kembali sebelum menyimpan.',
        'error',
      )
      return
    }

    try {
      const saved = await createTransaction(newTx)
      setTransactions((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        saved,
      ])
      setLastUsedType?.(newTx.type)
      setAddOpen(false)
      showToast?.('Berhasil menambahkan transaksi.')
    } catch (e) {
      console.error(e)
      showToast?.('Gagal menyimpan transaksi.', 'error')
    }
  }

  const totalItems = sortedTransactions.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex)

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
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
      <h1
        style={{
          fontSize: '1.875rem',
          fontWeight: '700',
          marginBottom: '1.5rem',
        }}
      >
        📋 Transaksi
      </h1>

      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'rgba(148, 163, 184, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  margin: 0,
                }}
              >
                Tabel Transaksi
              </h3>
              <p
                style={{
                  color: 'var(--subtext)',
                  fontSize: '0.875rem',
                  margin: '0.25rem 0 0 0',
                }}
              >
                {loading
                  ? 'Memuat...'
                  : `${sortedTransactions.length} transaksi ditemukan`}
              </p>
            </div>

            {/* search + refresh + add */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                width: '100%',
                maxWidth: '100%',
                flexWrap: 'wrap',
              }}
            >
              <input
                placeholder="🔍 Cari transaksi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: 'var(--text)',
                  fontSize: '0.875rem',
                }}
              />
              <button
                onClick={reloadTransactions}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--subtext)',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '0.8rem',
                }}
              >
                ⟳ Refresh
              </button>
              <button
                onClick={() => setAddOpen(true)}
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--bg)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '0.875rem',
                }}
              >
                + Tambah Transaksi
              </button>
            </div>

            {/* filter unit + cabang */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1rem',
                width: '100%',
                alignItems: 'flex-end',
              }}
            >
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
                    fontSize: '0.875rem',
                  }}
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

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
                    fontSize: '0.875rem',
                  }}
                >
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--border)',
                  backgroundColor: 'rgba(148, 163, 184, 0.04)',
                }}
              >
                <ThSortable label="Tanggal" onClick={() => handleSort('date')} />
                <ThSortable
                  label="Unit Bisnis"
                  onClick={() => handleSort('unitBusiness')}
                />
                <ThSortable label="Cabang" onClick={() => handleSort('branch')} />
                <ThSortable
                  label="Kategori"
                  onClick={() => handleSort('category')}
                />
                <ThSortable label="Tipe" onClick={() => handleSort('type')} />
                <ThSortable label="Jumlah" onClick={() => handleSort('amount')} />
                <ThSortable
                  label="Pembayaran"
                  onClick={() => handleSort('payment')}
                />
                <ThSortable label="Source" onClick={() => handleSort('source')} />
                <th
                  style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'var(--subtext)',
                    textTransform: 'uppercase',
                  }}
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      color: 'var(--subtext)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {loading
                      ? 'Memuat data transaksi...'
                      : 'Belum ada transaksi yang cocok dengan filter/cari.'}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    onAskDelete={handleAskDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1.5rem 1.25rem',
            fontSize: '0.8rem',
            color: 'var(--subtext)',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <span>
            Menampilkan {totalItems === 0 ? 0 : startIndex + 1}–
            {Math.min(endIndex, totalItems)} dari {totalItems} transaksi
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              ‹
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const page = idx + 1
              const isActive = page === currentPage
              return (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  style={{
                    minWidth: 28,
                    padding: '0.3rem 0.5rem',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: isActive
                      ? 'var(--accent)'
                      : 'var(--bg-elevated)',
                    color: isActive ? 'var(--bg)' : 'var(--text)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {page}
                </button>
              )
            })}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="Hapus Permanen"
          description="Transaksi ini akan dihapus secara permanen dari sistem."
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />
      )}

      {addOpen && (
        <AddTransactionModal
          onClose={() => setAddOpen(false)}
          onSave={handleAddTransaction}
          branches={branches}
          categories={categories}
          appSettings={appSettings}
          lastUsedType={lastUsedType}
          businessConfigs={businessConfigs}
          showToast={showToast}
          existingTransactions={safeTransactions}
        />
      )}
    </main>
  )
}

function ThSortable({ label, onClick }) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: '1rem 1.5rem',
        textAlign: 'left',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: 'var(--subtext)',
        textTransform: 'uppercase',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {label}
    </th>
  )
}

// ConfirmDialog, AddTransactionModal, TransactionRow
// keep your existing implementations unchanged.

function ConfirmDialog({ title, description, onCancel, onConfirm }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: 380,
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: '1.5rem',
        }}
      >
        <h2
          style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--subtext)',
            marginBottom: '1.5rem',
          }}
        >
          {description}
        </p>
        <div
          style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '0.6rem 1.3rem',
              borderRadius: 9999,
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: 9999,
              border: 'none',
              backgroundColor: '#ef4444',
              color: 'var(--bg)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

function AddTransactionModal({
  onClose,
  onSave,
  branches,
  categories,
  appSettings,
  lastUsedType,
  businessConfigs,
  showToast,
}) {
  const [branchId, setBranchId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState(
    appSettings.defaultTransactionType === 'Income' ||
    appSettings.defaultTransactionType === 'Expense'
      ? appSettings.defaultTransactionType
      : lastUsedType || 'Income',
  )
  const [payment, setPayment] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [description, setDescription] = useState('')
  const [categorySearch, setCategorySearch] = useState('')

  const safeBranches = Array.isArray(branches) ? branches : []
  const safeCategories = Array.isArray(categories) ? categories : []
  const safeBusinessConfigs = Array.isArray(businessConfigs)
    ? businessConfigs
    : []

  const branchActiveMap = useMemo(() => {
    const map = new Map()
    safeBusinessConfigs.forEach((unit) => {
      ;(unit.branches || []).forEach((br) => {
        map.set(br.id, br.active !== false)
      })
    })
    return map
  }, [safeBusinessConfigs])

  const filteredCategories = useMemo(() => {
    const txType = type === 'Income' ? 'INCOME' : 'EXPENSE'
    const pool = safeCategories.filter((c) => c.transaction_type === txType)

    const numericBranchId = Number(branchId)
    let result = pool

    if (numericBranchId && safeBusinessConfigs.length) {
      let mappingIds = null
      safeBusinessConfigs.forEach((unit) => {
        ;(unit.branches || []).forEach((br) => {
          if (br.id === numericBranchId) {
            mappingIds =
              txType === 'INCOME'
                ? br.incomeCategories || null
                : br.expenseCategories || null
          }
        })
      })
      if (mappingIds && mappingIds.length) {
        result = pool.filter((c) => mappingIds.includes(c.id))
      }
    }

    const dedup = new Map()
    result.forEach((c) => {
      const key = c.name.trim().toLowerCase()
      if (!dedup.has(key)) dedup.set(key, c)
    })

    return Array.from(dedup.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }),
    )
  }, [safeCategories, type, branchId, safeBusinessConfigs])

  const visibleCategories = useMemo(() => {
    if (!categorySearch) return filteredCategories
    const q = categorySearch.toLowerCase()
    return filteredCategories.filter((c) =>
      c.name.toLowerCase().includes(q),
    )
  }, [filteredCategories, categorySearch])

  const pembayaranOptions = [
    { label: 'QRIS', value: 'QRIS' },
    { label: 'Cash', value: 'CASH' },
    { label: 'Transfer', value: 'TRANSFER' },
  ]

  const formatAmountDisplay = (raw) => {
    const digits = raw.replace(/[^\d]/g, '')
    if (!digits) return ''
    return new Intl.NumberFormat('id-ID').format(Number(digits))
  }

  const handleAmountChange = (e) => {
    const raw = e.target.value
    setAmountInput(formatAmountDisplay(raw))
  }

  const handleSubmit = () => {
    const digits = amountInput.replace(/[^\d]/g, '')

    if (!date || !branchId || !categoryId || !type || !payment || !digits) {
      showToast?.('Lengkapi semua field sebelum menyimpan.', 'error')
      return
    }

    const numericAmount = Number(digits)
    if (numericAmount <= 0) {
      showToast?.('Jumlah harus lebih besar dari 0.', 'error')
      return
    }

    const payload = {
      date,
      branchId: Number(branchId),
      categoryId: Number(categoryId),
      type,
      amount: numericAmount,
      payment,
      description,
      source: 'Manual',
      sourceIdentifier: `manual-entry-${Date.now()}`,
    }

    onSave(payload)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: 640,
          maxWidth: '95vw',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: '1.5rem 1.75rem 1.25rem',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Tambah Transaksi
          </h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--subtext)',
              cursor: 'pointer',
              fontSize: '1.25rem',
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.9rem 1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <Field label="Tanggal">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  ...inputStyle,
                  width: '100%',
                  borderColor: 'rgba(148,163,184,0.7)',
                  backgroundColor: 'rgba(15,23,42,0.06)',
                  cursor: 'pointer',
                }}
              />
            </Field>
          </div>

          <div>
            <Field label="Cabang">
              <select
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value)
                  setCategoryId('')
                }}
                style={inputStyle}
              >
                <option value="">Pilih cabang</option>
                {safeBranches.map((b) => {
                  const isActive = branchActiveMap.get(b.id) !== false
                  const label = isActive ? b.name : `${b.name} (Nonaktif)`
                  return (
                    <option
                      key={b.id}
                      value={isActive ? b.id : ''}
                      disabled={!isActive}
                    >
                      {label}
                    </option>
                  )
                })}
              </select>
            </Field>
          </div>

          <div>
            <Field label="Tipe">
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value)
                  setCategoryId('')
                }}
                style={inputStyle}
              >
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </Field>
          </div>

          <div>
            <Field label="Kategori">
              <input
                type="text"
                placeholder="Cari kategori..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                style={{
                  ...inputStyle,
                  marginBottom: '0.35rem',
                  fontSize: '0.8rem',
                }}
              />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Pilih kategori</option>
                {visibleCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div>
            <Field label="Jumlah">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span
                  style={{ fontSize: '0.9rem', color: 'var(--subtext)' }}
                >
                  Rp
                </span>
                <input
                  type="text"
                  value={amountInput}
                  onChange={handleAmountChange}
                  placeholder="250000"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </Field>
          </div>

          <div>
            <Field label="Pembayaran">
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                style={inputStyle}
              >
                <option value="">Pilih pembayaran</option>
                {pembayaranOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ gridColumn: '1 / span 2' }}>
            <Field label="Deskripsi (opsional)">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </Field>
          </div>
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.6rem 1.3rem',
              borderRadius: 9999,
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: 9999,
              border: 'none',
              backgroundColor: 'var(--accent)',
              color: 'var(--bg)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ transaction, onAskDelete }) {
  const isIncome = transaction.type === 'Income'
  const source = transaction.source || 'Manual'

  const sourceColor =
    source === 'Email'
      ? '#2563eb'
      : source === 'Whatsapp'
      ? '#059669'
      : 'var(--text)'

  const sourceBg =
    source === 'Email'
      ? 'rgba(37, 99, 235, 0.12)'
      : source === 'Whatsapp'
      ? 'rgba(5, 150, 105, 0.12)'
      : 'rgba(148, 163, 184, 0.25)'

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td
        style={{
          padding: '1rem 1.5rem',
          fontWeight: '500',
          color: 'var(--text)',
        }}
      >
        {new Date(transaction.date).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
        })}
      </td>
      <td style={{ padding: '1rem 1.5rem', color: 'var(--text)' }}>
        {transaction.unitBusiness}
      </td>
      <td style={{ padding: '1rem 1.5rem' }}>
        <span
          style={{
            display: 'inline-block',
            maxWidth: 220,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '0.375rem 0.75rem',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500',
          }}
          title={transaction.branch}
        >
          {transaction.branch}
        </span>
      </td>
      <td style={{ padding: '1rem 1.5rem', color: 'var(--text)' }}>
        {transaction.category}
      </td>
      <td style={{ padding: '1rem 1.5rem' }}>
        <span
          style={{
            padding: '0.375rem 0.75rem',
            backgroundColor: isIncome
              ? 'rgba(34, 197, 94, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            color: isIncome ? '#4ade80' : '#f87171',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500',
          }}
        >
          {transaction.type}
        </span>
      </td>
      <td
        style={{
          padding: '1rem 1.5rem',
          fontWeight: '600',
          color: isIncome ? '#10b981' : '#ef4444',
        }}
      >
        Rp {new Intl.NumberFormat('id-ID').format(transaction.amount)}
      </td>
      <td style={{ padding: '1rem 1.5rem', color: 'var(--text)' }}>
        {transaction.source === 'Email'
          ? '-' // email summary has no explicit payment method
          : transaction.payment === 'CASH'
          ? 'Cash'
          : transaction.payment === 'QRIS'
          ? 'QRIS'
          : transaction.payment === 'TRANSFER'
          ? 'Transfer'
          : '-'}
      </td>
      <td style={{ padding: '1rem 1.5rem' }}>
        <span
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 9999,
            backgroundColor: sourceBg,
            color: sourceColor,
            fontSize: '0.75rem',
            fontWeight: 500,
          }}
        >
          {source}
        </span>
      </td>
      <td style={{ padding: '1rem 1.5rem' }}>
        <button
          onClick={() => onAskDelete(transaction)}
          title="Hapus Permanen"
          style={{
            color: '#f87171',
            padding: '0.5rem',
            borderRadius: '8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '1.25rem',
            transition: 'all 0.2s',
          }}
        >
          🗑️
        </button>
      </td>
    </tr>
  )
}

export default TransactionsPage
