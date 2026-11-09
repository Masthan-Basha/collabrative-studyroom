import { create } from 'zustand'
import { authAPI } from '../api'
import { refreshSocketToken } from '../socket'

const stored = localStorage.getItem('user')

export const useAuthStore = create((set, get) => ({
  user:    stored ? JSON.parse(stored) : null,
  token:   localStorage.getItem('access_token') || null,
  loading: false,
  error:   null,

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await authAPI.login({ email, password })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      refreshSocketToken()
      set({ user: data.user, token: data.access_token, loading: false })
      return true
    } catch (err) {
      set({ loading: false, error: err.response?.data?.detail || 'Login failed' })
      return false
    }
  },

  register: async (username, email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await authAPI.register({ username, email, password })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      refreshSocketToken()
      set({ user: data.user, token: data.access_token, loading: false })
      return true
    } catch (err) {
      let errorMsg = 'Registration failed'
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        errorMsg = detail
      } else if (Array.isArray(detail)) {
        errorMsg = detail
          .map((d) => (d.msg ? d.msg.replace(/^Value error,\s*/i, '') : JSON.stringify(d)))
          .join('. ')
      }
      set({ loading: false, error: errorMsg })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
    window.location.href = '/login'
  },

  updateUser: async (data) => {
    const { data: updated } = await authAPI.update(data)
    get().setUser(updated)
    return updated
  },
}))
