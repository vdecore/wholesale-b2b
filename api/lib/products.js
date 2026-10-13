import { rupeesToPaise } from "./money.js";

export function mapPublicProduct(row, tiers = [], images = []) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    category: row.category,
    categoryId: row.category_id ?? null,
    description: row.description,
    price: row.price,
    pricePaise: rupeesToPaise(row.price),
    moq: row.moq,
    stock: row.stock,
    unit: row.unit || "piece",
    imageUrl: row.image_url || null,
    images,
    specifications: parseJson(row.specifications),
    pricingTiers: tiers.map(mapTier),
    status: row.status,
  };
}

export function mapAdminProduct(row, tiers = [], images = []) {
  return {
    ...mapPublicProduct(row, tiers, images),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTier(t) {
  return {
    id: t.id,
    minQuantity: t.min_quantity,
    unitPricePaise: t.unit_price_paise,
    unitPrice: t.unit_price_paise / 100,
  };
}

export function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function loadProductTiers(db, productId) {
  const { results } = await db
    .prepare(
      `SELECT id, min_quantity, unit_price_paise
       FROM product_pricing_tiers
       WHERE product_id = ?
       ORDER BY min_quantity ASC`
    )
    .bind(productId)
    .all();
  return results || [];
}

export async function loadProductImages(db, productId) {
  const { results } = await db
    .prepare(
      `SELECT id, url, alt_text, sort_order, storage_type, r2_key
       FROM product_images
       WHERE product_id = ?
       ORDER BY sort_order ASC, id ASC`
    )
    .bind(productId)
    .all();
  return (results || []).map((r) => ({
    id: r.id,
    url: r.url,
    altText: r.alt_text,
    sortOrder: r.sort_order,
    storageType: r.storage_type || 'url',
    r2Key: r.r2_key || null,
  }));
}

export function unitPricePaiseForQuantity(basePriceRupees, moq, quantity, tiers) {
  let unitPaise = rupeesToPaise(basePriceRupees);
  if (tiers?.length) {
    const applicable = tiers
      .filter((t) => quantity >= t.min_quantity)
      .sort((a, b) => b.min_quantity - a.min_quantity);
    if (applicable[0]) unitPaise = applicable[0].unit_price_paise;
  }
  return unitPaise;
}
