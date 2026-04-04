import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

let globalSocket = null
let connectionCount = 0

function getSocket() {
  if (!globalSocket || !globalSocket.connected) {
    const token = localStorage.getItem('accessToken')
    globalSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return globalSocket
}

/**
 * Hook to access the shared Socket.io connection.
 * Returns { socket, connected, subscribeToLink, unsubscribeFromLink }
 */
export function useSocket() {
  const socketRef = useRef(null)

  useEffect(() => {
    connectionCount++
    socketRef.current = getSocket()

    return () => {
      connectionCount--
      if (connectionCount === 0 && globalSocket) {
        globalSocket.disconnect()
        globalSocket = null
      }
    }
  }, [])

  const subscribeToLink = useCallback((shortCode) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribe:link', shortCode)
    }
  }, [])

  const unsubscribeFromLink = useCallback((shortCode) => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe:link', shortCode)
    }
  }, [])

  return {
    socket: socketRef.current,
    subscribeToLink,
    unsubscribeFromLink,
  }
}

/**
 * Hook to listen to real-time analytics for a specific link.
 * Automatically subscribes/unsubscribes as shortCode changes.
 */
export function useLinkAnalytics(shortCode, { onClick, onStats, onGeo } = {}) {
  const { socket, subscribeToLink, unsubscribeFromLink } = useSocket()

  useEffect(() => {
    if (!socket || !shortCode) return

    subscribeToLink(shortCode)

    if (onClick) socket.on('click:new', onClick)
    if (onStats) socket.on('stats:update', onStats)
    if (onGeo)   socket.on('geo:update', onGeo)

    // Request initial data
    socket.emit('get:stats', { shortCode })
    socket.emit('get:recent-clicks', { shortCode, count: 20 })

    return () => {
      unsubscribeFromLink(shortCode)
      if (onClick) socket.off('click:new', onClick)
      if (onStats) socket.off('stats:update', onStats)
      if (onGeo)   socket.off('geo:update', onGeo)
    }
  }, [socket, shortCode, onClick, onStats, onGeo, subscribeToLink, unsubscribeFromLink])
}

export default useSocket
