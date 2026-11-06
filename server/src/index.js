import express from "express";
import helmet from "helmet";
import { createPool } from "./db.js";
import { createApp } from "./app.js";
import { assertRuntimeRole } from "./runtime.js";
const {
  DATABASE_URL,
  STORAGE_ROOT = "/data/uploads",
  RECOVERY_ROOT = "/data/recovery",
  PUBLIC_ORIGIN,
} = process.env;
if (!DATABASE_URL || !PUBLIC_ORIGIN)
  throw new Error("DATABASE_URL and PUBLIC_ORIGIN required");
const pool = createPool(DATABASE_URL);
await assertRuntimeRole(pool);
const app = await createApp({
  pool,
  storageRoot: STORAGE_ROOT,
  recoveryRoot: RECOVERY_ROOT,
  origin: PUBLIC_ORIGIN,
  secureCookies: process.env.INSECURE_LOCAL_HTTP !== "true",
  globalStorageBytes: Number(
    process.env.STORAGE_ALLOCATION_BYTES ?? 20 * 1024 ** 3,
  ),
});
const host = express();
host.use(helmet());
host.use("/api", app);
host.use(
  "/owner-admin",
  express.static(new URL("../web", import.meta.url).pathname),
);
host.get("/", (_req, res) => res.redirect("/owner-admin/"));
const server = host.listen(Number(process.env.PORT ?? 3000), "0.0.0.0", () =>
  console.log("Channel Systems API listening"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    }),
  );
