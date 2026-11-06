# Operations, disk expansion and recovery

## Inspect resource use

From repository root on the intended local instance:

```sh
sh server/scripts/monitor.sh
```

This reports Compose health, one-shot container CPU/RAM/network/disk counters, database size and upload directory size. API and DB each have a 512 MB memory limit and one CPU allocation in the sample. Tune after load testing. This is on-demand monitoring, not alerting or a 24/7 operations service. Host free disk, volume filesystem use, database growth, backup success, certificate expiry and health endpoint failures also need monitoring before production.

The operator storage dashboard and `/api/owner/storage` show company usage/quota and the global allocation. Metadata tracks committed upload bytes; quota checks are serialized across uploads. An ordinary tenant cannot list another tenant's files or see the owner summary. Platform grants permit audited reads only; they do not permit customer writes/uploads.

Uploads/downloads share four buffered-work leases; an aborted request retains its lease until its handler finishes. Downloads verify exact metadata size and SHA-256 before audit/response. Upload default limit is 10 MiB per file, 1 GiB per newly created company, and 20 GiB globally. Types are PDF, PNG and JPEG, identified by their leading signatures; browser Content-Type and extension are not proof. Signature checking is not malware detection or full document decoding. Files download as attachments with nosniff/no-store. Add malware scanning/quarantine and a reviewed thumbnail/document pipeline before trusting real uploads.

## Backup

Use a new private directory outside the upload/database volumes:

```sh
sh server/scripts/backup.sh /private/backups/channel-2026-11-06
```

The script stops the API, takes PostgreSQL custom-format dump and upload tar archive, writes SHA-256 checksums, and restarts the API on exit. It assumes this Compose API is the only application writer; stop all other writers/maintenance tasks too. Downtime is intentional for a consistent DB/files recovery set. If any backup step fails, discard the incomplete set and investigate. Recovery spool files are not included; their tokens expire after 30 minutes. Logs/database backups can contain sensitive metadata, password hashes and session hashes: restrict permissions, encrypt offline copies using approved free tools, keep off-host copies and test retention/deletion. A backup on the same physical disk is not disaster recovery.

The dump contains application schema/data, migration history, RLS policies and grants; PostgreSQL cluster roles/passwords are not backed up by pg_dump. Bootstrap/migrate the target instance and provision its runtime role before restore. Protect the target's independently generated .env. Use the same PostgreSQL major version initially. Do not blindly restore into a different schema version or an instance serving users.

## Restore — destructive to selected local instance

Verify you are operating the intended **synthetic** Compose project, stop other writers and obtain explicit approval before any later live recovery. The script requires an explicit environment acknowledgement:

```sh
CONFIRM_CHANNEL_RESTORE=restore-this-channel-instance sh server/scripts/restore.sh /private/backups/channel-2026-11-06
```

It verifies checksums, stops API, recreates the selected application public schema and restores the database, replaces top-level upload files from the trusted archive, reapplies known checksummed migrations and runtime permissions, clears restored sessions/reset tokens and restarts API only after success. An unknown/newer migration or a checksum mismatch leaves API stopped. On a failure the API stays stopped. Archive extraction accepts operator-owned backups only, never untrusted user uploads. Checksums detect corruption; they do not authenticate a malicious backup. Existing external recovery-spool files should be removed privately after a restore; their DB tokens are invalidated. Rehearse restoration into an isolated instance and verify file hashes, RLS, roles, migration checksum history, record counts and fresh sign-in before declaring success. Define RPO/RTO and conduct a real host-loss drill before commercial use.

Never use `docker compose down -v` on a retained installation: it deletes its database and file volumes. That command is suitable only for explicitly disposable synthetic test instances.

## Crash consistency and orphan files

PostgreSQL cannot atomically commit filesystem writes. Upload writes and fsyncs a generated private file before committing its metadata/audit; ordinary failures remove it. A process crash in the small gap can leave an orphan file. Deletes commit metadata/audit before unlinking, so a crash can also leave an unreachable physical file. File paths cannot be guessed through an unauthorised download API. Quotas use metadata; orphan files still consume real disk. Monitor filesystem usage independently.

Stop API before reconciliation. Run the maintenance CLI with a privileged migration connection and the exact upload root (available through an explicitly configured maintenance container). `node src/reconcile.js` reports missing and orphan files. It is dry-run by default; `PURGE_ORPHANS=true` removes only UUID-named physical files without a metadata row. It never fabricates metadata for missing files. Investigate missing files as recovery failures. Do not run cleanup concurrently with uploads or restore. Recovery-spool delivery files and expired auth records also require scheduled retention cleanup; no unattended purge job is enabled here.

## Expand storage

1. Back up and verify restore before changing disks or volume mappings.
2. Increase the host filesystem/virtual disk capacity or move the persistent volumes using a documented Docker volume migration while API/DB are stopped. Follow the host's Linux/WSL/Docker storage instructions. Never attach a second empty volume and assume existing data moved.
3. Increase STORAGE_ALLOCATION_BYTES in the private .env and recreate API; update selected company quotas through the versioned owner API. No schema migration is needed. The application limit does not resize a filesystem.
4. Keep headroom for PostgreSQL, WAL, temporary files, images, backups and orphan recovery. Do not allocate all host disk to the nominal 20 GiB upload ceiling.
5. Recheck health, stored file hashes, quota enforcement and monitoring thresholds. Record the new backup/restore location and verify off-host recovery.
