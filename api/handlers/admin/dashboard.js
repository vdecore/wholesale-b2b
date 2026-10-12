import { json } from "../../lib/http.js";
import { requireAdmin } from "../../lib/session.js";

export async function dashboard(request, env) {
  const { session } = await requireAdmin(request, env);

  const stats = await env.DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM products) AS total_products,
      (SELECT COUNT(*) FROM products WHERE status = 'active') AS active_products,
      (SELECT COUNT(*) FROM products WHERE status != 'active') AS inactive_products,
      (SELECT COUNT(*) FROM products WHERE stock <= 5 AND status = 'active') AS low_stock_products,
      (SELECT COUNT(*) FROM orders) AS total_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'completed') AS completed_orders,
      (SELECT COUNT(*) FROM wholesale_inquiries WHERE status = 'new') AS new_inquiries`
  ).first();

  const recentOrders = await env.DB.prepare(
    `SELECT o.order_number, o.status, o.payment_status, o.total_paise, o.created_at,
            c.contact_name, c.company_name, c.email
     FROM orders o
     INNER JOIN customers c ON c.id = o.customer_id
     ORDER BY o.created_at DESC
     LIMIT 8`
  ).all();

  const recentInquiries = await env.DB.prepare(
    `SELECT id, company_name, contact_name, email, status, created_at
     FROM wholesale_inquiries
     ORDER BY created_at DESC
     LIMIT 8`
  ).all();

  return json(
    {
      success: true,
      stats,
      recentOrders: recentOrders.results || [],
      recentInquiries: recentInquiries.results || [],
      admin: { email: session.email, name: session.name },
    },
    {},
    env,
    request
  );
}
