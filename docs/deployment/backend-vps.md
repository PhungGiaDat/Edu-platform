# Backend deployment on one Ubuntu VPS

This deployment is for the `10-days-quick-run` branch on an **amd64** VPS with 2 vCPU, 4 GB RAM, and a 22 GB root filesystem (as inspected on the actual Ubuntu 24.04 host). Vercel continues to host the frontend.

```text
Vercel frontend -> HTTPS api.example.com -> Caddy on Ubuntu
                                      -> 127.0.0.1:8000 -> FastAPI container
                                                              -> Redis container
                                      -> Supabase PostgreSQL and Storage
                                      -> external Qdrant and LLM APIs
```

The VPS does not clone the repository or build the backend image. GitHub Actions tests and builds it, pushes `ghcr.io/phunggiadat/edu-platform-backend:<commit-sha>` and `:latest`, then deploys the SHA tag. Only Caddy exposes ports 80 and 443. Docker publishes the API on host loopback; Redis has no published port.

## One-time VPS setup

Use an Ubuntu account with sudo for setup; routine deployments use `deploy` over SSH. An API domain is **not required to stage and health-check the backend locally**. Until one is available, skip the Caddy/HTTPS steps below, keep port 8000 bound to `127.0.0.1`, and keep the Vercel frontend pointed at the existing Render API. Do not expose an unauthenticated HTTP API on the VPS public IP as a substitute for HTTPS. When ready to switch traffic, point an API domain such as `api.example.com` to the VPS IPv4 address and complete the Caddy steps.

For the inspected Ubuntu 24.04 x86_64 VPS, `.github/scripts/bootstrap-backend-vps.sh` automates the Docker/Compose installation and creation of the `deploy` user and persistent directories. Transfer and run it once as root; the equivalent manual commands follow. Do not run both paths. Install Docker Engine and the Compose plugin from [Docker's Ubuntu repository](https://docs.docker.com/engine/install/ubuntu/):

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo docker version
sudo docker compose version
uname -m  # must report x86_64 for the workflow's linux/amd64 image
```

Create the deploy account and persistent directories. Generate a dedicated key pair **outside the repository** on your own computer with `ssh-keygen -t ed25519 -f ./edu-platform-deploy -C edu-platform-actions`. Add the contents of `edu-platform-deploy.pub` to `authorized_keys`; put the private key contents in the GitHub secret `VPS_SSH_KEY`. Membership in the Docker group effectively grants root-level host access, so use this account only for deployment.

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy -m 0750 /opt/edu-platform
sudo install -d -o deploy -g deploy -m 0750 /opt/edu-platform/backend /opt/edu-platform/.incoming
sudo install -d -o deploy -g deploy -m 0700 /home/deploy/.ssh
sudo -u deploy touch /home/deploy/.ssh/authorized_keys
sudoedit /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
sudo chmod 0600 /home/deploy/.ssh/authorized_keys
```

Verify a **new** SSH session as `deploy` before disabling password or root SSH login. If using UFW, allow the actual SSH port before enabling it, then allow 80 and 443. Do not open 8000 or 6379.

```bash
sudo ufw allow 22/tcp # replace 22 if SSH uses another port
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ss -ltnp
```

Install [Caddy's official Ubuntu package](https://caddyserver.com/docs/install) and give it a single API reverse proxy. Caddy obtains HTTPS certificates once DNS and inbound ports 80/443 work.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
api.example.com {
    reverse_proxy 127.0.0.1:8000
}
EOF
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Use a real backend domain in the Caddyfile. Do not place the Vercel frontend in this proxy.

## Production environment and GHCR access

Create `/opt/edu-platform/backend/.env` on the VPS with mode 0600 and owner `deploy`. The workflow never transfers this file. The settings code requires `SECRET_KEY`, `SUPABASE_PROJECT_URL`, and `DEFAULT_FRONTEND_ORIGIN`; the deployed product also needs its Supabase `DATABASE_URL`. Set the remaining provider keys for features you actually use.

```bash
sudo -u deploy touch /opt/edu-platform/backend/.env
sudo chmod 0600 /opt/edu-platform/backend/.env
sudoedit /opt/edu-platform/backend/.env
```

Minimum contents, with real private values entered on the VPS:

```dotenv
SECRET_KEY=<random-secret-at-least-32-characters>
DATABASE_URL=<Supabase-PostgreSQL-connection-URL>
POSTGRES_CORE_ENABLED=true
SUPABASE_PROJECT_URL=https://<project>.supabase.co
DEFAULT_FRONTEND_ORIGIN=https://<frontend>.vercel.app
ALLOWED_ORIGINS=https://<frontend>.vercel.app
REDIS_URL=redis://redis:6379/0
WORKERS=1
DEBUG=false
```

Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` if the Supabase upload routes are used; add Qdrant and LLM API credentials for those features. Leave `MONGO_URL` unset unless a still-used legacy route needs an external MongoDB service. The production Compose file does not start MongoDB.

### Mapping an existing Render environment

Use the **actual Render service Environment page**, including any linked environment groups, as the source of truth; `backend/render.yaml` lists only some variable names and cannot supply dashboard-only secret values. Transfer values through a local secret file or enter them directly on the VPS, never in Git, the workflow, or chat. A developer `backend/.env` is not automatically equivalent to the Render environment. The current local file has a localhost frontend origin and non-production debug setting, so do not copy it unchanged.

| Render setting | VPS action |
| --- | --- |
| `SECRET_KEY`, `DATABASE_URL`, `SUPABASE_PROJECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, provider API keys, `QDRANT_URL`/`QDRANT_API_KEY`, notification/Telegram/Sentry secrets | Carry over the values for enabled features. Preserve `SECRET_KEY` to avoid invalidating existing signed tokens. Confirm `DATABASE_URL` reaches the external Supabase PostgreSQL service from the VPS; a Render-internal hostname will not work. |
| `DEFAULT_FRONTEND_ORIGIN`, `ALLOWED_ORIGINS` | Use the actual HTTPS Vercel frontend origin, not localhost or the future backend domain. Keep the frontend's API URL pointing to Render until VPS HTTPS is ready. |
| `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`) | Replace any Render/internal Redis address with `REDIS_URL=redis://redis:6379/0`; `REDIS_URL` takes precedence in `settings.py`. No Redis password is needed inside this private Compose network. |
| `DEBUG`, `WORKERS`, `POSTGRES_CORE_ENABLED` | Set `false`, `1`, and `true`, respectively. |
| `PORT`, `HOST`, `PYTHON_VERSION`, `RENDER_*` | Omit Render platform/build settings; the container already listens on port 8000 and Compose publishes it only on VPS loopback. |
| `MONGO_URL`, `MONGO_DB` | Omit when using the PostgreSQL core, unless a required legacy feature still depends on the external archive. Never point MongoDB to localhost on this VPS. |
| `DIRECT_URL` | Not needed by the backend runtime; retain only in a separate, secure migration workflow if one actually uses it. |

After placing the file, check owner/mode and names without printing values: `stat -c '%U %a %n' /opt/edu-platform/backend/.env` and `docker compose -f /opt/edu-platform/docker-compose.prod.yml config -q` with a valid `IMAGE_TAG`. The deploy workflow intentionally does not read or overwrite the VPS `.env`.

The GitHub workflow publishes to GHCR with `GITHUB_TOKEN` and `packages: write`. The initial package may be private even though the repository is public. For each deploy, the workflow sends that short-lived token through SSH stdin, uses an isolated Docker config under `.incoming/<sha>/.docker-auth`, and deletes its credential file afterward. No personal access token or persistent `docker login` is required on the VPS. If GHCR reports access denied, check the package's repository linkage and Actions access in [GitHub's package access settings](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility).

## GitHub Actions secrets and first deployment

Add these repository Actions secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS IPv4 address or SSH hostname |
| `VPS_PORT` | SSH port, usually `22` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private key matching `/home/deploy/.ssh/authorized_keys` |
| `VPS_SSH_KNOWN_HOSTS` | Verified `known_hosts` line for the VPS and port |

Get a `known_hosts` line from `ssh-keyscan -p <port> -t ed25519 <host>`. Before saving it as a secret, compare its fingerprint with `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` run **on the VPS**. For a nondefault SSH port, keep the `[host]:port` prefix produced by `ssh-keyscan`. The workflow enforces host-key checking.

With `.env`, GHCR access, and the five secrets ready, push a commit touching a backend deployment path to `10-days-quick-run`. DNS/Caddy may be added later; without them this is a loopback-only staging deployment and must not replace the frontend's Render API URL. The new workflow performs the first deployment and stages the Compose file, Redis config, and deploy script under `/opt/edu-platform/.incoming/<sha>/`. No `git pull` or build runs on the VPS.

Expected persistent layout after success:

```text
/opt/edu-platform/
├── docker-compose.prod.yml
├── redis.conf
├── deploy-backend-vps.sh
├── current-image-tag
├── previous-image-tag          # appears after the second distinct SHA
├── backend/.env                # created only on the VPS
└── .incoming/<sha>/            # small staging files from workflow runs
```

## Normal deployment and checks

Pushes to `10-days-quick-run` that change `backend/**`, `Dockerfile.backend`, the production Compose/Redis files, or the deployment workflow/scripts run the focused backend release-gate tests listed in the workflow, build on GitHub Actions, and push both the immutable SHA tag and `latest`. The VPS script validates the Compose file, pulls the SHA image before switching containers, verifies Redis, starts the backend, and retries `/health` for about one minute. It records the successful SHA only after health passes. On failure it prints recent container logs, restores the prior Compose/Redis files and prior SHA when available, and exits nonzero. The first deployment has no earlier SHA to restore.

`/health` confirms the API process responds; it intentionally does not depend on external providers. Check `/health/detailed` separately to inspect Supabase PostgreSQL and Redis connectivity. From the VPS:

```bash
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:8000/health/detailed
curl -fsS https://api.example.com/health
cd /opt/edu-platform
IMAGE_TAG="$(cat current-image-tag)" docker compose -f docker-compose.prod.yml ps
IMAGE_TAG="$(cat current-image-tag)" docker compose -f docker-compose.prod.yml logs --tail=100 backend redis
sudo journalctl -u caddy --no-pager -n 100
```

For ongoing logs, add `-f` to the Compose or `journalctl` command. To restart the current API without pulling another image:

```bash
cd /opt/edu-platform
IMAGE_TAG="$(cat current-image-tag)" docker compose -f docker-compose.prod.yml restart backend
```

Set Vercel's `VITE_API_BASE` to `https://api.example.com` and redeploy the frontend there. The backend `.env` must allow the Vercel origin through `ALLOWED_ORIGINS` and `DEFAULT_FRONTEND_ORIGIN`. No frontend code or container changes are needed.

## Manual rollback

The deploy script attempts to restore the previous SHA automatically when a new image fails health. For a later manual rollback, run this as `deploy` on the VPS. A previous SHA exists only after two successful distinct releases. The saved `.previous` config files are the configuration from before the last deployment; restore them if that release changed Compose or Redis settings.

```bash
cd /opt/edu-platform
current="$(cat current-image-tag)"
old="$(cat previous-image-tag)"
docker image inspect "ghcr.io/phunggiadat/edu-platform-backend:$old" >/dev/null
cp docker-compose.prod.yml.previous docker-compose.prod.yml
cp redis.conf.previous redis.conf
IMAGE_TAG="$old" docker compose -f docker-compose.prod.yml up -d redis
IMAGE_TAG="$old" docker compose -f docker-compose.prod.yml up -d --no-deps backend
curl -fsS http://127.0.0.1:8000/health
printf '%s\n' "$current" > previous-image-tag
printf '%s\n' "$old" > current-image-tag
```

If only application code changed and the `.previous` config files are absent, omit the two `cp` lines. Automated cleanup retains the immediately previous SHA locally. If an operator manually removed it, authenticate to GHCR before pulling the old SHA.

## Disk use and database changes

After a **successful health check**, the script removes dangling images, build cache older than 24 hours, and older SHA-tagged images from this backend repository while retaining the current and immediately previous SHA. It does not prune other VPS images. Container JSON logs rotate at 10 MB × 3 files per service. The Redis dataset is capped at 192 MB with a 384 MB container limit; the production override uses `noeviction` so a full cache cannot silently discard lock keys. Check disk with `df -h` and `docker system df`. Safe manual checks are:

```bash
docker image prune -f
docker builder prune -f --filter 'until=24h'
docker image ls ghcr.io/phunggiadat/edu-platform-backend
```

No migration command runs automatically. `backend/database/postgres/migrations/` contains historical SQL applied to Supabase separately, while the Alembic baseline is designed to be **stamped only after schema comparison**. For a release with schema changes, review and apply the required Supabase migration before pushing backend code, then verify the live schema. Do not run `alembic upgrade head` against an unprepared production database.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| GHCR pull denied | Workflow's temporary GHCR login, package repository linkage, and Actions package access |
| Workflow SSH rejected | Deploy key, `VPS_USER`, port, and verified `VPS_SSH_KNOWN_HOSTS` |
| `/health` fails | `docker compose logs backend redis`, `/opt/edu-platform/backend/.env`, and the prior SHA state file |
| `/health` works but learner API fails | `/health/detailed`, Supabase `DATABASE_URL`, Redis and provider credentials, then an authenticated API request |
| HTTPS returns 502 | DNS, Caddy logs, and `curl http://127.0.0.1:8000/health` on the VPS |
| Disk fills | `docker system df`, log rotation, Redis volume size, and old unused images |
