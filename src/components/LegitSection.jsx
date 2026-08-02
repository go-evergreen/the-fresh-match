import { useEffect, useRef, useState } from "react";

const STATS = [
  { end: 30, suffix: "+", label: "years family-led", duration: 1800 },
  { end: 2, suffix: "×", label: "a week · each product", duration: 1100 },
  { end: null, text: "Real", label: "expiration dates", duration: 900 },
  { end: 2026, suffix: "", label: "U.S. chapter opens", duration: 2000 },
];

const POINTS = [
  [
    "Each product, about twice a week",
    "Not stockpiled for a year. Ringana makes on a needs basis — on average each product roughly twice weekly — so actives arrive potent. Every bottle carries a real expiration date.",
  ],
  [
    "Their campus. Their formulas.",
    "Developed and produced in-house in Austria today — with U.S. production coming online so American customers get the same fresh standard, closer to home.",
  ],
  [
    "Airless glass, by design",
    "A patented airless system means product never meets air. Reactive plant actives stay bioactive without a cocktail of synthetic preservatives holding them together.",
  ],
  [
    "Plant actives at full strength",
    "No mineral oils, no microplastics, no fillers standing in for function. The bar is totally toxin free — and they publish transparency instead of marketing fluff.",
  ],
  [
    "One standard, whole routine",
    "FRESH skincare, CAPS supplements, PACKS nutrition — same uncompromising rules across skin and inside care, so your ritual isn't a patchwork of conflicting brands.",
  ],
  [
    "America is just opening",
    "After Europe and Latin America, Ringana is investing in U.S. production in Virginia. The community that shows up now gets to learn the line before it becomes noise.",
  ],
];

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function useInView(threshold = 0.15, rootMargin = "0px 0px -10% 0px") {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (prefersReducedMotion()) {
      setInView(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView];
}

function StatValue({ end, suffix = "", text, duration, active }) {
  const [value, setValue] = useState(() => (text != null ? text : "0"));

  useEffect(() => {
    if (!active) return undefined;

    if (text != null) {
      setValue(text);
      return undefined;
    }

    if (prefersReducedMotion()) {
      setValue(`${end}${suffix}`);
      return undefined;
    }

    let frame;
    let startId;
    // Brief pause so the fade-in lands before digits start racing
    startId = window.setTimeout(() => {
      const start = performance.now();
      const from = 0;

      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const n = Math.round(from + (end - from) * easeOutCubic(t));
        setValue(`${n}${suffix}`);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, 180);

    return () => {
      window.clearTimeout(startId);
      cancelAnimationFrame(frame);
    };
  }, [active, end, suffix, text, duration]);

  return <strong>{value}</strong>;
}

function LegitItem({ index, title, body }) {
  const [ref, inView] = useInView(0.12, "0px 0px -8% 0px");

  return (
    <li
      className={`legit-item${inView ? " is-visible" : ""}`}
      ref={ref}
      style={{ transitionDelay: inView ? `${Math.min(index, 3) * 0.06}s` : "0s" }}
    >
      <span className="legit-num" aria-hidden>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="legit-item-copy">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </li>
  );
}

export function LegitSection() {
  const [statsRef, statsInView] = useInView(0.2, "0px 0px -5% 0px");

  return (
    <section className="legit-block" aria-label="Why Ringana">
      <div className="legit-head">
        <div className="legit-ornament" aria-hidden="true">
          <span className="legit-line" />
          <span className="legit-diamond" />
          <span className="legit-line" />
        </div>
        <div className="legit-eyebrow">Why this line is different</div>
        <h2 className="legit-title">
          Not another &ldquo;clean&rdquo; brand with a pretty label — <em>thirty years</em> of
          doing it the hard way.
        </h2>
        <p className="legit-lede">
          Still family-led. Made fresh on purpose. So what goes on and in your body doesn&apos;t
          need an apology.
        </p>
      </div>

      <div className="legit-stats" aria-label="Ringana at a glance" ref={statsRef}>
        {STATS.map((stat, idx) => (
          <div
            className={`legit-stat${statsInView ? " is-visible" : ""}`}
            key={stat.label}
            style={{ "--stat-delay": `${idx * 0.12}s` }}
          >
            <StatValue
              end={stat.end}
              suffix={stat.suffix}
              text={stat.text}
              duration={stat.duration}
              active={statsInView}
            />
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <ol className="legit-grid">
        {POINTS.map(([title, body], idx) => (
          <LegitItem key={title} index={idx} title={title} body={body} />
        ))}
      </ol>

      <p className="legit-foot">
        This quiz is how The Fresh Grove helps you find your match without the overwhelm — then
        talk it through with the partner who shared it.
      </p>
    </section>
  );
}
