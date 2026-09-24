#!/usr/bin/env bash
set -Eeuo pipefail

# One-time installer for https://edu-platform-api.duckdns.org/logs/.
# Run on the VPS as root. It never changes the backend Compose project.

readonly domain=edu-platform-api.duckdns.org
readonly caddy_name=edu-platform-caddy
readonly proxy_name=edu-platform-log-socket
readonly dozzle_name=edu-platform-dozzle
readonly network_name=edu-platform-logs
readonly config_dir=/opt/edu-platform/log-viewer
readonly caddyfile="$config_dir/Caddyfile"
readonly proxy_image=ghcr.io/tecnativa/docker-socket-proxy:v0.5.0
readonly dozzle_image=amir20/dozzle:v11.1.0

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
(( EUID == 0 )) || die 'Run as root on the VPS.'
for command in docker curl openssl; do
  command -v "$command" >/dev/null || die "Missing command: $command"
done

expected_cmd='["caddy","reverse-proxy","--from","edu-platform-api.duckdns.org","--to","127.0.0.1:8000"]'
actual_cmd=$(docker inspect -f '{{json .Config.Cmd}}' "$caddy_name" 2>/dev/null) || die 'Current Caddy container not found.'
[[ "$actual_cmd" == "$expected_cmd" ]] || die 'Caddy command differs from inspected baseline; stopping before changes.'
[[ $(docker inspect -f '{{.HostConfig.NetworkMode}}' "$caddy_name") == host ]] || die 'Caddy is not using host networking.'

caddy_image=$(docker inspect -f '{{.Image}}' "$caddy_name")
caddy_data=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$caddy_name")
caddy_config=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/config"}}{{.Name}}{{end}}{{end}}' "$caddy_name")
[[ -n "$caddy_data" && -n "$caddy_config" ]] || die 'Expected persistent Caddy data/config volumes are missing.'

for name in "$proxy_name" "$dozzle_name"; do
  ! docker container inspect "$name" >/dev/null 2>&1 || die "Container $name already exists; inspect it before retrying."
done
[[ ! -e "$caddyfile" ]] || die "$caddyfile already exists; inspect it before retrying."
curl -fsS --max-time 10 http://127.0.0.1:8000/health >/dev/null || die 'Backend loopback health check failed.'
curl -fsS --max-time 10 --resolve "$domain:443:127.0.0.1" \
  "https://$domain/health" >/dev/null || die 'Caddy API health check failed.'

created_proxy=false
created_dozzle=false
created_caddyfile=false
switched=false
on_exit() {
  status=$?
  trap - EXIT
  if (( status != 0 )); then
    if [[ "$switched" == true ]]; then
      printf 'Restoring previous Caddy container...\n' >&2
      if docker container inspect "$caddy_name" >/dev/null 2>&1; then
        docker rm -f "$caddy_name" >/dev/null || printf 'Could not remove new Caddy container.\n' >&2
      fi
      if docker rename "$old_name" "$caddy_name"; then
        docker start "$caddy_name" >/dev/null || printf 'CRITICAL: start %s manually.\n' "$caddy_name" >&2
      else
        printf 'CRITICAL: old Caddy is still named %s; inspect/start it manually.\n' "$old_name" >&2
      fi
    fi
    [[ "$created_dozzle" == false ]] || docker rm -f "$dozzle_name" >/dev/null 2>&1 || true
    [[ "$created_proxy" == false ]] || docker rm -f "$proxy_name" >/dev/null 2>&1 || true
    if [[ "$created_caddyfile" == true ]]; then
      rm -f -- "$caddyfile"
      rmdir -- "$config_dir" 2>/dev/null || true
    fi
  fi
  exit "$status"
}
trap on_exit EXIT
trap 'exit 1' INT TERM

if docker network inspect "$network_name" >/dev/null 2>&1; then
  [[ $(docker network inspect -f '{{.Driver}}' "$network_name") == bridge ]] || die 'Existing log network is not a bridge network.'
  [[ $(docker network inspect -f '{{len .Containers}}' "$network_name") == 0 ]] || die 'Existing log network contains other containers.'
else
  docker network create "$network_name" >/dev/null
fi

# Pull everything before touching the public proxy.
docker pull "$proxy_image"
docker pull "$dozzle_image"

created_proxy=true
docker run -d --name "$proxy_name" --restart unless-stopped \
  --network "$network_name" \
  -e CONTAINERS=1 -e INFO=1 -e POST=0 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --log-opt max-size=10m --log-opt max-file=3 \
  "$proxy_image" >/dev/null

proxy_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$proxy_name")
[[ -n "$proxy_ip" ]] || die 'Socket proxy has no private Docker-network address.'
docker --host "tcp://$proxy_ip:2375" ps -q | grep -q . || die 'Socket proxy cannot list containers.'
[[ $(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 -X POST \
  "http://$proxy_ip:2375/containers/no-such-container/stop") == 403 ]] || die 'Socket proxy did not deny POST.'

created_dozzle=true
docker run -d --name "$dozzle_name" --restart unless-stopped \
  --network "$network_name" -p 127.0.0.1:8080:8080 \
  -e "DOZZLE_REMOTE_HOST=tcp://$proxy_name:2375" \
  -e DOZZLE_BASE=/logs -e DOZZLE_AUTH_PROVIDER=none \
  -e DOZZLE_ENABLE_ACTIONS=false -e DOZZLE_ENABLE_SHELL=false \
  -e DOZZLE_ENABLE_MCP=false -e DOZZLE_NO_ANALYTICS=true \
  --log-opt max-size=10m --log-opt max-file=3 \
  "$dozzle_image" >/dev/null
[[ $(docker port "$dozzle_name" 8080/tcp) == 127.0.0.1:8080 ]] || die 'Dozzle is not bound to loopback only.'

ready=false
for _ in {1..20}; do
  if curl -fsS --max-time 3 http://127.0.0.1:8080/logs/ >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  docker logs --tail=30 "$dozzle_name" >&2 || true
  die 'Dozzle did not start. Caddy was not changed.'
fi

# Generate a high-entropy password on the VPS; only the bcrypt hash is persisted.
password=$(openssl rand -hex 20)
password_hash=$(printf '%s\n' "$password" | docker run --rm -i "$caddy_image" \
  caddy hash-password --algorithm bcrypt --bcrypt-cost 10)
install -d -m 0700 "$config_dir"
umask 077
created_caddyfile=true
cat > "$caddyfile" <<EOF
{
  admin off
}

$domain {
  @logs path /logs /logs/*
  handle @logs {
    basic_auth {
      logs $password_hash
    }
    reverse_proxy 127.0.0.1:8080 {
      flush_interval -1
      header_up -Authorization
    }
  }
  handle {
    reverse_proxy 127.0.0.1:8000
  }
}
EOF

docker run --rm -v "$caddyfile:/etc/caddy/Caddyfile:ro" "$caddy_image" \
  caddy validate --config /etc/caddy/Caddyfile >/dev/null || die 'Caddyfile validation failed; public proxy unchanged.'

old_name="$caddy_name-before-logs-$(date +%Y%m%d%H%M%S)"
docker rename "$caddy_name" "$old_name"
switched=true
docker stop "$old_name" >/dev/null
docker run -d --name "$caddy_name" --restart unless-stopped \
  --network host \
  -v "$caddy_data:/data" -v "$caddy_config:/config" \
  -v "$caddyfile:/etc/caddy/Caddyfile:ro" \
  --log-opt max-size=10m --log-opt max-file=3 \
  "$caddy_image" caddy run --config /etc/caddy/Caddyfile >/dev/null

api_ready=false
for _ in {1..20}; do
  if curl -fsS --max-time 3 --resolve "$domain:443:127.0.0.1" \
    "https://$domain/health" >/dev/null 2>&1; then
    api_ready=true
    break
  fi
  sleep 1
done
[[ "$api_ready" == true ]] || die 'API failed after Caddy replacement.'
[[ $(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 \
  --resolve "$domain:443:127.0.0.1" "https://$domain/logs/") == 401 ]] || die 'Unauthenticated log viewer was not denied.'
[[ $(printf 'user = "logs:%s"\n' "$password" | curl -sS -o /dev/null -w '%{http_code}' \
  --max-time 5 --config - --resolve "$domain:443:127.0.0.1" "https://$domain/logs/") == 200 ]] || die 'Authenticated log viewer did not respond.'
trap - EXIT INT TERM

printf 'Log viewer ready: https://%s/logs/\n' "$domain"
printf 'Username: logs\nPassword: %s\n' "$password"
printf 'Save the password now; do not paste it into chat.\n'
printf 'Previous Caddy retained (stopped) for rollback: %s\n' "$old_name"
