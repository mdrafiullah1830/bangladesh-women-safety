/* Women Safety BD — emergency pages: dashboard, SOS, report, incidents, tools, trips, share, contacts */

/* ─── shared helpers ─────────────────────────────────────────────────────── */

function emgText(bn, en) { return LANG === "bn" ? bn : en; }

function emgVal(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function emgChecked(id) {
  const el = document.getElementById(id);
  return !!(el && el.checked);
}

function emgSink(id) { return document.getElementById(id); }

function emgSection(inner) {
  return '<section class="section"><div class="container">' + inner + "</div></section>";
}

function emgHead(title, sub, backHref) {
  return '<div class="page-head">' + (backHref ? '<a class="small" href="' + backHref + '">&larr; ' + esc(emgText("ফিরে যান", "Go back")) + "</a>" : "") +
    '<div class="page-title">' + esc(title) + "</div>" + (sub ? '<div class="page-sub muted">' + esc(sub) + "</div>" : "") + "</div>";
}

function emgField(label, control, hint) {
  return '<div class="form-group"><label>' + esc(label) + "</label>" + control + (hint ? '<div class="small muted" style="margin-top:4px">' + esc(hint) + "</div>" : "") + "</div>";
}

function emgCard(title, body, extra) {
  return '<div class="card"' + (extra ? ' style="' + extra + '"' : "") + ">" + (title ? '<div class="card-header">' + title + "</div>" : "") + body + "</div>";
}

function emgKpi(value, label) {
  return '<div class="kpi"><div class="kpi-value">' + esc(value === null || value === undefined ? "—" : value) + '</div><div class="kpi-label">' + esc(label) + "</div></div>";
}

function emgIdem() {
  try { if (crypto.randomUUID) return crypto.randomUUID(); } catch { /* insecure context */ }
  return "idem-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function emgGeo(timeout) {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }), () => resolve(null), { timeout: timeout || 8000, enableHighAccuracy: true }
    );
  });
}

function emgBusy(id, on) {
  const btn = emgSink(id);
  if (!btn) return;
  if (on) {
    btn.dataset.label = btn.textContent;
    btn.disabled = true;
    btn.textContent = t("loading");
  } else {
    btn.disabled = false;
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }
}

function emgErr(error) { toast(apiErrorMessage(error), "error"); }

function emgEvery(fn, ms) {
  const id = setInterval(fn, ms);
  window.__emgTimers = window.__emgTimers || [];
  window.__emgTimers.push(id);
  return id;
}

function emgStopAllTimers() {
  (window.__emgTimers || []).forEach(id => clearInterval(id));
  window.__emgTimers = [];
  window.__emgCountTimer = null;
}

/* a single shared countdown ticker — re-rendering never stacks duplicates */
function emgCountdownsOn() {
  if (window.__emgCountTimer) return;
  window.__emgCountTimer = setInterval(emgUpdateCountdowns, 1000);
  window.__emgTimers.push(window.__emgCountTimer);
}

function emgCountdownText(ms) {
  if (ms <= 0) return emgText("মেয়াদ শেষ", "expired");
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = n => String(n).padStart(2, "0");
  return h > 0 ? h + ":" + pad(m) + ":" + pad(s) : m + ":" + pad(s);
}

function emgUpdateCountdowns() {
  document.querySelectorAll("[data-exp]").forEach(el => {
    const exp = new Date(el.getAttribute("data-exp")).getTime();
    el.textContent = emgCountdownText(exp - Date.now());
  });
}

function emgNumCard(n) {
  return '<div class="em-card"><div class="info"><h3>' + esc(n.service || n.serviceEn) + "</h3>" + (n.serviceBn ? '<div class="bn">' + esc(n.serviceBn) + "</div>" : "") +
    (n.note ? '<div class="small muted" style="margin-top:4px">' + esc(n.note) + "</div>" : "") + "</div>" +
    '<a class="dial" href="' + esc(n.dialUri || "tel:" + n.number) + '">' + esc(n.number) + "</a></div>";
}

function emgLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function emgFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(emgText("ফাইল পড়া যায়নি", "Could not read the file")));
    reader.readAsDataURL(file);
  });
}

function emgDataUrlToBlobUrl(dataUrl, contentType) {
  try {
    const raw = dataUrl.indexOf(",") >= 0 ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl;
    const bin = atob(raw);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: contentType || "application/octet-stream" }));
  } catch { return null; }
}

function emgPreviewUrl(data) {
  const blobUrl = emgDataUrlToBlobUrl(data.base64, data.contentType);
  if (blobUrl) return blobUrl;
  const raw = String(data.base64 || "");
  const payload = raw.indexOf(",") >= 0 ? raw.slice(raw.indexOf(",") + 1) : raw;
  if (!payload) return null;
  return "data:" + (data.contentType || "application/octet-stream") + ";base64," + payload;
}

function emgDistrictFill(selectId, selected) {
  ensureDistricts().then(() => {
    const el = emgSink(selectId);
    if (!el) return;
    el.outerHTML = districtSelectHtml(selectId, selected || "");
    const fresh = emgSink(selectId);
    if (fresh && fresh.options[0]) fresh.options[0].text = emgText("— জেলা নির্বাচন —", "— Select district —");
  }).catch(() => { /* districts stay empty; the form still submits without one */ });
}

function emgCategoryOptions(selected) {
  return EMG_CATEGORIES.map(c =>
    '<option value="' + c + '"' + (selected === c ? " selected" : "") + ">" + esc(categoryLabel(c)) + "</option>"
  ).join("");
}

function emgPrivacyOptions(selected) {
  const rows = [
    ["MAXIMUM_PRIVACY", emgText("সর্বোচ্চ প্রাইভেসি — কোনো স্থান নয়", "Maximum privacy — no location")], ["BALANCED", emgText("ভারসাম্য — মোটামুটি এলাকা", "Balanced — approximate area")],
    ["SHARE_EXACT_LOCATION", emgText("সঠিক অবস্থান শেয়ার", "Share exact location")]
  ];
  return rows.map(r =>
    '<option value="' + r[0] + '"' + (selected === r[0] ? " selected" : "") + ">" + esc(r[1]) + "</option>"
  ).join("");
}

function emgKindOf(contentType) {
  const c = String(contentType || "").toLowerCase();
  if (c.startsWith("image/")) return "IMAGE";
  if (c.startsWith("video/")) return "VIDEO";
  if (c.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

function emgBytes(size) {
  if (!size && size !== 0) return "—";
  if (size < 1024) return size + " B";
  if (size < 1048576) return (size / 1024).toFixed(1) + " KB";
  return (size / 1048576).toFixed(1) + " MB";
}

/* allowed status moves — mirrors IncidentCaseController.AllowedTransitions */
var EMG_TRANSITIONS = {
  DRAFT: ["OPEN", "CLOSED"], OPEN: ["AWAITING_VERIFICATION", "EMERGENCY_ACTIVE", "CLOSED"],
  EMERGENCY_ACTIVE: ["EMERGENCY_CANCELLED", "OPEN", "AWAITING_VERIFICATION"], EMERGENCY_CANCELLED: ["OPEN", "CLOSED"],
  AWAITING_VERIFICATION: ["VERIFIED", "REJECTED", "OPEN"], VERIFIED: ["POLICE_REFERRED", "RESOLVED", "CLOSED"],
  POLICE_REFERRED: ["RESOLVED", "CLOSED"], RESOLVED: ["CLOSED"], CLOSED: [], DUPLICATE: [], REJECTED: ["OPEN"]
};

var EMG_CATEGORIES = [
  "HARASSMENT", "STALKING", "DOMESTIC_VIOLENCE", "SEXUAL_ASSAULT", "CYBER_HARASSMENT", "WORKPLACE_HARASSMENT", "ACID_ATTACK", "TRAFFICKING", "ROBBERY", "ROAD_ACCIDENT", "OTHER"
];

/* ─── shared cleanup (navigation away / unload) ──────────────────────────── */

window.__emgTimers = [];
window.__sosState = { incident: null, dispatch: null, contacts: null, error: null };
window.__sosHold = { phase: "idle", startedAt: 0, countdownAt: 0, viaTap: false, timer: null };
window.__sosWatch = null;

window.__sosRelease = function () { window.sosPointerUp(); };

function emgSosUnbind() {
  ["pointerup", "pointercancel", "touchend", "touchcancel"].forEach(ev =>
    window.removeEventListener(ev, window.__sosRelease));
}

function emgSosAbortSilent() { emgSosAbort(); }

function emgStopVoice() {
  const r = window.__voice;
  window.__voiceWanted = false;
  if (r) { try { r.stop(); } catch { /* already stopped */ } }
  window.__voice = null;
}

function emgStopShake() {
  if (window.__shake) {
    window.removeEventListener("devicemotion", window.__shake);
    window.__shake = null;
  }
}

function emgStopFakeCall() {
  if (window.__fakeCallTimer) { clearTimeout(window.__fakeCallTimer); window.__fakeCallTimer = null; }
  if (window.__fakeRing) { clearInterval(window.__fakeRing); window.__fakeRing = null; }
  if (window.__fakeVibe) { clearInterval(window.__fakeVibe); window.__fakeVibe = null; }
  if (window.__fakeAudio) { try { window.__fakeAudio.close(); } catch { /* already closed */ } window.__fakeAudio = null; }
  const layer = document.getElementById("fakeCallLayer");
  if (layer) layer.remove();
}

window.addEventListener("hashchange", function () {
  emgStopAllTimers();
  emgStopFakeCall();
  emgStopVoice();
  emgSosAbortSilent();
});

window.addEventListener("pagehide", function () {
  emgStopAllTimers();
  emgStopFakeCall();
  emgStopVoice();
  emgStopShake();
  if (window.__sosWatch !== null && window.__sosWatch !== undefined) {
    try { navigator.geolocation.clearWatch(window.__sosWatch); } catch { /* unavailable */ }
    window.__sosWatch = null;
  }
});

/* ─── 1. Dashboard ───────────────────────────────────────────────────────── */

async function renderEmergencyDashboard() {
  if (!token) { navigate("login"); return; }
  emgStopAllTimers();

  document.getElementById("app").innerHTML =
    shell(emgSection('<div id="dashBody">' + spinner() + "</div>"), "dashboard");

  try {
    const data = await Promise.all([
      api("/api/incidents?take=50"), api("/api/trips"), api("/api/notifications/unread-count"), api("/api/directory/numbers?lang=" + LANG)
    ]);
    const sink = emgSink("dashBody");
    if (!sink) return;

    const incidents = data[0] || [];
    const trips = data[1] || [];
    const unread = (data[2] && data[2].count) || 0;
    const numbers = (data[3] || []).slice(0, 4);
    const emergencies = incidents.filter(row => row.isEmergency).length;
    const activeTrips = trips.filter(row => row.status === "ACTIVE");
    const recent = incidents.slice(0, 5);
    const trip = activeTrips[0];

    sink.innerHTML = dashHeroHtml() + '<div class="grid grid-4" style="margin-top:24px">' +
      emgKpi(incidents.length, emgText("মোট ঘটনা", "Total incidents")) + emgKpi(emergencies, emgText("জরুরি সক্রিয়", "Emergencies")) +
      emgKpi(activeTrips.length, emgText("সক্রিয় যাত্রা", "Active trips")) + emgKpi(unread, emgText("অপঠিত নোটিফিকেশন", "Unread notifications")) +
      "</div>" + (trip ? '<div style="margin-top:24px">' + dashTripHtml(trip) + "</div>" : "") +
      '<div style="margin-top:24px">' + emgCard("🕘 " + emgText("সাম্প্রতিক কার্যক্রম", "Recent activity"), recent.length
          ? '<div class="stack">' + recent.map(dashIncidentRow).join("") + "</div>"
          : emptyState(emgText("এখনো কোনো ঘটনা নেই", "No incidents yet"),
            '<a class="btn btn-primary btn-sm" style="margin-top:12px" href="#/report">' + emgText("প্রতিবেদন করুন", "File a report") + "</a>")) + "</div>" + (numbers.length
        ? '<div style="margin-top:24px"><div class="grid grid-2">' + numbers.map(emgNumCard).join("") + "</div></div>"
        : "");

    emgCountdownsOn();
  } catch (e) {
    const sink = emgSink("dashBody");
    if (sink) {
      sink.innerHTML = emptyState(apiErrorMessage(e), '<button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="renderEmergencyDashboard()">' + t("retry") + "</button>");
    }
  }
}

function dashHeroHtml() {
  const tiles = [
    ["📝", emgText("প্রতিবেদন করুন", "Report incident"), "#/report"], ["📒", t("directory"), "#/directory"],
    ["🗂️", emgText("আমার ঘটনা", "My incidents"), "#/incidents"], ["🚶", t("trips"), "#/trips"],
    ["📍", emgText("লোকেশন শেয়ার", "Share location"), "#/share"], ["🧰", emgText("নিরাপত্তা টুলস", "Safety tools"), "#/tools"]
  ];
  return '<div class="flex-center" style="flex-direction:column;gap:12px;padding-top:8px">' +
    '<button class="sos-btn" onclick="navigate(\'emergency\')">' + '<span class="sos-icon">🚨</span><span>SOS</span>' +
    '<span class="sos-sub">' + emgText("জরুরি সহায়তা", "Emergency help") + "</span></button>" +
    '<p class="small muted text-center" style="max-width:520px">' + emgText("বিপদে পড়লে SOS চাপুন — বিশ্বস্ত পরিচিতিকে সঙ্গে সঙ্গে জানানো হবে।",
      "Press SOS in danger — your trusted contacts are alerted straight away.") + "</p></div>" + '<div class="grid grid-3" style="margin-top:24px">' + tiles.map(tile =>
      '<a href="' + tile[2] + '" class="card" style="text-align:center;padding:18px">' + '<div style="font-size:1.6rem">' + tile[0] + "</div>" +
      '<strong style="display:block;margin-top:6px;font-size:.95rem">' + esc(tile[1]) + "</strong></a>"
    ).join("") + "</div>";
}

function dashTripHtml(trip) {
  const overdue = trip.status === "AUTO_ESCALATED" ||
    (trip.expectedArrivalAt && new Date(trip.expectedArrivalAt).getTime() < Date.now());
  return emgCard("🚶 " + emgText("সক্রিয় যাত্রা", "Active trip"), '<div class="flex-between" style="flex-wrap:wrap;gap:12px">' +
    "<div><strong>" + esc(trip.title) + "</strong> " + statusBadge(trip.status) + '<div class="small muted">' + esc(trip.destinationText || "") + " · " +
    emgText("পৌঁছার সময়", "ETA") + " " + esc(fmtDate(trip.expectedArrivalAt, true)) + "</div>" +
    '<div class="small" ' + (overdue ? 'style="color:var(--danger)"' : 'style="color:var(--text-sec)"') + ">" +
    emgText("বাকি সময়: ", "Time left: ") + '<span data-exp="' + esc(trip.expectedArrivalAt) + '">—</span></div></div>' +
    '<div class="flex" style="gap:8px">' + '<button class="btn btn-primary" onclick="dashCheckIn(\'' + trip.id + '\')">' +
    emgText("এখনই চেক-ইন", "Check in now") + "</button>" + '<a class="btn btn-outline btn-sm" href="#/trips">' + t("open") + "</a></div></div>");
}

window.dashCheckIn = async function (tripId) {
  try {
    await api("/api/trips/" + tripId + "/checkin", { method: "POST", body: JSON.stringify({ respondent: "USER" }) });
    toast(emgText("চেক-ইন সংরক্ষিত হয়েছে", "Check-in saved"), "success");
    renderEmergencyDashboard();
  } catch (e) { emgErr(e); }
};

function dashIncidentRow(row) {
  return '<a class="list-item" href="#/incidents/' + row.id + '" style="text-decoration:none;color:inherit">' +
    '<div class="list-main"><div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">' +
    '<strong class="mono">' + esc(row.incidentReference) + "</strong>" + (row.isEmergency ? '<span class="badge badge-danger">SOS</span>' : "") + statusBadge(row.status) + "</div>" +
    '<div class="list-meta">' + esc(row.description || row.addressText || emgText("বিবরণ নেই", "No description")) + " · " + esc(fmtDate(row.createdAt, true)) + "</div></div>" +
    '<div class="list-actions"><span class="btn btn-outline btn-sm">' + t("open") + "</span></div></a>";
}

/* ─── 2. Emergency (SOS) ─────────────────────────────────────────────────── */

function emgSosRing(progress, num, sub) {
  const ring = emgSink("sosRing");
  if (ring) {
    const deg = Math.max(0, Math.min(360, Math.round(progress * 360)));
    ring.style.background = "conic-gradient(var(--danger) " + deg + "deg, var(--border) 0deg)";
  }
  const n = emgSink("sosRingNum");
  if (n) n.textContent = num;
  const s = emgSink("sosRingSub");
  if (s) s.textContent = sub;
}

function emgSosResetRing() {
  emgSosRing(0, "3", emgText("৩ সেকেন্ড ধরে রাখুন", "Hold for 3 seconds"));
}

async function renderSosPage() {
  if (!token) { navigate("login"); return; }
  emgStopAllTimers();

  document.getElementById("app").innerHTML =
    shell(emgSection('<div id="sosBody">' + spinner() + "</div>"), "emergency");

  try {
    if (!window.__sosState.incident) {
      const list = await api("/api/incidents?take=15");
      const active = (list || []).find(row => row.status === "EMERGENCY_ACTIVE");
      if (active) window.__sosState.incident = active;
    }
    const sink = emgSink("sosBody");
    if (!sink) return;

    if (window.__sosState.incident) {
      sink.innerHTML = sosActiveHtml(window.__sosState.incident, window.__sosState.dispatch);
      emgCountdownsOn();
      sosLoadContacts();
      return;
    }

    sink.innerHTML = sosIdleHtml(window.__sosState.error);
    emgSosResetRing();
  } catch (e) {
    const sink = emgSink("sosBody");
    if (sink) {
      sink.innerHTML = emptyState(apiErrorMessage(e), '<button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="renderSosPage()">' + t("retry") + "</button>");
    }
  }
}

function sosIdleHtml(error) {
  return emgHead(t("emergency"), emgText("৩ সেকেন্ড ধরে রাখুন অথবা ট্যাপ করে নিশ্চিত করুন — ১০ সেকেন্ডে বাতিল করা যাবে",
      "Hold for 3 seconds or tap to confirm — you get 10 seconds to cancel")) + '<div class="card text-center" style="max-width:520px;margin:0 auto">' + (error
      ? '<div class="alert alert-danger" style="margin-bottom:16px">' + esc(error) +
        '<div class="small" style="margin-top:6px">' + emgText("আবার চেষ্টা করুন।", "Please try again.") + "</div>" +
        '<button class="btn btn-danger btn-sm" style="margin-top:10px" onclick="startSos()">' + t("retry") + "</button></div>"
      : "") + '<div class="flex-center" style="flex-direction:column;gap:14px">' +
    '<button id="sosHoldBtn" class="sos-btn" style="touch-action:none;user-select:none;-webkit-user-select:none"' +
    ' onpointerdown="sosPointerDown()" onpointerleave="sosPointerUp()"' + ' ontouchstart="sosPointerDown()" ontouchend="sosPointerUp()">' +
    '<span class="sos-icon">🚨</span><span>SOS</span>' + '<span class="sos-sub">' + emgText("ধরে রাখুন", "press & hold") + "</span></button>" +
    '<div class="count-ring" id="sosRing" style="width:120px;height:120px;border-radius:50%;padding:6px;' + 'background:conic-gradient(var(--border) 0deg)">' +
    '<div style="width:100%;height:100%;border-radius:50%;background:var(--surface);display:flex;' + 'flex-direction:column;align-items:center;justify-content:center">' +
    '<div class="count-num" id="sosRingNum" style="font-size:1.5rem;font-weight:800;color:var(--danger)">3</div>' +
    '<div class="count-sub small muted" id="sosRingSub">' + emgText("৩ সেকেন্ড ধরে রাখুন", "Hold for 3 seconds") + "</div></div></div>" +
    '<button class="btn btn-outline" onclick="sosTapConfirm()">' + emgText("ট্যাপ করে নিশ্চিত করুন", "Tap to confirm") + "</button>" + '<p class="small muted" style="max-width:420px">' +
    emgText("প্ল্যাটফর্ম কোনো জরুরি সেবার সঙ্গে যোগাযোগ করে না — শুধু বিশ্বস্ত পরিচিতিকে অ্যালার্ট ও কল শর্টকাট তৈরি হয়।",
      "The platform never contacts emergency services — it alerts your trusted contacts and creates a call shortcut.") + "</p></div></div>" +
    '<div class="grid grid-2" style="margin-top:24px;max-width:820px;margin-left:auto;margin-right:auto">' + emgCard("📞 " + emgText("জরুরি নম্বর", "Emergency numbers"),
      '<a class="btn btn-danger btn-lg" href="tel:999" style="width:100%;justify-content:center">📞 999</a>' + '<p class="small muted" style="margin-top:10px">' +
      emgText("পুলিশ · ফায়ার · অ্যাম্বুলেন্স — সারা বাংলাদেশ", "Police · Fire · Ambulance — nationwide") + "</p>") +
    emgCard("📍 " + emgText("লোকেশন শেয়ার", "Share location"), '<p class="small muted" style="margin-bottom:10px">' +
      emgText("নিরাপদে থাকতে লাইভ লিংক পাঠান।", "Send a live link so someone can watch over you.") + "</p>" +
      '<a class="btn btn-outline" href="#/share">' + emgText("শেয়ার পেজ খুলুন", "Open share page") + "</a>") + "</div>";
}

function sosActiveHtml(incident, dispatch) {
  const reference = incident.incidentReference || incident.reference || "—";
  const notice = dispatch && dispatch.notice
    ? dispatch.notice
    : emgText("কোনো জরুরি সেবা প্ল্যাটফর্মের পক্ষে যোগাযোগ করা হয়নি।", "No emergency service has been contacted by the platform.");
  const dial = (dispatch && dispatch.emergencyDialUri) || "tel:999";
  const sms = dispatch && dispatch.smsOneTapUri ? dispatch.smsOneTapUri : null;

  return emgHead(t("emergency"), emgText("সক্রিয় জরুরি অবস্থা", "Active emergency state")) + '<div class="card" style="max-width:760px;margin:0 auto;border-left:6px solid var(--danger)">' +
    '<div class="card-header">🚨 ' + emgText("জরুরি সক্রিয়", "Emergency active") + "</div>" +
    '<div class="panel" style="margin-bottom:16px"><div class="kv">' + '<div class="kv-row"><span class="k">' + emgText("রেফারেন্স", "Reference") +
    '</span><span class="v mono">' + esc(reference) + "</span></div>" + '<div class="kv-row"><span class="k">' + t("status") +
    '</span><span class="v">' + statusBadge(incident.status || "EMERGENCY_ACTIVE") + "</span></div>" +
    '<div class="kv-row"><span class="k">' + t("date") + '</span><span class="v">' + esc(fmtDate(incident.createdAt, true)) + "</span></div>" +
    "</div></div>" + '<div class="alert alert-warn" style="margin-bottom:16px">' + esc(notice) + "</div>" + '<div class="flex" style="gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
    '<a class="btn btn-danger btn-lg" href="' + esc(dial) + '">📞 ' + emgText("৯৯৯ এ কল করুন", "Call 999") + "</a>" +
    (sms ? '<a class="btn btn-accent btn-lg" href="' + esc(sms) + '">' + emgText("SMS পাঠান", "Send SMS") + "</a>" : "") +
    '<button class="btn btn-outline" onclick="sosShareLocation()">' + emgText("লাইভ লোকেশন শেয়ার", "Share live location") + "</button>" +
    '<a class="btn btn-white" href="#/incidents/' + esc(incident.id) + '">' + emgText("ঘটনা দেখুন", "View incident") + "</a>" +
    "</div>" + '<label style="display:flex;gap:8px;align-items:center;font-size:.92rem;margin-bottom:12px">' +
    '<input type="checkbox" id="sosWatchBox"' + (window.__sosWatch !== null ? " checked" : "") + ' onchange="sosToggleWatch(this.checked)"> ' +
    emgText("জরুরি অবস্থায় আমার লোকেশন শেয়ার করুন", "Share my location during this emergency") + "</label>" + '<div id="sosShareOut"></div>' +
    '<div class="divider"></div>' + '<h4 style="margin-bottom:8px">' + emgText("বিশ্বস্ত পরিচিতি", "Trusted contacts") + "</h4>" +
    '<div id="sosContacts"><p class="small muted">' + t("loading") + "</p></div>" + '<div class="divider"></div>' + '<div class="danger-zone" style="margin-top:14px">' +
    '<button class="btn btn-outline" style="width:100%;justify-content:center;color:var(--danger);border-color:var(--danger)"' +
    ' onclick="sosCancel()">' + emgText("জরুরি অবস্থা বাতিল করুন", "Cancel emergency") + "</button>" +
    '<p class="small muted" style="margin-top:8px">' + emgText("ভুল হয়েছে বা বিপদ পেরিয়ে গেছেন? বাতিল করুন — ইতিহাস থেকে যাবে।",
      "False alarm or safe now? Cancel it — the history is kept.") + "</p></div>" + "</div>";
}

async function sosLoadContacts() {
  const box = emgSink("sosContacts");
  if (!box) return;
  try {
    const contacts = await api("/api/contacts");
    window.__sosState.contacts = contacts;
    if (!contacts.length) {
      box.innerHTML = emptyState(emgText("কোনো বিশ্বস্ত পরিচিতি নেই — এখনই যোগ করুন", "No trusted contacts yet — add one now"),
        '<a class="btn btn-primary btn-sm" style="margin-top:10px" href="#/contacts">' + emgText("পরিচিতি যোগ করুন", "Add contact") + "</a>");
      return;
    }
    const notified = window.__sosState.dispatch
      ? Number(window.__sosState.dispatch.contactsNotified) || 0
      : 0;
    box.innerHTML = (notified
      ? '<p class="small" style="color:var(--success);margin-bottom:8px">✓ ' + notified + " " + emgText("জন পরিচিতিকে অ্যালার্ট পাঠানো হয়েছে", "trusted contact(s) alerted") + "</p>"
      : '<p class="small muted" style="margin-bottom:8px">' + emgText("এই পরিচিতিদের কাছে জরুরি অ্যালার্ট যাওয়ার কথা।", "These contacts receive your emergency alert.") + "</p>") +
      '<div class="stack">' + contacts.map(c =>
        '<div class="list-item"><div class="list-main">' + "<strong>" + esc(c.displayName) + "</strong>" +
        (c.relationship ? ' <span class="badge badge-muted">' + esc(c.relationship) + "</span>" : "") +
        (Number(c.priority) === 1 ? ' <span class="chip">' + emgText("প্রাথমিক", "Primary") + "</span>" : "") +
        '<div class="list-meta mono">' + esc(c.phoneNumberMasked || "") + "</div></div>" +
        '<div class="list-actions"><span class="badge badge-warning">' + emgText("অ্যালার্ট", "Alerts") + "</span></div></div>"
      ).join("") + "</div>";
  } catch (e) {
    box.innerHTML = '<p class="small muted">' + esc(apiErrorMessage(e)) + "</p>";
  }
}

window.sosPointerDown = function () {
  if (!token) { navigate("login"); return; }
  if (window.__sosState.incident) return;
  const h = window.__sosHold;
  if (h.phase === "count" && h.viaTap) {
    emgSosAbort();
    toast(emgText("SOS বাতিল করা হয়েছে", "SOS cancelled"), "");
    return;
  }
  if (h.phase !== "idle") return;
  h.phase = "hold";
  h.viaTap = false;
  h.startedAt = Date.now();
  h.countdownAt = 0;
  ["pointerup", "pointercancel", "touchend", "touchcancel"].forEach(ev =>
    window.addEventListener(ev, window.__sosRelease));
  h.timer = emgEvery(emgSosTick, 100);
  emgSosTick();
};

function emgSosTick() {
  const h = window.__sosHold;
  const now = Date.now();
  if (h.phase === "hold") {
    const elapsed = now - h.startedAt;
    if (elapsed < 3000) {
      emgSosRing(elapsed / 3000, ((3000 - elapsed) / 1000).toFixed(1), emgText("ধরে রাখুন…", "Keep holding…"));
      return;
    }
    h.phase = "count";
    h.countdownAt = now;
  }
  if (h.phase === "count") {
    const left = 10000 - (now - h.countdownAt);
    if (left <= 0) {
      emgSosUnbind();
      if (h.timer) clearInterval(h.timer);
      h.timer = null;
      h.phase = "idle";
      window.startSos();
      return;
    }
    emgSosRing(1 - left / 10000, String(Math.ceil(left / 1000)),
      h.viaTap ? emgText("আবার ট্যাপ করে বাতিল করুন", "Tap again to cancel") : emgText("ছাড়লে বাতিল হবে", "Release to cancel"));
  }
}

function emgSosAbort() {
  emgSosUnbind();
  const h = window.__sosHold;
  if (h.timer) clearInterval(h.timer);
  h.timer = null;
  h.phase = "idle";
  h.viaTap = false;
  emgSosResetRing();
}

window.sosPointerUp = function () {
  const h = window.__sosHold;
  if (h.phase === "idle") return;
  if (h.viaTap && h.phase === "count") return;
  emgSosAbort();
  toast(emgText("SOS বাতিল করা হয়েছে", "SOS cancelled"), "");
};

window.sosTapConfirm = function () {
  if (window.__sosState.incident) return;
  const ok = window.confirm(emgText(
    "জরুরি সহায়তা চালু করবেন? ১০ সেকেন্ডের মধ্যে বাতিল করা যাবে।", "Start emergency mode? You can cancel within 10 seconds."));
  if (!ok) return;
  const h = window.__sosHold;
  if (h.phase !== "idle") return;
  h.phase = "count";
  h.viaTap = true;
  h.startedAt = Date.now();
  h.countdownAt = Date.now();
  h.timer = emgEvery(emgSosTick, 100);
  emgSosTick();
};

window.startSos = async function () {
  if (window.__sosState.incident) return;
  try {
    const geo = await emgGeo(6000);
    const body = {
      isEmergency: true, notifyTrustedContacts: true, privacyMode: "BALANCED", idempotencyKey: emgIdem()
    };
    if (geo) {
      body.latitude = geo.latitude;
      body.longitude = geo.longitude;
      body.accuracyMeters = geo.accuracy;
      body.locationSource = "GPS";
    }
    const result = await api("/api/emergency", { method: "POST", body: JSON.stringify(body) });
    const incident = (result && result.incident) || result;
    if (!incident || !incident.id) throw new Error(t("error"));
    window.__sosState = {
      incident: incident, dispatch: (result && result.dispatch) || null, contacts: null, error: null
    };
    toast(emgText("জরুরি অবস্থা সক্রিয় হয়েছে", "Emergency activated"), "success");
    notifyMe(emgText("জরুরি অবস্থা সক্রিয়", "Emergency active"),
      (incident.incidentReference || "") + " — " + emgText("বিশ্বস্ত পরিচিতিকে জানানো হয়েছে", "trusted contacts notified"), "#/emergency");
    renderSosPage();
  } catch (e) {
    window.__sosState.error = apiErrorMessage(e);
    toast(window.__sosState.error, "error");
    renderSosPage();
  }
};

window.sosCancel = async function () {
  const incident = window.__sosState.incident;
  if (!incident) return;
  const ok = window.confirm(emgText(
    "জরুরি অবস্থা বাতিল করবেন? বিশ্বস্ত পরিচিতিকে পুনরায় জানানো হবে না।", "Cancel this emergency? Trusted contacts will not be re-alerted."));
  if (!ok) return;
  try {
    await api("/api/emergency/" + incident.id + "/cancel", {
      method: "POST", body: JSON.stringify({ reason: emgText("ব্যবহারকারী বাতিল করেছেন", "Cancelled by user") })
    });
    if (window.__sosWatch !== null && window.__sosWatch !== undefined) {
      try { navigator.geolocation.clearWatch(window.__sosWatch); } catch { /* unavailable */ }
      window.__sosWatch = null;
    }
    window.__sosState = { incident: null, dispatch: null, contacts: null, error: null };
    toast(emgText("জরুরি অবস্থা বাতিল হয়েছে", "Emergency cancelled"), "success");
    renderSosPage();
  } catch (e) { emgErr(e); }
};

window.sosToggleWatch = function (on) {
  const incident = window.__sosState.incident;
  if (!incident) return;
  if (!on) {
    if (window.__sosWatch !== null && window.__sosWatch !== undefined) {
      try { navigator.geolocation.clearWatch(window.__sosWatch); } catch { /* unavailable */ }
      window.__sosWatch = null;
    }
    toast(emgText("লাইভ লোকেশন বন্ধ", "Live location off"), "");
    return;
  }
  if (!navigator.geolocation) {
    toast(emgText("এই ব্রাউজারে জিপিএস নেই", "GPS unavailable in this browser"), "error");
    const box = emgSink("sosWatchBox");
    if (box) box.checked = false;
    return;
  }
  let lastSent = 0;
  window.__sosWatch = navigator.geolocation.watchPosition(pos => {
    const now = Date.now();
    if (now - lastSent < 15000) return;
    lastSent = now;
    api("/api/emergency/" + incident.id + "/location", {
      method: "POST", body: JSON.stringify({
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy, accuracyMeters: pos.coords.accuracy, source: "GPS"
      })
    }).catch(() => { /* a dropped fix is retried on the next tick */ });
  }, () => {
    toast(emgText("লোকেশন পাওয়া যায়নি", "Location permission denied"), "error");
    const box = emgSink("sosWatchBox");
    if (box) box.checked = false;
    window.__sosWatch = null;
  }, { enableHighAccuracy: true, maximumAge: 10000 });
  toast(emgText("লাইভ লোকেশন চালু হয়েছে", "Live location on"), "success");
};

window.sosShareLocation = async function () {
  const incident = window.__sosState.incident;
  if (!incident) return;
  try {
    const geo = await emgGeo(8000);
    if (!geo) {
      toast(emgText("লোকেশন পাওয়া যায়নি — অনুমতি দিন", "Location unavailable — please allow permission"), "error");
      return;
    }
    const share = await api("/api/shares", {
      method: "POST", body: JSON.stringify({
        note: emgText("জরুরি অবস্থার লাইভ লোকেশন", "Live location during emergency"), latitude: geo.latitude, longitude: geo.longitude, validityMinutes: 120, maxViews: 50
      })
    });
    const url = window.location.origin + "/#/track/" + share.token;
    const out = emgSink("sosShareOut");
    if (out) {
      out.innerHTML = '<div class="alert alert-info"><div class="small mono" style="word-break:break-all">' + esc(url) + "</div>" +
        '<div class="flex" style="gap:8px;margin-top:8px;flex-wrap:wrap">' +
        '<button class="btn btn-primary btn-sm" onclick="shareCopy(\'' + url + '\')">' + emgText("কপি করুন", "Copy link") + "</button>" +
        '<a class="btn btn-outline btn-sm" href="sms:?body=' + encodeURIComponent(url) + '">SMS</a>' + "</div></div>";
    }
    toast(emgText("শেয়ার লিংক তৈরি হয়েছে", "Share link created"), "success");
  } catch (e) { emgErr(e); }
};

/* ─── 3. Report ──────────────────────────────────────────────────────────── */

async function renderReportPage() {
  if (!token) { navigate("login"); return; }

  const now = emgLocalInput(new Date().toISOString());
  const steps =
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">' + '<div class="step active">' + emgText("১ · বিবরণ", "1 · Details") + "</div>" +
    '<div class="step">' + emgText("২ · প্রমাণ", "2 · Evidence") + "</div>" + '<div class="step">' + emgText("৩ · ট্র্যাক", "3 · Track") + "</div></div>";

  const body =
    emgHead(t("report"), emgText("ধাপে ধাপে নিরাপদ প্রতিবেদন তৈরি করুন", "File a report step by step")) + steps +
    '<div class="card" style="max-width:720px">' + '<div class="card-header">📝 ' + emgText("ঘটনার বিবরণ", "Incident details") + "</div>" +
    emgField(emgText("শিরোনাম", "Title") + ' <span style="color:var(--danger)">*</span>', '<input id="rpTitle" class="form-control" type="text" maxlength="200" placeholder="' +
      esc(emgText("যেমন: বাজারে হয়রানি", "e.g. Harassment near the market")) + '">') + emgField(t("category"),
      '<select id="rpCategory" class="form-control">' + emgCategoryOptions("HARASSMENT") + "</select>") + emgField(emgText("বিবরণ", "Description"),
      '<textarea id="rpDescription" class="form-control" rows="4" maxlength="4000" placeholder="' +
      esc(emgText("কী ঘটেছে, কবে, কে ছিল…", "What happened, when, who was involved…")) + '"></textarea>') +
    emgField(emgText("ঘটার সময়", "Occurred at"), '<input id="rpOccurred" class="form-control" type="datetime-local" value="' + now + '">') +
    '<div class="grid grid-2">' + emgField(t("district"), '<select id="rpDistrict" class="form-control"><option value="">' + esc(emgText("লোড হচ্ছে…", "Loading…")) + "</option></select>") +
    emgField(emgText("ঠিকানা", "Address"), '<input id="rpAddress" class="form-control" type="text" maxlength="512" placeholder="' +
      esc(emgText("এলাকা / রাস্তা", "Area / road")) + '">') + "</div>" +
    emgField(emgText("প্রাইভেসি মোড", "Privacy mode"), '<select id="rpPrivacy" class="form-control">' + emgPrivacyOptions("BALANCED") + "</select>") +
    '<label style="display:flex;gap:8px;align-items:flex-start;font-size:.92rem;margin-bottom:16px">' +
    '<input id="rpNotify" type="checkbox" checked> <span>' + emgText("বিশ্বস্ত পরিচিতিকে অ্যালার্ট পাঠান", "Notify my trusted contacts") +
    '<span class="small muted" style="display:block">' + emgText("সঙ্গে সঙ্গে একটি অ্যালার্ট যাবে এবং ঘটনার লিংক তৈরি হবে।",
      "They get an immediate alert with a link to this report.") + "</span></span></label>" + '<div class="alert alert-info small">' +
    emgText("সংরক্ষণের পরে প্রমাণ (ছবি/ডকুমেন্ট) যোগ করতে পারবেন।", "You can attach evidence (photos/documents) after saving.") + "</div>" +
    '<div class="flex" style="gap:10px;flex-wrap:wrap">' + '<button id="rpSubmit" class="btn btn-primary btn-lg" onclick="submitReport()">' +
    emgText("পরবর্তী ধাপ — সংরক্ষণ", "Next — save report") + "</button>" + '<a class="btn btn-outline" href="#/dashboard">' + emgText("বাতিল", "Cancel") + "</a></div>" + "</div>";

  document.getElementById("app").innerHTML = shell(emgSection(body), "report");
  emgDistrictFill("rpDistrict", "");
}

window.submitReport = async function () {
  const title = emgVal("rpTitle");
  if (!title) {
    toast(emgText("শিরোনাম আবশ্যক", "Title is required"), "error");
    const el = emgSink("rpTitle");
    if (el) el.focus();
    return;
  }
  emgBusy("rpSubmit", true);
  try {
    const privacyMode = emgVal("rpPrivacy") || "BALANCED";
    const address = emgVal("rpAddress");
    const create = {
      isEmergency: false, notifyTrustedContacts: emgChecked("rpNotify"), privacyMode: privacyMode, idempotencyKey: emgIdem()
    };
    if (address) { create.addressText = address; create.note = address; }
    if (privacyMode !== "MAXIMUM_PRIVACY") {
      const geo = await emgGeo(6000);
      if (geo) {
        create.latitude = geo.latitude;
        create.longitude = geo.longitude;
        create.accuracyMeters = geo.accuracy;
        create.locationSource = "GPS";
      }
    }

    const created = await api("/api/emergency", { method: "POST", body: JSON.stringify(create) });
    const id = created.incident.id;

    const report = {
      title: title, category: emgVal("rpCategory") || "OTHER", description: emgVal("rpDescription")
    };
    const occurred = emgVal("rpOccurred");
    if (occurred) {
      const iso = new Date(occurred).toISOString();
      if (!Number.isNaN(Date.parse(iso))) report.occurredAt = iso;
    }
    const district = emgVal("rpDistrict");
    if (district) report.districtId = district;
    if (address) report.addressText = address;

    await api("/api/incidents/" + id, { method: "PUT", body: JSON.stringify(report) });
    toast(emgText("প্রতিবেদন সংরক্ষিত হয়েছে — এখন প্রমাণ যোগ করুন", "Report saved — now add evidence"), "success");
    navigate("incidents/" + id);
  } catch (e) {
    emgErr(e);
  } finally {
    emgBusy("rpSubmit", false);
  }
};

/* ─── 4. Incidents (list + detail) ───────────────────────────────────────── */

async function renderIncidentsPage() {
  if (!token) { navigate("login"); return; }
  const parts = currentRoute().split("/");
  const id = parts[0] === "incidents" && parts[1] ? parts[1] : null;
  if (id) return renderIncidentDetail(id);
  return renderIncidentList();
}

async function renderIncidentList() {
  emgStopAllTimers();
  document.getElementById("app").innerHTML =
    shell(emgSection('<div id="incBody">' + spinner() + "</div>"), "incidents");
  try {
    const rows = await api("/api/incidents?take=50");
    const sink = emgSink("incBody");
    if (!sink) return;
    sink.innerHTML = emgHead(t("incidents"), emgText("আপনার জমা দেওয়া সব ঘটনা", "All reports you filed")) + (rows.length
        ? '<div class="card"><div class="table-wrap"><table><thead><tr>' + "<th>" + emgText("রেফারেন্স", "Reference") + "</th><th>" + t("status") + "</th>" +
          "<th>" + emgText("ধরন", "Type") + "</th><th>" + t("date") + "</th>" + "<th>" + emgText("বিবরণ", "Summary") + "</th><th>" + t("action") + "</th>" +
          "</tr></thead><tbody>" + rows.map(incListRow).join("") + "</tbody></table></div></div>"
        : emptyState(emgText("এখনো কোনো প্রতিবেদন নেই", "No reports yet"),
          '<a class="btn btn-primary btn-sm" style="margin-top:12px" href="#/report">' + emgText("নতুন প্রতিবেদন", "New report") + "</a>"));
  } catch (e) {
    const sink = emgSink("incBody");
    if (sink) {
      sink.innerHTML = emptyState(apiErrorMessage(e), '<button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="renderIncidentList()">' + t("retry") + "</button>");
    }
  }
}

function incListRow(row) {
  return "<tr>" + '<td class="mono nowrap"><a href="#/incidents/' + row.id + '">' + esc(row.incidentReference) + "</a></td>" +
    "<td>" + statusBadge(row.status) + "</td>" + "<td>" + (row.isEmergency
      ? '<span class="badge badge-danger">SOS</span>'
      : '<span class="badge badge-muted">' + emgText("সাধারণ", "Report") + "</span>") + "</td>" + '<td class="nowrap">' + esc(fmtDate(row.createdAt, true)) + "</td>" +
    '<td class="small">' + esc(String(row.description || row.addressText || "—").slice(0, 90)) + "</td>" +
    '<td><a class="btn btn-outline btn-sm" href="#/incidents/' + row.id + '">' + t("open") + "</a></td>" + "</tr>";
}

async function renderIncidentDetail(id) {
  emgStopAllTimers();
  document.getElementById("app").innerHTML =
    shell(emgSection('<div id="incBody">' + spinner() + "</div>"), "incidents");

  try {
    const data = await Promise.all([
      api("/api/incidents/" + id + "/detail"), api("/api/incidents/" + id + "/timeline"), api("/api/incidents/" + id), api("/api/incidents/" + id + "/evidence")
    ]);
    const sink = emgSink("incBody");
    if (!sink) return;
    const detail = data[0];
    const timeline = data[1] || [];
    const owner = data[2] || {};
    const evidence = data[3] || [];
    const isMod = !!(profile && (profile.role === "MODERATOR" || profile.role === "ADMIN"));

    window.__incDetail = detail;
    if (!detail.referral || detail.referral.reference !== window.__incLetterRef) window.__incLetter = null;
    window.__incEvidence = evidence;
    sink.innerHTML = incDetailHtml(detail, timeline, owner, evidence, isMod);
    emgDistrictFill("incDistrict", detail.districtId || "");
  } catch (e) {
    const sink = emgSink("incBody");
    if (sink) {
      sink.innerHTML = emptyState(apiErrorMessage(e), '<a class="btn btn-outline btn-sm" style="margin-top:12px" href="#/incidents">' + emgText("তালিকায় ফিরুন", "Back to list") + "</a>");
    }
  }
}

function incKv(label, value) {
  return '<div class="kv-row"><span class="k">' + esc(label) + '</span><span class="v">' + value + "</span></div>";
}

function incDetailHtml(detail, timeline, owner, evidence, isMod) {
  const canEdit = detail.status !== "CLOSED" && detail.status !== "REJECTED";
  const privacy = owner.privacyMode
    ? '<span class="badge badge-info">' + esc(owner.privacyMode) + "</span>"
    : "—";

  return emgHead(detail.title || detail.reference, detail.reference, "#/incidents") + '<div class="grid" style="grid-template-columns:1fr;gap:20px;max-width:900px">' +

    emgCard("📄 " + emgText("ঘটনার তথ্য", "Report"), '<div class="kv">' + incKv(emgText("রেফারেন্স", "Reference"), '<span class="mono">' + esc(detail.reference) + "</span>") +
      incKv(emgText("শিরোনাম", "Title"), esc(detail.title || "—")) + incKv(t("category"), esc(categoryLabel(detail.category))) +
      incKv(t("status"), statusBadge(detail.status) + " " + statusBadge(detail.verificationStatus)) +
      incKv(emgText("বিবরণ", "Description"), esc(detail.description || "—")) + incKv(emgText("স্থান", "Location"),
        esc(detail.districtName || detail.addressText || "—") + (detail.lastLatitude !== null && detail.lastLatitude !== undefined
          ? '<div class="small mono muted">' + detail.lastLatitude + ", " + detail.lastLongitude + "</div>"
          : "")) + incKv(emgText("ঘটার সময়", "Occurred"), esc(fmtDate(detail.occurredAt, true))) +
      incKv(emgText("তৈরির সময়", "Created"), esc(fmtDate(detail.createdAt, true))) + incKv(emgText("প্রাইভেসি", "Privacy"), privacy) +
      incKv(emgText("প্রতিবেদক", "Reported by"), esc((profile && profile.displayName) || "—")) + "</div>" + '<div class="flex" style="gap:8px;margin-top:14px;flex-wrap:wrap">' + (canEdit
        ? '<button class="btn btn-outline btn-sm" onclick="emgToggle(\'incEditBox\')">' + emgText("সম্পাদনা করুন", "Edit report") + "</button>"
        : "") + '<button class="btn btn-white btn-sm" onclick="incVote(true)">👍 ' + emgText("সহায়ক", "Helpful") + "</button>" +
      '<button class="btn btn-white btn-sm" onclick="incVote(false)">👎 ' + emgText("সহায়ক নয়", "Not helpful") + "</button>" + "</div>" +
      '<div id="incEditBox" class="hidden" style="margin-top:16px">' + incEditForm(detail) + "</div>") +

    emgCard("🔄 " + emgText("অবস্থা পরিবর্তন", "Status change"), incTransitionHtml(detail.status, isMod)) +

    emgCard("🕘 " + emgText("স্ট্যাটাস টাইমলাইন", "Status timeline"), incTimelineHtml(timeline)) +

    emgCard("📎 " + emgText("প্রমাণ", "Evidence"), incEvidenceHtml(evidence)) +

    emgCard("⚖️ " + emgText("পুলিশ রেফারেল", "Police referral"), incReferralHtml(detail)) +

    "</div>";
}

function incEditForm(detail) {
  return emgField(emgText("শিরোনাম", "Title"), '<input id="incTitle" class="form-control" type="text" maxlength="200" value="' + esc(detail.title || "") + '">') + emgField(t("category"),
      '<select id="incCategory" class="form-control">' + emgCategoryOptions(detail.category) + "</select>") +
    emgField(emgText("বিবরণ", "Description"), '<textarea id="incDescription" class="form-control" rows="4" maxlength="4000">' +
      esc(detail.description || "") + "</textarea>") + emgField(emgText("ঘটার সময়", "Occurred at"),
      '<input id="incOccurred" class="form-control" type="datetime-local" value="' + emgLocalInput(detail.occurredAt) + '">') + '<div class="grid grid-2">' + emgField(t("district"),
      '<select id="incDistrict" class="form-control"><option value="">' + esc(emgText("লোড হচ্ছে…", "Loading…")) + "</option></select>") +
    emgField(emgText("ঠিকানা", "Address"), '<input id="incAddress" class="form-control" type="text" maxlength="512" value="' + esc(detail.addressText || "") + '">') + "</div>" +
    '<button id="incSaveBtn" class="btn btn-primary" onclick="incSaveReport()">' + t("save") + "</button>";
}

function incTransitionHtml(status, isMod) {
  const next = (EMG_TRANSITIONS[status] || []).filter(s =>
    isMod || (s !== "VERIFIED" && s !== "REJECTED"));
  if (!next.length) {
    return '<p class="small muted">' + emgText("এই অবস্থায় আর কোনো পরিবর্তন সম্ভব নয়।", "No further status change is possible here.") + "</p>";
  }
  const options = next.map(s =>
    '<option value="' + s + '">' + esc(s) + "</option>").join("");
  return '<div class="flex" style="gap:10px;flex-wrap:wrap;align-items:flex-end">' +
    '<div class="form-group" style="flex:1;min-width:200px;margin-bottom:0">' + '<label>' + emgText("নতুন অবস্থা", "New status") + "</label>" +
    '<select id="incStatus" class="form-control">' + options + "</select></div>" +
    '<div class="form-group" style="flex:2;min-width:200px;margin-bottom:0">' + '<label>' + emgText("নোট", "Note") + "</label>" +
    '<input id="incNote" class="form-control" type="text" maxlength="300" placeholder="' + esc(emgText("ঐচ্ছিক", "Optional")) + '"></div>' +
    '<button id="incTransitionBtn" class="btn btn-primary" onclick="incTransition()">' + emgText("আপডেট", "Update") + "</button></div>" +
    '<p class="small muted" style="margin-top:8px">' + emgText("শুধু অনুমোদিত পরিবর্তনগুলোই তালিকায় আছে; সার্ভার নিজেও যাচাই করে।",
      "Only allowed moves are listed; the server validates them too.") + "</p>";
}

function incTimelineHtml(timeline) {
  if (!timeline.length) return emptyState(emgText("কোনো ইতিহাস নেই", "No history yet"));
  return '<div class="timeline">' + timeline.map(row =>
    '<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-body">' +
    '<div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">' + "<strong>" + esc(row.from) + " &rarr; " + esc(row.to) + "</strong>" +
    (row.systemGenerated ? '<span class="badge badge-muted">' + emgText("সিস্টেম", "System") + "</span>" : "") + "</div>" +
    (row.note ? '<div class="small">' + esc(row.note) + "</div>" : "") + '<div class="small muted">' + esc(fmtDate(row.at, true)) + "</div>" + "</div></div>"
  ).join("") + "</div>";
}

function incEvidenceHtml(evidence) {
  const rows = evidence.length
    ? '<div class="stack">' + evidence.map(ev =>
      '<div class="list-item"><div class="list-main">' + '<div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">' +
      "<strong>" + esc(ev.fileName) + "</strong>" + '<span class="badge badge-info">' + emgKindOf(ev.contentType) + "</span>" +
      '<span class="badge badge-muted">' + esc(ev.visibility) + "</span>" + (ev.isBlurred ? '<span class="chip">' + emgText("ব্লার", "Blurred") + "</span>" : "") + "</div>" +
      '<div class="list-meta mono small">' + esc(String(ev.sha256 || "").slice(0, 12)) + "… · " +
      emgBytes(ev.sizeBytes) + " · " + esc(fmtDate(ev.createdAt, true)) + "</div></div>" + '<div class="list-actions">' +
      '<button class="btn btn-outline btn-sm" onclick="evPreview(\'' + ev.id + '\')">' + emgText("প্রিভিউ", "Preview") + "</button></div></div>"
    ).join("") + "</div>"
    : '<p class="small muted">' + emgText("কোনো প্রমাণ যোগ করা হয়নি।", "No evidence uploaded yet.") + "</p>";

  return rows + '<div class="divider"></div>' + emgField(emgText("নতুন প্রমাণ", "New evidence"), '<input id="evFile" class="form-control" type="file" accept="image/*,application/pdf">',
      emgText("সর্বোচ্চ ৬ MB · ছবি বা PDF · ফাইল সিস্টেমে সংরক্ষিত হয়, প্রকাশিত হয় না।", "Max 6 MB · image or PDF · files are stored privately, never published.")) +
    '<button id="evUploadBtn" class="btn btn-primary" onclick="evUpload()">' + emgText("আপলোড", "Upload") + "</button>" +
    '<div id="evPreviewBox" class="thumb" style="margin-top:14px"></div>';
}

function incReferralHtml(detail) {
  const ref = detail.referral;
  if (!ref) {
    return '<p class="small muted">' + emgText("কোনো রেফারেল তৈরি করা হয়নি। প্রয়োজনে নিচের ফর্মে তৈরি করুন।",
        "No referral yet. Use the form below when you need one.") + "</p>" + '<div class="divider"></div>' +
      emgField(emgText("থানার নাম", "Station name"), '<input id="rfStation" class="form-control" type="text" maxlength="256" placeholder="' +
        esc(emgText("যেমন: তেজগাও থানা", "e.g. Tejgaon Police Station")) + '">') + emgField(emgText("যোগাযোগ নম্বর", "Contact number"),
        '<input id="rfContact" class="form-control" type="text" maxlength="32" placeholder="01XXXXXXXXX">') + emgField(emgText("বিবরণ", "Details"),
        '<textarea id="rfNotes" class="form-control" rows="3" maxlength="1000"></textarea>') + '<label style="display:flex;gap:8px;align-items:center;font-size:.9rem;margin-bottom:12px">' +
      '<input id="rfSubmit" type="checkbox" checked> ' + emgText("অনুষ্ঠানে জমা দিন (অবস্থা SUBMITTED হবে)", "Mark as submitted (status becomes SUBMITTED)") + "</label>" +
      '<button id="rfBtn" class="btn btn-primary" onclick="referralCreate()">' + emgText("রেফারেল তৈরি করুন", "Create referral") + "</button>";
  }

  const flow = [["SUBMITTED", emgText("জমা দিন", "Submit")],
    ["ACKNOWLEDGED", emgText("থানা স্বীকার করেছে", "Acknowledged")],
    ["CLOSED", emgText("মামলা বন্ধ", "Closed")]];
  const buttons = '<div class="flex" style="gap:8px;margin-top:12px;flex-wrap:wrap">' + flow.map(s =>
    '<button id="rfBtn_' + s[0] + '" class="btn ' + (s[0] === ref.status ? "btn-outline" : "btn-primary") + ' btn-sm"' +
    (s[0] === ref.status ? " disabled" : "") + ' onclick="referralStatus(\'' + s[0] + '\')">' + esc(s[1]) + "</button>"
  ).join("") + "</div>";

  return '<div class="panel"><div class="kv">' + incKv(emgText("রেফারেন্স", "Reference"), '<span class="mono">' + esc(ref.reference) + "</span>") +
    incKv(emgText("থানা", "Station"), esc(ref.stationName || "—")) + incKv(t("status"), statusBadge(ref.status)) +
    incKv(emgText("তৈরি / জমা", "Created / submitted"), esc(fmtDate(ref.submittedAt || ref.createdAt, true))) +
    incKv(emgText("স্বীকৃতি", "Acknowledged"), esc(fmtDate(ref.acknowledgedAt, true))) + incKv(emgText("নোট", "Notes"), esc(ref.notes || "—")) + "</div>" +
    (window.__incLetter
      ? '<div class="divider"></div><div class="panel-title">✉️ ' + emgText("রেফারেল চিঠি", "Referral letter") + "</div>" +
        '<div class="small" style="white-space:pre-wrap;line-height:1.7">' + esc(window.__incLetter) + "</div>"
      : "") + "</div>" + buttons;
}

window.emgToggle = function (id) {
  const el = emgSink(id);
  if (el) el.classList.toggle("hidden");
};

window.incSaveReport = async function () {
  const id = window.__incDetail && window.__incDetail.id;
  if (!id) return;
  const title = emgVal("incTitle");
  if (!title) { toast(emgText("শিরোনাম আবশ্যক", "Title is required"), "error"); return; }
  emgBusy("incSaveBtn", true);
  try {
    const body = {
      title: title, category: emgVal("incCategory") || "OTHER", description: emgVal("incDescription"), addressText: emgVal("incAddress")
    };
    const occurred = emgVal("incOccurred");
    if (occurred) {
      const iso = new Date(occurred).toISOString();
      if (!Number.isNaN(Date.parse(iso))) body.occurredAt = iso;
    }
    const district = emgVal("incDistrict");
    if (district) body.districtId = district;

    await api("/api/incidents/" + id, { method: "PUT", body: JSON.stringify(body) });
    toast(emgText("প্রতিবেদন হালনাগাদ হয়েছে", "Report updated"), "success");
    renderIncidentDetail(id);
  } catch (e) {
    emgErr(e);
  } finally {
    emgBusy("incSaveBtn", false);
  }
};

window.incTransition = async function () {
  const detail = window.__incDetail;
  if (!detail) return;
  const toStatus = emgVal("incStatus");
  if (!toStatus) return;
  emgBusy("incTransitionBtn", true);
  try {
    await api("/api/incidents/" + detail.id + "/transition", {
      method: "POST", body: JSON.stringify({ toStatus: toStatus, note: emgVal("incNote") || null })
    });
    toast(emgText("অবস্থা পরিবর্তিত হয়েছে", "Status updated"), "success");
    renderIncidentDetail(detail.id);
  } catch (e) {
    emgErr(e);
  } finally {
    emgBusy("incTransitionBtn", false);
  }
};

window.evUpload = async function () {
  const detail = window.__incDetail;
  if (!detail) return;
  const input = emgSink("evFile");
  const file = input && input.files && input.files[0];
  if (!file) { toast(emgText("একটি ফাইল বাছুন", "Choose a file first"), "error"); return; }
  if (file.size > 6000000) {
    toast(emgText("সর্বোচ্চ ৬ MB ফাইল দেওয়া যাবে", "Maximum file size is 6 MB"), "error");
    return;
  }
  emgBusy("evUploadBtn", true);
  try {
    const dataUrl = await emgFileBase64(file);
    const payload = {
      fileName: file.name, contentType: file.type || "application/octet-stream", base64: dataUrl,
      caption: null, isBlurred: false, isBlurry: false, kind: emgKindOf(file.type), visibility: "ONLY_ME"
    };
    await api("/api/incidents/" + detail.id + "/evidence", {
      method: "POST", body: JSON.stringify(payload)
    });
    toast(emgText("প্রমাণ যোগ হয়েছে", "Evidence added"), "success");
    renderIncidentDetail(detail.id);
  } catch (e) {
    emgErr(e);
  } finally {
    emgBusy("evUploadBtn", false);
  }
};

window.evPreview = async function (evidenceId) {
  const detail = window.__incDetail;
  const box = emgSink("evPreviewBox");
  if (!detail || !box) return;
  box.innerHTML = '<p class="small muted">' + t("loading") + "</p>";
  try {
    const data = await api("/api/incidents/" + detail.id + "/evidence/" + evidenceId + "/content");
    const url = emgPreviewUrl(data);
    if (url && url.indexOf("blob:") === 0) {
      window.__evUrls = window.__evUrls || [];
      window.__evUrls.push(url);
    }
    const isImage = String(data.contentType || "").startsWith("image/");
    box.innerHTML = (isImage && url
      ? '<img src="' + url + '" alt="' + esc(data.fileName || "") + '" style="max-width:100%;border-radius:12px;border:1px solid var(--border)">'
      : url
        ? '<a class="btn btn-outline btn-sm" href="' + url + '" target="_blank" rel="noopener">' + emgText("ফাইল খুলুন", "Open file") + " · " + esc(data.fileName || "") + "</a>"
        : '<p class="small">' + emgText("প্রিভিউ তৈরি করা যায়নি", "Could not build a preview") + "</p>") +
      '<p class="small muted mono" style="margin-top:6px">' + esc(String(data.sha256 || "").slice(0, 16)) + "…</p>";
  } catch (e) {
    box.innerHTML = '<p class="small" style="color:var(--danger)">' + esc(apiErrorMessage(e)) + "</p>";
  }
};

window.referralCreate = async function () {
  const detail = window.__incDetail;
  if (!detail) return;
  const station = emgVal("rfStation");
  if (!station) { toast(emgText("থানার নাম আবশ্যক", "Station name is required"), "error"); return; }
  emgBusy("rfBtn", true);
  try {
    const contact = emgVal("rfContact");
    const notes = emgVal("rfNotes");
    const merged = [notes, contact ? emgText("যোগাযোগ", "Contact") + ": " + contact : ""]
      .filter(Boolean).join(" | ");
    const result = await api("/api/incidents/" + detail.id + "/referral", {
      method: "POST", body: JSON.stringify({
        stationName: station, notes: merged || null, submit: emgChecked("rfSubmit"),
        districtId: detail.districtId || null
      })
    });
    window.__incLetter = (result && result.letter) || null;
    window.__incLetterRef = (result && result.reference) || null;
    toast(emgText("রেফারেল তৈরি হয়েছে", "Referral created"), "success");
    renderIncidentDetail(detail.id);
  } catch (e) {
    emgErr(e);
  } finally {
    emgBusy("rfBtn", false);
  }
};

window.referralStatus = async function (status) {
  const detail = window.__incDetail;
  if (!detail || !detail.referral) return;
  emgBusy("rfBtn_" + status, true);
  try {
    await api("/api/incidents/referrals/" + detail.referral.id + "/status", {
      method: "POST", body: JSON.stringify({ status: status, notes: null })
    });
    toast(emgText("রেফারেল অবস্থা হালনাগাদ হয়েছে", "Referral status updated"), "success");
    renderIncidentDetail(detail.id);
  } catch (e) {
    emgErr(e);
  } finally {
    emgBusy("rfBtn_" + status, false);
  }
};

window.incVote = async function (isHelpful) {
  const detail = window.__incDetail;
  if (!detail) return;
  try {
    await api("/api/incidents/" + detail.id + "/vote", {
      method: "POST", body: JSON.stringify({ isHelpful: isHelpful })
    });
    toast(emgText("ভোট ধন্যবাদ", "Thanks for voting"), "success");
  } catch (e) { emgErr(e); }
};

/* ─── 5. Safety tools ────────────────────────────────────────────────────── */

async function renderToolsPage() {
  emgStopAllTimers();
  const shakeOn = !!window.__shake;
  const voiceOn = !!window.__voice;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const guide =
    '<div class="card"><div class="card-header">🧭 ' + emgText("৩ ধাপে নিরাপদ থাকুন", "3 steps if you feel unsafe") + "</div>" +
    '<ol style="padding-left:20px;line-height:2">' + "<li><strong>" + emgText("লোকেশন শেয়ার করুন", "Share your location") + "</strong> — " +
    '<a href="#/share">' + emgText("লাইভ লিংক তৈরি", "create a live link") + "</a></li>" + "<li><strong>" + emgText("যাত্রা শুরু করুন", "Start a trip") + "</strong> — " +
    '<a href="#/trips">' + emgText("ট্র্যাকিং চালু করুন", "turn on trip tracking") + "</a></li>" +
    "<li><strong>" + emgText("৯৯৯ এ কল করুন", "Call 999") + "</strong> — " + '<a href="tel:999">📞 999</a></li>' +
    "</ol>" + '<div class="flex" style="gap:8px;margin-top:12px;flex-wrap:wrap">' + '<a class="btn btn-danger" href="tel:999">📞 ' + emgText("৯৯৯", "999") + "</a>" +
    '<button class="btn btn-outline" onclick="navigate(\'emergency\')">🚨 ' + t("emergency") + "</button>" + "</div></div>";

  const body =
    emgHead(emgText("নিরাপত্তা টুলস", "Safety tools"), emgText("শেক, ভয়েস কিওয়ার্ড ও নকল কল — বিপদের সময় দ্রুত সহায়তা",
        "Shake, voice keyword and fake call — fast help when it matters")) + '<div class="grid grid-2" style="max-width:1000px">' +

    emgCard("📳 " + emgText("শেক টু SOS", "Shake to SOS"), '<p class="small muted">' + emgText(
        "ফোন তিনবার জোরে নাড়ালে (১.২ সেকেন্ডের মধ্যে) জরুরি পেজ খুলবে।", "Shake the phone hard 3 times within 1.2s to open the emergency page.") + "</p>" +
      '<div class="flex" style="gap:10px;align-items:center;flex-wrap:wrap">' +
      '<button id="shakeBtn" class="btn ' + (shakeOn ? "btn-danger" : "btn-outline") + '" onclick="shakeToggle()">' +
      (shakeOn ? emgText("বন্ধ করুন", "Turn off") : emgText("চালু করুন", "Turn on")) + "</button>" +
      '<span class="mono small">' + emgText("ত্বরণ: ", "Magnitude: ") + '<span id="shakeRead">—</span></span></div>' + '<p id="shakeStatus" class="small muted" style="margin-top:8px">' +
      (shakeOn ? emgText("সক্রিয় — এখন নাড়ান", "Active — start shaking") : "") + "</p>") +

    emgCard("🎤 " + emgText("ভয়েস কিওয়ার্ড", "Voice keyword"), (SR
        ? '<p class="small muted">' + emgText(
            "‘সাহায্য’, ‘বাঁচাও’ বা ‘help’ বললে জরুরি পেজ খুলবে।", "Say “সাহায্য”, “বাঁচাও” or “help” to open the emergency page.") + "</p>" +
          '<button id="voiceBtn" class="btn ' + (voiceOn ? "btn-danger" : "btn-outline") + '" onclick="voiceToggle()">' +
          (voiceOn ? emgText("শোনা বন্ধ করুন", "Stop listening") : emgText("শোনা শুরু করুন", "Start listening")) + "</button>" +
          '<p id="voiceLive" class="small mono" style="margin-top:10px;min-height:1.4em;color:var(--text-sec)"></p>' + '<p id="voiceStatus" class="small muted"></p>'
        : '<div class="alert alert-warn">' + emgText("এই ব্রাউজারে ভয়েস রিকগনিশন নেই — Chrome বা Edge ব্যবহার করুন।",
            "Voice recognition is unavailable here — try Chrome or Edge.") + "</div>")) +

    emgCard("📞 " + emgText("নকল কল সিমুলেটর", "Fake call simulator"), '<p class="small muted">' + emgText(
        "কেউ ধরে রাখলে বা অসুবিধায় পড়লে নকল ইনকামিং কল দেখিয়ে বেরিয়ে আসা যায়।",
        "Simulate an incoming call to walk away from an uncomfortable situation.") + "</p>" + '<div class="grid grid-2">' +
      emgField(emgText("কলারের নাম", "Caller name"), '<input id="fcName" class="form-control" type="text" maxlength="40" value="' +
        esc(emgText("আমার বাবা", "Dad")) + '">') + emgField(emgText("কতক্ষণ পরে", "Call after"),
        '<select id="fcDelay" class="form-control">' + '<option value="0">' + emgText("এখনই", "Now") + "</option>" + '<option value="10">10 ' + emgText("সেকেন্ড", "seconds") + "</option>" +
        '<option value="30">30 ' + emgText("সেকেন্ড", "seconds") + "</option>" + '<option value="60">60 ' + emgText("সেকেন্ড", "seconds") + "</option>" + "</select>") +
      "</div>" + '<button class="btn btn-primary" onclick="fakeCallSchedule()">' +
      emgText("কল শিডিউল করুন", "Schedule call") + "</button>" + '<p id="fcStatus" class="small muted" style="margin-top:8px"></p>') +

    guide + "</div>";

  document.getElementById("app").innerHTML = shell(emgSection(body), "safety");
  if (window.__shake) setTimeout(() => emgEvery(shakeReadoutTick, 250), 0);
}

function shakeReadoutTick() {
  const el = emgSink("shakeRead");
  if (el && window.__shakeLast !== undefined) el.textContent = Number(window.__shakeLast).toFixed(1) + " m/s²";
}

window.shakeToggle = async function () {
  if (window.__shake) {
    emgStopShake();
    toast(emgText("শেক টু এসওএস বন্ধ", "Shake to SOS off"), "");
    renderToolsPage();
    return;
  }
  if (!("DeviceMotionEvent" in window)) {
    toast(emgText("এই ডিভাইসে মোশন সেন্সর নেই", "No motion sensor on this device"), "error");
    return;
  }
  try {
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      const answer = await DeviceMotionEvent.requestPermission();
      if (answer !== "granted") {
        toast(emgText("অনুমতি প্রয়োজন", "Permission required"), "error");
        return;
      }
    }
  } catch (e) {
    emgErr(e);
    return;
  }

  const hits = [];
  const handler = event => {
    const a = event.accelerationIncludingGravity || event.acceleration;
    if (!a) return;
    const mag = Math.sqrt(Math.pow(a.x || 0, 2) + Math.pow(a.y || 0, 2) + Math.pow(a.z || 0, 2));
    window.__shakeLast = mag;
    if (mag < 25) return;
    const now = Date.now();
    hits.push(now);
    while (hits.length && now - hits[0] > 1200) hits.shift();
    if (hits.length >= 3) {
      hits.length = 0;
      toast(emgText("শেক শনাক্ত হয়েছে — জরুরি পেজ খোলা হচ্ছে", "Shake detected — opening emergency"), "success");
      navigate("emergency");
    }
  };

  window.__shake = handler;
  window.addEventListener("devicemotion", handler);
  toast(emgText("শেক টু এসওএস চালু", "Shake to SOS on"), "success");
  renderToolsPage();
};

window.voiceToggle = function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (window.__voice) {
    emgStopVoice();
    toast(emgText("ভয়েস শোনা বন্ধ", "Voice listening stopped"), "");
    renderToolsPage();
    return;
  }
  if (!SR) {
    toast(emgText("এই ব্রাউজারে ভয়েস সাপোর্ট নেই", "Voice recognition not supported here"), "error");
    return;
  }
  try {
    const rec = new SR();
    rec.lang = LANG === "bn" ? "bn-BD" : "en-IN";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = event => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      const live = emgSink("voiceLive");
      if (live) live.textContent = text;
      const low = text.toLowerCase();
      const hit = low.indexOf("সাহায্য") >= 0 || low.indexOf("বাঁচাও") >= 0 ||
        low.indexOf("help") >= 0 || low.indexOf("bachao") >= 0 || low.indexOf("sos") >= 0;
      if (hit) {
        emgStopVoice();
        toast(emgText("কিওয়ার্ড শনাক্ত — জরুরি পেজ খোলা হচ্ছে", "Keyword detected — opening emergency"), "success");
        navigate("emergency");
      }
    };
    rec.onerror = event => {
      const status = emgSink("voiceStatus");
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        window.__voiceWanted = false;
        if (status) status.textContent = emgText("মাইক অনুমতি দেওয়া হয়নি।", "Microphone permission denied.");
      } else if (status && !status.textContent) {
        status.textContent = emgText("ভয়েস ত্রুটি: ", "Voice error: ") + event.error;
      }
    };
    rec.onend = () => {
      if (window.__voiceWanted && window.__voice === rec) {
        try { rec.start(); } catch { /* restart races are harmless */ }
      }
    };

    window.__voice = rec;
    window.__voiceWanted = true;
    rec.start();
    toast(emgText("শোনা শুরু হয়েছে", "Listening started"), "success");
    renderToolsPage();
  } catch (e) {
    emgErr(e);
  }
};

window.fakeCallSchedule = function () {
  const delay = Number(emgVal("fcDelay")) || 0;
  const name = emgVal("fcName") || emgText("অজানা কল", "Unknown caller");
  emgStopFakeCall();
  if (delay <= 0) {
    emgShowFakeCall(name);
    return;
  }
  window.__fakeCallTimer = setTimeout(() => emgShowFakeCall(name), delay * 1000);
  const status = emgSink("fcStatus");
  if (status) {
    status.textContent = emgText("কল আসবে ", "Call in ") + delay + emgText(" সেকেন্ডে…", " seconds…");
  }
  toast(emgText("নকল কল শিডিউল হয়েছে", "Fake call scheduled"), "success");
};

function emgShowFakeCall(name) {
  emgStopFakeCall();
  const layer = document.createElement("div");
  layer.id = "fakeCallLayer";
  layer.className = "modal-backdrop";
  layer.style.cssText = "position:fixed;inset:0;z-index:950;display:flex;flex-direction:column;" + "align-items:center;justify-content:center;gap:18px;text-align:center;padding:24px;" +
    "background:linear-gradient(160deg,#1b1b2f,#2c003e);color:#fff";
  layer.innerHTML =
    '<div style="width:96px;height:96px;border-radius:50%;background:rgba(255,255,255,.15);' + 'display:flex;align-items:center;justify-content:center;font-size:2.4rem">👤</div>' +
    "<div style=\"font-size:1.5rem;font-weight:700\">" + esc(name) + "</div>" +
    '<div class="small" style="opacity:.85">' + emgText("ইনকামিং কল…", "Incoming call…") + "</div>" + '<div class="flex" style="gap:24px">' +
    '<button class="btn btn-danger btn-lg" style="border-radius:50%;width:76px;height:76px;padding:0" ' + 'onclick="fakeCallDecline()" aria-label="' + esc(t("cancel")) + '">✕</button>' +
    '<button class="btn btn-lg" style="background:var(--success);color:#fff;border-radius:50%;' +
    'width:76px;height:76px;padding:0" onclick="fakeCallAccept()" aria-label="' + esc(t("call")) + '">📞</button>' + "</div>" +
    '<div class="small" style="opacity:.7">' + emgText("বাতিল / গ্রহণ করুন", "Decline / accept") + "</div>";
  document.body.appendChild(layer);

  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) window.__fakeAudio = new Ctx();
  } catch { /* audio blocked until a gesture — silent fallback */ }

  emgBeep(880);
  window.__fakeRing = setInterval(() => emgBeep(880), 1400);
  if (navigator.vibrate) {
    try { navigator.vibrate([400, 500, 400, 500]); } catch { /* unsupported */ }
    window.__fakeVibe = setInterval(() => {
      try { navigator.vibrate([400, 500, 400, 500]); } catch { /* unsupported */ }
    }, 2200);
  }
}

function emgBeep(freq) {
  const ctx = window.__fakeAudio;
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq || 880;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch { /* WebAudio unavailable */ }
}

window.fakeCallAccept = function () {
  emgStopFakeCall();
  const number = window.prompt(emgText("কল করার নম্বর", "Number to call"), "999");
  if (number) window.location.href = "tel:" + number;
};

window.fakeCallDecline = function () {
  emgStopFakeCall();
  toast(emgText("কল বাতিল করা হয়েছে", "Call declined"), "");
};

/* ─── 6. Trips ───────────────────────────────────────────────────────────── */

async function renderTripsPage() {
  if (!token) { navigate("login"); return; }
  emgStopAllTimers();

  document.getElementById("app").innerHTML =
    shell(emgSection('<div id="tripsBody">' + spinner() + "</div>"), "trips");

  try {
    const data = await Promise.all([api("/api/trips"), api("/api/contacts").catch(() => [])]);
    const sink = emgSink("tripsBody");
    if (!sink) return;
    const trips = data[0] || [];
    const contacts = data[1] || [];
    window.__tripsData = trips;

    sink.innerHTML = emgHead(t("trips"), emgText("যাত্রার সময় ট্র্যাকিং ও নিরাপদ চেক-ইন", "Track journeys with safe check-ins")) +
      '<div class="grid" style="grid-template-columns:1fr;gap:20px;max-width:900px">' + trips.map(tripCardHtml).join("") +
      (trips.length ? "" : emptyState(emgText("কোনো যাত্রা নেই", "No trips yet"))) + tripsCreateHtml(contacts) + "</div>";

    emgCountdownsOn();
  } catch (e) {
    const sink = emgSink("tripsBody");
    if (sink) {
      sink.innerHTML = emptyState(apiErrorMessage(e), '<button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="renderTripsPage()">' + t("retry") + "</button>");
    }
  }
}

function tripCardHtml(trip) {
  const started = new Date(trip.startedAt).getTime();
  const expected = new Date(trip.expectedArrivalAt).getTime();
  const now = Date.now();
  const total = Math.max(1, expected - started);
  const elapsed = Math.max(0, now - started);
  const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  const overdue = now > expected && trip.status === "ACTIVE";
  const isActive = trip.status === "ACTIVE" || trip.status === "AUTO_ESCALATED";

  return '<div class="card">' + '<div class="flex-between" style="flex-wrap:wrap;gap:10px">' +
    '<div><strong>' + esc(trip.title) + "</strong> " + statusBadge(trip.status) + '<div class="small muted">' + esc(trip.originText || "") +
    (trip.originText && trip.destinationText ? " → " : "") + esc(trip.destinationText || "") + "</div></div>" +
    '<div class="small muted nowrap">' + esc(fmtDate(trip.startedAt, true)) + "</div></div>" +

    '<div class="progress" style="height:10px;background:var(--border);border-radius:999px;overflow:hidden;margin:14px 0 6px">' +
    '<div style="height:100%;width:' + pct + '%;background:' + (overdue ? "var(--danger)" : "var(--primary)") + '"></div></div>' +
    '<div class="flex-between small"><span>' + emgText("শুরু: ", "Started: ") + esc(fmtMinutes(Math.round(elapsed / 60000))) + "</span>" +
    '<span ' + (overdue ? 'style="color:var(--danger)"' : 'style="color:var(--text-sec)"') + ">" +
    emgText("বাকি: ", "Left: ") + '<span data-exp="' + esc(trip.expectedArrivalAt) + '">—</span></span>' + '<span class="muted">' + emgText("প্রতি ", "Every ") +
    esc(trip.checkInIntervalMinutes) + emgText(" মিনিটে চেক-ইন", " min check-in") + "</span></div>" +

    (trip.status === "AUTO_ESCALATED"
      ? '<div class="alert alert-danger" style="margin-top:12px">' + emgText("চেক-ইন দেওয়া হয়নি — সময় শেষ হওয়ায় বিশ্বস্ত পরিচিতিদের কাছে স্বয়ংক্রিয় অ্যালার্ট গেছে।",
          "Check-in missed — your trusted contacts were automatically alerted.") + "</div>"
      : overdue
        ? '<div class="alert alert-danger" style="margin-top:12px">' + emgText("সময় শেষ হয়ে গেছে — এখনই চেক-ইন দিন। না দিলে এই যাত্রা স্বয়ংক্রিয়ভাবে এসকেলেট হবে: সার্ভার আপনার বিশ্বস্ত পরিচিতিদের অ্যালার্ট পাঠাবে এবং ঘটনার ইতিহাসে নোট রাখবে।",
            "Time is up — check in now. If you do not, this trip auto-escalates: the server alerts your trusted contacts and records the event in the trip history.") + "</div>"
        : "") +

    (isActive
      ? '<div class="flex" style="gap:8px;margin-top:14px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" onclick="tripCheckIn(\'' + trip.id + '\')">' + emgText("আমি নিরাপদ", "I am safe") + "</button>" +
        '<button class="btn btn-outline" onclick="tripComplete(\'' + trip.id + '\')">' + emgText("যাত্রা শেষ", "Complete trip") + "</button>" +
        '<button class="btn btn-white" onclick="tripCancel(\'' + trip.id + '\')">' + t("cancel") + "</button>" +
        '<button class="btn btn-outline btn-sm" onclick="tripDetail(\'' + trip.id + '\')">' + emgText("বিস্তারিত", "Details") + "</button></div>"
      : '<div class="flex" style="gap:8px;margin-top:14px">' + '<button class="btn btn-outline btn-sm" onclick="tripDetail(\'' + trip.id + '\')">' +
        emgText("বিস্তারিত", "Details") + "</button></div>") + '<div id="tripDetail_' + trip.id + '" style="margin-top:12px"></div>' + "</div>";
}

function tripsCreateHtml(contacts) {
  window.__tripOriginGeo = null;
  const contactOptions = contacts.length
    ? contacts.map(c =>
      '<label style="display:flex;gap:6px;align-items:center;font-size:.9rem">' +
      '<input type="checkbox" class="tpContactBox" value="' + c.id + '"> ' +
      esc(c.displayName) + (c.relationship ? " · " + esc(c.relationship) : "") + "</label>").join("")
    : '<span class="small muted">' + esc(emgText("কোনো পরিচিতি নেই", "No contacts yet")) + "</span>";
  const minutes = [15, 30, 45, 60, 90, 120, 180].map(m =>
    '<option value="' + m + '"' + (m === 45 ? " selected" : "") + ">" + m + " " + emgText("মিনিট", "min") + "</option>").join("");

  return '<div class="card"><div class="card-header">➕ ' + emgText("নতুন যাত্রা শুরু করুন", "Start a new trip") + "</div>" +
    emgField(emgText("যাত্রার নাম", "Trip title"), '<input id="tpTitle" class="form-control" type="text" maxlength="120" placeholder="' +
      esc(emgText("যেমন: অফিস থেকে বাড়ি", "e.g. Office to home")) + '">') + '<div class="grid grid-2">' + emgField(emgText("শুরুর স্থান", "Origin"),
      '<div class="flex" style="gap:8px"><input id="tpOrigin" class="form-control" type="text" maxlength="200" ' +
      'placeholder="' + esc(emgText("এলাকা / অক্ষাংশ,দ্রাঘিমাংশ", "Area / lat,lng")) + '">' + '<button class="btn btn-outline btn-sm nowrap" type="button" onclick="tripUseOrigin()">' +
      emgText("আমার অবস্থান", "My location") + "</button></div>") + emgField(emgText("গন্তব্য", "Destination") + ' <span style="color:var(--danger)">*</span>',
      '<input id="tpDest" class="form-control" type="text" maxlength="200" placeholder="' + esc(emgText("কোথায় যাচ্ছেন", "Where are you going")) + '">') + "</div>" +
    '<div class="grid grid-2">' + emgField(emgText("গন্তব্য অক্ষাংশ", "Destination latitude"),
      '<input id="tpDestLat" class="form-control" type="number" step="0.000001" placeholder="23.8103">') + emgField(emgText("গন্তব্য দ্রাঘিমাংশ", "Destination longitude"),
      '<div class="flex" style="gap:8px"><input id="tpDestLng" class="form-control" type="number" step="0.000001" ' + 'placeholder="90.4125">' +
      '<button class="btn btn-outline btn-sm nowrap" type="button" onclick="tripUseDest()">' + emgText("আমার অবস্থান", "My location") + "</button></div>") + "</div>" +
    '<div class="grid grid-2">' + emgField(emgText("প্রত্যাশিত সময়", "Expected duration"),
      '<select id="tpMinutes" class="form-control">' + minutes + "</select>") + emgField(emgText("বিশ্বস্ত পরিচিতি", "Notify contacts"),
      '<div class="stack" style="display:flex;gap:6px">' + contactOptions + "</div>") + "</div>" +
    '<label style="display:flex;gap:8px;align-items:flex-start;font-size:.9rem;margin-bottom:14px">' +
    '<input id="tpAuto" type="checkbox" checked> <span>' + emgText("সময় শেষ হলে এসকেলেট করুন", "Escalate when time runs out") +
    '<span class="small muted" style="display:block">' + emgText("চেক-ইন না পেলে সার্ভার স্বয়ংক্রিয়ভাবে পরিচিতিদের জানায়।",
      "If you miss a check-in the server alerts your contacts automatically.") + "</span></span></label>" +
    '<button id="tpCreateBtn" class="btn btn-primary" onclick="tripCreate()">' + emgText("যাত্রা শুরু করুন", "Start trip") + "</button>" + "</div>";
}

window.tripUseOrigin = function () {
  emgGeo(8000).then(geo => {
    if (!geo) { toast(emgText("অবস্থান পাওয়া যায়নি", "Location unavailable"), "error"); return; }
    window.__tripOriginGeo = geo;
    const el = emgSink("tpOrigin");
    if (el) el.value = geo.latitude.toFixed(5) + ", " + geo.longitude.toFixed(5);
  });
};

window.tripUseDest = function () {
  emgGeo(8000).then(geo => {
    if (!geo) { toast(emgText("অবস্থান পাওয়া যায়নি", "Location unavailable"), "error"); return; }
    const lat = emgSink("tpDestLat");
    const lng = emgSink("tpDestLng");
    if (lat) lat.value = geo.latitude.toFixed(6);
    if (lng) lng.value = geo.longitude.toFixed(6);
  });
};

window.tripCreate = async function () {
  const title = emgVal("tpTitle");
  const destination = emgVal("tpDest");
  if (!title || !destination) {
    toast(emgText("নাম ও গন্তব্য আবশ্যক", "Title and destination are required"), "error");
    return;
  }
  emgBusy("tpCreateBtn", true);
  try {
    const body = {
      title: title, destinationText: destination, expectedMinutes: Number(emgVal("tpMinutes")) || 45, checkInIntervalMinutes: 15, autoEscalate: emgChecked("tpAuto")
    };
    const origin = emgVal("tpOrigin");
    if (origin) body.originText = origin;
    const start = window.__tripOriginGeo;
    if (start) {
      body.startLatitude = start.latitude;
      body.startLongitude = start.longitude;
    }
    const lat = emgVal("tpDestLat");
    const lng = emgVal("tpDestLng");
    if (lat && lng) {
      body.destinationLatitude = Number(lat);
      body.destinationLongitude = Number(lng);
      body.endLatitude = Number(lat);
      body.endLongitude = Number(lng);
    }
    const picked = Array.prototype.slice.call(document.querySelectorAll(".tpContactBox:checked"))
      .map(el => el.value).filter(Boolean);
    if (picked.length) {
      body.trustedContactId = picked[0];
      body.contactsToNotify = picked;
    }

    await api("/api/trips", { method: "POST", body: JSON.stringify(body) });
    toast(emgText("যাত্রা শুরু হয়েছে", "Trip started"), "success");
    renderTripsPage();
  } catch (e) {
    emgErr(e);
  } finally {
    emgBusy("tpCreateBtn", false);
  }
};

window.tripCheckIn = async function (id) {
  try {
    await api("/api/trips/" + id + "/checkin", {
      method: "POST", body: JSON.stringify({ respondent: "USER", note: emgText("নিরাপদ আছি", "I am safe") })
    });
    toast(emgText("চেক-ইন সংরক্ষিত হয়েছে", "Check-in saved"), "success");
    renderTripsPage();
  } catch (e) { emgErr(e); }
};

window.tripComplete = async function (id) {
  try {
    await api("/api/trips/" + id + "/complete", { method: "POST", body: "{}" });
    toast(emgText("যাত্রা সম্পন্ন", "Trip completed"), "success");
    renderTripsPage();
  } catch (e) { emgErr(e); }
};

window.tripCancel = async function (id) {
  if (!window.confirm(emgText("যাত্রা বাতিল করবেন?", "Cancel this trip?"))) return;
  try {
    await api("/api/trips/" + id + "/cancel", { method: "POST", body: "{}" });
    toast(emgText("যাত্রা বাতিল হয়েছে", "Trip cancelled"), "success");
    renderTripsPage();
  } catch (e) { emgErr(e); }
};

window.tripDetail = async function (id) {
  const box = emgSink("tripDetail_" + id);
  if (!box) return;
  if (box.innerHTML) { box.innerHTML = ""; return; }
  box.innerHTML = '<p class="small muted">' + t("loading") + "</p>";
  try {
    const data = await api("/api/trips/" + id);
    const rows = data.checkIns || [];
    box.innerHTML = '<div class="panel"><div class="panel-title">' + emgText("চেক-ইন ইতিহাস", "Check-in history") + "</div>" + (rows.length
        ? rows.map(c =>
          '<div class="kv-row"><span class="k mono">' + esc(fmtDate(c.createdAt, true)) + "</span>" +
          '<span class="v">' + esc(c.respondent) + (c.note ? " — " + esc(c.note) : "") + "</span></div>"
        ).join("")
        : '<div class="kv-row"><span class="v muted">' + emgText("কিছু নেই", "Nothing here") + "</span></div>") + "</div>";
  } catch (e) {
    box.innerHTML = '<p class="small" style="color:var(--danger)">' + esc(apiErrorMessage(e)) + "</p>";
  }
};

/* ─── 7. Share location ──────────────────────────────────────────────────── */

async function renderSharePage() {
  if (!token) { navigate("login"); return; }
  emgStopAllTimers();

  const durations = [15, 30, 60, 120].map(m =>
    '<option value="' + m + '"' + (m === 30 ? " selected" : "") + ">" + m + " " + emgText("মিনিট", "minutes") + "</option>").join("");

  const form = emgCard("📍 " + emgText("লাইভ লোকেশন শেয়ার", "Share live location"), '<p class="small muted">' + emgText(
      "একটি সীমিত সময়ের লিংক তৈরি হবে — যে কেউ (লগইন ছাড়া) দেখতে পারবে।",
      "Creates a time-boxed link — anyone with it can watch (no login needed).") + "</p>" + '<div class="grid grid-2">' +
    emgField(emgText("মেয়াদ", "Validity"), '<select id="shMinutes" class="form-control">' + durations + "</select>") +
    emgField(emgText("নোট", "Note"), '<input id="shNote" class="form-control" type="text" maxlength="200" placeholder="' +
      esc(emgText("যেমন: বাড়ি ফিরছি", "e.g. Heading home")) + '">') + "</div>" +
    '<button id="shStartBtn" class="btn btn-primary" onclick="shareStart()">' + emgText("শেয়ার শুরু করুন", "Start sharing") + "</button>" +
    '<p class="small muted" style="margin-top:8px">' + emgText("জিপিএস অনুমতি প্রয়োজন — না দিলে শেয়ার তৈরি করা যাবে না।",
      "GPS permission is required — without it a share cannot be created.") + "</p>");

  document.getElementById("app").innerHTML =
    shell(emgSection('<div id="shareBody">' + spinner() + "</div>"), "share");
  const sink = emgSink("shareBody");
  if (sink) sink.innerHTML = emgHead(emgText("লোকেশন শেয়ার", "Location sharing"), emgText("নিরাপদ সময়সীমায় লাইভ অবস্থান পাঠান", "Send your live position for a limited time")) + form +
    '<div id="shareList" style="margin-top:20px">' + spinner() + "</div>" + emgCard("👁️ " + emgText("প্রাপক কী দেখবেন", "What the recipient sees"),
      '<ul style="padding-left:20px;line-height:1.9" class="small">' + "<li>" + emgText("একটি পাবলিক লিংক — কোনো লগইন লাগে না।", "A public link — no login required.") + "</li>" +
      "<li>" + emgText("আপনার সর্বশেষ অক্ষাংশ, নোট ও মেয়াদ।", "Your latest coordinates, note and expiry.") + "</li>" +
      "<li>" + emgText("ম্যাপ লিংক ও কতবার দেখা হয়েছে।", "A map link and how many views remain.") + "</li>" +
      "<li>" + emgText("নাম বা ফোন নম্বর কখনও দেখানো হয় না।", "Your name or phone number is never shown.") + "</li>" + "</ul>");
  loadShares();
}

async function loadShares() {
  const box = emgSink("shareList");
  if (!box) return;
  try {
    const shares = await api("/api/shares");
    if (!emgSink("shareList")) return;
    if (!shares.length) {
      box.innerHTML = emptyState(emgText("কোনো সক্রিয় শেয়ার নেই", "No active shares"));
      return;
    }
    box.innerHTML = emgCard("🔗 " + emgText("সক্রিয় শেয়ার", "Active shares"), '<div class="stack">' + shares.map(shareRowHtml).join("") + "</div>");
    emgCountdownsOn();
  } catch (e) {
    box.innerHTML = emptyState(apiErrorMessage(e), '<button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="loadShares()">' + t("retry") + "</button>");
  }
}

function shareRowHtml(share) {
  const url = window.location.origin + "/#/track/" + share.token;
  const body = emgText("আমার লাইভ লোকেশন: ", "My live location: ") + url;
  const ended = share.revoked || share.expired;
  return '<div class="list-item"><div class="list-main">' + '<div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">' +
    (ended ? statusBadge("CANCELLED") : statusBadge("ACTIVE")) +
    (share.note ? "<strong>" + esc(share.note) + "</strong>" : '<span class="mono">' + esc(share.token.slice(0, 8)) + "…</span>") + "</div>" +
    '<div class="list-meta mono small" style="word-break:break-all">' + esc(url) + "</div>" + '<div class="small muted">' +
    emgText("মেয়াদ: ", "Expires: ") + '<span data-exp="' + esc(share.expiresAt) + '">—</span>' + " · " + emgText("বাকি ভিউ: ", "Views left: ") +
    esc(Math.max(0, Number(share.maxViews) - Number(share.viewCount))) + "/" + esc(share.maxViews) +
    " · " + esc(fmtDate(share.createdAt, true)) + "</div></div>" + '<div class="list-actions" style="flex-wrap:wrap;gap:6px">' +
    '<button class="btn btn-primary btn-sm" onclick="shareCopy(\'' + url + '\')">' + emgText("কপি", "Copy") + "</button>" +
    '<a class="btn btn-outline btn-sm" href="sms:?body=' + encodeURIComponent(body) + '">SMS</a>' + (ended ? "" :
      '<button class="btn btn-outline btn-sm" onclick="shareUpdate(\'' + share.id + '\')">' + emgText("এখন আপডেট", "Update now") + "</button>" +
      '<button class="btn btn-white btn-sm" onclick="shareStop(\'' + share.id + '\')">' + emgText("থামান", "Stop") + "</button>") + "</div></div>";
}

window.shareStart = async function () {
  emgBusy("shStartBtn", true);
  try {
    const geo = await emgGeo(10000);
    if (!geo) {
      toast(emgText("লোকেশন পাওয়া যায়নি — জিপিএস অনুমতি দিন", "Location unavailable — allow GPS permission"), "error");
      return;
    }
    const note = emgVal("shNote");
    await api("/api/shares", {
      method: "POST", body: JSON.stringify({
        note: note || null, latitude: geo.latitude, longitude: geo.longitude, validityMinutes: Number(emgVal("shMinutes")) || 30, maxViews: 50
      })
    });
    toast(emgText("শেয়ার শুরু হয়েছে", "Sharing started"), "success");
    loadShares();
  } catch (e) {
    emgErr(e);
  } finally {
    emgBusy("shStartBtn", false);
  }
};

window.shareCopy = async function (url) {
  try {
    await navigator.clipboard.writeText(url);
    toast(emgText("লিংক কপি হয়েছে", "Link copied"), "success");
    return;
  } catch { /* clipboard API blocked — fall back to a hidden textarea */ }
  try {
    const area = document.createElement("textarea");
    area.value = url;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    toast(emgText("লিংক কপি হয়েছে", "Link copied"), "success");
  } catch {
    toast(url, "");
  }
};

window.shareUpdate = async function (id) {
  try {
    const geo = await emgGeo(10000);
    if (!geo) { toast(emgText("লোকেশন পাওয়া যায়নি", "Location unavailable"), "error"); return; }
    await api("/api/shares/" + id + "/location", {
      method: "PUT", body: JSON.stringify({ latitude: geo.latitude, longitude: geo.longitude })
    });
    toast(emgText("অবস্থান হালনাগাদ হয়েছে", "Location updated"), "success");
    loadShares();
  } catch (e) { emgErr(e); }
};

window.shareStop = async function (id) {
  if (!window.confirm(emgText("শেয়ার বন্ধ করবেন?", "Stop this share?"))) return;
  try {
    await api("/api/shares/" + id, { method: "DELETE" });
    toast(emgText("শেয়ার বন্ধ হয়েছে", "Share stopped"), "success");
    loadShares();
  } catch (e) { emgErr(e); }
};

/* ─── 8. Trusted contacts ────────────────────────────────────────────────── */

var EMG_RELATIONSHIPS = [
  ["Family", "পরিবার"], ["Friend", "বন্ধু"], ["Neighbor", "প্রতিবেশী"], ["Partner", "সঙ্গী"], ["Coworker", "সহকর্মী"], ["Other", "অন্যান্য"]
];

function emgRelationshipOptions(selected) {
  return EMG_RELATIONSHIPS.map(r =>
    '<option value="' + r[0] + '"' + (selected === r[0] ? " selected" : "") + ">" + esc(LANG === "bn" ? r[1] : r[0]) + "</option>").join("");
}

async function renderContactsPage() {
  if (!token) { navigate("login"); return; }
  emgStopAllTimers();

  document.getElementById("app").innerHTML =
    shell(emgSection('<div id="ctBody">' + spinner() + "</div>"), "contacts");
  await loadContacts();
}

async function loadContacts() {
  const sink = emgSink("ctBody");
  if (!sink) return;
  try {
    const contacts = await api("/api/contacts");
    if (!emgSink("ctBody")) return;
    window.__contactsData = contacts;

    const full = contacts.length >= 10;
    sink.innerHTML = emgHead(t("contacts"), emgText("সর্বোচ্চ ১০ জন — জরুরি অ্যালার্ট ও স্ট্যাটাস আপডেট পান", "Up to 10 people get alerts and updates")) +
      '<div class="grid" style="grid-template-columns:1fr;gap:20px;max-width:820px">' + (full
        ? '<div class="alert alert-warn">' + emgText("১০ জনের বেশি যোগ করা যাবে না — আগে একজনকে মুছুন।", "You have reached the 10-contact limit — remove one first.") + "</div>"
        : '<div class="flex"><button class="btn btn-primary" onclick="contactNew()">➕ ' + emgText("পরিচিতি যোগ করুন", "Add contact") + "</button></div>") +
      '<div id="ctForm" class="card hidden">' + contactFormHtml(null) + "</div>" + '<div class="card"><div class="card-header">' + emgText("তালিকা", "List") + "</div>" + (contacts.length
        ? '<div class="stack">' + contacts.map(contactRowHtml).join("") + "</div>"
        : emptyState(emgText("কোনো বিশ্বস্ত পরিচিতি নেই", "No trusted contacts yet"))) + "</div></div>";
  } catch (e) {
    const el = emgSink("ctBody");
    if (el) {
      el.innerHTML = emptyState(apiErrorMessage(e), '<button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="loadContacts()">' + t("retry") + "</button>");
    }
  }
}

function contactRowHtml(c) {
  return '<div class="list-item"><div class="list-main">' + '<div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">' +
    "<strong>" + esc(c.displayName) + "</strong>" + (c.relationship ? '<span class="badge badge-muted">' + esc(c.relationship) + "</span>" : "") +
    (Number(c.priority) === 1 ? '<span class="chip">' + emgText("প্রাথমিক", "Primary") + "</span>" : "") +
    (c.isVerified ? '<span class="badge badge-success">' + t("verified") + "</span>" : "") + "</div>" +
    '<div class="list-meta mono">' + esc(c.phoneNumberMasked || "") + (c.locationPrecision ? " · " + esc(c.locationPrecision) : "") + "</div></div>" +
    '<div class="list-actions">' + '<button class="btn btn-outline btn-sm" onclick="contactEdit(\'' + c.id + '\')">' +
    emgText("সম্পাদনা", "Edit") + "</button>" + '<button class="btn btn-white btn-sm" onclick="contactDelete(\'' + c.id + '\')">' + t("delete") + "</button></div></div>";
}

function contactFormHtml(contact) {
  return '<div class="card-header">' + (contact ? emgText("পরিচিতি সম্পাদনা", "Edit contact") : emgText("নতুন পরিচিতি", "New contact")) + "</div>" +
    '<input id="ctId" type="hidden" value="' + esc(contact ? contact.id : "") + '">' + '<div class="grid grid-2">' +
    emgField(emgText("নাম", "Name") + ' <span style="color:var(--danger)">*</span>',
      '<input id="ctName" class="form-control" type="text" maxlength="80" value="' + esc(contact ? contact.displayName : "") + '">') +
    emgField(emgText("সম্পর্ক", "Relationship"), '<select id="ctRelationship" class="form-control">' +
      emgRelationshipOptions(contact ? contact.relationship : "Family") + "</select>") + "</div>" +
    emgField(emgText("ফোন নম্বর", "Phone number") + ' <span style="color:var(--danger)">*</span>',
      '<input id="ctPhone" class="form-control" type="tel" inputmode="numeric" maxlength="11" placeholder="01XXXXXXXXX" ' +
      'value="' + esc(contact && !String(contact.phoneNumberMasked || "").includes("*") ? contact.phoneNumberMasked : "") + '">',
      contact && String(contact.phoneNumberMasked || "").includes("*")
        ? emgText("নম্বর সুরক্ষার জন্য লুকানো — পরিবর্তন করতে পুরো নম্বর লিখুন।", "The number is masked for safety — retype the full number to change it.")
        : emgText("বাংলাদেশি ফরম্যাট: 01XXXXXXXXX", "Bangladesh format: 01XXXXXXXXX")) + '<div class="flex" style="gap:16px;flex-wrap:wrap;margin-bottom:16px">' +
    '<label style="display:flex;gap:6px;align-items:center;font-size:.9rem">' +
    '<input id="ctPrimary" type="checkbox"' + (contact && Number(contact.priority) === 1 ? " checked" : "") + "> " +
    emgText("প্রাথমিক পরিচিতি", "Primary contact") + "</label>" + '<label style="display:flex;gap:6px;align-items:center;font-size:.9rem">' +
    '<input id="ctAlerts" type="checkbox" checked> ' + emgText("জরুরি অ্যালার্ট পাবেন", "Receives emergency alerts") + "</label>" +
    '<label style="display:flex;gap:6px;align-items:center;font-size:.9rem">' + '<input id="ctUpdates" type="checkbox" checked> ' +
    emgText("স্ট্যাটাস আপডেট পাবেন", "Receives status updates") + "</label>" + "</div>" + '<div class="flex" style="gap:10px;flex-wrap:wrap">' +
    '<button id="ctSaveBtn" class="btn btn-primary" onclick="contactSave()">' + t("save") + "</button>" +
    '<button class="btn btn-outline" onclick="emgToggle(\'ctForm\')">' + t("cancel") + "</button></div>";
}

window.contactNew = function () {
  const form = emgSink("ctForm");
  if (!form) return;
  form.innerHTML = contactFormHtml(null);
  form.classList.remove("hidden");
  const name = emgSink("ctName");
  if (name) name.focus();
};

window.contactEdit = function (id) {
  const contact = (window.__contactsData || []).find(c => c.id === id);
  const form = emgSink("ctForm");
  if (!contact || !form) return;
  form.innerHTML = contactFormHtml(contact);
  form.classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.contactSave = async function () {
  const contacts = window.__contactsData || [];
  const id = emgVal("ctId");
  const name = emgVal("ctName");
  const phone = emgVal("ctPhone");
  if (!name) { toast(emgText("নাম আবশ্যক", "Name is required"), "error"); return; }
  if (!/^01[3-9]\d{8}$/.test(phone)) {
    toast(emgText("সঠিক ফোন নম্বর দিন (01XXXXXXXXX)", "Enter a valid phone number (01XXXXXXXXX)"), "error");
    return;
  }
  if (!id && contacts.length >= 10) {
    toast(emgText("সর্বোচ্চ ১০ জন পরিচিতি রাখা যাবে", "Maximum of 10 trusted contacts"), "error");
    return;
  }

  const existing = contacts.find(c => c.id === id);
  emgBusy("ctSaveBtn", true);
  try {
    const body = {
      displayName: name, phoneNumber: phone, relationship: emgVal("ctRelationship"), allowPushNotification: emgChecked("ctAlerts"),
      allowSms: emgChecked("ctUpdates"), allowPhoneCallShortcut: true, locationPrecision: "COARSE_AREA_ONLY",
      priority: emgChecked("ctPrimary") ? 1 : (existing ? existing.priority || 5 : 5),
      isPrimary: emgChecked("ctPrimary"), receivesEmergencyAlerts: emgChecked("ctAlerts"), receivesStatusUpdates: emgChecked("ctUpdates")
    };
    if (id) await api("/api/contacts/" + id, { method: "PUT", body: JSON.stringify(body) });
    else await api("/api/contacts", { method: "POST", body: JSON.stringify(body) });

    toast(emgText("পরিচিতি সংরক্ষিত হয়েছে", "Contact saved"), "success");
    await loadContacts();
  } catch (e) {
    emgErr(e);
  } finally {
    emgBusy("ctSaveBtn", false);
  }
};

window.contactDelete = async function (id) {
  if (!window.confirm(emgText("এই পরিচিতিকে মুছবেন?", "Delete this contact?"))) return;
  try {
    await api("/api/contacts/" + id, { method: "DELETE" });
    toast(emgText("পরিচিতি মুছে ফেলা হয়েছে", "Contact deleted"), "success");
    await loadContacts();
  } catch (e) { emgErr(e); }
};

/* ─── route registration ─────────────────────────────────────────────────── */

registerPage("dashboard", renderEmergencyDashboard);
registerPage("emergency", renderSosPage);
registerPage("report", renderReportPage);
registerPage("incidents", renderIncidentsPage);
registerPage("tools", renderToolsPage);
registerPage("trips", renderTripsPage);
registerPage("share", renderSharePage);
registerPage("contacts", renderContactsPage);
