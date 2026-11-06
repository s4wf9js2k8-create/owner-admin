import pg from "pg";
export function createPool(url) {
  return new pg.Pool({
    connectionString: url,
    max: 10,
    options: "-c search_path=public,pg_catalog,pg_temp",
    statement_timeout: 10000,
    connectionTimeoutMillis: 5000,
  });
}
export async function transaction(pool, accountId, fn) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT set_config('app.account_id',$1,true)", [
      accountId ?? "",
    ]);
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
export async function audit(
  db,
  _actor,
  company,
  action,
  target,
  outcome = "success",
) {
  // Mutations are audited by migration-owned row triggers, not caller claims.
  if (action === "request.denied") {
    await db.query("SELECT audit_denied_event($1,$2)", [
      String(target),
      outcome,
    ]);
  } else if (
    ["records.list", "record.read", "files.list", "file.download"].includes(
      action,
    )
  ) {
    await db.query("SELECT audit_read_event($1,$2,$3)", [
      company,
      action,
      String(target),
    ]);
  }
}
