import { json, readJson, clientIp } from "../../lib/http.js";
import { requireEmail, requireString } from "../../lib/validate.js";
import { verifyPassword } from "../../lib/password.js";
import {
  createAdminSession,
  destroyAdminSession,
  hashIp,
  parseSessionCookie,
  requireAdmin,
  sessionCookie,
  clearSessionCookie,
} from "../../lib/session.js";

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

export async function login(request, env) {
  const body = await readJson(request);
  const email = requireEmail(body.email);
  const password = requireString(body.password, "password", { min: 8, max: 200 });

  const ipHash = await hashIp(clientIp(request), env);
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const attempts = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM login_attempts
     WHERE ip_hash = ? AND attempted_at >= ?`
  )
    .bind(ipHash, windowStart)
    .first();

  if ((attempts?.count ?? 0) >= MAX_ATTEMPTS) {
    return json(
      { success: false, error: "Too many login attempts. Try again later." },
      { status: 429 },
      env,
      request
    );
  }

  const user = await env.DB.prepare(
    `SELECT id, email, password_hash, name FROM admin_users WHERE email = ?`
  )
    .bind(email)
    .first();

  const valid = user && (await verifyPassword(password, user.password_hash));

  await env.DB.prepare(`INSERT INTO login_attempts (ip_hash, email) VALUES (?, ?)`)
    .bind(ipHash, email)
    .run();

  if (!valid) {
    return json({ success: false, error: "Invalid email or password" }, { status: 401 }, env, request);
  }

  const session = await createAdminSession(env.DB, user.id, env);
  await env.DB.prepare(
    `UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  )
    .bind(user.id)
    .run();

  const headers = new Headers();
  headers.append("Set-Cookie", sessionCookie(session.id, env, { maxAgeSec: session.maxAgeSec }));

  return json(
    {
      success: true,
      admin: { email: user.email, name: user.name },
      csrfToken: session.csrfToken,
    },
    { headers },
    env,
    request
  );
}

export async function logout(request, env) {
  const sessionId = parseSessionCookie(request);
  await destroyAdminSession(env.DB, sessionId);
  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookie(env));
  return json({ success: true }, { headers }, env, request);
}

export async function me(request, env) {
  try {
    const { session } = await requireAdmin(request, env);
    return json(
      {
        success: true,
        admin: { email: session.email, name: session.name },
        csrfToken: session.csrf_token,
      },
      {},
      env,
      request
    );
  } catch (error) {
    return json({ success: false, error: "Unauthorized" }, { status: error.status || 401 }, env, request);
  }
}

export async function bootstrapCheck(env) {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM admin_users`).first();
  return (row?.count ?? 0) > 0;
}
