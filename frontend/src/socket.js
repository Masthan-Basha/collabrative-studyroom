import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

let socket = null

export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('access_token')
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],          // Skip polling — avoids Render.com issues
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
  socket = null
}

export function refreshSocketToken() {
  // Call after login to ensure new token is used
  disconnectSocket()
  return getSocket()
}
