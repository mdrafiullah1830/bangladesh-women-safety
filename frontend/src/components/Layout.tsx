import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { getInstallationId } from "../lib/session";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

export function Layout() {
  const { t, lang } = useI18n();
  const { show } = useToast();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    // Ensure a stable installation id exists before any API call is made.
    getInstallationId();

    const onOnline = () => show(lang === "bn" ? "অনলাইনে ফিরে এসেছে" : "Back online", "success");
    const onOffline = () =>
      show(lang === "bn" ? "অফলাইন — ডেটা কিউতে আছে" : "Offline — changes queued", "");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
      <span className="sr-only">{t("brand")}</span>
    </div>
  );
}