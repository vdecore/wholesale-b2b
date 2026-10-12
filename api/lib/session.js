import { getSessionSecret } from "./config.js";
const COOKIE_NAME = "wb2b_session";
const SESSION_HOURS = 12;

function encodeBase64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newSessionId() {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export function newCsrfToken() {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(24)));
}

export function sessionCookie(sessionId, env, { maxAgeSec }) {
  const secure = env.COOKIE_SECURE === "true" ? "; Secure" : "";
  return `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

export function clearSessionCookie(env) {
  const secure = env.COOKIE_SECURE === "true" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function parseSessionCookie(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function createAdminSession(db, adminUserId, _env) {
  const id = newSessionId();
  const csrfToken = newCsrfToken();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  await db
    .prepare(
      `INSERT INTO admin_sessions (id, admin_user_id, csrf_token, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(id, adminUserId, csrfToken, expiresAt)
    .run();
  return { id, csrfToken, expiresAt, maxAgeSec: SESSION_HOURS * 3600 };
}

export async function destroyAdminSession(db, sessionId) {
  if (!sessionId) return;
  await db.prepare(`DELETE FROM admin_sessions WHERE id = ?`).bind(sessionId).run();
}

export async function getAdminSession(db, sessionId) {
  if (!sessionId) return null;
  const row = await db
    .prepare(
      `SELECT s.id, s.admin_user_id, s.csrf_token, s.expires_at,
              u.email, u.name
       FROM admin_sessions s
       INNER JOIN admin_users u ON u.id = s.admin_user_id
       WHERE s.id = ?`
    )
    .bind(sessionId)
    .first();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await destroyAdminSession(db, sessionId);
    return null;
  }
  return row;
}

export async function requireAdmin(request, env) {
  getSessionSecret(env);
  const sessionId = parseSessionCookie(request);
  const session = await getAdminSession(env.DB, sessionId);
  if (!session) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return { session, sessionId };
}

export function assertCsrf(request, session) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  const token = request.headers.get("X-CSRF-Token");
  if (!token || token !== session.csrf_token) {
    const err = new Error("Invalid CSRF token");
    err.status = 403;
    throw err;
  }
}

export async function hashIp(ip, env) {
  getSessionSecret(env);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(ip));
  return encodeBase64Url(new Uint8Array(sig));
}
