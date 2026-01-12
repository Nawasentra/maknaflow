// src/features/settings/SettingsPage.jsx
import React, { useState, useEffect, useMemo } from 'react'
import {
  updateBranch,
  deleteBranch,
  fetchCategories as fetchCategoriesApi,
  createCategory,
  deleteCategory,
} from '../../lib/api/branchesCategories'

// Fixed backend branch types (harus sama dengan BranchType di Django)
const BRANCH_TYPES = [
  { value: 'LAUNDRY', label: 'Laundry' },
  { value: 'CARWASH', label: 'Car Wash' },
  { value: 'KOS', label: 'Kos' },
  { value: 'OTHER', label: 'Other Business' },
]

const shortLabel = (value) => {
  if (value === 'LAUNDRY') return 'Laundry'
  if (value === 'CARWASH') return 'Carwash'
  if (value === 'KOS') return 'Kos'
  if (value === 'OTHER') return 'Other'
  return value
}

// chip kategori
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
  // ---------- KATEGORI GLOBAL ----------
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

  // ---------- FLATTEN CABANG ----------
  const allBranchesFlat = useMemo(() => {
    const result = []
    ;(businessConfigs || []).forEach((unit) => {
      ;(unit.branches || []).forEach((br) => {
        result.push({
          unitId: unit.id,
          unitType: unit.branch_type || unit.type,
          unitLabel: shortLabel(unit.branch_type || unit.type),
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

  // ---------- KATEGORI PER CABANG ----------
  const [branchUnitFilterForCategory, setBranchUnitFilterForCategory] =
    useState('ALL')
  const [selectedBranchForCategory, setSelectedBranchForCategory] =
    useState('')
  const [branchCategoryTab, setBranchCategoryTab] = useState('INCOME')
  const [branchCategorySearch, setBranchCategorySearch] = useState('')
  const [branchNewCategoryName, setBranchNewCategoryName] = useState('')
  const [confirmCategory, setConfirmCategory] = useState(null)

  const branchesForCategoryCard = useMemo(() => {
    if (branchUnitFilterForCategory === 'ALL') return allBranchesFlat
    return allBranchesFlat.filter(
      (b) => b.unitType === branchUnitFilterForCategory,
    )
  }, [allBranchesFlat, branchUnitFilterForCategory])

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

  const filteredGlobalByTxType = useMemo(() => {
    const list = categories.filter(
      (c) => c.transaction_type === branchCategoryTab,
    )
    if (!branchCategorySearch) return list
    const q = branchCategorySearch.toLowerCase()
    return list.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, branchCategoryTab, branchCategorySearch])

  const branchAssignedCategories = useMemo(
    () =>
      filteredGlobalByTxType.filter((c) =>
        assignedCategoryIdsForBranch.includes(c.id),
      ),
    [filteredGlobalByTxType, assignedCategoryIdsForBranch],
  )

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
    showToast?.('Kategori berhasil diaktifkan untuk cabang ini.', 'success')
  }

  const handleBranchDetachCategory = (categoryId) => {
    if (!selectedBranchForCategoryObj) return
    const txType = branchCategoryTab
    updateBranchCategoryIds(selectedBranchForCategoryObj.id, txType, (prev) =>
      prev.filter((id) => id !== categoryId),
    )
    showToast?.(
      'Kategori dihapus dari cabang ini. Kategori global tetap tersedia.',
      'success',
    )
  }

  const handleBranchAddNewCategory = async () => {
    if (!selectedBranchForCategoryObj) {
      showToast?.('Pilih cabang terlebih dahulu.', 'error')
      return
    }
    const trimmed = branchNewCategoryName.trim()
    if (!trimmed) return
    const txType = branchCategoryTab

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
        'Kategori berhasil ditambahkan dan diaktifkan untuk cabang ini.',
        'success',
      )
    } catch (e) {
      console.error(e)
      showToast?.('Gagal menambah kategori untuk cabang.', 'error')
    }
  }

  const requestDeleteGlobalCategory = (cat) => {
    setConfirmCategory(cat)
  }

  const performDeleteGlobalCategory = async () => {
    if (!confirmCategory) return
    try {
      await deleteCategory(confirmCategory.id)

      setCategories((prev) =>
        (prev || []).filter((c) => c.id !== confirmCategory.id),
      )

      setBusinessConfigs((prev) => {
        const prevArray = Array.isArray(prev) ? prev : []
        return prevArray.map((unit) => ({
          ...unit,
          branches: (unit.branches || []).map((br) => ({
            ...br,
            incomeCategories: (br.incomeCategories || []).filter(
              (id) => id !== confirmCategory.id,
            ),
            expenseCategories: (br.expenseCategories || []).filter(
              (id) => id !== confirmCategory.id,
            ),
          })),
        }))
      })

      showToast?.('Kategori berhasil dihapus secara global.', 'success')
    } catch (e) {
      console.error(e)
      showToast?.('Gagal menghapus kategori.', 'error')
    } finally {
      setConfirmCategory(null)
    }
  }

  const renderCategoryConfirmModal = () => {
    if (!confirmCategory) return null
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
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
            Hapus Kategori
          </h3>
          <p
            style={{
              fontSize: 13,
              color: 'var(--subtext)',
              marginBottom: 16,
            }}
          >
            Kategori “{confirmCategory.name}” akan dihapus secara global dari
            semua cabang. Tindakan ini tidak dapat dibatalkan.
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
              onClick={() => setConfirmCategory(null)}
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
              onClick={performDeleteGlobalCategory}
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
              Hapus
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- CABANG ----------
  const [branchUnitFilterForCabang, setBranchUnitFilterForCabang] =
    useState('ALL')
  const [selectedTypeId, setSelectedTypeId] = useState(
    businessConfigs.length ? businessConfigs[0].id : '',
  )

  const unitsForCabangCard = useMemo(() => {
    if (branchUnitFilterForCabang === 'ALL') return businessConfigs
    return (businessConfigs || []).filter(
      (u) => (u.branch_type || u.type) === branchUnitFilterForCabang,
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
    selectedUnit && selectedUnit.branches.length
      ? selectedUnit.branches[0].id
      : null,
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

  const [confirmModal, setConfirmModal] = useState(null)

  const handleRenameBranch = async (newName) => {
    if (!selectedBranch || !selectedUnit) return
    const trimmed = newName.trim()
    if (!trimmed) return

    const exists = (selectedUnit.branches || []).some(
      (br) =>
        br.id !== selectedBranch.id &&
        (br.name || '').trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      showToast?.(
        'Nama cabang sudah digunakan pada unit bisnis ini. Gunakan nama lain.',
        'error',
      )
      return
    }

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
      // tidak ada toast sukses; rename silent
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
    if (!selectedBranch || !selectedUnit) return
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
        ? `Cabang ${selectedBranch.name} berhasil diaktifkan.`
        : `Cabang ${selectedBranch.name} berhasil dinonaktifkan.`,
    )
  }

  const requestDeleteBranch = () => {
    if (!selectedBranch) return
    setConfirmModal({ type: 'delete', branch: selectedBranch })
  }

  const performDeleteBranchWrapper = async () => {
    if (!selectedBranch || !selectedUnit) return
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
      if (selectedUnit.branches.length) {
        setSelectedBranchId(selectedUnit.branches[0].id)
      } else {
        setSelectedBranchId(null)
      }
    } catch (e) {
      console.error(e)
      showToast?.(
        'Gagal menghapus cabang. Pastikan tidak ada transaksi terkait atau periksa server.',
        'error',
      )
    }
  }

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
      ? `Cabang ${branch.name} akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`
      : branch.active === false
      ? `Aktifkan kembali cabang ${branch.name}?`
      : `Nonaktifkan cabang ${branch.name}?`

    const onConfirm = async () => {
      if (isDelete) await performDeleteBranchWrapper()
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
                {BRANCH_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {shortLabel(t.value)}
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
                <span
                  key={cat.id}
                  style={{
                    ...chipStyle,
                    backgroundColor: 'transparent',
                    color: '#2563eb',
                    border: '1px dashed #93c5fd',
                  }}
                >
                  {cat.name}
                  <button
                    type="button"
                    onClick={() => handleBranchAttachCategory(cat.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#22c55e',
                      cursor: 'pointer',
                      fontSize: 12,
                      marginLeft: 4,
                    }}
                  >
                    + Cabang
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDeleteGlobalCategory(cat)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#fee2e2',
                      cursor: 'pointer',
                      fontSize: 12,
                      marginLeft: 2,
                    }}
                  >
                    ✕
                  </button>
                </span>
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
              {BRANCH_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {shortLabel(t.value)}
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
                          selectedBranch.active === false
                            ? '#6b7280'
                            : '#22c55e',
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
      </div>

      {renderConfirmModal()}
      {renderCategoryConfirmModal()}
    </main>
  )
}

export default SettingsPage
