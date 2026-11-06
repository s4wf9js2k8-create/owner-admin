#!/bin/sh
set -eu
attempt=0
until docker compose exec -T api node -e 'fetch("http://localhost:3000/api/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 60 ] || { echo 'API did not become healthy' >&2; exit 1; }
  sleep 1
done
