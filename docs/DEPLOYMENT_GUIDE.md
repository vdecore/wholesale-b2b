# Wholesale B2B — Deployment & Operations Guide

This guide documents the full deployment, administration, database migration, and security procedures for the Vdecore Wholesale B2B e-commerce platform.

---

## 1. System Architecture

- **Frontend:** React 19, Vite, vanilla responsive CSS, SPA navigation
- **Backend:** Cloudflare Workers (ES Module syntax), `worker.js`, `api/`
- **Database:** Cloudflare D1 (`wholesale-b2b-db`), SQLite-compatible distributed SQL
- **Authentication:** Server-side sessions in D1, HttpOnly SameSite=Lax cookies, PBKDF2 password hashing (210,000 iterations), CSRF token protection
- **Media / Assets:** Cloudflare R2 (or CDN image URLs)

---

## 2. Local Development

### Prerequisites
- Node.js 20+ (Active LTS)
- Cloudflare Wrangler CLI (bundled in devDependencies)

### Running Locally
```powershell
# 1. Start the Cloudflare Worker API on port 8787
npm run dev:api

# 2. In a separate terminal, start the Vite frontend on port 5173
npm run dev
```

The Vite dev server proxies `/api/*` requests directly to `http://127.0.0.1:8787/api/*`.

### Running Verification Tests
```powershell
npm test
# Executes the 63-point automated assertion suite across public & admin APIs
```

### Building for Production
```powershell
npm run build
# Produces optimized production bundle in dist/
```

---

## 3. Environment Variables & Secrets

### Local Development (`.dev.vars`)
Local variables are stored in `.dev.vars` (excluded from git):
```ini
SESSION_SECRET=local-dev-only-change-before-production-32chars
ALLOWED_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
```

### Production Secrets (Cloudflare Worker)
In production, configure secrets via Wrangler CLI or Cloudflare Dashboard:

```powershell
# Set random high-entropy session secret (min 32 characters)
npx wrangler secret put SESSION_SECRET

# Set production frontend origin for strict CORS & cookie security
npx wrangler secret put ALLOWED_ORIGIN
# (e.g. https://wholesale.vdecore.com)
```

In `wrangler.jsonc`, ensure `COOKIE_SECURE` is set to `"true"` in production so cookies are only transmitted over HTTPS:
```jsonc
"vars": {
  "ALLOWED_ORIGIN": "https://wholesale.vdecore.com",
  "COOKIE_SECURE": "true"
}
```

---

## 4. D1 Database Migrations

### Local Database Migrations
To apply migrations locally during development:
```powershell
npm run db:migrate:local
```

### Production Database Backup (Mandatory Before Remote Migration)
Always create a snapshot backup before running remote migrations:
```powershell
npx wrangler d1 export wholesale-b2b-db --remote --output="backups/backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
```

### Production Remote Migrations
*Requires explicit owner approval before execution:*
```powershell
npm run db:migrate:remote
```

All migration files in `migrations/` are incremental and idempotent:
- `0001_create_products.sql` — Initial products table
- `0002_extend_products.sql` — B2B attributes (SKU, unit, specifications, timestamps)
- `0003_categories.sql` — Categories table and product category foreign keys
- `0004_admin_auth.sql` — Admin users, encrypted sessions, login rate-limiting table
- `0005_orders.sql` — Wholesale orders, customers, and order items
- `0006_inquiries.sql` — Wholesale quotation inquiries
- `0007_pricing_tiers.sql` — Tiered volume pricing and multi-image tables
- `0008_audit_logs.sql` — Administrative action audit logs

---

## 5. First Admin Bootstrap Procedure

There is **no public registration** for administrative accounts. Admin users must be seeded directly into D1.

### Step 1: Generate a Strong Password Hash
```powershell
node scripts/hash-admin-password.mjs "YourComplexAdminPasswordHere"
```
Output:
`pbkdf2-sha256$210000$SALT...$HASH...`

### Step 2: Insert Admin into Remote D1
```powershell
npx wrangler d1 execute wholesale-b2b-db --remote --command "INSERT INTO admin_users (email, password_hash, name) VALUES ('admin@vdecore.com', 'PASTE_HASH_HERE', 'Master Admin');"
```

### Step 3: Access Admin Portal
Visit `https://wholesale.vdecore.com/admin` and sign in with the email and password.

---

## 6. Cloudflare R2 Image Storage (Optional / Production)

For native Cloudflare R2 product image uploads:

1. Create an R2 bucket:
   ```powershell
   npx wrangler r2 bucket create wholesale-b2b-images
   ```
2. Bind the bucket in `wrangler.jsonc`:
   ```jsonc
   "r2_buckets": [
     {
       "binding": "IMAGES",
       "bucket_name": "wholesale-b2b-images"
     }
   ]
   ```
3. Connect custom domain or public bucket URL (e.g., `https://images.wholesale.vdecore.com`).
4. In the admin dashboard, enter the image URLs or uploaded asset paths directly into the product image field.

---

## 7. Cloudflare Deployment Options

### Option A: Cloudflare Workers + Static Assets (Recommended)
Cloudflare Workers can serve both the static Vite build assets (`dist/`) and the API directly.
Add to `wrangler.jsonc`:
```jsonc
"assets": {
  "directory": "./dist",
  "binding": "ASSETS"
}
```
Deploy Worker:
```powershell
npm run build
npx wrangler deploy
```

### Option B: Cloudflare Pages + Worker API
- Deploy `dist/` to Cloudflare Pages for global edge caching.
- Deploy Worker on a custom API subdomain (e.g. `api.wholesale.vdecore.com`).
- Configure `ALLOWED_ORIGIN` to match the Pages domain.
