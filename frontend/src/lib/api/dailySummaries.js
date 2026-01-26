// src/lib/api/dailySummaries.js
import api from '../axios'

export async function fetchDailySummaries(params = {}) {
  const response = await api.get('/daily-summaries/', { params })
  return response.data
}

export async function fetchPaymentBreakdown(params = {}) {
  const response = await api.get(
    '/daily-summaries/payment_breakdown/',
    { params },
  )
  return response.data
}
