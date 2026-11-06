import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
test("interrupted backup aborts before file archive/manifest and restarts API only on exit", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "channel-backup-signal-"));
  try {
    const log = path.join(dir, "calls");
    await writeFile(
      path.join(dir, "docker"),
      `#!/bin/sh
printf '%s\\n' "$*" >> "$CONTROLLED_TEST_LOG"
case "$*" in
 *pg_dump*) printf 'synthetic dump'; kill -TERM "$PPID"; exit 0 ;;
esac
exit 0
`,
      { mode: 0o700 },
    );
    const destination = path.join(dir, "snapshot");
    const result = spawnSync("sh", ["server/scripts/backup.sh", destination], {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      env: {
        ...process.env,
        PATH: dir + path.delimiter + process.env.PATH,
        CONTROLLED_TEST_LOG: log,
      },
      encoding: "utf8",
      timeout: 10000,
    });
    assert.equal(result.status, 1, result.stderr);
    await assert.rejects(readFile(path.join(destination, "SHA256SUMS")), {
      code: "ENOENT",
    });
    const calls = await readFile(log, "utf8");
    assert(calls.includes("compose start api"));
    assert(!calls.includes("--entrypoint tar"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
