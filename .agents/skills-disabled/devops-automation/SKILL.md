---
name: devops-automation
description: Comprehensive guide to CI/CD, infrastructure automation, and deployment strategies
---
# DevOps Automation

Complete guide to CI/CD pipelines, infrastructure automation, and deployment strategies.

## Overview

This skill covers DevOps practices, CI/CD implementation, containerization, and cloud deployment.

## CI/CD Fundamentals

### CI/CD Pipeline Stages

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Build  │──▶│  Test   │──▶│ Security│──▶│ Deploy  │──▶│ Monitor │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
     │             │             │             │             │
   Compile      Unit tests    SAST        Staging       Logging
   Lint        Integration   DAST        Production    Metrics
   Package      Coverage     Secrets      Blue/Green   Alerts
```

### Pipeline Best Practices

1. **Fail Fast:** Run quick tests first
2. **Parallelize:** Run independent jobs in parallel
3. **Cache:** Cache dependencies between runs
4. **Artifact:** Store build artifacts
5. **Notify:** Alert on failures
6. **Rollback:** Easy rollback mechanism

## Docker

### Dockerfile Best Practices

```dockerfile
# Use specific version tags
FROM node:20.11-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20.11-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy only necessary files
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    networks:
      - app-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - app-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local

networks:
  app-network:
    driver: bridge
```

## GitHub Actions

### Complete CI/CD Pipeline

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Check formatting
        run: npm run format:check

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage --ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      
      - name: Run security audit
        run: npm audit --audit-level=high
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build:
    runs-on: ubuntu-latest
    needs: [test, security]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
          retention-days: 5

  docker:
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    runs-on: ubuntu-latest
    needs: docker
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging..."
          # Add deployment commands
          
      - name: Run smoke tests
        run: |
          curl -f https://staging.example.com/health || exit 1
          
      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployed to staging'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
        if: always()

  deploy-production:
    runs-on: ubuntu-latest
    needs: docker
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Add deployment commands
          
      - name: Run smoke tests
        run: |
          curl -f https://example.com/health || exit 1
          
      - name: Create release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release ${{ github.run_number }}
          
      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployed to production'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

## Kubernetes

### Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: myapp
        version: v1
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: database-url
          volumeMounts:
            - name: config
              mountPath: /app/config
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: myapp-config
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - myapp
                topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - example.com
      secretName: myapp-tls
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-service
                port:
                  number: 80
```

## Deployment Strategies

### Blue/Green Deployment

```
           ┌──────────────┐
           │   Load       │
           │   Balancer   │
           └──────┬───────┘
                  │
        ┌─────────┴─────────┐
        │                   │
   ┌────▼────┐        ┌─────▼────┐
   │  Blue   │        │  Green   │
   │ (v1.0)  │        │ (v1.1)   │
   │ Active  │        │ Inactive │
   └─────────┘        └──────────┘
```

**Process:**
1. Deploy new version to green environment
2. Test green environment
3. Switch traffic to green
4. Keep blue for rollback

### Canary Deployment

```
           ┌──────────────┐
           │   Load       │
           │   Balancer   │
           └──────┬───────┘
                  │
     ┌────────────┼────────────┐
     │            │            │
┌────▼───┐   ┌───▼────┐  ┌────▼───┐
│Canary  │   │ Stable │  │ Stable │
│ (10%)  │   │ (45%)  │  │ (45%)  │
│v1.1    │   │ v1.0   │  │ v1.0   │
└────────┘   └────────┘  └────────┘
```

**Process:**
1. Deploy to small percentage of traffic
2. Monitor metrics
3. Gradually increase traffic
4. Full rollout or rollback

### Rolling Deployment

```
Time →

v1.0: [●●●●●]
v1.1:     [●●●●●]

Step 1: [○○●●●]  (40% v1.1)
Step 2: [○○○●●]  (60% v1.1)
Step 3: [○○○○●]  (80% v1.1)
Step 4: [○○○○○]  (100% v1.1)
```

## Infrastructure as Code

### Terraform Example

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "${var.project_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = var.common_tags
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = var.common_tags
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnets

  enable_deletion_protection = true

  tags = var.common_tags
}

# Outputs
output "alb_dns_name" {
  value = aws_lb.main.dns_name
}
```

## Monitoring & Observability

### Prometheus Metrics

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'myapp'
    static_configs:
      - targets: ['myapp:3000']
    metrics_path: '/metrics'
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Application Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

### Alerting Rules

```yaml
# alerts.yml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          description: Error rate is {{ $value }} per second
          
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High response time
          description: 95th percentile is {{ $value }} seconds
```

## Security Best Practices

1. **Use secrets management** (Vault, AWS Secrets Manager)
2. **Scan images for vulnerabilities**
3. **Run containers as non-root**
4. **Use network policies**
5. **Enable RBAC**
6. **Encrypt data at rest and in transit**
7. **Regular security audits**
8. **Keep dependencies updated**
9. **Use signed images**
10. **Implement proper logging**

## Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security scan complete
- [ ] Performance tested
- [ ] Rollback plan ready
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Documentation updated
- [ ] Team notified

### Post-Deployment
- [ ] Smoke tests passing
- [ ] Health checks green
- [ ] Metrics normal
- [ ] No errors in logs
- [ ] Performance acceptable
- [ ] User acceptance verified

## Summary

1. **Automate everything** possible
2. **Use containers** for consistency
3. **Implement CI/CD** pipeline
4. **Monitor everything**
5. **Have rollback plan**
6. **Security first**
7. **Document everything**
8. **Test in production-like environments**
9. **Use infrastructure as code**
10. **Continuous improvement**

---

## Multi-Environment Deployment with Automatic Domain Mapping

### Overview

Deploy applications to multiple environments (Local, Kubernetes, Server) with automatic domain mapping for seamless development workflow.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SDLC Deployment Pipeline                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                      │
│  │  Local  │    │   K8s   │    │ Server  │                      │
│  │  .local │    │.k8s.local│   │.domain │                      │
│  └────┬────┘    └────┬────┘    └────┬────┘                      │
│       │              │              │                            │
│       ▼              ▼              ▼                            │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                      │
│  │ Traefik │    │ Ingress │    │ Nginx/  │                      │
│  │         │    │+ExtDNS  │    │ Traefik │                      │
│  └─────────┘    └─────────┘    └─────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Local Environment (Docker Compose + Traefik)

**Setup:**

1. **Traefik Reverse Proxy** (`docker-compose.traefik.yml`)
```yaml
version: '3.8'
services:
  traefik:
    image: traefik:v3.0
    command:
      - --api.dashboard=true
      - --api.insecure=true
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - traefik-network
    restart: unless-stopped

networks:
  traefik-network:
    name: traefik-network
```

2. **Application with Domain** (`docker-compose.local.yml`)
```yaml
version: '3.8'
services:
  myapp:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.local`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"
    networks:
      - traefik-network

networks:
  traefik-network:
    external: true
```

3. **Local DNS Setup** (dnsmasq)
```bash
# macOS
brew install dnsmasq
echo "address=/.local/127.0.0.1" >> /usr/local/etc/dnsmasq.conf
sudo mkdir -p /etc/resolver
echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/local
brew services restart dnsmasq

# Linux
sudo apt install dnsmasq
echo "address=/.local/127.0.0.1" >> /etc/dnsmasq.conf
sudo systemctl restart dnsmasq
```

**Deploy:**
```bash
# One-time setup
docker network create traefik-network
docker-compose -f docker-compose.traefik.yml up -d

# Deploy app
docker-compose -f docker-compose.local.yml up -d

# Access: http://myapp.local
```

### Kubernetes Environment (Ingress + ExternalDNS)

**Components:**
1. **Ingress Controller** (Nginx or Traefik)
2. **ExternalDNS** (automatic DNS management)
3. **Cert-Manager** (automatic SSL)

**Ingress with Domain Mapping:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    external-dns.alpha.kubernetes.io/hostname: myapp.k8s.local
spec:
  tls:
    - hosts:
        - myapp.k8s.local
      secretName: myapp-tls
  rules:
    - host: myapp.k8s.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-service
                port:
                  number: 80
```

**Deploy:**
```bash
kubectl apply -f k8s/
# Access: https://myapp.k8s.local
```

### Server Environment (Terraform + Ansible)

**Terraform Infrastructure:**
```hcl
# Provision server
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
  tags = { Name = "${var.app_name}-server" }
}

# Configure DNS
resource "aws_route53_record" "app" {
  zone_id = var.route53_zone_id
  name    = "${var.app_name}.${var.domain}"
  type    = "A"
  records = [aws_instance.app.public_ip]
}
```

**Ansible Deployment:**
```yaml
- name: Deploy Application
  hosts: all
  tasks:
    - name: Install Docker
      apt: name=docker.io state=present
      
    - name: Deploy with Traefik
      docker_compose:
        project_src: /opt/{{ app_name }}
        state: present
```

**Deploy:**
```bash
terraform apply
ansible-playbook deploy.yml
# Access: https://myapp.example.com
```

### Domain Mapping Summary

| Environment | Domain Pattern | Tools | Access |
|------------|----------------|-------|--------|
| Local | `{app}.local` | Traefik + dnsmasq | `http://myapp.local` |
| K8s | `{app}.k8s.local` | Ingress + ExternalDNS | `https://myapp.k8s.local` |
| Server | `{app}.{domain}` | Terraform + Route53 | `https://myapp.example.com` |

### Quick Reference Commands

```bash
# Local deployment
docker-compose -f deploy/docker-compose.local.yml up -d

# Kubernetes deployment
kubectl apply -f k8s/

# Server deployment
terraform apply && ansible-playbook deploy.yml

# Check status
curl http://myapp.local/health
kubectl get pods -n myapp
ssh user@server 'docker ps'
```

---

## Use Case: Deploy Static Site to kind Cluster with Custom Domain

### Overview

Deploy a static Astro website to a local kind (Kubernetes in Docker) cluster with custom domain mapping (e.g., `unicard.io`).

### Prerequisites

- kind cluster running locally
- kubectl configured
- Docker installed
- /etc/hosts configured with custom domain

### Step 1: Project Structure

```
project/
├── unicard-landing/           # Application source
│   ├── src/                   # Source files
│   ├── dist/                  # Build output
│   ├── package.json
│   ├── Dockerfile             # Multi-stage build
│   └── nginx.conf             # nginx configuration
│
├── k8s/                       # Kubernetes manifests
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   └── kustomization.yaml
│
└── scripts/
    ├── deploy-kind.sh         # Deployment script
    └── teardown.sh            # Cleanup script
```

### Step 2: Create Dockerfile (Multi-stage Build)

```dockerfile
# Stage 1: Build the static site
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### Step 3: Create nginx.conf

```nginx
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    server {
        listen 80;
        server_name your-domain.io localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### Step 4: Create Kubernetes Manifests

#### namespace.yaml
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  labels:
    name: myapp
    app.kubernetes.io/name: myapp
```

#### deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
  labels:
    app.kubernetes.io/name: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app.kubernetes.io/name: myapp
    spec:
      containers:
        - name: nginx
          image: myapp:latest
          imagePullPolicy: Never  # For local kind cluster
          ports:
            - name: http
              containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 32Mi
            limits:
              cpu: 200m
              memory: 128Mi
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 3
            periodSeconds: 5
          securityContext:
            runAsNonRoot: true
            runAsUser: 101
            readOnlyRootFilesystem: true
          volumeMounts:
            - name: nginx-cache
              mountPath: /var/cache/nginx
            - name: nginx-run
              mountPath: /var/run
      volumes:
        - name: nginx-cache
          emptyDir: {}
        - name: nginx-run
          emptyDir: {}
```

#### service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: myapp
  labels:
    app.kubernetes.io/name: myapp
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: myapp
  ports:
    - name: http
      port: 80
      targetPort: http
```

#### ingress.yaml
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: myapp
  labels:
    app.kubernetes.io/name: myapp
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
    nginx.ingress.kubernetes.io/proxy-buffering: "on"
spec:
  ingressClassName: nginx
  rules:
    - host: your-domain.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp
                port:
                  number: 80
    - host: localhost
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp
                port:
                  number: 80
```

#### kustomization.yaml
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: myapp

resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
```

### Step 5: Create Deployment Script

```bash
#!/bin/bash
set -e

IMAGE_NAME="myapp"
IMAGE_TAG="latest"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

echo "Building Docker image..."
cd ./app-source
docker build -t "${FULL_IMAGE}" .

echo "Loading image into kind cluster..."
# Option 1: Using kind CLI (recommended)
kind load docker-image "${FULL_IMAGE}"

# Option 2: If kind CLI not available, load directly into nodes
# docker save ${FULL_IMAGE} -o /tmp/myapp.tar
# docker exec -i kind-control-plane ctr -n=k8s.io images import /dev/stdin < /tmp/myapp.tar
# docker exec -i kind-worker ctr -n=k8s.io images import /dev/stdin < /tmp/myapp.tar

echo "Checking nginx ingress controller..."
if ! kubectl get deployment -n ingress-nginx ingress-nginx-controller &> /dev/null; then
    echo "Installing nginx ingress controller..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=120s
fi

echo "Applying Kubernetes manifests..."
kubectl apply -k ../k8s/

echo "Waiting for deployment..."
kubectl rollout status deployment/myapp -n myapp --timeout=60s

echo "✓ Deployment complete!"
echo "Access at: http://your-domain.io"
```

### Step 6: Configure /etc/hosts

```bash
# Add to /etc/hosts
echo "127.0.0.1 your-domain.io" | sudo tee -a /etc/hosts
```

### Step 7: Deploy

```bash
# Make script executable
chmod +x scripts/deploy-kind.sh

# Run deployment
./scripts/deploy-kind.sh
```

### Step 8: Verify Deployment

```bash
# Check pods
kubectl get pods -n myapp

# Check service
kubectl get svc -n myapp

# Check ingress
kubectl get ingress -n myapp

# Test accessibility
curl -I http://your-domain.io

# View logs
kubectl logs -f -n myapp -l app.kubernetes.io/name=myapp
```

### Troubleshooting

#### Issue: Pods in CrashLoopBackOff with "Read-only file system"

**Cause:** nginx needs writable directories for cache and PID files.

**Solution:** Add emptyDir volumes to deployment:
```yaml
volumeMounts:
  - name: nginx-cache
    mountPath: /var/cache/nginx
  - name: nginx-run
    mountPath: /var/run
volumes:
  - name: nginx-cache
    emptyDir: {}
  - name: nginx-run
    emptyDir: {}
```

#### Issue: Service endpoints empty (pods not selected)

**Cause:** Service selector doesn't match pod labels exactly.

**Solution:** Ensure labels match exactly:
- Pod labels: `app.kubernetes.io/name: myapp`
- Service selector: `app.kubernetes.io/name: myapp`

#### Issue: 503 Service Unavailable

**Cause:** Ingress controller not ready or service not properly linked.

**Solution:**
1. Verify ingress controller is running
2. Check service endpoints have pod IPs
3. Verify ingressClassName is set to `nginx`

#### Issue: kind CLI not found

**Solution:** Load image directly into kind nodes:
```bash
docker save myapp:latest -o /tmp/myapp.tar
docker exec -i kind-control-plane ctr -n=k8s.io images import /dev/stdin < /tmp/myapp.tar
docker exec -i kind-worker ctr -n=k8s.io images import /dev/stdin < /tmp/myapp.tar
```

### Teardown

```bash
#!/bin/bash
kubectl delete -k k8s/ --ignore-not-found=true
docker rmi myapp:latest
```

### Summary

| Step | Action | Command |
|------|--------|---------|
| 1 | Build image | `docker build -t myapp:latest .` |
| 2 | Load to kind | `kind load docker-image myapp:latest` |
| 3 | Install ingress | `kubectl apply -f ingress-controller.yaml` |
| 4 | Apply manifests | `kubectl apply -k k8s/` |
| 5 | Configure DNS | `echo "127.0.0.1 your-domain.io" >> /etc/hosts` |
| 6 | Verify | `curl http://your-domain.io` |

### Key Learnings

1. **Use `imagePullPolicy: Never`** for local kind clusters to avoid image pull errors
2. **Add emptyDir volumes** for nginx writable directories
3. **Ensure label consistency** between pods, services, and deployments
4. **Use `ingressClassName: nginx`** instead of deprecated annotation
5. **Test health endpoints** before deploying to ensure probes work
6. **Avoid kustomize commonLabels** if it causes selector mismatches

