import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createPool } from "./db.js";
export async function migrate(pool) {
  const db = await pool.connect();
  try {
    await db.query("SELECT pg_advisory_lock(8675309)");
    await db.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL)",
    );
    const names = (await readdir(new URL("../migrations/", import.meta.url)))
      .filter((n) => n.endsWith(".sql"))
      .sort();
    const applied = await db.query("SELECT name FROM schema_migrations");
    if (applied.rows.some((row) => !names.includes(row.name)))
      throw new Error(
        "Unsupported migration history: use a matching reviewed release",
      );
    for (const name of names) {
      const sql = await readFile(
        new URL(`../migrations/${name}`, import.meta.url),
        "utf8",
      );
      const checksum = createHash("sha256").update(sql).digest("hex");
      const prior = await db.query(
        "SELECT checksum FROM schema_migrations WHERE name=$1",
        [name],
      );
      if (prior.rowCount) {
        if (prior.rows[0].checksum !== checksum)
          throw new Error("Migration checksum mismatch");
        continue;
      }
      await db.query("BEGIN");
      try {
        await db.query(sql);
        await db.query("INSERT INTO schema_migrations VALUES($1,$2)", [
          name,
          checksum,
        ]);
        await db.query("COMMIT");
      } catch (e) {
        await db.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    await db.query("SELECT pg_advisory_unlock(8675309)");
    db.release();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const pool = createPool(process.env.MIGRATION_DATABASE_URL);
  try {
    if (!process.env.MIGRATION_DATABASE_URL)
      throw new Error("MIGRATION_DATABASE_URL required");
    await migrate(pool);
  } finally {
    await pool.end();
  }
}
