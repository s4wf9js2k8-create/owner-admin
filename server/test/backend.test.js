import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { createPool, transaction } from "../src/db.js";
import { migrate } from "../src/migrate.js";
import { hashPassword, verifyPassword } from "../src/auth.js";
import { createApp } from "../src/app.js";
const docker = (...args) =>
  execFileSync("docker", ["--host=unix:///var/run/docker.sock", ...args], {
    encoding: "utf8",
    maxBuffer: 5 * 1024 * 1024,
  });
const origin = "http://localhost:3000";
const secret = randomBytes(24).toString("hex");
const container = "channel-test-" + randomUUID();
const ids = {};
const agents = {};
let admin, appPool, app, root, alpha, beta, task;
const mutate = (agent, method, url, body) =>
  agent[method](url)
    .set("origin", origin)
    .set("x-csrf-protection", "1")
    .send(body);
const login = async (name, pass = secret) => {
  const agent = request.agent(app);
  const result = await mutate(agent, "post", "/auth/login", {
    email: `${name}@example.invalid`,
    password: pass,
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return agent;
};
before(async () => {
  docker(
    "run",
    "-d",
    "--name",
    container,
    "-e",
    `POSTGRES_PASSWORD=${secret}`,
    "-e",
    "POSTGRES_DB=channel",
    "-p",
    "127.0.0.1::5432",
    "postgres:17-alpine",
  );
  const port = docker("port", container, "5432/tcp").trim().split(":").at(-1);
  admin = createPool(`postgres://postgres:${secret}@127.0.0.1:${port}/channel`);
  for (let i = 0; i < 100; i++) {
    try {
      await admin.query("SELECT 1");
      break;
    } catch (e) {
      if (i === 99) throw e;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  await migrate(admin);
  await migrate(admin);
  await admin.query(
    `CREATE ROLE channel_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${secret}'`,
  );
  await admin.query(
    "GRANT USAGE ON SCHEMA public TO channel_app; GRANT SELECT,INSERT,UPDATE,DELETE ON accounts,sessions,password_resets,companies,memberships,records,files,upgrade_requests,access_grants,packages TO channel_app; GRANT SELECT,INSERT ON audit_events TO channel_app; GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO channel_app",
  );
  appPool = createPool(
    `postgres://channel_app:${secret}@127.0.0.1:${port}/channel`,
  );
  root = await mkdtemp(path.join(os.tmpdir(), "channel-test-"));
  app = await createApp({
    pool: appPool,
    storageRoot: path.join(root, "uploads"),
    recoveryRoot: path.join(root, "recovery"),
    origin,
    secureCookies: false,
    globalStorageBytes: 20000,
    maxFileBytes: 1024,
  });
  const hash = await hashPassword(secret);
  for (const name of ["owner", "alice", "bob", "staff", "viewer", "spare"]) {
    ids[name] = randomUUID();
    await admin.query(
      "INSERT INTO accounts(id,email,password_hash,platform_admin) VALUES($1,$2,$3,$4)",
      [ids[name], `${name}@example.invalid`, hash, name === "owner"],
    );
    agents[name] = await login(name);
  }
  alpha = (
    await mutate(agents.owner, "post", "/owner/companies", {
      name: "Synthetic Alpha",
      package: "Essential",
      quota_bytes: 1000,
    })
  ).body;
  beta = (
    await mutate(agents.owner, "post", "/owner/companies", {
      name: "Synthetic Beta",
      package: "Professional",
      quota_bytes: 1000,
    })
  ).body;
  assert(alpha.id && beta.id);
  for (const [name, company, role] of [
    ["alice", alpha, "organisation-admin"],
    ["bob", beta, "organisation-admin"],
    ["staff", alpha, "staff"],
    ["viewer", alpha, "viewer"],
  ]) {
    const result = await mutate(
      agents.owner,
      "put",
      `/companies/${company.id}/memberships/${ids[name]}`,
      { role, status: "active" },
    );
    assert.equal(result.status, 200, JSON.stringify(result.body));
  }
});
after(async () => {
  await appPool?.end();
  await admin?.end();
  docker("rm", "-f", container);
  if (root) await rm(root, { recursive: true, force: true });
});
test("password hashes use unique salts; authentication, CSRF, invalid requests and errors", async () => {
  const a = await hashPassword(secret),
    b = await hashPassword(secret);
  assert.notEqual(a, b);
  assert(!a.includes(secret));
  assert(await verifyPassword(secret, a));
  assert(!(await verifyPassword("wrong", a)));
  assert.equal((await request(app).get("/companies")).status, 401);
  assert.equal(
    (
      await request(app)
        .post("/auth/login")
        .send({ email: "owner@example.invalid", password: secret })
    ).status,
    403,
  );
  assert.equal(
    (
      await mutate(request(app), "post", "/auth/login", {
        email: "owner@example.invalid",
        password: "wrong",
      })
    ).status,
    401,
  );
  const bad = await mutate(
    agents.alice,
    "post",
    `/companies/${alpha.id}/records`,
    { module: "tasks", title: "X", company_id: beta.id },
  );
  assert.equal(bad.status, 400);
  assert.deepEqual(bad.body, { error: "INVALID_INPUT" });
  assert.equal(
    (await agents.alice.get("/companies/not-a-uuid/records?module=tasks"))
      .status,
    400,
  );
  assert.equal(
    (
      await agents.alice.get(
        "/companies/" + alpha.id + "/records?module=tasks&limit=999",
      )
    ).status,
    400,
  );
});
test("CRUD is versioned and both API and direct runtime SQL isolate companies", async () => {
  const created = await mutate(
    agents.alice,
    "post",
    `/companies/${alpha.id}/records`,
    { module: "tasks", title: "Synthetic task" },
  );
  assert.equal(created.status, 201, JSON.stringify(created.body));
  task = created.body;
  for (const agent of [agents.bob, agents.owner]) {
    assert.equal(
      (await agent.get(`/companies/${alpha.id}/records/${task.id}`)).status,
      403,
    );
    assert.equal(
      (await agent.get(`/companies/${alpha.id}/records?module=tasks`)).status,
      403,
    );
    assert.equal(
      (
        await mutate(
          agent,
          "patch",
          `/companies/${alpha.id}/records/${task.id}`,
          { title: "Attack", version: 1 },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await mutate(
          agent,
          "delete",
          `/companies/${alpha.id}/records/${task.id}`,
          { version: 1 },
        )
      ).status,
      403,
    );
  }
  const betaTask = await mutate(
    agents.bob,
    "post",
    `/companies/${beta.id}/records`,
    { module: "tasks", title: "Beta task" },
  );
  assert.equal(betaTask.status, 201);
  assert.equal(
    (
      await agents.alice.get(
        `/companies/${beta.id}/records/${betaTask.body.id}`,
      )
    ).status,
    403,
  );
  for (const statement of [
    "UPDATE records SET title='forged',version=version+1 WHERE company_id=$1",
    "DELETE FROM records WHERE company_id=$1",
  ]) {
    const denied = await transaction(appPool, ids.bob, (db) =>
      db.query(statement, [alpha.id]),
    );
    assert.equal(denied.rowCount, 0);
  }
  const escalation = await transaction(appPool, ids.staff, (db) =>
    db.query(
      "UPDATE memberships SET role='organisation-admin' WHERE company_id=$1 AND account_id=$2",
      [alpha.id, ids.staff],
    ),
  );
  assert.equal(escalation.rowCount, 0);
  await assert.rejects(
    transaction(appPool, ids.alice, (db) =>
      db.query(
        "UPDATE records SET id=$1,version=version+1 WHERE company_id=$2 AND id=$3",
        [randomUUID(), alpha.id, task.id],
      ),
    ),
    { code: "23514" },
  );
  const rows = await transaction(appPool, ids.bob, (db) =>
    db.query("SELECT * FROM records WHERE company_id=$1", [alpha.id]),
  );
  assert.equal(rows.rowCount, 0);
  await assert.rejects(
    transaction(appPool, ids.bob, (db) =>
      db.query(
        "INSERT INTO records(id,company_id,module,title,created_by) VALUES($1,$2,'tasks','Attack',$3)",
        [randomUUID(), alpha.id, ids.bob],
      ),
    ),
    { code: "42501" },
  );
  assert.equal(
    (
      await transaction(appPool, null, (db) =>
        db.query("SELECT * FROM records"),
      )
    ).rowCount,
    0,
  );
  const results = await Promise.all([
    mutate(agents.alice, "patch", `/companies/${alpha.id}/records/${task.id}`, {
      progress: 50,
      version: 1,
    }),
    mutate(agents.alice, "patch", `/companies/${alpha.id}/records/${task.id}`, {
      progress: 90,
      version: 1,
    }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (
      await mutate(
        agents.staff,
        "delete",
        `/companies/${alpha.id}/records/${task.id}`,
        { version: 2 },
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await mutate(
        agents.alice,
        "delete",
        `/companies/${alpha.id}/records/${task.id}`,
        { version: 1 },
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await mutate(
        agents.alice,
        "delete",
        `/companies/${alpha.id}/records/${task.id}`,
        { version: 2 },
      )
    ).status,
    200,
  );
});
test("roles cannot escalate; membership revocation and company suspension apply to existing sessions", async () => {
  for (const agent of [agents.alice, agents.staff, agents.viewer])
    assert.equal(
      (
        await mutate(agent, "post", "/owner/companies", {
          name: "Attack",
          package: "Enterprise",
        })
      ).status,
      403,
    );
  assert.equal(
    (
      await mutate(
        agents.alice,
        "put",
        `/companies/${alpha.id}/memberships/${ids.alice}`,
        { role: "organisation-admin", status: "active", version: 1 },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await mutate(
        agents.alice,
        "put",
        `/companies/${alpha.id}/memberships/${ids.viewer}`,
        { role: "platform-owner", status: "active", version: 1 },
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await mutate(agents.viewer, "post", `/companies/${alpha.id}/records`, {
        module: "tasks",
        title: "Attack",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await mutate(
        agents.alice,
        "put",
        `/companies/${alpha.id}/memberships/${ids.viewer}`,
        { role: "viewer", status: "revoked", version: 1 },
      )
    ).status,
    200,
  );
  assert.equal(
    (await agents.viewer.get(`/companies/${alpha.id}/records?module=tasks`))
      .status,
    403,
  );
  let row = (await agents.owner.get("/companies")).body.find(
    (c) => c.id === beta.id,
  );
  assert.equal(
    (
      await mutate(agents.owner, "patch", `/owner/companies/${beta.id}`, {
        version: row.version,
        status: "suspended",
      })
    ).status,
    200,
  );
  assert.equal(
    (await agents.bob.get(`/companies/${beta.id}/records?module=tasks`)).status,
    403,
  );
  row = (await agents.owner.get("/companies")).body.find(
    (c) => c.id === beta.id,
  );
  await mutate(agents.owner, "patch", `/owner/companies/${beta.id}`, {
    version: row.version,
    status: "active",
  });
});
test("upgrade and feature requests remain pending until owner approval; stale approvals and module restrictions", async () => {
  assert.equal(
    (
      await mutate(agents.alice, "post", `/companies/${alpha.id}/records`, {
        module: "attendance",
        title: "Denied",
        attendance_minutes: 60,
      })
    ).status,
    403,
  );
  const req = await mutate(
    agents.alice,
    "post",
    `/companies/${alpha.id}/requests`,
    { package: "Professional" },
  );
  assert.equal(req.status, 201);
  assert.equal(
    (
      await mutate(
        agents.alice,
        "post",
        `/owner/requests/${req.body.id}/decision`,
        { decision: "approved", version: 1, company_version: 1 },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await mutate(
        agents.owner,
        "post",
        `/owner/requests/${req.body.id}/decision`,
        { decision: "approved", version: 1, company_version: 99 },
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await mutate(
        agents.owner,
        "post",
        `/owner/requests/${req.body.id}/decision`,
        { decision: "approved", version: 1, company_version: 1 },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await mutate(
        agents.owner,
        "post",
        `/owner/requests/${req.body.id}/decision`,
        { decision: "approved", version: 1, company_version: 2 },
      )
    ).status,
    409,
  );
  const attendance = await mutate(
    agents.alice,
    "post",
    `/companies/${alpha.id}/records`,
    {
      module: "attendance",
      title: "Synthetic attendance",
      attendance_minutes: 60,
    },
  );
  assert.equal(attendance.status, 201);
  assert.equal(
    (
      await mutate(agents.owner, "patch", `/owner/companies/${alpha.id}`, {
        package: "Essential",
        version: 2,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await agents.alice.get(
        `/companies/${alpha.id}/records/${attendance.body.id}`,
      )
    ).status,
    404,
  );
  assert.equal(
    (await agents.alice.get(`/companies/${alpha.id}/records?module=attendance`))
      .status,
    403,
  );
  const feature = await mutate(
    agents.alice,
    "post",
    `/companies/${alpha.id}/requests`,
    { feature: "attendance" },
  );
  assert.equal(feature.status, 201);
  assert.equal(
    (
      await mutate(
        agents.owner,
        "post",
        `/owner/requests/${feature.body.id}/decision`,
        { decision: "approved", version: 1, company_version: 3 },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await agents.alice.get(
        `/companies/${alpha.id}/records/${attendance.body.id}`,
      )
    ).status,
    200,
  );
});
test("platform customer record access needs expiring explicit read grant and is audited", async () => {
  assert.equal(
    (await agents.owner.get(`/companies/${beta.id}/records?module=tasks`))
      .status,
    403,
  );
  const grant = await mutate(agents.owner, "post", "/owner/access-grants", {
    company_id: beta.id,
    reason: "Synthetic support investigation",
    minutes: 5,
  });
  assert.equal(grant.status, 201, JSON.stringify(grant.body));
  assert.equal(
    (await agents.owner.get(`/companies/${beta.id}/records?module=tasks`))
      .status,
    200,
  );
  assert.equal(
    (
      await mutate(agents.owner, "post", `/companies/${beta.id}/records`, {
        module: "tasks",
        title: "Still denied",
      })
    ).status,
    403,
  );
  const events = await admin.query(
    "SELECT * FROM audit_events WHERE actor_id=$1 AND company_id=$2 AND action='records.list'",
    [ids.owner, beta.id],
  );
  assert(events.rowCount > 0);
  await mutate(
    agents.owner,
    "delete",
    `/owner/access-grants/${grant.body.id}`,
    {},
  );
  assert.equal(
    (await agents.owner.get(`/companies/${beta.id}/records?module=tasks`))
      .status,
    403,
  );
});
test("file signatures, sizes, quotas, ownership, traversal and storage dashboard", async () => {
  const upload = (agent, cid, name, bytes) =>
    agent
      .post(`/companies/${cid}/files`)
      .set("origin", origin)
      .set("x-csrf-protection", "1")
      .set("x-file-name", name)
      .set("content-type", "application/octet-stream")
      .send(bytes);
  const pdf = Buffer.from("%PDF-1.7\nSynthetic document");
  assert.equal(
    (await upload(agents.alice, alpha.id, "../../escape.pdf", pdf)).status,
    400,
  );
  assert.equal(
    (
      await upload(
        agents.alice,
        alpha.id,
        "evil.html",
        Buffer.from("<script>evil</script>"),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await upload(
        agents.alice,
        alpha.id,
        "large.pdf",
        Buffer.concat([pdf, Buffer.alloc(2000)]),
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await upload(
        agents.alice,
        alpha.id,
        "quota.pdf",
        Buffer.concat([pdf, Buffer.alloc(980)]),
      )
    ).status,
    409,
  );
  const result = await upload(agents.alice, alpha.id, "synthetic.pdf", pdf);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  const file = result.body;
  assert.equal(
    (await agents.bob.get(`/companies/${alpha.id}/files/${file.id}`)).status,
    403,
  );
  assert.equal(
    (await agents.owner.get(`/companies/${alpha.id}/files/${file.id}`)).status,
    403,
  );
  const downloaded = await agents.alice.get(
    `/companies/${alpha.id}/files/${file.id}`,
  );
  assert.equal(downloaded.status, 200);
  assert.match(downloaded.headers["content-disposition"], /attachment/);
  assert.equal(downloaded.headers["x-content-type-options"], "nosniff");
  const summary = await agents.owner.get("/owner/storage");
  assert.equal(summary.status, 200);
  assert.equal(
    Number(summary.body.companies.find((c) => c.id === alpha.id).used_bytes),
    pdf.length,
  );
  assert.equal((await agents.alice.get("/owner/storage")).status, 403);
  const target = path.join(root, "uploads", file.id);
  await rm(target);
  await symlink("/etc/passwd", target);
  assert.equal(
    (await agents.alice.get(`/companies/${alpha.id}/files/${file.id}`)).status,
    503,
  );
  await rm(target);
  assert.equal(
    (
      await mutate(
        agents.alice,
        "delete",
        `/companies/${alpha.id}/files/${file.id}`,
        {},
      )
    ).status,
    200,
  );
});
test("account suspension, recovery, token single use and session revocation", async () => {
  assert.equal(
    (
      await mutate(agents.owner, "patch", `/owner/accounts/${ids.spare}`, {
        status: "suspended",
      })
    ).status,
    200,
  );
  assert.equal((await agents.spare.get("/auth/session")).status, 401);
  await mutate(agents.owner, "patch", `/owner/accounts/${ids.spare}`, {
    status: "active",
  });
  const before = await mutate(request(app), "post", "/auth/recovery", {
    email: "missing@example.invalid",
  });
  const existing = await mutate(request(app), "post", "/auth/recovery", {
    email: "alice@example.invalid",
  });
  assert.deepEqual(before.body, existing.body);
  assert.equal(existing.status, 202);
  const files = await readdir(path.join(root, "recovery"));
  const delivery = JSON.parse(
    await readFile(path.join(root, "recovery", files[0]), "utf8"),
  );
  const reset = delivery.url.split("#recovery=")[1];
  const nextPassword = randomBytes(24).toString("hex");
  assert.equal(
    (
      await mutate(request(app), "post", "/auth/reset", {
        token: reset,
        password: nextPassword,
      })
    ).status,
    200,
  );
  assert.equal((await agents.alice.get("/auth/session")).status, 401);
  assert.equal(
    (
      await mutate(request(app), "post", "/auth/reset", {
        token: reset,
        password: nextPassword,
      })
    ).status,
    400,
  );
  agents.alice = await login("alice", nextPassword);
  const logout = await mutate(agents.alice, "post", "/auth/logout", {});
  assert.equal(logout.status, 200);
  assert.equal((await agents.alice.get("/auth/session")).status, 401);
});
test("migrations, least privilege, immutable audits and real PostgreSQL backup restore", async () => {
  assert.equal(
    (await admin.query("SELECT * FROM schema_migrations")).rowCount,
    1,
  );
  const flags = (
    await appPool.query(
      "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
    )
  ).rows[0];
  assert.equal(flags.rolsuper, false);
  assert.equal(flags.rolbypassrls, false);
  await assert.rejects(appPool.query("DELETE FROM audit_events"), {
    code: "42501",
  });
  const pdf = Buffer.from("%PDF-1.7\nBackup synthetic document");
  const uploaded = await agents.bob
    .post(`/companies/${beta.id}/files`)
    .set("origin", origin)
    .set("x-csrf-protection", "1")
    .set("x-file-name", "backup.pdf")
    .set("content-type", "application/octet-stream")
    .send(pdf);
  assert.equal(uploaded.status, 201);
  const archive = execFileSync("tar", [
    "-C",
    path.join(root, "uploads"),
    "-cf",
    "-",
    ".",
  ]);
  const restoredDirectory = await mkdtemp(path.join(root, "restore-files-"));
  execFileSync("tar", ["-C", restoredDirectory, "-xf", "-"], {
    input: archive,
  });
  assert.deepEqual(
    await readFile(path.join(restoredDirectory, uploaded.body.id)),
    pdf,
  );
  const originalChecksum = (
    await admin.query("SELECT checksum FROM schema_migrations LIMIT 1")
  ).rows[0].checksum;
  await admin.query("UPDATE schema_migrations SET checksum='tampered'");
  await assert.rejects(migrate(admin), /checksum mismatch/);
  await admin.query("UPDATE schema_migrations SET checksum=$1", [
    originalChecksum,
  ]);
  const dump = execFileSync("docker", [
    "--host=unix:///var/run/docker.sock",
    "exec",
    container,
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    "channel",
    "-Fc",
  ]);
  docker("exec", container, "createdb", "-U", "postgres", "restore_check");
  execFileSync(
    "docker",
    [
      "--host=unix:///var/run/docker.sock",
      "exec",
      "-i",
      container,
      "pg_restore",
      "-U",
      "postgres",
      "-d",
      "restore_check",
      "--exit-on-error",
    ],
    { input: dump },
  );
  const counts = docker(
    "exec",
    container,
    "psql",
    "-U",
    "postgres",
    "-d",
    "restore_check",
    "-Atc",
    "SELECT count(*) FROM companies",
  );
  assert.equal(Number(counts.trim()), 2);
  const rls = docker(
    "exec",
    container,
    "psql",
    "-U",
    "postgres",
    "-d",
    "restore_check",
    "-Atc",
    "SELECT relrowsecurity FROM pg_class WHERE relname='records'",
  );
  assert.equal(rls.trim(), "t");
  assert.equal(
    docker(
      "exec",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "restore_check",
      "-Atc",
      "SELECT count(*) FROM schema_migrations",
    ).trim(),
    "1",
  );
});

test("expired sessions and grants fail, and concurrent uploads cannot exceed a tenant quota", async () => {
  const agent = await login("spare");
  await admin.query(
    "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE account_id=$1",
    [ids.spare],
  );
  assert.equal((await agent.get("/auth/session")).status, 401);
  const grant = await mutate(agents.owner, "post", "/owner/access-grants", {
    company_id: beta.id,
    reason: "Synthetic expiry investigation",
    minutes: 1,
  });
  assert.equal(grant.status, 201);
  await admin.query(
    "UPDATE access_grants SET expires_at=now()-interval '1 second' WHERE id=$1",
    [grant.body.id],
  );
  assert.equal(
    (await agents.owner.get(`/companies/${beta.id}/records?module=tasks`))
      .status,
    403,
  );
  const data = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(590)]);
  const upload = () =>
    agents.bob
      .post(`/companies/${beta.id}/files`)
      .set("origin", origin)
      .set("x-csrf-protection", "1")
      .set("x-file-name", "race.pdf")
      .set("content-type", "application/octet-stream")
      .send(data);
  const results = await Promise.all([upload(), upload()]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
});
