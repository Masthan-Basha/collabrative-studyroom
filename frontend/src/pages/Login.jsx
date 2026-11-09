import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { BookOpen, Mail, Lock, LogIn } from 'lucide-react'

export default function Login() {
  const navigate   = useNavigate()
  const { login, loading, error } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await login(form.email, form.password)
    if (ok) navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 border border-primary/30 rounded-2xl mb-4 animate-glow-ring">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">StudyRoom</h1>
          <p className="text-muted mt-1 text-sm">Your collaborative study space</p>
        </div>

        <div className="card p-8">
          <h2 className="font-display text-xl font-semibold mb-6">Welcome back</h2>

          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
                <input
                  type="email" required
                  className="input pl-10"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
                <input
                  type="password" required
                  className="input pl-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 flex items-center justify-center gap-2 py-3">
              {loading ? (
                <span className="flex gap-1">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-dot" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            No account?{' '}
            <Link to="/register" className="text-primary hover:text-primary-light transition-colors font-medium">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
