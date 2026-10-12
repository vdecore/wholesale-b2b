import { useState } from "react";

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onRequestQuote,
}) {
  const [selectedQty, setSelectedQty] = useState(product?.moq || 1);
  const [activeImage, setActiveImage] = useState(product?.imageUrl || "");

  if (!product) return null;

  const isOutOfStock = product.stock <= 0;
  const maxAllowed = product.stock || 0;

  // Calculate unit price based on tiers if applicable
  let unitPrice = Number(product.price);
  if (product.pricingTiers && product.pricingTiers.length > 0) {
    const applicableTiers = [...product.pricingTiers]
      .filter((t) => selectedQty >= t.minQuantity)
      .sort((a, b) => b.minQuantity - a.minQuantity);
    if (applicableTiers[0]) {
      unitPrice = applicableTiers[0].unitPrice;
    }
  }

  const estimatedTotal = unitPrice * selectedQty;

  const handleQtyChange = (val) => {
    const parsed = Number.parseInt(val, 10);
    if (Number.isNaN(parsed)) {
      setSelectedQty(product.moq);
      return;
    }
    const clamped = Math.max(product.moq, Math.min(parsed, maxAllowed || product.moq));
    setSelectedQty(clamped);
  };

  const allImages = [
    ...(product.imageUrl ? [{ url: product.imageUrl, altText: product.name }] : []),
    ...(product.images || []),
  ];

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="product-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
      >
        <button
          type="button"
          className="close-button detail-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>

        <div className="product-detail-layout">
          {/* Left Column: Visuals */}
          <div className="product-detail-media">
            <div className="detail-main-image-wrap">
              {activeImage || product.imageUrl ? (
                <img
                  src={activeImage || product.imageUrl}
                  alt={product.name}
                  className="detail-main-image"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="detail-image-placeholder">
                  <span className="placeholder-icon">📦</span>
                  <span>No image preview available</span>
                </div>
              )}
              <span className="detail-sku-badge">{product.sku}</span>
            </div>

            {allImages.length > 1 && (
              <div className="detail-gallery-thumbnails">
                {allImages.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    className={`gallery-thumb-btn ${
                      activeImage === img.url ? "active" : ""
                    }`}
                    onClick={() => setActiveImage(img.url)}
                  >
                    <img src={img.url} alt={img.altText || `View ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details & Order Controls */}
          <div className="product-detail-content">
            <div className="detail-category-row">
              <span className="detail-category">{product.category || "General"}</span>
              <span
                className={`stock-pill ${
                  isOutOfStock
                    ? "stock-out"
                    : product.stock <= 10
                    ? "stock-low"
                    : "stock-good"
                }`}
              >
                {isOutOfStock
                  ? "Out of Stock"
                  : `${product.stock} ${product.unit || "unit"}s available`}
              </span>
            </div>

            <h2 id="product-detail-title" className="detail-title">
              {product.name}
            </h2>

            <div className="detail-pricing-box">
              <div className="detail-price-main">
                <span className="price-label">Wholesale Price</span>
                <div className="price-figure">
                  <strong>₹{unitPrice.toLocaleString("en-IN")}</strong>
                  <span className="price-unit"> / {product.unit || "unit"}</span>
                </div>
              </div>
              <div className="detail-moq-info">
                <span className="moq-label">Minimum Order Qty (MOQ)</span>
                <strong>
                  {product.moq} {product.unit || "unit"}{product.moq > 1 ? "s" : ""}
                </strong>
              </div>
            </div>

            {/* Tiered pricing if any */}
            {product.pricingTiers && product.pricingTiers.length > 0 && (
              <div className="detail-tiers-section">
                <h4>Volume Pricing Discounts</h4>
                <div className="tiers-table">
                  <div className="tiers-row tiers-header">
                    <span>Order Quantity</span>
                    <span>Price per Unit</span>
                    <span>Discount</span>
                  </div>
                  <div
                    className={`tiers-row ${
                      selectedQty < product.pricingTiers[0].minQuantity ? "tier-active" : ""
                    }`}
                  >
                    <span>
                      {product.moq} – {product.pricingTiers[0].minQuantity - 1} units
                    </span>
                    <span>₹{Number(product.price).toLocaleString("en-IN")}</span>
                    <span>Base wholesale</span>
                  </div>
                  {product.pricingTiers.map((tier, idx) => (
                    <div
                      key={tier.id || idx}
                      className={`tiers-row ${
                        selectedQty >= tier.minQuantity ? "tier-active" : ""
                      }`}
                    >
                      <span>{tier.minQuantity}+ units</span>
                      <span>₹{tier.unitPrice.toLocaleString("en-IN")}</span>
                      <span className="tier-savings-badge">
                        Save ₹
                        {(Number(product.price) - tier.unitPrice).toLocaleString("en-IN")}/unit
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="detail-description-section">
              <h4>Description & Specifications</h4>
              <p className="detail-description-text">
                {product.description || "No description provided for this product."}
              </p>

              {product.specifications &&
                typeof product.specifications === "object" &&
                Object.keys(product.specifications).length > 0 && (
                  <table className="specs-table">
                    <tbody>
                      {Object.entries(product.specifications).map(([key, val]) => (
                        <tr key={key}>
                          <th>{key}</th>
                          <td>{String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>

            {/* Quantity Selector & Action Controls */}
            <div className="detail-actions-box">
              <div className="detail-qty-control">
                <label htmlFor="detail-qty-input">Select Quantity:</label>
                <div className="qty-stepper">
                  <button
                    type="button"
                    onClick={() => handleQtyChange(selectedQty - 1)}
                    disabled={selectedQty <= product.moq || isOutOfStock}
                  >
                    –
                  </button>
                  <input
                    id="detail-qty-input"
                    type="number"
                    min={product.moq}
                    max={maxAllowed}
                    value={selectedQty}
                    onChange={(e) => handleQtyChange(e.target.value)}
                    disabled={isOutOfStock}
                  />
                  <button
                    type="button"
                    onClick={() => handleQtyChange(selectedQty + 1)}
                    disabled={selectedQty >= maxAllowed || isOutOfStock}
                  >
                    +
                  </button>
                </div>
                <small className="qty-helper">
                  MOQ: {product.moq} | Max in stock: {maxAllowed}
                </small>
              </div>

              <div className="detail-subtotal-callout">
                <span>Estimated Value:</span>
                <strong>₹{estimatedTotal.toLocaleString("en-IN")}</strong>
              </div>

              <div className="detail-cta-row">
                <button
                  type="button"
                  className="primary-button full-button add-cart-btn"
                  disabled={isOutOfStock}
                  onClick={() => {
                    onAddToCart(product, selectedQty);
                    onClose();
                  }}
                >
                  {isOutOfStock ? "Out of Stock" : `Add ${selectedQty} Units to Cart`}
                </button>
                <button
                  type="button"
                  className="quote-outline-btn full-button"
                  onClick={() => {
                    onRequestQuote(product, selectedQty);
                    onClose();
                  }}
                >
                  Request Custom Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
