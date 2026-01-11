// src/lib/api/branchesCategories.js
import api from '../axios'

// ------- BRANCHES -------

export async function fetchBranches() {
  const res = await api.get('/branches/')
  return res.data
}

export async function createBranch(payload) {
  const res = await api.post('/branches/', payload)
  return res.data
}

export async function updateBranch(id, payload) {
  const res = await api.patch(`/branches/${id}/`, payload)
  return res.data
}

// ------- CATEGORIES -------

export async function fetchCategories() {
  const res = await api.get('/categories/')
  return res.data
}

export async function createCategory(payload) {
  const res = await api.post('/categories/', payload)
  return res.data
}
