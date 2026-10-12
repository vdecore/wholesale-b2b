import { json, readJson } from "../../lib/http.js";
import { optionalString, ValidationError, parseStatus } from "../../lib/validate.js";
import { requireAdmin, assertCsrf } from "../../lib/session.js";
import { canTransitionOrderStatus, ORDER_STATUSES, PAYMENT_STATUSES } from "../../lib/config.js";

export async function listAdminOrders(request, env) {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const offset = (page - 1) * limit;

  const where = ["1=1"];
  const binds = [];
  if (q) {
    where.push(
      `(lower(o.order_number) LIKE ? OR lower(c.email) LIKE ? OR lower(c.contact_name) LIKE ? OR lower(COALESCE(c.company_name,'')) LIKE ?)`
    );
    const like = `%${q}%`;
    binds.push(like, like, like, like);
  }

  const whereSql = where.join(" AND ");
  const total = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM orders o INNER JOIN customers c ON c.id = o.customer_id WHERE ${whereSql}`
  )
    .bind(...binds)
    .first();

  const { results } = await env.DB.prepare(
    `SELECT o.id, o.order_number, o.status, o.payment_status, o.total_paise, o.created_at,
            c.company_name, c.contact_name, c.email, c.phone
     FROM orders o
     INNER JOIN customers c ON c.id = o.customer_id
     WHERE ${whereSql}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...binds, limit, offset)
    .all();

  return json(
    { success: true, orders: results || [], pagination: { page, limit, total: total?.total ?? 0 } },
    {},
    env,
    request
  );
}

export async function getAdminOrder(id, request, env) {
  await requireAdmin(request, env);
  const order = await env.DB.prepare(
    `SELECT o.*, c.company_name, c.contact_name, c.email, c.phone
     FROM orders o
     INNER JOIN customers c ON c.id = o.customer_id
     WHERE o.id = ?`
  )
    .bind(id)
    .first();

  if (!order) {
    return json({ success: false, error: "Order not found" }, { status: 404 }, env, request);
  }

  const { results: items } = await env.DB.prepare(
    `SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`
  )
    .bind(id)
    .all();

  return json({ success: true, order, items: items || [] }, {}, env, request);
}

export async function patchOrderStatus(id, request, env) {
  const { session } = await requireAdmin(request, env);
  assertCsrf(request, session);
  const body = await readJson(request);

  const order = await env.DB.prepare(`SELECT id, status, payment_status FROM orders WHERE id = ?`)
    .bind(id)
    .first();
  if (!order) {
    return json({ success: false, error: "Order not found" }, { status: 404 }, env, request);
  }

  let status = order.status;
  let paymentStatus = order.payment_status;
  let trackingCarrier = null;
  let trackingNumber = null;

  if (body.status != null) {
    const next = parseStatus(body.status, ORDER_STATUSES, "status");
    if (!canTransitionOrderStatus(order.status, next)) {
      throw new ValidationError(`Cannot change status from ${order.status} to ${next}`);
    }
    status = next;
  }

  if (body.paymentStatus != null) {
    paymentStatus = parseStatus(body.paymentStatus, PAYMENT_STATUSES, "paymentStatus");
  }

  if (body.trackingCarrier != null) trackingCarrier = optionalString(body.trackingCarrier, "trackingCarrier", { max: 120 });
  if (body.trackingNumber != null) trackingNumber = optionalString(body.trackingNumber, "trackingNumber", { max: 120 });

  await env.DB.prepare(
    `UPDATE orders
     SET status = ?, payment_status = ?,
         tracking_carrier = COALESCE(?, tracking_carrier),
         tracking_number = COALESCE(?, tracking_number),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(status, paymentStatus, trackingCarrier, trackingNumber, id)
    .run();

  return json({ success: true }, {}, env, request);
}
