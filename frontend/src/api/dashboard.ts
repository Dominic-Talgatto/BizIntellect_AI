import { api } from './client'

export interface DashboardSummary {
  total_income: number
  total_expenses: number
  profit: number
  period: string
}

export interface CategoryBreakdown {
  category: string
  amount: number
  count: number
  percent: number
}

export interface CashFlowPoint {
  date: string
  income: number
  expense: number
  balance: number
}

export interface DateRangeParams {
  from?: string
  to?: string
}

export const dashboardApi = {
  summary: (params?: DateRangeParams) =>
    api.get<DashboardSummary>('/dashboard/summary', { params }),

  breakdown: (params?: DateRangeParams & { type?: string }) =>
    api.get<CategoryBreakdown[]>('/dashboard/breakdown', { params }),

  cashflow: (params?: DateRangeParams & { granularity?: string }) =>
    api.get<CashFlowPoint[]>('/dashboard/cashflow', { params }),

  forecast: () => api.get('/ml/forecast'),

  classify: (description: string) =>
    api.post('/ml/classify', { description }),
}
