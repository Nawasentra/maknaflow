import api from '../axios'

export async function fetchDailySummaries(params = {}) {
  const response = await api.get('/api/daily-summaries/', { params })
  return response.data
}

export async function fetchPaymentBreakdown(params = {}) {
  const response = await api.get('/api/daily-summaries/payment_breakdown/', { params })
  return response.data
}