export function getAllowedOrigin(env, request) {
  const configured = env.ALLOWED_ORIGIN || env.FRONTEND_ORIGIN || "";
  const origin = request.headers.get("Origin") || "";
  if (configured) {
    return origin === configured ? origin : configured.split(",")[0].trim();
  }
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    return origin;
  }
  return "http://localhost:5173";
}

export function getSessionSecret(env) {
  const secret = env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is not configured (min 32 characters)");
  }
  return secret;
}

export const MAX_JSON_BYTES = 256 * 1024;

export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "completed", "cancelled"];
export const PAYMENT_STATUSES = ["awaiting_invoice", "invoice_sent", "paid", "refunded"];
export const INQUIRY_STATUSES = ["new", "in_progress", "quoted", "closed"];

const ORDER_TRANSITIONS = {
  pending: new Set(["confirmed", "cancelled"]),
  confirmed: new Set(["processing", "cancelled"]),
  processing: new Set(["shipped", "cancelled"]),
  shipped: new Set(["completed"]),
  completed: new Set(),
  cancelled: new Set(),
};

export function canTransitionOrderStatus(from, to) {
  return ORDER_TRANSITIONS[from]?.has(to) ?? false;
}
