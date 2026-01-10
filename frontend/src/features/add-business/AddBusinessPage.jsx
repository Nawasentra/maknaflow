import React, { useState } from 'react'

function AddBusinessPage({ businessConfigs, setBusinessConfigs }) {
  const [step, setStep] = useState(1)
  const [branchName, setBranchName] = useState('')
  const [unitType, setUnitType] = useState('')
  const [newUnitType, setNewUnitType] = useState('')
  const [incomeCategories, setIncomeCategories] = useState([])
  const [expenseCategories, setExpenseCategories] = useState([])
  const [incomeInput, setIncomeInput] = useState('')
  const [expenseInput, setExpenseInput] = useState('')

  const effectiveUnitType =
    unitType === 'Custom' && newUnitType.trim() ? newUnitType.trim() : unitType

  const steps = [
    { id: 1, label: 'Informasi Dasar' },
    { id: 2, label: 'Konfirmasi & Aktivasi' },
  ]

  React.useEffect(() => {
    if (!unitType || unitType === 'Custom') {
      setIncomeCategories([])
      setExpenseCategories([])
      return
    }
    const cfg = businessConfigs.find((b) => b.unitBusiness === unitType)
    if (!cfg) {
      setIncomeCategories([])
      setExpenseCategories([])
      return
    }
    setIncomeCategories(cfg.defaultIncomeCategories || [])
    setExpenseCategories(cfg.defaultExpenseCategories || [])
  }, [unitType, businessConfigs]) // eslint-disable-line react-hooks/exhaustive-deps

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
    effectiveUnitType &&
    (incomeCategories.length > 0 || expenseCategories.length > 0)

  const handleActivate = () => {
    if (!canGoNext) return

    const existingIndex = businessConfigs.findIndex(
      (b) => b.unitBusiness === effectiveUnitType,
    )

    if (existingIndex >= 0) {
      const existing = businessConfigs[existingIndex]
      const newBranch = {
        id: branchName.trim(),
        name: branchName.trim(),
        incomeCategories: incomeCategories.length ? incomeCategories : null,
        expenseCategories: expenseCategories.length ? expenseCategories : null,
        active: true,
      }
      const updated = [...businessConfigs]
      updated[existingIndex] = {
        ...existing,
        branches: [...existing.branches, newBranch],
      }
      setBusinessConfigs(updated)
    } else {
      const newConfig = {
        id: effectiveUnitType,
        unitBusiness: effectiveUnitType,
        defaultIncomeCategories: incomeCategories,
        defaultExpenseCategories: expenseCategories,
        branches: [
          {
            id: branchName.trim(),
            name: branchName.trim(),
            incomeCategories: null,
            expenseCategories: null,
            active: true,
          },
        ],
        active: true,
      }
      setBusinessConfigs([...businessConfigs, newConfig])
    }

    setStep(1)
    setBranchName('')
    setUnitType('')
    setNewUnitType('')
    setIncomeCategories([])
    setExpenseCategories([])
  }

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
        {/* Step list */}
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
                    color: isActive ? '#ffffff' : isDone ? '#22c55e' : 'var(--subtext)',
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
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value)}
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
                  {businessConfigs.map((b) => (
                    <option key={b.id} value={b.unitBusiness}>
                      {b.unitBusiness}
                    </option>
                  ))}
                  <option value="Custom">Tambah tipe baru…</option>
                </select>
                {unitType === 'Custom' && (
                  <input
                    placeholder="Contoh: Barbershop"
                    value={newUnitType}
                    onChange={(e) => setNewUnitType(e.target.value)}
                    style={{
                      marginTop: 8,
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
                )}
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
                        color: '#ffffff',
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
                        color: '#ffffff',
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
                  color: canGoNext ? '#ffffff' : '#e5e7eb',
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
                    {effectiveUnitType || '-'}
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
                disabled={!canGoNext}
                style={{
                  backgroundColor: canGoNext ? 'var(--accent)' : '#4b5563',
                  borderRadius: 9999,
                  border: 'none',
                  color: canGoNext ? '#ffffff' : '#e5e7eb',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '0.6rem 1.8rem',
                  cursor: canGoNext ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                Aktivasi Unit Bisnis
                <span>✓</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default AddBusinessPage
