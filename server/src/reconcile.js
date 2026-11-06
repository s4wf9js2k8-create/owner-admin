import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { createPool } from "./db.js";
if (!process.env.MIGRATION_DATABASE_URL || !process.env.STORAGE_ROOT)
  throw new Error(
    "Explicit migration URL and storage directory required; stop API first",
  );
const pool = createPool(process.env.MIGRATION_DATABASE_URL);
try {
  const ids = new Set(
    (await pool.query("SELECT id FROM files")).rows.map((r) => r.id),
  );
  const disk = await readdir(process.env.STORAGE_ROOT);
  const orphans = disk.filter(
    (id) => /^[a-f0-9-]{36}$/.test(id) && !ids.has(id),
  );
  let missing = 0;
  for (const id of ids)
    try {
      await stat(join(process.env.STORAGE_ROOT, id));
    } catch {
      missing++;
    }
  if (process.env.PURGE_ORPHANS === "true")
    for (const id of orphans) await unlink(join(process.env.STORAGE_ROOT, id));
  console.log(
    JSON.stringify({
      orphanFiles: orphans.length,
      missingFiles: missing,
      purged: process.env.PURGE_ORPHANS === "true",
    }),
  );
} finally {
  await pool.end();
}
