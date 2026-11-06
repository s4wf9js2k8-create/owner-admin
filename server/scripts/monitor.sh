#!/bin/sh
set -eu
docker compose ps
docker stats --no-stream $(docker compose ps -q)
docker compose exec -T db psql -U channel_migrator -d channel -c 'SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;'
docker compose exec -T api du -sh /data/uploads
