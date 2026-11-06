import pg from "pg";
import { createPool } from "./db.js";
const password = process.env.API_DB_PASSWORD;
if (!process.env.MIGRATION_DATABASE_URL || !password || password.length < 32)
  throw new Error(
    "Migration URL and unique API_DB_PASSWORD (32+ characters) required",
  );
const pool = createPool(process.env.MIGRATION_DATABASE_URL);
try {
  await pool.query(
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='channel_app') THEN CREATE ROLE channel_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF; END $$",
  );
  await pool.query(
    `ALTER ROLE channel_app PASSWORD ${pg.escapeLiteral(password)}`,
  );
  await pool.query("GRANT CONNECT ON DATABASE channel TO channel_app");
  await pool.query("GRANT USAGE ON SCHEMA public TO channel_app");
  await pool.query(
    "GRANT SELECT,INSERT,UPDATE,DELETE ON accounts,sessions,password_resets,companies,memberships,records,files,upgrade_requests,access_grants,packages TO channel_app",
  );
  await pool.query("GRANT SELECT,INSERT ON audit_events TO channel_app");
  await pool.query(
    "GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO channel_app",
  );
  await pool.query("REVOKE ALL ON schema_migrations FROM channel_app");
} finally {
  await pool.end();
}
