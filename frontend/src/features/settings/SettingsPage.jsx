// src/features/settings/SettingsPage.jsx
import React, { useState, useEffect, useMemo } from 'react'
import {
  updateBranch,
  deleteBranch,
  fetchCategories as fetchCategoriesApi,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../lib/api/branchesCategories'

// Sumber enum sama seperti di backend:
// LAUNDRY = 'LAUNDRY', 'Laundry Service'
// CARWASH = 'CARWASH', 'Car Wash'
// KOS     = 'KOS', 'Kos'
// OTHER   = 'OTHER', 'Other Business'
const BRANCH_TYPES = [
  { value: 'LAUNDRY', label: 'Laundry' },
  { value: 'CARWASH', label: 'Carwash' },
  { value: 'KOS', label: 'Kos' },
  { value: 'OTHER', label: 'Other' },
]

const branchTypeLabelByType = (type) => {
  const found = BRANCH_TYPES.find((t) => t.value === type)
  return found?.label || type || ''
}

const branchTypeLabelById = (id, businessConfigs) => {
  const unit = businessConfigs.find((u) => u.id === id)
  if (!unit) return ''
  return branchTypeLabelByType(unit.type)
}

// Chip kategori biru gelap
const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '0.35rem 0.8rem',
  borderRadius: 9999,
  backgroundColor: '#2563eb',
  color: '#f9fafb',
  border: '1px solid #1d4ed8',
  fontSize: 11,
}

function SettingsPage({
  businessConfigs,
  setBusinessConfigs,
  appSettings,
  setAppSettings,
  showToast,
}) {
  // ---------- KATEGORI GLOBAL (backend, TANPA UI) ----------
  // Tetap fetch supaya kategori per cabang bisa pakai sumber ini
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)

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

  // ---------- FLATTEN CABANG + TYPE ----------
  const allBranchesFlat = useMemo(() => {
    const result = []
    ;(businessConfigs || []).forEach((unit) => {
      ;(unit.branches || []).forEach((br) => {
        result.push({
          unitId: unit.id,
          unitType: unit.type, // LAUNDRY | CARWASH | KOS | OTHER
          unitLabel: branchTypeLabelByType(unit.type),
          id: br.id,
          name: br.name,
          active: br.active,
          incomeCategories: br.incomeCategories || [],
          expenseCategories: br.expenseCategories || [],
        })
      })
    })
    return result
  }, [businessConfigs])

  const unitTypeOptions = useMemo(
    () =>
      Array.from(
        new Set((businessConfigs || []).map((u) => u.type).filter(Boolean)),
      ),
    [businessConfigs],
  )

  // ---------- KATEGORI PER CABANG ----------
  const [branchUnitFilterForCategory, setBranchUnitFilterForCategory] =
    useState('ALL') // ALL atau enum
  const [selectedBranchForCategory, setSelectedBranchForCategory] =
    useState('')
  const [branchCategoryTab, setBranchCategoryTab] = useState('INCOME') // INCOME | EXPENSE
  const [branchCategorySearch, setBranchCategorySearch] = useState('')
  const [branchNewCategoryName, setBranchNewCategoryName] = useState('')

  // Filter cabang berdasarkan tipe unit
  const branchesForCategoryCard = useMemo(() => {
    if (branchUnitFilterForCategory === 'ALL') return allBranchesFlat
    return allBranchesFlat.filter(
      (b) => b.unitType === branchUnitFilterForCategory,
    )
  }, [allBranchesFlat, branchUnitFilterForCategory])

  // Auto pilih cabang pertama kalau filter berubah
  useEffect(() => {
    if (!branchesForCategoryCard.length) {
      setSelectedBranchForCategory('')
      return
    }
    if (
      !selectedBranchForCategory ||
      !branchesForCategoryCard.find(
        (b) => String(b.id) === String(selectedBranchForCategory),
      )
    ) {
      setSelectedBranchForCategory(String(branchesForCategoryCard[0].id))
    }
  }, [branchesForCategoryCard, selectedBranchForCategory])

  const selectedBranchForCategoryObj = useMemo(
    () =>
      branchesForCategoryCard.find(
        (b) => String(b.id) === String(selectedBranchForCategory),
      ) || null,
    [branchesForCategoryCard, selectedBranchForCategory],
  )

  const assignedCategoryIdsForBranch = useMemo(() => {
    if (!selectedBranchForCategoryObj) return []
    const key =
      branchCategoryTab === 'INCOME'
        ? 'incomeCategories'
        : 'expenseCategories'
    const ids = selectedBranchForCategoryObj[key]
    return Array.isArray(ids) ? ids : []
  }, [selectedBranchForCategoryObj, branchCategoryTab])

  // Filter kategori global sesuai:
  // - tipe transaksi (INCOME/EXPENSE)
  // - cari
  const filteredGlobalByTxType = useMemo(() => {
    const list = categories.filter(
      (c) => c.transaction_type === branchCategoryTab,
    )
    if (!branchCategorySearch) return list
    const q = branchCategorySearch.toLowerCase()
    return list.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, branchCategoryTab, branchCategorySearch])

  // Kategori yang sudah aktif di cabang
  const branchAssignedCategories = useMemo(
    () =>
      filteredGlobalByTxType.filter((c) =>
        assignedCategoryIdsForBranch.includes(c.id),
      ),
    [filteredGlobalByTxType, assignedCategoryIdsForBranch],
  )

  // Kategori global lain (belum aktif di cabang) – sumber pilihan
  const branchAvailableCategories = useMemo(
    () =>
      filteredGlobalByTxType.filter(
        (c) => !assignedCategoryIdsForBranch.includes(c.id),
      ),
    [filteredGlobalByTxType, assignedCategoryIdsForBranch],
  )

  const updateBranchCategoryIds = (branchId, txType, updater) => {
    setBusinessConfigs((prev) => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map((unit) => {
        const branches = Array.isArray(unit.branches) ? unit.branches : []
        const updatedBranches = branches.map((br) => {
          if (String(br.id) !== String(branchId)) return br
          const key =
            txType === 'INCOME' ? 'incomeCategories' : 'expenseCategories'
          const currentIds = Array.isArray(br[key]) ? br[key] : []
          const newIds = updater(currentIds)
          return { ...br, [key]: newIds }
        })
        return { ...unit, branches: updatedBranches }
      })
    })
  }

  const handleBranchAttachCategory = (categoryId) => {
    if (!selectedBranchForCategoryObj) return
    const txType = branchCategoryTab
    updateBranchCategoryIds(selectedBranchForCategoryObj.id, txType, (prev) => {
      const set = new Set(prev)
      set.add(categoryId)
      return Array.from(set)
    })
    showToast?.('Kategori diaktifkan untuk cabang ini.', 'success')
  }

  const handleBranchDetachCategory = (categoryId) => {
    if (!selectedBranchForCategoryObj) return
    const txType = branchCategoryTab
    updateBranchCategoryIds(selectedBranchForCategoryObj.id, txType, (prev) =>
      prev.filter((id) => id !== categoryId),
    )
    showToast?.(
      'Kategori dihapus dari cabang, kategori global tetap ada.',
      'success',
    )
  }

  const handleBranchAddNewCategory = async () => {
    if (!selectedBranchForCategoryObj) {
      showToast?.('Pilih cabang dulu.', 'error')
      return
    }
    const trimmed = branchNewCategoryName.trim()
    if (!trimmed) return
    const txType = branchCategoryTab

    // cek duplikat nama di kategori global
    const existing = categories.find(
      (c) =>
        c.transaction_type === txType &&
        c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )

    try {
      let target = existing
      if (!target) {
        const created = await createCategory({
          name: trimmed,
          transaction_type: txType,
        })
        setCategories((prev) => [...prev, created])
        target = created
      }

      updateBranchCategoryIds(selectedBranchForCategoryObj.id, txType, (prev) => {
        const set = new Set(prev)
        set.add(target.id)
        return Array.from(set)
      })
      setBranchNewCategoryName('')
      showToast?.(
        'Kategori ditambahkan dan diaktifkan untuk cabang ini.',
        'success',
      )
    } catch (e) {
      console.error(e)
      showToast?.('Gagal menambah kategori untuk cabang.', 'error')
    }
  }

  // ---------- CABANG (card "Cabang") ----------
  const [branchUnitFilterForCabang, setBranchUnitFilterForCabang] =
    useState('ALL')
  const [selectedTypeId, setSelectedTypeId] = useState(
    businessConfigs.length ? businessConfigs[0].id : '',
  )

  const unitsForCabangCard = useMemo(() => {
    if (branchUnitFilterForCabang === 'ALL') return businessConfigs
    return (businessConfigs || []).filter(
      (u) => u.type === branchUnitFilterForCabang,
    )
  }, [businessConfigs, branchUnitFilterForCabang])

  useEffect(() => {
    if (!unitsForCabangCard.length) {
      setSelectedTypeId('')
      return
    }
    if (!unitsForCabangCard.find((u) => u.id === selectedTypeId)) {
      setSelectedTypeId(unitsForCabangCard[0].id)
    }
  }, [unitsForCabangCard, selectedTypeId])

  const selectedUnit =
    unitsForCabangCard.find((b) => b.id === selectedTypeId) || null

  const [selectedBranchId, setSelectedBranchId] = useState(
    selectedUnit && selectedUnit.branches.length ? selectedUnit.branches[0].id : null,
  )

  useEffect(() => {
    if (!selectedUnit) {
      setSelectedBranchId(null)
      return
    }
    if (!selectedUnit.branches.length) {
      setSelectedBranchId(null)
      return
    }
    if (!selectedUnit.branches.find((b) => b.id === selectedBranchId)) {
      setSelectedBranchId(selectedUnit.branches[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnit?.id])

  const selectedBranch =
    selectedUnit?.branches.find((b) => b.id === selectedBranchId) || null

  const [confirmModal, setConfirmModal] = useState(null) // {type, branch}

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

  const requestToggleBranchActive = () => {
    if (!selectedBranch) return
    setConfirmModal({ type: 'toggle', branch: selectedBranch })
  }

  const performToggleBranchActive = () => {
    if (!selectedBranch) return
    const nowActive = !selectedBranch.active
    setBusinessConfigs((prev) =>
      prev.map((u) =>
        u.id === selectedUnit.id
          ? {
              ...u,
              branches: u.branches.map((br) =>
                br.id === selectedBranch.id ? { ...br, active: nowActive } : br,
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

  const requestDeleteBranch = () => {
    if (!selectedBranch) return
    setConfirmModal({ type: 'delete', branch: selectedBranch })
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
                branches: u.branches.filter((br) => br.id !== selectedBranch.id),
              }
            : u,
        ),
      )
      showToast?.(`Cabang ${selectedBranch.name} berhasil dihapus.`)
      if (selectedUnit.branches.length) {
        setSelectedBranchId(selectedUnit.branches[0].id)
      } else {
        setSelectedBranchId(null)
      }
    } catch (e) {
      console.error(e)
      showToast?.(
        'Gagal menghapus cabang. Pastikan tidak ada transaksi terkait atau cek server.',
        'error',
      )
    }
  }

  // ---------- DEFAULT KATEGORI PER TIPE (pakai satu dropdown sumber unit) ----------
  const [editSelectedId, setEditSelectedId] = useState(
    businessConfigs.length ? businessConfigs[0].id : '',
  )
  const editSelected =
    businessConfigs.find((b) => b.id === editSelectedId) || null

  const [incomeInput, setIncomeInput] = useState('')
  const [expenseInput, setExpenseInput] = useState('')

  const handleAddIncome = () => {
    if (!editSelected) return
    const trimmed = incomeInput.trim()
    if (!trimmed) return
    if (!editSelected.defaultIncomeCategories?.includes(trimmed)) {
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
    if (!editSelected.defaultExpenseCategories?.includes(trimmed)) {
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

  // ---------- CONFIRM MODAL CABANG ----------
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
      ? `Yakin ingin menghapus cabang ${branch.name}? Tindakan ini tidak bisa dibatalkan.`
      : branch.active === false
      ? `Aktifkan kembali cabang ${branch.name}?`
      : `Nonaktifkan cabang ${branch.name}?`

    const onConfirm = async () => {
      if (isDelete) await performDeleteBranch()
      else performToggleBranchActive()
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

  // ---------- RENDER ----------
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
          fontWeight: 700,
          marginBottom: '2rem',
        }}
      >
        Settings
      </h1>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Kategori per Cabang */}
        <div
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            Kategori per Cabang
          </h2>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: '1rem',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ minWidth: 220 }}>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--subtext)',
                  marginBottom: 6,
                }}
              >
                Tipe Unit Bisnis
              </p>
              <select
                value={branchUnitFilterForCategory}
                onChange={(e) => setBranchUnitFilterForCategory(e.target.value)}
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
                <option value="ALL">Semua Unit</option>
                {unitTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {branchTypeLabelByType(t)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: 220 }}>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--subtext)',
                  marginBottom: 6,
                }}
              >
                Pilih cabang
              </p>
              <select
                value={selectedBranchForCategory}
                onChange={(e) => setSelectedBranchForCategory(e.target.value)}
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
                {branchesForCategoryCard.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--subtext)',
                  marginBottom: 4,
                }}
              >
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
                    onClick={() => setBranchCategoryTab(opt.value)}
                    style={{
                      padding: '0.4rem 0.9rem',
                      borderRadius: 9999,
                      border:
                        branchCategoryTab === opt.value
                          ? '1px solid var(--accent)'
                          : '1px solid var(--border)',
                      backgroundColor:
                        branchCategoryTab === opt.value
                          ? 'var(--accent)'
                          : 'transparent',
                      color:
                        branchCategoryTab === opt.value
                          ? 'var(--bg)'
                          : 'var(--text)',
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

            <div style={{ flex: 1, minWidth: 220 }}>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--subtext)',
                  marginBottom: 4,
                }}
              >
                Cari kategori di cabang ini
              </p>
              <input
                value={branchCategorySearch}
                onChange={(e) => setBranchCategorySearch(e.target.value)}
                placeholder="Cari nama kategori..."
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  padding: '0.6rem 0.9rem',
                  fontSize: 12,
                  color: 'var(--text)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <p
              style={{
                fontSize: 12,
                color: 'var(--subtext)',
                marginBottom: 4,
              }}
            >
              Tambah kategori baru untuk cabang ini (
              {branchCategoryTab === 'INCOME' ? 'Income' : 'Expense'})
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Nama kategori..."
                value={branchNewCategoryName}
                onChange={(e) => setBranchNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleBranchAddNewCategory()
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
                onClick={handleBranchAddNewCategory}
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
                Tambah ke Cabang
              </button>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '0.75rem',
              marginTop: '0.5rem',
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: 'var(--subtext)',
                marginBottom: 4,
              }}
            >
              Kategori aktif di cabang ini
            </p>
            {categoriesLoading ? (
              <span style={{ fontSize: 11, color: 'var(--subtext)' }}>
                Memuat kategori...
              </span>
            ) : branchAssignedCategories.length === 0 ? (
              <span style={{ fontSize: 11, color: 'var(--subtext)' }}>
                Belum ada kategori untuk tipe ini di cabang ini.
              </span>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                {branchAssignedCategories.map((cat) => (
                  <span key={cat.id} style={chipStyle}>
                    {cat.name}
                    <button
                      type="button"
                      onClick={() => handleBranchDetachCategory(cat.id)}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#fee2e2',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <p
              style={{
                fontSize: 12,
                color: 'var(--subtext)',
                marginTop: 6,
                marginBottom: 4,
              }}
            >
              Kategori global lain belum aktif di cabang ini
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              {branchAvailableCategories.slice(0, 20).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleBranchAttachCategory(cat.id)}
                  style={{
                    ...chipStyle,
                    backgroundColor: 'transparent',
                    color: '#2563eb',
                    border: '1px dashed #93c5fd',
                  }}
                >
                  {cat.name}
                </button>
              ))}
              {branchAvailableCategories.length > 20 && (
                <span style={{ fontSize: 11, color: 'var(--subtext)' }}>
                  dan {branchAvailableCategories.length - 20} lainnya...
                </span>
              )}
            </div>
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
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            Cabang
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <p
              style={{
                fontSize: 12,
                color: 'var(--subtext)',
                marginBottom: 6,
              }}
            >
              Tipe Unit Bisnis
            </p>
            <select
              value={branchUnitFilterForCabang}
              onChange={(e) => setBranchUnitFilterForCabang(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg)',
                borderRadius: 12,
                border: '1px solid var(--border)',
                padding: '0.7rem 1rem',
                fontSize: 13,
                color: 'var(--text)',
                outline: 'none',
                marginBottom: 8,
              }}
            >
              <option value="ALL">Semua Unit</option>
              {unitTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {branchTypeLabelByType(t)}
                </option>
              ))}
            </select>
          </div>

          {selectedUnit ? (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--subtext)',
                    marginBottom: 6,
                  }}
                >
                  Pilih cabang dari tipe ini
                </p>
                <select
                  value={selectedBranchId ?? ''}
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
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--subtext)',
                        marginBottom: 6,
                      }}
                    >
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

                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
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
            <p
              style={{
                fontSize: 12,
                color: 'var(--subtext)',
              }}
            >
              Belum ada tipe unit bisnis yang dikonfigurasi.
            </p>
          )}
        </div>

        {/* Default Kategori per Tipe (pakai sumber bisnisConfigs langsung) */}
        <div
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
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
                  {branchTypeLabelById(b.id, businessConfigs)}
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
                    placeholder="Tambah kategori pendapatan"
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
                        ✕
                      </button>
                    </span>
                  ))}
                  {!editSelected.defaultIncomeCategories?.length && (
                    <span style={{ fontSize: 11, color: 'var(--subtext)' }}>
                      Belum ada kategori pendapatan default.
                    </span>
                  )}
                </div>
              </div>

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
                    placeholder="Tambah kategori pengeluaran"
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
                        ✕
                      </button>
                    </span>
                  ))}
                  {!editSelected.defaultExpenseCategories?.length && (
                    <span style={{ fontSize: 11, color: 'var(--subtext)' }}>
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
