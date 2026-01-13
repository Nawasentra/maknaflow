// src/lib/api/dailySummaries.js
import api from '../axios'

export async function fetchDailySummaries(params = {}) {
  // Base URL axios sudah /api, jadi cukup /daily-summaries/
  const response = await api.get('/daily-summaries/', { params })
  return response.data
}

export async function fetchPaymentBreakdown(params = {}) {
  // Endpoint untuk pie chart Sumber Pendapatan
  const response = await api.get(
    '/daily-summaries/payment_breakdown/',
    { params },
  )
  return response.data
}
