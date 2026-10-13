import { useState, useCallback, useRef, useEffect } from "react";

/**
 * ProductImageCarousel — lightweight, accessible image carousel for product cards.
 *
 * Props:
 *   images      – Array<{ url, altText? }>  (from product.images, populated by product_images table)
 *   primaryUrl  – string | null             (fallback from product.imageUrl / image_url column)
 *   productName – string                    (used for alt text)
 *   onClick     – function                  (called when user clicks image area, NOT controls)
 *   children    – ReactNode                 (overlaid elements like badges)
 */
export default function ProductImageCarousel({
  images = [],
  primaryUrl = null,
  productName = "Product",
  onClick,
  children,
}) {
  // Build a unified list: always start with primaryUrl if present, then additional images,
  // de-duplicating by URL. This is backward-compatible: if only image_url exists (no rows in
  // product_images), the carousel shows one image with no navigation.
  const allImages = buildImageList(primaryUrl, images);
  const total = allImages.length;

  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Reset carousel when product changes
  useEffect(() => {
    setIndex(0);
  }, [primaryUrl, images]);

  const go = useCallback(
    (next, e) => {
      if (e) {
        e.stopPropagation(); // Don't fire card-level click
        e.preventDefault();
      }
      if (total <= 1 || isTransitioning) return;
      setIsTransitioning(true);
      setIndex(((next % total) + total) % total);
      setTimeout(() => setIsTransitioning(false), 220);
    },
    [total, isTransitioning]
  );

  const prev = useCallback((e) => go(index - 1, e), [go, index]);
  const next = useCallback((e) => go(index + 1, e), [go, index]);

  // Touch/swipe support
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only swipe horizontally if horizontal movement dominates
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next(null);
      else prev(null);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const current = allImages[index];

  if (total === 0) {
    // No image at all → placeholder
    return (
      <div
        className="product-art carousel-root"
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
        aria-label={`View details for ${productName}`}
      >
        <div className="carousel-placeholder">
          <span className="carousel-placeholder-icon" aria-hidden="true">📦</span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className="product-art carousel-root"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-label={`${productName} product images`}
    >
      {/* Main image — clickable to open detail */}
      <div
        className={`carousel-slide${isTransitioning ? " carousel-fade" : ""}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${productName}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
      >
        <img
          key={current.url}
          src={current.url}
          alt={current.altText || productName}
          className="carousel-img"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement.classList.add("carousel-img-error");
          }}
        />
      </div>

      {/* Prev/Next arrows — only when multiple images */}
      {total > 1 && (
        <>
          <button
            type="button"
            className="carousel-btn carousel-btn-prev"
            onClick={prev}
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            type="button"
            className="carousel-btn carousel-btn-next"
            onClick={next}
            aria-label="Next image"
          >
            ›
          </button>

          {/* Dot indicators */}
          <div className="carousel-dots" role="tablist" aria-label="Image position">
            {allImages.map((img, i) => (
              <button
                key={img.url + i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Image ${i + 1} of ${total}`}
                className={`carousel-dot${i === index ? " active" : ""}`}
                onClick={(e) => go(i, e)}
              />
            ))}
          </div>
        </>
      )}

      {/* Overlaid badges (SKU, stock) */}
      {children}
    </div>
  );
}

/**
 * Builds the ordered image list from the primary URL + images array.
 * De-duplicates by URL. If primary URL is in the images array already, don't double-add.
 */
function buildImageList(primaryUrl, images) {
  const list = [];
  const seen = new Set();

  if (primaryUrl) {
    list.push({ url: primaryUrl, altText: null });
    seen.add(primaryUrl);
  }

  for (const img of images) {
    if (img?.url && !seen.has(img.url)) {
      list.push({ url: img.url, altText: img.altText || null });
      seen.add(img.url);
    }
  }

  return list;
}
