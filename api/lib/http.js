import { getAllowedOrigin, MAX_JSON_BYTES } from "./config.js";

export function json(data, init = {}, env, request) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  applyCors(headers, env, request, init.status >= 400);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function applyCors(headers, env, request, includeCredentials = true) {
  const origin = getAllowedOrigin(env, request);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token, multipart/form-data");
  if (includeCredentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  headers.set("Vary", "Origin");
}

export function handleOptions(env, request) {
  const headers = new Headers();
  applyCors(headers, env, request);
  return new Response(null, { status: 204, headers });
}

export async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_JSON_BYTES) {
    throw new HttpError(413, "Request body too large");
  }
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) {
    throw new HttpError(413, "Request body too large");
  }
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
