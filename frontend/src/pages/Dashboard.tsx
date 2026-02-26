import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/dashboard'
import StatCard from '../components/StatCard'
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'

const PIE_COLORS = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#6366f1']

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function Dashboard() {
  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: () => dashboardApi.summary().then(r => r.data),
  })

  const { data: breakdown = [] } = useQuery({
    queryKey: ['breakdown'],
    queryFn: () => dashboardApi.breakdown().then(r => r.data),
  })

  const { data: cashflow = [] } = useQuery({
    queryKey: ['cashflow'],
    queryFn: () => dashboardApi.cashflow({ granularity: 'week' }).then(r => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Your business financial overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Income"
          value={fmt(summary?.total_income ?? 0)}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Total Expenses"
          value={fmt(summary?.total_expenses ?? 0)}
          icon={TrendingDown}
          color="red"
        />
        <StatCard
          label="Net Profit"
          value={fmt(summary?.profit ?? 0)}
          icon={DollarSign}
          color={(summary?.profit ?? 0) >= 0 ? 'purple' : 'red'}
        />
        <StatCard
          label="Period"
          value={summary?.period ?? '—'}
          icon={BarChart3}
          color="blue"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Cash Flow (Weekly)</h2>
          {cashflow.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              No data yet — add transactions to see chart
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cashflow}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend />
                <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" fill="url(#expenseGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Pie */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Expense Breakdown</h2>
          {breakdown.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              No expense data
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    strokeWidth={0}
                  >
                    {breakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                    formatter={(v) => [fmt(v as number), 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {breakdown.slice(0, 5).map((item, i) => (
                  <div key={item.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-slate-300">{item.category}</span>
                    </div>
                    <span className="text-slate-400">{item.percent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Monthly bar */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Income vs Expenses by Category</h2>
        {breakdown.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
            No category data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                    formatter={(v) => [fmt(v as number), 'Amount']}
                  />
                  <Bar dataKey="amount" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
