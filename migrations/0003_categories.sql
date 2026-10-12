CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);

ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Seed categories from existing product.category text values
INSERT INTO categories (name, slug, status)
SELECT DISTINCT trim(category), lower(replace(replace(trim(category), ' & ', '-and-'), ' ', '-')), 'active'
FROM products
WHERE category IS NOT NULL AND trim(category) != ''
  AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.slug = lower(replace(replace(trim(products.category), ' & ', '-and-'), ' ', '-'))
  );

UPDATE products
SET category_id = (
    SELECT c.id FROM categories c
    WHERE c.slug = lower(replace(replace(trim(products.category), ' & ', '-and-'), ' ', '-'))
    LIMIT 1
)
WHERE category IS NOT NULL AND trim(category) != '';
