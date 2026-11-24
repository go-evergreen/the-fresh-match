import { useEffect, useMemo, useRef, useState } from "react";
import { faceQuestions, BODY_Q, SUPP_Q } from "./data/questions";
import { buildFace, buildBody, buildSupp, summarizeAnswers } from "./engine/match";
import { ShopLane } from "./components/ShopLanes";
import { buildLanes, bodyLaneLabel } from "./engine/lanes";
import { LeaveBehindCard } from "./components/LeaveBehindCard";
import { LegitSection } from "./components/LegitSection";
import { ShelfPrompt } from "./components/ShelfPrompt";
import { buildRestoreUrl, encodeMatchState, readMatchFromLocation } from "./lib/share";
import { partnerBackupQuery, readPartnerFirst, readPartnerShop, readPathSlug, readShelfInvite, withPartnerLinks } from "./lib/shopLinks";
import { PARTY_SLUG } from "./data/partyPartners";
import { PartyPick } from "./components/PartyPick";
import { loadPartnerDoor, readPartnerInstagram, readQuizPartnerSlug, rememberPartnerDoor, sendQuizLead } from "./lib/quizLead";
import { applyQuizLook } from "./lib/look";
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
  if (path === "skin") return [...faceQuestions(answers), ...bodyQs];
  if (path === "supp") return [...SUPP_Q];
  if (path === "both") return [...faceQuestions(answers), ...bodyQs, ...SUPP_Q];
  return [];
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
  const [guestName, setGuestName] = useState("");
  const [partnerIg, setPartnerIg] = useState("");
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
    let own = false;
    try {
      const hash = window.location.hash || "";
      const token = (hash.match(/[#&]m=([^&]+)/) || [])[1] || "";
      own = token && sessionStorage.getItem("fm-own-results") === decodeURIComponent(token);
    } catch {
      own = false;
    }
    setRestoredBanner(!own);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Keep the URL hash in sync so "copy link" / refresh works
  useEffect(() => {
    if (screen !== "results" || !path) return;
    const url = buildRestoreUrl(QUIZ_URL, {
      path,
      ans,
      name: guestName,
      search: window.location.search,
      backup: partnerBackupQuery(),
    });
    const hash = url.includes("#") ? url.slice(url.indexOf("#")) : "";
    if (hash && window.location.hash !== hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search + hash);
    }
    if (!restoredBanner) {
      const token = (hash.match(/[#&]m=([^&]+)/) || [])[1] || "";
      if (token) {
        try {
          sessionStorage.setItem("fm-own-results", decodeURIComponent(token));
        } catch {
          /* private mode */
        }
      }
    }
  }, [screen, path, ans, guestName, restoredBanner]);

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
      backup: partnerBackupQuery(),
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
    if (showPress) return;
    setPath(p);
    setScreen("quiz");
    setI(0);
    setAns({});
    setDraft([]);
    setPicked(null);
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
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const summary = summarizeAnswers(ans, path);

  const [doorRev, setDoorRev] = useState(0);
  const [partyChosen, setPartyChosen] = useState(false);
  const partnerShop = useMemo(() => readPartnerShop(), [doorRev]);
  const shelfInvite = useMemo(() => readShelfInvite(), [doorRev]);
  const partnerFirst = useMemo(() => readPartnerFirst(), [doorRev]);
  const partnerSlug = useMemo(() => readQuizPartnerSlug(), [doorRev]);
  const partyDoor = useMemo(() => readPathSlug() === PARTY_SLUG, []);
  const showPress = partyDoor && !partyChosen;

  useEffect(() => {
    let live = true;
    readPartnerInstagram(partnerSlug).then((handle) => {
      if (live) setPartnerIg(handle);
    });
    return () => {
      live = false;
    };
  }, [partnerSlug]);
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
  }, [partnerFirst, showPress]);
  const lanes = useMemo(() => {
    if (screen !== "results") return { skincare: [], body: [], bodyMore: [], supplements: [] };
    const built = buildLanes(face, body, supp);
    return {
      skincare: withPartnerLinks(built.skincare, partnerShop),
      body: withPartnerLinks(built.body, partnerShop),
      bodyMore: withPartnerLinks(built.bodyMore, partnerShop),
      supplements: withPartnerLinks(built.supplements, partnerShop),
    };
  }, [screen, face, body, supp, partnerShop]);
  const shelfContinue = useMemo(() => {
    if (!shelfInvite) return "";
    const base = shelfInvite.replace(/#.*$/, "");
    if (!path) return base;
    const token = encodeMatchState({ path, ans, name: guestName });
    return `${base}#m=${token}`;
  }, [shelfInvite, path, ans, guestName]);

  const goalsNeedPick = q?.id === "goals" && ans.approach === "targeted";
  const multiBlocked = goalsNeedPick && draft.length === 0;

  const choosing = useRef(false);
  const choosePartner = async (person) => {
    if (choosing.current) return;
    choosing.current = true;
    const door = (await loadPartnerDoor(person.slug)) || {
      with: person.slug,
      who: String(person.name || "").trim().split(/\s+/)[0] || "",
    };
    if (!door.who) door.who = String(person.name || "").trim().split(/\s+/)[0] || "";
    rememberPartnerDoor(door);
    applyQuizLook();
    window.history.replaceState(null, "", `/${person.slug}`);
    setPartyChosen(true);
    setDoorRev((n) => n + 1);
  };

  return (
    <div className="app">
      <div className="brand-top">
        <img className="brand-stamp" src="./grove-stamp.png" alt="The Fresh Grove" />
        {showPress ? (
          <span ref={brandRef} className="brand-mark">
            Fresh off the <span>Press</span>
          </span>
        ) : partnerFirst ? (
          <span ref={brandRef} className="brand-mark">
            Ringana <span>with&nbsp;{partnerFirst}</span>
          </span>
        ) : null}
      </div>

      <div className="shell" inert={showPress ? true : undefined}>
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
                {guestName.trim() ? `This is ${guestName.trim()}'s match.` : "This is your match."}
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

            <ShopLane label="Skincare" items={lanes.skincare} />
            <ShopLane label={bodyLaneLabel(lanes.body)} items={lanes.body} more={lanes.bodyMore} />
            <ShopLane label="Supplements" items={lanes.supplements} />

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
              ].map(([t, d]) => (
                <div className="edu-item" key={t}>
                  <h4>{t}</h4>
                  <p>{d}</p>
                </div>
              ))}
            </div>

            <div className="cta-block share-footer">
              <div className="cta-eyebrow">Save</div>
              <h3>Keep this on your shelf</h3>
              <p>
                {partnerFirst
                  ? `Continue on your shelf so ${partnerFirst} can see your match. Suggestions land on your wishlist, not your cabinet.`
                  : "Continue on your shelf. Suggestions land on your wishlist, not your cabinet."}
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
                {lanes.skincare.length > 0 && (
                  <div className="stat">
                    <strong>{lanes.skincare.length}</strong>
                    <span>skincare</span>
                  </div>
                )}
                {lanes.body.length > 0 && (
                  <div className="stat">
                    <strong>{lanes.body.length}</strong>
                    <span>{bodyLaneLabel(lanes.body) === "Body & hair" ? "body & hair" : "body"}</span>
                  </div>
                )}
                {lanes.supplements.length > 0 && (
                  <div className="stat">
                    <strong>{lanes.supplements.length}</strong>
                    <span>supplements</span>
                  </div>
                )}
              </div>

              <div className="cta-actions">
                {shelfContinue ? (
                  <a className="btn-brass" href={shelfContinue}>
                    Continue on your shelf
                  </a>
                ) : null}
                {partnerIg ? (
                  <a
                    className="btn-ghost btn-ghost-on-pine"
                    href={`https://ig.me/m/${partnerIg}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {partnerFirst ? `Message ${partnerFirst} on Instagram` : "Message on Instagram"}
                  </a>
                ) : null}
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
      {showPress ? <PartyPick onChoose={choosePartner} /> : null}
    </div>
  );
}
