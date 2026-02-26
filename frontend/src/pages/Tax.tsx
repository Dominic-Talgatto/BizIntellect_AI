import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taxApi, type TaxSettings } from '../api/tax'
import { Calculator, Lightbulb, Calendar, Save, Loader2, CheckCircle } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const BUSINESS_TYPES = [
  { value: 'general', label: 'General / LLC' },
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'simplified', label: 'Simplified Tax Regime' },
  { value: 'corp', label: 'Corporation' },
]

export default function Tax() {
  const qc = useQueryClient()
  const year = new Date().getFullYear()

  const { data: settings } = useQuery({
    queryKey: ['tax-settings'],
    queryFn: () => taxApi.getSettings().then(r => r.data),
  })

  const { data: estimate, refetch: refetchEstimate } = useQuery({
    queryKey: ['tax-estimate', year],
    queryFn: () => taxApi.estimate(year).then(r => r.data),
  })

  const [form, setForm] = useState<TaxSettings>({
    tax_rate: 20,
    business_type: 'general',
    quarterly_start_month: 1,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: taxApi.saveSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-settings'] })
      refetchEstimate()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax Estimation</h1>
        <p className="text-slate-400 text-sm mt-1">Estimate your tax liability for {year}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Calculator size={18} className="text-violet-400" />
            <h2 className="font-semibold">Tax Settings</h2>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Business Type</label>
            <select
              value={form.business_type}
              onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
            >
              {BUSINESS_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Tax Rate (%) — currently {form.tax_rate}%
            </label>
            <input
              type="range"
              min={1}
              max={50}
              step={0.5}
              value={form.tax_rate}
              onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) }))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-0.5">
              <span>1%</span><span>25%</span><span>50%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Fiscal Year Start Month</label>
            <select
              value={form.quarterly_start_month}
              onChange={e => setForm(f => ({ ...f, quarterly_start_month: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
            >
              {['January','February','March','April','May','June','July','August','September','October','November','December']
                .map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>

          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {saveMutation.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : saved
              ? <CheckCircle size={14} />
              : <Save size={14} />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        {/* Estimate */}
        <div className="lg:col-span-2 space-y-4">
          {estimate ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Taxable Income', value: fmt(estimate.taxable_income), color: 'text-slate-200' },
                  { label: 'Estimated Tax', value: fmt(estimate.estimated_tax), color: 'text-rose-400' },
                  { label: 'Tax Rate', value: `${estimate.tax_rate}%`, color: 'text-yellow-400' },
                  { label: 'Net Profit', value: fmt(estimate.net_profit), color: 'text-emerald-400' },
                ].map(item => (
                  <div key={item.label} className="card">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Quarterly payments */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-blue-400" />
                  <h3 className="font-medium text-sm">Quarterly Payment Schedule — {year}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {estimate.quarterly_payments.map(qp => (
                    <div key={qp.quarter} className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-0.5">Q{qp.quarter} — Due {qp.due_date}</div>
                      <div className="text-lg font-bold text-slate-100">{fmt(qp.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              {estimate.optimization_tips.length > 0 && (
                <div className="card border border-yellow-500/20 bg-yellow-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={16} className="text-yellow-400" />
                    <h3 className="font-medium text-sm text-yellow-300">Optimization Tips</h3>
                  </div>
                  <ul className="space-y-2">
                    {estimate.optimization_tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-yellow-500 shrink-0 mt-0.5">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="card flex items-center justify-center h-48 text-slate-500">
              <Loader2 className="animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
