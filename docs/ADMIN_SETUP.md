# First admin setup

There is **no** public admin registration. Create the first admin directly in D1.

## 1. Local development secrets

Copy `.dev.vars.example` to `.dev.vars` and set a long random `SESSION_SECRET` (32+ characters).

## 2. Apply migrations

```powershell
npx wrangler d1 migrations apply wholesale-b2b-db --local
```

For production (only when you intend to update remote D1):

```powershell
npx wrangler d1 migrations apply wholesale-b2b-db --remote
```

## 3. Create password hash

```powershell
node scripts/hash-admin-password.mjs "YourStrongLocalPassword"
```

## 4. Insert admin user (local example)

Replace `YOUR_HASH` and email as needed:

```powershell
npx wrangler d1 execute wholesale-b2b-db --local --command "INSERT INTO admin_users (email, password_hash, name) VALUES ('admin@example.com', 'YOUR_HASH', 'Store Admin');"
```

## 5. Start API and frontend

```powershell
npx wrangler dev --port 8787
npm run dev
```

Sign in at `/admin` using the email and password you configured.
