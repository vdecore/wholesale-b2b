import { json, readJson } from "../../lib/http.js";
import { optionalString, parseStatus, ValidationError } from "../../lib/validate.js";
import { requireAdmin, assertCsrf } from "../../lib/session.js";
import { INQUIRY_STATUSES } from "../../lib/config.js";

export async function listAdminInquiries(request, env) {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const offset = (page - 1) * limit;

  const where = ["1=1"];
  const binds = [];
  if (status && INQUIRY_STATUSES.includes(status)) {
    where.push(`status = ?`);
    binds.push(status);
  }

  const whereSql = where.join(" AND ");
  const total = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM wholesale_inquiries WHERE ${whereSql}`
  )
    .bind(...binds)
    .first();

  const { results } = await env.DB.prepare(
    `SELECT * FROM wholesale_inquiries WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...binds, limit, offset)
    .all();

  return json(
    { success: true, inquiries: results || [], pagination: { page, limit, total: total?.total ?? 0 } },
    {},
    env,
    request
  );
}

export async function patchInquiryStatus(id, request, env) {
  const { session } = await requireAdmin(request, env);
  assertCsrf(request, session);
  const body = await readJson(request);

  const status = body.status != null ? parseStatus(body.status, INQUIRY_STATUSES, "status") : null;
  const adminNotes =
    body.adminNotes != null ? optionalString(body.adminNotes, "adminNotes", { max: 5000 }) : null;

  if (status == null && adminNotes == null) {
    throw new ValidationError("No fields to update");
  }

  const existing = await env.DB.prepare(`SELECT id FROM wholesale_inquiries WHERE id = ?`).bind(id).first();
  if (!existing) {
    return json({ success: false, error: "Inquiry not found" }, { status: 404 }, env, request);
  }

  await env.DB.prepare(
    `UPDATE wholesale_inquiries
     SET status = COALESCE(?, status),
         admin_notes = COALESCE(?, admin_notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(status, adminNotes, id)
    .run();

  return json({ success: true }, {}, env, request);
}

export async function exportInquiriesCsv(request, env) {
  await requireAdmin(request, env);
  const { results } = await env.DB.prepare(
    `SELECT id, company_name, contact_name, email, phone, product_interest, requested_quantity, status, created_at
     FROM wholesale_inquiries ORDER BY created_at DESC LIMIT 5000`
  ).all();

  const header = [
    "id",
    "company_name",
    "contact_name",
    "email",
    "phone",
    "product_interest",
    "requested_quantity",
    "status",
    "created_at",
  ];

  const escapeCsv = (value) => {
    const s = value == null ? "" : String(value);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [header.join(",")];
  for (const row of results || []) {
    lines.push(header.map((h) => escapeCsv(row[h])).join(","));
  }

  const headers = new Headers({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="wholesale-inquiries.csv"',
  });

  return new Response(lines.join("\n"), { headers });
}
