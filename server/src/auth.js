import {
  scrypt as scryptCallback,
  randomBytes,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export const digest = (token) =>
  createHash("sha256").update(token).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password, encoded) {
  const [scheme, salt, hex] = encoded.split("$");
  if (scheme !== "scrypt" || !salt || !/^[a-f0-9]{128}$/.test(hex ?? ""))
    return false;
  const key = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(key, Buffer.from(hex, "hex"));
}
