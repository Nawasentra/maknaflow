// src/pages/TransactionsPage.jsx
import React, { useState, useMemo, useEffect } from 'react'
import { fetchTransactions, createTransaction, deleteTransaction } from '../lib/api/transactions'

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
  businessConfigs,
  appSettings,
  lastUsedType,
  setLastUsedType,
  showToast,
}) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc',
  })

  // Initial load from backend
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchTransactions()
        setTransactions(data)
      } catch (e) {
        console.error(e)
        showToast?.('Gagal memuat transaksi.', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [showToast])

  const filteredTransactions = transactions.filter((t) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      t.branch?.toLowerCase().includes(q) ||
      t.unitBusiness?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.type?.toLowerCase().includes(q) ||
      t.payment?.toLowerCase().includes(q) ||
      (t.source || '').toLowerCase().includes(q)
    )
  })

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
    if (transactionToDelete) {
      try {
        await deleteTransaction(transactionToDelete.id)
        setTransactions((prev) => prev.filter((t) => t.id !== transactionToDelete.id))
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

  // newTx must contain branchId & categoryId if backend requires FK IDs
  const handleAddTransaction = async (newTx) => {
    try {
      const saved = await createTransaction(newTx)
      setTransactions((prev) => [...prev, saved])
      setLastUsedType?.(newTx.type)
      setAddOpen(false)
      showToast?.('Berhasil menambahkan transaksi.')
    } catch (e) {
      console.error(e)
      showToast?.('Gagal menyimpan transaksi.', 'error')
    }
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
      <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1.5rem' }}>
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
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                Tabel Transaksi
              </h3>
              <p
                style={{
                  color: 'var(--subtext)',
                  fontSize: '0.875rem',
                  margin: '0.25rem 0 0 0',
                }}
              >
                {loading ? 'Memuat...' : `${sortedTransactions.length} transaksi ditemukan`}
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                width: '100%',
                maxWidth: '500px',
              }}
            >
              <input
                placeholder="🔍 Cari transaksi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: 'var(--text)',
                  fontSize: '0.875rem',
                }}
              />
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
          </div>
        </div>

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
                <ThSortable label="Unit Bisnis" onClick={() => handleSort('unitBusiness')} />
                <ThSortable label="Cabang" onClick={() => handleSort('branch')} />
                <ThSortable label="Kategori" onClick={() => handleSort('category')} />
                <ThSortable label="Tipe" onClick={() => handleSort('type')} />
                <ThSortable label="Jumlah" onClick={() => handleSort('amount')} />
                <ThSortable label="Pembayaran" onClick={() => handleSort('payment')} />
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
              {sortedTransactions.length === 0 ? (
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
                sortedTransactions.map((t) => (
                  <TransactionRow key={t.id} transaction={t} onAskDelete={handleAskDelete} />
                ))
              )}
            </tbody>
          </table>
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
          existingData={transactions}
          businessConfigs={businessConfigs}
          appSettings={appSettings}
          lastUsedType={lastUsedType}
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
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          {title}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--subtext)', marginBottom: '1.5rem' }}>
          {description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
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
  existingData,
  businessConfigs,
  appSettings,
  lastUsedType,
}) {
  const unique = (arr) => Array.from(new Set(arr))

  const unitOptions = useMemo(
    () =>
      unique([
        ...businessConfigs.filter((b) => b.active).map((b) => b.unitBusiness),
        ...existingData.map((t) => t.unitBusiness),
      ]),
    [businessConfigs, existingData],
  )

  const [unitBusiness, setUnitBusiness] = useState('')
  const [branch, setBranch] = useState('')
  const [date, setDate] = useState('')

  const configForUnit = useMemo(
    () => businessConfigs.find((b) => b.unitBusiness === unitBusiness && b.active),
    [businessConfigs, unitBusiness],
  )

  const initialType =
    appSettings.defaultTransactionType === 'Income' ||
    appSettings.defaultTransactionType === 'Expense'
      ? appSettings.defaultTransactionType
      : lastUsedType || 'Income'

  const [type, setType] = useState(initialType)
  const [category, setCategory] = useState('')
  const [payment, setPayment] = useState('')
  const [amountInput, setAmountInput] = useState('')

  const branchOptions = useMemo(() => {
    if (configForUnit && configForUnit.branches.length) {
      return configForUnit.branches.filter((b) => b.active !== false).map((b) => b.name)
    }
    if (!unitBusiness) return []
    return unique(
      existingData.filter((t) => t.unitBusiness === unitBusiness).map((t) => t.branch),
    )
  }, [configForUnit, existingData, unitBusiness])

  const kategoriOptions = useMemo(() => {
    if (!unitBusiness) return []
    if (configForUnit) {
      const branchConfig =
        configForUnit.branches.find((b) => b.name === branch && b.active !== false) ||
        null
      const defaultIncome = configForUnit.defaultIncomeCategories || []
      const defaultExpense = configForUnit.defaultExpenseCategories || []

      if (type === 'Income') {
        const list = branchConfig?.incomeCategories ?? defaultIncome
        if (list && list.length) return list
      } else {
        const list = branchConfig?.expenseCategories ?? defaultExpense
        if (list && list.length) return list
      }
    }
    return unique(existingData.map((t) => t.category))
  }, [configForUnit, branch, type, existingData, unitBusiness])

  const pembayaranOptions = ['QRIS', 'Cash', 'Transfer']

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
    if (!date || !unitBusiness || !branch || !category || !type || !payment || !digits) {
      return
    }

    // NOTE: backend IDs are required for branchId/categoryId if your API expects FK ids.
    const selectedBranchConfig =
      configForUnit?.branches.find((b) => b.name === branch) || null
    const branchId = selectedBranchConfig?.id || null

    const selectedCategoryName = category
    const selectedCategoryObj =
      (selectedBranchConfig?.incomeCategories || [])
        .concat(selectedBranchConfig?.expenseCategories || [])
        .find((c) => c.name === selectedCategoryName) || null
    const categoryId = selectedCategoryObj?.id || null

    onSave({
      date,
      unitBusiness,
      branch,
      category,
      type,
      amount: Number(digits),
      payment,
      branchId,
      categoryId,
    })
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
          width: 420,
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: '1.5rem',
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
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tambah Transaksi</h2>
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
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <Field label="Tanggal">
            <div style={{ display: 'flex' }}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
          </Field>

          <Field label="Unit Bisnis">
            <select
              value={unitBusiness}
              onChange={(e) => {
                setUnitBusiness(e.target.value)
                setBranch('')
              }}
              style={inputStyle}
            >
              <option value="">Pilih unit bisnis</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Cabang">
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              style={inputStyle}
            >
              <option value="">Pilih cabang</option>
              {branchOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tipe">
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
          </Field>

          <Field label="Kategori">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              <option value="">Pilih kategori</option>
              {kategoriOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Jumlah">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--subtext)' }}>Rp</span>
              <input
                type="text"
                value={amountInput}
                onChange={handleAmountChange}
                placeholder="250000"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </Field>

          <Field label="Pembayaran">
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              style={inputStyle}
            >
              <option value="">Pilih pembayaran</option>
              {pembayaranOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
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
      ? '#60a5fa'
      : source === 'Whatsapp'
      ? '#22c55e'
      : '#e5e7eb'

  const sourceBg =
    source === 'Email'
      ? 'rgba(59, 130, 246, 0.15)'
      : source === 'Whatsapp'
      ? 'rgba(34, 197, 94, 0.15)'
      : 'rgba(148, 163, 184, 0.12)'

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text)' }}>
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
            padding: '0.375rem 0.75rem',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500',
          }}
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
      <td style={{ padding: '1rem 1.5rem', color: 'var(--subtext)' }}>
        {transaction.payment}
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
