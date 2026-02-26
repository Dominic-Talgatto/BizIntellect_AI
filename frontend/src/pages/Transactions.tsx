import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi, type Transaction } from '../api/transactions'
import CategoryBadge from '../components/CategoryBadge'
import { Plus, Trash2, Pencil, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

const CATEGORIES = ['Food', 'Rent', 'Utilities', 'Salary', 'Equipment', 'Marketing', 'Transport', 'Finance', 'Other']

interface TxFormData {
  amount: string
  type: 'income' | 'expense'
  category: string
  description: string
  date: string
}

const emptyForm: TxFormData = {
  amount: '',
  type: 'expense',
  category: 'Other',
  description: '',
  date: new Date().toISOString().slice(0, 10),
}

export default function Transactions() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState({ type: '', category: '', date_from: '', date_to: '' })
  const [showModal, setShowModal] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [form, setForm] = useState<TxFormData>(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, filter],
    queryFn: () => transactionsApi.list({ page, page_size: 20, ...filter }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: TxFormData) => transactionsApi.create({
      amount: parseFloat(d.amount),
      type: d.type,
      category: d.category,
      description: d.description,
      date: d.date,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); closeModal() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: TxFormData }) => transactionsApi.update(id, {
      amount: parseFloat(d.amount),
      type: d.type,
      category: d.category,
      description: d.description,
      date: d.date,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })

  const openCreate = () => { setEditTx(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (tx: Transaction) => {
    setEditTx(tx)
    setForm({
      amount: tx.amount.toString(),
      type: tx.type,
      category: tx.category,
      description: tx.description,
      date: tx.date.slice(0, 10),
    })
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditTx(null) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editTx) {
      updateMutation.mutate({ id: editTx.id, d: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const transactions = data?.data ?? []
  const total = data?.total ?? 0
  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-slate-400 text-sm mt-1">{total} total records</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <select
          value={filter.type}
          onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select
          value={filter.category}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>

        <input
          type="date"
          value={filter.date_from}
          onChange={e => setFilter(f => ({ ...f, date_from: e.target.value }))}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
          placeholder="From"
        />
        <input
          type="date"
          value={filter.date_to}
          onChange={e => setFilter(f => ({ ...f, date_to: e.target.value }))}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
          placeholder="To"
        />
        <button
          onClick={() => setFilter({ type: '', category: '', date_from: '', date_to: '' })}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-400 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-violet-400" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg">No transactions yet</p>
            <p className="text-sm mt-1">Add your first transaction or upload an Excel file</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-left">Source</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-3.5 text-slate-400">
                    {format(new Date(tx.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-3.5 text-slate-200 max-w-xs truncate">{tx.description}</td>
                  <td className="px-6 py-3.5">
                    <CategoryBadge category={tx.category} />
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      tx.type === 'income'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className={`px-6 py-3.5 text-right font-medium ${
                    tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 capitalize text-xs">{tx.source}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(tx)}
                        className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(tx.id)}
                        className="p-1.5 hover:bg-rose-500/20 rounded text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md card shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">{editTx ? 'Edit Transaction' : 'Add Transaction'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                  placeholder="e.g. Office rent for March"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  {editTx ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
