/* Women Safety BD — core runtime: API client, router shell, helpers, PWA hooks */

const API = "";
const routes = {};

let token = localStorage.getItem("token");
let refreshTokenStore = localStorage.getItem("refresh") || "";
let profile = (() => {
  try { return JSON.parse(localStorage.getItem("profile") || "null"); } catch { return null; }
})();

function registerPage(name, fn) { routes[name] = fn; }

function persistSession(accessToken, refresh, user) {
  if (accessToken) { token = accessToken; localStorage.setItem("token", accessToken); }
  if (refresh) { refreshTokenStore = refresh; localStorage.setItem("refresh", refresh); }
  if (user) { profile = user; localStorage.setItem("profile", JSON.stringify(user)); }
}

function clearSession() {
  token = null; refreshTokenStore = ""; profile = null;
  localStorage.removeItem("token"); localStorage.removeItem("refresh"); localStorage.removeItem("profile");
}

function navigate(path) { window.location.hash = path; }

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = "Bearer " + token;
  const installationId = localStorage.getItem("installationId");
  if (installationId) headers["X-Installation-Id"] = installationId;

  let response = await fetch(API + path, { ...opts, headers });

  if (response.status === 401 && refreshTokenStore && !path.startsWith("/api/auth/")) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = "Bearer " + token;
      response = await fetch(API + path, { ...opts, headers });
    } else {
      clearSession();
      toast(t("tokenExpired"), "error");
      navigate("login");
    }
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw { status: response.status, ...data };
  return data;
}

async function tryRefresh() {
  if (!refreshTokenStore) return false;
  try {
    const r = await fetch(API + "/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshTokenStore })
    });
    if (!r.ok) return false;
    const d = await r.json();
    if (!d.tokens || !d.tokens.accessToken) return false;
    persistSession(d.tokens.accessToken, d.tokens.refreshToken, d.user);
    return true;
  } catch { return false; }
}

function toast(message, type) {
  const el = document.createElement("div");
  el.className = "toast" + (type ? " toast-" + type : "");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fmtDate(iso, withTime) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return withTime
    ? d.toLocaleString(LANG === "bn" ? "bn-BD" : "en-GB", { dateStyle: "medium", timeStyle: "short" })
    : d.toLocaleDateString(LANG === "bn" ? "bn-BD" : "en-GB", { dateStyle: "medium" });
}

function fmtDistance(meters) {
  if (meters === null || meters === undefined) return "—";
  if (meters < 1000) return Math.round(meters) + " m";
  return (meters / 1000).toFixed(1) + " km";
}

function fmtMinutes(minutes) {
  if (minutes < 60) return minutes + "m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h + "h" + (m ? " " + m + "m" : "");
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function statusBadge(status) {
  const map = {
    OPEN: "info", AWAITING_VERIFICATION: "warning", VERIFIED: "success",
    POLICE_REFERRED: "danger", RESOLVED: "success", CLOSED: "muted",
    EMERGENCY_ACTIVE: "danger", EMERGENCY_CANCELLED: "muted", REJECTED: "muted",
    DRAFT: "muted", DUPLICATE: "muted",
    ACTIVE: "success", COMPLETED: "muted", AUTO_ESCALATED: "danger", CANCELLED: "muted",
    DRAFT_REF: "muted", SUBMITTED: "info", ACKNOWLEDGED: "success",
    ALERTED: "warning", ACCEPTED: "info", EN_ROUTE: "info", ON_SCENE: "success",
    UNVERIFIED: "muted", PENDING_REVIEW: "warning", VERIFIED_CASE: "success",
    OFFICIALLY_CONFIRMED: "success", REJECTED_CASE: "muted"
  };
  return '<span class="badge badge-' + (map[status] || "muted") + '">' + esc(status) + "</span>";
}

function categoryLabel(category) {
  const bn = {
    HARASSMENT: "হয়রানি", STALKING: "তাড়া", DOMESTIC_VIOLENCE: "গার্হস্থ্য সহিংসতা",
    SEXUAL_ASSAULT: "যৌন হামলা", CYBER_HARASSMENT: "সাইবার হয়রানি",
    WORKPLACE_HARASSMENT: "কর্মক্ষেত্রের হয়রানি", ACID_ATTACK: "অ্যাসিড হামলা",
    TRAFFICKING: "মানব পাচার", ROBBERY: "ডাকাতি", ROAD_ACCIDENT: "সড়ক দুর্ঘটনা",
    OTHER: "অন্যান্য"
  };
  const en = {
    HARASSMENT: "Harassment", STALKING: "Stalking", DOMESTIC_VIOLENCE: "Domestic violence",
    SEXUAL_ASSAULT: "Sexual assault", CYBER_HARASSMENT: "Cyber harassment",
    WORKPLACE_HARASSMENT: "Workplace harassment", ACID_ATTACK: "Acid attack",
    TRAFFICKING: "Trafficking", ROBBERY: "Robbery", ROAD_ACCIDENT: "Road accident",
    OTHER: "Other"
  };
  return (LANG === "bn" ? bn[category] : en[category]) || category;
}

function districtOptions(selected) {
  return '<option value="">— ' + t("district") + " —</option>";
}

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return !String(value).trim();
}

function emptyState(message, extra) {
  return '<div class="empty-state"><div class="empty-icon">◇</div><p>' + esc(message) + "</p>" +
    (extra || "") + "</div>";
}

function spinner(label) {
  return '<div class="flex-center" style="padding:32px"><div class="spinner"></div>' +
    '<span style="margin-left:12px;color:var(--text-sec)">' + esc(label || t("loading")) + "</span></div>";
}

function barsChart(rows, valueKey, labelKey, color) {
  if (!rows || !rows.length) return emptyState(t("none"));
  const max = Math.max(1, ...rows.map(r => Number(r[valueKey]) || 0));
  return '<div class="bar-chart">' + rows.map(r => {
    const value = Number(r[valueKey]) || 0;
    const pct = Math.round((value / max) * 100);
    return '<div class="bar-row">' +
      '<div class="bar-label">' + esc(r[labelKey]) + "</div>" +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + "%;background:" + (color || "var(--primary)") + '"></div></div>' +
      '<div class="bar-value">' + value + "</div></div>";
  }).join("") + "</div>";
}

function isNightNow() {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
}

async function notifyMe(title, body, href) {
  if (!("Notification" in window)) return false;
  let granted = Notification.permission === "granted";
  if (!granted && Notification.permission === "default") {
    granted = (await Notification.requestPermission()) === "granted";
  }
  if (!granted) return false;
  const n = new Notification(title, { body, icon: "/icon-192.png", tag: href || "ws" });
  n.onclick = () => { window.focus(); if (href) navigate(href); n.close(); };
  return true;
}

function apiErrorMessage(error) {
  if (!error) return t("error");
  if (error.message) return error.message;
  if (error.error === "validation_error") return t("error");
  return t("error");
}

async function ensureDistricts() {
  if (window.__districts) return window.__districts;
  const data = await api("/api/districts");
  window.__districts = (data && data.districts) || data || [];
  return window.__districts;
}

function districtSelectHtml(id, selected) {
  const divisions = window.__districts || [];
  let html = '<select id="' + id + '" class="form-control"><option value="">' + t("all") + "</option>";
  divisions.forEach(div => {
    html += '<optgroup label="' + esc(LANG === "bn" ? div.nameBn : div.nameEn) + '">';
    (div.districts || []).forEach(d => {
      const value = d.id;
      html += '<option value="' + value + '"' + (String(selected) === String(value) ? " selected" : "") + ">" +
        esc(LANG === "bn" ? d.nameBn : d.nameEn) + "</option>";
    });
    html += "</optgroup>";
  });
  return html + "</select>";
}

/* ─── Navbar / shell ─────────────────────────────────────────────────────── */

function navLink(route, label, current) {
  return '<a href="#' + route + '" class="nav-item' + (current === route ? " active" : "") + '">' + esc(label) + "</a>";
}

function unreadBadgeHtml() {
  const count = window.__unreadCount || 0;
  if (!count) return "";
  return '<span class="nav-dot" id="navUnread">' + count + "</span>";
}

function shell(content, current) {
  const isAuthed = !!token;
  let links = "";

  if (isAuthed) {
    links += navLink("dashboard", t("dashboard"), current);
    links += navLink("emergency", t("emergency"), current);
    links += navLink("report", t("report"), current);
    links += navLink("incidents", t("incidents"), current);
    links += navLink("contacts", t("contacts"), current);
    links += navLink("trips", t("trips"), current);
    links += navLink("directory", t("directory"), current);
    links += navLink("safety", t("safety"), current);
    links += navLink("stats", t("stats"), current);
    links += navLink("notifications", t("notifications") + unreadBadgeHtml(), current);
    links += navLink("privacy", t("privacy"), current);
    if (profile && (profile.role === "MODERATOR" || profile.role === "ADMIN")) {
      links += navLink("moderation", t("moderation"), current);
    }
    if (profile && (profile.role === "RESPONDER" || profile.role === "MODERATOR" || profile.role === "ADMIN")) {
      links += navLink("responder", t("responder"), current);
    }
    links += navLink("profile", t("profile"), current);
    links += '<a href="#" class="nav-item nav-logout" onclick="doLogout();return false">' + t("logout") + "</a>";
  } else {
    links += navLink("directory", t("directory"), current);
    links += navLink("safety", t("safety"), current);
    links += navLink("stats", t("stats"), current);
    links += navLink("login", t("login"), current);
    links += navLink("register", t("register"), current);
  }

  const langToggle = '<button class="lang-toggle" onclick="toggleLang()" title="' + t("language") + '">' +
    (LANG === "bn" ? "EN" : "বাংলা") + "</button>";

  return '<nav class="navbar"><div class="container nav-inner">' +
    '<a href="#/" class="nav-brand"><span class="icon">🛡️</span> ' + t("brand") + "</a>" +
    '<button class="nav-burger" onclick="document.querySelector(\'#navLinks\').classList.toggle(\'open\')">☰</button>' +
    '<div class="nav-links" id="navLinks">' + links + langToggle + "</div>" +
    "</div></nav>" + content + footerHtml();
}

function footerHtml() {
  return '<footer class="footer"><div class="container"><div class="grid grid-3">' +
    '<div><h4>🛡️ ' + t("brand") + '</h4><p style="font-family:var(--font-bn)">বাংলাদেশ নারী নিরাপত্তা প্ল্যাটফর্ম</p>' +
    '<p style="margin-top:8px;font-size:.9rem">Emergency reporting, trusted contacts and offline-first safety tools.</p></div>' +
    '<div><h4>' + t("emergencyNumbers") + '</h4><p>🚑 999</p><p>📞 109</p><p>💚 106</p><p>⚖️ 16432</p></div>' +
    '<div><h4>Quick links</h4><p><a href="#/directory">' + t("directory") + '</a></p><p><a href="#/safety">' + t("tips") + '</a></p>' +
    '<p><a href="#/stats">' + t("stats") + '</a></p><p><a href="#/privacy">' + t("privacy") + '</a></p></div>' +
    '</div><div class="footer-bottom"><p>© 2026 Women Safety Bangladesh. This platform never contacts emergency services on your behalf.</p></div></div></footer>';
}

function toggleLang() {
  setLang(LANG === "bn" ? "en" : "bn");
  renderRoute();
}

function doLogout() {
  clearSession();
  toast(LANG === "bn" ? "লগআউট হয়েছে" : "Signed out", "success");
  navigate("");
}

async function refreshUnread() {
  if (!token) return;
  try {
    const data = await api("/api/notifications/unread-count");
    window.__unreadCount = data.count || 0;
    const dot = document.getElementById("navUnread");
    if (dot) dot.textContent = window.__unreadCount;
  } catch { /* notification badge is non-critical */ }
}

/* ─── Router ─────────────────────────────────────────────────────────────── */

function currentRoute() {
  return window.location.hash.replace(/^#\/?/, "").split("?")[0];
}

function renderRoute() {
  const route = currentRoute();
  const head = route.split("/")[0];
  const fn = routes[route] || routes[head] || routes[""];
  if (!fn) { routes[""](); return; }
  fn();
}

window.addEventListener("hashchange", renderRoute);

/* ─── PWA ────────────────────────────────────────────────────────────────── */

function registerPwa() {
  if (!localStorage.getItem("installationId")) {
    localStorage.setItem("installationId", crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* offline shell is optional */ });
  }
}
