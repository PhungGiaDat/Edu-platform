---
name: api-design
description: Design RESTful/GraphQL APIs with schemas, endpoints, and documentation
---
# API Design

Design RESTful and GraphQL APIs with proper schemas, endpoints, authentication, and documentation.

## API Design Principles

| Principle | Description |
|-----------|-------------|
| **Consistency** | Uniform naming, error handling, response format |
| **Simplicity** | Intuitive endpoints, clear parameters |
| **Versioning** | Predictable evolution path |
| **Security** | Authentication, authorization, rate limiting |
| **Documentation** | OpenAPI/Swagger specs |

## RESTful API Design

### URL Structure
```
# Resource-based URLs
GET    /api/v1/users           # List users
POST   /api/v1/users           # Create user
GET    /api/v1/users/{id}      # Get user
PUT    /api/v1/users/{id}      # Update user
DELETE /api/v1/users/{id}      # Delete user

# Nested resources
GET    /api/v1/users/{id}/orders
POST   /api/v1/users/{id}/orders
GET    /api/v1/users/{id}/orders/{orderId}

# Actions (use verbs sparingly)
POST   /api/v1/users/{id}/activate
POST   /api/v1/orders/{id}/cancel
```

### Naming Conventions
```
# Use plural nouns
✅ /users
❌ /user

# Use kebab-case for multi-word
✅ /order-items
❌ /orderItems
❌ /order_items

# Use query params for filtering
✅ /products?status=active&category=electronics
❌ /products/active/electronics

# Use query params for pagination
✅ /products?page=1&limit=20&sort=-created_at
```

### HTTP Methods
```
GET     - Retrieve resource (idempotent, safe)
POST    - Create resource
PUT     - Replace resource (idempotent)
PATCH   - Partial update
DELETE  - Remove resource (idempotent)
HEAD    - Get headers only
OPTIONS - Get allowed methods
```

### Status Codes
```
# Success
200 OK                 - Successful GET, PUT, PATCH
201 Created            - Successful POST
202 Accepted           - Async operation started
204 No Content         - Successful DELETE

# Client Errors
400 Bad Request        - Invalid input
401 Unauthorized       - Missing/invalid auth
403 Forbidden          - Insufficient permissions
404 Not Found          - Resource doesn't exist
409 Conflict           - Resource conflict
422 Unprocessable      - Validation error
429 Too Many Requests  - Rate limited

# Server Errors
500 Internal Error     - Server error
502 Bad Gateway        - Upstream error
503 Unavailable        - Service down
504 Gateway Timeout    - Upstream timeout
```

### Request/Response Format

#### Standard Response
```json
{
  "data": {
    "id": "usr_123abc",
    "type": "user",
    "attributes": {
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2025-01-15T10:30:00Z"
    },
    "relationships": {
      "orders": {
        "links": {
          "related": "/api/v1/users/usr_123abc/orders"
        }
      }
    }
  },
  "meta": {
    "requestId": "req_456def",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

#### List Response with Pagination
```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "perPage": 20,
    "totalPages": 8
  },
  "links": {
    "self": "/api/v1/users?page=1",
    "next": "/api/v1/users?page=2",
    "prev": null,
    "first": "/api/v1/users?page=1",
    "last": "/api/v1/users?page=8"
  }
}
```

#### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  },
  "meta": {
    "requestId": "req_789ghi",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: User API
  version: 1.0.0
  description: API for user management

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://api-staging.example.com/v1
    description: Staging

paths:
  /users:
    get:
      summary: List all users
      tags: [Users]
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
        - name: status
          in: query
          schema:
            type: string
            enum: [active, inactive, pending]
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimited'

    post:
      summary: Create a new user
      tags: [Users]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUser'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          description: Email already exists

  /users/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          pattern: '^usr_[a-zA-Z0-9]+$'

    get:
      summary: Get a user by ID
      tags: [Users]
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFound'

    put:
      summary: Update a user
      tags: [Users]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUser'
      responses:
        '200':
          description: User updated
        '404':
          $ref: '#/components/responses/NotFound'

    delete:
      summary: Delete a user
      tags: [Users]
      responses:
        '204':
          description: User deleted
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          example: usr_123abc
        email:
          type: string
          format: email
        name:
          type: string
        status:
          type: string
          enum: [active, inactive, pending]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
      required: [id, email, name]

    CreateUser:
      type: object
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
          maxLength: 100
        password:
          type: string
          format: password
          minLength: 8
      required: [email, name, password]

    UpdateUser:
      type: object
      properties:
        name:
          type: string
        status:
          type: string
          enum: [active, inactive]

    UserList:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        meta:
          $ref: '#/components/schemas/PaginationMeta'

    PaginationMeta:
      type: object
      properties:
        total:
          type: integer
        page:
          type: integer
        perPage:
          type: integer
        totalPages:
          type: integer

    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: array
              items:
                type: object
                properties:
                  field:
                    type: string
                  message:
                    type: string

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Unauthorized:
      description: Unauthorized
    NotFound:
      description: Resource not found
    RateLimited:
      description: Too many requests

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

security:
  - BearerAuth: []
  - ApiKeyAuth: []
```

## GraphQL API Design

### Schema Definition
```graphql
type User {
  id: ID!
  email: String!
  name: String!
  status: UserStatus!
  orders(first: Int, after: String): OrderConnection!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum UserStatus {
  ACTIVE
  INACTIVE
  PENDING
}

type Order {
  id: ID!
  user: User!
  items: [OrderItem!]!
  total: Float!
  status: OrderStatus!
  createdAt: DateTime!
}

type OrderItem {
  id: ID!
  product: Product!
  quantity: Int!
  price: Float!
}

type Product {
  id: ID!
  name: String!
  description: String
  price: Float!
  stock: Int!
}

# Pagination
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

scalar DateTime

# Queries
type Query {
  me: User
  user(id: ID!): User
  users(
    first: Int
    after: String
    filter: UserFilter
    sort: UserSort
  ): UserConnection!
  
  order(id: ID!): Order
  product(id: ID!): Product
}

input UserFilter {
  status: UserStatus
  email: String
  search: String
}

input UserSort {
  field: UserSortField!
  direction: SortDirection!
}

enum UserSortField {
  NAME
  EMAIL
  CREATED_AT
}

enum SortDirection {
  ASC
  DESC
}

# Mutations
type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): DeleteResult!
  
  createOrder(input: CreateOrderInput!): Order!
  cancelOrder(id: ID!): Order!
}

input CreateUserInput {
  email: String!
  name: String!
  password: String!
}

input UpdateUserInput {
  name: String
  status: UserStatus
}

input CreateOrderInput {
  items: [CreateOrderItemInput!]!
}

input CreateOrderItemInput {
  productId: ID!
  quantity: Int!
}

type DeleteResult {
  success: Boolean!
  message: String
}

# Subscriptions
type Subscription {
  onUserCreated: User!
  onOrderUpdated(userId: ID!): Order!
}
```

### Query Examples
```graphql
# Get current user with orders
query Me {
  me {
    id
    email
    name
    orders(first: 10) {
      edges {
        node {
          id
          total
          status
        }
      }
      totalCount
    }
  }
}

# List users with filtering and pagination
query Users($first: Int, $after: String, $filter: UserFilter) {
  users(first: $first, after: $after, filter: $filter) {
    edges {
      node {
        id
        email
        name
        status
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}

# Create user mutation
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    email
    name
  }
}
```

## Authentication Patterns

### JWT Authentication
```typescript
interface TokenPayload {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

// Headers
{
  "Authorization": "Bearer <token>"
}
```

### API Key Authentication
```typescript
// Header-based
{
  "X-API-Key": "<api_key>"
}

// Query parameter (less secure)
GET /api/v1/users?api_key=<api_key>
```

### OAuth 2.0 Flow
```
1. Client redirects to auth server
   GET /oauth/authorize?
     client_id=xxx&
     redirect_uri=https://app.com/callback&
     response_type=code&
     scope=read write

2. User authenticates and authorizes
3. Auth server redirects back with code
   https://app.com/callback?code=auth_code

4. Client exchanges code for tokens
   POST /oauth/token
   {
     "grant_type": "authorization_code",
     "code": "auth_code",
     "client_id": "xxx",
     "client_secret": "xxx",
     "redirect_uri": "https://app.com/callback"
   }

5. Receive tokens
   {
     "access_token": "xxx",
     "refresh_token": "xxx",
     "expires_in": 3600,
     "token_type": "Bearer"
   }
```

## Rate Limiting

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Response
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "retryAfter": 60
  }
}
```

## Versioning Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| URL Path | /v1/users | Clear, cacheable | URL pollution |
| Query Param | /users?v=1 | Flexible | Easy to miss |
| Header | Accept-Version: v1 | Clean URLs | Discovery issue |
| Content-Type | Accept: application/vnd.api.v1+json | RESTful | Complex |

## Best Practices

### Do's
- Use consistent naming conventions
- Version your APIs
- Document all endpoints
- Return meaningful errors
- Implement rate limiting
- Use HTTPS everywhere
- Validate all input

### Don'ts
- Use verbs in URLs
- Return HTML errors
- Expose internal IDs
- Skip authentication
- Ignore pagination
- Break backward compatibility
- Use synchronous long operations
