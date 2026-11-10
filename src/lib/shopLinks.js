/** Partner shop on this quiz visit. Comes from ?shop=&code= on their own link. */

const US_SLUG = {
  "fresh-tonic-calm": "fresh-toner-calm",
  "fresh-tonic-pure": "fresh-toner-pure",
  "fresh-scrub-face-body": "fresh-scrub",
  "fresh-shampoo-repair": "fresh-repair-shampoo",
  "fresh-adds-effect": "fresh-lifting-booster",
  "fresh-adds-glow": "fresh-glow-booster",
  "fresh-adds-repair": "fresh-clarifying-booster",
  "fresh-moisturiser-for-men": "fresh-moisturizer-for-men",
  "fresh-overnight-face-treatment": "fresh-overnight-retinal-cream",
  "fresh-overnight": "fresh-overnight-retinal-cream",
  "fresh-skin-perfection": "fresh-skin-perfecting-cream",
  "fresh-tinted-moisturiser": "fresh-tinted-moisturizer",
  "fresh-light-legs": "fresh-cooling-leg-spray",
  "fresh-stay-fresh": "fresh-bum-intimate-foam",
  "fresh-hair-treatment": "fresh-conditioner-leave-in",
};

const LINKED = new Set([
  "beyond-omega",
  "caps-cerebro",
  "caps-d-gest",
  "caps-immu",
  "caps-moodoo",
  "caps-move",
  "fresh-after-sun",
  "fresh-anti-wrinkle-serum",
  "fresh-body-milk-light",
  "fresh-body-milk-rich",
  "fresh-body-wash",
  "fresh-bum-intimate-foam",
  "fresh-clarifying-booster",
  "fresh-cleanser",
  "fresh-cleansing-water",
  "fresh-conditioner-leave-in",
  "fresh-cooling-leg-spray",
  "fresh-cream-light",
  "fresh-cream-medium",
  "fresh-cream-rich",
  "fresh-deodorant",
  "fresh-eye-cream",
  "fresh-eye-serum",
  "fresh-foot-balm",
  "fresh-glow-booster",
  "fresh-hand-balm",
  "fresh-hydro-serum",
  "fresh-lifting-booster",
  "fresh-lip-balm-classic",
  "fresh-moisturizer-for-men",
  "fresh-overnight-retinal-cream",
  "fresh-repair-shampoo",
  "fresh-scrub",
  "fresh-skin-perfecting-cream",
  "fresh-soap",
  "fresh-soap-liquid",
  "fresh-tinted-balm-rosewood",
  "fresh-tinted-moisturizer",
  "fresh-tinted-moisturiser-tan",
  "fresh-toner-calm",
  "fresh-toner-pure",
  "fresh-tooth-oil",
  "fresh-volume-shampoo",
  "ringana-beauty-bag",
]);

const BARE = new Set(["ringana.us", "www.ringana.us", "ringana.com", "www.ringana.com"]);

/** Pages exist. They are not orderable yet. */
const NOT_YET = new Set([
  "fresh-deodorant",
  "fresh-cooling-leg-spray",
  "fresh-conditioner-leave-in",
]);

const SHELF_HOSTS = new Set(["shelf.taygoesfresh.com", "shelf.thefreshgrove.team"]);

function partnerHost(raw) {
  let value = String(raw || "").trim();
  if (!value) return "";
  value = value.replace(/^https?:\/\//i, "").split("/")[0].split("?")[0].split("#")[0];
  value = value.toLowerCase().replace(/\.$/, "");
  if (!value || value.includes("..") || BARE.has(value)) return "";
  if (!(value.endsWith(".ringana.us") || value.endsWith(".ringana.com"))) return "";
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(value)) return "";
  return value;
}

function partnerCode(raw) {
  const value = String(raw || "").trim();
  if (!value || /\s/.test(value) || value.length > 40) return "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(value)) return "";
  return value;
}

function affiliateCode(raw) {
  const value = String(raw || "").trim();
  if (!value || /\s/.test(value) || value.length > 80) return "";
  if (partnerHost(value)) return "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value)) return "";
  return value;
}

function usPath(slug) {
  const key = String(slug || "").trim().toLowerCase();
  if (!key || key.endsWith("-sample")) return "";
  const mapped = US_SLUG[key] || key;
  return LINKED.has(mapped) ? mapped : "";
}

export function readPartnerShop(loc = typeof window !== "undefined" ? window.location : { search: "" }) {
  const params = new URLSearchParams(loc.search || "");
  const host = partnerHost(params.get("shop") || "");
  const code = partnerCode(params.get("code") || "");
  const weblink = affiliateCode(params.get("ref") || "");
  return {
    origin: host ? "https://" + host : "",
    host,
    code,
    weblink,
  };
}

export function productHref(shop, slug) {
  if (!shop) return "";
  const us = usPath(slug);
  if (!us) return "";
  const path = `/produkt/${us}/?lang=en`;
  if (shop.origin) return shop.origin + path;
  if (shop.weblink) {
    return `https://www.ringana.com/produkt/${us}/?lang=en&weblink=${encodeURIComponent(shop.weblink)}`;
  }
  return "";
}

export function decorateProduct(product, shop) {
  if (!product) return product;
  const us = usPath(product.slug);
  if (!us) return { ...product, url: "", comingSoon: true };
  const comingSoon = NOT_YET.has(us);
  const href = productHref(shop, product.slug);
  if (href) return { ...product, url: href, comingSoon };
  return { ...product, comingSoon };
}

export function withPartnerLinks(items, shop) {
  return (items || []).map((product) => decorateProduct(product, shop));
}

/** Only a real Fresh Shelf door. Anything else is dropped. */
export function readShelfInvite(loc = typeof window !== "undefined" ? window.location : { search: "" }) {
  const raw = new URLSearchParams(loc.search || "").get("shelf") || "";
  if (!raw) return "";
  let url;
  try {
    url = new URL(raw);
  } catch {
    return "";
  }
  if (url.protocol !== "https:") return "";
  const host = url.hostname.toLowerCase();
  if (!SHELF_HOSTS.has(host)) return "";
  const slug = String(url.searchParams.get("with") || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,48}$/.test(slug)) return "";
  return `https://${host}/?with=${encodeURIComponent(slug)}`;
}

export function isPartnerShopUrl(url) {
  try {
    return !!partnerHost(new URL(url).hostname);
  } catch {
    return false;
  }
}
