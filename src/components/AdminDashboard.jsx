import { useState, useEffect, useCallback, useRef } from "react";
import {
  adminLogin,
  adminLogout,
  adminMe,
  fetchDashboard,
  fetchAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  fetchAdminOrders,
  fetchAdminOrder,
  updateAdminOrderStatus,
  fetchAdminInquiries,
  updateAdminInquiryStatus,
  getInquiriesExportUrl,
  uploadProductImage,
  deleteProductImage,
  reorderProductImages,
} from "../api.js";

export default function AdminDashboard({ onNavigateToStore }) {
  // Auth state
  const [adminUser, setAdminUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Active section tab
  const [tab, setTab] = useState("overview"); // 'overview' | 'products' | 'categories' | 'orders' | 'inquiries'

  // Dashboard Overview state
  const [dashboardData, setDashboardData] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  // Products state
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("");
  const [editingProduct, setEditingProduct] = useState(null); // null or product obj or { isNew: true }
  const [deleteProductConfirm, setDeleteProductConfirm] = useState(null);

  // Categories state
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState(null);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [viewingOrder, setViewingOrder] = useState(null); // full order with items

  // Inquiries state
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState("");
  const [editingInquiry, setEditingInquiry] = useState(null);

  // Notification banners
  const [banner, setBanner] = useState({ text: "", type: "" });

  const showBanner = (text, type = "success") => {
    setBanner({ text, type });
    setTimeout(() => setBanner({ text: "", type: "" }), 5000);
  };

  // Check existing session on load
  const verifySession = useCallback(async () => {
    try {
      setCheckingAuth(true);
      const res = await adminMe();
      if (res.success && res.admin) {
        setAdminUser(res.admin);
        setCsrfToken(res.csrfToken);
      } else {
        setAdminUser(null);
      }
    } catch {
      setAdminUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // Load Dashboard Data
  const loadDashboard = useCallback(async () => {
    try {
      setDashLoading(true);
      const res = await fetchDashboard();
      if (res.success) {
        setDashboardData(res);
      }
    } catch (err) {
      showBanner(err.message || "Failed to load dashboard statistics", "error");
    } finally {
      setDashLoading(false);
    }
  }, []);

  // Load Products
  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const res = await fetchAdminProducts({
        q: productSearch,
        status: productStatusFilter,
        limit: 100,
      });
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err) {
      showBanner(err.message || "Failed to load products", "error");
    } finally {
      setProductsLoading(false);
    }
  }, [productSearch, productStatusFilter]);

  // Load Categories
  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const res = await fetchAdminCategories();
      if (res.success) {
        setCategories(res.categories || []);
      }
    } catch (err) {
      showBanner(err.message || "Failed to load categories", "error");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Load Orders
  const loadOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const res = await fetchAdminOrders({ q: orderSearch, limit: 100 });
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (err) {
      showBanner(err.message || "Failed to load orders", "error");
    } finally {
      setOrdersLoading(false);
    }
  }, [orderSearch]);

  // Load Inquiries
  const loadInquiries = useCallback(async () => {
    try {
      setInquiriesLoading(true);
      const res = await fetchAdminInquiries({
        status: inquiryStatusFilter,
        limit: 100,
      });
      if (res.success) {
        setInquiries(res.inquiries || []);
      }
    } catch (err) {
      showBanner(err.message || "Failed to load inquiries", "error");
    } finally {
      setInquiriesLoading(false);
    }
  }, [inquiryStatusFilter]);

  // Effect to load data based on active tab
  useEffect(() => {
    if (!adminUser) return;
    if (tab === "overview") loadDashboard();
    if (tab === "products") loadProducts();
    if (tab === "categories") loadCategories();
    if (tab === "orders") loadOrders();
    if (tab === "inquiries") loadInquiries();
  }, [adminUser, tab, loadDashboard, loadProducts, loadCategories, loadOrders, loadInquiries]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await adminLogin(loginEmail, loginPassword);
      if (res.success) {
        setAdminUser(res.admin);
        setCsrfToken(res.csrfToken);
        setLoginPassword("");
        showBanner(`Welcome back, ${res.admin.name || res.admin.email}!`);
      } else {
        setLoginError(res.error || "Login failed");
      }
    } catch (err) {
      setLoginError(err.message || "Invalid email or password");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch {
      // Ignore logout errors
    } finally {
      setAdminUser(null);
      setCsrfToken("");
      showBanner("Logged out successfully");
    }
  };

  if (checkingAuth) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-spinner" />
        <p>Verifying admin authorization...</p>
      </div>
    );
  }

  // ----------------------------------------------------
  // LOGIN SCREEN
  // ----------------------------------------------------
  if (!adminUser) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <span className="brand-mark">V</span>
            <h2>Vdecore Admin Portal</h2>
            <p>Authorized access only. All actions are logged.</p>
          </div>

          {loginError && (
            <div className="admin-alert-banner error" role="alert">
              <span>⚠️</span> {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="form-group">
              <label htmlFor="admEmail">Admin Email</label>
              <input
                id="admEmail"
                type="email"
                required
                placeholder="admin@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="admPass">Password</label>
              <input
                id="admPass"
                type="password"
                required
                placeholder="••••••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="primary-button full-button"
              disabled={loginLoading}
            >
              {loginLoading ? "Authenticating..." : "Sign In to Portal →"}
            </button>
          </form>

          <div className="admin-login-footer">
            <button
              type="button"
              className="admin-back-btn"
              onClick={onNavigateToStore}
            >
              ← Return to Public Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // AUTHENTICATED DASHBOARD
  // ----------------------------------------------------
  return (
    <div className="admin-portal">
      {/* Admin Top Header */}
      <header className="admin-header">
        <div className="admin-header-brand">
          <span className="brand-mark">V</span>
          <div>
            <strong>VDECORE WHOLESALE</strong>
            <small>Management Dashboard</small>
          </div>
        </div>

        <div className="admin-header-user">
          <span className="admin-badge">Admin: {adminUser.name || adminUser.email}</span>
          <button
            type="button"
            className="admin-header-btn"
            onClick={onNavigateToStore}
          >
            Storefront
          </button>
          <button
            type="button"
            className="admin-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {banner.text && (
        <div className={`admin-toast-banner ${banner.type}`}>
          {banner.type === "success" ? "✓ " : "⚠️ "} {banner.text}
        </div>
      )}

      {/* Main Admin Navigation Tabs */}
      <nav className="admin-tabs-bar" aria-label="Admin Navigation">
        <button
          type="button"
          className={`admin-tab-btn ${tab === "overview" ? "active" : ""}`}
          onClick={() => setTab("overview")}
        >
          📊 Overview
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${tab === "products" ? "active" : ""}`}
          onClick={() => setTab("products")}
        >
          📦 Products ({dashboardData?.stats?.total_products ?? products.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${tab === "categories" ? "active" : ""}`}
          onClick={() => setTab("categories")}
        >
          🏷️ Categories ({categories.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${tab === "orders" ? "active" : ""}`}
          onClick={() => setTab("orders")}
        >
          📑 Orders ({dashboardData?.stats?.total_orders ?? orders.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${tab === "inquiries" ? "active" : ""}`}
          onClick={() => setTab("inquiries")}
        >
          💬 Inquiries ({dashboardData?.stats?.new_inquiries ?? inquiries.length})
        </button>
      </nav>

      {/* Tab Content Panes */}
      <main className="admin-main-pane">
        {/* TAB 1: OVERVIEW */}
        {tab === "overview" && (
          <div className="admin-overview-view">
            {dashLoading && !dashboardData ? (
              <div className="admin-loading-box">Loading metrics...</div>
            ) : (
              <>
                <div className="stats-cards-grid">
                  <div className="stat-card">
                    <span className="stat-label">Total Products</span>
                    <strong className="stat-value">
                      {dashboardData?.stats?.total_products ?? 0}
                    </strong>
                    <small className="stat-sub">
                      {dashboardData?.stats?.active_products ?? 0} active, {dashboardData?.stats?.inactive_products ?? 0} inactive
                    </small>
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">Low Stock Alert</span>
                    <strong className="stat-value warning">
                      {dashboardData?.stats?.low_stock_products ?? 0}
                    </strong>
                    <small className="stat-sub">Products with ≤ 5 units left</small>
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">Total Orders</span>
                    <strong className="stat-value">
                      {dashboardData?.stats?.total_orders ?? 0}
                    </strong>
                    <small className="stat-sub">
                      {dashboardData?.stats?.pending_orders ?? 0} pending review
                    </small>
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">New Quotation Inquiries</span>
                    <strong className="stat-value highlight">
                      {dashboardData?.stats?.new_inquiries ?? 0}
                    </strong>
                    <small className="stat-sub">Awaiting commercial response</small>
                  </div>
                </div>

                <div className="dashboard-recents-grid">
                  {/* Recent Orders */}
                  <div className="recent-card">
                    <div className="recent-card-header">
                      <h3>Recent Orders</h3>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => setTab("orders")}
                      >
                        View All →
                      </button>
                    </div>

                    {dashboardData?.recentOrders?.length === 0 ? (
                      <p className="empty-subtext">No orders recorded yet.</p>
                    ) : (
                      <div className="table-wrapper">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Order Number</th>
                              <th>Customer</th>
                              <th>Amount</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData?.recentOrders?.map((o) => (
                              <tr key={o.order_number}>
                                <td>
                                  <strong>{o.order_number}</strong>
                                </td>
                                <td>
                                  {o.company_name || o.contact_name}
                                  <small style={{ display: "block", color: "var(--muted)" }}>
                                    {o.email}
                                  </small>
                                </td>
                                <td>
                                  ₹{(Number(o.total_paise) / 100).toLocaleString("en-IN")}
                                </td>
                                <td>
                                  <span className={`status-pill ${o.status}`}>{o.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Recent Inquiries */}
                  <div className="recent-card">
                    <div className="recent-card-header">
                      <h3>Recent Quotation Inquiries</h3>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => setTab("inquiries")}
                      >
                        View All →
                      </button>
                    </div>

                    {dashboardData?.recentInquiries?.length === 0 ? (
                      <p className="empty-subtext">No quotation inquiries yet.</p>
                    ) : (
                      <div className="table-wrapper">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Company / Buyer</th>
                              <th>Email</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData?.recentInquiries?.map((inq) => (
                              <tr key={inq.id}>
                                <td>
                                  <strong>{inq.company_name}</strong>
                                  <small style={{ display: "block", color: "var(--muted)" }}>
                                    {inq.contact_name}
                                  </small>
                                </td>
                                <td>{inq.email}</td>
                                <td>
                                  <span className={`status-pill ${inq.status}`}>{inq.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: PRODUCTS */}
        {tab === "products" && (
          <div className="admin-products-view">
            <div className="view-toolbar">
              <div className="search-filter-row">
                <input
                  type="text"
                  placeholder="Search by SKU, name, or slug..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="toolbar-search"
                />
                <select
                  value={productStatusFilter}
                  onChange={(e) => setProductStatusFilter(e.target.value)}
                  className="toolbar-select"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={loadProducts}
                  disabled={productsLoading}
                >
                  Refresh
                </button>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setEditingProduct({
                    isNew: true,
                    name: "",
                    sku: "",
                    slug: "",
                    category: "",
                    description: "",
                    price: 100,
                    moq: 10,
                    stock: 100,
                    unit: "piece",
                    imageUrl: "",
                    status: "active",
                  })
                }
              >
                + Add New Product
              </button>
            </div>

            {productsLoading ? (
              <div className="admin-loading-box">Loading product catalogue...</div>
            ) : products.length === 0 ? (
              <div className="admin-empty-box">No products found matching filters.</div>
            ) : (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>MOQ</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <code>{p.sku}</code>
                        </td>
                        <td>
                          <strong>{p.name}</strong>
                          <small style={{ display: "block", color: "var(--muted)" }}>
                            slug: {p.slug}
                          </small>
                        </td>
                        <td>{p.category || "—"}</td>
                        <td>₹{Number(p.price).toLocaleString("en-IN")}</td>
                        <td>
                          {p.moq} {p.unit || "unit"}
                        </td>
                        <td>
                          <span
                            className={
                              p.stock <= 5 ? "stock-critical" : p.stock <= 20 ? "stock-warn" : ""
                            }
                          >
                            {p.stock}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`toggle-status-btn ${p.status}`}
                            onClick={async () => {
                              const nextStatus = p.status === "active" ? "inactive" : "active";
                              try {
                                await updateAdminProduct(p.id, { status: nextStatus }, csrfToken);
                                showBanner(
                                  `${p.name} marked as ${nextStatus}`
                                );
                                loadProducts();
                              } catch (err) {
                                showBanner(err.message || "Failed to update status", "error");
                              }
                            }}
                          >
                            {p.status}
                          </button>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="action-link-btn"
                              onClick={() => setEditingProduct(p)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="action-link-btn delete"
                              onClick={() => setDeleteProductConfirm(p)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CATEGORIES */}
        {tab === "categories" && (
          <div className="admin-categories-view">
            <div className="view-toolbar">
              <h3>Wholesale Categories</h3>
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setEditingCategory({
                    isNew: true,
                    name: "",
                    slug: "",
                    description: "",
                    status: "active",
                    sortOrder: categories.length + 1,
                  })
                }
              >
                + Add Category
              </button>
            </div>

            {categoriesLoading ? (
              <div className="admin-loading-box">Loading categories...</div>
            ) : categories.length === 0 ? (
              <div className="admin-empty-box">No categories found.</div>
            ) : (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Category Name</th>
                      <th>Slug</th>
                      <th>Products Linked</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td>{c.sort_order ?? 0}</td>
                        <td>
                          <strong>{c.name}</strong>
                          {c.description && (
                            <small style={{ display: "block", color: "var(--muted)" }}>
                              {c.description}
                            </small>
                          )}
                        </td>
                        <td>
                          <code>{c.slug}</code>
                        </td>
                        <td>{c.product_count ?? 0} items</td>
                        <td>
                          <span className={`status-pill ${c.status}`}>{c.status}</span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="action-link-btn"
                              onClick={() => setEditingCategory(c)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="action-link-btn delete"
                              onClick={() => setDeleteCategoryConfirm(c)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ORDERS */}
        {tab === "orders" && (
          <div className="admin-orders-view">
            <div className="view-toolbar">
              <input
                type="text"
                placeholder="Search by order number, buyer name, or email..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="toolbar-search"
              />
              <button
                type="button"
                className="secondary-btn"
                onClick={loadOrders}
                disabled={ordersLoading}
              >
                Refresh
              </button>
            </div>

            {ordersLoading ? (
              <div className="admin-loading-box">Loading wholesale orders...</div>
            ) : orders.length === 0 ? (
              <div className="admin-empty-box">No orders match search query.</div>
            ) : (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer / Business</th>
                      <th>Value</th>
                      <th>Fulfilment</th>
                      <th>Payment</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.order_number}</strong>
                        </td>
                        <td>
                          <div>{o.company_name || o.contact_name}</div>
                          <small style={{ color: "var(--muted)" }}>
                            {o.email} {o.phone ? `| ${o.phone}` : ""}
                          </small>
                        </td>
                        <td>
                          <strong>
                            ₹{(Number(o.total_paise) / 100).toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td>
                          <span className={`status-pill ${o.status}`}>{o.status}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${o.payment_status}`}>
                            {o.payment_status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>
                          <small>{o.created_at ? o.created_at.slice(0, 10) : "—"}</small>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="primary-button small-btn"
                            onClick={async () => {
                              try {
                                const full = await fetchAdminOrder(o.id);
                                if (full.success) setViewingOrder(full);
                              } catch (err) {
                                showBanner(err.message || "Failed to load order detail", "error");
                              }
                            }}
                          >
                            View & Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: INQUIRIES */}
        {tab === "inquiries" && (
          <div className="admin-inquiries-view">
            <div className="view-toolbar">
              <div className="search-filter-row">
                <select
                  value={inquiryStatusFilter}
                  onChange={(e) => setInquiryStatusFilter(e.target.value)}
                  className="toolbar-select"
                >
                  <option value="">All Statuses</option>
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="quoted">Quoted</option>
                  <option value="closed">Closed</option>
                </select>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={loadInquiries}
                  disabled={inquiriesLoading}
                >
                  Refresh
                </button>
              </div>

              <a
                href={getInquiriesExportUrl()}
                download="wholesale-inquiries.csv"
                className="secondary-btn"
              >
                📥 Export CSV
              </a>
            </div>

            {inquiriesLoading ? (
              <div className="admin-loading-box">Loading quotation inquiries...</div>
            ) : inquiries.length === 0 ? (
              <div className="admin-empty-box">No inquiries matching filter.</div>
            ) : (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Contact</th>
                      <th>Product Interest</th>
                      <th>Requested Qty</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiries.map((inq) => (
                      <tr key={inq.id}>
                        <td>
                          <strong>{inq.company_name}</strong>
                        </td>
                        <td>
                          <div>{inq.contact_name}</div>
                          <small style={{ color: "var(--muted)" }}>
                            {inq.email} {inq.phone ? `| ${inq.phone}` : ""}
                          </small>
                        </td>
                        <td>{inq.product_interest || "—"}</td>
                        <td>{inq.requested_quantity ?? "—"}</td>
                        <td>
                          <span className={`status-pill ${inq.status}`}>{inq.status}</span>
                        </td>
                        <td>
                          <small>{inq.created_at ? inq.created_at.slice(0, 10) : "—"}</small>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="primary-button small-btn"
                            onClick={() => setEditingInquiry(inq)}
                          >
                            Review & Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          MODALS & DRAWERS
          ========================================================================= */}

      {/* PRODUCT ADD / EDIT MODAL */}
      {editingProduct && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          csrfToken={csrfToken}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            showBanner(editingProduct.isNew ? "Product created successfully" : "Product updated successfully");
            loadProducts();
          }}
        />
      )}

      {/* DELETE PRODUCT CONFIRMATION MODAL */}
      {deleteProductConfirm && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteProductConfirm(null);
          }}
        >
          <div className="admin-confirm-modal" role="dialog" aria-modal="true">
            <h3>Delete Product?</h3>
            <p>
              Are you sure you want to delete <strong>{deleteProductConfirm.name}</strong> (SKU: {deleteProductConfirm.sku})?
            </p>
            <p className="admin-warning-text">
              Note: Products with order history cannot be deleted and must be deactivated instead.
            </p>
            <div className="form-actions-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setDeleteProductConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-danger-btn"
                onClick={async () => {
                  try {
                    await deleteAdminProduct(deleteProductConfirm.id, csrfToken);
                    setDeleteProductConfirm(null);
                    showBanner("Product deleted successfully");
                    loadProducts();
                  } catch (err) {
                    showBanner(err.message || "Failed to delete product", "error");
                  }
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY ADD / EDIT MODAL */}
      {editingCategory && (
        <CategoryFormModal
          category={editingCategory}
          csrfToken={csrfToken}
          onClose={() => setEditingCategory(null)}
          onSaved={() => {
            setEditingCategory(null);
            showBanner(editingCategory.isNew ? "Category created" : "Category updated");
            loadCategories();
          }}
        />
      )}

      {/* DELETE CATEGORY CONFIRMATION MODAL */}
      {deleteCategoryConfirm && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteCategoryConfirm(null);
          }}
        >
          <div className="admin-confirm-modal" role="dialog" aria-modal="true">
            <h3>Delete Category?</h3>
            <p>
              Are you sure you want to delete category <strong>{deleteCategoryConfirm.name}</strong>?
            </p>
            <div className="form-actions-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setDeleteCategoryConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-danger-btn"
                onClick={async () => {
                  try {
                    await deleteAdminCategory(deleteCategoryConfirm.id, csrfToken);
                    setDeleteCategoryConfirm(null);
                    showBanner("Category deleted successfully");
                    loadCategories();
                  } catch (err) {
                    showBanner(err.message || "Failed to delete category", "error");
                  }
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAIL & STATUS DRAWER */}
      {viewingOrder && (
        <OrderDetailModal
          orderData={viewingOrder}
          csrfToken={csrfToken}
          onClose={() => setViewingOrder(null)}
          onUpdated={() => {
            showBanner("Order updated successfully");
            loadOrders();
          }}
        />
      )}

      {/* INQUIRY REVIEW & UPDATE MODAL */}
      {editingInquiry && (
        <InquiryReviewModal
          inquiry={editingInquiry}
          csrfToken={csrfToken}
          onClose={() => setEditingInquiry(null)}
          onUpdated={() => {
            setEditingInquiry(null);
            showBanner("Inquiry status and notes updated");
            loadInquiries();
          }}
        />
      )}
    </div>
  );
}

/* =========================================================================
   SUB-MODAL COMPONENTS
   ========================================================================= */

function ProductFormModal({ product, categories, csrfToken, onClose, onSaved }) {
  const isNew = !!product.isNew;
  const [name, setName] = useState(product.name || "");
  const [sku, setSku] = useState(product.sku || "");
  const [slug, setSlug] = useState(product.slug || "");
  const [category, setCategory] = useState(product.category || "");
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(product.price ?? 100);
  const [moq, setMoq] = useState(product.moq ?? 10);
  const [stock, setStock] = useState(product.stock ?? 100);
  const [unit, setUnit] = useState(product.unit || "piece");
  const [status, setStatus] = useState(product.status || "active");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Images consolidated from all sources
  const [managedImages, setManagedImages] = useState(() => {
    const imgs = [];
    const seenUrls = new Set();

    // First include existing product.images (preserves DB IDs and storage types)
    for (const img of (product.images || [])) {
      if (img?.url && !seenUrls.has(img.url)) {
        imgs.push({
          id: img.id || null,
          url: img.url,
          altText: img.altText || null,
          source: img.storageType === 'r2' ? 'r2' : 'url',
          r2Key: img.r2Key || null,
          sortOrder: img.sortOrder ?? imgs.length
        });
        seenUrls.add(img.url);
      }
    }

    // If product.imageUrl exists and wasn't in product.images (legacy single-image record), prepend it
    if (product.imageUrl && !seenUrls.has(product.imageUrl)) {
      imgs.unshift({
        id: null,
        url: product.imageUrl,
        altText: null,
        source: 'primary',
        r2Key: null,
        sortOrder: 0
      });
    }

    return imgs;
  });

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [urlPreview, setUrlPreview] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (files) => {
    if (!files?.length) return;
    const remaining = 4 - managedImages.length;
    if (remaining <= 0) {
      setErrorMsg('Maximum 4 images allowed per product.');
      return;
    }
    
    const filesToUpload = Array.from(files).slice(0, remaining);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    for (const file of filesToUpload) {
      if (!allowedTypes.includes(file.type)) {
        setErrorMsg(`File "${file.name}" is not a supported image type. Use JPEG, PNG, WebP, or GIF.`);
        return;
      }
      if (file.size > maxSize) {
        setErrorMsg(`File "${file.name}" exceeds 5MB size limit.`);
        return;
      }
    }
    
    // Need a saved product ID to upload
    if (isNew) {
      setErrorMsg('Please save the product first before uploading images. You can add image URLs now and upload files after saving.');
      return;
    }
    
    setUploading(true);
    setUploadProgress('');
    setErrorMsg('');
    
    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        setUploadProgress(`Uploading ${i + 1} of ${filesToUpload.length}...`);
        const result = await uploadProductImage(product.id, filesToUpload[i], csrfToken);
        if (result.success && result.image) {
          setManagedImages(prev => [...prev, {
            id: result.image.id,
            url: result.image.url,
            altText: result.image.altText,
            source: 'r2',
            r2Key: result.image.r2Key,
            sortOrder: result.image.sortOrder
          }]);
        }
      }
      setUploadProgress(`${filesToUpload.length} image(s) uploaded successfully!`);
      setTimeout(() => setUploadProgress(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    
    if (managedImages.length >= 4) {
      setUrlError('Maximum 4 images allowed.');
      return;
    }
    
    try {
      const url = new URL(trimmed);
      if (!['http:', 'https:'].includes(url.protocol)) {
        setUrlError('Only http and https URLs are supported.');
        return;
      }
    } catch {
      setUrlError('Please enter a valid URL.');
      return;
    }
    
    // Check for duplicates
    if (managedImages.some(img => img.url === trimmed)) {
      setUrlError('This URL is already added.');
      return;
    }
    
    setManagedImages(prev => [...prev, {
      id: null,
      url: trimmed,
      altText: null,
      source: 'url',
      sortOrder: prev.length
    }]);
    setUrlInput('');
    setUrlError('');
    setUrlPreview(null);
  };

  const handleUrlPreview = (value) => {
    setUrlInput(value);
    setUrlError('');
    const trimmed = value.trim();
    if (!trimmed) { setUrlPreview(null); return; }
    try {
      const url = new URL(trimmed);
      if (['http:', 'https:'].includes(url.protocol)) {
        setUrlPreview(trimmed);
      } else {
        setUrlPreview(null);
      }
    } catch {
      setUrlPreview(null);
    }
  };

  const handleRemoveImage = async (index) => {
    const img = managedImages[index];
    // If it's an R2 image with an ID, delete from server
    if (img.id && img.source === 'r2' && !isNew) {
      try {
        await deleteProductImage(product.id, img.id, csrfToken);
      } catch (err) {
        setErrorMsg(err.message || 'Failed to delete image from server');
        return;
      }
    }
    setManagedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) { setDragOverIndex(null); return; }
    
    setManagedImages(prev => {
      const next = [...prev];
      const [dragged] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, dragged);
      return next;
    });
    setDragOverIndex(null);
  };

  const handleMoveImage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= managedImages.length) return;
    setManagedImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleNameChange = (val) => {
    setName(val);
    if (isNew && !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        slug: slug.trim().toLowerCase(),
        category: category.trim() || null,
        description: description.trim() || null,
        price: Number(price),
        moq: Number(moq),
        stock: Number(stock),
        unit: unit.trim() || 'piece',
        imageUrl: managedImages[0]?.url || null,
        status,
        images: managedImages.map((img) => ({
          id: img.id || undefined,
          url: img.url,
          altText: img.altText || null,
        })),
      };
      
      if (isNew) {
        const result = await createAdminProduct(payload, csrfToken);
        onSaved(result);
      } else {
        await updateAdminProduct(product.id, payload, csrfToken);
        
        // If order changed and we have R2 images with IDs, send reorder
        const idsToReorder = managedImages.filter(img => img.id).map(img => img.id);
        if (idsToReorder.length > 0) {
          try {
            await reorderProductImages(product.id, idsToReorder, csrfToken);
          } catch {
            // Non-critical — order was saved in the images array already
          }
        }
        onSaved();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="admin-form-modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <h2>{isNew ? "Add New Wholesale Product" : `Edit Product: ${product.sku}`}</h2>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        {errorMsg && <div className="admin-alert-banner error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="admin-modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pName">Product Name *</label>
              <input
                id="pName"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="pSku">SKU Code *</label>
              <input
                id="pSku"
                required
                placeholder="e.g. SKU-FAB-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pSlug">URL Slug *</label>
              <input
                id="pSlug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="pCategory">Category</label>
              <input
                id="pCategory"
                list="catOptions"
                placeholder="Select or enter category..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <datalist id="catOptions">
                {categories.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="form-row three-col">
            <div className="form-group">
              <label htmlFor="pPrice">Price (₹ INR) *</label>
              <input
                id="pPrice"
                type="number"
                min="0"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="pMoq">Min. Order Qty (MOQ) *</label>
              <input
                id="pMoq"
                type="number"
                min="1"
                required
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="pStock">Available Stock *</label>
              <input
                id="pStock"
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pUnit">Unit (e.g. piece, meter, box)</label>
              <input
                id="pUnit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="pStatus">Catalogue Status</label>
              <select
                id="pStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active (Visible)</option>
                <option value="inactive">Inactive (Hidden)</option>
              </select>
            </div>
          </div>

          {/* Image Management Section */}
          <div className="admin-images-section">
            <label className="admin-images-label">
              Product Images
              <small style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
                Up to 4 images — first image is the primary display image
              </small>
            </label>
            
            {/* Current images grid */}
            {managedImages.length > 0 && (
              <div className="admin-images-grid">
                {managedImages.map((img, idx) => (
                  <div
                    key={img.id || img.url}
                    className={`admin-image-card${idx === 0 ? ' primary' : ''}${dragOverIndex === idx ? ' drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => handleDrop(e, idx)}
                  >
                    <div className="admin-image-preview">
                      <img
                        src={img.url}
                        alt={img.altText || `Image ${idx + 1}`}
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                      />
                      <div className="admin-image-fallback" style={{ display: 'none' }}>
                        <span>⚠️ Failed to load</span>
                      </div>
                    </div>
                    <div className="admin-image-controls">
                      <span className="admin-image-badge">
                        {idx === 0 ? '★ Primary' : `#${idx + 1}`}
                      </span>
                      <span className="admin-image-source">
                        {img.source === 'r2' ? '📁 Uploaded' : '🔗 URL'}
                      </span>
                      <div className="admin-image-actions">
                        <button type="button" title="Move up" aria-label="Move image up" disabled={idx === 0} onClick={() => handleMoveImage(idx, idx - 1)}>↑</button>
                        <button type="button" title="Move down" aria-label="Move image down" disabled={idx === managedImages.length - 1} onClick={() => handleMoveImage(idx, idx + 1)}>↓</button>
                        <button type="button" title="Remove image" aria-label="Remove image" className="remove-img-btn" onClick={() => handleRemoveImage(idx)}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add images area - only show if under limit */}
            {managedImages.length < 4 && (
              <div className="admin-add-images">
                {/* Method A: File Upload */}
                <div className="admin-upload-zone">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => { handleFileUpload(e.target.files); e.target.value = ''; }}
                    disabled={uploading || isNew}
                  />
                  <button
                    type="button"
                    className="admin-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || isNew}
                  >
                    {uploading ? uploadProgress || 'Uploading...' : '📁 Upload Image Files'}
                  </button>
                  {isNew && (
                    <small className="upload-note">Save the product first to enable file uploads</small>
                  )}
                  <small className="upload-hint">JPEG, PNG, WebP, GIF — max 5MB each</small>
                </div>
                
                {/* Method B: URL Input */}
                <div className="admin-url-input-zone">
                  <div className="admin-url-row">
                    <input
                      type="url"
                      placeholder="Paste image URL (https://...)" 
                      value={urlInput}
                      onChange={(e) => handleUrlPreview(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
                    />
                    <button type="button" className="secondary-btn" onClick={handleAddUrl} disabled={!urlInput.trim()}>
                      + Add URL
                    </button>
                  </div>
                  {urlError && <small className="url-error">{urlError}</small>}
                  {urlPreview && (
                    <div className="url-preview-box">
                      <img
                        src={urlPreview}
                        alt="URL preview"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {managedImages.length >= 4 && (
              <p className="admin-images-limit-note">Maximum of 4 images reached. Remove an image to add more.</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="pDesc">Description</label>
            <textarea
              id="pDesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-actions-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



function CategoryFormModal({ category, csrfToken, onClose, onSaved }) {
  const isNew = !!category.isNew;
  const [name, setName] = useState(category.name || "");
  const [slug, setSlug] = useState(category.slug || "");
  const [description, setDescription] = useState(category.description || "");
  const [status, setStatus] = useState(category.status || "active");
  const [sortOrder, setSortOrder] = useState(category.sort_order ?? category.sortOrder ?? 0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleNameChange = (val) => {
    setName(val);
    if (isNew && !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim() || null,
        status,
        sortOrder: Number(sortOrder) || 0,
      };

      if (isNew) {
        await createAdminCategory(payload, csrfToken);
      } else {
        await updateAdminCategory(category.id, payload, csrfToken);
      }
      onSaved();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="admin-form-modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <h2>{isNew ? "Create Category" : `Edit Category: ${category.name}`}</h2>
          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {errorMsg && <div className="admin-alert-banner error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="admin-modal-form">
          <div className="form-group">
            <label htmlFor="catName">Category Name *</label>
            <input
              id="catName"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="catSlug">Slug *</label>
            <input
              id="catSlug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="catSort">Sort Order</label>
              <input
                id="catSort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="catStatus">Status</label>
              <select
                id="catStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="catDesc">Description</label>
            <textarea
              id="catDesc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-actions-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Create Category" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrderDetailModal({ orderData, csrfToken, onClose, onUpdated }) {
  const { order, items } = orderData;
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status);
  const [trackingCarrier, setTrackingCarrier] = useState(order.tracking_carrier || "");
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || "");
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState("");

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMsg("");
    try {
      const payload = {
        status,
        paymentStatus,
        trackingCarrier: trackingCarrier.trim() || null,
        trackingNumber: trackingNumber.trim() || null,
      };
      await updateAdminOrderStatus(order.id, payload, csrfToken);
      setMsg("Order updated successfully!");
      onUpdated();
    } catch (err) {
      setMsg(`Error: ${err.message || "Failed to update order"}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="admin-order-modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">ORDER MANAGEMENT</span>
            <h2>Order: {order.order_number}</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {msg && (
          <div className={`admin-alert-banner ${msg.startsWith("Error") ? "error" : "success"}`}>
            {msg}
          </div>
        )}

        <div className="order-modal-grid">
          {/* Left: Customer & Line Items */}
          <div className="order-info-col">
            <div className="order-customer-box">
              <h4>Customer Information</h4>
              <p><strong>Company:</strong> {order.company_name || "—"}</p>
              <p><strong>Contact:</strong> {order.contact_name}</p>
              <p><strong>Email:</strong> {order.email}</p>
              <p><strong>Phone:</strong> {order.phone || "—"}</p>
              <p><strong>Shipping Address:</strong><br />{order.shipping_address}</p>
              {order.notes && <p><strong>Notes:</strong> {order.notes}</p>}
            </div>

            <div className="order-items-box">
              <h4>Ordered Items ({items?.length || 0})</h4>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>SKU</th>
                    <th>Unit Price</th>
                    <th>Qty</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((it) => (
                    <tr key={it.id}>
                      <td>{it.product_name}</td>
                      <td><code>{it.product_sku}</code></td>
                      <td>₹{(it.unit_price_paise / 100).toLocaleString("en-IN")}</td>
                      <td>{it.quantity}</td>
                      <td><strong>₹{(it.line_total_paise / 100).toLocaleString("en-IN")}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="order-total-summary">
                <span>Subtotal: ₹{(order.subtotal_paise / 100).toLocaleString("en-IN")}</span>
                <strong>Total Payable: ₹{(order.total_paise / 100).toLocaleString("en-IN")}</strong>
              </div>
            </div>
          </div>

          {/* Right: Status & Tracking Form */}
          <div className="order-controls-col">
            <form onSubmit={handleUpdate} className="order-status-form">
              <h4>Update Fulfilment & Tracking</h4>

              <div className="form-group">
                <label htmlFor="ordStatus">Order Status</label>
                <select
                  id="ordStatus"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="processing">processing</option>
                  <option value="shipped">shipped</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="ordPayStatus">Payment Status</label>
                <select
                  id="ordPayStatus"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  <option value="awaiting_invoice">awaiting_invoice</option>
                  <option value="invoice_sent">invoice_sent</option>
                  <option value="paid">paid</option>
                  <option value="refunded">refunded</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="ordCarrier">Shipping Carrier / Transporter</label>
                <input
                  id="ordCarrier"
                  placeholder="e.g. VRL Logistics, Safechem Cargo, BlueDart"
                  value={trackingCarrier}
                  onChange={(e) => setTrackingCarrier(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="ordTrack">Tracking / LR / Docket Number</label>
                <input
                  id="ordTrack"
                  placeholder="e.g. LR-98765432"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="primary-button full-button"
                disabled={updating}
              >
                {updating ? "Saving..." : "Update Order"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function InquiryReviewModal({ inquiry, csrfToken, onClose, onUpdated }) {
  const [status, setStatus] = useState(inquiry.status);
  const [adminNotes, setAdminNotes] = useState(inquiry.admin_notes || "");
  const [updating, setUpdating] = useState(false);
  const [err, setErr] = useState("");

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setErr("");
    try {
      await updateAdminInquiryStatus(
        inquiry.id,
        { status, adminNotes: adminNotes.trim() || null },
        csrfToken
      );
      onUpdated();
    } catch (error) {
      setErr(error.message || "Failed to update inquiry");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="admin-form-modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <h2>Inquiry #{inquiry.id}: {inquiry.company_name}</h2>
          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {err && <div className="admin-alert-banner error">{err}</div>}

        <div className="inquiry-detail-summary">
          <p><strong>Contact:</strong> {inquiry.contact_name} ({inquiry.email})</p>
          <p><strong>Phone:</strong> {inquiry.phone || "—"}</p>
          <p><strong>Product Interest:</strong> {inquiry.product_interest || "—"}</p>
          <p><strong>Requested Qty:</strong> {inquiry.requested_quantity || "—"}</p>
          <p><strong>Buyer Message:</strong><br />{inquiry.message || "No message provided."}</p>
        </div>

        <form onSubmit={handleUpdate} className="admin-modal-form">
          <div className="form-group">
            <label htmlFor="inqStat">Commercial Status</label>
            <select
              id="inqStat"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="new">new</option>
              <option value="in_progress">in_progress</option>
              <option value="quoted">quoted</option>
              <option value="closed">closed</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="inqNotes">Internal Admin Notes</label>
            <textarea
              id="inqNotes"
              rows={3}
              placeholder="Record quotes sent, price offers, or call logs..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>

          <div className="form-actions-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={updating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={updating}
            >
              {updating ? "Saving..." : "Save Status & Notes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
