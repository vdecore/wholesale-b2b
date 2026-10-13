/**
 * API client for Wholesale B2B Storefront and Admin Panel
 * Uses relative `/api` paths (forwarded via Vite proxy in dev, direct in prod)
 */

const API_BASE = "/api";

async function request(path, options = {}) {
  const config = {
    ...options,
    credentials: "include", // transmit session cookie
    headers: {
      ...(options.headers || {}),
    },
  };

  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${path}`, config);
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.error || `Request failed with status ${response.status}`);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(text || `Request failed with status ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return response;
}

/* ==========================================================================
   PUBLIC API
   ========================================================================== */

export async function fetchHealth() {
  return request("/health");
}

export async function fetchProducts(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page);
  if (params.limit) query.set("limit", params.limit);
  if (params.q) query.set("q", params.q);
  if (params.category && params.category !== "All Products") query.set("category", params.category);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.sort) query.set("sort", params.sort);
  const qs = query.toString();
  return request(`/products${qs ? `?${qs}` : ""}`);
}

export async function fetchProductBySlug(slug) {
  return request(`/products/${encodeURIComponent(slug)}`);
}

export async function fetchCategories() {
  return request("/categories");
}

export async function submitInquiry(payload) {
  return request("/inquiries", {
    method: "POST",
    body: payload,
  });
}

export async function submitOrder(payload) {
  return request("/orders", {
    method: "POST",
    body: payload,
  });
}

/* ==========================================================================
   ADMIN API
   ========================================================================== */

export async function adminLogin(email, password) {
  return request("/admin/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function adminLogout() {
  return request("/admin/logout", {
    method: "POST",
  });
}

export async function adminMe() {
  return request("/admin/me");
}

export async function fetchDashboard() {
  return request("/admin/dashboard");
}

export async function fetchAdminProducts(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page);
  if (params.limit) query.set("limit", params.limit);
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  const qs = query.toString();
  return request(`/admin/products${qs ? `?${qs}` : ""}`);
}

export async function fetchAdminProduct(id) {
  return request(`/admin/products/${id}`);
}

export async function createAdminProduct(productData, csrfToken) {
  return request("/admin/products", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: productData,
  });
}

export async function updateAdminProduct(id, productData, csrfToken) {
  return request(`/admin/products/${id}`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: productData,
  });
}

export async function deleteAdminProduct(id, csrfToken) {
  return request(`/admin/products/${id}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function fetchAdminCategories() {
  return request("/admin/categories");
}

export async function createAdminCategory(categoryData, csrfToken) {
  return request("/admin/categories", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: categoryData,
  });
}

export async function updateAdminCategory(id, categoryData, csrfToken) {
  return request(`/admin/categories/${id}`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: categoryData,
  });
}

export async function deleteAdminCategory(id, csrfToken) {
  return request(`/admin/categories/${id}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function fetchAdminOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page);
  if (params.limit) query.set("limit", params.limit);
  if (params.q) query.set("q", params.q);
  const qs = query.toString();
  return request(`/admin/orders${qs ? `?${qs}` : ""}`);
}

export async function fetchAdminOrder(id) {
  return request(`/admin/orders/${id}`);
}

export async function updateAdminOrderStatus(id, statusData, csrfToken) {
  return request(`/admin/orders/${id}/status`, {
    method: "PATCH",
    headers: { "X-CSRF-Token": csrfToken },
    body: statusData,
  });
}

export async function fetchAdminInquiries(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page);
  if (params.limit) query.set("limit", params.limit);
  if (params.status) query.set("status", params.status);
  const qs = query.toString();
  return request(`/admin/inquiries${qs ? `?${qs}` : ""}`);
}

export async function updateAdminInquiryStatus(id, updateData, csrfToken) {
  return request(`/admin/inquiries/${id}/status`, {
    method: "PATCH",
    headers: { "X-CSRF-Token": csrfToken },
    body: updateData,
  });
}

export function getInquiriesExportUrl() {
  return `${API_BASE}/admin/inquiries/export.csv`;
}

export async function uploadProductImage(productId, file, csrfToken) {
  const formData = new FormData();
  formData.append("file", file);
  return request(`/admin/products/${productId}/images`, {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: formData,
  });
}

export async function deleteProductImage(productId, imageId, csrfToken) {
  return request(`/admin/products/${productId}/images/${imageId}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function reorderProductImages(productId, imageIds, csrfToken) {
  return request(`/admin/products/${productId}/images/reorder`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: { imageIds },
  });
}
