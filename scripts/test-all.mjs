/**
 * Comprehensive Verification and Test Suite for Wholesale B2B
 * Run with: node scripts/test-all.mjs
 */

const BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:8787";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  }
}

async function runTestSuite() {
  console.log(`\n======================================================`);
  console.log(`RUNNING FULL WHOLESALE B2B SYSTEM TESTS on ${BASE_URL}`);
  console.log(`======================================================\n`);

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert(healthRes.status === 200, "Health check HTTP 200");
  const healthData = await healthRes.json();
  assert(healthData.success === true, "Health success === true");
  assert(healthData.db === "ok", "Health database === 'ok'");

  // 2. Categories listing
  const catRes = await fetch(`${BASE_URL}/api/categories`);
  assert(catRes.status === 200, "Categories HTTP 200");
  const catData = await catRes.json();
  assert(catData.success === true, "Categories response success");
  assert(Array.isArray(catData.categories), "Categories is an array");
  assert(catData.categories.length >= 1, `Categories found (${catData.categories.length})`);

  // 3. Products catalogue listing & search
  const prodRes = await fetch(`${BASE_URL}/api/products?page=1&limit=10&sort=newest`);
  assert(prodRes.status === 200, "Products listing HTTP 200");
  const prodData = await prodRes.json();
  assert(prodData.success === true, "Products response success");
  assert(Array.isArray(prodData.products), "Products is an array");
  assert(prodData.products.length >= 1, `Found ${prodData.products.length} products`);

  const firstProd = prodData.products[0];
  assert(typeof firstProd.id === "number", "Product ID is a number");
  assert(typeof firstProd.name === "string", "Product name is a string");
  assert(typeof firstProd.price === "number", "Product price is a number in INR");
  assert(typeof firstProd.moq === "number", "Product MOQ is a number");
  assert(typeof firstProd.stock === "number", "Product stock is a number");

  // 4. Single product detail by slug
  const slugRes = await fetch(`${BASE_URL}/api/products/${firstProd.slug}`);
  assert(slugRes.status === 200, `Single product ${firstProd.slug} HTTP 200`);
  const slugData = await slugRes.json();
  assert(slugData.success === true, "Single product response success");
  assert(slugData.product.id === firstProd.id, "Product details match listed ID");

  // 5. Wholesale quotation inquiry submission
  const inqRes = await fetch(`${BASE_URL}/api/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyName: "Automated Test Corp",
      contactName: "Alex Tester",
      email: "alex.tester@example.com",
      phone: "+91 9999988888",
      productInterest: `${firstProd.name} (SKU: ${firstProd.sku})`,
      requestedQuantity: 50,
      message: "Automated test inquiry",
    }),
  });
  assert(inqRes.status === 201, "Inquiry creation HTTP 201");
  const inqData = await inqRes.json();
  assert(inqData.success === true, "Inquiry success === true");
  assert(typeof inqData.inquiryId === "number", "Inquiry ID returned");

  // 6. Order creation validation
  // 6a. Below MOQ validation
  const badMoqRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contactName: "Test Buyer",
      email: "test.buyer@example.com",
      shippingAddress: "Test Address, City",
      items: [{ productId: firstProd.id, quantity: Math.max(1, firstProd.moq - 1) }],
    }),
  });
  assert(badMoqRes.status === 400, "Order below MOQ rejected with HTTP 400");
  const badMoqData = await badMoqRes.json();
  assert(badMoqData.success === false, "Order below MOQ success === false");
  assert(badMoqData.error.includes("MOQ"), `MOQ error message returned: "${badMoqData.error}"`);

  // 6b. Valid order creation
  const validOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyName: "Verified Wholesale Ltd",
      contactName: "Sunil Verma",
      email: "sunil.verma@example.com",
      phone: "+91 9876543210",
      shippingAddress: "Plot 42, GIDC Industrial Estate, Ahmedabad 382445",
      notes: "Dispatch via VRL Logistics",
      items: [{ productId: firstProd.id, quantity: firstProd.moq }],
    }),
  });
  assert(validOrderRes.status === 201, "Valid wholesale order created HTTP 201");
  const validOrderData = await validOrderRes.json();
  assert(validOrderData.success === true, "Valid order success === true");
  assert(typeof validOrderData.order.orderNumber === "string", `Order number created: ${validOrderData.order.orderNumber}`);
  assert(validOrderData.order.status === "pending", "Order status initialized to 'pending'");
  assert(validOrderData.order.paymentStatus === "awaiting_invoice", "Payment status initialized to 'awaiting_invoice'");

  // 7. Unauthenticated admin protection
  const unauthDash = await fetch(`${BASE_URL}/api/admin/dashboard`);
  assert(unauthDash.status === 401, "Unauthenticated /api/admin/dashboard rejected HTTP 401");

  const unauthMe = await fetch(`${BASE_URL}/api/admin/me`);
  assert(unauthMe.status === 401, "Unauthenticated /api/admin/me rejected HTTP 401");

  const unauthProd = await fetch(`${BASE_URL}/api/admin/products`);
  assert(unauthProd.status === 401, "Unauthenticated /api/admin/products rejected HTTP 401");

  // 8. Invalid admin login test
  const badLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.com", password: "CompletelyWrongPassword123!" }),
  });
  assert(badLoginRes.status === 401, "Invalid password rejected HTTP 401");
  const badLoginData = await badLoginRes.json();
  assert(badLoginData.success === false, "Bad login success === false");

  // 9. Valid admin login
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.com", password: "Admin@Local2026!" }),
  });
  assert(loginRes.status === 200, "Valid admin login HTTP 200");
  const loginData = await loginRes.json();
  assert(loginData.success === true, "Admin login success === true");
  assert(typeof loginData.csrfToken === "string", "CSRF token returned");

  const setCookie = loginRes.headers.get("set-cookie") || "";
  assert(setCookie.includes("wb2b_session="), "Set-Cookie header contains session token");
  const cookie = setCookie.split(";")[0];
  const csrf = loginData.csrfToken;

  // 10. Session verification (/api/admin/me)
  const meRes = await fetch(`${BASE_URL}/api/admin/me`, {
    headers: { Cookie: cookie },
  });
  assert(meRes.status === 200, "Admin session verification HTTP 200");
  const meData = await meRes.json();
  assert(meData.admin.email === "admin@example.com", `Admin authenticated: ${meData.admin.email}`);

  // 11. Dashboard statistics
  const dashRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { Cookie: cookie },
  });
  assert(dashRes.status === 200, "Admin dashboard stats HTTP 200");
  const dashData = await dashRes.json();
  assert(typeof dashData.stats.total_products === "number", `Stats total_products: ${dashData.stats.total_products}`);
  assert(typeof dashData.stats.total_orders === "number", `Stats total_orders: ${dashData.stats.total_orders}`);

  // 12. Admin Product CRUD Lifecycle
  // 12a. Create product
  const testSku = `TEST-${Date.now().toString(36).toUpperCase()}`;
  const testSlug = `test-sample-product-${Date.now().toString(36)}`;
  const createProdRes = await fetch(`${BASE_URL}/api/admin/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf,
    },
    body: JSON.stringify({
      name: "Automated Test Product",
      sku: testSku,
      slug: testSlug,
      category: "Textiles",
      description: "Sample test description",
      price: 150,
      moq: 15,
      stock: 100,
      unit: "meter",
      status: "active",
    }),
  });
  assert(createProdRes.status === 201, "Admin create product HTTP 201");
  const createdProdData = await createProdRes.json();
  const testProductId = createdProdData.productId;
  assert(typeof testProductId === "number", `Created product ID: ${testProductId}`);

  // 12b. Update product
  const updateProdRes = await fetch(`${BASE_URL}/api/admin/products/${testProductId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf,
    },
    body: JSON.stringify({
      price: 145,
      stock: 120,
      description: "Updated description for test product",
    }),
  });
  assert(updateProdRes.status === 200, "Admin update product HTTP 200");

  // 12c. Get product & verify persistence
  const getProdRes = await fetch(`${BASE_URL}/api/admin/products/${testProductId}`, {
    headers: { Cookie: cookie },
  });
  assert(getProdRes.status === 200, "Admin get product HTTP 200");
  const getProdData = await getProdRes.json();
  assert(getProdData.product.price === 145, "Updated price 145 persisted in D1");
  assert(getProdData.product.stock === 120, "Updated stock 120 persisted in D1");

  // 12d. Delete test product
  const delProdRes = await fetch(`${BASE_URL}/api/admin/products/${testProductId}`, {
    method: "DELETE",
    headers: {
      Cookie: cookie,
      "X-CSRF-Token": csrf,
    },
  });
  assert(delProdRes.status === 200, "Admin delete product HTTP 200");

  // 13. Admin Category CRUD Lifecycle
  const testCatSlug = `test-cat-${Date.now().toString(36)}`;
  const createCatRes = await fetch(`${BASE_URL}/api/admin/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf,
    },
    body: JSON.stringify({
      name: "Test Category",
      slug: testCatSlug,
      description: "Test Category Description",
      status: "active",
      sortOrder: 99,
    }),
  });
  assert(createCatRes.status === 201, "Admin create category HTTP 201");
  const createdCatData = await createCatRes.json();
  const testCatId = createdCatData.categoryId;

  const delCatRes = await fetch(`${BASE_URL}/api/admin/categories/${testCatId}`, {
    method: "DELETE",
    headers: {
      Cookie: cookie,
      "X-CSRF-Token": csrf,
    },
  });
  assert(delCatRes.status === 200, "Admin delete category HTTP 200");

  // 14. Admin Order Status and Tracking
  const ordersListRes = await fetch(`${BASE_URL}/api/admin/orders`, {
    headers: { Cookie: cookie },
  });
  assert(ordersListRes.status === 200, "Admin list orders HTTP 200");
  const ordersListData = await ordersListRes.json();
  assert(ordersListData.orders.length >= 1, "Orders present in admin list");

  const latestOrder = ordersListData.orders[0];
  const patchOrderRes = await fetch(`${BASE_URL}/api/admin/orders/${latestOrder.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf,
    },
    body: JSON.stringify({
      status: "confirmed",
      paymentStatus: "invoice_sent",
      trackingCarrier: "Safechem Logistics",
      trackingNumber: "TRK-987654321",
    }),
  });
  assert(patchOrderRes.status === 200, "Admin order status and tracking updated HTTP 200");

  // 15. Admin Inquiry Review and CSV Export
  const inquiriesListRes = await fetch(`${BASE_URL}/api/admin/inquiries`, {
    headers: { Cookie: cookie },
  });
  assert(inquiriesListRes.status === 200, "Admin list inquiries HTTP 200");
  const inquiriesListData = await inquiriesListRes.json();
  assert(inquiriesListData.inquiries.length >= 1, "Inquiries present in admin list");

  const firstInquiry = inquiriesListData.inquiries[0];
  const patchInqRes = await fetch(`${BASE_URL}/api/admin/inquiries/${firstInquiry.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf,
    },
    body: JSON.stringify({
      status: "in_progress",
      adminNotes: "Contacted buyer via phone, discussed catalog terms.",
    }),
  });
  assert(patchInqRes.status === 200, "Admin inquiry status updated HTTP 200");

  const csvExportRes = await fetch(`${BASE_URL}/api/admin/inquiries/export.csv`, {
    headers: { Cookie: cookie },
  });
  assert(csvExportRes.status === 200, "Admin export CSV HTTP 200");
  assert(csvExportRes.headers.get("content-type")?.includes("text/csv"), "CSV content-type text/csv");

  // 16. Admin Logout
  const logoutRes = await fetch(`${BASE_URL}/api/admin/logout`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert(logoutRes.status === 200, "Admin logout HTTP 200");

  const meAfterLogout = await fetch(`${BASE_URL}/api/admin/me`, {
    headers: { Cookie: cookie },
  });
  assert(meAfterLogout.status === 401, "Session invalidated after logout HTTP 401");

  console.log(`\n======================================================`);
  console.log(`ALL TESTS COMPLETE!`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`======================================================\n`);
}

runTestSuite().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
