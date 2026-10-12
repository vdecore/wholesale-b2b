export default function Footer({ onNavigate }) {
  const currentYear = 2026;

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-col brand-col">
          <button
            type="button"
            className="brand footer-brand brand-btn"
            onClick={() => onNavigate("home")}
          >
            <span className="brand-mark">V</span>
            <span>
              VDECORE <span className="brand-accent">WHOLESALE</span>
            </span>
          </button>
          <p className="footer-desc">
            Direct B2B supply for retailers, corporate buyers, and institutional clients. Transparent wholesale pricing, low MOQ, and dedicated business support.
          </p>
          <div className="footer-badges">
            <span className="footer-badge">✓ GST Invoicing</span>
            <span className="footer-badge">✓ Pan-India Delivery</span>
            <span className="footer-badge">✓ Verified Quality</span>
          </div>
        </div>

        <div className="footer-col">
          <h4>Sourcing</h4>
          <ul>
            <li>
              <button type="button" onClick={() => onNavigate("home")}>
                Product Catalogue
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate("about")}>
                About Vdecore
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate("contact")}>
                Request Custom Quote
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate("faq")}>
                Wholesale FAQ
              </button>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Policies & Terms</h4>
          <ul>
            <li>
              <button type="button" onClick={() => onNavigate("shipping")}>
                Shipping & Freight
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate("returns")}>
                Returns & Damage Policy
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate("terms")}>
                Terms & Conditions
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate("privacy")}>
                Privacy Policy
              </button>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Business Desk</h4>
          <p className="footer-contact-line">
            <strong>Inquiries:</strong> wholesale@vdecore.com
          </p>
          <p className="footer-contact-line">
            <strong>Support:</strong> Mon - Sat, 9:30 AM - 6:30 PM IST
          </p>
          <p className="footer-contact-line">
            <strong>Admin:</strong>{" "}
            <button
              type="button"
              className="admin-footer-btn"
              onClick={() => onNavigate("admin")}
            >
              Sign in to Portal →
            </button>
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {currentYear} Vdecore B2B Wholesale. All rights reserved.</span>
        <span className="footer-bottom-notice">
          Prices exclude GST and freight, which are invoiced upon final order confirmation.
        </span>
      </div>
    </footer>
  );
}
