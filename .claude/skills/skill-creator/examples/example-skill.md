# Example: API Security Skill

This is a complete example of a knowledge-type skill for API security.

---

## SKILL.md Content

```markdown
---
name: api-security
description: REST API security best practices, authentication, and vulnerability prevention
---
# API Security

Comprehensive security guidelines for building secure REST APIs.

## Overview

This skill covers essential security practices for REST API development, including authentication, authorization, input validation, and common vulnerability prevention.

- **Purpose:** Secure API development
- **Scope:** Authentication, authorization, input validation, encryption
- **Audience:** Backend developers, security engineers

## When to Use

Use this skill when:
- Designing new API endpoints
- Reviewing API security
- Implementing authentication
- Preventing common vulnerabilities

## Authentication Patterns

### JWT Authentication

**When to use:** Stateless authentication for SPAs and mobile apps

**Implementation:**
\`\`\`typescript
import { sign, verify } from 'jsonwebtoken'

interface TokenPayload {
  userId: string
  email: string
  role: string
}

export function generateToken(payload: TokenPayload): string {
  return sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '1h',
    issuer: 'your-app',
    audience: 'your-app-users',
  })
}

export function verifyToken(token: string): TokenPayload {
  return verify(token, process.env.JWT_SECRET!, {
    issuer: 'your-app',
    audience: 'your-app-users',
  }) as TokenPayload
}
\`\`\`

**Middleware:**
\`\`\`typescript
import { type Request, type Response, type NextFunction } from 'express'
import { verifyToken } from './jwt'

export interface AuthRequest extends Request {
  user?: { userId: string; email: string; role: string }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    req.user = payload
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
\`\`\`

### API Key Authentication

**When to use:** Server-to-server communication, public APIs

**Implementation:**
\`\`\`typescript
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key']
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' })
  }

  const validKey = process.env.API_KEYS?.split(',').includes(apiKey as string)
  if (!validKey) {
    return res.status(403).json({ error: 'Invalid API key' })
  }

  next()
}
\`\`\`

## Input Validation

### Request Validation with Zod

\`\`\`typescript
import { z } from 'zod'

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/[0-9]/, 'Password must contain number'),
    name: z.string().min(2, 'Name too short').max(100, 'Name too long'),
  }),
})

export function validate(schema: z.AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({ body: req.body, query: req.query, params: req.params })
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        })
      }
      next(error)
    }
  }
}

// Usage
router.post('/users', validate(createUserSchema), userController.create)
\`\`\`

## Common Vulnerabilities

### SQL Injection Prevention

**Never do this:**
\`\`\`typescript
// ❌ VULNERABLE
const query = \`SELECT * FROM users WHERE email = '\${email}'\`
\`\`\`

**Always do this:**
\`\`\`typescript
// ✅ SAFE - Using parameterized queries
const query = 'SELECT * FROM users WHERE email = ?'
const results = await db.execute(query, [email])

// ✅ SAFE - Using ORM
const user = await prisma.user.findUnique({ where: { email } })
\`\`\`

### XSS Prevention

**Never do this:**
\`\`\`typescript
// ❌ VULNERABLE
res.send(\`<div>\${userInput}</div>\`)
\`\`\`

**Always do this:**
\`\`\`typescript
// ✅ SAFE - Use templating engines that auto-escape
res.render('template', { userInput })

// ✅ SAFE - Set Content-Type header
res.setHeader('Content-Type', 'application/json')
res.json({ data: userInput })

// ✅ SAFE - Use Helmet.js for headers
import helmet from 'helmet'
app.use(helmet())
\`\`\`

### Rate Limiting

\`\`\`typescript
import rateLimit from 'express-rate-limit'

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests' },
  standardHeaders: true,
})

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: { error: 'Too many login attempts' },
})

app.use('/api', apiLimiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
\`\`\`

## Security Headers

\`\`\`typescript
import helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))
\`\`\`

## Security Checklist

### Authentication
- [ ] Use strong password hashing (bcrypt, argon2)
- [ ] Implement rate limiting on auth endpoints
- [ ] Use secure, random tokens for sessions
- [ ] Set appropriate token expiration
- [ ] Implement refresh token rotation
- [ ] Log authentication attempts

### Authorization
- [ ] Implement role-based access control
- [ ] Check permissions on every request
- [ ] Use principle of least privilege
- [ ] Validate resource ownership

### Input/Output
- [ ] Validate all input (body, query, params)
- [ ] Sanitize output to prevent XSS
- [ ] Use parameterized queries
- [ ] Limit request body size
- [ ] Validate content types

### Headers
- [ ] Use Helmet.js for security headers
- [ ] Set HSTS header
- [ ] Configure CSP
- [ ] Set X-Frame-Options
- [ ] Set X-Content-Type-Options

### Infrastructure
- [ ] Use HTTPS everywhere
- [ ] Keep dependencies updated
- [ ] Enable logging and monitoring
- [ ] Implement CORS properly
- [ ] Use environment variables for secrets

## Best Practices

### Do's ✅
- Use HTTPS for all endpoints
- Hash passwords with bcrypt/argon2
- Validate all input
- Use parameterized queries
- Implement rate limiting
- Log security events
- Keep dependencies updated
- Use security headers

### Don'ts ❌
- Store passwords in plain text
- Use weak encryption (MD5, SHA1)
- Trust client input
- Return detailed error messages
- Expose stack traces in production
- Use GET for mutations
- Store secrets in code
- Skip authentication checks

## Quick Reference

| Vulnerability | Prevention |
|--------------|------------|
| SQL Injection | Parameterized queries, ORM |
| XSS | Output encoding, CSP, Helmet |
| CSRF | CSRF tokens, SameSite cookies |
| Brute Force | Rate limiting, account lockout |
| Session Hijacking | HTTPS, secure cookies, token rotation |
| IDOR | Check resource ownership |
| Mass Assignment | Whitelist allowed fields |
| JWT Issues | Short expiration, refresh tokens |

## Related Skills

- **authentication** - Detailed auth implementation
- **api-development** - API design patterns
- **code-review** - Security review checklist
\`\`\`

---

## How to Create This Skill

Using the CLI:

\`\`\`bash
cd skills/skill-creator/scripts
npm install
npx tsx create-skill.ts -n api-security -t knowledge -d "REST API security best practices" --with-examples
\`\`\`

Then edit the generated \`SKILL.md\` with the content above.
