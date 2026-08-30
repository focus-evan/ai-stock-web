#!/usr/bin/env bash

set -Eeuo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$script_dir"

web_root=${AI_STOCK_WEB_ROOT:-/var/www/html/financial-data-platform-main}
nginx_conf_source=${AI_STOCK_WEB_NGINX_SOURCE:-$script_dir/nginx-config-main.conf}
nginx_conf_target=${AI_STOCK_WEB_NGINX_TARGET:-/etc/nginx/conf.d/ai-stock-main.conf}
release_root=${AI_STOCK_WEB_RELEASE_ROOT:-/data/ai-stock-web-main/releases}
port=3667
timestamp=$(date +%Y%m%d-%H%M%S)
metadata_dir="$release_root/$timestamp"
stage_root="${web_root}.stage-${timestamp}"
rollback_web_root="${web_root}.rollback-${timestamp}"
failed_web_root="${web_root}.failed-${timestamp}"

info() { printf '[INFO] %s\n' "$1"; }
fail() { printf '[ERROR] %s\n' "$1" >&2; exit 1; }

for tool in curl git nginx; do
  command -v "$tool" >/dev/null 2>&1 || fail "required tool is missing: $tool"
done

if command -v corepack >/dev/null 2>&1; then
  package_manager=(corepack pnpm)
elif command -v pnpm >/dev/null 2>&1; then
  package_manager=(pnpm)
else
  fail 'pnpm/corepack is unavailable'
fi

test -f package.json || fail 'package.json is missing'
test -f pnpm-lock.yaml || fail 'pnpm-lock.yaml is missing'
test -f "$nginx_conf_source" || fail 'candidate Nginx configuration is missing'
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail 'candidate is not a Git worktree'

candidate_commit=$(git rev-parse HEAD)
origin_commit=$(git rev-parse origin/main)
test "$candidate_commit" = "$origin_commit" || fail 'candidate HEAD is not the fetched origin/main commit'
git diff --quiet || fail 'candidate has tracked content changes'
git diff --cached --quiet || fail 'candidate has staged changes'
test -z "$(git ls-files --others --exclude-standard)" || fail 'candidate has untracked files'
bash -n "$script_dir/deploy-main.sh"

umask 077
mkdir -p "$metadata_dir"

candidate_nginx_main="$metadata_dir/nginx-candidate-main.conf"
printf 'pid /tmp/nginx-ai-stock-main-%s.pid;\nerror_log /tmp/nginx-ai-stock-main-%s.log notice;\nevents {}\nhttp {\n  include /etc/nginx/mime.types;\n  access_log off;\n  include %s;\n}\n' \
  "$timestamp" "$timestamp" "$nginx_conf_source" > "$candidate_nginx_main"
nginx -t -c "$candidate_nginx_main" -p /

info 'installing the exact committed dependency graph with a frozen lockfile'
CI=1 "${package_manager[@]}" install --frozen-lockfile
git diff --quiet -- pnpm-lock.yaml || fail 'frozen installation changed pnpm-lock.yaml'

info 'building the production frontend candidate'
"${package_manager[@]}" run build
test -f build/index.html || fail 'build/index.html is missing'

asset_path=$(grep -Eo '(src|href)="[^"]+\.(js|css)"' build/index.html | head -n 1 | cut -d '"' -f 2)
test -n "$asset_path" || fail 'no representative hashed asset was found in build/index.html'
asset_relative=${asset_path#/}
test -f "build/$asset_relative" || fail "referenced build asset is missing: $asset_relative"

test ! -e "$stage_root" || fail "staging root already exists: $stage_root"
test ! -e "$rollback_web_root" || fail "rollback root already exists: $rollback_web_root"
mkdir -p "$stage_root"
chmod 0755 "$stage_root"
cp -a build/. "$stage_root/"
test -f "$stage_root/index.html" || fail 'staged index.html is missing'
test -f "$stage_root/$asset_relative" || fail 'staged representative asset is missing'

if [ -f "$nginx_conf_target" ]; then
  cp -a "$nginx_conf_target" "$metadata_dir/nginx.conf.previous"
else
  : > "$metadata_dir/nginx.conf.previous.missing"
fi

rollback_needed=0
rollback_frontend() {
  rollback_needed=0
  set +e
  printf '[ERROR] frontend acceptance failed; restoring the previous web root and Nginx config\n' >&2
  if [ -d "$web_root" ]; then
    mv "$web_root" "$failed_web_root"
  fi
  if [ -d "$rollback_web_root" ]; then
    mv "$rollback_web_root" "$web_root"
  fi
  if [ -f "$metadata_dir/nginx.conf.previous" ]; then
    cp -a "$metadata_dir/nginx.conf.previous" "$nginx_conf_target"
  else
    rm -f "$nginx_conf_target"
  fi
  nginx -t && nginx -s reload
  set -e
}

handle_error() {
  exit_code=$?
  if [ "$rollback_needed" -eq 1 ]; then
    rollback_frontend
  fi
  exit "$exit_code"
}
trap handle_error ERR

info 'atomically swapping the staged web root while retaining the previous root'
if [ -d "$web_root" ]; then
  mv "$web_root" "$rollback_web_root"
fi
mv "$stage_root" "$web_root"
rollback_needed=1

install -m 0644 "$nginx_conf_source" "$nginx_conf_target"
if ! nginx -t; then
  rollback_frontend
  fail 'candidate Nginx configuration failed live validation'
fi
nginx -s reload

frontend_url="http://127.0.0.1:${port}/"
asset_url="http://127.0.0.1:${port}/${asset_relative}"
api_url="http://127.0.0.1:${port}/api/health"
if ! curl -fsS --retry 20 --retry-delay 2 --retry-all-errors --max-time 10 "$frontend_url" >/dev/null || \
   ! curl -fsS --retry 10 --retry-delay 2 --retry-all-errors --max-time 10 "$asset_url" >/dev/null || \
   ! curl -fsS --retry 10 --retry-delay 2 --retry-all-errors --max-time 10 "$api_url" >/dev/null; then
  rollback_frontend
  fail 'frontend HTTP, asset, or API proxy acceptance failed'
fi
rollback_needed=0

printf 'candidate_commit=%s\nasset_path=%s\nrollback_web_root=%s\n' \
  "$candidate_commit" "$asset_relative" "$rollback_web_root" > "$metadata_dir/release-metadata.txt"

printf 'FRONTEND_RELEASE_STATUS=PASS\n'
printf 'candidate_commit=%s\n' "$candidate_commit"
printf 'asset_path=%s\n' "$asset_relative"
printf 'rollback_point=%s\n' "$rollback_web_root"
