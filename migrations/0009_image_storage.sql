ALTER TABLE product_images ADD COLUMN storage_type TEXT NOT NULL DEFAULT 'url';
ALTER TABLE product_images ADD COLUMN r2_key TEXT;
