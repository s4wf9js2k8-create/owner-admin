import pg from "pg";
export function createPool(url) {
  return new pg.Pool({
    connectionString: url,
    max: 10,
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
  actor,
  company,
  action,
  target,
  outcome = "success",
) {
  await db.query(
    "INSERT INTO audit_events(company_id,actor_id,action,target,outcome) VALUES($1,$2,$3,$4,$5)",
    [company, actor, action, String(target), outcome],
  );
}
