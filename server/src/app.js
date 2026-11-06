import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { transaction, audit } from "./db.js";
import { hashPassword, verifyPassword, digest, token } from "./auth.js";
import { detectType, storeFile, loadFile, removeFile } from "./files.js";
const uuid = z.uuid();
const password = z.string().min(12).max(128);
const email = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const modules = z
  .array(z.enum(["tasks", "attendance", "general", "reporting"]))
  .max(4)
  .refine((v) => new Set(v).size === v.length);
const version = z.number().int().positive();
const record = z
  .object({
    module: z.enum(["tasks", "attendance", "general"]),
    title: z.string().trim().min(1).max(100),
    detail: z.string().max(1000).default(""),
    progress: z.number().int().min(0).max(100).default(0),
    attendance_minutes: z
      .number()
      .int()
      .min(0)
      .max(1440)
      .nullable()
      .default(null),
  })
  .strict();
const patchRecord = record
  .omit({ module: true })
  .partial()
  .extend({ version })
  .strict()
  .refine((v) => Object.keys(v).length > 1);
const error = (code, status = 400) =>
  Object.assign(new Error(code), { code, status });
const requireRow = (result) => {
  if (!result.rowCount) throw error("NOT_FOUND", 404);
  return result.rows[0];
};
const checkVersion = (row, v) => {
  if (row.version !== v) throw error("CONFLICT", 409);
};
export async function createApp({
  pool,
  storageRoot,
  recoveryRoot,
  origin = "http://localhost:3000",
  secureCookies = true,
  globalStorageBytes = 20 * 1024 ** 3,
  maxFileBytes = 10 * 1024 ** 2,
}) {
  if (!pool || !storageRoot || !recoveryRoot || !/^https?:\/\//.test(origin))
    throw new Error(
      "Explicit database, storage, recovery and origin configuration required",
    );
  if (
    !Number.isSafeInteger(globalStorageBytes) ||
    globalStorageBytes < 1 ||
    !Number.isSafeInteger(maxFileBytes) ||
    maxFileBytes < 1 ||
    new URL(origin).origin !== origin
  )
    throw new Error("Invalid storage or origin configuration");
  if (
    !secureCookies &&
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)
  )
    throw new Error(
      "Insecure cookies are permitted only for loopback development",
    );
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use((req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      (req.get("origin") !== origin || req.get("x-csrf-protection") !== "1")
    )
      return res.status(403).json({ error: "FORBIDDEN" });
    next();
  });
  app.use(express.json({ limit: "32kb", type: "application/json" }));
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  const cookieName = secureCookies
    ? "__Host-channel_session"
    : "channel_session";
  const cookieOptions = {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "strict",
    path: "/",
    maxAge: 12 * 3600000,
  };
  const dummyHash = await hashPassword(token());
  const wrap = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      next(e);
    }
  };
  const authenticate = wrap(async (req, _res) => {
    const raw = (req.headers.cookie ?? "")
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw))
      throw error("UNAUTHENTICATED", 401);
    const result = await pool.query(
      "SELECT a.id,a.platform_admin FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now() AND a.status='active'",
      [digest(raw)],
    );
    if (!result.rowCount) throw error("UNAUTHENTICATED", 401);
    req.actor = result.rows[0];
    req.sessionHash = digest(raw);
  });
  // Express middleware wrapper above deliberately does not continue itself.
  const authenticated = (req, res, next) =>
    authenticate(req, res, (e) => next(e)).then(() => {
      if (req.actor) next();
    });
  const tx = (req, fn) =>
    transaction(pool, req.actor.id, async (db) => {
      const active = await db.query(
        "SELECT id FROM accounts WHERE id=$1 AND status='active' FOR SHARE",
        [req.actor.id],
      );
      if (!active.rowCount) throw error("UNAUTHENTICATED", 401);
      const session = await db.query(
        "SELECT token_hash FROM sessions WHERE token_hash=$1 AND expires_at>now() FOR SHARE",
        [req.sessionHash],
      );
      if (!session.rowCount) throw error("UNAUTHENTICATED", 401);
      return fn(db);
    });
  const owner = async (db) => {
    const r = await db.query("SELECT platform_owner() AS allowed");
    if (!r.rows[0].allowed) throw error("FORBIDDEN", 403);
  };
  const tenant = async (db, cid, write = false, admin = false) => {
    uuid.parse(cid);
    // Lock own membership so revocation cannot race an authorized mutation.
    await db.query(
      "SELECT account_id FROM memberships WHERE company_id=$1 AND account_id=subject() FOR SHARE",
      [cid],
    );
    const r = await db.query(
      "SELECT tenant_read($1) AS read, tenant_write($1) AS write, tenant_admin($1) AS admin",
      [cid],
    );
    if (!(admin ? r.rows[0].admin : write ? r.rows[0].write : r.rows[0].read))
      throw error("FORBIDDEN", 403);
    await db.query("SELECT id FROM companies WHERE id=$1 FOR SHARE", [cid]);
  };
  const log = (db, req, cid, action, target) =>
    audit(db, req.actor.id, cid, action, target);
  app.get(
    "/health",
    wrap(async (_req, res) => {
      await pool.query("SELECT 1");
      res.json({ status: "ok" });
    }),
  );
  app.post(
    "/auth/login",
    authLimit,
    wrap(async (req, res) => {
      const data = z
        .object({ email, password: z.string().max(128) })
        .strict()
        .parse(req.body);
      const result = await pool.query("SELECT * FROM accounts WHERE email=$1", [
        data.email,
      ]);
      const account = result.rows[0];
      if (
        !(await verifyPassword(
          data.password,
          account?.password_hash ?? dummyHash,
        )) ||
        account?.status !== "active"
      )
        throw error("UNAUTHENTICATED", 401);
      const raw = token();
      await transaction(pool, account.id, async (db) => {
        await db.query(
          "INSERT INTO sessions VALUES($1,$2,now()+interval '12 hours')",
          [digest(raw), account.id],
        );
        await audit(db, account.id, null, "auth.login", account.id);
      });
      res
        .cookie(cookieName, raw, cookieOptions)
        .json({ id: account.id, platformAdmin: account.platform_admin });
    }),
  );
  app.post(
    "/auth/recovery",
    authLimit,
    wrap(async (req, res) => {
      const data = z.object({ email }).strict().parse(req.body);
      const found = await pool.query(
        "SELECT id FROM accounts WHERE email=$1 AND status='active'",
        [data.email],
      );
      if (found.rowCount) {
        const raw = token();
        await pool.query(
          "INSERT INTO password_resets VALUES($1,$2,now()+interval '30 minutes')",
          [digest(raw), found.rows[0].id],
        );
        await mkdir(recoveryRoot, { recursive: true, mode: 0o700 });
        await writeFile(
          path.join(recoveryRoot, randomUUID() + ".json"),
          JSON.stringify({
            email: data.email,
            url: `${origin}/owner-admin/#recovery=${raw}`,
            expiresMinutes: 30,
          }),
          { mode: 0o600, flag: "wx" },
        );
      }
      res.status(202).json({
        message:
          "If eligible, recovery instructions will be prepared for private operator delivery.",
      });
    }),
  );
  app.post(
    "/auth/reset",
    authLimit,
    wrap(async (req, res) => {
      const data = z
        .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password })
        .strict()
        .parse(req.body);
      const hash = await hashPassword(data.password);
      await transaction(pool, null, async (db) => {
        const found = await db.query(
          "SELECT r.account_id FROM password_resets r JOIN accounts a ON a.id=r.account_id WHERE token_hash=$1 AND expires_at>now() AND a.status='active' FOR UPDATE OF r",
          [digest(data.token)],
        );
        if (!found.rowCount) throw error("INVALID_INPUT");
        const uid = found.rows[0].account_id;
        await db.query("UPDATE accounts SET password_hash=$1 WHERE id=$2", [
          hash,
          uid,
        ]);
        await db.query("DELETE FROM sessions WHERE account_id=$1", [uid]);
        await db.query("DELETE FROM password_resets WHERE account_id=$1", [
          uid,
        ]);
        await db.query("SELECT set_config('app.account_id',$1,true)", [uid]);
        await audit(db, uid, null, "auth.password_reset", uid);
      });
      res.json({ reset: true });
    }),
  );
  app.use(authenticated);
  app.get(
    "/auth/session",
    wrap(async (req, res) =>
      res.json({ id: req.actor.id, platformAdmin: req.actor.platform_admin }),
    ),
  );
  app.post(
    "/auth/logout",
    wrap(async (req, res) => {
      await tx(req, (db) =>
        db.query("DELETE FROM sessions WHERE token_hash=$1", [req.sessionHash]),
      );
      res.clearCookie(cookieName, cookieOptions).json({ loggedOut: true });
    }),
  );
  app.get(
    "/companies",
    wrap(async (req, res) =>
      res.json(
        await tx(
          req,
          async (db) =>
            (await db.query("SELECT * FROM companies ORDER BY name LIMIT 100"))
              .rows,
        ),
      ),
    ),
  );
  app.get(
    "/packages",
    wrap(async (req, res) =>
      res.json(
        await tx(
          req,
          async (db) =>
            (await db.query("SELECT * FROM packages ORDER BY name")).rows,
        ),
      ),
    ),
  );
  app.post(
    "/owner/accounts",
    wrap(async (req, res) => {
      const data = z.object({ email, password }).strict().parse(req.body);
      const hash = await hashPassword(data.password);
      res.status(201).json(
        await tx(req, async (db) => {
          await owner(db);
          const row = requireRow(
            await db.query(
              "INSERT INTO accounts(id,email,password_hash) VALUES($1,$2,$3) RETURNING id,email,status",
              [randomUUID(), data.email, hash],
            ),
          );
          await log(db, req, null, "account.create", row.id);
          return row;
        }),
      );
    }),
  );
  app.patch(
    "/owner/accounts/:id",
    wrap(async (req, res) => {
      const id = uuid.parse(req.params.id);
      const data = z
        .object({ status: z.enum(["active", "suspended"]) })
        .strict()
        .parse(req.body);
      res.json(
        await tx(req, async (db) => {
          await owner(db);
          if (id === req.actor.id) throw error("FORBIDDEN", 403);
          const row = requireRow(
            await db.query(
              "UPDATE accounts SET status=$1 WHERE id=$2 AND NOT platform_admin RETURNING id,status",
              [data.status, id],
            ),
          );
          await db.query("DELETE FROM sessions WHERE account_id=$1", [id]);
          await log(db, req, null, "account.status", id);
          return row;
        }),
      );
    }),
  );
  app.post(
    "/owner/companies",
    wrap(async (req, res) => {
      const data = z
        .object({
          name: z.string().trim().min(1).max(100),
          package: z.enum(["Essential", "Professional", "Enterprise"]),
          color: z
            .string()
            .regex(/^#[0-9a-fA-F]{6}$/)
            .default("#28533a"),
          quota_bytes: z
            .number()
            .int()
            .min(0)
            .max(globalStorageBytes)
            .default(1024 ** 3),
        })
        .strict()
        .parse(req.body);
      res.status(201).json(
        await tx(req, async (db) => {
          await owner(db);
          const row = requireRow(
            await db.query(
              "INSERT INTO companies(id,name,package,modules,color,quota_bytes) SELECT $1,$2,name,modules,$4,$5 FROM packages WHERE name=$3 RETURNING *",
              [
                randomUUID(),
                data.name,
                data.package,
                data.color,
                data.quota_bytes,
              ],
            ),
          );
          await log(db, req, row.id, "company.create", row.id);
          return row;
        }),
      );
    }),
  );
  app.patch(
    "/owner/companies/:cid",
    wrap(async (req, res) => {
      const cid = uuid.parse(req.params.cid);
      const data = z
        .object({
          version,
          name: z.string().trim().min(1).max(100).optional(),
          color: z
            .string()
            .regex(/^#[0-9a-fA-F]{6}$/)
            .optional(),
          status: z.enum(["active", "suspended"]).optional(),
          package: z
            .enum(["Essential", "Professional", "Enterprise"])
            .optional(),
          overrides: modules.optional(),
          quota_bytes: z
            .number()
            .int()
            .min(0)
            .max(globalStorageBytes)
            .optional(),
          settings: z
            .object({ timezone: z.string().max(80) })
            .strict()
            .optional(),
        })
        .strict()
        .parse(req.body);
      res.json(
        await tx(req, async (db) => {
          await owner(db);
          const row = requireRow(
            await db.query("SELECT * FROM companies WHERE id=$1 FOR UPDATE", [
              cid,
            ]),
          );
          await db.query("SELECT pg_advisory_xact_lock(778899)");
          checkVersion(row, data.version);
          const next = { ...row, ...data };
          const included = requireRow(
            await db.query("SELECT modules FROM packages WHERE name=$1", [
              next.package,
            ]),
          ).modules;
          const enabled =
            "package" in data || "overrides" in data
              ? [...new Set([...included, ...next.overrides])]
              : row.modules;
          const result = requireRow(
            await db.query(
              "UPDATE companies SET name=$2,color=$3,status=$4,package=$5,modules=$6,overrides=$7,quota_bytes=$8,settings=$9,version=version+1 WHERE id=$1 RETURNING *",
              [
                cid,
                next.name,
                next.color,
                next.status,
                next.package,
                enabled,
                next.overrides,
                next.quota_bytes,
                next.settings,
              ],
            ),
          );
          await log(db, req, cid, "company.update", cid);
          return result;
        }),
      );
    }),
  );
  app.patch(
    "/owner/packages/:name",
    wrap(async (req, res) => {
      const name = z
        .enum(["Essential", "Professional", "Enterprise"])
        .parse(req.params.name);
      const data = z
        .object({
          version,
          modules,
          monthly_draft: z.number().int().min(0).max(100000).nullable(),
        })
        .strict()
        .parse(req.body);
      res.json(
        await tx(req, async (db) => {
          await owner(db);
          const row = requireRow(
            await db.query("SELECT * FROM packages WHERE name=$1 FOR UPDATE", [
              name,
            ]),
          );
          checkVersion(row, data.version);
          const result = requireRow(
            await db.query(
              "UPDATE packages SET modules=$2,monthly_draft=$3,version=version+1 WHERE name=$1 RETURNING *",
              [name, data.modules, data.monthly_draft],
            ),
          );
          await log(db, req, null, "package.update", name);
          return result;
        }),
      );
    }),
  );
  app.get(
    "/companies/:cid/memberships",
    wrap(async (req, res) =>
      res.json(
        await tx(req, async (db) => {
          await tenant(db, req.params.cid, false, true);
          return (
            await db.query("SELECT * FROM memberships WHERE company_id=$1", [
              req.params.cid,
            ])
          ).rows;
        }),
      ),
    ),
  );
  app.put(
    "/companies/:cid/memberships/:uid",
    wrap(async (req, res) => {
      const cid = uuid.parse(req.params.cid),
        uid = uuid.parse(req.params.uid);
      const data = z
        .object({
          role: z.enum(["viewer", "staff", "manager", "organisation-admin"]),
          status: z.enum(["active", "revoked"]),
          version: version.optional(),
        })
        .strict()
        .parse(req.body);
      res.json(
        await tx(req, async (db) => {
          const own = (await db.query("SELECT platform_owner() allowed"))
            .rows[0].allowed;
          if (!own) await tenant(db, cid, false, true);
          if (uid === req.actor.id) throw error("FORBIDDEN", 403);
          if (
            (
              await db.query(
                "SELECT platform_admin FROM accounts WHERE id=$1",
                [uid],
              )
            ).rows[0]?.platform_admin
          )
            throw error("FORBIDDEN", 403);
          const existing = await db.query(
            "SELECT * FROM memberships WHERE company_id=$1 AND account_id=$2 FOR UPDATE",
            [cid, uid],
          );
          if (existing.rowCount) {
            checkVersion(existing.rows[0], data.version);
            await db.query(
              "UPDATE memberships SET role=$3,status=$4,version=version+1 WHERE company_id=$1 AND account_id=$2",
              [cid, uid, data.role, data.status],
            );
          } else {
            if (!own) throw error("FORBIDDEN", 403);
            if (data.version !== undefined) throw error("CONFLICT", 409);
            await db.query(
              "INSERT INTO memberships(company_id,account_id,role,status) VALUES($1,$2,$3,$4)",
              [cid, uid, data.role, data.status],
            );
          }
          await log(db, req, cid, "membership.change", uid);
          return requireRow(
            await db.query(
              "SELECT * FROM memberships WHERE company_id=$1 AND account_id=$2",
              [cid, uid],
            ),
          );
        }),
      );
    }),
  );
  app.post(
    "/owner/access-grants",
    wrap(async (req, res) => {
      const data = z
        .object({
          company_id: uuid,
          reason: z.string().trim().min(10).max(300),
          minutes: z.number().int().min(1).max(60),
        })
        .strict()
        .parse(req.body);
      res.status(201).json(
        await tx(req, async (db) => {
          await owner(db);
          const row = requireRow(
            await db.query(
              "INSERT INTO access_grants VALUES($1,$2,$3,$4,now()+$5*interval '1 minute',$3) RETURNING *",
              [
                randomUUID(),
                data.company_id,
                req.actor.id,
                data.reason,
                data.minutes,
              ],
            ),
          );
          await log(db, req, data.company_id, "customer_access.grant", row.id);
          return row;
        }),
      );
    }),
  );
  app.delete(
    "/owner/access-grants/:id",
    wrap(async (req, res) => {
      const id = uuid.parse(req.params.id);
      res.json(
        await tx(req, async (db) => {
          await owner(db);
          const row = requireRow(
            await db.query(
              "DELETE FROM access_grants WHERE id=$1 RETURNING company_id",
              [id],
            ),
          );
          await log(db, req, row.company_id, "customer_access.revoke", id);
          return { deleted: true };
        }),
      );
    }),
  );
  app.get(
    "/companies/:cid/records",
    wrap(async (req, res) => {
      const module = z
        .enum(["tasks", "attendance", "general"])
        .parse(req.query.module);
      const limit = z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(100)
        .parse(req.query.limit);
      res.json(
        await tx(req, async (db) => {
          await tenant(db, req.params.cid);
          if (
            !(
              await db.query("SELECT module_enabled($1,$2) allowed", [
                req.params.cid,
                module,
              ])
            ).rows[0].allowed
          )
            throw error("FORBIDDEN", 403);
          const rows = (
            await db.query(
              "SELECT * FROM records WHERE company_id=$1 AND module=$2 ORDER BY id LIMIT $3",
              [req.params.cid, module, limit],
            )
          ).rows;
          await log(db, req, req.params.cid, "records.list", module);
          return rows;
        }),
      );
    }),
  );
  app.post(
    "/companies/:cid/records",
    wrap(async (req, res) => {
      const data = record.parse(req.body);
      if (data.module !== "attendance" && data.attendance_minutes !== null)
        throw error("INVALID_INPUT");
      res.status(201).json(
        await tx(req, async (db) => {
          await tenant(db, req.params.cid, true);
          const row = requireRow(
            await db.query(
              "INSERT INTO records(id,company_id,module,title,detail,progress,attendance_minutes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
              [
                randomUUID(),
                req.params.cid,
                data.module,
                data.title,
                data.detail,
                data.progress,
                data.attendance_minutes,
                req.actor.id,
              ],
            ),
          );
          await log(db, req, req.params.cid, "record.create", row.id);
          return row;
        }),
      );
    }),
  );
  app.get(
    "/companies/:cid/records/:id",
    wrap(async (req, res) => {
      const id = uuid.parse(req.params.id);
      res.json(
        await tx(req, async (db) => {
          await tenant(db, req.params.cid);
          const row = requireRow(
            await db.query(
              "SELECT * FROM records WHERE company_id=$1 AND id=$2",
              [req.params.cid, id],
            ),
          );
          await log(db, req, req.params.cid, "record.read", id);
          return row;
        }),
      );
    }),
  );
  app.patch(
    "/companies/:cid/records/:id",
    wrap(async (req, res) => {
      const id = uuid.parse(req.params.id),
        data = patchRecord.parse(req.body);
      res.json(
        await tx(req, async (db) => {
          await tenant(db, req.params.cid, true);
          const row = requireRow(
            await db.query(
              "SELECT * FROM records WHERE company_id=$1 AND id=$2 FOR UPDATE",
              [req.params.cid, id],
            ),
          );
          checkVersion(row, data.version);
          const next = { ...row, ...data };
          if (row.module !== "attendance" && next.attendance_minutes !== null)
            throw error("INVALID_INPUT");
          const result = requireRow(
            await db.query(
              "UPDATE records SET title=$3,detail=$4,progress=$5,attendance_minutes=$6,version=version+1 WHERE company_id=$1 AND id=$2 RETURNING *",
              [
                req.params.cid,
                id,
                next.title,
                next.detail,
                next.progress,
                next.attendance_minutes,
              ],
            ),
          );
          await log(db, req, req.params.cid, "record.update", id);
          return result;
        }),
      );
    }),
  );
  app.delete(
    "/companies/:cid/records/:id",
    wrap(async (req, res) => {
      const id = uuid.parse(req.params.id),
        data = z.object({ version }).strict().parse(req.body);
      res.json(
        await tx(req, async (db) => {
          await tenant(db, req.params.cid, true);
          const row = requireRow(
            await db.query(
              "SELECT * FROM records WHERE company_id=$1 AND id=$2 FOR UPDATE",
              [req.params.cid, id],
            ),
          );
          checkVersion(row, data.version);
          requireRow(
            await db.query(
              "DELETE FROM records WHERE company_id=$1 AND id=$2 RETURNING id",
              [req.params.cid, id],
            ),
          );
          await log(db, req, req.params.cid, "record.delete", id);
          return { deleted: true };
        }),
      );
    }),
  );
  app.post(
    "/companies/:cid/requests",
    wrap(async (req, res) => {
      const data = z
        .object({
          package: z
            .enum(["Essential", "Professional", "Enterprise"])
            .optional(),
          feature: z
            .enum(["tasks", "attendance", "general", "reporting"])
            .optional(),
        })
        .strict()
        .refine((v) => Object.keys(v).length === 1)
        .parse(req.body);
      res.status(201).json(
        await tx(req, async (db) => {
          await tenant(db, req.params.cid, false, true);
          const row = requireRow(
            await db.query(
              "INSERT INTO upgrade_requests(id,company_id,requested_by,package,feature) VALUES($1,$2,$3,$4,$5) RETURNING *",
              [
                randomUUID(),
                req.params.cid,
                req.actor.id,
                data.package ?? null,
                data.feature ?? null,
              ],
            ),
          );
          await log(db, req, req.params.cid, "request.create", row.id);
          return row;
        }),
      );
    }),
  );
  app.get(
    "/companies/:cid/requests",
    wrap(async (req, res) =>
      res.json(
        await tx(req, async (db) => {
          await tenant(db, req.params.cid);
          return (
            await db.query(
              "SELECT * FROM upgrade_requests WHERE company_id=$1 ORDER BY id LIMIT 100",
              [req.params.cid],
            )
          ).rows;
        }),
      ),
    ),
  );
  app.get(
    "/owner/requests",
    wrap(async (req, res) =>
      res.json(
        await tx(req, async (db) => {
          await owner(db);
          return (
            await db.query(
              "SELECT * FROM upgrade_requests ORDER BY id LIMIT 100",
            )
          ).rows;
        }),
      ),
    ),
  );
  app.post(
    "/owner/requests/:id/decision",
    wrap(async (req, res) => {
      const id = uuid.parse(req.params.id),
        data = z
          .object({
            decision: z.enum(["approved", "rejected"]),
            version,
            company_version: version,
          })
          .strict()
          .parse(req.body);
      res.json(
        await tx(req, async (db) => {
          await owner(db);
          const request = requireRow(
            await db.query(
              "SELECT * FROM upgrade_requests WHERE id=$1 FOR UPDATE",
              [id],
            ),
          );
          checkVersion(request, data.version);
          if (request.status !== "pending") throw error("CONFLICT", 409);
          const company = requireRow(
            await db.query("SELECT * FROM companies WHERE id=$1 FOR UPDATE", [
              request.company_id,
            ]),
          );
          checkVersion(company, data.company_version);
          if (company.status !== "active") throw error("FORBIDDEN", 403);
          if (data.decision === "approved") {
            const pkg = request.package ?? company.package;
            const overrides = request.feature
              ? [...new Set([...company.overrides, request.feature])]
              : company.overrides;
            const defaults = requireRow(
              await db.query("SELECT modules FROM packages WHERE name=$1", [
                pkg,
              ]),
            ).modules;
            await db.query(
              "UPDATE companies SET package=$2,modules=$3,overrides=$4,version=version+1 WHERE id=$1",
              [
                company.id,
                pkg,
                [...new Set([...defaults, ...overrides])],
                overrides,
              ],
            );
          }
          const result = requireRow(
            await db.query(
              "UPDATE upgrade_requests SET status=$2,version=version+1 WHERE id=$1 RETURNING *",
              [id, data.decision],
            ),
          );
          await log(db, req, company.id, "request.decision", id);
          return result;
        }),
      );
    }),
  );
  app.get(
    "/companies/:cid/files",
    wrap(async (req, res) =>
      res.json(
        await tx(req, async (db) => {
          await tenant(db, req.params.cid);
          await log(db, req, req.params.cid, "files.list", req.params.cid);
          return (
            await db.query(
              "SELECT * FROM files WHERE company_id=$1 ORDER BY id LIMIT 100",
              [req.params.cid],
            )
          ).rows;
        }),
      ),
    ),
  );
  app.post(
    "/companies/:cid/files",
    express.raw({ type: "application/octet-stream", limit: maxFileBytes }),
    wrap(async (req, res) => {
      const name = z
        .string()
        .min(1)
        .max(120)
        .refine(
          (v) =>
            !v.includes("/") &&
            !v.includes("\\") &&
            [...v].every(
              (c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127,
            ),
        )
        .parse(req.get("x-file-name"));
      if (!Buffer.isBuffer(req.body) || !req.body.length)
        throw error("INVALID_INPUT");
      const mime = detectType(req.body);
      if (!mime) throw error("INVALID_FILE_TYPE", 400);
      const id = randomUUID();
      let written = false;
      try {
        const row = await tx(req, async (db) => {
          await tenant(db, req.params.cid, true);
          await db.query("SELECT pg_advisory_xact_lock(778899)");
          const usage = requireRow(
            await db.query(
              "SELECT quota_bytes,(SELECT coalesce(sum(size_bytes),0) FROM files WHERE company_id=$1) AS used FROM companies WHERE id=$1",
              [req.params.cid],
            ),
          );
          // Aggregate disk accounting is a fixed security-definer function; no cross-tenant metadata is returned.
          const total = Number(
            (await db.query("SELECT storage_total() AS total")).rows[0].total,
          );
          if (
            Number(usage.used) + req.body.length > Number(usage.quota_bytes) ||
            total + req.body.length > globalStorageBytes
          )
            throw error("STORAGE_QUOTA", 409);
          const sha = await storeFile(storageRoot, id, req.body);
          written = true;
          const result = requireRow(
            await db.query(
              "INSERT INTO files(id,company_id,original_name,mime,size_bytes,sha256,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
              [
                id,
                req.params.cid,
                name,
                mime,
                req.body.length,
                sha,
                req.actor.id,
              ],
            ),
          );
          await log(db, req, req.params.cid, "file.upload", id);
          return result;
        });
        res.status(201).json(row);
      } catch (e) {
        if (written) await removeFile(storageRoot, id);
        throw e;
      }
    }),
  );
  app.get(
    "/companies/:cid/files/:id",
    wrap(async (req, res) => {
      const id = uuid.parse(req.params.id);
      const row = await tx(req, async (db) => {
        await tenant(db, req.params.cid);
        const result = requireRow(
          await db.query("SELECT * FROM files WHERE company_id=$1 AND id=$2", [
            req.params.cid,
            id,
          ]),
        );
        await log(db, req, req.params.cid, "file.download", id);
        return result;
      });
      const bytes = await loadFile(storageRoot, id);
      res
        .set({
          "Content-Type": row.mime,
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        })
        .send(bytes);
    }),
  );
  app.delete(
    "/companies/:cid/files/:id",
    wrap(async (req, res) => {
      const id = uuid.parse(req.params.id);
      await tx(req, async (db) => {
        await tenant(db, req.params.cid, false, true);
        requireRow(
          await db.query(
            "DELETE FROM files WHERE company_id=$1 AND id=$2 RETURNING id",
            [req.params.cid, id],
          ),
        );
        await log(db, req, req.params.cid, "file.delete", id);
      });
      await removeFile(storageRoot, id);
      res.json({ deleted: true });
    }),
  );
  app.get(
    "/owner/storage",
    wrap(async (req, res) =>
      res.json(
        await tx(req, async (db) => {
          await owner(db);
          return {
            allocation_bytes: globalStorageBytes,
            companies: (
              await db.query("SELECT * FROM storage_summary() ORDER BY name")
            ).rows,
          };
        }),
      ),
    ),
  );
  app.get(
    "/companies/:cid/audit",
    wrap(async (req, res) =>
      res.json(
        await tx(req, async (db) => {
          await tenant(db, req.params.cid, false, true);
          return (
            await db.query(
              "SELECT * FROM audit_events WHERE company_id=$1 ORDER BY id DESC LIMIT 100",
              [req.params.cid],
            )
          ).rows;
        }),
      ),
    ),
  );
  app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND" }));
  app.use(async (err, req, res, _next) => {
    const code =
      err instanceof z.ZodError
        ? "INVALID_INPUT"
        : ({
            23505: "CONFLICT",
            23503: "INVALID_INPUT",
            23514: "INVALID_INPUT",
            "22P02": "INVALID_INPUT",
            42501: "FORBIDDEN",
            "40P01": "CONFLICT",
            40001: "CONFLICT",
            "entity.too.large": "TOO_LARGE",
            "entity.parse.failed": "INVALID_INPUT",
          }[err.code ?? err.type] ?? (err.status ? err.code : "UNAVAILABLE"));
    const status =
      err instanceof z.ZodError
        ? 400
        : (err.status ??
          { CONFLICT: 409, FORBIDDEN: 403, INVALID_INPUT: 400, TOO_LARGE: 413 }[
            code
          ] ??
          503);
    if (req.actor)
      try {
        await transaction(pool, req.actor.id, (db) =>
          audit(
            db,
            req.actor.id,
            null,
            "request.denied",
            req.method + " " + req.route?.path,
            code,
          ),
        );
      } catch {
        /* account may have been suspended; do not expose internal errors */
      }
    res.status(status).json({ error: code ?? "UNAVAILABLE" });
  });
  return app;
}
