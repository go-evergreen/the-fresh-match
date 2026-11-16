import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyQuizLook } from "./lib/look.js";
import { partnerParam, readPathSlug } from "./lib/shopLinks.js";
import { loadPartnerDoor, rememberPartnerDoor } from "./lib/quizLead.js";
import App from "./App.jsx";

const DOOR_KEYS = ["shop", "code", "ref", "with", "who", "look", "fonts", "corners"];

async function boot() {
  try {
    const slug = readPathSlug();
    const missingShop = !partnerParam(window.location, "shop") && !partnerParam(window.location, "code") && !partnerParam(window.location, "ref");
    const missingName = !partnerParam(window.location, "who");
    const missingLook = !partnerParam(window.location, "look");
    if (slug && (missingShop || missingName || missingLook)) {
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
