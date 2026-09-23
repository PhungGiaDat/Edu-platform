#!/usr/bin/env bash
set -Eeuo pipefail

deploy_dir="${DEPLOY_DIR:-/opt/edu-platform}"
tag="${1:-}"
image_repo="ghcr.io/phunggiadat/edu-platform-backend"

if [[ ! "$tag" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Expected a 40-character Git commit SHA" >&2
  exit 2
fi

stage="$deploy_dir/.incoming/$tag"
compose_file="$deploy_dir/docker-compose.prod.yml"
redis_file="$deploy_dir/redis.conf"
current_file="$deploy_dir/current-image-tag"
previous_file="$deploy_dir/previous-image-tag"

for file in "$stage/docker-compose.prod.yml" "$stage/redis.conf" "$stage/deploy-backend-vps.sh" "$deploy_dir/backend/.env"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing deployment file: $file" >&2
    exit 1
  fi
done

cd "$deploy_dir"
exec 9>"$deploy_dir/.deploy.lock"
flock -w 120 9

previous_tag=""
if [[ -f "$current_file" ]]; then
  previous_tag="$(<"$current_file")"
  if [[ ! "$previous_tag" =~ ^[0-9a-f]{40}$ ]]; then
    echo "Invalid current-image-tag; refusing deployment" >&2
    exit 1
  fi
fi

export IMAGE_TAG="$tag"
compose() { docker compose -f "$compose_file" "$@"; }
fail() { echo "$*" >&2; return 1; }

wait_for_backend() {
  local expected="$image_repo:$1" container_id observed
  for ((attempt = 1; attempt <= 12; attempt++)); do
    container_id="$(compose ps -q backend 2>/dev/null || true)"
    observed=""
    if [[ -n "$container_id" ]]; then
      observed="$(docker inspect --format '{{.Config.Image}}' "$container_id" 2>/dev/null || true)"
    fi
    if [[ "$observed" == "$expected" ]] && curl -fsS --max-time 3 http://127.0.0.1:8000/health >/dev/null; then
      return 0
    fi
    sleep 5
  done
  return 1
}

replaced_backend=0
touched_redis=0
had_compose=0
had_redis=0

restore_on_error() {
  local result=$?
  (( result != 0 )) || result=1
  trap - ERR HUP INT TERM
  set +e
  echo "Deployment of $tag failed; recent container logs:" >&2
  compose logs --no-color --tail=80 backend redis >&2

  if (( had_compose )); then cp -p "$compose_file.rollback" "$compose_file"; fi
  if (( had_redis )); then cp -p "$redis_file.rollback" "$redis_file"; fi

  if (( touched_redis )) && (( had_compose )); then
    compose up -d redis
  fi

  if (( replaced_backend )) && [[ -n "$previous_tag" ]]; then
    export IMAGE_TAG="$previous_tag"
    docker image inspect "$image_repo:$previous_tag" >/dev/null 2>&1 || compose pull backend
    compose up -d redis
    compose up -d --no-deps backend
    if wait_for_backend "$previous_tag"; then
      echo "Restored previous backend image $previous_tag" >&2
    else
      echo "Automatic rollback also failed; inspect Docker and Caddy logs" >&2
    fi
  fi
  rm -f "$compose_file.rollback" "$redis_file.rollback"
  exit "$result"
}
trap restore_on_error ERR HUP INT TERM

if [[ -f "$compose_file" ]]; then
  cp -p "$compose_file" "$compose_file.rollback"
  had_compose=1
fi
if [[ -f "$redis_file" ]]; then
  cp -p "$redis_file" "$redis_file.rollback"
  had_redis=1
fi

cp "$stage/docker-compose.prod.yml" "$compose_file"
cp "$stage/redis.conf" "$redis_file"
compose config -q
install -m 0750 "$stage/deploy-backend-vps.sh" "$deploy_dir/deploy-backend-vps.sh"

# Pull succeeds before any running backend container is replaced.
compose pull backend
touched_redis=1
compose up -d redis
for ((attempt = 1; attempt <= 12; attempt++)); do
  if [[ "$(compose exec -T redis redis-cli ping 2>/dev/null || true)" == "PONG" ]]; then
    break
  fi
  if (( attempt == 12 )); then
    fail "Redis did not become ready"
  fi
  sleep 2
done

replaced_backend=1
compose up -d --no-deps backend
if ! wait_for_backend "$tag"; then
  fail "Backend did not pass /health within about 60 seconds"
fi

if [[ -n "$previous_tag" && "$previous_tag" != "$tag" ]]; then
  if (( had_compose )); then cp -p "$compose_file.rollback" "$compose_file.previous"; fi
  if (( had_redis )); then cp -p "$redis_file.rollback" "$redis_file.previous"; fi
  printf '%s\n' "$previous_tag" > "$previous_file.tmp"
  mv "$previous_file.tmp" "$previous_file"
fi
printf '%s\n' "$tag" > "$current_file.tmp"
mv "$current_file.tmp" "$current_file"
trap - ERR HUP INT TERM
rm -f "$compose_file.rollback" "$redis_file.rollback"

# Keep the current and immediately previous SHA images for local rollback.
# Only remove older images from this backend repository, not other VPS images.
docker image prune -f || echo "Warning: dangling-image cleanup failed" >&2
docker builder prune -f --filter "until=24h" || echo "Warning: build-cache cleanup failed" >&2
if images="$(docker image ls --format '{{.Repository}}:{{.Tag}}' "$image_repo")"; then
  while IFS= read -r candidate; do
    candidate_tag="${candidate#"$image_repo:"}"
    if [[ "$candidate" == "$image_repo:"* && "$candidate_tag" =~ ^[0-9a-f]{40}$ && "$candidate_tag" != "$tag" && "$candidate_tag" != "$previous_tag" ]]; then
      docker image rm "$candidate" || echo "Warning: old backend image cleanup failed" >&2
    fi
  done <<< "$images"
else
  echo "Warning: backend image listing failed; skipping tagged-image cleanup" >&2
fi
echo "Backend healthy at $tag"
