import vdecoreLogo from "../assets/vdecore.png";

export default function Header({
  search,
  setSearch,
  cartCount,
  onOpenCart,
  onNavigate,
  currentRoute,
}) {
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
          onClick={() => onNavigate("home")}
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
          <div className="brand-fallback-text">
            <strong>VDECORE</strong>
            <small>WHOLESALE B2B</small>
          </div>
        </button>

        <div className="header-search">
          <span aria-hidden="true">⌕</span>
          <input
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
            onClick={() => onNavigate("home")}
          >
            Catalogue
          </button>
          <button
            type="button"
            className={`header-nav-btn ${currentRoute === "about" ? "active" : ""}`}
            onClick={() => onNavigate("about")}
          >
            About
          </button>
          <button
            type="button"
            className={`header-nav-btn ${currentRoute === "contact" ? "active" : ""}`}
            onClick={() => onNavigate("contact")}
          >
            Contact
          </button>
          <button
            type="button"
            className={`header-nav-btn admin-link-btn ${currentRoute === "admin" ? "active" : ""}`}
            onClick={() => onNavigate("admin")}
          >
            Admin
          </button>
        </nav>

        <button
          type="button"
          className="cart-button"
          onClick={onOpenCart}
          aria-label={`Wholesale Cart (${cartCount} items)`}
        >
          <span className="cart-btn-label">Wholesale Cart</span>
          <span className="cart-count">{cartCount}</span>
        </button>
      </header>
    </>
  );
}
