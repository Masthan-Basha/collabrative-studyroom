import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 15000,
})

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, clear auth and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Named API methods ──────────────────────────────────────────────────────────
export const authAPI = {
  register: (data)   => api.post('/auth/register', data),
  login:    (data)   => api.post('/auth/login', data),
  me:       ()       => api.get('/auth/me'),
  update:   (data)   => api.patch('/auth/me', data),
}

export const roomsAPI = {
  list:    ()         => api.get('/rooms'),
  get:     (id)       => api.get(`/rooms/${id}`),
  create:  (data)     => api.post('/rooms', data),
  join:    (code)     => api.post('/rooms/join', { invite_code: code }),
  archive: (id)       => api.delete(`/rooms/${id}`),
}

export const flashcardsAPI = {
  listSets:    (roomId)        => api.get(`/rooms/${roomId}/flashcard-sets`),
  createSet:   (roomId, data)  => api.post(`/rooms/${roomId}/flashcard-sets`, data),
  listCards:   (setId)         => api.get(`/flashcard-sets/${setId}/cards`),
  addCard:     (setId, data)   => api.post(`/flashcard-sets/${setId}/cards`, data),
  updateCard:  (cardId, data)  => api.put(`/flashcards/${cardId}`, data),
  deleteCard:  (cardId)        => api.delete(`/flashcards/${cardId}`),
  leaderboard: (roomId)        => api.get(`/rooms/${roomId}/quiz-scores`),
  submitScore: (roomId, data)  => api.post(`/rooms/${roomId}/quiz-scores`, data),
}

export const aiAPI = {
  coach:         (data) => api.post('/ai/coach', data),
  generateCards: (data) => api.post('/ai/generate-cards', data),
}

export const analyticsAPI = {
  mine: () => api.get('/analytics/me'),
}

// ── Convenience standalone exports ──────────────────────────────────────────────
// These unwrap the axios response so callers receive plain data.
export const getRooms    = ()         => api.get('/rooms').then(r => r.data);
export const createRoom  = (data)     => api.post('/rooms', data).then(r => r.data);
export const joinRoom    = (code)     => api.post('/rooms/join', { invite_code: code }).then(r => r.data);
export const getMe       = ()         => api.get('/auth/me').then(r => r.data);

export const getFlashcardSets  = (roomId)        => api.get(`/rooms/${roomId}/flashcard-sets`).then(r => r.data);
export const createFlashcardSet = ({ roomId, name, title, subject }) =>
  api.post(`/rooms/${roomId}/flashcard-sets`, { title: title || name, subject: subject || '' }).then(r => r.data);
export const getFlashcards     = (setId)          => api.get(`/flashcard-sets/${setId}/cards`).then(r => r.data);
export const addFlashcard      = ({ setId, front, back }) =>
  api.post(`/flashcard-sets/${setId}/cards`, { front, back }).then(r => r.data);
export const generateAICards   = (data) => {
  const payload = {
    set_id: data.set_id || data.setId,
    topic: data.topic,
    count: data.count || 5,
  };
  return api.post('/ai/generate-cards', payload).then(r => r.data);
};

export const generateAIQuiz = (data) => {
  const payload = {
    room_id: data.room_id || data.roomId,
    topic: data.topic,
    count: data.count || 5,
    subject: data.subject || "General",
  };
  return api.post('/ai/generate-quiz', payload).then(r => r.data);
};

export const askCoach = (data) => {
  const payload = {
    room_id: data.room_id || data.roomId,
    message: data.message,
    history: data.history || [],
    subject: data.subject || "general",
    mode: data.mode || "chat",
  };
  return api.post('/ai/coach', payload).then(r => r.data);
};
