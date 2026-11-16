import { useEffect, useState } from "react";

const WAIT_MS = 12000;

/** After a short pause on results, offer that partner's Fresh Shelf. */
export function ShelfPrompt({ active, href, name }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!active || !href) return undefined;
    const key = "fm-shelf-prompt:" + href;
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
    } catch {
      seen = false;
    }
    if (seen) return undefined;
    const timer = window.setTimeout(() => setOpen(true), WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [active, href]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        try {
          sessionStorage.setItem("fm-shelf-prompt:" + href, "1");
        } catch {
          /* private mode */
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, href]);

  if (!open || !href) return null;

  const who = String(name || "").trim();
  const title = "Want to keep looking?";
  const body = who
    ? `Fresh Shelf is the app. Your match can live there. You can learn the products, save what you'd love, message ${who}, and hear about sales.`
    : "Fresh Shelf is the app. Your match can live there. You can learn the products, save what you'd love, and hear about sales.";
  const action = "Open Fresh Shelf";

  const dismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem("fm-shelf-prompt:" + href, "1");
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="shelf-prompt" role="dialog" aria-modal="true" aria-labelledby="shelf-prompt-title">
      <button type="button" className="shelf-prompt-backdrop" aria-label="Dismiss" onClick={dismiss} />
      <div className="shelf-prompt-card">
        <img className="shelf-prompt-icon" src="./fresh-shelf.png" alt="" />
        <h3 id="shelf-prompt-title">{title}</h3>
        <p>{body}</p>
        <div className="shelf-prompt-actions">
          <a className="shelf-prompt-go" href={href} target="_blank" rel="noreferrer" onClick={dismiss}>
            {action}
          </a>
          <button type="button" className="shelf-prompt-later" onClick={dismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
