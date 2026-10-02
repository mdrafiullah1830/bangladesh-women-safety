/* Women Safety BD — public pages: home, directory, safety, statistics, track */

/* ─── shared helpers ─────────────────────────────────────────────────────── */

function pubLabel(pair) { return LANG === "bn" ? pair[0] : pair[1]; }

function pubCatLabel(cat) {
  const map = {
    POLICE: ["পুলিশ", "Police"],
    HOSPITAL: ["হাসপাতাল", "Hospital"],
    FIRE_SERVICE: ["ফায়ার সার্ভিস", "Fire service"],
    AMBULANCE: ["অ্যাম্বুলেন্স", "Ambulance"],
    LEGAL_AID: ["আইনি সহায়তা", "Legal aid"],
    COUNSELING: ["কাউন্সেলিং", "Counseling"],
    SAFE_PLACE: ["নিরাপদ স্থান", "Safe place"],
    SHELTER: ["আশ্রয়", "Shelter"],
    ONE_STOP: ["ওয়ান স্টপ ক্রাইসিস সেন্টার", "One-stop crisis centre"],
    GOVERNMENT: ["সরকারি", "Government"]
  };
  return map[cat] ? pubLabel(map[cat]) : cat;
}

function pubTipCatLabel(cat) {
  const map = {
    TRAVEL: ["ভ্রমণ", "Travel"],
    NIGHT: ["রাত্রিকালীন", "Night"],
    HOME: ["বাড়ি", "Home"],
    DIGITAL: ["ডিজিটাল", "Digital"],
    LEGAL: ["আইন", "Legal"],
    MENTAL: ["মানসিক স্বাস্থ্য", "Mental health"],
    EMERGENCY: ["জরুরি", "Emergency"],
    SELF_DEFENCE: ["আত্মরক্ষা", "Self defence"]
  };
  return map[cat] ? pubLabel(map[cat]) : cat;
}

function pubH2(text, sub) {
  return '<div class="section-header"><h2>' + esc(text) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "") + "</div>";
}

function pubKpi(value, label) {
  return '<div class="kpi"><div class="kpi-value">' + esc(String(value)) + '</div><div class="kpi-label">' + esc(label) + "</div></div>";
}

function pubEmCard(n) {
  return '<div class="em-card"><div class="info"><h3>' + esc(n.service) + "</h3>" +
    (n.serviceBn ? '<div class="bn">' + esc(n.serviceBn) + "</div>" : "") +
    (n.note ? '<div class="small muted" style="margin-top:4px">' + esc(n.note) + "</div>" : "") + "</div>" +
    '<a class="dial" href="tel:' + esc(n.number) + '">' + esc(n.number) + "</a></div>";
}

function pubNumbersTable(rows) {
  if (!rows || !rows.length) return emptyState(t("none"));
  const h1 = LANG === "bn" ? "সেবা" : "Service";
  const h2 = LANG === "bn" ? "বাংলা নাম" : "Bangla name";
  const h4 = LANG === "bn" ? "২৪×৭" : "24×7";
  const h5 = LANG === "bn" ? "তথ্য" : "Note";
  return '<div class="table-wrap"><table><thead><tr>' + "<th>" + h1 + "</th><th>" + h2 + "</th><th>" + t("phone") + "</th>" +
    "<th>" + h4 + "</th><th>" + h5 + "</th><th>" + t("action") + "</th></tr></thead><tbody>" + rows.map(n =>
      "<tr><td><strong>" + esc(n.service) + "</strong></td>" + '<td class="bangla">' + esc(n.serviceBn || "") + "</td>" +
      '<td class="mono nowrap">' + esc(n.number) + "</td>" + "<td>" + (n.is24x7 ? '<span class="chip">24×7</span>' : "—") + "</td>" +
      '<td class="small muted">' + esc(n.note || "") + "</td>" +
      '<td><a class="btn btn-danger btn-sm" href="tel:' + esc(n.number) + '">' + t("call") + "</a></td></tr>"
    ).join("") + "</tbody></table></div>";
}

function pubEntryRow(e, isNearby) {
  const chips = '<span class="badge badge-info">' + esc(pubCatLabel(e.category)) + "</span>" + (e.is24x7 ? '<span class="chip">24×7</span>' : "") +
    (isNearby && e.distanceMeters !== null && e.distanceMeters !== undefined
      ? '<span class="badge badge-muted">📍 ' + esc(fmtDistance(e.distanceMeters)) + "</span>"
      : "");
  const actions =
    (e.phoneNumber
      ? '<a class="btn btn-primary btn-sm" href="tel:' + esc(e.phoneNumber) + '">' + t("call") + " " + esc(e.phoneNumber) + "</a>"
      : "") + (isNearby && e.mapUri
      ? '<a class="btn btn-outline btn-sm" href="' + esc(e.mapUri) + '" target="_blank" rel="noopener">🗺️ ' + t("open") + "</a>"
      : "");
  return '<div class="list-item"><div class="list-main">' + '<div class="flex" style="gap:8px;align-items:center;flex-wrap:wrap">' +
    "<strong>" + esc(e.name) + "</strong>" + chips + "</div>" + '<div class="list-meta">' + esc(e.address || "") +
    (e.districtName ? " · " + esc(e.districtName) : "") + "</div></div>" +
    (actions ? '<div class="list-actions">' + actions + "</div>" : "") + "</div>";
}

function pubDefsHtml(defs) {
  if (!defs || !defs.length) return emptyState(t("none"));
  return "<div>" + defs.map(d =>
    '<div class="def-item"><div class="key">' + esc(LANG === "bn" ? d.labelBn : d.labelEn) +
    '</div><div class="meaning">' + esc(d.meaning) + "</div></div>"
  ).join("") + "</div>";
}

function pubMonthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - (Number(n) || 6));
  return d.toISOString().slice(0, 10);
}

/* ─── checklist storage ──────────────────────────────────────────────────── */

function pubChecklistItems() {
  return [
    ["ফোন চার্জ ৩০% বা তার বেশি", "Phone charged ≥ 30%"],
    ["লাইভ লোকেশন শেয়ার করা হয়েছে", "Live location shared"],
    ["অ্যাপে যাত্রা (ট্রিপ) শুরু করা হয়েছে", "Trip started in the app"],
    ["পথটি কেউ একজন জানেন", "Someone knows your route"],
    ["জরুরি নম্বরগুলো সেভ করা আছে", "Emergency numbers saved"]
  ];
}

function pubReadChecklist() {
  try {
    const raw = JSON.parse(localStorage.getItem("ws-checklist") || "null");
    if (Array.isArray(raw) && raw.length === 5) return raw.map(v => !!v);
  } catch { /* corrupted storage falls back to defaults */ }
  return [false, false, false, false, false];
}

function pubWriteChecklist(arr) {
  try { localStorage.setItem("ws-checklist", JSON.stringify(arr)); } catch { /* storage may be unavailable */ }
}

/* ─── PWA install prompt ─────────────────────────────────────────────────── */

window.__installPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.__installPrompt = e;
  pubRenderInstall();
});

function pubIsStandalone() {
  try {
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
  } catch { /* matchMedia unavailable */ }
  return !!(navigator && navigator.standalone);
}

window.pubInstall = async function () {
  const p = window.__installPrompt;
  if (!p) {
    toast(pubLabel(["ব্রাউজার মেনু থেকে “হোম স্ক্রিনে যোগ করুন” বেছে নিন", "Use your browser menu → “Add to Home Screen”"]), "");
    return;
  }
  p.prompt();
  try { await p.userChoice; } catch { /* user dismissed */ }
  window.__installPrompt = null;
  pubRenderInstall();
};

function pubRenderInstall() {
  const el = document.getElementById("homeInstall");
  if (!el) return;
  if (pubIsStandalone()) { el.innerHTML = ""; return; }
  const title = pubLabel(["অ্যাপ ইনস্টল করুন", "Install app"]);
  const body = pubLabel(["ফোনে ইনস্টল করলে অফলাইনেও নিরাপত্তা টিপস ও জরুরি নম্বর দেখা যাবে।", "Install the app to reach safety tips and emergency numbers even offline."]);
  const btn = window.__installPrompt
    ? '<button class="btn btn-primary btn-sm" onclick="window.pubInstall()">' + pubLabel(["ইনস্টল করুন", "Install"]) + "</button>"
    : '<span class="small muted">' + pubLabel(["মেনু → “হোম স্ক্রিনে যোগ করুন”", "Menu → “Add to Home Screen”"]) + "</span>";
  el.innerHTML = '<div class="card"><div class="card-header">📲 ' + title + "</div>" +
    '<p class="small" style="color:var(--text-sec)">' + body + "</p>" + '<div class="flex" style="margin-top:8px">' + btn + "</div></div>";
}

/* ─── navigation shims for inline handlers ───────────────────────────────── */

window.pubGo = function (route) {
  if (currentRoute() === route) renderRoute();
  else navigate(route);
};

window.pubGoLaws = function () {
  window.__safetyState = window.__safetyState || { tab: "tips", category: "", nightOnly: isNightNow() };
  window.__safetyState.tab = "laws";
  if (currentRoute() === "safety") renderRoute();
  else navigate("safety");
};

/* ─── route registration ─────────────────────────────────────────────────── */

registerPage("", renderHome);
registerPage("directory", renderDirectory);
registerPage("safety", renderSafety);
registerPage("stats", renderPublicStats);
registerPage("track", renderTrack);

/* ─── 1. Home (public landing) ───────────────────────────────────────────── */

async function renderHome() {
  const title = pubLabel(["আপনার নিরাপত্তা, আপনার হাতে", "Your safety, in your hands"]);
  const sub = pubLabel(["জরুরি সহায়তা, বিশ্বস্ত পরিচিতি ও বাংলাদেশ জুড়ে নিরাপত্তা তথ্য", "Emergency help, trusted contacts and safety information across Bangladesh"]);

  let html = '<section class="hero"><div class="container">' + "<h1>" + esc(title) + "</h1>" + '<p class="subtitle">' + esc(sub) + "</p>" +
    '<p class="bangla">🛡️ ' + pubLabel(["সবার জন্য বিনামূল্যে — কোনো ব্যক্তিগত তথ্য প্রকাশ করা হয় না", "Free for everyone — no personal data is ever published"]) + "</p>" +
    '<div class="hero-actions">' + '<button class="btn btn-danger btn-lg" onclick="window.pubGo(\'emergency\')">🚨 ' +
    pubLabel(["জরুরি সক্রিয় করুন", "Activate Emergency"]) + "</button>" +
    '<button class="btn btn-white btn-lg" onclick="window.pubGo(\'stats\')">📊 ' + pubLabel(["পরিসংখ্যান দেখুন", "View Statistics"]) + "</button>" +
    '<button class="btn btn-outline btn-lg" onclick="window.pubGo(\'directory\')">📒 ' + t("directory") + "</button>" +
    '<button class="btn btn-outline btn-lg" onclick="window.pubGo(\'safety\')">💡 ' + t("tips") + "</button>" + "</div></div></section>";

  if (isNightNow()) {
    const nightTips = [
      pubLabel(["কম জনালেনা ও অন্ধকার রাস্তা এড়িয়ে চলুন", "Avoid deserted and poorly lit roads"]),
      pubLabel(["বের হওয়ার আগে লাইভ লোকেশন শেয়ার করুন", "Share live location before you leave"]),
      pubLabel(["৯৯৯ / ১০৯ আগে থেকেই ডায়াল করার জন্য প্রস্তুত রাখুন", "Keep 999 / 109 ready to dial"])
    ];
    html += '<div class="section"><div class="container"><div class="alert alert-warn">🌙 <strong>' +
      pubLabel(["রাত্রিকালীন নিরাপত্তা", "Night-time safety"]) + '</strong><ul style="margin:8px 0 0 18px">' +
      nightTips.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul></div></div></div>";
  }

  html += '<div class="section"><div class="container">' + pubH2(t("emergencyNumbers"), pubLabel(["এক ট্যাপে কল করুন", "One tap to call"])) +
    '<div class="grid grid-2" id="homeNumGrid">' + spinner() + "</div></div></div>";

  const steps = [
    ["📝", pubLabel(["ঘটনা প্রতিবেদন", "Report an incident"]),
      pubLabel(["অফলাইনেও তথ্য ও প্রমাণসহ সংরক্ষণ করুন — পরে সিঙ্ক হবে।", "Record details and evidence offline — it syncs later."])],
    ["🚨", pubLabel(["জরুরি সাহায্য নিন", "Get emergency help"]),
      pubLabel(["এক ট্যাপে বিশ্বস্ত পরিচিতিদের সতর্কতা ও লাইভ লোকেশন পাঠান।", "One tap alerts your trusted contacts with live location."])],
    ["📖", pubLabel(["সাহায্য ও তথ্য দেখুন", "Find help & data"]),
      pubLabel(["হেল্পলাইন ডিরেক্টরি এবং গোপনীয়তা-সুরক্ষিত পরিসংখ্যান দেখুন।", "Browse the helpline directory and privacy-safe statistics."])]
  ];
  html += '<div class="section section-alt"><div class="container">' + pubH2(pubLabel(["কীভাবে কাজ করে", "How it works"])) +
    '<div class="grid grid-3">' + steps.map(s =>
      '<div class="card"><div class="card-header">' + s[0] + " " + esc(s[1]) + "</div>" +
      '<p class="small" style="color:var(--text-sec)">' + esc(s[2]) + "</p></div>"
    ).join("") + "</div></div></div>";

  html += '<div class="section"><div class="container">' + pubH2(pubLabel(["পরিভাষা", "Terminology"]),
      pubLabel(["পরিসংখ্যানের প্রতিটি শব্দের ঠিক কী অর্থ — কোনোটাই প্রমাণিত অপরাধ বোঝায় না", "Exactly what each figure means — none of them mean a proven crime"])) +
    '<div id="homeDefs">' + spinner() + "</div>" + '<div id="homeInstall" style="margin-top:16px"></div>' + "</div></div>";

  document.getElementById("app").innerHTML = shell(html, "");

  try {
    const nums = await api("/api/directory/numbers?lang=" + LANG);
    const grid = document.getElementById("homeNumGrid");
    if (grid) grid.innerHTML = nums.length ? nums.map(pubEmCard).join("") : emptyState(t("none"));
  } catch (e) {
    const grid = document.getElementById("homeNumGrid");
    if (grid) grid.innerHTML = emptyState(apiErrorMessage(e));
  }

  try {
    const defs = await api("/api/public/definitions?lang=" + LANG);
    const box = document.getElementById("homeDefs");
    if (box) box.innerHTML = pubDefsHtml(defs);
  } catch (e) {
    const box = document.getElementById("homeDefs");
    if (box) box.innerHTML = emptyState(apiErrorMessage(e));
  }

  pubRenderInstall();
}

/* ─── 2. Directory ───────────────────────────────────────────────────────── */

window.__dirState = { tab: "numbers", category: "", districtId: "", q: "", lat: null, lng: null };

async function renderDirectory() {
  const s = window.__dirState;
  const tabs = [
    ["numbers", t("emergencyNumbers")],
    ["places", pubLabel(["স্থান", "Places"])],
    ["nearby", t("nearby")]
  ];
  const html = '<div class="container section">' + '<div class="page-head"><h1 class="page-title">📒 ' + t("directory") + "</h1>" +
    '<p class="page-sub">' + pubLabel(["বাংলাদেশের জরুরি নম্বর, পুলিশ, হাসপাতাল, আইনি সহায়তা ও নিরাপদ স্থান", "Emergency numbers, police, hospitals, legal aid and safe places across Bangladesh"]) + "</p></div>" +
    '<div class="tabs">' + tabs.map(x =>
      '<button class="tab' + (s.tab === x[0] ? " active" : "") + '" onclick="window.pubDirTab(\'' + x[0] + "')\">" + esc(x[1]) + "</button>"
    ).join("") + "</div>" + '<div id="dirContent" style="margin-top:16px">' + spinner() + "</div>" + '<div class="divider"></div>' +
    '<div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">' +
    '<span class="muted small">' + pubLabel(["দ্রুত লিংক", "Quick links"]) + ":</span>" + '<a class="chip" href="#/safety">💡 ' + t("tips") + "</a>" +
    '<button class="chip" onclick="window.pubGoLaws()">⚖️ ' + t("laws") + "</button>" + '<a class="chip" href="#/stats">📊 ' + t("stats") + "</a>" +
    "</div></div>";

  document.getElementById("app").innerHTML = shell(html, "directory");
  await pubDirLoad();
}

window.pubDirTab = function (tab) {
  window.__dirState.tab = tab;
  renderDirectory();
};

window.pubDirFilter = function () {
  const s = window.__dirState;
  const cat = document.getElementById("dirCat");
  const dist = document.getElementById("dirDistrict");
  const q = document.getElementById("dirQ");
  if (cat) s.category = cat.value;
  if (dist) s.districtId = dist.value;
  if (q) s.q = q.value;
  pubDirQuery();
};

async function pubDirLoad() {
  const s = window.__dirState;
  const el = document.getElementById("dirContent");
  if (!el) return;

  if (s.tab === "numbers") {
    try {
      const rows = await api("/api/directory/numbers?lang=" + LANG);
      const box = document.getElementById("dirContent");
      if (box) box.innerHTML = pubNumbersTable(rows);
    } catch (e) {
      const box = document.getElementById("dirContent");
      if (box) box.innerHTML = emptyState(apiErrorMessage(e));
    }
    return;
  }

  if (s.tab === "places") {
    const cats = ["POLICE", "HOSPITAL", "FIRE_SERVICE", "AMBULANCE", "LEGAL_AID",
      "COUNSELING", "SAFE_PLACE", "SHELTER", "ONE_STOP", "GOVERNMENT"];
    el.innerHTML =
      '<div class="card" style="margin-bottom:16px"><div class="grid grid-3">' + '<div class="form-group"><label>' + t("category") + "</label>" +
      '<select id="dirCat" class="form-control" onchange="window.pubDirFilter()">' + '<option value="">' + t("all") + "</option>" +
      cats.map(c => '<option value="' + c + '"' + (s.category === c ? " selected" : "") + ">" + esc(pubCatLabel(c)) + "</option>").join("") +
      "</select></div>" + '<div class="form-group"><label>' + t("district") + "</label>" + '<div id="dirDistrictWrap">' + spinner() + "</div></div>" +
      '<div class="form-group"><label>' + t("search") + "</label>" + '<div class="flex" style="gap:8px">' +
      '<input id="dirQ" class="form-control" value="' + esc(s.q) + '" placeholder="' + esc(pubLabel(["নাম দিয়ে খুঁজুন", "Search by name"])) +
      '" onkeydown="if(event.key===\'Enter\')window.pubDirFilter()">' +
      '<button class="btn btn-primary btn-sm" onclick="window.pubDirFilter()">' + t("search") + "</button>" + "</div></div></div></div>" +
      '<div id="dirList">' + spinner() + "</div>";

    try {
      await ensureDistricts();
      const wrap = document.getElementById("dirDistrictWrap");
      if (wrap) {
        wrap.innerHTML = districtSelectHtml("dirDistrict", s.districtId);
        const sel = document.getElementById("dirDistrict");
        if (sel) {
          sel.value = s.districtId || "";
          sel.onchange = window.pubDirFilter;
        }
      }
    } catch (e) {
      const wrap = document.getElementById("dirDistrictWrap");
      if (wrap) wrap.innerHTML = '<span class="small muted">' + esc(apiErrorMessage(e)) + "</span>";
    }
    pubDirQuery();
    return;
  }

  el.innerHTML = '<div class="card"><div class="flex flex-between" style="flex-wrap:wrap;gap:12px">' +
    "<div><strong>" + pubLabel(["আপনার আশেপাশে", "Around your location"]) + "</strong>" +
    '<div class="small muted">' + pubLabel(["অবস্থান ব্যবহার করে কাছাকাছি পুলিশ, হাসপাতাল ও নিরাপদ স্থান দেখুন", "Use your location to see nearby police, hospitals and safe places"]) + "</div></div>" +
    '<button class="btn btn-primary" onclick="window.pubNearby()">📍 ' +
    pubLabel(["আমার অবস্থান ব্যবহার করুন", "Use my location"]) + "</button></div>" + '<div id="nearbyList" style="margin-top:16px">' + (s.lat !== null
      ? spinner()
      : emptyState(pubLabel(["অবস্থানের অনুমতি দিলে ফলাফল দেখানো হবে", "Allow location access to see results"]))) + "</div></div>";
  if (s.lat !== null) pubNearbyQuery();
}

async function pubDirQuery() {
  const s = window.__dirState;
  const list = document.getElementById("dirList");
  if (!list) return;
  list.innerHTML = spinner();
  const params = new URLSearchParams({ lang: LANG });
  if (s.category) params.set("category", s.category);
  if (s.districtId) params.set("districtId", s.districtId);
  if (s.q && s.q.trim()) params.set("q", s.q.trim());
  try {
    const rows = await api("/api/directory?" + params.toString());
    const box = document.getElementById("dirList");
    if (!box) return;
    box.innerHTML = rows.length
      ? rows.map(e => pubEntryRow(e, false)).join("")
      : emptyState(pubLabel(["কোনো মিল পাওয়া যায়নি", "No matching places"]));
  } catch (e) {
    const box = document.getElementById("dirList");
    if (box) box.innerHTML = emptyState(apiErrorMessage(e));
  }
}

window.pubNearby = function () {
  const s = window.__dirState;
  if (!navigator.geolocation) {
    toast(pubLabel(["এই ব্রাউজারে অবস্থান সমর্থিত নয়", "Location is not supported in this browser"]), "error");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      s.lat = pos.coords.latitude;
      s.lng = pos.coords.longitude;
      pubNearbyQuery();
    },
    () => toast(pubLabel(["অবস্থানের অনুমতি পাওয়া যায়নি", "Location permission was denied"]), "error"),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
};

async function pubNearbyQuery() {
  const s = window.__dirState;
  const list = document.getElementById("nearbyList");
  if (!list || s.lat === null) return;
  list.innerHTML = spinner();
  try {
    const data = await api("/api/directory/nearby?lat=" + s.lat + "&lng=" + s.lng + "&limit=12&lang=" + LANG);
    const box = document.getElementById("nearbyList");
    if (!box) return;
    const rows = data.results || [];
    box.innerHTML = rows.length
      ? rows.map(e => pubEntryRow(e, true)).join("")
      : emptyState(pubLabel(["কাছাকাছি কিছু পাওয়া যায়নি", "Nothing found nearby"]));
  } catch (e) {
    const box = document.getElementById("nearbyList");
    if (box) box.innerHTML = emptyState(apiErrorMessage(e));
  }
}

/* ─── 3. Safety (tips / laws / checklist) ────────────────────────────────── */

window.__safetyState = { tab: "tips", category: "", nightOnly: isNightNow() };

async function renderSafety() {
  const s = window.__safetyState;
  const tabs = [
    ["tips", t("tips")],
    ["laws", t("laws")],
    ["checklist", pubLabel(["চেকলিস্ট", "Checklist"])]
  ];
  const html = '<div class="container section">' + '<div class="page-head"><h1 class="page-title">💡 ' + t("safety") + "</h1>" +
    '<p class="page-sub">' + pubLabel(["যাত্রার আগে ও পরে নিরাপত্তার ছোট ছোট অভ্যাস — আইন ও প্রস্তুতি চেকলিস্টসহ", "Small safety habits before and after you go out — plus laws and a readiness checklist"]) + "</p></div>" +
    '<div class="tabs">' + tabs.map(x =>
      '<button class="tab' + (s.tab === x[0] ? " active" : "") + '" onclick="window.pubSafetyTab(\'' + x[0] + "')\">" + esc(x[1]) + "</button>"
    ).join("") + "</div>" + '<div id="safetyContent" style="margin-top:16px">' + spinner() + "</div></div>";

  document.getElementById("app").innerHTML = shell(html, "safety");
  await pubSafetyLoad();
}

window.pubSafetyTab = function (tab) {
  window.__safetyState.tab = tab;
  renderSafety();
};

window.pubSafetyCat = function (cat) {
  window.__safetyState.category = cat;
  pubSafetyLoad();
};

window.pubSafetyNight = function (on) {
  window.__safetyState.nightOnly = !!on;
  pubSafetyLoad();
};

window.pubToggleCheck = function (i, on) {
  const arr = pubReadChecklist();
  arr[i] = !!on;
  pubWriteChecklist(arr);
  const n = arr.filter(Boolean).length;
  const badge = document.getElementById("clCount");
  if (badge) badge.textContent = n + "/5";
  const fill = document.getElementById("clBar");
  if (fill) fill.style.width = (n / 5) * 100 + "%";
};

async function pubSafetyLoad() {
  const s = window.__safetyState;
  const el = document.getElementById("safetyContent");
  if (!el) return;

  if (s.tab === "checklist") { pubRenderChecklist(el); return; }

  el.innerHTML = spinner();
  if (s.tab === "laws") {
    try {
      const rows = await api("/api/directory/laws?lang=" + LANG);
      const box = document.getElementById("safetyContent");
      if (!box) return;
      box.innerHTML = rows.length
        ? '<div class="grid grid-2">' + rows.map(l =>
          '<div class="card"><div class="card-header">⚖️ ' + esc(l.title) + "</div>" +
          (l.lawReference ? '<div style="margin-bottom:8px"><span class="badge badge-info mono">' + esc(l.lawReference) + "</span></div>" : "") +
          '<p class="small" style="color:var(--text-sec)">' + esc(l.summary || "") + "</p>" +
          '<div class="flex" style="gap:8px;margin-top:12px;flex-wrap:wrap">' + (l.phone
            ? '<a class="btn btn-primary btn-sm" href="tel:' + esc(l.phone) + '">' + t("call") + " " + esc(l.phone) + "</a>"
            : "") + (l.website
            ? '<a class="btn btn-outline btn-sm" href="' + esc(l.website) + '" target="_blank" rel="noopener">' + t("open") + "</a>"
            : "") + "</div></div>").join("") + "</div>"
        : emptyState(t("none"));
    } catch (e) {
      const box = document.getElementById("safetyContent");
      if (box) box.innerHTML = emptyState(apiErrorMessage(e));
    }
    return;
  }

  try {
    const params = new URLSearchParams({ lang: LANG, nightOnly: s.nightOnly ? "true" : "false" });
    if (s.category) params.set("category", s.category);
    const data = await api("/api/directory/tips?" + params.toString());
    const box = document.getElementById("safetyContent");
    if (!box) return;
    const cats = data.categories || [];
    const tips = data.tips || [];
    const chips = '<div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">' +
      '<button class="chip' + (!s.category ? " active" : "") + '" onclick="window.pubSafetyCat(\'\')">' + t("all") + "</button>" +
      cats.map(c => '<button class="chip' + (s.category === c ? " active" : "") +
        '" onclick="window.pubSafetyCat(\'' + c + "')\">" + esc(pubTipCatLabel(c)) + "</button>").join("") + "</div>";
    const toggle = '<div class="seg-wrap" style="margin-bottom:12px"><div class="seg">' +
      '<button class="seg-btn' + (!s.nightOnly ? " active" : "") + '" onclick="window.pubSafetyNight(false)">☀️ ' +
      pubLabel(["সব টিপস", "All tips"]) + "</button>" +
      '<button class="seg-btn' + (s.nightOnly ? " active" : "") + '" onclick="window.pubSafetyNight(true)">🌙 ' +
      t("night") + "</button></div></div>";
    const cards = tips.length
      ? '<div class="grid grid-2">' + tips.map(tip =>
        '<div class="card"><div class="card-header">' + (tip.nightOnly ? "🌙" : "💡") + " " + esc(tip.title) +
        (tip.nightOnly ? ' <span class="chip" style="margin-left:auto">' + t("night") + "</span>" : "") + "</div>" +
        '<p class="small" style="color:var(--text-sec)">' + esc(tip.body || "") + "</p></div>"
      ).join("") + "</div>"
      : emptyState(pubLabel(["এই ফিল্টারে কোনো টিপস নেই", "No tips match this filter"]));
    box.innerHTML = chips + toggle + cards;
  } catch (e) {
    const box = document.getElementById("safetyContent");
    if (box) box.innerHTML = emptyState(apiErrorMessage(e));
  }
}

function pubRenderChecklist(el) {
  const items = pubChecklistItems();
  const state = pubReadChecklist();
  const n = state.filter(Boolean).length;
  const pct = (n / items.length) * 100;
  const title = pubLabel(["যাত্রার আগে প্রস্তুতি চেকলিস্ট", "Pre-going-out readiness checklist"]);
  const hint = pubLabel(["প্রতিটি বিষয় শুরুর আগে মিলিয়ে নিন — এই তথ্য শুধু আপনার ফোনে থাকে।", "Tick each item before you leave — this stays only on your phone."]);
  el.innerHTML = '<div class="card"><div class="card-header">✅ ' + title +
    ' <span class="badge badge-info" id="clCount" style="margin-left:auto">' + n + "/" + items.length + "</span></div>" +
    '<p class="small muted">' + hint + "</p>" +
    '<div class="bar-track" style="margin:12px 0 16px"><div class="bar-fill" id="clBar" style="width:' + pct + '%"></div></div>' +
    '<div class="checklist">' + items.map((it, i) =>
      '<label class="check-item" style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;cursor:pointer">' +
      '<input type="checkbox" style="margin-top:4px;width:18px;height:18px;accent-color:var(--primary)"' +
      (state[i] ? " checked" : "") + ' onchange="window.pubToggleCheck(' + i + ', this.checked)">' + "<span>" + esc(pubLabel(it)) + "</span></label>"
    ).join("") + "</div></div>";
}

/* ─── 4. Public statistics ───────────────────────────────────────────────── */

window.__statsState = { divisionId: "", districtId: "", months: 6 };

async function renderPublicStats() {
  const s = window.__statsState;
  const html = '<div class="container section">' + '<div class="page-head"><h1 class="page-title">📊 ' + t("stats") + "</h1>" +
    '<p class="page-sub">' + pubLabel(["গোপনীয়তা রক্ষা করে সংগৃহীত তথ্য — কোনো ব্যক্তির পরিচয় বা অবস্থান প্রকাশ করা হয় না", "Privacy-safe aggregated figures — no individual identity or location is ever published"]) + "</p></div>" +
    '<div class="card" style="margin-bottom:16px"><div class="grid grid-3">' +
    '<div class="form-group"><label>' + t("division") + '</label><div id="statsDivWrap">' + spinner() + "</div></div>" +
    '<div class="form-group"><label>' + t("district") + '</label><div id="statsDistWrap">' + spinner() + "</div></div>" +
    '<div class="form-group"><label>' + pubLabel(["মাস", "Months"]) + "</label>" +
    '<select id="statsMonths" class="form-control" onchange="window.pubStatsMonths(this.value)">' +
    [3, 6, 12].map(m => '<option value="' + m + '"' + (s.months === m ? " selected" : "") + ">" + m + "</option>").join("") +
    "</select></div></div></div>" + '<div id="statsBody">' + spinner() + "</div></div>";

  document.getElementById("app").innerHTML = shell(html, "stats");

  try {
    await ensureDistricts();
  } catch { /* selects still render with an "All" option */ }
  pubStatsFillSelects();
  await pubLoadStats();
}

function pubStatsFillSelects() {
  const s = window.__statsState;
  const divs = Array.isArray(window.__districts)
    ? window.__districts
    : ((window.__districts && window.__districts.divisions) || []);
  const wrap = document.getElementById("statsDivWrap");
  if (wrap) {
    let h = '<select id="statsDivision" class="form-control" onchange="window.pubStatsDivision(this.value)">' +
      '<option value="">' + t("all") + "</option>";
    divs.forEach(d => {
      h += '<option value="' + d.id + '"' + (s.divisionId === d.id ? " selected" : "") + ">" + esc(LANG === "bn" ? d.nameBn : d.nameEn) + "</option>";
    });
    wrap.innerHTML = h + "</select>";
  }
  const dist = document.getElementById("statsDistWrap");
  if (dist) {
    dist.innerHTML = districtSelectHtml("statsDistrict", s.districtId);
    const sel = document.getElementById("statsDistrict");
    if (sel) {
      sel.value = s.districtId || "";
      sel.onchange = () => window.pubStatsDistrict(sel.value);
    }
  }
}

window.pubStatsDivision = function (v) {
  window.__statsState.divisionId = v || "";
  window.__statsState.districtId = "";
  const ds = document.getElementById("statsDistrict");
  if (ds) ds.value = "";
  pubLoadStats();
};

window.pubStatsDistrict = function (v) {
  window.__statsState.districtId = v || "";
  pubLoadStats();
};

window.pubStatsMonths = function (v) {
  window.__statsState.months = Number(v) || 6;
  pubLoadStats();
};

async function pubFetchStatistics(s) {
  const q = "?lang=" + LANG + (s.divisionId ? "&divisionId=" + encodeURIComponent(s.divisionId) : "") + "&from=" + pubMonthsAgo(s.months);
  try {
    const a = await api("/api/public/statistics" + q);
    if (a && Array.isArray(a.districts)) return a;
  } catch { /* endpoint may be unpublished on this deployment */ }
  return await api("/api/statistics" + q);
}

async function pubLoadStats() {
  window.__pubStatsToken = (window.__pubStatsToken || 0) + 1;
  const token = window.__pubStatsToken;
  const body = document.getElementById("statsBody");
  if (!body) return;
  body.innerHTML = spinner();
  const s = window.__statsState;

  try {
    const stats = await pubFetchStatistics(s);
    if (window.__pubStatsToken !== token) return;
    const trend = await api("/api/public/trend?months=" + s.months + "&lang=" + LANG +
      (s.districtId ? "&districtId=" + encodeURIComponent(s.districtId) : ""));
    if (window.__pubStatsToken !== token) return;

    let rows = stats.districts || [];
    if (s.districtId) rows = rows.filter(d => d.districtId === s.districtId);
    const sum = (k) => rows.reduce((a, d) => a + (Number(d[k]) || 0), 0);

    const kpis = '<div class="grid grid-4" style="margin-bottom:16px">' +
      pubKpi(sum("reportedIncidents"), pubLabel(["মোট প্রতিবেদন", "Total reports"])) +
      pubKpi(sum("emergencyActivations"), pubLabel(["জরুরি সক্রিয়করণ", "Emergency activations"])) + pubKpi(sum("verifiedCases"), t("verified")) +
      pubKpi(rows.length, pubLabel(["মোট জেলা", "Districts covered"])) + "</div>";

    const buckets = trend.buckets || [];
    const suppressed = !!trend.suppressed;
    const trendHtml = pubH2(pubLabel(["মাসভিত্তিক প্রবণতা", "Monthly trend"]),
      pubLabel(["শেষ " + s.months + " মাস", "Last " + s.months + " months"])) + '<div class="alert alert-info">' + esc(trend.note || "") + "</div>" +
      (suppressed
        ? '<div class="alert alert-warn">' + pubLabel(["ন্যূনতম ৫টি রিপোর্টের কম হওয়ায় এই জেলার তথ্য প্রকাশ করা হয় নি।", "Fewer than 5 reports in this window, so this district's trend is not published."]) + "</div>"
        : "") + '<div class="grid grid-2">' +
      '<div class="panel"><div class="panel-title">📊 ' + pubLabel(["রিপোর্টকৃত ঘটনা", "Reported"]) + "</div>" +
      barsChart(buckets, "reported", "month") + "</div>" + '<div class="panel"><div class="panel-title">✅ ' + t("verified") + "</div>" +
      barsChart(buckets, "verified", "month", "var(--success)") + "</div></div>";

    body.innerHTML = kpis + trendHtml + pubH2(pubLabel(["ঘটনার মানচিত্র", "Incident heatmap"]),
        pubLabel(["কেন্দ্রবিন্দুর আকার ও ঘনত্ব = রিপোর্ট সংখ্যা", "Dot size & opacity = report count"])) +
      '<div id="statsHeat">' + spinner() + "</div>" + pubH2(pubLabel(["জেলাভিত্তিক সারসংক্ষেপ", "District summary"])) +
      '<div id="statsTable">' + spinner() + "</div>" + pubH2(pubLabel(["পরিভাষা", "Terminology"])) + '<div id="statsDefs">' + spinner() + "</div>";

    pubLoadHeat(s, token);
    pubLoadDistrictTable(stats, s, token);
    pubLoadDefinitions(trend, token);
  } catch (e) {
    if (window.__pubStatsToken !== token) return;
    body.innerHTML = emptyState(apiErrorMessage(e));
  }
}

async function pubLoadHeat(s, token) {
  const el = document.getElementById("statsHeat");
  if (!el) return;
  el.innerHTML = spinner();
  try {
    const data = await api("/api/map/incidents" + (s.districtId ? "?districtId=" + encodeURIComponent(s.districtId) : ""));
    if (window.__pubStatsToken !== token) return;
    const box = document.getElementById("statsHeat");
    if (!box) return;
    const cells = (data.cells || []).filter(c =>
      c.latitude !== null && c.latitude !== undefined && c.longitude !== null && c.longitude !== undefined);
    if (!cells.length) {
      box.innerHTML = emptyState(pubLabel(["এই এলাকায় প্রকাশযোগ্য কোনো তথ্য নেই", "No publishable data for this area"]));
      return;
    }
    const lats = cells.map(c => c.latitude);
    const lngs = cells.map(c => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const maxR = Math.max(1, ...cells.map(c => Number(c.reportedIncidents) || 0));
    const dots = cells.map(c => {
      const r = Number(c.reportedIncidents) || 0;
      const x = maxLng === minLng ? 50 : ((c.longitude - minLng) / (maxLng - minLng)) * 100;
      const y = maxLat === minLat ? 50 : (1 - (c.latitude - minLat) / (maxLat - minLat)) * 100;
      const cx = Math.min(97, Math.max(3, x));
      const cy = Math.min(97, Math.max(3, y));
      const size = 12 + Math.round((r / maxR) * 26);
      const op = (0.35 + (r / maxR) * 0.65).toFixed(2);
      const title = r + " × " + pubLabel(["রিপোর্ট", "reports"]) + (c.verifiedCases ? " · " + c.verifiedCases + " ✓ " + t("verified") : "");
      return '<div class="heat-dot" title="' + esc(title) + '" style="position:absolute;left:' + cx.toFixed(2) +
        "%;top:" + cy.toFixed(2) + "%;width:" + size + "px;height:" + size + "px;margin-left:" + (-size / 2) +
        "px;margin-top:" + (-size / 2) + "px;border-radius:50%;background:var(--danger);opacity:" + op +
        ';border:2px solid rgba(255,255,255,.75);box-shadow:0 1px 3px rgba(0,0,0,.25)"></div>';
    }).join("");
    const threshold = data.minimumAggregationThreshold;
    const caption = pubLabel([
      "ন্যূনতম সমষ্টিগত সীমা: " + threshold + " টি রিপোর্টের কম হলে সেল দেখানো হয় না",
      "Minimum aggregation threshold: cells below " + threshold + " reports are hidden"
    ]) + (data.note ? " · " + data.note : "");
    box.innerHTML = '<div class="map-box" style="display:block;height:auto;padding:16px">' +
      '<div style="position:relative;width:100%;height:320px;background:var(--surface-alt);border-radius:8px;overflow:hidden">' + dots + "</div>" +
      '<p class="small muted" style="margin:10px 0 0">' + esc(caption) + "</p></div>";
  } catch (e) {
    if (window.__pubStatsToken !== token) return;
    const box = document.getElementById("statsHeat");
    if (box) box.innerHTML = emptyState(apiErrorMessage(e));
  }
}

async function pubLoadDistrictTable(stats, s, token) {
  const el = document.getElementById("statsTable");
  if (!el) return;
  el.innerHTML = spinner();
  let rows = null;
  try {
    rows = await api("/api/public/district-summary");
  } catch { rows = null; }
  if (window.__pubStatsToken !== token) return;
  const box = document.getElementById("statsTable");
  if (!box) return;

  if (!Array.isArray(rows)) {
    rows = (stats.districts || []).map(d => ({
      id: d.districtId,
      divisionId: null,
      nameEn: d.districtName,
      nameBn: d.districtName,
      divisionName: d.divisionName,
      reportCount: d.reportedIncidents,
      published: (Number(d.reportedIncidents) || 0) >= 5
    }));
  }
  if (s.districtId) rows = rows.filter(r => r.id === s.districtId);
  if (s.divisionId) rows = rows.filter(r => !r.divisionId || r.divisionId === s.divisionId);

  if (!rows.length) { box.innerHTML = emptyState(t("none")); return; }

  const th = [
    pubLabel(["জেলা", "District"]),
    t("division"),
    pubLabel(["প্রতিবেদন", "Reports"]),
    pubLabel(["প্রকাশ", "Published"])
  ];
  box.innerHTML = '<div class="table-wrap"><table><thead><tr>' + th.map(h => "<th>" + esc(h) + "</th>").join("") + "</tr></thead><tbody>" +
    rows.map(r =>
      "<tr><td><strong>" + esc(LANG === "bn" ? r.nameBn : r.nameEn) + "</strong></td>" + "<td>" + esc(r.divisionName || "—") + "</td>" +
      '<td class="mono">' + (Number(r.reportCount) || 0) + "</td>" + "<td>" + (r.published
        ? '<span class="badge badge-success">' + pubLabel(["প্রকাশিত", "PUBLISHED"]) + "</span>"
        : '<span class="badge badge-muted">' + pubLabel(["সুপ্রেস", "SUPPRESSED"]) + "</span>") + "</td></tr>"
    ).join("") + "</tbody></table></div>";
}

async function pubLoadDefinitions(trend, token) {
  const el = document.getElementById("statsDefs");
  if (!el) return;
  el.innerHTML = spinner();
  let defs = trend && trend.definitions;
  if (!Array.isArray(defs) || !defs.length) {
    try { defs = await api("/api/public/definitions?lang=" + LANG); }
    catch { defs = null; }
  }
  if (window.__pubStatsToken !== token) return;
  const box = document.getElementById("statsDefs");
  if (box) box.innerHTML = defs ? pubDefsHtml(defs) : emptyState(t("none"));
}

/* ─── 5. Public location-share viewer (track/<token>) ────────────────────── */

let pubTrackTimer = null;

function renderTrack() {
  const tokenPart = currentRoute().split("/")[1];
  const html = '<div class="container section">' + '<div class="page-head"><h1 class="page-title">📍 ' +
    pubLabel(["লাইভ লোকেশন শেয়ার", "Live location share"]) + "</h1>" +
    '<p class="page-sub">' + pubLabel(["এই লিংকটি সময়সীমাভিত্তিক ও সর্বোচ্চ নির্দিষ্ট বার দেখা যাবে — শেয়ারকারীর পরিচয় প্রকাশ করা হয় না।", "This link is time-boxed and view-limited — it never reveals who shared it."]) + "</p></div>" +
    '<div id="trackBody">' + spinner() + "</div></div>";

  document.getElementById("app").innerHTML = shell(html, "track");
  pubLoadTrack(tokenPart);
}

function pubTrackAlert(state) {
  const map = {
    REVOKED: ["এই লোকেশন শেয়ারটি শেয়ারকারী বাতিল করে দিয়েছেন।",
      "The person sharing this location has turned this link off."],
    EXPIRED: ["এই শেয়ারের মেয়াদ শেষ হয়ে গেছে।", "This location share has expired."],
    LIMIT_REACHED: ["এই লিংকটি সর্বোচ্চ বার দেখা হয়ে গেছে, আর দেখানো হবে না।",
      "This link has reached its maximum number of views and will not show again."]
  };
  const msg = map[state] || ["এই শেয়ারটি আর সক্রিয় নেই।", "This share is no longer active."];
  return '<div class="alert alert-warn">⏳ <strong>' + pubLabel(["শেয়ার বন্ধ", "Share ended"]) +
    "</strong><p style=\"margin:8px 0 0\">" + esc(pubLabel(msg)) + "</p>" + '<p class="small muted" style="margin:8px 0 0">' +
    pubLabel(["গোপনীয়তার কারণে অবস্থানের তথ্য আর দেখানো হচ্ছে না।",
      "For privacy, the location is not shown anymore."]) + "</p></div>";
}

function pubTrackTick(expiresAt) {
  const el = document.getElementById("trackCountdown");
  if (!el) return;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) {
    el.textContent = pubLabel(["মেয়াদ শেষ", "Expired now"]);
    if (pubTrackTimer) { clearInterval(pubTrackTimer); pubTrackTimer = null; }
    return;
  }
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (x) => String(x).padStart(2, "0");
  el.textContent = pubLabel([
    "বাকি আছে " + (h ? h + " ঘ " : "") + pad(m) + " মি " + pad(sec) + " সে",
    (h ? h + "h " : "") + pad(m) + "m " + pad(sec) + "s " + "remaining"
  ]);
}

async function pubLoadTrack(tokenPart) {
  const el = document.getElementById("trackBody");
  if (!el) return;
  if (pubTrackTimer) { clearInterval(pubTrackTimer); pubTrackTimer = null; }
  if (!tokenPart) {
    el.innerHTML = pubTrackAlert("EXPIRED");
    return;
  }
  el.innerHTML = spinner();
  try {
    const data = await api("/api/shares/" + encodeURIComponent(tokenPart));
    const box = document.getElementById("trackBody");
    if (!box) return;
    if (!data || data.state !== "ACTIVE") {
      box.innerHTML = pubTrackAlert(data && data.state);
      return;
    }
    const mapBtn = data.mapUri
      ? '<a class="btn btn-primary btn-lg" href="' + esc(data.mapUri) + '" target="_blank" rel="noopener">🗺️ ' +
        pubLabel(["OpenStreetMap-এ খুলুন", "Open in OpenStreetMap"]) + "</a>"
      : "";
    box.innerHTML = '<div class="card">' + '<div class="card-header">📍 ' + pubLabel(["সক্রিয় অবস্থান শেয়ার", "Active location share"]) +
      ' <span class="badge badge-success" style="margin-left:auto">' + t("active") + "</span></div>" +
      (data.note ? '<div class="alert alert-info">' + esc(data.note) + "</div>" : "") + '<div class="grid grid-3" style="margin:12px 0">' +
      '<div class="kv-row"><span class="k">' + pubLabel(["অক্ষাংশ", "Latitude"]) + '</span><span class="v mono">' +
      esc(String(data.latitude)) + "</span></div>" +
      '<div class="kv-row"><span class="k">' + pubLabel(["দ্রাঘিমাংশ", "Longitude"]) + '</span><span class="v mono">' +
      esc(String(data.longitude)) + "</span></div>" + '<div class="kv-row"><span class="k">' + pubLabel(["মেয়াদ", "Expires"]) +
      '</span><span class="v">' + esc(fmtDate(data.expiresAt, true)) + "</span></div>" + "</div>" +
      '<div class="countdown-note" style="margin-bottom:16px">⏳ <strong id="trackCountdown">…</strong> · ' +
      pubLabel(["বাকি দেখার সুযোগ", "views remaining"]) + ": <strong>" + esc(String(data.viewsRemaining)) + "</strong></div>" +
      '<div class="flex" style="gap:12px;flex-wrap:wrap">' + mapBtn + '<a class="btn btn-outline" href="#/">' + t("home") + "</a></div>" +
      '<p class="small muted" style="margin-top:16px">' + pubLabel(["এই পাতাটি কারো পরিচয় বা যোগাযোগ তথ্য প্রকাশ করে না।",
        "This page never reveals the sharer's identity or contact details."]) + "</p></div>";
    pubTrackTick(data.expiresAt);
    pubTrackTimer = setInterval(() => pubTrackTick(data.expiresAt), 1000);
  } catch (e) {
    const box = document.getElementById("trackBody");
    if (!box) return;
    if (e && e.status === 404) {
      box.innerHTML = '<div class="alert alert-warn">🔎 <strong>' +
        pubLabel(["লিংকটি পাওয়া যায়নি", "Link not found"]) + "</strong><p style=\"margin:8px 0 0\">" +
        esc(pubLabel(["এমন কোনো শেয়ার লিংক নেই অথবা এটি মুছে ফেলা হয়েছে।",
          "This share link does not exist or has been removed."])) + "</p></div>";
    } else {
      box.innerHTML = emptyState(apiErrorMessage(e));
    }
  }
}
