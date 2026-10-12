import { json, readJson } from "../../lib/http.js";
import {
  requireNonNegativeInt,
  requirePositiveInt,
  requirePriceRupees,
  requireString,
  optionalString,
  slugify,
  ValidationError,
  parseStatus,
} from "../../lib/validate.js";
import { requireAdmin, assertCsrf } from "../../lib/session.js";
import {
  loadProductImages,
  loadProductTiers,
  mapAdminProduct,
} from "../../lib/products.js";
import { rupeesToPaise } from "../../lib/money.js";

async function audit(db, adminUserId, action, entityType, entityId, details) {
  await db
    .prepare(
      `INSERT INTO audit_logs (admin_user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(adminUserId, action, entityType, String(entityId), details ? JSON.stringify(details) : null)
    .run();
}

async function replaceTiers(db, productId, tiers) {
  await db.prepare(`DELETE FROM product_pricing_tiers WHERE product_id = ?`).bind(productId).run();
  if (!tiers?.length) return;
  for (const tier of tiers) {
    const minQuantity = requirePositiveInt(tier.minQuantity, "minQuantity");
    const unitPricePaise =
      tier.unitPricePaise != null
        ? requireNonNegativeInt(tier.unitPricePaise, "unitPricePaise")
        : rupeesToPaise(requirePriceRupees(tier.unitPrice));
    if (unitPricePaise == null || unitPricePaise <= 0) {
      throw new ValidationError("Invalid tier price");
    }
    await db
      .prepare(
        `INSERT INTO product_pricing_tiers (product_id, min_quantity, unit_price_paise)
         VALUES (?, ?, ?)`
      )
      .bind(productId, minQuantity, unitPricePaise)
      .run();
  }
}

async function replaceImages(db, productId, images) {
  await db.prepare(`DELETE FROM product_images WHERE product_id = ?`).bind(productId).run();
  if (!images?.length) return;
  let sort = 0;
  for (const img of images) {
    const url = requireString(img.url, "image url", { max: 2000 });
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
      throw new ValidationError("Image URL must be http(s) or site-relative");
    }
    await db
      .prepare(
        `INSERT INTO product_images (product_id, url, alt_text, sort_order)
         VALUES (?, ?, ?, ?)`
      )
      .bind(productId, url, optionalString(img.altText, "altText", { max: 200 }), sort++)
      .run();
  }
}

function parseProductBody(body, { partial = false } = {}) {
  const data = {};
  if (!partial || body.name != null) data.name = requireString(body.name, "name", { max: 200 });
  if (!partial || body.sku != null) data.sku = requireString(body.sku, "sku", { max: 80 }).toUpperCase();
  if (!partial || body.slug != null) {
    data.slug = slugify(body.slug || body.name);
    if (!data.slug) throw new ValidationError("slug is required");
  }
  if (!partial || body.category != null) data.category = optionalString(body.category, "category", { max: 120 });
  if (body.categoryId !== undefined) {
    data.categoryId =
      body.categoryId === null || body.categoryId === ""
        ? null
        : requirePositiveInt(body.categoryId, "categoryId");
  } else if (!partial) {
    data.categoryId = null;
  }
  if (!partial || body.description != null) {
    data.description = optionalString(body.description, "description", { max: 10000 });
  }
  if (!partial || body.price != null) data.price = requirePriceRupees(body.price);
  if (!partial || body.moq != null) data.moq = requirePositiveInt(body.moq, "moq");
  if (!partial || body.stock != null) data.stock = requireNonNegativeInt(body.stock, "stock");
  if (!partial || body.unit != null) data.unit = requireString(body.unit, "unit", { max: 40 });
  if (!partial || body.imageUrl != null) {
    data.imageUrl = optionalString(body.imageUrl, "imageUrl", { max: 2000 });
  }
  if (body.status != null) {
    data.status = parseStatus(body.status, ["active", "inactive"], "status");
  } else if (!partial) {
    data.status = "active";
  }
  if (body.specifications !== undefined) {
    if (body.specifications == null) {
      data.specifications = null;
    } else if (typeof body.specifications === "string") {
      data.specifications = body.specifications;
    } else {
      data.specifications = JSON.stringify(body.specifications);
    }
  } else if (!partial) {
    data.specifications = null;
  }
  return data;
}

export async function listAdminProducts(request, env) {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const status = url.searchParams.get("status");
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const offset = (page - 1) * limit;

  const where = ["1=1"];
  const binds = [];
  if (q) {
    where.push(`(lower(name) LIKE ? OR lower(COALESCE(sku,'')) LIKE ? OR lower(COALESCE(slug,'')) LIKE ?)`);
    const like = `%${q.toLowerCase()}%`;
    binds.push(like, like, like);
  }
  if (status === "active" || status === "inactive") {
    where.push(`status = ?`);
    binds.push(status);
  }

  const whereSql = where.join(" AND ");
  const total = await env.DB.prepare(`SELECT COUNT(*) AS total FROM products WHERE ${whereSql}`)
    .bind(...binds)
    .first();

  const { results } = await env.DB.prepare(
    `SELECT * FROM products WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`
  )
    .bind(...binds, limit, offset)
    .all();

  const products = [];
  for (const row of results || []) {
    const tiers = await loadProductTiers(env.DB, row.id);
    const images = await loadProductImages(env.DB, row.id);
    products.push(mapAdminProduct(row, tiers, images));
  }

  return json(
    { success: true, products, pagination: { page, limit, total: total?.total ?? 0 } },
    {},
    env,
    request
  );
}

export async function getAdminProduct(id, request, env) {
  await requireAdmin(request, env);
  const row = await env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first();
  if (!row) {
    return json({ success: false, error: "Product not found" }, { status: 404 }, env, request);
  }
  const tiers = await loadProductTiers(env.DB, id);
  const images = await loadProductImages(env.DB, id);
  return json({ success: true, product: mapAdminProduct(row, tiers, images) }, {}, env, request);
}

export async function createProduct(request, env) {
  const { session } = await requireAdmin(request, env);
  assertCsrf(request, session);
  const body = await readJson(request);
  const data = parseProductBody(body);

  let result;
  try {
    result = await env.DB.prepare(
      `INSERT INTO products
        (name, slug, sku, category, category_id, description, price, moq, stock, unit, image_url, specifications, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        data.name,
        data.slug,
        data.sku,
        data.category,
        data.categoryId ?? null,
        data.description,
        data.price,
        data.moq,
        data.stock,
        data.unit || "piece",
        data.imageUrl,
        data.specifications,
        data.status || "active"
      )
      .run();
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      throw new ValidationError("SKU or slug already exists");
    }
    throw err;
  }

  const productId = result.meta.last_row_id;
  await replaceTiers(env.DB, productId, body.pricingTiers);
  await replaceImages(env.DB, productId, body.images);
  await audit(env.DB, session.admin_user_id, "product.create", "product", productId, { sku: data.sku });

  return json({ success: true, productId }, { status: 201 }, env, request);
}

export async function updateProduct(id, request, env) {
  const { session } = await requireAdmin(request, env);
  assertCsrf(request, session);
  const existing = await env.DB.prepare(`SELECT id FROM products WHERE id = ?`).bind(id).first();
  if (!existing) {
    return json({ success: false, error: "Product not found" }, { status: 404 }, env, request);
  }

  const body = await readJson(request);
  const data = parseProductBody(body, { partial: true });

  const fields = [];
  const binds = [];
  const map = {
    name: "name",
    slug: "slug",
    sku: "sku",
    category: "category",
    categoryId: "category_id",
    description: "description",
    price: "price",
    moq: "moq",
    stock: "stock",
    unit: "unit",
    imageUrl: "image_url",
    specifications: "specifications",
    status: "status",
  };

  for (const [key, column] of Object.entries(map)) {
    if (data[key] !== undefined) {
      fields.push(`${column} = ?`);
      binds.push(data[key]);
    }
  }

  if (fields.length === 0 && body.pricingTiers == null && body.images == null) {
    throw new ValidationError("No fields to update");
  }

  if (fields.length) {
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    await env.DB.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`)
      .bind(...binds, id)
      .run()
      .catch((err) => {
        if (String(err.message).includes("UNIQUE")) {
          throw new ValidationError("SKU or slug already exists");
        }
        throw err;
      });
  }

  if (body.pricingTiers != null) await replaceTiers(env.DB, id, body.pricingTiers);
  if (body.images != null) await replaceImages(env.DB, id, body.images);

  await audit(env.DB, session.admin_user_id, "product.update", "product", id, null);
  return json({ success: true }, {}, env, request);
}

export async function deleteProduct(id, request, env) {
  const { session } = await requireAdmin(request, env);
  assertCsrf(request, session);

  const linked = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM order_items WHERE product_id = ?`
  )
    .bind(id)
    .first();

  if ((linked?.count ?? 0) > 0) {
    return json(
      {
        success: false,
        error: "Product has order history. Deactivate instead of deleting.",
      },
      { status: 409 },
      env,
      request
    );
  }

  await env.DB.prepare(`DELETE FROM product_pricing_tiers WHERE product_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM product_images WHERE product_id = ?`).bind(id).run();
  const result = await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
  if (!result.meta.changes) {
    return json({ success: false, error: "Product not found" }, { status: 404 }, env, request);
  }

  await audit(env.DB, session.admin_user_id, "product.delete", "product", id, null);
  return json({ success: true }, {}, env, request);
}
