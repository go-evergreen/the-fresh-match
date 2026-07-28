import { useState } from "react";

export default function ProductRow({ product, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const initial = product.name?.replace(/^FRESH |^CAPS |^BEYOND |^PACK /i, "").charAt(0)?.toUpperCase() || "R";

  return (
    <article className={`product-row${open ? " open" : ""}`}>
      <button
        type="button"
        className="product-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="product-thumb" aria-hidden>
          {product.img ? (
            <img src={product.img} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="ph">{initial}</span>
          )}
        </div>
        <div className="product-meta">
          {product.step && <div className="step">{product.step}</div>}
          <div className="name">{product.name}</div>
          <div className="kind">{product.kind}</div>
        </div>
        <span className="chevron" aria-hidden>▾</span>
      </button>

      <div className="product-panel" {...(!open ? { inert: true } : {})} aria-hidden={!open}>
        <div className="product-panel-inner">
          <div className="product-body">
            {product.hero && (
              <div className="hero-box">
                <div className="k">Key actives</div>
                <div className="v">{product.hero}</div>
              </div>
            )}
            {product.desc && <p className="product-desc">{product.desc}</p>}
            {product.use && (
              <div className="use-box">
                <div className="k">How to use it</div>
                <div className="v">{product.use}</div>
              </div>
            )}
            {product.why && (
              <p className="why-line">
                <strong>Why it&apos;s in your match:</strong> {product.why}
              </p>
            )}
            {product.url && (
              <a
                className="product-link"
                href={product.url}
                target="_blank"
                rel="noreferrer"
                tabIndex={open ? 0 : -1}
              >
                View on ringana.com →
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductList({ items, openFirst = false }) {
  if (!items?.length) return null;
  return (
    <div className="product-list">
      {items.map((p, i) => (
        <ProductRow key={`${p.id}-${p.step || i}`} product={p} defaultOpen={openFirst && i === 0} />
      ))}
    </div>
  );
}
