import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { setInitData, setUserId } from "./api/client";
import "./design-system/tokens.css";

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
