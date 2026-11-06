import { constants } from "node:fs";
import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
export const filePath = (root, id) => {
  if (!/^[a-f0-9-]{36}$/.test(id))
    throw new Error("Invalid storage identifier");
  return path.join(root, id);
};
export function detectType(buffer) {
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return "image/jpeg";
  if (buffer.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return null;
}
export async function storeFile(root, id, buffer) {
  await mkdir(root, { recursive: true, mode: 0o700 });
  const handle = await open(
    filePath(root, id),
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(buffer);
    await handle.sync();
  } finally {
    await handle.close();
  }
  return createHash("sha256").update(buffer).digest("hex");
}
export async function loadFile(root, id) {
  const handle = await open(
    filePath(root, id),
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw new Error("Not a file");
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}
export async function removeFile(root, id) {
  await unlink(filePath(root, id)).catch((e) => {
    if (e.code !== "ENOENT") throw e;
  });
}
