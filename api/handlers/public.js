import { json, readJson, HttpError } from "../lib/http.js";
import {
  requireEmail,
  requirePositiveInt,
  requireString,
  optionalString,
  ValidationError,
} from "../lib/validate.js";
import {
  loadProductImages,
  loadProductTiers,
  mapPublicProduct,
  unitPricePaiseForQuantity,
} from "../lib/products.js";

export async function health(env, request) {
  let dbOk = false;
  try {
    await env.DB.prepare(`SELECT 1 AS ok`).first();
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return json(
    { success: true, service: "wholesale-b2b", db: dbOk ? "ok" : "error" },
    { status: dbOk ? 200 : 503 },
    env,
    request
  );
}

export async function listProducts(request, env) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") || 12)));
  const offset = (page - 1) * limit;
  const search = (url.searchParams.get("q") || "").trim().toLowerCase();
  const category = (url.searchParams.get("category") || "").trim();
  const categoryId = url.searchParams.get("categoryId");
  const sort = url.searchParams.get("sort") || "newest";

  let orderBy = "p.id DESC";
  if (sort === "name_asc") orderBy = "p.name COLLATE NOCASE ASC";
  if (sort === "name_desc") orderBy = "p.name COLLATE NOCASE DESC";
  if (sort === "price_asc") orderBy = "p.price ASC";
  if (sort === "price_desc") orderBy = "p.price DESC";

  const where = [`p.status = 'active'`];
  const binds = [];

  if (search) {
    where.push(
      `(lower(p.name) LIKE ? OR lower(COALESCE(p.sku, '')) LIKE ? OR lower(COALESCE(p.description, '')) LIKE ? OR lower(COALESCE(p.category, '')) LIKE ?)`
    );
    const like = `%${search}%`;
    binds.push(like, like, like, like);
  }
  if (category && category !== "all") {
    where.push(`p.category = ?`);
    binds.push(category);
  }
  if (categoryId) {
    where.push(`p.category_id = ?`);
    binds.push(Number(categoryId));
  }

  const whereSql = where.join(" AND ");

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM products p WHERE ${whereSql}`
  )
    .bind(...binds)
    .first();

  const { results } = await env.DB.prepare(
    `SELECT p.id, p.name, p.slug, p.sku, p.category, p.category_id, p.description,
            p.price, p.moq, p.stock, p.unit, p.image_url, p.specifications, p.status
     FROM products p
     WHERE ${whereSql}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`
  )
    .bind(...binds, limit, offset)
    .all();

  const products = [];
  for (const row of results || []) {
    const images = await loadProductImages(env.DB, row.id);
    products.push(mapPublicProduct(row, [], images));
  }
  return json(
    {
      success: true,
      products,
      pagination: { page, limit, total: countRow?.total ?? 0 },
    },
    {},
    env,
    request
  );
}

export async function getProductBySlug(slug, env, request) {
  const row = await env.DB.prepare(
    `SELECT p.id, p.name, p.slug, p.sku, p.category, p.category_id, p.description,
            p.price, p.moq, p.stock, p.unit, p.image_url, p.specifications, p.status
     FROM products p
     WHERE p.slug = ? AND p.status = 'active'`
  )
    .bind(slug)
    .first();

  if (!row) {
    return json({ success: false, error: "Product not found" }, { status: 404 }, env, request);
  }

  const tiers = await loadProductTiers(env.DB, row.id);
  const images = await loadProductImages(env.DB, row.id);

  const related = await env.DB.prepare(
    `SELECT id, name, slug, sku, category, price, moq, stock, unit, image_url, status
     FROM products
     WHERE status = 'active' AND category = ? AND id != ?
     ORDER BY id DESC
     LIMIT 4`
  )
    .bind(row.category, row.id)
    .all();

  return json(
    {
      success: true,
      product: mapPublicProduct(row, tiers, images),
      related: (related.results || []).map((r) => mapPublicProduct(r)),
    },
    {},
    env,
    request
  );
}

export async function listCategories(env, request) {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, c.slug, c.description, c.image_url,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'active') AS product_count
     FROM categories c
     WHERE c.status = 'active'
     ORDER BY c.sort_order ASC, c.name COLLATE NOCASE ASC`
  ).all();

  return json({ success: true, categories: results || [] }, {}, env, request);
}

export async function createInquiry(request, env) {
  const body = await readJson(request);
  const companyName = requireString(body.companyName, "companyName", { max: 200 });
  const contactName = requireString(body.contactName, "contactName", { max: 200 });
  const email = requireEmail(body.email);
  const phone = optionalString(body.phone, "phone", { max: 40 });
  const productInterest = optionalString(body.productInterest, "productInterest", { max: 500 });
  const message = optionalString(body.message, "message", { max: 5000 });
  let requestedQuantity = null;
  if (body.requestedQuantity != null && body.requestedQuantity !== "") {
    requestedQuantity = requirePositiveInt(body.requestedQuantity, "requestedQuantity");
  }

  const result = await env.DB.prepare(
    `INSERT INTO wholesale_inquiries
      (company_name, contact_name, email, phone, product_interest, requested_quantity, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(companyName, contactName, email, phone, productInterest, requestedQuantity, message)
    .run();

  return json(
    {
      success: true,
      inquiryId: result.meta.last_row_id,
      message: "Your wholesale inquiry has been received. We will contact you shortly.",
    },
    { status: 201 },
    env,
    request
  );
}

function generateOrderNumber() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase();
  return `WB-${y}${m}${d}-${rand}`;
}

export async function createOrder(request, env) {
  const body = await readJson(request);
  const companyName = optionalString(body.companyName, "companyName", { max: 200 });
  const contactName = requireString(body.contactName, "contactName", { max: 200 });
  const email = requireEmail(body.email);
  const phone = optionalString(body.phone, "phone", { max: 40 });
  const shippingAddress = requireString(body.shippingAddress, "shippingAddress", { max: 2000 });
  const notes = optionalString(body.notes, "notes", { max: 2000 });

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new ValidationError("At least one order item is required");
  }
  if (body.items.length > 50) {
    throw new ValidationError("Too many items in order");
  }

  const normalizedItems = body.items.map((item) => ({
    productId: requirePositiveInt(item.productId, "productId"),
    quantity: requirePositiveInt(item.quantity, "quantity"),
  }));

  const productIds = [...new Set(normalizedItems.map((i) => i.productId))];
  const placeholders = productIds.map(() => "?").join(",");
  const { results: productRows } = await env.DB.prepare(
    `SELECT id, name, sku, price, moq, stock, status
     FROM products WHERE id IN (${placeholders})`
  )
    .bind(...productIds)
    .all();

  const byId = new Map((productRows || []).map((p) => [p.id, p]));
  let subtotalPaise = 0;
  const lineItems = [];

  for (const item of normalizedItems) {
    const product = byId.get(item.productId);
    if (!product || product.status !== "active") {
      throw new ValidationError(`Product ${item.productId} is not available`);
    }
    if (item.quantity < product.moq) {
      throw new ValidationError(
        `Quantity for ${product.name} must be at least MOQ (${product.moq})`
      );
    }
    if (item.quantity > product.stock) {
      throw new ValidationError(`Insufficient stock for ${product.name}`);
    }
    const tiers = await loadProductTiers(env.DB, product.id);
    const unitPaise = unitPricePaiseForQuantity(product.price, product.moq, item.quantity, tiers);
    if (unitPaise == null) {
      throw new ValidationError(`Invalid price for ${product.name}`);
    }
    const lineTotal = unitPaise * item.quantity;
    subtotalPaise += lineTotal;
    lineItems.push({
      productId: product.id,
      productName: product.name,
      productSku: product.sku || `SKU-${product.id}`,
      unitPricePaise: unitPaise,
      quantity: item.quantity,
      lineTotalPaise: lineTotal,
    });
  }

  const orderNumber = generateOrderNumber();

  const customerResult = await env.DB.prepare(
    `INSERT INTO customers (company_name, contact_name, email, phone)
     VALUES (?, ?, ?, ?)`
  )
    .bind(companyName, contactName, email, phone)
    .run();

  const customerId = customerResult.meta.last_row_id;

  const orderResult = await env.DB.prepare(
    `INSERT INTO orders
      (order_number, customer_id, status, payment_status, subtotal_paise, total_paise, shipping_address, notes)
     VALUES (?, ?, 'pending', 'awaiting_invoice', ?, ?, ?, ?)`
  )
    .bind(orderNumber, customerId, subtotalPaise, subtotalPaise, shippingAddress, notes)
    .run();

  const orderId = orderResult.meta.last_row_id;

  for (const line of lineItems) {
    await env.DB.prepare(
      `INSERT INTO order_items
        (order_id, product_id, product_name, product_sku, unit_price_paise, quantity, line_total_paise)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        orderId,
        line.productId,
        line.productName,
        line.productSku,
        line.unitPricePaise,
        line.quantity,
        line.lineTotalPaise
      )
      .run();

    await env.DB.prepare(
      `UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock >= ?`
    )
      .bind(line.quantity, line.productId, line.quantity)
      .run();
  }

  return json(
    {
      success: true,
      order: {
        orderNumber,
        status: "pending",
        paymentStatus: "awaiting_invoice",
        subtotalPaise,
        totalPaise: subtotalPaise,
        currency: "INR",
        message:
          "Order received. Payment is on invoice — our team will confirm pricing and send payment instructions.",
      },
    },
    { status: 201 },
    env,
    request
  );
}

export function mapHandlerError(error, env, request) {
  if (error instanceof ValidationError || error instanceof HttpError) {
    return json(
      { success: false, error: error.message },
      { status: error.status || 400 },
      env,
      request
    );
  }
  return null;
}
