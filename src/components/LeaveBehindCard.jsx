import { useMemo, useState } from "react";

/** Compact AM/PM leave-behind — collapsed by default, tap to expand for screenshot. */
export function LeaveBehindCard({ name, face, body, supp, path, summary }) {
  const [open, setOpen] = useState(false);

  const am = useMemo(() => uniqueById(face?.am || []).slice(0, 5), [face]);
  const pm = useMemo(() => uniqueById(face?.pm || []).slice(0, 5), [face]);
  const everyday = useMemo(() => (body || []).slice(0, 4), [body]);
  const inside = useMemo(() => {
    const list = [...(supp?.daily || []), ...(supp?.targeted || [])];
    return uniqueById(list).slice(0, 4);
  }, [supp]);

  const title = name?.trim() ? `${name.trim()}'s ritual` : "Your ritual card";
  const showFace = path === "skin" || path === "both";
  const showBody = (path === "skin" || path === "both") && everyday.length > 0;
  const showSupp = (path === "supp" || path === "both") && inside.length > 0;
  const stepHint = [
    showFace ? `${am.length + pm.length} face steps` : null,
    showBody ? "everyday" : null,
    showSupp ? "inside" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside className={`leave-card${open ? " open" : ""}`} aria-label="Screenshot ritual card">
      <div className="leave-card-inner">
        <button
          type="button"
          className="leave-card-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <div className="leave-card-top">
            <div className="leave-brand">The Fresh Grove</div>
            <h3 className="leave-title">{title}</h3>
            {summary && <p className="leave-summary">{summary}</p>}
            {!open && (
              <p className="leave-collapsed-hint">
                {stepHint ? `${stepHint} · ` : ""}Tap to expand
              </p>
            )}
          </div>
          <span className="leave-chevron" aria-hidden>
            ▾
          </span>
        </button>

        {open && (
          <div className="leave-card-body">
            {showFace && (
              <div className="leave-cols">
                <div className="leave-col">
                  <div className="leave-col-label">Morning</div>
                  <ol>
                    {am.map((p) => (
                      <li key={`am-${p.id}`}>
                        <span className="leave-step">{p.step?.split("·")[0]?.trim() || "Step"}</span>
                        <span className="leave-name">{shortName(p.name)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="leave-col">
                  <div className="leave-col-label">Evening</div>
                  <ol>
                    {pm.map((p) => (
                      <li key={`pm-${p.id}`}>
                        <span className="leave-step">{p.step?.split("·")[0]?.trim() || "Step"}</span>
                        <span className="leave-name">{shortName(p.name)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {showBody && (
              <div className="leave-block">
                <div className="leave-col-label">Everyday</div>
                <ul>
                  {everyday.map((p) => (
                    <li key={`b-${p.id}`}>{shortName(p.name)}</li>
                  ))}
                </ul>
              </div>
            )}

            {showSupp && (
              <div className="leave-block">
                <div className="leave-col-label">Inside</div>
                <ul>
                  {inside.map((p) => (
                    <li key={`s-${p.id}`}>{shortName(p.name)}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="leave-foot">Screenshot this · send it to your Fresh Partner</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function uniqueById(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    if (!p?.id || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

function shortName(name) {
  return (name || "").replace(/^FRESH |^CAPS |^BEYOND |^PACK /i, "").trim() || name;
}
