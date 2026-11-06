import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdtemp, rm, mkdir, readFile, writeFile } from "node:fs/promises";
import { hashPassword } from "../src/auth.js";
import { chromium } from "@playwright/test";
import os from "node:os";
import path from "node:path";
if (
  process.env.CONFIRM_CHANNEL_COMPOSE_TEST !== "disposable-synthetic-instance"
)
  throw new Error(
    "Use only an empty disposable local Compose instance; set CONFIRM_CHANNEL_COMPOSE_TEST=disposable-synthetic-instance",
  );
const root = process.cwd();
const password = randomBytes(24).toString("hex");
const env = {
  ...process.env,
  DOCKER_HOST: "unix:///var/run/docker.sock",
  BOOTSTRAP_EMAIL: "compose-operator@example.invalid",
  BOOTSTRAP_PASSWORD: password,
};
const docker = (...args) =>
  execFileSync(
    "docker",
    ["--host=unix:///var/run/docker.sock", "compose", ...args],
    { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] },
  );
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch("http://localhost:3000/api/health")).ok) break;
  } catch {
    /* wait for the local health endpoint */
  }
  await new Promise((r) => setTimeout(r, 200));
}
docker(
  "run",
  "--rm",
  "--no-deps",
  "-e",
  "BOOTSTRAP_EMAIL",
  "-e",
  "BOOTSTRAP_PASSWORD",
  "migrate",
  "node",
  "src/bootstrap.js",
);
let cookie;
async function call(method, path, body, headers = {}) {
  const r = await fetch("http://localhost:3000/api" + path, {
    method,
    headers: {
      Connection: "close",
      Origin: "http://localhost:3000",
      "X-CSRF-Protection": "1",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body
        ? {
            "Content-Type":
              body instanceof Uint8Array
                ? "application/octet-stream"
                : "application/json",
          }
        : {}),
      ...headers,
    },
    body:
      body instanceof Uint8Array
        ? body
        : body
          ? JSON.stringify(body)
          : undefined,
  });
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  if (!r.ok) throw new Error(`Smoke ${method} ${path}: ${r.status}`);
  return r;
}
await call("POST", "/auth/login", { email: env.BOOTSTRAP_EMAIL, password });
const company = await (
  await call("POST", "/owner/companies", {
    name: "Compose synthetic company",
    package: "Professional",
  })
).json();
const account = await (
  await call("POST", "/owner/accounts", {
    email: "compose-admin@example.invalid",
    password,
  })
).json();
await call("PUT", `/companies/${company.id}/memberships/${account.id}`, {
  role: "organisation-admin",
  status: "active",
});
await call("POST", "/auth/logout", {});
cookie = null;
await call("POST", "/auth/login", {
  email: "compose-admin@example.invalid",
  password,
});
const task = await (
  await call("POST", `/companies/${company.id}/records`, {
    module: "tasks",
    title: "Backup synthetic task",
  })
).json();
const pdf = Buffer.from("%PDF-1.7\nCompose backup synthetic");
const file = await (
  await call("POST", `/companies/${company.id}/files`, pdf, {
    "X-File-Name": "backup.pdf",
  })
).json();
const dir = await mkdtemp(path.join(os.tmpdir(), "channel-recovery-test-"));
const backup = dir + "/set";
execFileSync("sh", ["server/scripts/backup.sh", backup], {
  cwd: root,
  env,
  stdio: "pipe",
});
await call("PATCH", `/companies/${company.id}/records/${task.id}`, {
  version: 1,
  title: "After snapshot",
});
execFileSync("sh", ["server/scripts/restore.sh", backup], {
  cwd: root,
  env: { ...env, CONFIRM_CHANNEL_RESTORE: "restore-this-channel-instance" },
  stdio: "pipe",
});
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch("http://localhost:3000/api/health")).ok) break;
  } catch {
    /* wait for the local health endpoint */
  }
  await new Promise((r) => setTimeout(r, 200));
}
const revoked = await fetch("http://localhost:3000/api/auth/session", {
  headers: { Cookie: cookie },
});
if (revoked.status !== 401) throw Error("Restored session survived");
cookie = null;
await call("POST", "/auth/login", {
  email: "compose-admin@example.invalid",
  password,
});
const restored = await (
  await call("GET", `/companies/${company.id}/records/${task.id}`)
).json();
if (restored.title !== "Backup synthetic task")
  throw Error("DB restore mismatch");
const downloaded = Buffer.from(
  await (
    await call("GET", `/companies/${company.id}/files/${file.id}`)
  ).arrayBuffer(),
);
if (!downloaded.equals(pdf)) throw Error("File restore mismatch");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/owner-admin/");
  await page
    .getByRole("button", { name: "Private server workspace", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(env.BOOTSTRAP_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Sign in to private server", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Server storage", exact: true })
    .waitFor();
  await page
    .getByText(
      `Compose synthetic company: ${pdf.length} bytes used / 1073741824 bytes quota`,
    )
    .waitFor({ state: "visible" });
  // Rehearse an actual pre-hardening archive, not only a fresh schema upgrade.
  docker(
    "exec",
    "-T",
    "db",
    "createdb",
    "-U",
    "channel_migrator",
    "legacy_fixture",
  );
  const legacyId = randomUUID();
  const oldSql = await readFile(
    new URL("../migrations/001_foundation.sql", import.meta.url),
    "utf8",
  );
  const oldHash = createHash("sha256").update(oldSql).digest("hex");
  const passwordHash = await hashPassword(password);
  const seed =
    oldSql +
    `\nCREATE TABLE schema_migrations(name text PRIMARY KEY,checksum text NOT NULL);
  INSERT INTO schema_migrations VALUES('001_foundation.sql','${oldHash}');
  INSERT INTO accounts(id,email,password_hash,platform_admin) VALUES('${legacyId}','legacy-compose@example.invalid','${passwordHash}',true);
  INSERT INTO audit_events(actor_id,action,target) VALUES('${legacyId}','legacy.app_event','legacy');
  GRANT SELECT,INSERT,DELETE ON audit_events TO channel_app;`;
  execFileSync(
    "docker",
    [
      "--host=unix:///var/run/docker.sock",
      "compose",
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      "channel_migrator",
      "-d",
      "legacy_fixture",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { cwd: root, env, input: seed, stdio: ["pipe", "pipe", "pipe"] },
  );
  const legacyDir = path.join(dir, "legacy-set"),
    empty = path.join(dir, "empty");
  await mkdir(legacyDir);
  await mkdir(empty);
  const legacyDump = docker(
    "exec",
    "-T",
    "db",
    "pg_dump",
    "-U",
    "channel_migrator",
    "-d",
    "legacy_fixture",
    "-Fc",
  );
  const legacyFiles = execFileSync("tar", ["-C", empty, "-cf", "-", "."]);
  await writeFile(path.join(legacyDir, "database.dump"), legacyDump);
  await writeFile(path.join(legacyDir, "uploads.tar"), legacyFiles);
  await writeFile(
    path.join(legacyDir, "SHA256SUMS"),
    createHash("sha256").update(legacyDump).digest("hex") +
      "  database.dump\n" +
      createHash("sha256").update(legacyFiles).digest("hex") +
      "  uploads.tar\n",
  );
  execFileSync("sh", ["server/scripts/restore.sh", legacyDir], {
    cwd: root,
    env: { ...env, CONFIRM_CHANNEL_RESTORE: "restore-this-channel-instance" },
    stdio: "pipe",
  });
  cookie = null;
  await call("POST", "/auth/login", {
    email: "legacy-compose@example.invalid",
    password,
  });
  await call("POST", "/owner/companies", {
    name: "After legacy restore",
    package: "Essential",
  });
  const provenance = docker(
    "exec",
    "-T",
    "db",
    "psql",
    "-U",
    "channel_migrator",
    "-d",
    "channel",
    "-Atc",
    "SELECT provenance FROM audit_events WHERE target='legacy'",
  )
    .toString()
    .trim();
  if (provenance !== "legacy") throw Error("Legacy audit provenance lost");
  const acl = docker(
    "exec",
    "-T",
    "db",
    "psql",
    "-U",
    "channel_migrator",
    "-d",
    "channel",
    "-Atc",
    "SELECT has_table_privilege('channel_app','public.audit_events','INSERT')",
  )
    .toString()
    .trim();
  if (acl !== "f") throw Error("Legacy runtime audit ACL restored");
  console.log(
    "Compose bootstrap, tenant CRUD/upload, current and legacy backup restore, ACL reapplication, session revocation and real browser operator storage flow passed.",
  );
} finally {
  await browser.close();
  await rm(dir, { recursive: true, force: true });
}
