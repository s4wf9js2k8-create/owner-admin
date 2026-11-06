#!/bin/sh
# Destructive only to the selected local Compose instance; explicit confirmation required.
set -eu
backup_dir=${1:?Provide backup directory}
[ "${CONFIRM_CHANNEL_RESTORE:-}" = "restore-this-channel-instance" ] || { echo 'Set CONFIRM_CHANNEL_RESTORE=restore-this-channel-instance for the intended offline instance.' >&2; exit 1; }
(cd "$backup_dir" && sha256sum -c SHA256SUMS)
docker compose stop api
# Only restore trusted operator backups. Archive extraction must never accept user uploads.
docker compose exec -T db pg_restore -U channel_migrator -d channel --clean --if-exists --exit-on-error < "$backup_dir/database.dump"
docker compose run --rm --no-deps --entrypoint sh api -c 'find /data/uploads -mindepth 1 -maxdepth 1 -type f -delete; tar -C /data/uploads -xf -' < "$backup_dir/uploads.tar"
# Do not restart on failure: operator must investigate an incomplete restore.
# Expire restored credentials/tokens; require new logins after rollback.
docker compose exec -T db psql -U channel_migrator -d channel -v ON_ERROR_STOP=1 -c 'TRUNCATE sessions, password_resets;'
docker compose start api
sh server/scripts/wait-api.sh
