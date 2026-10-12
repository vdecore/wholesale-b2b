# Vdecore Wholesale B2B E-Commerce

A full-stack, enterprise-grade B2B wholesale platform built with **React 19**, **Vite**, **Cloudflare Workers**, and **Cloudflare D1**.

## Features

### Storefront
- **Live D1 Database Catalogue:** Products, stock, and categories loaded dynamically with zero hardcoded products.
- **B2B Volume Pricing:** Tiered pricing tables, Minimum Order Quantity (MOQ) validation, and unit types (pieces, meters, etc.).
- **Wholesale Cart & Quoting:**
  - Order creation with customer business details and payment-on-invoice workflow.
  - Custom quotation requests with email confirmation.
  - Direct WhatsApp inquiry generation with pre-populated message.
- **Single Product View:** High-resolution preview, specifications table, tiered discount schedule, and stock status.
- **Corporate Pages:** About Us, Contact Us (with live inquiry submission), Wholesale FAQ, Shipping Policy, Returns & Damage Policy, Privacy Policy, and Terms of Supply.

### Admin Dashboard (`/admin`)
- **Secure Authentication:** Server-side sessions in D1, HttpOnly SameSite=Lax cookies, CSRF protection, PBKDF2 password hashing with 210,000 iterations, and rate limiting against brute force.
- **Live Metrics Overview:** Total products, active/inactive counts, low stock warnings, total orders, pending orders, and new quotation inquiries.
- **Product Management:** Add, edit, toggle active/inactive status, and safe deletion with validation against order history.
- **Category Management:** Full CRUD with product count tracking.
- **Order Fulfilment:** Detailed order drawers, status transitions (`pending` → `confirmed` → `processing` → `shipped` → `completed`), separate payment status updates, carrier tracking assignment.
- **Quotation Inquiries:** Review inquiries, update status, add internal admin notes, and export to CSV.

---

## Quick Start

### 1. Start Cloudflare Worker API
```powershell
npm run dev:api
```
Worker starts on `http://127.0.0.1:8787` with local D1 database bindings.

### 2. Start Frontend Dev Server
```powershell
npm run dev
```
Vite runs on `http://localhost:5173` with automatic API proxy forwarding to `:8787`.

### 3. Run Automated Tests
```powershell
npm test
```
Executes the comprehensive 63-point test suite covering public APIs, admin auth, CSRF, order calculations, stock decrement, and CRUD persistence.

### 4. Build for Production
```powershell
npm run build
npm run lint
```

For complete deployment, remote D1 migrations, and admin user bootstrap procedures, see [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).
