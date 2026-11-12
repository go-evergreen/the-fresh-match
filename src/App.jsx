import { useEffect, useMemo, useRef, useState } from "react";
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
import { ShelfPrompt } from "./components/ShelfPrompt";
import {
  formatTextBrief,
  formatLinksBrief,
  buildRestoreUrl,
  readMatchFromLocation,
} from "./lib/share";
import { readPartnerFirst, readPartnerShop, readShelfInvite, withPartnerLinks } from "./lib/shopLinks";
import { readQuizPartnerSlug, sendQuizLead } from "./lib/quizLead";
import "./index.css";

const QUIZ_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : "https://go-evergreen.github.io/the-fresh-match/";

const PATHS = [
  {
    v: "skin",
    t: "Face, body, and hair",
    s: "How you wash, and the products you use every day",
  },
  {
    v: "supp",
    t: "Supplements",
    s: "A daily base, or something more specific",
  },
  {
    v: "both",
    t: "The whole routine",
    s: "Skin, everyday products, and supplements",
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

function fitBrandMark(el) {
  if (!el) return;
  const available = el.clientWidth;
  if (available < 48) return;
  let lo = 16;
  let hi = 76;
  for (let n = 0; n < 16; n += 1) {
    const mid = (lo + hi) / 2;
    el.style.fontSize = `${mid}px`;
    if (el.scrollWidth <= available + 1) lo = mid;
    else hi = mid;
  }
  el.style.fontSize = `${lo}px`;
}

export default function App() {
  const [screen, setScreen] = useState("intro");
  const [path, setPath] = useState(null);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState({});
  const [draft, setDraft] = useState([]);
  const [picked, setPicked] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState(false);
  const [shared, setShared] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [reachName, setReachName] = useState("");
  const [reachSocial, setReachSocial] = useState("");
  const [reachEmail, setReachEmail] = useState("");
  const [reachError, setReachError] = useState("");
  const [reachBusy, setReachBusy] = useState(false);
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
      window.history.replaceState(null, "", window.location.pathname + window.location.search + hash);
    }
  }, [screen, path, ans, guestName]);

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
      setScreen("reach");
      setReachError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const reachEmailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

  const submitReach = async () => {
    if (reachBusy) return;
    const name = reachName.trim().replace(/\s+/g, " ");
    const social = reachSocial.trim().replace(/^@+/, "").trim();
    const email = reachEmail.trim();
    if (name.length < 2) {
      setReachError("Add your name.");
      return;
    }
    if (!(social || reachEmailOk(email))) {
      setReachError(
        email
          ? "That email doesn’t look right."
          : "Add your social media handle or your email."
      );
      return;
    }
    const matchUrl = buildRestoreUrl(QUIZ_URL, {
      path,
      ans,
      name,
      search: typeof window !== "undefined" ? window.location.search : "",
    });
    setReachError("");
    setReachBusy(true);
    try {
      await sendQuizLead({
        slug: readQuizPartnerSlug(),
        name,
        email: reachEmailOk(email) ? email : "",
        social,
        matchUrl,
      });
    } catch {
      /* The match still opens. A missed save should not hide it. */
    }
    setGuestName(name);
    setReachBusy(false);
    setScreen("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backFromReach = () => {
    const last = Math.max(0, qs.length - 1);
    const prev = qs[last];
    setI(last);
    if (prev?.single) {
      setPicked(ans[prev.id] ?? null);
      setDraft([]);
    } else {
      setDraft(Array.isArray(ans[prev.id]) ? ans[prev.id] : []);
      setPicked(null);
    }
    setReachError("");
    setScreen("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setRestoredBanner(false);
    setGuestName("");
    setReachName("");
    setReachSocial("");
    setReachEmail("");
    setReachError("");
    setReachBusy(false);
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
    setCopied(false);
    setCopiedLinks(false);
    setShared(false);
    setRestoredBanner(false);
    setGuestName("");
    setReachName("");
    setReachSocial("");
    setReachEmail("");
    setReachError("");
    setReachBusy(false);
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

  const partnerShop = useMemo(() => readPartnerShop(), []);
  const shelfInvite = useMemo(() => readShelfInvite(), []);
  const partnerFirst = useMemo(() => readPartnerFirst(), []);
  const brandRef = useRef(null);

  useEffect(() => {
    const el = brandRef.current;
    if (!el) return undefined;
    const fit = () => fitBrandMark(el);
    fit();
    const fonts = document.fonts;
    if (fonts?.ready) fonts.ready.then(fit);
    const observer = new ResizeObserver(fit);
    if (el.parentElement) observer.observe(el.parentElement);
    return () => observer.disconnect();
  }, [partnerFirst]);
  const shopSearch = typeof window !== "undefined" ? window.location.search : "";
  const linkItems = (items) => withPartnerLinks(items, partnerShop);

  const restoreUrl = useMemo(
    () =>
      path
        ? buildRestoreUrl(QUIZ_URL, { path, ans, name: guestName, search: shopSearch })
        : `${QUIZ_URL.replace(/[?#].*$/, "")}${shopSearch}`,
    [path, ans, guestName, shopSearch]
  );

  const briefPayload = () => ({
    summary,
    hero: hero ? { ...hero, items: linkItems(hero.items) } : hero,
    playbook: playbook ? { ...playbook, addNext: linkItems(playbook.addNext) } : playbook,
    restoreUrl,
    name: guestName,
    code: partnerShop.code,
    shopHost: partnerShop.host,
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
            : "My Fresh Match — The Fresh Grove",
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

  const goalsNeedPick = q?.id === "goals" && ans.approach === "targeted";
  const multiBlocked = goalsNeedPick && draft.length === 0;

  return (
    <div className="app">
      <div className="brand-top">
        <img className="brand-stamp" src="./grove-stamp.png" alt="The Fresh Grove" />
        {partnerFirst ? (
          <span ref={brandRef} className="brand-mark">
            Ringana <span>with&nbsp;{partnerFirst}</span>
          </span>
        ) : null}
      </div>

      <div className="shell">
        {screen === "intro" && (
          <div className="intro">
            <div className="intro-hero">
              <div className="intro-copy">
                <div className="eyebrow">The Fresh Match</div>
                <h1>
                  Find your<br />
                  <span className="h1-line"><em>freshest</em> routine</span>
                </h1>
                <p className="intro-lead">
                  A few questions about where you are now, what you&apos;re looking to improve, and
                  what you want more of.
                </p>

                <div className="path-label">Where do you want to start?</div>
                <div className="path-grid">
                  {PATHS.map((o) => (
                    <button key={o.v} type="button" className="path-btn" onClick={() => start(o.v)}>
                      <span className="path-btn-main">
                        <span className="t">{o.t}</span>
                        <span className="s">{o.s}</span>
                      </span>
                      <span className="path-arrow" aria-hidden>
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <LegitSection />
            <footer className="intro-foot">
              <p className="exclusive-note">
                Someone shared this with you. Keep it between the two of you.
              </p>
              <p className="intro-disclaimer">
                The Fresh Grove is a team of independent Ringana partners. This is not an official
                Ringana site, and it is not medical advice. A match is a general suggestion from
                your answers. Statements about supplements have not been evaluated by the Food and
                Drug Administration. These products are not intended to diagnose, treat, cure, or
                prevent any disease.
              </p>
              <p className="copyright">© 2026 The Fresh Grove</p>
            </footer>
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
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  className={`btn-next${multiBlocked ? "" : " ready"}`}
                  onClick={submitMulti}
                  disabled={multiBlocked}
                >
                  {draft.length
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

        {screen === "reach" && (
          <div className="quiz">
            <div className="progress-wrap">
              <div className="progress-top">
                <span className="progress-label">Before your match</span>
                <span className="progress-count">
                  {qs.length + 1} of {qs.length + 1}
                </span>
              </div>
              <div className="progress-bar" aria-hidden>
                <div className="progress-fill" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="question-card">
              <h2 className="question-text">Add your name to this match</h2>
              <p className="question-sub">Your name, and a social handle or an email.</p>
              <div className="reach-fields">
                <label className="reach-field">
                  <span>Name</span>
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={reachName}
                    onChange={(event) => {
                      setReachName(event.target.value);
                      if (reachError) setReachError("");
                    }}
                  />
                </label>
                <label className="reach-field">
                  <span>Social media handle</span>
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    placeholder="@yourhandle"
                    value={reachSocial}
                    onChange={(event) => {
                      setReachSocial(event.target.value);
                      if (reachError) setReachError("");
                    }}
                  />
                </label>
                <label className="reach-field">
                  <span>Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                    value={reachEmail}
                    onChange={(event) => {
                      setReachEmail(event.target.value);
                      if (reachError) setReachError("");
                    }}
                  />
                </label>
              </div>
              {reachError ? (
                <p className="reach-error" role="alert">
                  {reachError}
                </p>
              ) : null}
            </div>

            <div className="nav-row">
              <button type="button" className="btn-back" onClick={backFromReach}>
                ← Back
              </button>
              <button type="button" className="btn-next ready" onClick={submitReach} disabled={reachBusy}>
                {reachBusy ? "Sending…" : "See my match"}
              </button>
            </div>
          </div>
        )}

        {screen === "results" && (
          <div className="results">
            {restoredBanner && (
              <div className="restore-banner">
                Restored a shared match. Scroll to the bottom when you want to name it or send it
                back.
              </div>
            )}

            <div className="result-hero result-hero-slim">
              <div className="eyebrow">{today}</div>
              <h2>{guestName.trim() ? `${guestName.trim()}'s Fresh Match` : "Your Fresh Match"}</h2>
              {summary && <p className="results-summary">{summary}</p>}
            </div>

            <LeaveBehindCard
              name={guestName}
              partner={partnerFirst}
              face={face}
              body={body}
              supp={supp}
              path={path}
              summary={summary}
            />

            <p className="recommend-note">
              A match from your answers, not a prescription. The person who sent this can help you
              choose what to order first.
            </p>

            {partnerShop.code ? (
              <aside className="code-block" aria-label="Your savings code">
                <p className="code-kicker">Your first order</p>
                <p>
                  Use <strong>{partnerShop.code}</strong> to save $25 on your first order of $60+.
                </p>
              </aside>
            ) : null}

            {hero?.items?.length > 0 && (
              <>
                <SectionLabel>{hero.title}</SectionLabel>
                <p className="section-blurb">{hero.subtitle}</p>
                <ProductList items={linkItems(hero.items)} openFirst />
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
                <div className="insight-label">How to start</div>
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
                  Send this to the person who shared it with you. They can help you decide what to
                  start with.
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
                <ProductList items={linkItems(face.am)} />
                <SectionLabel>Evening</SectionLabel>
                <ProductList items={linkItems(face.pm)} />
                {face.weekly.length > 0 && (
                  <>
                    <SectionLabel>Weekly</SectionLabel>
                    <ProductList items={linkItems(face.weekly)} />
                  </>
                )}
              </>
            )}

            {body && body.length > 0 && (
              <>
                <SectionLabel>Your everyday swaps</SectionLabel>
                <ProductList items={linkItems(body)} />
              </>
            )}

            {supp && (
              <>
                {supp.daily.length > 0 && (
                  <>
                    <SectionLabel>
                      {supp.approach === "targeted" ? "Suggested foundation" : "Overall foundation"}
                    </SectionLabel>
                    <ProductList items={linkItems(supp.daily)} />
                  </>
                )}
                {supp.targeted.length > 0 && (
                  <>
                    <SectionLabel>
                      {supp.approach === "overall" ? "Focused add-ons" : "Targeted for your goals"}
                    </SectionLabel>
                    <ProductList items={linkItems(supp.targeted)} />
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
                  "Talk it through with your partner",
                  "Your shortlist is a starting point. Send it to the person who shared this quiz. They can help you decide what to begin with.",
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
              <h3>Send this back</h3>
              <p>
                Name it if you want, then share the brief. The person who sent you the quiz can
                open the same results and help you decide what to order first.
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
                <button type="button" className="btn-brass" onClick={shareMatch}>
                  {shared ? "Shared!" : "Share with partner"}
                </button>
                <button type="button" className="btn-ghost btn-ghost-on-pine" onClick={copyText}>
                  {copied ? "Copied!" : "Copy for text"}
                </button>
                <button type="button" className="btn-ghost btn-ghost-on-pine" onClick={copyRestoreLink}>
                  Copy match link
                </button>
              </div>
              <div className="cta-actions cta-actions-secondary">
                <button type="button" className="btn-ghost btn-ghost-on-pine" onClick={copyWithLinks}>
                  {copiedLinks ? "Copied!" : "Copy with shop links"}
                </button>
              </div>

              <div className="cta-actions cta-actions-footer">
                <button type="button" className="btn-ghost btn-ghost-on-pine" onClick={restart}>
                  Retake the quiz
                </button>
              </div>
            </div>

            <div className="legal">
              <p>
                A match is a starting point from your answers, not a prescription. It is not
                medical, dermatological, or nutritional advice. The Fresh Grove is a team of
                independent Ringana partners, and this is not an official Ringana site. Product
                details come from Ringana&apos;s published pages.
              </p>
              <p>
                Statements about supplements have not been evaluated by the Food and Drug
                Administration. These products are not intended to diagnose, treat, cure, or prevent
                any disease. If you are pregnant, nursing, taking medication, or managing a health
                condition, talk with your healthcare provider before starting a new supplement.
                Patch-test new skincare if your skin is sensitive. Some products sold in Europe are
                not on the U.S. shop.
              </p>
              <p className="exclusive-note">
                Someone shared this with you. Keep it between the two of you.
              </p>
              <p className="copyright">© 2026 The Fresh Grove</p>
            </div>
          </div>
        )}
      </div>
      <ShelfPrompt
        active={screen === "results"}
        href={shelfInvite}
        name={partnerFirst}
      />
    </div>
  );
}
