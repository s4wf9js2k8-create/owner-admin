import { randomUUID } from "node:crypto";
import { createPool } from "./db.js";
import { hashPassword } from "./auth.js";
// First owner only, local CLI with migration identity. No default password.
const { MIGRATION_DATABASE_URL, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD } =
  process.env;
if (
  !MIGRATION_DATABASE_URL ||
  !BOOTSTRAP_EMAIL ||
  !BOOTSTRAP_PASSWORD ||
  BOOTSTRAP_PASSWORD.length < 12 ||
  BOOTSTRAP_PASSWORD.length > 128
)
  throw new Error(
    "Provide migration URL, bootstrap email and a 12–128 character password privately",
  );
const pool = createPool(MIGRATION_DATABASE_URL);
const db = await pool.connect();
try {
  await db.query("BEGIN");
  await db.query("SELECT pg_advisory_xact_lock(123321)");
  const existing = await db.query(
    "SELECT id FROM accounts WHERE platform_admin",
  );
  if (existing.rowCount) throw new Error("Owner already bootstrapped");
  await db.query(
    "INSERT INTO accounts(id,email,password_hash,platform_admin) VALUES($1,$2,$3,true)",
    [
      randomUUID(),
      BOOTSTRAP_EMAIL.trim().toLowerCase(),
      await hashPassword(BOOTSTRAP_PASSWORD),
    ],
  );
  await db.query("COMMIT");
  console.log("Initial operator created; remove bootstrap environment values.");
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
} finally {
  db.release();
  await pool.end();
}
