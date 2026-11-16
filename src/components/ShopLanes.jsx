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
        ) : (
          <p className="sheet-soon">Coming soon — not on the shop yet.</p>
        )}
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
      <div className="lane-actions">
        <button type="button" className="lane-learn" onClick={() => onOpen(product)}>
          Learn
        </button>
        {shop ? (
          <a className="lane-shop" href={product.url} target="_blank" rel="noreferrer">
            Shop
          </a>
        ) : (
          <span className="lane-soon">Soon</span>
        )}
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

function routineNote(face) {
  const ids = new Set(
    [...(face.am || []), ...(face.pm || []), ...(face.weekly || [])].map((product) => product.id)
  );
  const parts = [
    "Start slow. You know your skin best. You might skip cleansing in the morning, or not use a serum every day.",
  ];
  if (ids.has("creamLight")) parts.push("Cream light is the everyday one.");
  else if (ids.has("creamMedium")) parts.push("Cream medium is the everyday one.");
  else if (ids.has("creamRich")) parts.push("Cream rich is the everyday one.");
  if (ids.has("overnightRetinal")) {
    parts.push(
      "Overnight retinal cream is evenings only. Start every second or third night, and wear sun protection the next day."
    );
  }
  return parts.join(" ");
}

function routineNames(list) {
  const seen = new Set();
  const out = [];
  (list || []).forEach((product) => {
    if (!product?.id || seen.has(product.id)) return;
    seen.add(product.id);
    out.push(product);
  });
  return out;
}

export function RoutineFold({ face }) {
  if (!face) return null;
  const groups = [
    ["Morning", routineNames(face.am)],
    ["Evening", routineNames(face.pm)],
    ["Weekly", routineNames(face.weekly)],
  ].filter(([, items]) => items.length);

  if (!groups.length) return null;

  return (
    <details className="routine-fold">
      <summary>
        <span>Your full routine</span>
        <em>Morning, evening, weekly</em>
      </summary>
      <div className="routine-fold-body">
        <p className="routine-note">{routineNote(face)}</p>
        {groups.map(([title, items]) => (
          <div key={title}>
            <h4>{title}</h4>
            <ol>
              {items.map((product) => (
                <li key={`${title}-${product.id}`}>
                  {product.step && <span>{product.step}</span>}
                  {product.name}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </details>
  );
}
