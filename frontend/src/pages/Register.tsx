import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { Zap, Loader2 } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register(form)
      login(res.data.access_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        required={key !== 'phone'}
        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            FinSight
          </span>
        </div>

        <div className="card">
          <h1 className="text-xl font-semibold mb-1">Create account</h1>
          <p className="text-sm text-slate-400 mb-6">Start managing your business finances</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {field('First Name', 'first_name', 'text', 'John')}
              {field('Last Name', 'last_name', 'text', 'Doe')}
            </div>
            {field('Email', 'email', 'email', 'you@example.com')}
            {field('Phone (optional)', 'phone', 'tel', '+7 777 000 0000')}
            {field('Password', 'password', 'password', '••••••••')}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Create account
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
