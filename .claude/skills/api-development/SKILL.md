---
name: api-development
description: REST/GraphQL design, route patterns, middleware, validation, and rate limiting
---
# API Development

Comprehensive patterns for building robust, scalable APIs.

## REST API Design

### Resource Naming Conventions

| Resource Type | Collection | Individual | Actions |
|--------------|------------|------------|---------|
| **Users** | `/users` | `/users/{id}` | `/users/{id}/activate` |
| **Products** | `/products` | `/products/{id}` | `/products/{id}/publish` |
| **Orders** | `/orders` | `/orders/{id}` | `/orders/{id}/cancel` |
| **Nested** | `/users/{id}/orders` | `/users/{id}/orders/{orderId}` | - |

### HTTP Methods

| Method | Purpose | Idempotent | Safe | Body |
|--------|---------|------------|------|------|
| `GET` | Retrieve resource | Yes | Yes | No |
| `POST` | Create resource | No | No | Yes |
| `PUT` | Replace resource | Yes | No | Yes |
| `PATCH` | Partial update | No | No | Yes |
| `DELETE` | Remove resource | Yes | No | No |

### Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid input |
| `401` | Unauthorized | Missing/invalid auth |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate resource |
| `422` | Unprocessable Entity | Validation errors |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |

## Express.js Patterns

### Project Structure

```
src/
├── controllers/
│   ├── userController.ts
│   └── productController.ts
├── middleware/
│   ├── auth.ts
│   ├── validate.ts
│   └── errorHandler.ts
├── models/
│   ├── User.ts
│   └── Product.ts
├── routes/
│   ├── index.ts
│   ├── userRoutes.ts
│   └── productRoutes.ts
├── services/
│   ├── userService.ts
│   └── productService.ts
├── validators/
│   ├── userValidator.ts
│   └── productValidator.ts
├── types/
│   └── index.ts
└── app.ts
```

### Application Setup

```typescript
// app.ts
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { router } from './routes'

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
}))

// Routes
app.use('/api', router)

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

export { app }
```

### Route Definition

```typescript
// routes/userRoutes.ts
import { Router } from 'express'
import { UserController } from '../controllers/userController'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createUserSchema, updateUserSchema } from '../validators/userValidator'

const router = Router()
const controller = new UserController()

router.get('/', authenticate, controller.list)
router.get('/:id', authenticate, controller.get)
router.post('/', validate(createUserSchema), controller.create)
router.put('/:id', authenticate, validate(updateUserSchema), controller.update)
router.delete('/:id', authenticate, controller.delete)

export { router as userRoutes }
```

### Controller Pattern

```typescript
// controllers/userController.ts
import { type Request, type Response, type NextFunction } from 'express'
import { UserService } from '../services/userService'
import { AppError } from '../middleware/errorHandler'

export class UserController {
  private service: UserService

  constructor() {
    this.service = new UserService()
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, search } = req.query
      const result = await this.service.findAll({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
      })
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.service.findById(req.params.id)
      if (!user) {
        throw new AppError('User not found', 404)
      }
      res.json(user)
    } catch (error) {
      next(error)
    }
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.service.create(req.body)
      res.status(201).json(user)
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.service.update(req.params.id, req.body)
      if (!user) {
        throw new AppError('User not found', 404)
      }
      res.json(user)
    } catch (error) {
      next(error)
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.delete(req.params.id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
```

### Service Layer

```typescript
// services/userService.ts
import { type User, type CreateUserInput, type UpdateUserInput } from '../types'
import { UserRepository } from '../repositories/userRepository'
import { hashPassword } from '../utils/auth'

export class UserService {
  private repository: UserRepository

  constructor() {
    this.repository = new UserRepository()
  }

  async findAll(options: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = options
    const offset = (page - 1) * limit

    const [users, total] = await Promise.all([
      this.repository.findAll({ limit, offset, search }),
      this.repository.count(search),
    ])

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findById(id)
  }

  async create(input: CreateUserInput): Promise<User> {
    const hashedPassword = await hashPassword(input.password)
    return this.repository.create({
      ...input,
      password: hashedPassword,
    })
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    if (input.password) {
      input.password = await hashPassword(input.password)
    }
    return this.repository.update(id, input)
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id)
  }
}
```

## Middleware Patterns

### Authentication Middleware

```typescript
// middleware/auth.ts
import { type Request, type Response, type NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { AppError } from './errorHandler'

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string }
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authorization header missing', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    req.user = payload
    
    next()
  } catch (error) {
    next(new AppError('Invalid or expired token', 401))
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403))
    }
    next()
  }
}
```

### Validation Middleware

```typescript
// middleware/validate.ts
import { type Request, type Response, type NextFunction } from 'express'
import { type AnyZodObject, ZodError } from 'zod'
import { AppError } from './errorHandler'

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
        next(new AppError('Validation failed', 422, errors))
      } else {
        next(error)
      }
    }
  }
}
```

### Error Handler

```typescript
// middleware/errorHandler.ts
import { type Request, type Response, type NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors?: Array<{ field: string; message: string }>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      errors: err.errors,
    })
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(409).json({ error: 'Resource already exists' })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Default error
  res.status(500).json({ error: 'Internal server error' })
}
```

### Request Logger

```typescript
// middleware/logger.ts
import { type Request, type Response, type NextFunction } from 'express'
import pino from 'pino'

const logger = pino()

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    })
  })

  next()
}
```

## Validation Schemas

### Zod Schemas

```typescript
// validators/userValidator.ts
import { z } from 'zod'

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['user', 'admin']).optional().default('user'),
  }),
})

export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
})

export const listUsersSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().default('1'),
    limit: z.string().regex(/^\d+$/).optional().default('10'),
    search: z.string().optional(),
  }),
})
```

## Rate Limiting

### Basic Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Strict rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later' },
})

// Usage
app.use('/api', apiLimiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
```

### Redis-based Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { createClient } from 'redis'

const redisClient = createClient({ url: process.env.REDIS_URL })
await redisClient.connect()

export const redisLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
})
```

## GraphQL Patterns

### Schema Definition

```typescript
// schema.ts
import { gql } from 'apollo-server-express'

export const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String!
    role: Role!
    createdAt: String!
    orders: [Order!]!
  }

  type Order {
    id: ID!
    userId: ID!
    total: Float!
    status: OrderStatus!
    items: [OrderItem!]!
    createdAt: String!
  }

  type OrderItem {
    id: ID!
    productId: ID!
    quantity: Int!
    price: Float!
  }

  enum Role {
    USER
    ADMIN
  }

  enum OrderStatus {
    PENDING
    PROCESSING
    SHIPPED
    DELIVERED
    CANCELLED
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    orders(userId: ID, status: OrderStatus): [Order!]!
    order(id: ID!): Order
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    createOrder(input: CreateOrderInput!): Order!
    updateOrderStatus(id: ID!, status: OrderStatus!): Order!
  }

  input CreateUserInput {
    email: String!
    password: String!
    name: String!
    role: Role
  }

  input UpdateUserInput {
    email: String
    name: String
    password: String
  }

  input CreateOrderInput {
    userId: ID!
    items: [OrderItemInput!]!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }
`
```

### Resolvers

```typescript
// resolvers.ts
import { UserService } from './services/userService'
import { OrderService } from './services/orderService'

const userService = new UserService()
const orderService = new OrderService()

export const resolvers = {
  Query: {
    users: async () => userService.findAll(),
    user: async (_: any, { id }: { id: string }) => userService.findById(id),
    orders: async (_: any, { userId, status }: { userId?: string; status?: string }) =>
      orderService.findAll({ userId, status }),
    order: async (_: any, { id }: { id: string }) => orderService.findById(id),
  },

  Mutation: {
    createUser: async (_: any, { input }: { input: CreateUserInput }) =>
      userService.create(input),
    updateUser: async (_: any, { id, input }: { id: string; input: UpdateUserInput }) =>
      userService.update(id, input),
    deleteUser: async (_: any, { id }: { id: string }) => {
      await userService.delete(id)
      return true
    },
    createOrder: async (_: any, { input }: { input: CreateOrderInput }) =>
      orderService.create(input),
    updateOrderStatus: async (_: any, { id, status }: { id: string; status: string }) =>
      orderService.updateStatus(id, status),
  },

  User: {
    orders: async (user: User) => orderService.findByUserId(user.id),
  },

  Order: {
    items: async (order: Order) => orderService.getOrderItems(order.id),
  },
}
```

### Apollo Server Setup

```typescript
// server.ts
import { ApolloServer } from 'apollo-server-express'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { authenticate } from './middleware/auth'

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const user = await authenticate(req)
    return { user }
  },
  formatError: (error) => {
    console.error(error)
    return {
      message: error.message,
      code: error.extensions?.code,
    }
  },
})

await server.start()
server.applyMiddleware({ app, path: '/graphql' })
```

## Pagination

### Offset-based Pagination

```typescript
// Response format
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}

// Service implementation
async findAll({ page, limit, search }: PaginationParams) {
  const offset = (page - 1) * limit
  
  const [data, total] = await Promise.all([
    this.repository.findMany({
      skip: offset,
      take: limit,
      where: search ? { name: { contains: search } } : undefined,
    }),
    this.repository.count({ where: search ? { name: { contains: search } } : undefined }),
  ])
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
```

### Cursor-based Pagination

```typescript
// Response format
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6IjEyMyJ9",
    "hasMore": true
  }
}

// Service implementation
async findAll({ cursor, limit }: CursorPaginationParams) {
  const data = await this.repository.findMany({
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
  })
  
  const hasMore = data.length > limit
  if (hasMore) data.pop()
  
  return {
    data,
    pagination: {
      cursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    },
  }
}
```

## API Documentation

### OpenAPI/Swagger

```typescript
// swagger.ts
import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
    },
    servers: [
      { url: 'http://localhost:3000/api', description: 'Development' },
      { url: 'https://api.example.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)

// Route documentation
/**
 * @openapi
 * /users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
```

## Best Practices

### Do's
- Use proper HTTP methods and status codes
- Validate all input
- Implement rate limiting
- Use pagination for collections
- Document your API
- Version your API
- Handle errors gracefully
- Use HTTPS

### Don'ts
- Don't expose internal errors
- Don't use GET for mutations
- Don't return sensitive data
- Don't ignore CORS
- Don't skip input validation
- Don't hardcode configuration
- Don't neglect security headers
