import { type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  TrendingUp,
  Calculator,
  MessageSquare,
  LogOut,
  Zap,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/upload', icon: Upload, label: 'Upload' },
  { to: '/forecast', icon: TrendingUp, label: 'Forecast' },
  { to: '/tax', icon: Calculator, label: 'Tax' },
  { to: '/chat', icon: MessageSquare, label: 'AI Advisor' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="px-6 py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            FinSight
          </span>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
