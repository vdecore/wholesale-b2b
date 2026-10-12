import { json, readJson } from "../../lib/http.js";
import {
  optionalString,
  requireString,
  slugify,
  ValidationError,
  parseStatus,
} from "../../lib/validate.js";
import { requireAdmin, assertCsrf } from "../../lib/session.js";

export async function listAdminCategories(request, env) {
  await requireAdmin(request, env);
  const { results } = await env.DB.prepare(
    `SELECT c.*,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
     FROM categories c
     ORDER BY c.sort_order ASC, c.name COLLATE NOCASE ASC`
  ).all();
  return json({ success: true, categories: results || [] }, {}, env, request);
}

function parseCategoryBody(body, { partial = false } = {}) {
  const data = {};
  if (!partial || body.name != null) data.name = requireString(body.name, "name", { max: 120 });
  if (!partial || body.slug != null) {
    data.slug = slugify(body.slug || body.name);
    if (!data.slug) throw new ValidationError("slug is required");
  }
  if (body.description !== undefined) {
    data.description = optionalString(body.description, "description", { max: 2000 });
  } else if (!partial) {
    data.description = null;
  }
  if (body.imageUrl !== undefined) {
    data.imageUrl = optionalString(body.imageUrl, "imageUrl", { max: 2000 });
  } else if (!partial) {
    data.imageUrl = null;
  }
  if (body.status != null) {
    data.status = parseStatus(body.status, ["active", "inactive"], "status");
  } else if (!partial) {
    data.status = "active";
  }
  if (body.sortOrder != null) {
    data.sortOrder = Number(body.sortOrder);
    if (!Number.isInteger(data.sortOrder)) throw new ValidationError("sortOrder must be an integer");
  } else if (!partial) {
    data.sortOrder = 0;
  }
  return data;
}

export async function createCategory(request, env) {
  const { session } = await requireAdmin(request, env);
  assertCsrf(request, session);
  const body = await readJson(request);
  const data = parseCategoryBody(body);

  const result = await env.DB.prepare(
    `INSERT INTO categories (name, slug, description, image_url, status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      data.name,
      data.slug,
      data.description,
      data.imageUrl,
      data.status || "active",
      data.sortOrder ?? 0
    )
    .run()
    .catch((err) => {
      if (String(err.message).includes("UNIQUE")) throw new ValidationError("Category slug already exists");
      throw err;
    });

  return json({ success: true, categoryId: result.meta.last_row_id }, { status: 201 }, env, request);
}

export async function updateCategory(id, request, env) {
  const { session } = await requireAdmin(request, env);
  assertCsrf(request, session);
  const body = await readJson(request);
  const data = parseCategoryBody(body, { partial: true });

  const fields = [];
  const binds = [];
  const map = {
    name: "name",
    slug: "slug",
    description: "description",
    imageUrl: "image_url",
    status: "status",
    sortOrder: "sort_order",
  };
  for (const [key, column] of Object.entries(map)) {
    if (data[key] !== undefined) {
      fields.push(`${column} = ?`);
      binds.push(data[key]);
    }
  }
  if (!fields.length) throw new ValidationError("No fields to update");
  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  await env.DB.prepare(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...binds, id)
    .run()
    .catch((err) => {
      if (String(err.message).includes("UNIQUE")) throw new ValidationError("Category slug already exists");
      throw err;
    });

  return json({ success: true }, {}, env, request);
}

export async function deleteCategory(id, request, env) {
  const { session } = await requireAdmin(request, env);
  assertCsrf(request, session);

  const count = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM products WHERE category_id = ?`
  )
    .bind(id)
    .first();

  if ((count?.count ?? 0) > 0) {
    return json(
      {
        success: false,
        error: "Category is assigned to products. Reassign products before deleting.",
      },
      { status: 409 },
      env,
      request
    );
  }

  const result = await env.DB.prepare(`DELETE FROM categories WHERE id = ?`).bind(id).run();
  if (!result.meta.changes) {
    return json({ success: false, error: "Category not found" }, { status: 404 }, env, request);
  }
  return json({ success: true }, {}, env, request);
}
