// src/features/transactions/TransactionsPage.jsx
import React, { useState, useEffect, useMemo } from 'react'
import {
  fetchTransactions,
  createTransaction,
  deleteTransaction,
} from '../../lib/api/transactions'
import { fetchBranches, fetchCategories } from '../../lib/api/branchesCategories'

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tunai' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'TRANSFER', label: 'Transfer' },
]

function TransactionsPage({ showToast }) {
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const [branches, setBranches] = useState([])
  const [categories, setCategories] = useState([])

  const [filterType, setFilterType] = useState('ALL') // ALL | INCOME | EXPENSE
  const [filterBranchId, setFilterBranchId] = useState('ALL')
  const [filterSearch, setFilterSearch] = useState('')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // initial load
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const [tx, br, cat] = await Promise.all([
          fetchTransactions(),
          fetchBranches(),
          fetchCategories(),
        ])
        setTransactions(Array.isArray(tx) ? tx : [])
        setBranches(Array.isArray(br) ? br : [])
        setCategories(Array.isArray(cat) ? cat : [])
      } catch (e) {
        console.error(e)
        setError('Gagal memuat transaksi.')
        showToast?.('Gagal memuat transaksi.', 'error')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [showToast])

  const filteredTransactions = useMemo(() => {
    let list = Array.isArray(transactions) ? transactions : []

    if (filterType === 'INCOME') {
      list = list.filter((t) => t.type === 'Income')
    } else if (filterType === 'EXPENSE') {
      list = list.filter((t) => t.type === 'Expense')
    }

    if (filterBranchId !== 'ALL') {
      list = list.filter((t) => String(t.branchId) === String(filterBranchId))
    }

    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase()
      list = list.filter((t) => {
        return (
          (t.description || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q)
        )
      })
    }

    return list
  }, [transactions, filterType, filterBranchId, filterSearch])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize))

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredTransactions.slice(start, start + pageSize)
  }, [filteredTransactions, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [filterType, filterBranchId, filterSearch])

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini?')) return
    try {
      await deleteTransaction(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      showToast?.('Transaksi berhasil dihapus.')
    } catch (e) {
      console.error(e)
      showToast?.('Gagal menghapus transaksi.', 'error')
    }
  }

  const handleAddTransaction = async (payload) => {
    try {
      const created = await createTransaction(payload)
      setTransactions((prev) => [created, ...prev])
      showToast?.('Transaksi berhasil disimpan.')
      setIsAddModalOpen(false)
    } catch (e) {
      console.error('handleAddTransaction error:', e.response?.data || e)
      showToast?.('Gagal menyimpan transaksi.', 'error')
    }
  }

  if (isLoading) {
    return (
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          color: 'var(--subtext)',
        }}
      >
        <p>Memuat transaksi...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          color: '#f97316',
        }}
      >
        <p>{error}</p>
      </main>
    )
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Transaksi</h1>
          <p style={{ fontSize: 13, color: 'var(--subtext)', marginTop: 4 }}>
            Kelola transaksi manual yang tercatat di sistem.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          style={{
            backgroundColor: 'var(--accent)',
            borderRadius: 9999,
            border: 'none',
            color: 'var(--bg)',
            fontSize: 13,
            fontWeight: 600,
            padding: '0.6rem 1.4rem',
            cursor: 'pointer',
          }}
        >
          + Tambah Transaksi
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ minWidth: 180 }}>
          <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 4 }}>
            Tipe transaksi
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { value: 'ALL', label: 'Semua' },
              { value: 'INCOME', label: 'Income' },
              { value: 'EXPENSE', label: 'Expense' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilterType(opt.value)}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: 9999,
                  border:
                    filterType === opt.value
                      ? '1px solid var(--accent)'
                      : '1px solid var(--border)',
                  backgroundColor:
                    filterType === opt.value ? 'var(--accent)' : 'transparent',
                  color: filterType === opt.value ? 'var(--bg)' : 'var(--text)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ minWidth: 220 }}>
          <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 4 }}>
            Cabang
          </p>
          <select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg)',
              borderRadius: 9999,
              border: '1px solid var(--border)',
              padding: '0.55rem 1rem',
              fontSize: 13,
              color: 'var(--text)',
              outline: 'none',
            }}
          >
            <option value="ALL">Semua Cabang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 4 }}>
            Cari deskripsi / kategori
          </p>
          <input
            placeholder="Cari transaksi..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg)',
              borderRadius: 9999,
              border: '1px solid var(--border)',
              padding: '0.55rem 1rem',
              fontSize: 13,
              color: 'var(--text)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          padding: '1rem 1.25rem',
        }}
      >
        <div
          style={{
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--subtext)',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '0.5rem 0.5rem' }}>Tanggal</th>
                <th style={{ padding: '0.5rem 0.5rem' }}>Cabang</th>
                <th style={{ padding: '0.5rem 0.5rem' }}>Unit</th>
                <th style={{ padding: '0.5rem 0.5rem' }}>Tipe</th>
                <th style={{ padding: '0.5rem 0.5rem' }}>Kategori</th>
                <th style={{ padding: '0.5rem 0.5rem' }}>Metode Bayar</th>
                <th style={{ padding: '0.5rem 0.5rem', textAlign: 'right' }}>
                  Jumlah
                </th>
                <th style={{ padding: '0.5rem 0.5rem' }}>Deskripsi</th>
                <th style={{ padding: '0.5rem 0.5rem' }} />
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: '0.75rem 0.5rem',
                      fontSize: 12,
                      color: 'var(--subtext)',
                    }}
                  >
                    Tidak ada transaksi yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: '1px solid rgba(148,163,184,0.2)',
                    }}
                  >
                    <td style={{ padding: '0.55rem 0.5rem' }}>{t.date}</td>
                    <td style={{ padding: '0.55rem 0.5rem' }}>{t.branch}</td>
                    <td style={{ padding: '0.55rem 0.5rem' }}>{t.unitBusiness}</td>
                    <td style={{ padding: '0.55rem 0.5rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.1rem 0.5rem',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor:
                            t.type === 'Income'
                              ? 'rgba(34,197,94,0.15)'
                              : 'rgba(239,68,68,0.15)',
                          color:
                            t.type === 'Income' ? '#4ade80' : '#fca5a5',
                        }}
                      >
                        {t.type === 'Income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td style={{ padding: '0.55rem 0.5rem' }}>{t.category}</td>
                    <td style={{ padding: '0.55rem 0.5rem' }}>
                      {t.payment === 'CASH'
                        ? 'Tunai'
                        : t.payment === 'QRIS'
                        ? 'QRIS'
                        : t.payment === 'TRANSFER'
                        ? 'Transfer'
                        : t.payment || '-'}
                    </td>
                    <td
                      style={{
                        padding: '0.55rem 0.5rem',
                        textAlign: 'right',
                      }}
                    >
                      {formatCurrency(t.amount || 0)}
                    </td>
                    <td style={{ padding: '0.55rem 0.5rem' }}>
                      {t.description || '-'}
                    </td>
                    <td style={{ padding: '0.55rem 0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(t.id)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#f97316',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            marginTop: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--subtext)',
          }}
        >
          <span>
            Menampilkan{' '}
            {paginatedTransactions.length === 0
              ? 0
              : (page - 1) * pageSize + 1}{' '}
            -{' '}
            {(page - 1) * pageSize + paginatedTransactions.length} dari{' '}
            {filteredTransactions.length}{' '}
            transaksi
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                backgroundColor: 'transparent',
                borderRadius: 9999,
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 12,
                padding: '0.3rem 0.8rem',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.5 : 1,
              }}
            >
              ‹ Sebelumnya
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={page === totalPages}
              style={{
                backgroundColor: 'transparent',
                borderRadius: 9999,
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 12,
                padding: '0.3rem 0.8rem',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                opacity: page === totalPages ? 0.5 : 1,
              }}
            >
              Berikutnya ›
            </button>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <AddTransactionModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddTransaction}
          branches={branches}
          categories={categories}
          showToast={showToast}
        />
      )}
    </main>
  )
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  })
    .format(amount || 0)
    .replace('Rp', 'Rp ')
}

function AddTransactionModal({
  onClose,
  onSave,
  branches,
  categories,
  showToast,
}) {
  const today = new Date().toISOString().slice(0, 10)

  const [date, setDate] = useState(today)
  const [branchId, setBranchId] = useState('')
  const [type, setType] = useState('Income')
  const [categoryId, setCategoryId] = useState('')
  const [payment, setPayment] = useState('CASH')
  const [amountInput, setAmountInput] = useState('')
  const [description, setDescription] = useState('')

  const filteredCategories = useMemo(() => {
    const txType = type === 'Income' ? 'INCOME' : 'EXPENSE'
    return (categories || []).filter(
      (c) => c.transaction_type === txType,
    )
  }, [categories, type])

  const handleAmountChange = (value) => {
    const digits = value.replace(/[^\d]/g, '')
    setAmountInput(digits)
  }

  const handleSubmit = () => {
    const digits = amountInput.replace(/[^\d]/g, '')
    const numericAmount = Number(digits)

    if (
      !date ||
      !branchId ||
      !categoryId ||
      !type ||
      !payment ||
      !digits ||
      numericAmount <= 0
    ) {
      showToast?.('Lengkapi semua field dan pastikan jumlah > 0.', 'error')
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
    }

    onSave(payload)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: '1.5rem 1.75rem 1.25rem',
          width: '100%',
          maxWidth: 540,
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
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>
            Tambah Transaksi
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--subtext)',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem 1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              Tanggal
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                padding: '0.45rem 0.7rem',
                fontSize: 12,
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              Cabang
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                padding: '0.45rem 0.7rem',
                fontSize: 12,
                color: 'var(--text)',
                outline: 'none',
              }}
            >
              <option value="">Pilih cabang...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              Tipe
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'Income', label: 'Income' },
                { value: 'Expense', label: 'Expense' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  style={{
                    padding: '0.35rem 0.7rem',
                    borderRadius: 9999,
                    border:
                      type === opt.value
                        ? '1px solid var(--accent)'
                        : '1px solid var(--border)',
                    backgroundColor:
                      type === opt.value ? 'var(--accent)' : 'transparent',
                    color:
                      type === opt.value ? 'var(--bg)' : 'var(--text)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              Kategori
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                padding: '0.45rem 0.7rem',
                fontSize: 12,
                color: 'var(--text)',
                outline: 'none',
              }}
            >
              <option value="">Pilih kategori...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              Metode Pembayaran
            </label>
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                padding: '0.45rem 0.7rem',
                fontSize: 12,
                color: 'var(--text)',
                outline: 'none',
              }}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              Jumlah
            </label>
            <input
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Masukkan nominal"
              style={{
                width: '100%',
                backgroundColor: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                padding: '0.45rem 0.7rem',
                fontSize: 12,
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 4,
            }}
          >
            Deskripsi (opsional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Catatan tambahan..."
            style={{
              width: '100%',
              backgroundColor: 'var(--bg)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              padding: '0.55rem 0.7rem',
              fontSize: 12,
              color: 'var(--text)',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              borderRadius: 9999,
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 12,
              padding: '0.45rem 1rem',
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              backgroundColor: 'var(--accent)',
              borderRadius: 9999,
              border: 'none',
              color: 'var(--bg)',
              fontSize: 12,
              fontWeight: 600,
              padding: '0.45rem 1.2rem',
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

export default TransactionsPage
