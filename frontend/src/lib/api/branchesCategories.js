// src/lib/api/branchesCategories.js
import api from '../axios'

// ------- BRANCHES -------

// Ambil branches dan dedup by name (case-insensitive)
export async function fetchBranches() {
  const res = await api.get('/branches/')
  const data = Array.isArray(res.data) ? res.data : res.data.results || []

  const seen = new Set()
  const unique = []
  data.forEach((b) => {
    const key = (b.name || '').trim().toLowerCase()
    if (!key) return
    if (seen.has(key)) return
    seen.add(key)
    unique.push(b)
  })

  return unique
}

export async function createBranch(payload) {
  const res = await api.post('/branches/', payload)
  return res.data
}

export async function updateBranch(id, payload) {
  const res = await api.patch(`/branches/${id}/`, payload)
  return res.data
}

export async function deleteBranch(id) {
  const res = await api.delete(`/branches/${id}/`)
  return res.data
}

// ------- CATEGORIES -------

// NOTE: backend CategorySerializer hanya kirim {id, name, transaction_type}
export async function fetchCategories() {
  const res = await api.get('/categories/')
  const data = Array.isArray(res.data) ? res.data : res.data.results || []
  return data
}

export async function createCategory(payload) {
  // payload: { name, transaction_type }
  const res = await api.post('/categories/', payload)
  return res.data
}

export async function updateCategory(id, payload) {
  // payload: { name?, transaction_type? }
  const res = await api.patch(`/categories/${id}/`, payload)
  return res.data
}

export async function deleteCategory(id) {
  const res = await api.delete(`/categories/${id}/`)
  return res.data
}
