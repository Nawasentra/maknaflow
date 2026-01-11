// src/features/add-business/AddBusinessPage.jsx
import React, { useState, useEffect } from 'react'
import {
  createBranch,
  createCategory,
  fetchBranches,
  fetchCategories,
} from '../../lib/api/branchesCategories'

// Fixed backend branch types
const BRANCH_TYPES = [
  { value: 'LAUNDRY', label: 'Laundry' },
  { value: 'CARWASH', label: 'Car Wash' },
  { value: 'KOS', label: 'Kos' },
  { value: 'OTHER', label: 'Other Business' },
]

function AddBusinessPage({ businessConfigs, setBusinessConfigs, showToast }) {
  const [step, setStep] = useState(1)
  const [branchName, setBranchName] = useState('')
  const [branchType, setBranchType] = useState('') // enum value
  const [incomeCategories, setIncomeCategories] = useState([])
  const [expenseCategories, setExpenseCategories] = useState([])
  const [incomeInput, setIncomeInput] = useState('')
  const [expenseInput, setExpenseInput] = useState('')
  const [loading, setLoading] = useState(false)

  // preload defaults if selecting an existing type
  useEffect(() => {
    if (!branchType) {
      setIncomeCategories([])
      setExpenseCategories([])
      return
    }
    const cfg = (Array.isArray(businessConfigs) ? businessConfigs : []).find(
      (b) => b.branch_type === branchType || b.id === branchType,
    )
    if (!cfg) {
      setIncomeCategories([])
      setExpenseCategories([])
      return
    }
    setIncomeCategories(cfg.defaultIncomeCategories || [])
    setExpenseCategories(cfg.defaultExpenseCategories || [])
  }, [branchType, businessConfigs])

  const handleAddIncomeCategory = () => {
    const trimmed = incomeInput.trim()
    if (!trimmed) return
    if (!incomeCategories.includes(trimmed)) {
      setIncomeCategories([...incomeCategories, trimmed])
    }
    setIncomeInput('')
  }

  const handleAddExpenseCategory = () => {
    const trimmed = expenseInput.trim()
    if (!trimmed) return
    if (!expenseCategories.includes(trimmed)) {
      setExpenseCategories([...expenseCategories, trimmed])
    }
    setExpenseInput('')
  }

  const handleRemoveIncome = (cat) => {
    setIncomeCategories((prev) => prev.filter((c) => c !== cat))
  }

  const handleRemoveExpense = (cat) => {
    setExpenseCategories((prev) => prev.filter((c) => c !== cat))
  }

  const canGoNext =
    branchName.trim() &&
    branchType &&
    (incomeCategories.length > 0 || expenseCategories.length > 0)

  const branchTypeLabel = (value) =>
    BRANCH_TYPES.find((t) => t.value === value)?.label || value

  const resetForm = () => {
    setStep(1)
    setBranchName('')
    setBranchType('')
    setIncomeCategories([])
    setExpenseCategories([])
    setIncomeInput('')
    setExpenseInput('')
  }

  // After creating things in backend, rebuild businessConfigs from API
  const rebuildBusinessConfigsFromApi = async () => {
    const [branches, categories] = await Promise.all([
      fetchBranches(),
      fetchCategories(),
    ])

    const byType = {}

    const branchArray = Array.isArray(branches) ? branches : []
    branchArray.forEach((br) => {
      if (!byType[br.branch_type]) {
        byType[br.branch_type] = {
          id: br.branch_type,
          branch_type: br.branch_type,
          unitBusiness: br.branch_type,
          defaultIncomeCategories: [],
          defaultExpenseCategories: [],
          branches: [],
          active: true,
        }
      }
      byType[br.branch_type].branches.push({
        id: br.id,
        name: br.name,
        active: true,
      })
    })

    const catArray = Array.isArray(categories) ? categories : []
    catArray.forEach((cat) => {
      Object.values(byType).forEach((cfg) => {
        if (cat.transaction_type === 'INCOME') {
          if (!cfg.defaultIncomeCategories.includes(cat.name)) {
            cfg.defaultIncomeCategories.push(cat.name)
          }
        } else if (cat.transaction_type === 'EXPENSE') {
          if (!cfg.defaultExpenseCategories.includes(cat.name)) {
            cfg.defaultExpenseCategories.push(cat.name)
          }
        }
      })
    })

    setBusinessConfigs(Object.values(byType))
  }

  const handleActivate = async () => {
    if (!canGoNext || loading) return
    setLoading(true)

    try {
      const branchPayload = {
        name: branchName.trim(),
        branch_type: branchType,
      }
      await createBranch(branchPayload)

      const promises = []
      incomeCategories.forEach((name) => {
        promises.push(createCategory({ name, transaction_type: 'INCOME' }))
      })
      expenseCategories.forEach((name) => {
        promises.push(createCategory({ name, transaction_type: 'EXPENSE' }))
      })
      await Promise.all(promises)

      await rebuildBusinessConfigsFromApi()

      resetForm()
      showToast?.('Berhasil mengaktivasi unit bisnis baru.')
    } catch (e) {
      console.error(e)
      showToast?.('Gagal menyimpan unit bisnis.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { id: 1, label: 'Informasi Dasar' },
    { id: 2, label: 'Konfirmasi & Aktivasi' },
  ]

  return (
    <main
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2.5rem 1.5rem',
        color: 'var(--text)',
      }}
    >
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Tambah Unit Bisnis Baru
      </h1>
      <p
        style={{
          color: 'var(--subtext)',
          fontSize: '0.9rem',
          marginBottom: '2rem',
        }}
      >
        Ikuti langkah-langkah di bawah ini untuk mendefinisikan tipe unit bisnis dan cabang.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px minmax(0, 1fr)',
          gap: '2rem',
          alignItems: 'flex-start',
        }}
      >
        {/* Step indicator */}
        <div
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: '9999px',
            padding: '1.25rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            border: '1px solid var(--border)',
          }}
        >
          {steps.map((s) => {
            const isActive = s.id === step
            const isDone = s.id < step
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '9999px',
                    border: isActive ? 'none' : '1px solid var(--border)',
                    backgroundColor: isActive ? 'var(--accent)' : 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    color: isActive ? 'var(--bg)' : isDone ? '#22c55e' : 'var(--subtext)',
                  }}
                >
                  {isDone ? '✓' : s.id}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: 'var(--text)',
                  }}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 18,
              border: '1px solid var(--border)',
              padding: '1.75rem 1.75rem 1.5rem',
              maxWidth: 720,
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
                Informasi Dasar
              </h2>
              <p style={{ color: 'var(--subtext)', fontSize: 12 }}>
                Masukkan nama cabang/bisnis, tipe unit bisnis, dan kategori service untuk unit ini.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: 'var(--text)',
                  }}
                >
                  Nama Cabang / Bisnis
                </label>
                <input
                  placeholder="Contoh: Laundry Buah Batu"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg)',
                    borderRadius: 9999,
                    border: '1px solid var(--border)',
                    padding: '0.7rem 1rem',
                    fontSize: 13,
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
                    marginBottom: 6,
                    color: 'var(--text)',
                  }}
                >
                  Tipe Unit Bisnis
                </label>
                <select
                  value={branchType}
                  onChange={(e) => setBranchType(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg)',
                    borderRadius: 9999,
                    border: '1px solid var(--border)',
                    padding: '0.7rem 1rem',
                    fontSize: 13,
                    color: 'var(--text)',
                    outline: 'none',
                    appearance: 'none',
                  }}
                >
                  <option value="">Pilih tipe…</option>
                  {BRANCH_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.25rem',
                }}
              >
                {/* Income categories */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 6,
                      color: 'var(--text)',
                    }}
                  >
                    Kategori Pendapatan
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <input
                      placeholder="Contoh: Cuci Kering"
                      value={incomeInput}
                      onChange={(e) => setIncomeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddIncomeCategory()
                        }
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--bg)',
                        borderRadius: 9999,
                        border: '1px solid var(--border)',
                        padding: '0.5rem 0.9rem',
                        fontSize: 12,
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddIncomeCategory}
                      style={{
                        backgroundColor: 'var(--accent)',
                        borderRadius: 9999,
                        border: 'none',
                        color: 'var(--bg)',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '0.45rem 0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      Tambah
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    {incomeCategories.map((cat) => (
                      <span
                        key={cat}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '0.3rem 0.7rem',
                          borderRadius: 9999,
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          color: '#4ade80',
                          fontSize: 11,
                        }}
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleRemoveIncome(cat)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#6ee7b7',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {incomeCategories.length === 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--subtext)',
                        }}
                      >
                        Belum ada kategori pendapatan.
                      </span>
                    )}
                  </div>
                </div>

                {/* Expense categories */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 6,
                      color: 'var(--text)',
                    }}
                  >
                    Kategori Pengeluaran
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <input
                      placeholder="Contoh: Beli Sabun"
                      value={expenseInput}
                      onChange={(e) => setExpenseInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddExpenseCategory()
                        }
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--bg)',
                        borderRadius: 9999,
                        border: '1px solid var(--border)',
                        padding: '0.5rem 0.9rem',
                        fontSize: 12,
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddExpenseCategory}
                      style={{
                        backgroundColor: 'var(--accent)',
                        borderRadius: 9999,
                        border: 'none',
                        color: 'var(--bg)',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '0.45rem 0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      Tambah
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    {expenseCategories.map((cat) => (
                      <span
                        key={cat}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '0.3rem 0.7rem',
                          borderRadius: 9999,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#fca5a5',
                          fontSize: 11,
                        }}
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleRemoveExpense(cat)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#fecaca',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {expenseCategories.length === 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--subtext)',
                        }}
                      >
                        Belum ada kategori pengeluaran.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => window.history.back()}
                style={{
                  backgroundColor: 'transparent',
                  borderRadius: 9999,
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                  padding: '0.55rem 1.3rem',
                  cursor: 'pointer',
                }}
              >
                ‹ Kembali
              </button>

              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setStep(2)}
                style={{
                  backgroundColor: canGoNext ? 'var(--accent)' : '#4b5563',
                  borderRadius: 9999,
                  border: 'none',
                  color: canGoNext ? 'var(--bg)' : '#e5e7eb',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '0.6rem 1.6rem',
                  cursor: canGoNext ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Lanjutkan
                <span>›</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 18,
              border: '1px solid var(--border)',
              padding: '1.75rem 1.75rem 1.5rem',
              maxWidth: 640,
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
                Konfirmasi & Aktivasi
              </h2>
              <p style={{ color: 'var(--subtext)', fontSize: 12 }}>
                Tinjau kembali detail unit bisnis sebelum diaktivasi.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--bg)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  padding: '1rem 1.25rem',
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: 'var(--text)',
                  }}
                >
                  Ringkasan Unit Bisnis
                </h3>
                <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 4 }}>
                  Nama cabang / bisnis:
                  <span style={{ color: 'var(--text)', marginLeft: 4 }}>
                    {branchName || '-'}
                  </span>
                </p>
                <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 4 }}>
                  Tipe unit bisnis:
                  <span style={{ color: 'var(--text)', marginLeft: 4 }}>
                    {branchTypeLabel(branchType) || '-'}
                  </span>
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: '#16a34a',
                    }}
                  >
                    Kategori Pendapatan
                  </h4>
                  {incomeCategories.length === 0 ? (
                    <p style={{ fontSize: 11, color: 'var(--subtext)' }}>
                      Belum ada kategori pendapatan.
                    </p>
                  ) : (
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      {incomeCategories.map((cat) => (
                        <li
                          key={cat}
                          style={{
                            fontSize: 11,
                            color: 'var(--text)',
                          }}
                        >
                          • {cat}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: '#dc2626',
                    }}
                  >
                    Kategori Pengeluaran
                  </h4>
                  {expenseCategories.length === 0 ? (
                    <p style={{ fontSize: 11, color: 'var(--subtext)' }}>
                      Belum ada kategori pengeluaran.
                    </p>
                  ) : (
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      {expenseCategories.map((cat) => (
                        <li
                          key={cat}
                          style={{
                            fontSize: 11,
                            color: 'var(--text)',
                          }}
                        >
                          • {cat}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  backgroundColor: 'transparent',
                  borderRadius: 9999,
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                  padding: '0.55rem 1.3rem',
                  cursor: 'pointer',
                }}
              >
                ‹ Kembali ke bagian sebelumnya
              </button>

              <button
                type="button"
                onClick={handleActivate}
                disabled={!canGoNext || loading}
                style={{
                  backgroundColor:
                    !canGoNext || loading ? '#4b5563' : 'var(--accent)',
                  borderRadius: 9999,
                  border: 'none',
                  color: !canGoNext || loading ? '#e5e7eb' : 'var(--bg)',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '0.6rem 1.8rem',
                  cursor: !canGoNext || loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {loading ? 'Menyimpan...' : 'Aktivasi Unit Bisnis'}
                {!loading && <span>✓</span>}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default AddBusinessPage
