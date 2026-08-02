import { useEffect, useMemo, useState } from "react";
import { FACE_Q, BODY_Q, SUPP_Q, INTENT_Q } from "./data/questions";
import {
  buildFace,
  buildBody,
  buildSupp,
  buildHero,
  buildPlaybook,
  summarizeAnswers,
  buildInsight,
  countUniqueProducts,
} from "./engine/match";
import { ProductList } from "./components/ProductRow";
import { LeaveBehindCard } from "./components/LeaveBehindCard";
import { LegitSection } from "./components/LegitSection";
import {
  formatTextBrief,
  formatLinksBrief,
  buildRestoreUrl,
  readMatchFromLocation,
  openInstagramToTaylor,
  openWhatsAppToTaylor,
} from "./lib/share";
import "./index.css";

const FLODESK_FORM_ID = "6a4d7c6b23b85452ae98771e";
const QUIZ_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : "https://tayrourke.github.io/the-fresh-match/";

const PATHS = [
  {
    v: "skin",
    t: "Skincare & personal care",
    s: "Face, body, hair — matched to your skin",
    meta: "~12 questions",
  },
  {
    v: "supp",
    t: "Supplements",
    s: "Overall foundation or targeted — matched to what you want more of",
    meta: "~5 questions",
  },
  {
    v: "both",
    t: "Inside & out",
    s: "The full match — skin, swaps, and supplements",
    meta: "~16 questions",
  },
];

function wantsHairQuestion(answers) {
  const swaps = answers.swaps;
  if (!swaps || !Array.isArray(swaps)) return true;
  if (swaps.includes("auto") || swaps.length === 0) return true;
  return swaps.includes("shampoo") || swaps.includes("conditioner");
}

function buildQs(path, answers = {}) {
  if (!path) return [];
  const bodyQs = BODY_Q.filter((q) => q.id !== "hairType" || wantsHairQuestion(answers));
  if (path === "skin") return [...FACE_Q, ...bodyQs, INTENT_Q];
  if (path === "supp") return [...SUPP_Q, INTENT_Q];
  if (path === "both") return [...FACE_Q, ...bodyQs, ...SUPP_Q, INTENT_Q];
  return [];
}

function SectionLabel({ children }) {
  return (
    <div className="section-label">
      <span>{children}</span>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("intro");
  const [path, setPath] = useState(null);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState({});
  const [draft, setDraft] = useState([]);
  const [picked, setPicked] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState(false);
  const [shared, setShared] = useState(false);
  const [sentHint, setSentHint] = useState("");
  const [guestName, setGuestName] = useState("");
  const [restoredBanner, setRestoredBanner] = useState(false);

  const qs = useMemo(() => buildQs(path, ans), [path, ans]);

  const q = qs[i];
  const pct = qs.length ? Math.round(((i + 1) / qs.length) * 100) : 0;

  // Restore a shared match from #m=...
  useEffect(() => {
    const saved = readMatchFromLocation();
    if (!saved) return;
    setPath(saved.path);
    setAns(saved.ans || {});
    setGuestName(saved.name || "");
    setScreen("results");
    setRestoredBanner(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Keep the URL hash in sync so "copy link" / refresh works
  useEffect(() => {
    if (screen !== "results" || !path) return;
    const url = buildRestoreUrl(QUIZ_URL, { path, ans, name: guestName });
    const hash = url.includes("#") ? url.slice(url.indexOf("#")) : "";
    if (hash && window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [screen, path, ans, guestName]);

  useEffect(() => {
    if (!formOpen || typeof window.fd !== "function") return;
    window.fd("form", {
      formId: FLODESK_FORM_ID,
      containerEl: "#fd-form-modal",
    });
  }, [formOpen]);

  useEffect(() => {
    if (!formOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setFormOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  const advance = (nextAns) => {
    const nextQs = buildQs(path, nextAns);
    const ni = i + 1;
    if (ni < nextQs.length) {
      const nq = nextQs[ni];
      setI(ni);
      if (nq?.single) {
        setPicked(nextAns[nq.id] ?? null);
        setDraft([]);
      } else {
        setDraft(Array.isArray(nextAns[nq.id]) ? nextAns[nq.id] : []);
        setPicked(null);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setScreen("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const start = (p) => {
    setPath(p);
    setScreen("quiz");
    setI(0);
    setAns({});
    setDraft([]);
    setPicked(null);
    setCopied(false);
    setCopiedLinks(false);
    setShared(false);
    setSentHint("");
    setRestoredBanner(false);
    setGuestName("");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const confirmSingle = () => {
    if (!picked) return;
    const nextAns = { ...ans, [q.id]: picked };
    setAns(nextAns);
    advance(nextAns);
  };

  const toggle = (v) => {
    setDraft((d) => {
      if (v === "auto") return d.includes("auto") ? [] : ["auto"];
      const withoutAuto = d.filter((x) => x !== "auto");
      if (withoutAuto.includes(v)) return withoutAuto.filter((x) => x !== v);
      const max = q?.max;
      if (typeof max === "number" && withoutAuto.length >= max) return withoutAuto;
      return [...withoutAuto, v];
    });
  };

  const submitMulti = () => {
    const nextAns = { ...ans, [q.id]: draft };
    setAns(nextAns);
    advance(nextAns);
  };

  const back = () => {
    if (i === 0) {
      setScreen("intro");
      setPath(null);
      setPicked(null);
      return;
    }
    const prev = qs[i - 1];
    setI(i - 1);
    if (prev?.single) {
      setPicked(ans[prev.id] ?? null);
      setDraft([]);
    } else {
      setDraft(Array.isArray(ans[prev.id]) ? ans[prev.id] : []);
      setPicked(null);
    }
  };

  const restart = () => {
    setScreen("intro");
    setPath(null);
    setI(0);
    setAns({});
    setDraft([]);
    setPicked(null);
    setFormOpen(false);
    setCopied(false);
    setCopiedLinks(false);
    setShared(false);
    setSentHint("");
    setRestoredBanner(false);
    setGuestName("");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const face = useMemo(
    () => (screen === "results" && (path === "skin" || path === "both") ? buildFace(ans) : null),
    [screen, path, ans]
  );
  const body = useMemo(
    () => (screen === "results" && (path === "skin" || path === "both") ? buildBody(ans) : null),
    [screen, path, ans]
  );
  const supp = useMemo(
    () => (screen === "results" && (path === "supp" || path === "both") ? buildSupp(ans) : null),
    [screen, path, ans]
  );
  const hero = useMemo(
    () => (screen === "results" ? buildHero(ans, path, face, body, supp) : null),
    [screen, ans, path, face, body, supp]
  );
  const playbook = useMemo(
    () => (screen === "results" ? buildPlaybook(ans, path, hero, face, body, supp) : null),
    [screen, ans, path, hero, face, body, supp]
  );

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const summary = summarizeAnswers(ans, path);
  const insight = useMemo(
    () => (screen === "results" ? buildInsight(ans, path, hero?.items) : ""),
    [screen, ans, path, hero]
  );
  const productCount = useMemo(() => {
    if (screen !== "results") return 0;
    const n = countUniqueProducts(face, body, supp);
    return typeof n === "number" ? n : 0;
  }, [screen, face, body, supp]);

  const restoreUrl = useMemo(
    () => (path ? buildRestoreUrl(QUIZ_URL, { path, ans, name: guestName }) : QUIZ_URL),
    [path, ans, guestName]
  );

  const briefPayload = () => ({
    summary,
    hero,
    playbook,
    restoreUrl,
    name: guestName,
  });

  const copyText = async () => {
    const text = formatTextBrief(briefPayload());
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy your match summary:", text);
    }
  };

  const copyWithLinks = async () => {
    const text = formatLinksBrief(briefPayload());
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinks(true);
      setTimeout(() => setCopiedLinks(false), 2200);
    } catch {
      window.prompt("Copy match with links:", text);
    }
  };

  const copyRestoreLink = async () => {
    try {
      await navigator.clipboard.writeText(restoreUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy match link:", restoreUrl);
    }
  };

  const shareMatch = async () => {
    const text = formatTextBrief(briefPayload());
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: guestName?.trim()
            ? `${guestName.trim()}'s Fresh Match`
            : "My Fresh Match — Ringana with Taylor",
          text,
          url: restoreUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2200);
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    await copyText();
  };

  const flashSent = (msg) => {
    setSentHint(msg);
    setTimeout(() => setSentHint(""), 3200);
  };

  const instagramTaylor = async () => {
    await openInstagramToTaylor(formatTextBrief(briefPayload()));
    flashSent("Copied — paste into the IG DM");
  };

  const whatsAppTaylor = async () => {
    await openWhatsAppToTaylor(formatTextBrief(briefPayload()));
    flashSent("Opening WhatsApp — hit Send");
  };

  const goalsNeedPick = q?.id === "goals" && ans.approach === "targeted";
  const multiBlocked = goalsNeedPick && draft.length === 0;

  return (
    <div className="app">
      <div className="brand-top">
        <a href="https://tayrourke.github.io/tay-goes-fresh/" target="_blank" rel="noreferrer">
          Ringana <span>with Taylor</span>
        </a>
      </div>

      <div className="shell">
        {screen === "intro" && (
          <div className="intro">
            <div className="intro-hero">
              <div className="intro-copy">
                <div className="intro-bubble-wrap">
                  <img
                    className="intro-bubble"
                    src="./products/lifestyle/taylor-hero.png"
                    alt="Taylor"
                    decoding="async"
                  />
                </div>
                <div className="eyebrow">A two-minute match</div>
                <h1>
                  The Fresh <em>Match</em>
                </h1>
                <p className="intro-lead">
                  After hours diving into these formulas and ingredients, I built this to help you
                  choose the Ringana that actually fits — without the overwhelm.
                </p>

                <div className="path-label">What are you here for?</div>
                <div className="path-grid">
                  {PATHS.map((o) => (
                    <button key={o.v} type="button" className="path-btn" onClick={() => start(o.v)}>
                      <span className="path-btn-main">
                        <span className="t">{o.t}</span>
                        <span className="s">{o.s}</span>
                        <span className="m">{o.meta}</span>
                      </span>
                      <span className="path-arrow" aria-hidden>
                        →
                      </span>
                    </button>
                  ))}
                </div>
                <p className="intro-note">
                  An educational tool from an independent Ringana Fresh Partner — not an official
                  Ringana site, and not medical advice.
                </p>
                <p className="copyright">© 2026 Swaps Made Simple LLC</p>
              </div>
            </div>

            <LegitSection />
          </div>
        )}

        {screen === "quiz" && q && (
          <div className="quiz">
            <div className="progress-wrap">
              <div className="progress-top">
                <span className="progress-label">{q.eyebrow || q.section}</span>
                <span className="progress-count">
                  {i + 1} of {qs.length}
                </span>
              </div>
              <div className="progress-bar" aria-hidden>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="question-card" key={q.id}>
              <h2 className="question-text">{q.q}</h2>
              {q.note && <p className="question-sub">{q.note}</p>}
              {typeof q.max === "number" && (
                <p className="question-max">
                  {draft.length}/{q.max} selected
                </p>
              )}

              <div className="options">
                {q.options.map((o, idx) => {
                  const sel = q.single ? picked === o.v : draft.includes(o.v);
                  const atMax =
                    !q.single && typeof q.max === "number" && draft.length >= q.max && !sel;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      className={`option${sel ? " selected" : ""}${o.v === "auto" ? " dashed" : ""}${atMax ? " dimmed" : ""}`}
                      style={{ animationDelay: `${idx * 0.04}s` }}
                      onClick={() => (q.single ? setPicked(o.v) : toggle(o.v))}
                      disabled={atMax}
                    >
                      <span className="option-dot" aria-hidden />
                      <span className="option-text">
                        {o.label}
                        <em>{o.sub}</em>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="nav-row">
              <button type="button" className="btn-back" onClick={back}>
                ← Back
              </button>
              {q.single ? (
                <button
                  type="button"
                  className={`btn-next${picked ? " ready" : ""}`}
                  onClick={confirmSingle}
                  disabled={!picked}
                >
                  {i + 1 === qs.length ? "See my match" : "Continue"}
                </button>
              ) : (
                <button
                  type="button"
                  className={`btn-next${multiBlocked ? "" : " ready"}`}
                  onClick={submitMulti}
                  disabled={multiBlocked}
                >
                  {i + 1 === qs.length
                    ? "See my match"
                    : draft.length
                      ? "Continue"
                      : goalsNeedPick
                        ? "Pick at least one"
                        : "Skip — continue"}
                </button>
              )}
            </div>
            {q.single && <p className="quiz-hint">Select an answer, then continue</p>}
          </div>
        )}

        {screen === "results" && (
          <div className="results">
            {restoredBanner && (
              <div className="restore-banner">
                Restored a shared match — scroll to the bottom when you&apos;re ready to name it or
                send it.
              </div>
            )}

            <div className="result-hero result-hero-slim">
              <div className="eyebrow">{today}</div>
              <h2>{guestName.trim() ? `${guestName.trim()}'s Fresh Match` : "Your Fresh Match"}</h2>
              {summary && <p className="results-summary">{summary}</p>}
            </div>

            <LeaveBehindCard
              name={guestName}
              face={face}
              body={body}
              supp={supp}
              path={path}
              summary={summary}
            />

            {hero?.items?.length > 0 && (
              <>
                <SectionLabel>{hero.title}</SectionLabel>
                <p className="section-blurb">{hero.subtitle}</p>
                <ProductList items={hero.items} openFirst />
              </>
            )}

            {insight && (
              <div className="insight-card">
                <div className="insight-label">Why this match</div>
                <p>{insight}</p>
              </div>
            )}

            {playbook && (
              <div className="playbook-card">
                <div className="insight-label">Your first-order playbook</div>
                <div className="playbook-grid">
                  <div>
                    <h4>Buy first</h4>
                    <ul>
                      {playbook.buyFirst.map((p) => (
                        <li key={p.id}>{p.name}</li>
                      ))}
                    </ul>
                  </div>
                  {playbook.addNext.length > 0 && (
                    <div>
                      <h4>Add next</h4>
                      <ul>
                        {playbook.addNext.map((p) => (
                          <li key={p.id}>{p.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="playbook-week">
                  <h4>Week 1</h4>
                  <ul>
                    {playbook.week1.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <p className="playbook-note">
                  Screenshot your ritual card or send the brief from the bottom — I&apos;ll tell you
                  what I&apos;d actually start with.
                </p>
              </div>
            )}

            <div className="full-match-head">
              <SectionLabel>Full match</SectionLabel>
              <p className="section-blurb">
                Everything that fit your answers — tap to expand. Start here above is still your
                first order.
              </p>
            </div>

            {face && (
              <>
                <SectionLabel>Morning</SectionLabel>
                <ProductList items={face.am} />
                <SectionLabel>Evening</SectionLabel>
                <ProductList items={face.pm} />
                {face.weekly.length > 0 && (
                  <>
                    <SectionLabel>Weekly</SectionLabel>
                    <ProductList items={face.weekly} />
                  </>
                )}
              </>
            )}

            {body && body.length > 0 && (
              <>
                <SectionLabel>Your everyday swaps</SectionLabel>
                <ProductList items={body} />
              </>
            )}

            {supp && (
              <>
                {supp.daily.length > 0 && (
                  <>
                    <SectionLabel>
                      {supp.approach === "targeted" ? "Suggested foundation" : "Overall foundation"}
                    </SectionLabel>
                    <ProductList items={supp.daily} />
                  </>
                )}
                {supp.targeted.length > 0 && (
                  <>
                    <SectionLabel>
                      {supp.approach === "overall" ? "Focused add-ons" : "Targeted for your goals"}
                    </SectionLabel>
                    <ProductList items={supp.targeted} />
                  </>
                )}
              </>
            )}

            <div className="edu-block">
              <div className="k">Remember why this line hits different</div>
              {[
                [
                  "Made fresh — not warehoused forever",
                  "Roughly twice-weekly production, real expiration dates, plant actives that still mean something when they arrive.",
                ],
                [
                  "Airless glass, campus-made",
                  "Their formulas, their campus, airless packaging — so you get potency without the preservative load.",
                ],
                [
                  "Talk it through with me",
                  "Your shortlist is a starting point. Screenshot your ritual card or send the brief — I'll tell you what I'd actually begin with.",
                ],
              ].map(([t, d]) => (
                <div className="edu-item" key={t}>
                  <h4>{t}</h4>
                  <p>{d}</p>
                </div>
              ))}
            </div>

            <div className="cta-block share-footer">
              <div className="cta-eyebrow">Save &amp; send</div>
              <h3>Send this to Taylor</h3>
              <p>
                Name it for a screenshot, then IG or WhatsApp the brief (@toxinfreetay) — or copy
                the match link so I can open the exact same results.
              </p>

              <label className="name-field name-field-on-pine">
                <span>Name for this match (optional)</span>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Sarah"
                  autoComplete="given-name"
                />
              </label>

              <div className="result-stats">
                <div className="stat">
                  <strong>{hero?.items?.length || 0}</strong>
                  <span>start here</span>
                </div>
                <div className="stat">
                  <strong>{productCount}</strong>
                  <span>full match</span>
                </div>
              </div>

              <div className="cta-actions">
                <button type="button" className="btn-brass" onClick={instagramTaylor}>
                  Message on IG
                </button>
                <button type="button" className="btn-ghost btn-ghost-on-pine" onClick={whatsAppTaylor}>
                  WhatsApp
                </button>
                <button type="button" className="btn-ghost btn-ghost-on-pine" onClick={shareMatch}>
                  {shared ? "Shared!" : "Share"}
                </button>
              </div>
              <div className="cta-actions cta-actions-secondary">
                <button type="button" className="btn-ghost btn-ghost-on-pine" onClick={copyText}>
                  {copied ? "Copied!" : "Copy for text"}
                </button>
                <button type="button" className="btn-ghost btn-ghost-on-pine" onClick={copyRestoreLink}>
                  Copy match link
                </button>
                <button type="button" className="btn-ghost btn-ghost-on-pine" onClick={copyWithLinks}>
                  {copiedLinks ? "Copied!" : "Copy with shop links"}
                </button>
              </div>
              {sentHint && <p className="sent-hint">{sentHint}</p>}

              <div className="cta-actions cta-actions-footer">
                <button type="button" className="btn-ghost btn-ghost-on-pine" onClick={restart}>
                  Retake the quiz
                </button>
              </div>
              <p className="cta-soft">
                Optional:{" "}
                <button type="button" className="linkish" onClick={() => setFormOpen(true)}>
                  join for US launch updates
                </button>
                .
              </p>
            </div>

            <div className="legal">
              <p>
                <strong>The important stuff:</strong> This quiz is an educational tool created by
                Taylor, an independent Ringana Fresh Partner (pending U.S. launch). It is a personal
                project, not an official Ringana website or assessment, and product information is
                drawn from Ringana&apos;s published product pages on ringana.com. Matches are general
                suggestions based on your answers — not personalized medical, dermatological, or
                nutritional advice. Statements regarding supplements have not been evaluated by the
                Food and Drug Administration; these products are not intended to diagnose, treat,
                cure, or prevent any disease. If you are pregnant, nursing, taking medication, or
                managing a health condition, talk with your healthcare provider before starting any
                new supplement. Patch-test new skincare if you have sensitive or reactive skin.
                Product details reflect Ringana&apos;s current international lineup — the final U.S.
                offering will be confirmed at launch, and some products sold in Europe will not be
                available in the United States.
              </p>
              <p className="copyright">© 2026 Swaps Made Simple LLC</p>
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fd-overlay" role="dialog" aria-modal="true" aria-label="Join founding list">
          <button type="button" className="fd-backdrop" aria-label="Close" onClick={() => setFormOpen(false)} />
          <div className="fd-modal">
            <button type="button" className="fd-close" onClick={() => setFormOpen(false)}>
              ×
            </button>
            <h3>US launch updates</h3>
            <p className="fd-lead">Optional — only if you want launch notes from Taylor.</p>
            <div id="fd-form-modal" />
            <p className="fd-fallback">
              Form not loading?{" "}
              <a href="https://tayrourke.github.io/tay-goes-fresh/" target="_blank" rel="noreferrer">
                Visit tay-goes-fresh
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
