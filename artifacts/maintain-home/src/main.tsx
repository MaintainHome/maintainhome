import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installNativeFetchRewrite } from "./lib/api";

// In native iOS/Android (Capacitor) builds, relative `/api/...` URLs would
// resolve to `capacitor://` or `http://localhost` instead of the real
// backend. This rewrites them to the production origin BEFORE any other
// code (including React Query) issues a request. No-op in the browser.
installNativeFetchRewrite();

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA support (production only)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("[SW] Registered, scope:", reg.scope))
      .catch((err) => console.warn("[SW] Registration failed:", err));
  });
}
