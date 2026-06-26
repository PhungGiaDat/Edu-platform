# Eduplatform Deployment Guide

## Overview

This guide covers all deployment options for the Eduplatform application stack.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │
│   (Vercel)     │◀────│   (FastAPI)     │
└─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        │               │   MongoDB       │
        │               │   (Atlas/Local) │
        │               └─────────────────┘
        ▼
┌─────────────────┐
│   Vercel CDN    │
└─────────────────┘
```

## Prerequisites

- Node.js 20+
- Python 3.10+
- Docker & Docker Compose (for local deployment)
- MongoDB 7+

## Quick Start - Local Development

```bash
# Clone and setup
git clone <repo-url>
cd Edu-platform

# Setup backend
cd backend
cp .env.example .env
# Edit .env with your MongoDB connection string

# Setup frontend
cd ../frontend-web
cp .env.example .env.local
# Edit .env.local with your backend URL

# Run with Docker Compose
cd ..
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Deployment Options

### Option 1: Vercel (Frontend) + Render (Backend)

#### Frontend - Vercel

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Deploy
   cd frontend-web
   vercel
   ```

2. **Configure Environment Variables**
   In Vercel Dashboard → Settings → Environment Variables:
   ```
   VITE_API_BASE = https://your-backend-url.onrender.com
   VITE_WS_URL = wss://your-backend-url.onrender.com
   ```

3. **Custom Domain (Optional)**
   Settings → Domains → Add domain

#### Backend - Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository

2. **Create Web Service**
   - New → Web Service
   - Connect repository: `backend`
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn main:app --bind 0.0.0.0:$PORT --worker-class uvicorn.workers.UvicornWorker`

3. **Configure Environment Variables**
   | Variable | Value |
   |----------|-------|
   | `MONGO_URL` | Your MongoDB Atlas connection string |
   | `SECRET_KEY` | Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
   | `DEBUG` | `false` |
   | `ALLOWED_ORIGINS` | `https://your-vercel-url.vercel.app` |

4. **Health Check**
   Render automatically checks `/health` endpoint

### Option 2: Full Docker Deployment

#### Build Images

```bash
# Build backend
docker build -f Dockerfile.backend -t eduplatform-backend:latest ./backend

# Build frontend
docker build -f Dockerfile.frontend -t eduplatform-frontend:latest ./frontend-web

# Or use docker-compose
docker-compose build
```

#### Deploy with Docker Compose

```bash
# Production deployment
docker-compose up -d --build

# Scale backend
docker-compose up -d --scale backend=3

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

#### Docker with Nginx Reverse Proxy

```bash
# Start with nginx proxy
docker-compose --profile production up -d

# Access via nginx
# http://localhost:80 → Frontend
# http://localhost:80/api → Backend API
```

### Option 3: Kubernetes

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eduplatform-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: eduplatform-backend
  template:
    spec:
      containers:
        - name: backend
          image: your-dockerhub/eduplatform-backend:latest
          ports:
            - containerPort: 8000
          env:
            - name: MONGO_URL
              valueFrom:
                secretKeyRef:
                  name: eduplatform-secrets
                  key: mongo-url
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: eduplatform-backend-service
spec:
  selector:
    app: eduplatform-backend
  ports:
    - port: 80
      targetPort: 8000
  type: LoadBalancer
```

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URL` | Yes | - | MongoDB connection string |
| `MONGO_DB` | No | `edu_platform` | Database name |
| `SECRET_KEY` | Yes | - | JWT secret key |
| `DEBUG` | No | `false` | Enable debug mode |
| `ALLOWED_ORIGINS` | No | `*` | CORS origins |
| `ALGORITHM` | No | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | Token expiration |
| `GOOGLE_API_KEY` | No | - | Gemini API key |

### Frontend (.env.local)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE` | Yes | `http://localhost:8000` | Backend API URL |
| `VITE_WS_URL` | Yes | `ws://localhost:8000` | WebSocket URL |
| `VITE_APP_ENV` | No | `development` | App environment |

## CI/CD Setup

### GitHub Actions Secrets

Configure these secrets in GitHub → Settings → Secrets:

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `RENDER_TOKEN` | Render API token |
| `RENDER_BACKEND_SERVICE_ID` | Render service ID |

### Workflow Triggers

| Event | Action |
|-------|--------|
| Push to `main` | Deploy backend (Render) + frontend (Vercel production) |
| Push to `develop` | Deploy backend (staging) + frontend (staging) |
| Pull Request | Deploy preview URL |

## Health Checks

### Backend
- **Endpoint**: `GET /health`
- **Response**: `{"status": "ok", "app": "Eduplatform AR API"}`

### Frontend
- **Endpoint**: `GET /health`
- **Response**: `ok` (plain text)

### Docker Health Check
```bash
# Check backend health
curl -f http://localhost:8000/health

# Check frontend health
curl -f http://localhost:3000/health
```

## Monitoring

### Application Logs
```bash
# View backend logs
docker-compose logs -f backend

# View frontend logs
docker-compose logs -f frontend
```

### Database Connection
```bash
# Test MongoDB connection
mongosh "mongodb://localhost:27017/edu_platform" --eval "db.runCommand({ping:1})"
```

## Troubleshooting

### Common Issues

1. **Frontend can't reach backend**
   - Check CORS settings in backend `.env`
   - Verify `VITE_API_BASE` matches backend URL

2. **Database connection failed**
   - Verify MongoDB is running
   - Check connection string format
   - Ensure network connectivity

3. **Build fails**
   - Clear node_modules and reinstall
   - Check Node.js version matches requirements
   - Verify Docker daemon is running

### Useful Commands

```bash
# Reset everything
docker-compose down -v
docker system prune -af

# Rebuild without cache
docker-compose build --no-cache

# View resource usage
docker stats

# Enter container shell
docker exec -it eduplatform-backend /bin/sh
```

## Security Checklist

- [ ] Change default `SECRET_KEY`
- [ ] Use strong MongoDB password
- [ ] Enable CORS for specific domains only
- [ ] Set `DEBUG=false` in production
- [ ] Use HTTPS everywhere
- [ ] Configure firewall rules
- [ ] Enable database authentication
- [ ] Use environment variables for secrets (never hardcode)

## Support

For deployment issues, check:
1. Application logs
2. GitHub Actions workflow runs
3. Platform-specific dashboards (Vercel, Render)
