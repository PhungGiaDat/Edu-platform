#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd "$script_dir/../.." && pwd)"
temp_dir="$(mktemp -d)"
trap 'rm -rf -- "$temp_dir"' EXIT

mkdir -p "$temp_dir/bin" "$temp_dir/backend"
printf 'SECRET_KEY=test-only\n' > "$temp_dir/backend/.env"
export DEPLOY_DIR="$temp_dir"
export MOCK_LOG="$temp_dir/commands.log"
export MOCK_ACTIVE="$temp_dir/active-tag"
export MOCK_IMAGES="$temp_dir/images"
export PATH="$temp_dir/bin:$PATH"

cat > "$temp_dir/bin/docker" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "docker $*" >> "$MOCK_LOG"
if [[ "$1" == compose ]]; then
  shift 3 # compose -f <file>
  case "$1" in
    config|logs) exit 0 ;;
    pull) printf '%s\n' "$IMAGE_TAG" >> "$MOCK_IMAGES"; exit 0 ;;
    up)
      if [[ "${*: -1}" == backend ]]; then printf '%s\n' "$IMAGE_TAG" > "$MOCK_ACTIVE"; fi
      exit 0 ;;
    ps) printf 'mock-container\n'; exit 0 ;;
    exec) printf 'PONG\n'; exit 0 ;;
  esac
fi
if [[ "$1" == image && "$2" == ls ]]; then
  while IFS= read -r tag; do
    printf 'ghcr.io/phunggiadat/edu-platform-backend:%s\n' "$tag"
  done < <(sort -u "$MOCK_IMAGES")
  exit 0
fi
if [[ "$1" == inspect ]]; then
  printf 'ghcr.io/phunggiadat/edu-platform-backend:%s\n' "$(<"$MOCK_ACTIVE")"
fi
exit 0
MOCK
cat > "$temp_dir/bin/curl" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "curl $*" >> "$MOCK_LOG"
[[ "$(<"$MOCK_ACTIVE")" != "${MOCK_FAIL_TAG:-}" ]]
MOCK
printf '#!/usr/bin/env bash\nexit 0\n' > "$temp_dir/bin/flock"
printf '#!/usr/bin/env bash\nexit 0\n' > "$temp_dir/bin/sleep"
chmod +x "$temp_dir/bin/"*

first_tag="$(printf 'a%.0s' {1..40})"
failed_tag="$(printf 'b%.0s' {1..40})"

stage() {
  mkdir -p "$temp_dir/.incoming/$1"
  cp "$repo_dir/docker-compose.prod.yml" "$temp_dir/.incoming/$1/"
  cp "$repo_dir/redis.conf" "$temp_dir/.incoming/$1/"
  cp "$script_dir/deploy-backend-vps.sh" "$temp_dir/.incoming/$1/"
}

stage "$first_tag"
bash "$script_dir/deploy-backend-vps.sh" "$first_tag" >/dev/null
[[ "$(<"$temp_dir/current-image-tag")" == "$first_tag" ]]

pull_line="$(grep -n 'pull backend' "$MOCK_LOG" | head -1 | cut -d: -f1)"
up_line="$(grep -n 'up -d --no-deps backend' "$MOCK_LOG" | head -1 | cut -d: -f1)"
health_line="$(grep -n '^curl ' "$MOCK_LOG" | head -1 | cut -d: -f1)"
prune_line="$(grep -n 'image prune -f' "$MOCK_LOG" | head -1 | cut -d: -f1)"
(( pull_line < up_line && up_line < health_line && health_line < prune_line ))

stage "$failed_tag"
printf '\n# failed-release marker\n' >> "$temp_dir/.incoming/$failed_tag/redis.conf"
: > "$MOCK_LOG"
export MOCK_FAIL_TAG="$failed_tag"
if bash "$script_dir/deploy-backend-vps.sh" "$failed_tag" >/dev/null 2>&1; then
  echo 'Expected failed health check to fail deployment' >&2
  exit 1
fi
[[ "$(<"$temp_dir/current-image-tag")" == "$first_tag" ]]
[[ "$(<"$MOCK_ACTIVE")" == "$first_tag" ]]
cmp -s "$repo_dir/docker-compose.prod.yml" "$temp_dir/docker-compose.prod.yml"
cmp -s "$repo_dir/redis.conf" "$temp_dir/redis.conf"
if grep -Eq 'image (prune|rm)' "$MOCK_LOG"; then
  echo 'Cleanup ran after a failed deployment' >&2
  exit 1
fi

unset MOCK_FAIL_TAG
bash "$script_dir/deploy-backend-vps.sh" "$failed_tag" >/dev/null
[[ "$(<"$temp_dir/current-image-tag")" == "$failed_tag" ]]
[[ "$(<"$temp_dir/previous-image-tag")" == "$first_tag" ]]
cmp -s "$repo_dir/redis.conf" "$temp_dir/redis.conf.previous"

third_tag="$(printf 'c%.0s' {1..40})"
stage "$third_tag"
: > "$MOCK_LOG"
bash "$script_dir/deploy-backend-vps.sh" "$third_tag" >/dev/null
grep -q "image rm ghcr.io/phunggiadat/edu-platform-backend:$first_tag" "$MOCK_LOG"
if grep -q "image rm ghcr.io/phunggiadat/edu-platform-backend:$failed_tag" "$MOCK_LOG"; then
  echo 'Cleanup removed the previous rollback image' >&2
  exit 1
fi
if grep -q 'image prune -a' "$MOCK_LOG"; then
  echo 'Cleanup pruned unrelated tagged images' >&2
  exit 1
fi

echo 'VPS deploy success, rollback, retry, and scoped cleanup passed'
