import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyQuizLook } from "./lib/look.js";
import { partnerParam, readPathSlug } from "./lib/shopLinks.js";
import { PARTY_SLUG } from "./data/partyPartners.js";
import { loadPartnerDoor, rememberPartnerDoor } from "./lib/quizLead.js";
import App from "./App.jsx";

const DOOR_KEYS = ["shop", "code", "ref", "with", "who", "look", "fonts", "corners"];

/** A saved match opened from the party link belongs on that partner's quiz, not the picker. */
function settlePartyResult() {
  if (readPathSlug() !== PARTY_SLUG) return;
  const hash = window.location.hash || "";
  if (!/[#&]m=/.test(hash)) return;
  const owner = String(partnerParam(window.location, "with") || "").trim().toLowerCase();
  if (!owner || owner === PARTY_SLUG || owner === "join" || owner === "www") return;
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(owner)) return;
  const path = owner === "tay" ? "/taylor" : `/${owner}`;
  window.history.replaceState(null, "", path + window.location.search + hash);
}

async function boot() {
  try {
    settlePartyResult();
    const slug = readPathSlug();
    const missingShop = !partnerParam(window.location, "shop") && !partnerParam(window.location, "code") && !partnerParam(window.location, "ref");
    const missingName = !partnerParam(window.location, "who");
    const missingLook = !partnerParam(window.location, "look");
    if (slug && slug !== PARTY_SLUG && (missingShop || missingName || missingLook)) {
      const door = await loadPartnerDoor(slug);
      if (door) {
        DOOR_KEYS.forEach((key) => {
          if (partnerParam(window.location, key)) door[key] = "";
        });
        rememberPartnerDoor(door);
      }
    }
  } catch {
    /* A short link still opens. The name can come from the path. */
  }
  applyQuizLook();
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

boot();
