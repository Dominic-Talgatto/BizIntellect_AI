import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: number
  color?: 'green' | 'red' | 'blue' | 'purple'
}

const colorMap = {
  green: 'text-emerald-400 bg-emerald-400/10',
  red: 'text-rose-400 bg-rose-400/10',
  blue: 'text-blue-400 bg-blue-400/10',
  purple: 'text-violet-400 bg-violet-400/10',
}

export default function StatCard({ label, value, icon: Icon, trend, color = 'purple' }: StatCardProps) {
  const colors = colorMap[color]
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-2xl font-bold mt-1 text-slate-100">{value}</p>
          {trend !== undefined && (
            <p className={`text-sm mt-1 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs last period
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${colors}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
