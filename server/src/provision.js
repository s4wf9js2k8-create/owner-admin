import pg from "pg";
import { createPool } from "./db.js";
import { pathToFileURL } from "node:url";
export async function provisionRuntime(pool, password) {
  if (!password || password.length < 32)
    throw new Error("Unique API_DB_PASSWORD (32+ characters) required");
  await pool.query(
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='channel_app') THEN CREATE ROLE channel_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF; END $$",
  );
  await pool.query(
    `ALTER ROLE channel_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD ${pg.escapeLiteral(password)}`,
  );
  const memberships = await pool.query(
    "SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname='channel_app')",
  );
  if (memberships.rowCount)
    throw new Error(
      "Remove unexpected channel_app role memberships before provisioning",
    );
  await pool.query(
    "GRANT CONNECT ON DATABASE channel TO channel_app; GRANT USAGE ON SCHEMA public TO channel_app",
  );
  await pool.query(
    "REVOKE ALL ON ALL TABLES IN SCHEMA public FROM channel_app; REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM channel_app; REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM channel_app",
  );
  await pool.query(
    "GRANT SELECT ON accounts TO channel_app; GRANT INSERT(id,email,password_hash), UPDATE(status,password_hash) ON accounts TO channel_app",
  );
  await pool.query(
    "GRANT SELECT,INSERT,DELETE ON sessions,password_resets,files,access_grants TO channel_app",
  );
  await pool.query(
    "GRANT SELECT,INSERT,UPDATE ON companies,memberships,upgrade_requests TO channel_app",
  );
  await pool.query(
    "GRANT SELECT,INSERT,UPDATE,DELETE ON records TO channel_app; GRANT SELECT,UPDATE ON packages TO channel_app; GRANT SELECT ON audit_events TO channel_app",
  );
  await pool.query(
    "GRANT EXECUTE ON FUNCTION subject(),active_account(),platform_owner(),tenant_role(uuid),tenant_read(uuid),tenant_write(uuid),tenant_admin(uuid),module_enabled(uuid,text),storage_total(),storage_summary(),audit_read_event(uuid,text,text),audit_denied_event(text,text),lock_session(text),lock_password_reset(text) TO channel_app",
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (!process.env.MIGRATION_DATABASE_URL)
    throw new Error("Migration URL required");
  const pool = createPool(process.env.MIGRATION_DATABASE_URL);
  try {
    await provisionRuntime(pool, process.env.API_DB_PASSWORD);
  } finally {
    await pool.end();
  }
}
