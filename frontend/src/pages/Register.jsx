import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { BookOpen, User, Mail, Lock, UserPlus, Check, X } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const { register, loading, error } = useAuthStore()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [clientError, setClientError] = useState('')

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value })
    if (clientError) setClientError('')
  }

  const pwd = form.password
  const rules = [
    { label: 'At least 8 characters', met: pwd.length >= 8 },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(pwd) },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(pwd) },
    { label: 'One number (0-9)', met: /[0-9]/.test(pwd) },
    { label: 'One special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(pwd) },
  ]

  const isPasswordValid = rules.every(r => r.met)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isPasswordValid) {
      setClientError('Password does not meet all security requirements.')
      return
    }
    const ok = await register(form.username.trim(), form.email.trim(), form.password)
    if (ok) navigate('/dashboard')
  }

  const displayError = clientError || error

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 border border-primary/30 rounded-2xl mb-4 animate-glow-ring">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">StudyRoom</h1>
          <p className="text-muted mt-1 text-sm">Start studying smarter together</p>
        </div>

        <div className="card p-8">
          <h2 className="font-display text-xl font-semibold mb-6">Create your account</h2>

          {displayError && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm animate-fade-in leading-relaxed">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
                <input
                  type="text"
                  required
                  minLength={3}
                  className="input pl-10"
                  placeholder="studybuddy42"
                  value={form.username}
                  onChange={set('username')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
                <input
                  type="email"
                  required
                  className="input pl-10"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
                <input
                  type="password"
                  required
                  className="input pl-10"
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={set('password')}
                />
              </div>

              {/* Real-time Password Requirements Checklist */}
              {form.password.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-void border border-border/70 space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                    Password Requirements:
                  </p>
                  {rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      {rule.met ? (
                        <Check className="w-3.5 h-3.5 text-success shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-muted shrink-0" />
                      )}
                      <span className={rule.met ? 'text-success font-medium' : 'text-muted'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (form.password.length > 0 && !isPasswordValid)}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2 py-3 disabled:opacity-40"
            >
              {loading ? (
                <span className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-dot"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary-light transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
