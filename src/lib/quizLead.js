/** Send a finished match to the partner on this quiz link. Nowhere else. */

const SUPABASE_URL = "https://pqznpgqnfmnsvdgcwxiy.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxem5wZ3FuZm1uc3ZkZ2N3eGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2OTgyOTgsImV4cCI6MjEwMTI3NDI5OH0.prNKV7vbSNVNY0sqft4EjAdNeM10bg-seOUth3pIsQA";

export function readQuizPartnerSlug(loc = typeof window !== "undefined" ? window.location : { search: "" }) {
  const slug = String(new URLSearchParams(loc.search || "").get("with") || "")
    .trim()
    .toLowerCase();
  if (!slug || slug === "join" || slug === "www") return "";
  if (slug === "tay" || slug === "taylor") return slug;
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug)) return "";
  return slug;
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
