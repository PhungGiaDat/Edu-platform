---
name: authentication
description: OAuth/OIDC, JWT, session management, RBAC, and security best practices
---
# Authentication & Authorization

Comprehensive patterns for implementing secure authentication and authorization.

## Authentication Methods

| Method | Use Case | Pros | Cons |
|--------|----------|------|------|
| **Session-based** | Traditional web apps | Simple, secure | Server state, scaling |
| **JWT** | SPAs, mobile, APIs | Stateless, scalable | Token revocation |
| **OAuth 2.0** | Social login, SSO | Delegated auth | Complex setup |
| **Magic Link** | Passwordless | User-friendly | Email dependency |
| **MFA** | High security | Extra protection | UX friction |

## Session-based Authentication

### Implementation

```typescript
// middleware/session.ts
import session from 'express-session'
import RedisStore from 'connect-redis'
import { createClient } from 'redis'

const redisClient = createClient({ url: process.env.REDIS_URL })
await redisClient.connect()

export const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
})

// Usage in route
app.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await authenticateUser(email, password)
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  
  req.session.userId = user.id
  res.json({ user })
})

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' })
    res.clearCookie('connect.sid')
    res.json({ message: 'Logged out' })
  })
})
```

### Session Store Schema

```sql
CREATE TABLE sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_expire ON sessions(expire);
```

## JWT Authentication

### Token Generation

```typescript
// utils/jwt.ts
import jwt from 'jsonwebtoken'

interface TokenPayload {
  userId: string
  email: string
  role: string
}

interface TokenPair {
  accessToken: string
  refreshToken: string
}

export function generateTokens(payload: TokenPayload): TokenPair {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '15m',
    issuer: 'your-app',
    audience: 'your-app-users',
  })

  const refreshToken = jwt.sign(
    { userId: payload.userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  )

  return { accessToken, refreshToken }
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!, {
    issuer: 'your-app',
    audience: 'your-app-users',
  }) as TokenPayload
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string }
}
```

### Token Refresh Flow

```typescript
// routes/auth.ts
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' })
  }

  try {
    // Verify refresh token
    const { userId } = verifyRefreshToken(refreshToken)
    
    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${refreshToken}`)
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token revoked' })
    }
    
    // Get user
    const user = await userService.findById(userId)
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }
    
    // Generate new tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
    
    // Blacklist old refresh token
    await redis.setex(`blacklist:${refreshToken}`, 7 * 24 * 60 * 60, '1')
    
    res.json(tokens)
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body
  
  if (refreshToken) {
    // Blacklist the refresh token
    await redis.setex(`blacklist:${refreshToken}`, 7 * 24 * 60 * 60, '1')
  }
  
  res.json({ message: 'Logged out' })
})
```

### JWT Middleware

```typescript
// middleware/jwt.ts
import { type Request, type Response, type NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'

export interface AuthRequest extends Request {
  user?: { userId: string; email: string; role: string }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing' })
  }
  
  const token = authHeader.substring(7)
  
  try {
    const payload = verifyAccessToken(token)
    req.user = payload
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

## OAuth 2.0 / OIDC

### Google OAuth

```typescript
// routes/oauth.ts
import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${process.env.APP_URL}/auth/google/callback`,
})

// Step 1: Redirect to Google
router.get('/google', (req, res) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
    state: req.query.redirect_uri as string,
  })
  res.redirect(url)
})

// Step 2: Handle callback
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query
  
  try {
    // Exchange code for tokens
    const { tokens } = await client.getToken(code as string)
    
    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    
    const payload = ticket.getPayload()
    
    // Find or create user
    let user = await userService.findByEmail(payload!.email!)
    if (!user) {
      user = await userService.create({
        email: payload!.email!,
        name: payload!.name!,
        emailVerified: true,
        authProvider: 'google',
        providerId: payload!.sub,
      })
    }
    
    // Generate app tokens
    const appTokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
    
    // Redirect to frontend with tokens
    const redirectUrl = new URL(state || process.env.APP_URL!)
    redirectUrl.searchParams.set('accessToken', appTokens.accessToken)
    redirectUrl.searchParams.set('refreshToken', appTokens.refreshToken)
    
    res.redirect(redirectUrl.toString())
  } catch (error) {
    res.redirect(`${process.env.APP_URL}/login?error=oauth_failed`)
  }
})
```

### GitHub OAuth

```typescript
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

router.get('/github', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex')
  res.cookie('oauth_state', state, { httpOnly: true, maxAge: 300000 })
  
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', GITHUB_CLIENT_ID)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'user:email')
  
  res.redirect(url.toString())
})

router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query
  
  // Verify state
  if (state !== req.cookies.oauth_state) {
    return res.status(400).json({ error: 'Invalid state' })
  }
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  })
  
  const { access_token } = await tokenResponse.json()
  
  // Get user info
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  
  const githubUser = await userResponse.json()
  
  // Find or create user...
})
```

## Password Hashing

```typescript
// utils/password.ts
import bcrypt from 'bcrypt'
import crypto from 'crypto'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
```

## Password Reset Flow

```typescript
// routes/password.ts

// Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  
  const user = await userService.findByEmail(email)
  if (!user) {
    // Don't reveal if user exists
    return res.json({ message: 'If the email exists, a reset link has been sent' })
  }
  
  // Generate reset token
  const resetToken = generateResetToken()
  const resetTokenHash = hashToken(resetToken)
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  
  await userService.update(user.id, {
    resetTokenHash,
    resetTokenExpiry,
  })
  
  // Send email
  await sendEmail({
    to: user.email,
    subject: 'Password Reset',
    html: `
      <p>Click the link below to reset your password:</p>
      <a href="${process.env.APP_URL}/reset-password?token=${resetToken}">
        Reset Password
      </a>
      <p>This link expires in 1 hour.</p>
    `,
  })
  
  res.json({ message: 'If the email exists, a reset link has been sent' })
})

// Reset password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  
  const resetTokenHash = hashToken(token)
  
  const user = await userService.findByResetToken(resetTokenHash)
  
  if (!user || user.resetTokenExpiry < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' })
  }
  
  const passwordHash = await hashPassword(password)
  
  await userService.update(user.id, {
    passwordHash,
    resetTokenHash: null,
    resetTokenExpiry: null,
  })
  
  // Invalidate all existing sessions
  await sessionService.deleteAllForUser(user.id)
  
  res.json({ message: 'Password reset successfully' })
})
```

## Role-Based Access Control (RBAC)

### Database Schema

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Full system access', ARRAY['*']),
('manager', 'Manage users and content', ARRAY['users:read', 'users:write', 'content:*']),
('user', 'Basic user access', ARRAY['content:read', 'profile:write']);
```

### Permission Middleware

```typescript
// middleware/permissions.ts
import { type AuthRequest, type Response, type NextFunction } from 'express'

export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const userPermissions = await getUserPermissions(req.user.userId)
    
    if (!hasPermission(userPermissions, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    
    next()
  }
}

export function requireRole(role: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const userRoles = await getUserRoles(req.user.userId)
    
    if (!userRoles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient role' })
    }
    
    next()
  }
}

function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  // Check for wildcard
  if (userPermissions.includes('*')) return true
  
  const [resource, action] = requiredPermission.split(':')
  
  return userPermissions.some(perm => {
    if (perm === '*') return true
    if (perm === requiredPermission) return true
    
    const [permResource, permAction] = perm.split(':')
    
    // Check resource wildcard (e.g., "content:*" matches "content:read")
    if (permResource === resource && permAction === '*') return true
    
    return false
  })
}

// Usage
router.delete('/users/:id', 
  authenticate, 
  requirePermission('users:delete'), 
  userController.delete
)

router.get('/admin/*', 
  authenticate, 
  requireRole('admin'), 
  adminRouter
)
```

### Resource-Based Access Control

```typescript
// middleware/resourceAccess.ts
export function requireResourceAccess(
  resourceType: string,
  action: 'read' | 'write' | 'delete'
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const resourceId = req.params.id
    
    const hasAccess = await checkResourceAccess(
      req.user!.userId,
      resourceType,
      resourceId,
      action
    )
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    next()
  }
}

async function checkResourceAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string
): Promise<boolean> {
  // Check ownership
  if (resourceType === 'post') {
    const post = await postRepository.findById(resourceId)
    return post?.authorId === userId
  }
  
  // Check team membership
  if (resourceType === 'team') {
    return teamRepository.isMember(resourceId, userId)
  }
  
  // Check organization
  if (resourceType === 'organization') {
    const org = await orgRepository.findById(resourceId)
    return org?.members.some(m => m.userId === userId)
  }
  
  return false
}

// Usage
router.get('/posts/:id', 
  authenticate, 
  requireResourceAccess('post', 'read'), 
  postController.get
)

router.put('/posts/:id', 
  authenticate, 
  requireResourceAccess('post', 'write'), 
  postController.update
)
```

## Multi-Factor Authentication

### TOTP (Time-based OTP)

```typescript
import authenticator from 'otplib/authenticator'
import crypto from 'crypto'

// Generate secret
export function generateMFASecret(email: string): { secret: string; uri: string } {
  const secret = authenticator.generateSecret()
  const uri = authenticator.keyuri(email, 'YourApp', secret)
  
  return { secret, uri }
}

// Verify TOTP
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify(token, secret)
  } catch {
    return false
  }
}

// Enable MFA
router.post('/mfa/enable', authenticate, async (req: AuthRequest, res) => {
  const { token } = req.body
  const user = await userService.findById(req.user!.userId)
  
  if (!user.mfaSecret) {
    return res.status(400).json({ error: 'MFA not set up' })
  }
  
  if (!verifyTOTP(token, user.mfaSecret)) {
    return res.status(400).json({ error: 'Invalid token' })
  }
  
  await userService.update(user.id, { mfaEnabled: true })
  
  // Generate recovery codes
  const recoveryCodes = generateRecoveryCodes()
  await userService.setRecoveryCodes(user.id, recoveryCodes)
  
  res.json({ message: 'MFA enabled', recoveryCodes })
})

// Login with MFA
router.post('/login/mfa', async (req, res) => {
  const { userId, token } = req.body
  
  const user = await userService.findById(userId)
  
  if (!user || !user.mfaEnabled) {
    return res.status(400).json({ error: 'MFA not enabled' })
  }
  
  if (!verifyTOTP(token, user.mfaSecret)) {
    // Check recovery codes
    const recoveryCode = await userService.useRecoveryCode(user.id, token)
    if (!recoveryCode) {
      return res.status(400).json({ error: 'Invalid token' })
    }
  }
  
  const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role })
  res.json(tokens)
})

function generateRecoveryCodes(): string[] {
  return Array.from({ length: 8 }, () => 
    crypto.randomBytes(4).toString('hex').toUpperCase()
  )
}
```

## Security Best Practices

### Password Requirements

```typescript
const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character')
  .refine(
    (pwd) => !commonPasswords.includes(pwd.toLowerCase()),
    'Password is too common'
  )
```

### Rate Limiting Auth Endpoints

```typescript
import rateLimit from 'express-rate-limit'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many attempts, try again later' },
  standardHeaders: true,
  keyGenerator: (req) => {
    // Rate limit by IP and email
    return `${req.ip}:${req.body.email || 'unknown'}`
  },
})

app.post('/login', authLimiter, loginHandler)
app.post('/register', authLimiter, registerHandler)
app.post('/forgot-password', authLimiter, forgotPasswordHandler)
```

### Security Headers

```typescript
import helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))
```

## Security Checklist

### Authentication
- [ ] Use secure password hashing (bcrypt, argon2)
- [ ] Implement rate limiting on auth endpoints
- [ ] Use secure session configuration
- [ ] Implement password reset flow
- [ ] Support MFA for sensitive operations
- [ ] Validate and sanitize all input
- [ ] Use HTTPS everywhere
- [ ] Implement proper CORS

### Authorization
- [ ] Implement RBAC or ABAC
- [ ] Check permissions on every request
- [ ] Validate resource ownership
- [ ] Log access attempts
- [ ] Implement audit trails

### Tokens
- [ ] Use short-lived access tokens
- [ ] Implement refresh token rotation
- [ ] Store refresh tokens securely
- [ ] Implement token revocation
- [ ] Use secure cookie settings

### Session
- [ ] Use secure session cookies
- [ ] Implement session fixation protection
- [ ] Regenerate session on login
- [ ] Implement session timeout
- [ ] Allow users to view/revoke sessions
