---
name: real-time-features
description: WebSockets, Server-Sent Events, live updates, push notifications
---
# Real-Time Features

Comprehensive patterns for implementing real-time functionality in web applications.

## Communication Patterns

| Pattern | Direction | Use Case | Pros | Cons |
|---------|-----------|----------|------|------|
| **WebSocket** | Bidirectional | Chat, gaming, collaboration | Full duplex | Complex |
| **SSE** | Server → Client | Notifications, feeds | Simple, auto-reconnect | Unidirectional |
| **Long Polling** | Server → Client | Legacy support | Works everywhere | Inefficient |
| **Push API** | Server → Client | Offline notifications | Works when closed | Requires service worker |

## WebSocket Implementation

### Server (ws library)

```typescript
// server/websocket.ts
import { WebSocketServer, WebSocket, type RawData } from 'ws'
import { Server } from 'http'

interface Client {
  ws: WebSocket
  userId: string
  rooms: Set<string>
}

const clients = new Map<WebSocket, Client>()

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    // Authenticate connection
    const token = extractTokenFromRequest(req)
    const user = verifyToken(token)
    
    if (!user) {
      ws.close(4001, 'Unauthorized')
      return
    }

    // Register client
    clients.set(ws, {
      ws,
      userId: user.userId,
      rooms: new Set(),
    })

    ws.on('message', (data: RawData) => {
      try {
        const message = JSON.parse(data.toString())
        handleMessage(ws, message)
      } catch (error) {
        ws.send(JSON.stringify({ error: 'Invalid message format' }))
      }
    })

    ws.on('close', () => {
      const client = clients.get(ws)
      if (client) {
        client.rooms.forEach(room => leaveRoom(ws, room))
        clients.delete(ws)
      }
    })

    ws.send(JSON.stringify({ type: 'connected', userId: user.userId }))
  })

  return wss
}

// Message handling
function handleMessage(ws: WebSocket, message: any) {
  const client = clients.get(ws)
  if (!client) return

  switch (message.type) {
    case 'join':
      joinRoom(ws, message.room)
      break
    case 'leave':
      leaveRoom(ws, message.room)
      break
    case 'broadcast':
      broadcastToRoom(message.room, message.payload, client.userId)
      break
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }))
      break
  }
}

// Room management
const rooms = new Map<string, Set<WebSocket>>()

function joinRoom(ws: WebSocket, room: string) {
  const client = clients.get(ws)
  if (!client) return

  if (!rooms.has(room)) {
    rooms.set(room, new Set())
  }
  rooms.get(room)!.add(ws)
  client.rooms.add(room)

  ws.send(JSON.stringify({ type: 'joined', room }))
  
  // Notify others
  broadcastToRoom(room, { type: 'user_joined', userId: client.userId }, client.userId, true)
}

function leaveRoom(ws: WebSocket, room: string) {
  const client = clients.get(ws)
  if (!client) return

  rooms.get(room)?.delete(ws)
  client.rooms.delete(room)

  if (rooms.get(room)?.size === 0) {
    rooms.delete(room)
  }

  broadcastToRoom(room, { type: 'user_left', userId: client.userId }, client.userId, true)
}

function broadcastToRoom(
  room: string,
  payload: any,
  excludeUserId?: string,
  excludeSender: boolean = false
) {
  const roomClients = rooms.get(room)
  if (!roomClients) return

  const message = JSON.stringify({ room, ...payload })

  roomClients.forEach(ws => {
    const client = clients.get(ws)
    if (excludeSender && client?.userId === excludeUserId) return
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message)
    }
  })
}

// Send to specific user
export function sendToUser(userId: string, message: any) {
  clients.forEach((client, ws) => {
    if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  })
}
```

### Server (Socket.io)

```typescript
// server/socket.ts
import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'

interface UserSocket {
  userId: string
  rooms: string[]
}

export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  })

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    
    try {
      const user = verifyToken(token)
      socket.data.user = user
      next()
    } catch (error) {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    console.log(`User ${user.userId} connected`)

    // Join user-specific room
    socket.join(`user:${user.userId}`)

    // Handle room joining
    socket.on('join:room', (roomId: string) => {
      socket.join(roomId)
      socket.to(roomId).emit('user:joined', { userId: user.userId })
      socket.emit('joined:room', roomId)
    })

    // Handle room leaving
    socket.on('leave:room', (roomId: string) => {
      socket.leave(roomId)
      socket.to(roomId).emit('user:left', { userId: user.userId })
    })

    // Handle messages
    socket.on('message', (data: { room: string; content: string }) => {
      const message = {
        id: generateId(),
        userId: user.userId,
        content: data.content,
        timestamp: new Date(),
      }
      
      io.to(data.room).emit('message', message)
      
      // Persist message
      messageService.create(message)
    })

    // Handle typing indicators
    socket.on('typing:start', (roomId: string) => {
      socket.to(roomId).emit('typing', { userId: user.userId, typing: true })
    })

    socket.on('typing:stop', (roomId: string) => {
      socket.to(roomId).emit('typing', { userId: user.userId, typing: false })
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${user.userId} disconnected`)
    })
  })

  return io
}

// Emit to specific user
export function emitToUser(io: Server, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data)
}
```

### Client Hook (React)

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react'

interface UseWebSocketOptions {
  url: string
  onMessage?: (data: any) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
  reconnect?: boolean
  reconnectInterval?: number
  reconnectAttempts?: number
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const attemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(url)

    ws.onopen = () => {
      setIsConnected(true)
      attemptsRef.current = 0
      onOpen?.()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage?.(data)
      } catch {
        onMessage?.(event.data)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      onClose?.()

      if (reconnect && attemptsRef.current < reconnectAttempts) {
        attemptsRef.current++
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval)
      }
    }

    ws.onerror = (error) => {
      onError?.(error)
    }

    wsRef.current = ws
  }, [url, onMessage, onOpen, onClose, onError, reconnect, reconnectInterval, reconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
      return true
    }
    return false
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return { isConnected, send, disconnect, reconnect: connect }
}
```

### Socket.io Client Hook

```typescript
// hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  url: string
  auth?: { token: string }
  events?: Record<string, (data: any) => void>
}

export function useSocket(options: UseSocketOptions) {
  const { url, auth, events = {} } = options
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io(url, {
      auth,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    // Register event handlers
    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    socketRef.current = socket

    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        socket.off(event, handler)
      })
      socket.disconnect()
    }
  }, [url, auth])

  const emit = (event: string, data: any) => {
    socketRef.current?.emit(event, data)
  }

  const joinRoom = (roomId: string) => {
    socketRef.current?.emit('join:room', roomId)
  }

  const leaveRoom = (roomId: string) => {
    socketRef.current?.emit('leave:room', roomId)
  }

  return { socket: socketRef.current, isConnected, emit, joinRoom, leaveRoom }
}

// Chat room example
export function useChatRoom(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  const { socket, isConnected, emit } = useSocket({
    url: process.env.NEXT_PUBLIC_WS_URL!,
    auth: { token: getAuthToken() },
    events: {
      'message': (message: Message) => {
        setMessages(prev => [...prev, message])
      },
      'typing': ({ userId, typing }: { userId: string; typing: boolean }) => {
        setTypingUsers(prev =>
          typing
            ? [...prev, userId]
            : prev.filter(id => id !== userId)
        )
      },
      'user:joined': ({ userId }: { userId: string }) => {
        // Handle user joined
      },
      'user:left': ({ userId }: { userId: string }) => {
        setTypingUsers(prev => prev.filter(id => id !== userId))
      },
    },
  })

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('join:room', roomId)
      return () => socket.emit('leave:room', roomId)
    }
  }, [socket, isConnected, roomId])

  const sendMessage = (content: string) => {
    emit('message', { room: roomId, content })
  }

  const setTyping = (typing: boolean) => {
    emit(typing ? 'typing:start' : 'typing:stop', roomId)
  }

  return { messages, typingUsers, sendMessage, setTyping, isConnected }
}
```

## Server-Sent Events (SSE)

### Server Implementation

```typescript
// server/sse.ts
import { type Request, type Response } from 'express'

interface SSEClient {
  id: string
  userId: string
  res: Response
  channels: Set<string>
}

const clients = new Map<string, SSEClient>()

export function sseHandler(req: Request, res: Response) {
  const user = req.user!
  const clientId = `${user.userId}-${Date.now()}`

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

  // Register client
  const client: SSEClient = {
    id: clientId,
    userId: user.userId,
    res,
    channels: new Set(['global']),
  }
  clients.set(clientId, client)

  // Send initial connection message
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`)

  // Keep-alive heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 30000)

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(clientId)
  })
}

// Send event to specific user
export function sendToUser(userId: string, event: string, data: any) {
  clients.forEach(client => {
    if (client.userId === userId) {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }
  })
}

// Send to channel
export function sendToChannel(channel: string, event: string, data: any) {
  clients.forEach(client => {
    if (client.channels.has(channel)) {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }
  })
}

// Broadcast to all
export function broadcast(event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach(client => client.res.write(message))
}
```

### Client Hook

```typescript
// hooks/useSSE.ts
import { useEffect, useState, useCallback } from 'react'

interface UseSSEOptions {
  url: string
  events?: Record<string, (data: any) => void>
  withCredentials?: boolean
}

export function useSSE<T = any>(options: UseSSEOptions) {
  const { url, events = {}, withCredentials = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Event | null>(null)

  useEffect(() => {
    const eventSource = new EventSource(url, { withCredentials })

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    eventSource.onerror = (e) => {
      setIsConnected(false)
      setError(e)
    }

    // Register event listeners
    Object.entries(events).forEach(([event, handler]) => {
      eventSource.addEventListener(event, (e) => {
        try {
          const data = JSON.parse(e.data)
          handler(data)
        } catch {
          handler(e.data)
        }
      })
    })

    return () => {
      eventSource.close()
    }
  }, [url, events, withCredentials])

  return { isConnected, error }
}

// Usage example
function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useSSE({
    url: '/api/events',
    events: {
      notification: (data) => {
        setNotifications(prev => [data, ...prev])
      },
      'order:update': (data) => {
        // Handle order update
      },
    },
  })

  return (
    <div>
      {notifications.map(n => (
        <Notification key={n.id} {...n} />
      ))}
    </div>
  )
}
```

## Real-Time Features

### Live Cursor Tracking

```typescript
// hooks/useCursors.ts
export function useCursors(roomId: string) {
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map())
  const { emit, isConnected } = useSocket({
    url: WS_URL,
    events: {
      'cursor:move': ({ userId, x, y }: CursorData) => {
        setCursors(prev => {
          const next = new Map(prev)
          next.set(userId, { userId, x, y, timestamp: Date.now() })
          return next
        })
      },
      'cursor:leave': ({ userId }: { userId: string }) => {
        setCursors(prev => {
          const next = new Map(prev)
          next.delete(userId)
          return next
        })
      },
    },
  })

  const throttledEmit = useMemo(
    () => throttle((x: number, y: number) => {
      emit('cursor:move', { roomId, x, y })
    }, 50),
    [emit, roomId]
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    throttledEmit(e.clientX, e.clientY)
  }, [throttledEmit])

  useEffect(() => {
    const handleLeave = () => emit('cursor:leave', { roomId })
    window.addEventListener('beforeunload', handleLeave)
    return () => window.removeEventListener('beforeunload', handleLeave)
  }, [emit, roomId])

  return { cursors, handleMouseMove, isConnected }
}
```

### Presence System

```typescript
// hooks/usePresence.ts
export function usePresence(channel: string) {
  const [users, setUsers] = useState<PresenceUser[]>([])

  const { socket, isConnected } = useSocket({
    url: WS_URL,
    events: {
      'presence:join': (user: PresenceUser) => {
        setUsers(prev => {
          if (prev.find(u => u.id === user.id)) return prev
          return [...prev, { ...user, joinedAt: new Date() }]
        })
      },
      'presence:leave': ({ userId }: { userId: string }) => {
        setUsers(prev => prev.filter(u => u.id !== userId))
      },
      'presence:list': (users: PresenceUser[]) => {
        setUsers(users)
      },
      'presence:update': ({ userId, data }: { userId: string; data: Partial<PresenceUser> }) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u))
      },
    },
  })

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('presence:join', { channel, user: getCurrentUser() })
      return () => socket.emit('presence:leave', { channel })
    }
  }, [socket, isConnected, channel])

  const updatePresence = (data: Partial<PresenceUser>) => {
    socket?.emit('presence:update', { channel, data })
  }

  return { users, updatePresence, isConnected }
}
```

### Real-Time Data Sync

```typescript
// hooks/useRealtimeSync.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'

export function useRealtimeSync<T>(
  queryKey: any[],
  fetchFn: () => Promise<T>,
  wsChannel: string
) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey,
    queryFn: fetchFn,
  })

  useSSE({
    url: `/api/events?channel=${wsChannel}`,
    events: {
      [`${wsChannel}:update`]: (data: T) => {
        queryClient.setQueryData(queryKey, data)
      },
      [`${wsChannel}:delete`]: ({ id }: { id: string }) => {
        queryClient.setQueryData(queryKey, (old: any[]) =>
          old.filter(item => item.id !== id)
        )
      },
    },
  })

  return query
}

// Optimistic updates with real-time sync
export function useOptimisticSync<T extends { id: string }>(
  queryKey: any[],
  wsChannel: string
) {
  const queryClient = useQueryClient()

  const optimisticUpdate = async (
    mutationFn: () => Promise<T>,
    optimisticData: T
  ) => {
    await queryClient.cancelQueries({ queryKey })

    const previous = queryClient.getQueryData<T[]>(queryKey)

    queryClient.setQueryData<T[]>(queryKey, (old = []) =>
      old.map(item => item.id === optimisticData.id ? optimisticData : item)
    )

    try {
      const result = await mutationFn()
      queryClient.setQueryData<T[]>(queryKey, (old = []) =>
        old.map(item => item.id === result.id ? result : item)
      )
      return result
    } catch (error) {
      queryClient.setQueryData(queryKey, previous)
      throw error
    }
  }

  return { optimisticUpdate }
}
```

## Push Notifications

### Service Worker Setup

```typescript
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url,
    },
    actions: data.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const url = event.notification.data.url
      
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
```

### Push Subscription

```typescript
// hooks/usePushNotifications.ts
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  const subscribe = async () => {
    if (!isSupported) return null

    const registration = await navigator.serviceWorker.ready

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_KEY!),
    })

    // Send subscription to server
    await api.post('/push/subscribe', subscription.toJSON())

    setIsSubscribed(true)
    return subscription
  }

  const unsubscribe = async () => {
    if (!isSupported) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      await api.post('/push/unsubscribe', { endpoint: subscription.endpoint })
    }

    setIsSubscribed(false)
  }

  return { isSupported, isSubscribed, subscribe, unsubscribe }
}

// Server-side push
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:contact@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; url?: string }
) {
  await webpush.sendNotification(subscription, JSON.stringify(payload))
}
```

## Best Practices

### Do's
- Use heartbeat to detect dead connections
- Implement reconnection logic
- Handle network failures gracefully
- Use rooms/channels for targeted messages
- Validate all incoming messages
- Rate limit message frequency
- Use binary protocols for high throughput
- Monitor connection metrics

### Don'ts
- Don't send sensitive data unencrypted
- Don't trust client data without validation
- Don't create unlimited connections
- Don't forget cleanup on disconnect
- Don't use long-polling if WebSockets available
- Don't skip authentication
- Don't ignore mobile network constraints
