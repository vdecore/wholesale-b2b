import ProductImageCarousel from "./ProductImageCarousel.jsx";

export default function ProductCard({
  product,
  onSelectProduct,
  onAddToCart,
}) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 10;

  const stockBadge = isOutOfStock ? (
    <span className="stock-badge out-of-stock">Out of Stock</span>
  ) : isLowStock ? (
    <span className="stock-badge low-stock">Only {product.stock} left</span>
  ) : (
    <span className="stock-badge in-stock">{product.stock} in stock</span>
  );

  return (
    <article className="product-card">
      {/* Image carousel — renders inside .product-art which has position:relative.
          Badges are passed as children so they overlay the carousel at z-index > carousel. */}
      <ProductImageCarousel
        images={product.images || []}
        primaryUrl={product.imageUrl || null}
        productName={product.name}
        onClick={() => onSelectProduct(product)}
      >
        <span className="sku-badge">{product.sku}</span>
        {stockBadge}
      </ProductImageCarousel>

      <div className="product-info">
        <div className="product-card-top-meta">
          <span className="product-category">{product.category || "General"}</span>
        </div>

        <h3
          onClick={() => onSelectProduct(product)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSelectProduct(product);
          }}
        >
          {product.name}
        </h3>

        {product.description && (
          <p className="product-card-excerpt">
            {product.description.length > 90
              ? `${product.description.slice(0, 90)}...`
              : product.description}
          </p>
        )}

        <div className="price-row">
          <div>
            <small>Wholesale Price</small>
            <strong>₹{Number(product.price).toLocaleString("en-IN")}</strong>
            <span className="unit-label"> / {product.unit || "unit"}</span>
          </div>
          <div className="moq">
            <small>Minimum Order</small>
            <strong>
              {product.moq} {product.unit || "unit"}{product.moq > 1 ? "s" : ""}
            </strong>
          </div>
        </div>

        <div className="card-actions">
          <button
            type="button"
            className="details-button"
            onClick={() => onSelectProduct(product)}
          >
            Details
          </button>
          <button
            type="button"
            className="enquiry-button"
            disabled={isOutOfStock}
            onClick={() => onAddToCart(product)}
          >
            {isOutOfStock ? "Unavailable" : "+ Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
