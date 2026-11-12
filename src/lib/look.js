/** The landing page's saved look, when the quiz link carries it. */

const LOOKS = new Set(["grove", "brown", "white", "blue", "blush"]);
const CORNERS = new Set(["sharp", "soft"]);

const TYPE = {
  fraunces: ['"Fraunces", Georgia, serif', '"Work Sans", "Helvetica Neue", sans-serif', ""],
  libre: [
    '"Libre Baskerville", Georgia, serif',
    '"Source Sans 3", sans-serif',
    "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600&display=swap",
  ],
  manrope: [
    '"Manrope", sans-serif',
    '"Manrope", sans-serif',
    "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600&display=swap",
  ],
  newsreader: [
    '"Newsreader", Georgia, serif',
    '"Nunito Sans", sans-serif',
    "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Nunito+Sans:wght@300;400;600&display=swap",
  ],
  cormorant: [
    '"Cormorant Garamond", Georgia, serif',
    '"Work Sans", sans-serif',
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap",
  ],
  nunito: [
    '"Nunito", sans-serif',
    '"Nunito", sans-serif',
    "https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,300;0,400;0,600;1,400&display=swap",
  ],
};

export function applyQuizLook(loc = typeof window !== "undefined" ? window.location : { search: "" }) {
  const params = new URLSearchParams(loc.search || "");
  const look = String(params.get("look") || "").trim().toLowerCase();
  const fonts = String(params.get("fonts") || "").trim().toLowerCase();
  const corners = String(params.get("corners") || "").trim().toLowerCase();
  const root = document.documentElement;
  if (LOOKS.has(look)) root.setAttribute("data-look", look);
  if (CORNERS.has(corners)) root.setAttribute("data-corners", corners);
  const face = TYPE[fonts];
  if (!face) return;
  root.setAttribute("data-fonts", fonts);
  root.style.setProperty("--display", face[0]);
  root.style.setProperty("--body", face[1]);
  if (!face[2] || document.querySelector(`link[data-quiz-font="${fonts}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = face[2];
  link.setAttribute("data-quiz-font", fonts);
  document.head.appendChild(link);
}
