/* Women Safety BD — application boot (routes live in js/pages-*.js) */

function boot() {
  document.documentElement.lang = LANG;
  const installationId = localStorage.getItem("installationId");
  if (!installationId && crypto.randomUUID) {
    localStorage.setItem("installationId", crypto.randomUUID());
  }
  if (!window.location.hash) window.location.hash = "#/";
  renderRoute();
  refreshUnread();
  setInterval(refreshUnread, 60000);
  registerPwa();
  window.addEventListener("online", () => toast(LANG === "bn" ? "অনলাইনে ফিরে এসেছে" : "Back online", "success"));
  window.addEventListener("offline", () => toast(LANG === "bn" ? "অফলাইন — ডেটা কিউতে আছে" : "Offline — changes queued", ""));
}

boot();
