#!/usr/bin/env bash
set -Eeuo pipefail

deploy_dir=/opt/edu-platform
tag="${1:-}"
name=edu-platform-ci-status
image=python:3.12-alpine
target="$deploy_dir/ci-status-monitor.py"
source="$deploy_dir/.incoming/$tag/ci-status-monitor.py"

[[ "$tag" =~ ^[0-9a-f]{40}$ ]] || { echo 'Expected Git commit SHA' >&2; exit 2; }
[[ -f "$source" ]] || { echo "Missing $source" >&2; exit 1; }
docker inspect edu-platform-dozzle >/dev/null 2>&1 || { echo 'Dozzle is not installed' >&2; exit 1; }

if docker container inspect "$name" >/dev/null 2>&1; then
  if [[ -f "$target" ]] && cmp -s "$source" "$target" &&
    [[ $(docker inspect -f '{{.State.Running}}' "$name") == true ]]; then
    echo 'CI status is already visible in Dozzle'
    exit 0
  fi
  echo "Existing $name differs or is stopped; inspect it before changing the monitor" >&2
  exit 1
fi

docker pull "$image"
install -m 0644 "$source" "$target"
docker run -d --name "$name" --restart unless-stopped \
  --read-only --user 65534:65534 --cap-drop ALL --security-opt no-new-privileges \
  --memory 128m --cpus 0.25 --pids-limit 64 \
  -v "$target:/app/monitor.py:ro" \
  --label 'dev.dozzle.name=Backend CI/CD' \
  --label 'dev.dozzle.url=https://github.com/PhungGiaDat/Edu-platform/actions/workflows/deploy-backend.yml' \
  --log-opt max-size=10m --log-opt max-file=3 \
  "$image" python -u /app/monitor.py >/dev/null

for _ in {1..45}; do
  if docker logs "$name" 2>&1 | grep -q '\[CI\] Run #'; then
    echo 'CI status is visible in Dozzle: select Backend CI/CD at /logs/'
    exit 0
  fi
  if [[ $(docker inspect -f '{{.State.Running}}' "$name") != true ]]; then
    break
  fi
  sleep 1
done
docker logs --tail=30 "$name" >&2 || true
echo 'CI monitor did not read GitHub Actions; backend and Caddy were not changed' >&2
docker rm -f "$name" >/dev/null
exit 1
