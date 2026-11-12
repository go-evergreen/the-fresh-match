import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyQuizLook } from "./lib/look.js";
import App from "./App.jsx";

applyQuizLook();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
