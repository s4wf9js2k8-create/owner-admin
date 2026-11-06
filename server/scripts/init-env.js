import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
// No output of secret values. Refuse to replace an existing environment file.
await writeFile(
  ".env",
  `DB_PASSWORD=${randomBytes(32).toString("hex")}\nAPI_DB_PASSWORD=${randomBytes(32).toString("hex")}\nPUBLIC_ORIGIN=http://localhost:3000\nINSECURE_LOCAL_HTTP=true\nSTORAGE_ALLOCATION_BYTES=21474836480\n`,
  { flag: "wx", mode: 0o600 },
);
console.log(
  "Created private .env for loopback-only development. Review configuration before use.",
);
