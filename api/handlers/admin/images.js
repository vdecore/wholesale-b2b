import { json, readJson, applyCors } from "../../lib/http.js";
import { requireAdmin, assertCsrf } from "../../lib/session.js";
import { ValidationError } from "../../lib/validate.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function detectImageFormat(bytes) {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // PNG: 89 50 4E 47
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" };
  }
  // GIF: 47 49 46 38
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return { mime: "image/gif", ext: "gif" };
  }
  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export async function uploadProductImage(productId, request, env) {
  const { session } = await requireAdmin(request, env);
  assertCsrf(request, session);

  if (!env.IMAGES) {
    return json({ success: false, error: "Image storage bucket not configured" }, { status: 500 }, env, request);
  }

  // Verify product exists
  const product = await env.DB.prepare(`SELECT id FROM products WHERE id = ?`)
    .bind(productId)
    .first();
  if (!product) {
    return json({ success: false, error: "Product not found" }, { status: 404 }, env, request);
  }

  // Verify image count limit (fewer than 4 total images)
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM product_images WHERE product_id = ?`
  )
    .bind(productId)
    .first();
  const currentCount = countRow?.total ?? 0;
  if (currentCount >= 4) {
    throw new ValidationError("Product cannot have more than 4 images");
  }

  // Parse multipart/form-data
  let formData;
  try {
    formData = await request.formData();
  } catch {
    throw new ValidationError("Invalid multipart/form-data request body");
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    throw new ValidationError("A file field named 'file' is required");
  }

  // Validate file size
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ValidationError("File size exceeds 5MB limit");
  }
  if (file.size === 0) {
    throw new ValidationError("Uploaded file is empty");
  }

  // Validate MIME type
  let declaredType = (file.type || "").toLowerCase();
  if (declaredType === "image/jpg") declaredType = "image/jpeg";
  if (!ALLOWED_MIME_TYPES.has(declaredType)) {
    throw new ValidationError("Invalid MIME type. Allowed types: image/jpeg, image/png, image/webp, image/gif");
  }

  // Validate actual file content via magic bytes
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const detected = detectImageFormat(bytes);
  if (!detected) {
    throw new ValidationError("File content is not a recognized image format");
  }
  if (detected.mime !== declaredType) {
    throw new ValidationError(`File content (${detected.mime}) does not match MIME type (${declaredType})`);
  }

  // Generate unique R2 key
  const r2Key = `products/${productId}/${crypto.randomUUID()}.${detected.ext}`;

  // Upload to R2 bucket
  await env.IMAGES.put(r2Key, arrayBuffer, {
    httpMetadata: {
      contentType: detected.mime,
    },
  });

  // Determine next sort_order
  const maxSortRow = await env.DB.prepare(
    `SELECT MAX(sort_order) AS max_sort FROM product_images WHERE product_id = ?`
  )
    .bind(productId)
    .first();
  const nextSort = maxSortRow?.max_sort != null ? maxSortRow.max_sort + 1 : 0;
  const publicUrl = env.R2_PUBLIC_URL
    ? `${env.R2_PUBLIC_URL.replace(/\/+$/, "")}/${r2Key}`
    : `/api/images/${r2Key}`;

  // Insert database record
  const insertResult = await env.DB.prepare(
    `INSERT INTO product_images (product_id, url, alt_text, sort_order, storage_type, r2_key)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(productId, publicUrl, null, nextSort, "r2", r2Key)
    .run();

  const imageId = insertResult.meta.last_row_id;

  // Set as primary product image if not already set
  await env.DB.prepare(
    `UPDATE products
     SET image_url = ?
     WHERE id = ? AND (image_url IS NULL OR trim(image_url) = '')`
  )
    .bind(publicUrl, productId)
    .run();

  return json(
    {
      success: true,
      image: {
        id: imageId,
        url: publicUrl,
        altText: null,
        sortOrder: nextSort,
        storageType: "r2",
        r2Key,
      },
    },
    { status: 201 },
    env,
    request
  );
}

export async function deleteProductImage(productId, imageId, request, env) {
  const { session } = await requireAdmin(request, env);
  assertCsrf(request, session);

  const image = await env.DB.prepare(
    `SELECT id, product_id, storage_type, r2_key, url
     FROM product_images
     WHERE id = ? AND product_id = ?`
  )
    .bind(imageId, productId)
    .first();

  if (!image) {
    return json({ success: false, error: "Image not found" }, { status: 404 }, env, request);
  }

  if (image.storage_type === "r2" && image.r2_key && env.IMAGES) {
    try {
      await env.IMAGES.delete(image.r2_key);
    } catch (err) {
      console.error(`Failed to delete R2 object ${image.r2_key}:`, err);
    }
  }

  await env.DB.prepare(`DELETE FROM product_images WHERE id = ?`).bind(imageId).run();

  // If this deleted image was the primary product image, update to the next image or null
  const remainingImage = await env.DB.prepare(
    `SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1`
  )
    .bind(productId)
    .first();

  await env.DB.prepare(
    `UPDATE products
     SET image_url = ?
     WHERE id = ? AND image_url = ?`
  )
    .bind(remainingImage ? remainingImage.url : null, productId, image.url)
    .run();

  return json({ success: true }, {}, env, request);
}

export async function reorderProductImages(productId, request, env) {
  const { session } = await requireAdmin(request, env);
  assertCsrf(request, session);

  const body = await readJson(request);
  if (!body || !Array.isArray(body.imageIds)) {
    throw new ValidationError("imageIds must be an array of image IDs");
  }

  const { imageIds } = body;
  const { results } = await env.DB.prepare(
    `SELECT id, url FROM product_images WHERE product_id = ?`
  )
    .bind(productId)
    .all();

  const existingMap = new Map((results || []).map((r) => [r.id, r.url]));

  for (const id of imageIds) {
    if (!existingMap.has(id)) {
      throw new ValidationError(`Image ID ${id} does not belong to product ${productId}`);
    }
  }

  for (let sort = 0; sort < imageIds.length; sort++) {
    await env.DB.prepare(
      `UPDATE product_images SET sort_order = ? WHERE id = ? AND product_id = ?`
    )
      .bind(sort, imageIds[sort], productId)
      .run();
  }

  // Update primary image_url to match first reordered image
  if (imageIds.length > 0 && existingMap.has(imageIds[0])) {
    await env.DB.prepare(
      `UPDATE products SET image_url = ? WHERE id = ?`
    )
      .bind(existingMap.get(imageIds[0]), productId)
      .run();
  }

  return json({ success: true }, {}, env, request);
}

export async function serveImage(key, request, env) {
  if (!key) {
    return json({ success: false, error: "Image key is required" }, { status: 400 }, env, request);
  }

  if (!env.IMAGES) {
    return json({ success: false, error: "Image storage bucket not configured" }, { status: 500 }, env, request);
  }

  // Sanitize key against path traversal
  const cleanKey = key.replace(/^[/\\]+/, "").replace(/\.\./g, "");
  const object = await env.IMAGES.get(cleanKey);
  if (!object) {
    return json({ success: false, error: "Image not found" }, { status: 404 }, env, request);
  }

  const ifNoneMatch = request.headers.get("if-none-match");
  const etag = object.httpEtag;

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (etag) {
    headers.set("etag", etag);
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `"${etag}"` || ifNoneMatch === `W/"${etag}"`)) {
      return new Response(null, { status: 304, headers });
    }
  }

  if (!headers.get("Content-Type")) {
    if (cleanKey.endsWith(".png")) headers.set("Content-Type", "image/png");
    else if (cleanKey.endsWith(".webp")) headers.set("Content-Type", "image/webp");
    else if (cleanKey.endsWith(".gif")) headers.set("Content-Type", "image/gif");
    else headers.set("Content-Type", "image/jpeg");
  }
  headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
  applyCors(headers, env, request, false);

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(object.body, {
    status: 200,
    headers,
  });
}
