import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function canShop(product) {
  return !!(product?.url && !product.comingSoon);
}

function ProductSheet({ product, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const shop = canShop(product);

  return createPortal(
    <div className="sheet-back" role="presentation" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="sheet-photo">
          {product.img ? (
            <img src={product.img} alt="" />
          ) : (
            <span className="ph">{product.name?.charAt(0) || "R"}</span>
          )}
        </div>
        {product.step && <div className="sheet-step">{product.step}</div>}
        <h3>{product.name}</h3>
        {product.kind && <p className="sheet-kind">{product.kind}</p>}
        {product.why && (
          <p className="sheet-why">
            <span>Why it's here</span>
            {product.why}
          </p>
        )}
        {product.use && (
          <p className="sheet-use">
            <span>How to use</span>
            {product.use}
          </p>
        )}
        {product.desc && <p className="sheet-desc">{product.desc}</p>}
        {product.hero && (
          <p className="sheet-use">
            <span>What's in it</span>
            {product.hero}
          </p>
        )}
        {shop ? (
          <a className="btn-brass sheet-shop" href={product.url} target="_blank" rel="noreferrer">
            Shop this
          </a>
        ) : product.comingSoon ? (
          <p className="sheet-soon">Coming soon — not on the shop yet.</p>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

function LaneCard({ product, onOpen }) {
  const shop = canShop(product);
  return (
    <article className="lane-card">
      <button type="button" className="lane-open" onClick={() => onOpen(product)}>
        <div className="lane-photo">
          {product.img ? (
            <img src={product.img} alt="" />
          ) : (
            <span className="ph">{product.name?.replace(/^FRESH |^CAPS |^BEYOND |^PACK /i, "").charAt(0) || "R"}</span>
          )}
        </div>
        {product.step && <div className="lane-step">{product.step}</div>}
        <div className="lane-name">{product.name}</div>
        {product.kind && <div className="lane-kind">{product.kind}</div>}
      </button>
      <div className={`lane-actions${shop || product.comingSoon ? "" : " lane-actions-one"}`}>
        <button type="button" className="lane-learn" onClick={() => onOpen(product)}>
          Learn
        </button>
        {shop ? (
          <a className="lane-shop" href={product.url} target="_blank" rel="noreferrer">
            Shop
          </a>
        ) : product.comingSoon ? (
          <span className="lane-soon">Soon</span>
        ) : null}
      </div>
    </article>
  );
}

export function ShopLane({ label, items, more, moreLabel = "See the full body care line" }) {
  const [open, setOpen] = useState(null);
  const [showMore, setShowMore] = useState(false);
  if (!items?.length) return null;

  return (
    <section className="shop-lane" aria-label={label}>
      <div className="section-label">
        <span>{label}</span>
      </div>
      <div className="lane-scroll">
        {items.map((product) => (
          <LaneCard key={product.id} product={product} onOpen={setOpen} />
        ))}
      </div>
      {more?.length > 0 && (
        <>
          <button
            type="button"
            className="lane-more"
            aria-expanded={showMore}
            onClick={() => setShowMore((openMore) => !openMore)}
          >
            {showMore ? "Hide the full line" : moreLabel}
          </button>
          {showMore && (
            <div className="lane-scroll lane-more-row">
              {more.map((product) => (
                <LaneCard key={product.id} product={product} onOpen={setOpen} />
              ))}
            </div>
          )}
        </>
      )}
      {open && <ProductSheet product={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
