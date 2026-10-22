import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyTheme, readStoredTheme } from "./hooks/useTheme";
import "./styles/index.css";

// Aplica el tema guardado antes del primer render para evitar parpadeos.
applyTheme(readStoredTheme());

const root = document.getElementById("root");
if (!root) throw new Error("Falta el elemento #root");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
