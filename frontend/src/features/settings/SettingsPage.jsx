// src/features/settings/SettingsPage.jsx
import React, { useState, useEffect } from 'react'
import {
  updateBranch,
  deleteBranch,
  fetchCategories as fetchCategoriesApi,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../lib/api/branchesCategories'

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
  // ========== STATE: CABANG / STRUKTUR BISNIS ==========
  const [selectedTypeId, setSelectedTypeId] = useState(
    businessConfigs.length ? businessConfigs[0].id : '',
  )
  const selectedUnit =
    businessConfigs.find((b) => b.id === selectedTypeId) || null

  const [selectedBranchId, setSelectedBranchId] = useState(
    selectedUnit && selectedUnit.branches.length ? selectedUnit.branches[0].id : '',
  )

  const [confirmModal, setConfirmModal] = useState(null)
  // shape: { type: 'toggle' | 'delete', branch }

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

  // UI-only toggle active flag (with confirm)
  const requestToggleBranchActive = () => {
    if (!selectedBranch) return
    setConfirmModal({
      type: 'toggle',
      branch: selectedBranch,
    })
  }

  const performToggleBranchActive = () => {
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

  // Delete branch (backend + update state)
  const requestDeleteBranch = () => {
    if (!selectedBranch) return
    setConfirmModal({
      type: 'delete',
      branch: selectedBranch,
    })
  }

  const performDeleteBranch = async () => {
    if (!selectedBranch) return
    try {
      await deleteBranch(selectedBranch.id)
      setBusinessConfigs((prev) =>
        prev.map((u) =>
          u.id === selectedUnit.id
            ? {
                ...u,
                branches: u.branches.filter(
                  (br) => br.id !== selectedBranch.id,
                ),
              }
            : u,
        ),
      )
      showToast?.(`Cabang ${selectedBranch.name} berhasil dihapus.`)
      setSelectedBranchId(
        selectedUnit.branches.length
          ? selectedUnit.branches[0].id
          : '',
      )
    } catch (e) {
      console.error(e)
      showToast?.(
        'Gagal menghapus cabang. Pastikan tidak ada transaksi terkait atau cek server.',
        'error',
      )
    }
  }

  // ========== STATE: DEFAULT KATEGORI PER TIPE (UI-ONLY, SAMA) ==========
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

  // ========== STATE: KATEGORI (BACKEND /categories/) ==========
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoryTypeFilter, setCategoryTypeFilter] = useState('INCOME') // 'INCOME' | 'EXPENSE'
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true)
        const data = await fetchCategoriesApi()
        setCategories(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error(e)
        showToast?.('Gagal memuat kategori.', 'error')
      } finally {
        setCategoriesLoading(false)
      }
    }
    loadCategories()
  }, [showToast])

  const filteredCategories = categories.filter(
    (c) => c.transaction_type === categoryTypeFilter,
  )

  const handleAddCategoryBackend = async () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    try {
      const created = await createCategory({
        name: trimmed,
        transaction_type: categoryTypeFilter,
      })
      setCategories((prev) => [...prev, created])
      setNewCategoryName('')
      showToast?.('Kategori berhasil ditambahkan.')
    } catch (e) {
      console.error(e)
      showToast?.('Gagal menambah kategori.', 'error')
    }
  }

  const handleStartEditCategoryBackend = (cat) => {
    setEditingCategoryId(cat.id)
    setEditingCategoryName(cat.name)
  }

  const handleSaveEditCategoryBackend = async () => {
    const trimmed = editingCategoryName.trim()
    if (!trimmed || !editingCategoryId) return
    try {
      const updated = await updateCategory(editingCategoryId, {
        name: trimmed,
      })
      setCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      )
      setEditingCategoryId(null)
      setEditingCategoryName('')
      showToast?.('Kategori berhasil diubah.')
    } catch (e) {
      console.error(e)
      showToast?.('Gagal mengubah kategori.', 'error')
    }
  }

  const handleDeleteCategoryBackend = async (id) => {
    try {
      await deleteCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
      showToast?.('Kategori berhasil dihapus.')
    } catch (e) {
      console.error(e)
      showToast?.('Gagal menghapus kategori. Pastikan tidak dipakai transaksi.', 'error')
    }
  }

  // ========== CONFIRM MODAL CABANG ==========
  const renderConfirmModal = () => {
    if (!confirmModal || !confirmModal.branch) return null
    const { type, branch } = confirmModal
    const isDelete = type === 'delete'
    const title = isDelete
      ? 'Hapus Cabang'
      : branch.active === false
      ? 'Aktifkan Cabang'
      : 'Nonaktifkan Cabang'
    const desc = isDelete
      ? `Yakin ingin menghapus cabang "${branch.name}"? Tindakan ini tidak bisa dibatalkan.`
      : branch.active === false
      ? `Aktifkan kembali cabang "${branch.name}"?`
      : `Nonaktifkan cabang "${branch.name}"?`

    const onConfirm = async () => {
      if (isDelete) {
        await performDeleteBranch()
      } else {
        performToggleBranchActive()
      }
      setConfirmModal(null)
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
            borderRadius: 12,
            padding: '1.5rem',
            width: '90%',
            maxWidth: 400,
            border: '1px solid var(--border)',
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontSize: 13,
              color: 'var(--subtext)',
              marginBottom: 16,
            }}
          >
            {desc}
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setConfirmModal(null)}
              style={{
                backgroundColor: 'transparent',
                borderRadius: 9999,
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                padding: '0.4rem 0.9rem',
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              style={{
                backgroundColor: '#ef4444',
                borderRadius: 9999,
                border: 'none',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                padding: '0.45rem 1rem',
                cursor: 'pointer',
              }}
            >
              {isDelete ? 'Hapus' : branch.active === false ? 'Aktifkan' : 'Nonaktifkan'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ========== RENDER ==========
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
              Tipe Unit Bisnis
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
              {BRANCH_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kategori (CRUD backend) */}
        <div
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Kategori
          </h2>

          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 4 }}>
              Tipe transaksi
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'INCOME', label: 'Income' },
                { value: 'EXPENSE', label: 'Expense' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setCategoryTypeFilter(opt.value)
                    setEditingCategoryId(null)
                    setEditingCategoryName('')
                  }}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: 9999,
                    border:
                      categoryTypeFilter === opt.value
                        ? '1px solid var(--accent)'
                        : '1px solid var(--border)',
                    backgroundColor:
                      categoryTypeFilter === opt.value ? 'var(--accent)' : 'transparent',
                    color:
                      categoryTypeFilter === opt.value ? 'var(--bg)' : 'var(--text)',
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

          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 4 }}>
              Tambah kategori ({categoryTypeFilter === 'INCOME' ? 'Income' : 'Expense'})
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Nama kategori..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCategoryBackend()
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
                onClick={handleAddCategoryBackend}
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
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {categoriesLoading ? (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--subtext)',
                }}
              >
                Memuat kategori...
              </span>
            ) : filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.35rem 0.8rem',
                    borderRadius: 9999,
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    color: '#bfdbfe',
                    fontSize: 11,
                  }}
                >
                  {editingCategoryId === cat.id ? (
                    <>
                      <input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        style={{
                          backgroundColor: 'var(--bg)',
                          borderRadius: 9999,
                          border: '1px solid var(--border)',
                          padding: '0.25rem 0.5rem',
                          fontSize: 11,
                          color: 'var(--text)',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditCategoryBackend}
                        style={{
                          border: 'none',
                          backgroundColor: '#22c55e',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: 11,
                          borderRadius: 9999,
                          padding: '0.2rem 0.6rem',
                        }}
                      >
                        Simpan
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEditCategoryBackend(cat)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#93c5fd',
                          cursor: 'pointer',
                          fontSize: 11,
                        }}
                      >
                        Ubah
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteCategoryBackend(cat.id)}
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
                </div>
              ))
            ) : (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--subtext)',
                }}
              >
                Belum ada kategori untuk tipe ini.
              </span>
            )}
          </div>
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
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={requestToggleBranchActive}
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
                        ? 'Aktifkan Cabang'
                        : 'Nonaktifkan Cabang'}
                    </button>
                    <button
                      type="button"
                      onClick={requestDeleteBranch}
                      style={{
                        backgroundColor: '#ef4444',
                        borderRadius: 9999,
                        border: 'none',
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        padding: '0.45rem 1.1rem',
                        cursor: 'pointer',
                      }}
                    >
                      Hapus Cabang
                    </button>
                  </div>
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
            Default Kategori per Tipe
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
      </div>

      {renderConfirmModal()}
    </main>
  )
}

export default SettingsPage
