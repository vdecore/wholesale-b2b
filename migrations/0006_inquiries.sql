CREATE TABLE IF NOT EXISTS wholesale_inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    product_interest TEXT,
    requested_quantity INTEGER,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    admin_notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON wholesale_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON wholesale_inquiries(created_at);
