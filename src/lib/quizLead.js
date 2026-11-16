/** Send a finished match to the partner on this quiz link. Nowhere else. */

import { partnerParam, readPathSlug } from "./shopLinks.js";

const SUPABASE_URL = "https://pqznpgqnfmnsvdgcwxiy.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxem5wZ3FuZm1uc3ZkZ2N3eGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2OTgyOTgsImV4cCI6MjEwMTI3NDI5OH0.prNKV7vbSNVNY0sqft4EjAdNeM10bg-seOUth3pIsQA";

function instagramHandle(raw) {
  let handle = String(raw || "").trim();
  handle = handle.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "");
  handle = handle.split(/[/?#]/)[0].replace(/^@+/, "").trim();
  if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) return "";
  return handle;
}

/** The Instagram handle saved on that partner's First Seeds page, if they set one. */
export async function readPartnerInstagram(slug) {
  const partner = String(slug || "").trim().toLowerCase();
  if (!partner || partner === "join" || partner === "www") return "";
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_lead_page`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_slug: partner }),
      signal: controller ? controller.signal : undefined,
    });
    if (!res.ok) return "";
    const data = await res.json();
    return instagramHandle(data?.instagram);
  } catch {
    return "";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function readQuizPartnerSlug(loc = typeof window !== "undefined" ? window.location : { search: "" }) {
  const slug = String(partnerParam(loc, "with") || readPathSlug(loc) || "")
    .trim()
    .toLowerCase();
  if (!slug || slug === "join" || slug === "www") return "";
  if (slug === "tay" || slug === "taylor") return slug;
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug)) return "";
  return slug;
}

const TEAM_URL = "https://nmjftgymldjzcmeqamkr.supabase.co";
const TEAM_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamZ0Z3ltbGRqemNtZXFhbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NjUxMTAsImV4cCI6MjEwNDI0MTExMH0.F_mf4JWYFFxIIthSWYl4-Lb1zumqgPpPL33Rb3kGkpM";
const MINE_URL = "https://ojbipfnbsaquwpslmily.supabase.co";
const MINE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmlwZm5ic2FxdXdwc2xtaWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTYwNDksImV4cCI6MjEwMzE5MjA0OX0.DO7YqCM1HTlZawrGiAzRwTNAXt1KsrlgSuf2_ro-gK8";

function quizUsHost(raw) {
  let host = String(raw || "").trim().replace(/^https?:\/\//i, "");
  host = host.split("/")[0].split("?")[0].split("#")[0].toLowerCase().replace(/\.$/, "");
  if (!host || host === "ringana.us" || host === "www.ringana.us" || host === "ringana.com" || host === "www.ringana.com") return "";
  if (host.endsWith(".ringana.com")) host = host.slice(0, -4) + ".us";
  if (!host.endsWith(".ringana.us")) return "";
  return host;
}

function partnerCode(raw) {
  const value = String(raw || "").trim();
  if (!value || /\s/.test(value) || value.length > 40) return "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(value)) return "";
  return value;
}

function firstName(raw) {
  const first = String(raw || "").trim().split(/\s+/)[0] || "";
  if (!/^[A-Za-z][A-Za-z.'-]{0,30}$/.test(first)) return "";
  return first;
}

async function postRpc(url, key, fn, body) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body || {}),
      signal: controller ? controller.signal : undefined,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Shop, code, name, and look for quiz.thefreshgrove.team/their-name. */
export async function loadPartnerDoor(slug) {
  const partner = String(slug || "").trim().toLowerCase();
  if (!partner || partner === "join") return null;
  const mine = partner === "tay" || partner === "taylor";
  const pageSlug = partner === "tay" ? "taylor" : partner;
  const [page, shop] = await Promise.all([
    postRpc(SUPABASE_URL, SUPABASE_ANON, "get_lead_page", { p_slug: pageSlug }),
    postRpc(mine ? MINE_URL : TEAM_URL, mine ? MINE_ANON : TEAM_ANON, "pull_shelf_shop", mine ? {} : { p_invite: partner }),
  ]);
  const settings = page && page.page && typeof page.page === "object" ? page.page : {};
  const looks = { grove: 1, brown: 1, white: 1, blue: 1, blush: 1 };
  const faces = { fraunces: 1, libre: 1, manrope: 1, newsreader: 1, cormorant: 1, nunito: 1 };
  const corners = { sharp: 1, soft: 1 };
  let host = "";
  let ref = "";
  let code = "";
  if (shop && shop.ok !== false) {
    host = quizUsHost(shop.shop_url || "");
    code = partnerCode(shop.promo_code || "");
    const weblink = String(shop.weblink || "").trim();
    if (!host && /^[0-9]{4,12}$/.test(weblink)) host = `${weblink}.ringana.us`;
    else if (!host && weblink && !/^https?:/i.test(weblink) && !/\s/.test(weblink)) ref = weblink;
  }
  const door = {
    shop: host,
    code,
    ref,
    with: mine ? "tay" : partner,
    who: firstName(page && page.display_name),
    look: looks[settings.palette] ? settings.palette : "",
    fonts: faces[settings.fonts] ? settings.fonts : "",
    corners: corners[settings.corners] ? settings.corners : "",
  };
  if (!page && !shop) return null;
  return door;
}

export function rememberPartnerDoor(door) {
  if (typeof window === "undefined" || !door) return;
  window.__quizDoor = door;
}

export async function sendQuizLead({ slug, name, email, social, matchUrl }) {
  const partner = String(slug || "").trim().toLowerCase();
  if (!partner) return { ok: false, reason: "no-partner" };
  const body = {
    p_slug: partner,
    p_name: String(name || "").trim(),
    p_email: String(email || "").trim(),
    p_ig: String(social || "").trim(),
    p_match: String(matchUrl || "").trim(),
  };
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_quiz_lead`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    });
    if (!res.ok) return { ok: false, reason: "save" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "save" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
