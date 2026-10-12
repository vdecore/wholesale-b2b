-- Extend products for B2B catalogue (preserves existing price REAL as INR rupees, not paise)
ALTER TABLE products ADD COLUMN sku TEXT;
ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'piece';
ALTER TABLE products ADD COLUMN specifications TEXT;
ALTER TABLE products ADD COLUMN updated_at TEXT;

UPDATE products
SET sku = 'SKU-' || printf('%04d', id)
WHERE sku IS NULL OR trim(sku) = '';

UPDATE products
SET updated_at = COALESCE(created_at, datetime('now'))
WHERE updated_at IS NULL OR trim(updated_at) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
