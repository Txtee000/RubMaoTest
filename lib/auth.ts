import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "rubmao_session";
export const SESSION_SECONDS = 8 * 60 * 60;

function config() {
  const username = process.env.BOSS_USERNAME;
  const password = process.env.BOSS_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!username || !password || !secret || secret.length < 32) return null;
  return { username, password, secret };
}

function signature(payload: string, settings: NonNullable<ReturnType<typeof config>>) {
  return createHmac("sha256", settings.secret)
    .update(JSON.stringify([payload, settings.username, settings.password]))
    .digest("base64url");
}

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function login(username: string, password: string) {
  const settings = config();
  if (!settings) return { error: "config" } as const;
  // Hash both inputs to compare equal-length buffers.
  const hash = (value: string) => createHmac("sha256", settings.secret).update(value).digest("hex");
  const validUser = equal(hash(username), hash(settings.username));
  const validPassword = equal(hash(password), hash(settings.password));
  if (!validUser || !validPassword) return { error: "credentials" } as const;
  const payload = Buffer.from(JSON.stringify({
    expires: Date.now() + SESSION_SECONDS * 1000,
    nonce: randomBytes(16).toString("hex"),
  })).toString("base64url");
  return { token: `${payload}.${signature(payload, settings)}` } as const;
}

export function validSession(token: string | undefined) {
  const settings = config();
  if (!settings || !token || token.length > 1024) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !equal(parts[1], signature(parts[0], settings))) return false;
  try {
    const session = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return typeof session.expires === "number" && session.expires > Date.now();
  } catch {
    return false;
  }
}
