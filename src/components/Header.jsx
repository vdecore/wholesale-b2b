import { useState, useEffect } from "react";
import vdecoreLogo from "../assets/vdecore.png";

export default function Header({
  search,
  setSearch,
  cartCount,
  onOpenCart,
  onNavigate,
  currentRoute,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key and prevent background scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.classList.add("nav-open");
    } else {
      document.body.classList.remove("nav-open");
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("nav-open");
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (route) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div className="announcement">
        Wholesale Supply Made Simple
        <span> | Bulk Orders Welcome & Verified B2B Invoicing</span>
      </div>

      <header className="site-header">
        <button
          type="button"
          className="brand brand-btn"
          onClick={() => handleNavClick("home")}
          aria-label="Vdecore Wholesale Home"
        >
          <img
            src={vdecoreLogo}
            alt="Vdecore Logo"
            className="brand-logo"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </button>

        <div className="header-search">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            aria-label="Search products"
            placeholder="Search products by name, SKU or category..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              if (currentRoute !== "home") {
                onNavigate("home");
              }
            }}
          />
          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <nav className="header-nav-links" aria-label="Main navigation">
          <button
            type="button"
            className={`header-nav-btn ${currentRoute === "home" ? "active" : ""}`}
            onClick={() => handleNavClick("home")}
          >
            Catalogue
          </button>
          <button
            type="button"
            className={`header-nav-btn ${currentRoute === "about" ? "active" : ""}`}
            onClick={() => handleNavClick("about")}
          >
            About
          </button>
          <button
            type="button"
            className={`header-nav-btn ${currentRoute === "contact" ? "active" : ""}`}
            onClick={() => handleNavClick("contact")}
          >
            Contact
          </button>
          <button
            type="button"
            className={`header-nav-btn admin-link-btn ${currentRoute === "admin" ? "active" : ""}`}
            onClick={() => handleNavClick("admin")}
          >
            Admin
          </button>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="cart-button"
            onClick={onOpenCart}
            aria-label={`Wholesale Cart (${cartCount} items)`}
          >
            <span className="cart-btn-icon" aria-hidden="true">🛒</span>
            <span className="cart-btn-label">Wholesale Cart</span>
            <span className="cart-count">{cartCount}</span>
          </button>

          <button
            type="button"
            className={`mobile-menu-toggle ${mobileMenuOpen ? "active" : ""}`}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <span className="hamburger-box">
              <span className="hamburger-inner" />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          role="presentation"
        >
          <div
            className="mobile-nav-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            <div className="mobile-nav-top">
              <span className="mobile-nav-brand">Menu</span>
              <button
                type="button"
                className="mobile-nav-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                ×
              </button>
            </div>

            <nav className="mobile-nav-menu" aria-label="Mobile menu links">
              <button
                type="button"
                className={`mobile-nav-item ${currentRoute === "home" ? "active" : ""}`}
                onClick={() => handleNavClick("home")}
              >
                <span className="mobile-nav-icon">📦</span>
                <span>Catalogue</span>
              </button>
              <button
                type="button"
                className={`mobile-nav-item ${currentRoute === "about" ? "active" : ""}`}
                onClick={() => handleNavClick("about")}
              >
                <span className="mobile-nav-icon">🏢</span>
                <span>About Vdecore</span>
              </button>
              <button
                type="button"
                className={`mobile-nav-item ${currentRoute === "contact" ? "active" : ""}`}
                onClick={() => handleNavClick("contact")}
              >
                <span className="mobile-nav-icon">💬</span>
                <span>Contact & Quote</span>
              </button>
              <button
                type="button"
                className={`mobile-nav-item admin-link ${currentRoute === "admin" ? "active" : ""}`}
                onClick={() => handleNavClick("admin")}
              >
                <span className="mobile-nav-icon">🔒</span>
                <span>Admin Portal</span>
              </button>
            </nav>

            <div className="mobile-nav-bottom">
              <button
                type="button"
                className="mobile-nav-cart-action"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCart();
                }}
              >
                <span>🛒 View Wholesale Cart</span>
                <span className="cart-count-badge">{cartCount}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
