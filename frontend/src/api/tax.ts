import { api } from './client'

export interface TaxSettings {
  id?: number
  tax_rate: number
  business_type: string
  quarterly_start_month: number
}

export interface TaxEstimate {
  taxable_income: number
  tax_rate: number
  estimated_tax: number
  net_profit: number
  quarterly_payments: {
    quarter: number
    due_date: string
    amount: number
  }[]
  optimization_tips: string[]
}

export const taxApi = {
  getSettings: () => api.get<TaxSettings>('/tax/settings'),
  saveSettings: (data: TaxSettings) => api.put<TaxSettings>('/tax/settings', data),
  estimate: (year?: number) =>
    api.get<TaxEstimate>('/tax/estimate', { params: year ? { year } : {} }),
}
