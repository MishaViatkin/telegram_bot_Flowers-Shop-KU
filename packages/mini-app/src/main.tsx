import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { setInitData, setUserId } from "./api/client";
import "./design-system/tokens.css";

function setupChunkLoadAutoReload() {
  const KEY = "flowers_tg_chunk_reload_once";

  function shouldReloadFor(err: unknown): boolean {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : (err as { message?: unknown } | null)?.message;
    if (typeof msg !== "string") return false;

    return (
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("Loading chunk") ||
      msg.includes("ChunkLoadError")
    );
  }

  function reloadOnce(err: unknown) {
    if (!shouldReloadFor(err)) return;
    if (sessionStorage.getItem(KEY) === "1") return;
    sessionStorage.setItem(KEY, "1");
    window.location.reload();
  }

  window.addEventListener("unhandledrejection", (event) => reloadOnce(event.reason));
  window.addEventListener("error", (event) => reloadOnce((event as ErrorEvent).error));
}

setupChunkLoadAutoReload();

const tg = window.Telegram?.WebApp;
if (tg?.initDataUnsafe?.user?.id) {
  setUserId(`tg-${tg.initDataUnsafe.user.id}`);
}
if (tg?.initData) {
  setInitData(tg.initData);
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
