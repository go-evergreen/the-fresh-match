/** Compact, SMS-friendly match brief — no product URL spam. */
export function formatTextBrief({ summary, hero, playbook, restoreUrl, name }) {
  const who = name?.trim() ? `${name.trim()}'s Fresh Match` : "My Fresh Match";
  const lines = [
    `${who} — The Fresh Grove`,
    summary ? `Profile: ${summary}` : null,
    "",
    "Start here:",
    ...(hero?.items || []).map((p, i) => {
      const why = p.why ? ` — ${shortWhy(p.why)}` : "";
      return `${i + 1}. ${p.name}${why}`;
    }),
  ];
  if (playbook?.addNext?.length) {
    lines.push("", "Add next:", ...playbook.addNext.slice(0, 3).map((p) => `• ${p.name}`));
  }
  if (playbook?.week1?.length) {
    lines.push("", "Week 1:", ...playbook.week1.map((line) => `• ${line}`));
  }
  lines.push(
    "",
    "A match from your answers, not a prescription.",
    "Educational match only — not medical advice.",
    "Send this to the person who shared the quiz with you.",
    restoreUrl ? `Open this match: ${restoreUrl}` : null
  );
  return lines.filter((l) => l !== null).join("\n");
}

/** Same brief with the partner's shop links. */
export function formatLinksBrief({ summary, hero, playbook, restoreUrl, name, code, shopHost }) {
  const who = name?.trim() ? `${name.trim()}'s Fresh Match` : "My Fresh Match";
  const lines = [
    `${who} — The Fresh Grove`,
    summary ? `Profile: ${summary}` : null,
    shopHost ? `Shop: https://${shopHost}/?lang=en` : null,
    code ? `Use ${code} to save $25 on your first order of $60+.` : null,
    "",
    "Start here:",
    ...(hero?.items || []).map((p, i) => `${i + 1}. ${p.name}${p.url ? `\n   ${p.url}` : ""}`),
  ];
  if (playbook?.addNext?.length) {
    lines.push(
      "",
      "Add next:",
      ...playbook.addNext.slice(0, 3).map((p) => `• ${p.name}${p.url ? `\n  ${p.url}` : ""}`)
    );
  }
  lines.push(
    "",
    "A match from your answers, not a prescription.",
    "Educational match only — not medical advice.",
    "Send this to the person who shared the quiz with you.",
    restoreUrl ? `Open this match: ${restoreUrl}` : null
  );
  return lines.filter((l) => l !== null).join("\n");
}

function shortWhy(why) {
  if (!why) return "";
  const cut = why.split(/[.—]/)[0]?.trim() || why;
  return cut.length > 72 ? `${cut.slice(0, 69)}…` : cut;
}

function toBase64Url(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return decodeURIComponent(escape(atob(b64)));
}

/** Encode path + answers (+ optional name) into a URL hash payload. */
export function encodeMatchState({ path, ans, name }) {
  const payload = {
    v: 1,
    path,
    ans,
    name: name?.trim() || undefined,
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeMatchState(encoded) {
  try {
    const data = JSON.parse(fromBase64Url(encoded));
    if (!data || data.v !== 1 || !data.path || typeof data.ans !== "object") return null;
    return {
      path: data.path,
      ans: data.ans || {},
      name: typeof data.name === "string" ? data.name : "",
    };
  } catch {
    return null;
  }
}

export function buildRestoreUrl(baseUrl, { path, ans, name, search }) {
  const token = encodeMatchState({ path, ans, name });
  const clean = baseUrl.replace(/#.*$/, "").replace(/\?.*$/, "");
  const q = String(search || "");
  const query = q ? (q.charAt(0) === "?" ? q : `?${q}`) : "";
  return `${clean}${query}#m=${token}`;
}

export function readMatchFromLocation(loc = window.location) {
  const hash = loc.hash || "";
  const m = hash.match(/[#&]m=([^&]+)/);
  if (!m?.[1]) return null;
  return decodeMatchState(decodeURIComponent(m[1]));
}
