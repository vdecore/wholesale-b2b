import { handleOptions, json } from "./lib/http.js";
import * as publicHandlers from "./handlers/public.js";
import * as adminAuth from "./handlers/admin/auth.js";
import * as adminDashboard from "./handlers/admin/dashboard.js";
import * as adminProducts from "./handlers/admin/products.js";
import * as adminCategories from "./handlers/admin/categories.js";
import * as adminOrders from "./handlers/admin/orders.js";
import * as adminInquiries from "./handlers/admin/inquiries.js";
import * as adminImages from "./handlers/admin/images.js";
import { requireAdmin } from "./lib/session.js";
import { ValidationError } from "./lib/validate.js";
import { HttpError } from "./lib/http.js";

export async function handleRequest(request, env) {
  if (request.method === "OPTIONS") {
    return handleOptions(env, request);
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (path === "/api/health" && request.method === "GET") {
      return await publicHandlers.health(env, request);
    }

    if (path === "/api/products" && request.method === "GET") {
      return await publicHandlers.listProducts(request, env);
    }

    const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
    if (productMatch && request.method === "GET") {
      return await publicHandlers.getProductBySlug(decodeURIComponent(productMatch[1]), env, request);
    }

    if (path === "/api/categories" && request.method === "GET") {
      return await publicHandlers.listCategories(env, request);
    }

    if (path === "/api/inquiries" && request.method === "POST") {
      return await publicHandlers.createInquiry(request, env);
    }

    if (path === "/api/orders" && request.method === "POST") {
      return await publicHandlers.createOrder(request, env);
    }

    if (path === "/api/admin/login" && request.method === "POST") {
      return await adminAuth.login(request, env);
    }

    if (path === "/api/admin/logout" && request.method === "POST") {
      return await adminAuth.logout(request, env);
    }

    if (path === "/api/admin/me" && request.method === "GET") {
      return await adminAuth.me(request, env);
    }

    if (path === "/api/admin/dashboard" && request.method === "GET") {
      return await adminDashboard.dashboard(request, env);
    }

    if (path === "/api/admin/products" && request.method === "GET") {
      return await adminProducts.listAdminProducts(request, env);
    }
    if (path === "/api/admin/products" && request.method === "POST") {
      return await adminProducts.createProduct(request, env);
    }

    const adminProductId = path.match(/^\/api\/admin\/products\/(\d+)$/);
    if (adminProductId && request.method === "GET") {
      return await adminProducts.getAdminProduct(Number(adminProductId[1]), request, env);
    }
    if (adminProductId && request.method === "PUT") {
      return await adminProducts.updateProduct(Number(adminProductId[1]), request, env);
    }
    if (adminProductId && request.method === "DELETE") {
      return await adminProducts.deleteProduct(Number(adminProductId[1]), request, env);
    }

    if (path === "/api/admin/categories" && request.method === "GET") {
      return await adminCategories.listAdminCategories(request, env);
    }
    if (path === "/api/admin/categories" && request.method === "POST") {
      return await adminCategories.createCategory(request, env);
    }

    const adminCategoryId = path.match(/^\/api\/admin\/categories\/(\d+)$/);
    if (adminCategoryId && request.method === "PUT") {
      return await adminCategories.updateCategory(Number(adminCategoryId[1]), request, env);
    }
    if (adminCategoryId && request.method === "DELETE") {
      return await adminCategories.deleteCategory(Number(adminCategoryId[1]), request, env);
    }

    if (path === "/api/admin/orders" && request.method === "GET") {
      return await adminOrders.listAdminOrders(request, env);
    }

    const adminOrderId = path.match(/^\/api\/admin\/orders\/(\d+)$/);
    if (adminOrderId && request.method === "GET") {
      return await adminOrders.getAdminOrder(Number(adminOrderId[1]), request, env);
    }

    const adminOrderStatus = path.match(/^\/api\/admin\/orders\/(\d+)\/status$/);
    if (adminOrderStatus && request.method === "PATCH") {
      return await adminOrders.patchOrderStatus(Number(adminOrderStatus[1]), request, env);
    }

    if (path === "/api/admin/inquiries" && request.method === "GET") {
      return await adminInquiries.listAdminInquiries(request, env);
    }

    if (path === "/api/admin/inquiries/export.csv" && request.method === "GET") {
      const { session } = await requireAdmin(request, env);
      void session;
      return await adminInquiries.exportInquiriesCsv(request, env);
    }

    const adminInquiryId = path.match(/^\/api\/admin\/inquiries\/(\d+)\/status$/);
    if (adminInquiryId && request.method === "PATCH") {
      return await adminInquiries.patchInquiryStatus(Number(adminInquiryId[1]), request, env);
    }

    // Serve R2 images publicly
    const imageServe = path.match(/^\/api\/images\/(.+)$/);
    if (imageServe && request.method === "GET") {
      return await adminImages.serveImage(decodeURIComponent(imageServe[1]), request, env);
    }

    // Image upload
    const imageUpload = path.match(/^\/api\/admin\/products\/(\d+)\/images$/);
    if (imageUpload && request.method === "POST") {
      return await adminImages.uploadProductImage(Number(imageUpload[1]), request, env);
    }

    // Image reorder
    const imageReorder = path.match(/^\/api\/admin\/products\/(\d+)\/images\/reorder$/);
    if (imageReorder && request.method === "PUT") {
      return await adminImages.reorderProductImages(Number(imageReorder[1]), request, env);
    }

    // Image delete
    const imageDelete = path.match(/^\/api\/admin\/products\/(\d+)\/images\/(\d+)$/);
    if (imageDelete && request.method === "DELETE") {
      return await adminImages.deleteProductImage(Number(imageDelete[1]), Number(imageDelete[2]), request, env);
    }

    return json({ success: false, error: "Not found" }, { status: 404 }, env, request);
  } catch (error) {
    const mapped = publicHandlers.mapHandlerError(error, env, request);
    if (mapped) return mapped;

    if (error?.status === 401 || error?.status === 403) {
      return json({ success: false, error: error.message }, { status: error.status }, env, request);
    }

    if (error instanceof ValidationError) {
      return json({ success: false, error: error.message }, { status: 400 }, env, request);
    }

    if (error instanceof HttpError) {
      return json({ success: false, error: error.message }, { status: error.status }, env, request);
    }

    if (String(error.message || "").includes("SESSION_SECRET")) {
      return json(
        { success: false, error: "Server configuration error" },
        { status: 503 },
        env,
        request
      );
    }

    console.error("Unhandled API error", error);
    return json({ success: false, error: "Internal server error" }, { status: 500 }, env, request);
  }
}
