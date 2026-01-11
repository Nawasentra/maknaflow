// src/features/settings/SettingsPage.jsx
import React, { useState, useEffect } from 'react'
import { updateBranch } from '../../lib/api/branchesCategories'

const BRANCH_TYPES = [
  { value: 'LAUNDRY', label: 'Laundry' },
  { value: 'CARWASH', label: 'Car Wash' },
  { value: 'KOS', label: 'Kos' },
  { value: 'OTHER', label: 'Other Business' },
]

const branchTypeLabel = (value) =>
  BRANCH_TYPES.find((t) => t.value === value)?.label || value

function SettingsPage({
  businessConfigs,
  setBusinessConfigs,
  appSettings,
  setAppSettings,
  showToast,
}) {
  // selected unit = group by branch_type (id is the enum)
  const [selectedTypeId, setSelectedTypeId] = useState(
    businessConfigs.length ? businessConfigs[0].id : '',
  )
  const selectedUnit =
    businessConfigs.find((b) => b.id === selectedTypeId) || null

  const [selectedBranchId, setSelectedBranchId] = useState(
    selectedUnit && selectedUnit.branches.length ? selectedUnit.branches[0].id : '',
  )

  useEffect(() => {
    if (!selectedUnit) {
      setSelectedBranchId('')
      return
    }
    if (!selectedUnit.branches.length) {
      setSelectedBranchId('')
      return
    }
    if (!selectedUnit.branches.find((b) => b.id === selectedBranchId)) {
      setSelectedBranchId(selectedUnit.branches[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypeId, businessConfigs])

  const selectedBranch =
    selectedUnit && selectedUnit.branches.find((b) => b.id === selectedBranchId)

  // Rename branch -> PATCH /branches/{id}/
  const handleRenameBranch = async (newName) => {
    if (!selectedBranch) return
    const trimmed = newName.trim()
    if (!trimmed) return
    try {
      await updateBranch(selectedBranch.id, { name: trimmed })
      setBusinessConfigs((prev) =>
        prev.map((u) =>
          u.id === selectedUnit.id
            ? {
                ...u,
                branches: u.branches.map((br) =>
                  br.id === selectedBranch.id ? { ...br, name: trimmed } : br,
                ),
              }
            : u,
        ),
      )
      showToast?.('Nama cabang berhasil diubah.')
    } catch (e) {
      console.error(e)
      showToast?.('Gagal mengubah nama cabang.', 'error')
    }
  }

  // Simple UI-only toggle (backend has no active flag)
  const handleToggleBranchActive = () => {
    if (!selectedBranch) return
    const nowActive = selectedBranch.active === false ? true : false
    setBusinessConfigs((prev) =>
      prev.map((u) =>
        u.id === selectedUnit.id
          ? {
              ...u,
              branches: u.branches.map((br) =>
                br.id === selectedBranch.id
                  ? { ...br, active: nowActive }
                  : br,
              ),
            }
          : u,
      ),
    )
    showToast?.(
      nowActive
        ? `Berhasil mengaktifkan cabang ${selectedBranch.name}.`
        : `Berhasil menonaktifkan cabang ${selectedBranch.name}.`,
    )
  }

  // Default categories (kept only in UI for now)
  const [editSelectedId, setEditSelectedId] = useState(
    businessConfigs.length ? businessConfigs[0].id : '',
  )
  const editSelected = businessConfigs.find((b) => b.id === editSelectedId)
  const [incomeInput, setIncomeInput] = useState('')
  const [expenseInput, setExpenseInput] = useState('')

  const handleAddIncome = () => {
    if (!editSelected) return
    const trimmed = incomeInput.trim()
    if (!trimmed) return
    if (!(editSelected.defaultIncomeCategories || []).includes(trimmed)) {
      const updated = businessConfigs.map((b) =>
        b.id === editSelected.id
          ? {
              ...b,
              defaultIncomeCategories: [
                ...(b.defaultIncomeCategories || []),
                trimmed,
              ],
            }
          : b,
      )
      setBusinessConfigs(updated)
      showToast?.('Berhasil menambah kategori pendapatan default.')
    }
    setIncomeInput('')
  }

  const handleAddExpense = () => {
    if (!editSelected) return
    const trimmed = expenseInput.trim()
    if (!trimmed) return
    if (!(editSelected.defaultExpenseCategories || []).includes(trimmed)) {
      const updated = businessConfigs.map((b) =>
        b.id === editSelected.id
          ? {
              ...b,
              defaultExpenseCategories: [
                ...(b.defaultExpenseCategories || []),
                trimmed,
              ],
            }
          : b,
      )
      setBusinessConfigs(updated)
      showToast?.('Berhasil menambah kategori pengeluaran default.')
    }
    setExpenseInput('')
  }

  const handleRemoveIncome = (cat) => {
    if (!editSelected) return
    const updated = businessConfigs.map((b) =>
      b.id === editSelected.id
        ? {
            ...b,
            defaultIncomeCategories: (b.defaultIncomeCategories || []).filter(
              (c) => c !== cat,
            ),
          }
        : b,
    )
    setBusinessConfigs(updated)
  }

  const handleRemoveExpense = (cat) => {
    if (!editSelected) return
    const updated = businessConfigs.map((b) =>
      b.id === editSelected.id
        ? {
            ...b,
            defaultExpenseCategories: (b.defaultExpenseCategories || []).filter(
              (c) => c !== cat,
            ),
          }
        : b,
    )
    setBusinessConfigs(updated)
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
      <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '2rem' }}>
        ⚙️ Settings
      </h1>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Struktur Bisnis (per branch_type) */}
        <div
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Struktur Bisnis
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 6 }}>
              Tipe Unit Bisnis (branch_type)
            </p>
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg)',
                borderRadius: 12,
                border: '1px solid var(--border)',
                padding: '0.7rem 1rem',
                fontSize: 13,
                color: 'var(--text)',
                outline: 'none',
              }}
            >
              {businessConfigs.map((b) => (
                <option key={b.id} value={b.id}>
                  {branchTypeLabel(b.id)}
                </option>
              ))}
            </select>
          </div>

          {selectedUnit && (
            <p style={{ fontSize: 12, color: 'var(--subtext)' }}>
              Tipe ini mewakili semua cabang dengan branch_type{' '}
              <strong>{selectedUnit.id}</strong>.
            </p>
          )}
        </div>

        {/* Cabang */}
        <div
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Cabang
          </h2>
          {selectedUnit ? (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 6 }}>
                  Pilih cabang dari tipe ini
                </p>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    padding: '0.7rem 1rem',
                    fontSize: 13,
                    color: 'var(--text)',
                    outline: 'none',
                  }}
                >
                  {selectedUnit.branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBranch && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 6 }}>
                      Ganti nama cabang
                    </p>
                    <input
                      value={selectedBranch.name}
                      onChange={(e) => handleRenameBranch(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--bg)',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        padding: '0.7rem 1rem',
                        fontSize: 13,
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBranchActive}
                    style={{
                      backgroundColor:
                        selectedBranch.active === false ? '#6b7280' : '#22c55e',
                      borderRadius: 9999,
                      border: 'none',
                      color: 'var(--bg)',
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '0.45rem 1.1rem',
                      cursor: 'pointer',
                    }}
                  >
                    {selectedBranch.active === false
                      ? 'Aktifkan Cabang (hanya di UI)'
                      : 'Nonaktifkan Cabang (hanya di UI)'}
                  </button>
                </>
              )}
            </>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--subtext)' }}>
              Belum ada tipe unit bisnis yang dikonfigurasi.
            </p>
          )}
        </div>

        {/* Default kategori per tipe (UI only) */}
        <div
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Default Kategori per Tipe (hanya di UI)
          </h2>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 6,
                color: 'var(--text)',
              }}
            >
              Pilih Tipe Unit Bisnis
            </label>
            <select
              value={editSelectedId}
              onChange={(e) => setEditSelectedId(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg)',
                borderRadius: 12,
                border: '1px solid var(--border)',
                padding: '0.7rem 1rem',
                fontSize: 13,
                color: 'var(--text)',
                outline: 'none',
              }}
            >
              {businessConfigs.map((b) => (
                <option key={b.id} value={b.id}>
                  {branchTypeLabel(b.id)}
                </option>
              ))}
            </select>
          </div>

          {editSelected && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem',
                marginTop: '1rem',
              }}
            >
              {/* Income defaults */}
              <div>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: '#16a34a',
                  }}
                >
                  Default Kategori Pendapatan
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <input
                    placeholder="Tambah kategori pendapatan…"
                    value={incomeInput}
                    onChange={(e) => setIncomeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddIncome()
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
                    onClick={handleAddIncome}
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
                  {(editSelected.defaultIncomeCategories || []).map((cat) => (
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
                  {!editSelected.defaultIncomeCategories?.length && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--subtext)',
                      }}
                    >
                      Belum ada kategori pendapatan default.
                    </span>
                  )}
                </div>
              </div>

              {/* Expense defaults */}
              <div>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: '#dc2626',
                  }}
                >
                  Default Kategori Pengeluaran
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <input
                    placeholder="Tambah kategori pengeluaran…"
                    value={expenseInput}
                    onChange={(e) => setExpenseInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddExpense()
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
                    onClick={handleAddExpense}
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
                  {(editSelected.defaultExpenseCategories || []).map((cat) => (
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
                  {!editSelected.defaultExpenseCategories?.length && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--subtext)',
                      }}
                    >
                      Belum ada kategori pengeluaran default.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preferensi Transaksi */}
        <div
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Preferensi Transaksi
          </h2>
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 4 }}>
              Default tipe transaksi
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['Income', 'Expense', 'LastUsed'].map((opt) => (
                <label
                  key={opt}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <input
                    type="radio"
                    checked={appSettings.defaultTransactionType === opt}
                    onChange={() =>
                      setAppSettings((prev) => ({
                        ...prev,
                        defaultTransactionType: opt,
                      }))
                    }
                  />
                  <span>
                    {opt === 'Income'
                      ? 'Income'
                      : opt === 'Expense'
                      ? 'Expense'
                      : 'Gunakan tipe terakhir'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 4 }}>
              Default tanggal transaksi
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['today', 'empty'].map((mode) => (
                <label
                  key={mode}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <input
                    type="radio"
                    checked={appSettings.defaultDateMode === mode}
                    onChange={() =>
                      setAppSettings((prev) => ({
                        ...prev,
                        defaultDateMode: mode,
                      }))
                    }
                  />
                  <span>
                    {mode === 'today'
                      ? 'Otomatis isi hari ini'
                      : 'Biarkan kosong (isi manual)'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default SettingsPage
