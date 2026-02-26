import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/dashboard'
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function Forecast() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['forecast'],
    queryFn: () => dashboardApi.forecast().then(r => r.data),
  })

  const forecast = data?.forecast ?? []
  const method = data?.method ?? ''

  const chartData = forecast.map((f: any) => ({
    month: f.month,
    income: f.predicted_income,
    expense: f.predicted_expense,
    profit: f.predicted_profit,
    risk: f.negative_cash_flow_risk,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cash Flow Forecast</h1>
        <p className="text-slate-400 text-sm mt-1">
          AI-powered predictions for the next 3 months
          {method && <span className="ml-2 text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full capitalize">{method}</span>}
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-violet-400" size={32} />
        </div>
      )}

      {isError && (
        <div className="card text-center text-slate-400">
          <p>Forecast requires at least 3 months of transaction history.</p>
          <p className="text-sm mt-1">Add more transactions to enable forecasting.</p>
        </div>
      )}

      {forecast.length > 0 && (
        <>
          {/* Forecast cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {forecast.map((f: any) => (
              <div key={f.month} className={`card border ${f.negative_cash_flow_risk ? 'border-rose-500/30' : 'border-emerald-500/20'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">{f.month}</span>
                  {f.negative_cash_flow_risk ? (
                    <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={11} /> Risk
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <CheckCircle size={11} /> Healthy
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Income</span>
                    <span className="text-emerald-400 font-medium">{fmt(f.predicted_income)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Expenses</span>
                    <span className="text-rose-400 font-medium">{fmt(f.predicted_expense)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-700/50 pt-2">
                    <span className="text-slate-400 font-medium">Net Profit</span>
                    <span className={`font-bold ${f.predicted_profit >= 0 ? 'text-violet-300' : 'text-rose-400'}`}>
                      {fmt(f.predicted_profit)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-600">
                  Income range: {fmt(f.income_lower)} – {fmt(f.income_upper)}
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Forecasted Income vs Expenses</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  formatter={(v) => [fmt(v as number)]}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#475569" />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Risk warning */}
          {forecast.some((f: any) => f.negative_cash_flow_risk) && (
            <div className="card border border-rose-500/20 bg-rose-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-rose-400">Negative Cash Flow Risk Detected</p>
                  <p className="text-sm text-slate-400 mt-1">
                    One or more forecast months show predicted expenses exceeding income.
                    Consider reviewing your cost structure or boosting revenue streams before this period.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
