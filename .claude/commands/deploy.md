---
description: Deploy application to local, Kubernetes, or server with automatic domain mapping
allowed-tools: Agent, Read, Bash, Write, Edit, Glob, Grep
---

Deploy: $ARGUMENTS

## Command Usage

```
/deploy [app_name] to [environment] [options]
```

**Environments:**
- `local` - Docker Compose + Traefik (e.g., `myapp.local`)
- `k8s` - Kubernetes + Ingress (e.g., `myapp.k8s.local`)
- `server` - Traditional server (e.g., `myapp.example.com`)

**Options:**
- `with domain [domain]` - Custom domain name
- `--ssl` - Enable SSL/TLS
- `--no-ssl` - Disable SSL/TLS

**Examples:**
- `/deploy myapp to local` → http://myapp.local
- `/deploy myapp to k8s` → https://myapp.k8s.local
- `/deploy myapp to server with domain api.example.com` → https://api.example.com

---

## File Output

Save deployment report to:
- **Location:** `./docs/report/` folder
- **Filename:** `DEPLOY_YYYYmmdd_HHMMSS.md`

---

## Deployment Process

### Phase 1: Environment Detection

1. Detect target environment (local, k8s, server)
2. Generate domain name based on app name and environment
3. Check prerequisites for the environment

### Phase 2: Configuration Generation

Based on environment, generate appropriate files:

#### Local Deployment
```
./deploy/
├── docker-compose.traefik.yml    # Traefik reverse proxy
├── docker-compose.local.yml      # Application config
└── setup-local-dns.sh            # dnsmasq setup script
```

#### Kubernetes Deployment
```
./k8s/
├── namespace.yaml
├── deployment.yaml
├── service.yaml
├── ingress.yaml
├── configmap.yaml
└── secrets.yaml
```

#### Server Deployment
```
./terraform/
├── main.tf
├── variables.tf
└── outputs.tf

./ansible/
├── deploy.yml
├── inventory
└── templates/
```

### Phase 3: Deployment Execution

#### Local Environment
```bash
# 1. Create Traefik network (one-time)
docker network create traefik-network

# 2. Start Traefik (one-time)
docker-compose -f deploy/docker-compose.traefik.yml up -d

# 3. Deploy application
docker-compose -f deploy/docker-compose.local.yml up -d

# 4. Verify
curl http://myapp.local/health
```

#### Kubernetes Environment
```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Deploy application
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# 3. Verify
kubectl rollout status deployment/myapp -n myapp
curl https://myapp.k8s.local/health
```

#### Server Environment
```bash
# 1. Provision infrastructure
cd terraform && terraform apply

# 2. Configure and deploy
cd ../ansible && ansible-playbook deploy.yml

# 3. Verify
curl https://myapp.example.com/health
```

### Phase 4: Verification

- [ ] Health check endpoint responds
- [ ] Domain resolves correctly
- [ ] SSL certificate valid (if enabled)
- [ ] Application logs show no errors
- [ ] Performance metrics within bounds

---

## Deployment Checklist

### Pre-Deployment
- [ ] Application builds successfully
- [ ] Tests pass
- [ ] Environment variables documented
- [ ] Secrets configured
- [ ] Domain name available

### During Deployment
- [ ] Deploy to target environment
- [ ] Configure domain routing
- [ ] Set up SSL/TLS (if applicable)
- [ ] Verify health checks
- [ ] Monitor deployment logs

### Post-Deployment
- [ ] Smoke tests pass
- [ ] Domain accessible
- [ ] SSL working (if applicable)
- [ ] Monitoring alerts configured
- [ ] Documentation updated

---

## Domain Mapping Reference

| Environment | Domain Format | Example |
|------------|---------------|---------|
| Local | `{app}.local` | `myapp.local` |
| K8s | `{app}.k8s.local` | `myapp.k8s.local` |
| Server | `{app}.{domain}` | `myapp.example.com` |

---

## Rollback Procedure

### Local
```bash
docker-compose -f deploy/docker-compose.local.yml down
docker-compose -f deploy/docker-compose.local.yml up -d --build
```

### Kubernetes
```bash
kubectl rollout undo deployment/myapp -n myapp
```

### Server
```bash
cd ansible && ansible-playbook rollback.yml
```

---

## Output Report Format

```markdown
# 🚀 Deployment Report

## Summary
**Application:** [app_name]
**Environment:** [environment]
**Domain:** [domain]
**URL:** [url]
**Status:** ✅ Success | ❌ Failed

## Deployment Steps Completed
- [x] Environment configured
- [x] Domain mapped
- [x] Application deployed
- [x] Health checks passing

## Access Information
- **URL:** [url]
- **Dashboard:** [dashboard_url]
- **Health Check:** [health_url]

## Files Created
- [list of files created]

## Next Steps
1. Verify application functionality
2. Run integration tests
3. Monitor for errors
4. Update team documentation
```

---

## Practical Examples

### Example 1: Deploy Static Site to kind Cluster

**Scenario:** Deploy an Astro static site to a local kind cluster with custom domain `unicard.io`.

**Command:**
```
/deploy unicard-landing to k8s with domain unicard.io
```

**Files Created:**
```
unicard-landing/
├── Dockerfile              # Multi-stage build (Node.js → nginx)
└── nginx.conf              # Optimized nginx config

k8s/
├── namespace.yaml          # Kubernetes namespace
├── deployment.yaml         # 2-replica deployment with health checks
├── service.yaml            # ClusterIP service
├── ingress.yaml            # Ingress for unicard.io
└── kustomization.yaml      # Kustomize configuration

scripts/
├── deploy-kind.sh          # Automated deployment script
└── teardown.sh             # Cleanup script
```

**Deployment Steps:**
1. Build Docker image: `docker build -t unicard-landing:latest .`
2. Load into kind: `kind load docker-image unicard-landing:latest`
3. Install ingress controller (if not present)
4. Apply manifests: `kubectl apply -k k8s/`
5. Configure /etc/hosts: `127.0.0.1 unicard.io`

**Troubleshooting:**

| Issue | Cause | Solution |
|-------|-------|----------|
| CrashLoopBackOff | Read-only filesystem | Add emptyDir volumes for /var/cache/nginx, /var/run |
| Empty endpoints | Label mismatch | Ensure service selector matches pod labels |
| 503 Service Unavailable | Ingress not ready | Verify ingress controller running, check ingressClassName |
| ImagePullBackOff | Image not in cluster | Use `kind load docker-image` or `imagePullPolicy: Never` |

**Access:** http://unicard.io

### Example 2: Deploy to Production with SSL

**Command:**
```
/deploy api to server with domain api.example.com --ssl
```

**Additional Requirements:**
- cert-manager installed
- Let's Encrypt issuer configured
- DNS pointing to cluster

### Example 3: Quick Local Development

**Command:**
```
/deploy myapp to local
```

**Result:** http://myapp.local

---

## Decision Matrix

| Scenario | Environment | Domain Pattern | SSL | Tools |
|----------|-------------|----------------|-----|-------|
| Local dev | local | `{app}.local` | No | Docker Compose + Traefik |
| kind cluster | k8s | Custom domain | No | kubectl + nginx ingress |
| Production K8s | k8s | `{app}.domain.com` | Yes | kubectl + cert-manager |
| Traditional server | server | `{app}.domain.com` | Yes | Terraform + Ansible |

---

## Best Practices Summary

1. **Always use multi-stage Docker builds** for smaller images
2. **Add health checks** to deployments
3. **Use resource limits** to prevent resource exhaustion
4. **Implement proper probes** (liveness + readiness)
5. **Run as non-root user** for security
6. **Use emptyDir volumes** for writable directories in read-only containers
7. **Ensure label consistency** across all resources
8. **Test locally first** before production deployment
9. **Have rollback plan** ready
10. **Monitor after deployment** for issues
