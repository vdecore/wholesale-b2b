import { useState } from "react";
import { submitOrder, submitInquiry } from "../api.js";

export default function CartDrawer({
  cart,
  isOpen,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) {
  const [view, setView] = useState("cart"); // 'cart' | 'order' | 'quote' | 'confirmed'
  const [orderResult, setOrderResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Customer order form state
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Inquiry message state
  const [quoteMessage, setQuoteMessage] = useState("");

  if (!isOpen) return null;

  const items = Object.values(cart);

  // Compute subtotal respecting tiers
  const subtotal = items.reduce((sum, { product, quantity }) => {
    let unitPrice = Number(product.price);
    if (product.pricingTiers && product.pricingTiers.length > 0) {
      const applicable = [...product.pricingTiers]
        .filter((t) => quantity >= t.minQuantity)
        .sort((a, b) => b.minQuantity - a.minQuantity);
      if (applicable[0]) unitPrice = applicable[0].unitPrice;
    }
    return sum + unitPrice * quantity;
  }, 0);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const payload = {
        companyName: companyName.trim() || null,
        contactName: contactName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        shippingAddress: shippingAddress.trim(),
        notes: orderNotes.trim() || null,
        items: items.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
      };

      const res = await submitOrder(payload);
      if (res.success) {
        setOrderResult(res.order);
        setView("confirmed");
        onClearCart();
      } else {
        setErrorMsg(res.error || "Failed to create order");
      }
    } catch (err) {
      setErrorMsg(err.message || "An error occurred while creating order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateQuote = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const productSummary = items
        .map(({ product, quantity }) => `${product.name} (${product.sku}): ${quantity} ${product.unit || "units"}`)
        .join("; ");

      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      const payload = {
        companyName: companyName.trim() || "Wholesale Buyer",
        contactName: contactName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        productInterest: productSummary,
        requestedQuantity: totalQuantity,
        message: quoteMessage.trim() || `Wholesale price request for ${items.length} items.`,
      };

      const res = await submitInquiry(payload);
      if (res.success) {
        setOrderResult({
          type: "quote",
          inquiryId: res.inquiryId,
          message: res.message,
        });
        setView("confirmed");
        onClearCart();
      } else {
        setErrorMsg(res.error || "Failed to submit quote inquiry");
      }
    } catch (err) {
      setErrorMsg(err.message || "An error occurred while submitting inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsApp = () => {
    if (items.length === 0) return;
    const msgLines = [
      "Hello Vdecore Wholesale Desk,",
      "I would like a quotation for the following bulk items:",
      "",
      ...items.map(
        ({ product, quantity }) =>
          `• ${product.name} (SKU: ${product.sku}) — ${quantity} ${product.unit || "unit"}s`
      ),
      "",
      `Estimated Value: ₹${subtotal.toLocaleString("en-IN")}`,
      "Please confirm wholesale pricing and freight options.",
    ];

    window.open(
      `https://wa.me/?text=${encodeURIComponent(msgLines.join("\n"))}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="cart-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">WHOLESALE PROCUREMENT</span>
            <h2 id="cart-drawer-title">
              {view === "cart" && "Wholesale Cart"}
              {view === "order" && "Order & Delivery Details"}
              {view === "quote" && "Request Formal Quotation"}
              {view === "confirmed" && "Order Received"}
            </h2>
          </div>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        {errorMsg && (
          <div className="cart-error-banner" role="alert">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* 1. CART VIEW */}
        {view === "cart" && (
          <>
            {items.length === 0 ? (
              <div className="empty-cart-state">
                <span className="empty-cart-icon">🛒</span>
                <p>Your wholesale cart is currently empty.</p>
                <small>Browse our catalogue and add items above their Minimum Order Quantity.</small>
                <button
                  type="button"
                  className="primary-button"
                  style={{ marginTop: "18px" }}
                  onClick={onClose}
                >
                  Browse Catalogue
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {items.map(({ product, quantity }) => {
                    const isBelowMoq = quantity < product.moq;
                    const isOverStock = quantity > product.stock;

                    return (
                      <div className="cart-item" key={product.id}>
                        <div className="cart-item-details">
                          <strong>{product.name}</strong>
                          <span className="cart-item-sku">SKU: {product.sku}</span>
                          <span className="cart-item-price-unit">
                            ₹{Number(product.price).toLocaleString("en-IN")} / {product.unit || "unit"}
                          </span>
                          <small className="cart-item-moq">
                            MOQ: {product.moq} {product.unit || "unit"}{product.moq > 1 ? "s" : ""}
                          </small>

                          {isBelowMoq && (
                            <span className="cart-warning-badge">Below MOQ ({product.moq})</span>
                          )}
                          {isOverStock && (
                            <span className="cart-warning-badge">Exceeds Stock ({product.stock})</span>
                          )}

                          <button
                            type="button"
                            className="remove-button"
                            onClick={() => onRemoveItem(product.id)}
                          >
                            Remove
                          </button>
                        </div>

                        <label className="quantity-field">
                          <span>Quantity</span>
                          <input
                            type="number"
                            min={product.moq}
                            max={product.stock}
                            step={1}
                            value={quantity}
                            onChange={(e) => onUpdateQuantity(product.id, e.target.value)}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="cart-total">
                  <span>Estimated Goods Value</span>
                  <strong>₹{subtotal.toLocaleString("en-IN")}</strong>
                  <small>
                    * B2B wholesale pricing. Official proforma invoice with GST, transport freight, and payment instructions will be generated upon review.
                  </small>
                </div>

                <div className="cart-checkout-actions">
                  <button
                    type="button"
                    className="primary-button full-button"
                    onClick={() => setView("order")}
                    disabled={items.some(
                      (i) => i.quantity < i.product.moq || i.quantity > i.product.stock
                    )}
                  >
                    Create Wholesale Order →
                  </button>
                  <button
                    type="button"
                    className="quote-outline-btn full-button"
                    onClick={() => setView("quote")}
                  >
                    Request Custom Quotation
                  </button>
                  <button
                    type="button"
                    className="whatsapp-btn full-button"
                    onClick={sendWhatsApp}
                  >
                    💬 Quick Quote via WhatsApp
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* 2. ORDER DETAILS VIEW */}
        {view === "order" && (
          <form className="order-details-form" onSubmit={handleCreateOrder}>
            <p className="order-form-intro">
              Complete your company and delivery information. No instant payment required; our accounts team issues a GST proforma invoice.
            </p>

            <div className="form-group">
              <label htmlFor="companyName">Company / Business Name</label>
              <input
                id="companyName"
                placeholder="e.g. Metro Retailers Pvt Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="contactName">Contact Person *</label>
              <input
                id="contactName"
                required
                placeholder="e.g. Ramesh Kumar"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="orderEmail">Business Email *</label>
                <input
                  id="orderEmail"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="orderPhone">Phone / WhatsApp</label>
                <input
                  id="orderPhone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="shippingAddress">Delivery / Warehouse Address *</label>
              <textarea
                id="shippingAddress"
                required
                rows={3}
                placeholder="Full delivery address with city, state, and PIN code..."
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="orderNotes">Order / Logistics Notes (Optional)</label>
              <textarea
                id="orderNotes"
                rows={2}
                placeholder="Special packaging, preferred freight transport, or GSTIN..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
            </div>

            <div className="order-summary-box">
              <span>Total Products: {items.length} items</span>
              <strong>Estimated Subtotal: ₹{subtotal.toLocaleString("en-IN")}</strong>
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setView("cart")}
                disabled={submitting}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Confirm & Submit Order"}
              </button>
            </div>
          </form>
        )}

        {/* 3. QUOTATION VIEW */}
        {view === "quote" && (
          <form className="order-details-form" onSubmit={handleCreateQuote}>
            <p className="order-form-intro">
              Need custom packaging, high volume pricing, or non-standard specifications? Submit a quotation inquiry.
            </p>

            <div className="form-group">
              <label htmlFor="qCompanyName">Company / Business Name *</label>
              <input
                id="qCompanyName"
                required
                placeholder="e.g. Apex Enterprises"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="qContactName">Contact Person *</label>
              <input
                id="qContactName"
                required
                placeholder="e.g. Sarah Jenkins"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="qEmail">Business Email *</label>
                <input
                  id="qEmail"
                  type="email"
                  required
                  placeholder="contact@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="qPhone">Phone Number</label>
                <input
                  id="qPhone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="quoteMessage">Quotation Details & Requirements</label>
              <textarea
                id="quoteMessage"
                rows={3}
                placeholder="Mention specific requirements, customizations, or delivery timelines..."
                value={quoteMessage}
                onChange={(e) => setQuoteMessage(e.target.value)}
              />
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setView("cart")}
                disabled={submitting}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Quotation Request"}
              </button>
            </div>
          </form>
        )}

        {/* 4. CONFIRMATION VIEW */}
        {view === "confirmed" && orderResult && (
          <div className="order-confirmation-box">
            <div className="confirmation-badge-wrap">
              <span className="confirmed-check">✓</span>
            </div>

            <h3>
              {orderResult.type === "quote"
                ? "Quotation Inquiry Received!"
                : "Wholesale Order Placed Successfully!"}
            </h3>

            {orderResult.orderNumber && (
              <div className="order-number-display">
                <small>Order Reference Number:</small>
                <strong>{orderResult.orderNumber}</strong>
              </div>
            )}

            <div className="order-next-steps">
              <h4>What happens next?</h4>
              <ul>
                <li>
                  <strong>Order Review:</strong> Our desk verifies inventory and checks shipping logistics to your pincode.
                </li>
                <li>
                  <strong>Proforma Invoice:</strong> We will email you an official proforma invoice with GST details and Bank NEFT/RTGS payment instructions.
                </li>
                <li>
                  <strong>Dispatch:</strong> Upon invoice confirmation, goods are packed and dispatched via our logistics partners.
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="primary-button full-button"
              style={{ marginTop: "24px" }}
              onClick={() => {
                setView("cart");
                onClose();
              }}
            >
              Back to Catalogue
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
