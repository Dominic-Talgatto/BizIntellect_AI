import { api } from './client'

export interface Transaction {
  id: number
  user_id: number
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
  date: string
  source: 'manual' | 'excel' | 'receipt'
  created_at: string
}

export interface TransactionFilter {
  type?: string
  category?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

export interface CreateTransactionData {
  amount: number
  type: 'income' | 'expense'
  category?: string
  description: string
  date: string
}

export const transactionsApi = {
  list: (params?: TransactionFilter) =>
    api.get<{ data: Transaction[]; total: number }>('/transactions', { params }),

  create: (data: CreateTransactionData) =>
    api.post<Transaction>('/transactions', data),

  update: (id: number, data: Partial<CreateTransactionData>) =>
    api.patch<Transaction>(`/transactions/${id}`, data),

  delete: (id: number) =>
    api.delete(`/transactions/${id}`),

  uploadExcel: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ imported: number; data: Transaction[] }>(
      '/transactions/upload/excel',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },

  uploadReceipt: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/ml/ocr', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
