import { useEffect, useRef, useState } from "react";

const STATS = [
  { end: 30, suffix: "+", label: "years family-led", duration: 1800 },
  { end: 2, suffix: "×", label: "a week · each product", duration: 1100 },
  { end: null, text: "Real", label: "expiration dates", duration: 900 },
  { end: 2026, suffix: "", label: "U.S. chapter opens", duration: 2000 },
];

const POINTS = [
  [
    "Made about twice a week",
    "Not a warehouse full of last year's stock. Each product is made fresh, and every bottle has a real expiration date.",
  ],
  [
    "Their campus. Their formulas.",
    "Made in-house in Austria. U.S. production is coming to Virginia, so the same fresh standard lands closer to home.",
  ],
  [
    "Airless glass",
    "The bottle keeps air out. The plants stay potent, without a pile of preservatives doing the job.",
  ],
  [
    "Totally toxin free",
    "No mineral oils, no microplastics, no fillers standing in for the formula. They publish what's in each product.",
  ],
  [
    "Skin and supplements, same rules",
    "FRESH, CAPS, and PACKS are held to one standard. What goes on your skin and what you take come from the same line.",
  ],
  [
    "Just opening in America",
    "Europe and Latin America already have it. You're in the early U.S. chapter.",
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
        <div className="legit-eyebrow">Why Ringana</div>
        <h2 className="legit-title">
          Made fresh, <em>on purpose</em>.
        </h2>
        <p className="legit-lede">
          Family-led for thirty years. Small batches, their own campus, airless glass. That&apos;s
          why a short list from this line is worth having.
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
    </section>
  );
}
