#!/bin/sh
# Run from repository root. API is stopped for a consistent DB+files recovery set.
set -eu
umask 077
backup_dir=${1:?Provide a NEW private backup directory}
mkdir "$backup_dir"
docker compose stop api
trap 'docker compose start api >/dev/null; sh server/scripts/wait-api.sh' EXIT
# A signal must abort the snapshot, never restart writers and continue archiving.
trap 'exit 1' HUP INT TERM
docker compose exec -T db pg_dump -U channel_migrator -d channel -Fc > "$backup_dir/database.dump"
docker compose run --rm --no-deps --entrypoint tar api -C /data/uploads -cf - . > "$backup_dir/uploads.tar"
(cd "$backup_dir" && sha256sum database.dump uploads.tar > SHA256SUMS)
