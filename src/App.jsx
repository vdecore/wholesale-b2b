import { useState, useEffect, useCallback } from "react";
import "./App.css";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import ProductCard from "./components/ProductCard.jsx";
import ProductDetailModal from "./components/ProductDetailModal.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import InquiryModal from "./components/InquiryModal.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import {
  AboutPage,
  ContactPage,
  FAQPage,
  ShippingPage,
  ReturnsPage,
  PrivacyPage,
  TermsPage,
} from "./components/StaticPages.jsx";
import { fetchProducts, fetchCategories, fetchProductBySlug } from "./api.js";

function getRouteFromPath(path) {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/" || clean === "") return "home";
  if (clean.startsWith("/admin")) return "admin";
  if (clean === "/about") return "about";
  if (clean === "/contact") return "contact";
  if (clean === "/faq") return "faq";
  if (clean === "/shipping") return "shipping";
  if (clean === "/returns") return "returns";
  if (clean === "/privacy") return "privacy";
  if (clean === "/terms") return "terms";
  if (clean.startsWith("/products/")) {
    return { type: "product", slug: clean.replace("/products/", "") };
  }
  return "home";
}

function getPathForRoute(route) {
  if (route === "home") return "/";
  if (typeof route === "object" && route.type === "product") return `/products/${route.slug}`;
  return `/${route}`;
}

export default function App() {
  // Navigation / Routing State
  const [currentRoute, setCurrentRoute] = useState(() =>
    getRouteFromPath(window.location.pathname)
  );

  // Catalogue data from Cloudflare D1
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState("");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [sortOrder, setSortOrder] = useState("newest");

  // Wholesale Cart (persisted in localStorage)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("wb2b_cart");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Active product modal
  const [activeProduct, setActiveProduct] = useState(null);

  // Direct quotation modal
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [inquiryProduct, setInquiryProduct] = useState(null);
  const [inquiryQty, setInquiryQty] = useState(null);

  // Save cart changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("wb2b_cart", JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  }, [cart]);

  // Handle URL history state & back/forward navigation
  const navigateTo = useCallback((route) => {
    setCurrentRoute(route);
    const path = getPathForRoute(route);
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getRouteFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Check direct product slug on deep link
  useEffect(() => {
    if (typeof currentRoute === "object" && currentRoute.type === "product" && currentRoute.slug) {
      fetchProductBySlug(currentRoute.slug)
        .then((res) => {
          if (res.success && res.product) {
            setActiveProduct(res.product);
          }
        })
        .catch(() => {
          // If slug not found, route back to home
          navigateTo("home");
        });
    }
  }, [currentRoute, navigateTo]);

  // Fetch Categories from D1 API
  useEffect(() => {
    fetchCategories()
      .then((res) => {
        if (res.success && res.categories) {
          setCategories(res.categories);
        }
      })
      .catch((err) => {
        console.error("Failed to load categories:", err);
      });
  }, []);

  // Fetch Products from D1 API
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setErrorProducts("");
    try {
      const params = {
        q: search.trim() || undefined,
        category: selectedCategory !== "All Products" ? selectedCategory : undefined,
        sort: sortOrder,
        limit: 48,
      };
      const res = await fetchProducts(params);
      if (res.success && res.products) {
        setProducts(res.products);
      } else {
        setErrorProducts(res.error || "Failed to load products from database.");
      }
    } catch (err) {
      setErrorProducts(
        err.message || "Unable to connect to the wholesale catalogue server."
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [search, selectedCategory, sortOrder]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Cart operations
  const cartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product, quantity) => {
    const qtyToAdd = quantity || product.moq || 1;
    setCart((prev) => {
      const existing = prev[product.id];
      const newQty = existing ? existing.quantity + qtyToAdd : qtyToAdd;
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: Math.min(newQty, product.stock || newQty),
        },
      };
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId, rawVal) => {
    const val = Number.parseInt(rawVal, 10);
    setCart((prev) => {
      if (!prev[productId]) return prev;
      const prod = prev[productId].product;
      if (Number.isNaN(val) || val <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          quantity: Math.min(val, prod.stock || val),
        },
      };
    });
  };

  const removeItem = (productId) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const openQuoteForProduct = (product, qty) => {
    setInquiryProduct(product);
    setInquiryQty(qty || product.moq);
    setIsInquiryOpen(true);
  };

  // If in /admin route, display the Admin Dashboard
  if (currentRoute === "admin") {
    return <AdminDashboard onNavigateToStore={() => navigateTo("home")} />;
  }

  return (
    <>
      <Header
        search={search}
        setSearch={setSearch}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigate={navigateTo}
        currentRoute={typeof currentRoute === "string" ? currentRoute : "home"}
      />

      {/* STATIC INFORMATION PAGES */}
      {currentRoute === "about" && <AboutPage onNavigate={navigateTo} />}
      {currentRoute === "contact" && <ContactPage />}
      {currentRoute === "faq" && <FAQPage />}
      {currentRoute === "shipping" && <ShippingPage />}
      {currentRoute === "returns" && <ReturnsPage />}
      {currentRoute === "privacy" && <PrivacyPage />}
      {currentRoute === "terms" && <TermsPage />}

      {/* MAIN HOMEPAGE / CATALOGUE VIEW */}
      {(currentRoute === "home" || typeof currentRoute === "object") && (
        <main id="home">
          {/* Hero Section */}
          <section className="hero">
            <div className="hero-content">
              <span className="eyebrow">VERIFIED WHOLESALE SUPPLY</span>
              <h1>
                Direct Factory Sourcing.
                <br />
                <span>Transparent Margins.</span>
              </h1>
              <p>
                Source commercial grade products with verified wholesale pricing, accessible Minimum Order Quantities (MOQ), and nationwide GST delivery.
              </p>
              <div className="hero-cta-buttons">
                <a className="primary-button" href="#products">
                  Browse Catalogue <span>↓</span>
                </a>
                <button
                  type="button"
                  className="hero-quote-btn"
                  onClick={() => {
                    setInquiryProduct(null);
                    setInquiryQty(null);
                    setIsInquiryOpen(true);
                  }}
                >
                  Request Bulk Quotation →
                </button>
              </div>

              <div className="hero-benefits">
                <span>✓ GST Tax Invoices</span>
                <span>✓ Pan-India Surface Freight</span>
                <span>✓ Strict B2B Quality Control</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <div className="hero-package">📦</div>
              <div className="floating-card floating-top">
                <span>↗</span>
                <div>
                  <strong>Volume Discounts</strong>
                  <small>Transparent price tiers</small>
                </div>
              </div>
              <div className="floating-card floating-bottom">
                <span>✓</span>
                <div>
                  <strong>Payment on Invoice</strong>
                  <small>Official proforma billing</small>
                </div>
              </div>
            </div>
          </section>

          {/* Trust Value Strip */}
          <section className="trust-strip">
            <div>
              <strong>01</strong>
              <span>Verified D1 Live Inventory</span>
            </div>
            <div>
              <strong>02</strong>
              <span>Transparent INR Pricing</span>
            </div>
            <div>
              <strong>03</strong>
              <span>GST Proforma Invoicing</span>
            </div>
            <div>
              <strong>04</strong>
              <span>Pan-India Door Transport</span>
            </div>
          </section>

          {/* Category Navigation Bar */}
          <nav className="category-nav" aria-label="Product categories">
            <button
              type="button"
              className={selectedCategory === "All Products" ? "nav-item active" : "nav-item"}
              onClick={() => setSelectedCategory("All Products")}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id || cat.slug}
                type="button"
                className={selectedCategory === cat.name ? "nav-item active" : "nav-item"}
                onClick={() => setSelectedCategory(cat.name)}
              >
                {cat.name}
              </button>
            ))}
          </nav>

          {/* Product Catalogue Section */}
          <section className="products-section" id="products">
            <div className="section-heading">
              <div>
                <span className="eyebrow">B2B CATALOGUE</span>
                <h2>Explore Wholesale Products</h2>
                <p>Real-time pricing and stock availability directly from our warehouse.</p>
              </div>

              <div className="catalogue-controls">
                <select
                  aria-label="Sort products"
                  className="catalogue-sort-select"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A to Z</option>
                </select>

                <span className="result-count">
                  {products.length} {products.length === 1 ? "product" : "products"}
                </span>
              </div>
            </div>

            {/* Error State */}
            {errorProducts && (
              <div className="catalogue-error-state" role="alert">
                <p>⚠️ {errorProducts}</p>
                <button type="button" className="secondary-btn" onClick={loadProducts}>
                  Retry Connection
                </button>
              </div>
            )}

            {/* Loading State */}
            {loadingProducts && !errorProducts && (
              <div className="catalogue-loading-state">
                <div className="admin-spinner" />
                <p>Loading real-time catalogue from database...</p>
              </div>
            )}

            {/* Empty State */}
            {!loadingProducts && !errorProducts && products.length === 0 && (
              <div className="empty-state">
                <p>No products match your current search or category filter.</p>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("All Products");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Products Grid */}
            {!loadingProducts && !errorProducts && products.length > 0 && (
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelectProduct={(p) => setActiveProduct(p)}
                    onAddToCart={(p) => addToCart(p, p.moq)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* CTA Banner Section */}
          <section className="cta-section">
            <div>
              <span className="eyebrow">CUSTOM PRODUCTION & SOURCING</span>
              <h2>Looking for bulk custom manufacturing?</h2>
              <p>
                Our production network handles custom specifications, private labeling, and scheduled recurring supply.
              </p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setInquiryProduct(null);
                setInquiryQty(null);
                setIsInquiryOpen(true);
              }}
            >
              Get Custom Quotation →
            </button>
          </section>
        </main>
      )}

      {/* Global Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Slide-over Cart & Checkout Drawer */}
      <CartDrawer
        cart={cart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
      />

      {/* Product Detail Modal */}
      {activeProduct && (
        <ProductDetailModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
          onAddToCart={addToCart}
          onRequestQuote={openQuoteForProduct}
        />
      )}

      {/* Direct Quotation Inquiry Modal */}
      <InquiryModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        initialProduct={inquiryProduct}
        initialQty={inquiryQty}
      />
    </>
  );
}
