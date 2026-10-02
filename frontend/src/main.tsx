import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { I18nProvider } from "./i18n";
import "./styles/global.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root was not found in index.html");

createRoot(container).render(
  <StrictMode>
    <I18nProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </I18nProvider>
  </StrictMode>
);

// Progressive Web App: cache the shell for offline use (production builds only).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline shell is optional */
    });
  });
}