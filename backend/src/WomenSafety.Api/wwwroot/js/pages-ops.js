/* Women Safety BD — ops pages: notifications, moderation, responder console,
   police referrals, privacy centre, community reputation, personal analytics */

/* ─── shared helpers ─────────────────────────────────────────────────────── */

function opsText(en, bn) { return LANG === "bn" ? bn : en; }

function opsVal(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function opsKpi(value, label) {
  return '<div class="kpi"><div class="kpi-value">' + esc(value === null || value === undefined ? "—" : value) +
    '</div><div class="kpi-label">' + esc(label) + "</div></div>";
}

function opsHead(title, sub) {
  return '<div class="page-head"><h1 class="page-title">' + title + '</h1><p class="page-sub">' + esc(sub) + "</p></div>";
}

function opsTabs(active, tabs) {
  return '<div class="tabs">' + tabs.map(x =>
    '<button class="tab' + (active === x[0] ? " active" : "") + '" onclick="' + x[2] + "('" + x[0] + "')\">" + esc(x[1]) + "</button>").join("") + "</div>";
}

function opsKv(k, v) {
  return '<div class="kv-row"><span class="k">' + esc(k) + '</span><span class="v">' + (v === null || v === undefined || v === "" ? "—" : v) + "</span></div>";
}

function opsErrLine(id) {
  return '<p id="' + id + '" style="color:var(--danger);font-size:.9rem;min-height:1.2em"></p>';
}

function opsFail(id, error) {
  const message = apiErrorMessage(error);
  const el = document.getElementById(id);
  if (el) el.textContent = message;
  toast(message, "error");
}

function opsLock(message) {
  return '<div class="alert alert-warn">🔒 ' + esc(message) + "</div>";
}

function opsRetry(fnName, error) {
  return emptyState(apiErrorMessage(error),
    '<button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="' + fnName + '()">' + t("retry") + "</button>");
}

function opsRoleBadge(role) {
  const cls = { ADMIN: "danger", MODERATOR: "warning", RESPONDER: "info", TRUSTED_CONTACT: "success" }[role] || "muted";
  return '<span class="badge badge-' + cls + '">' + esc(role) + "</span>";
}

function opsGuardRole(roles) {
  if (!token) { navigate("login"); return false; }
  if (!profile || roles.indexOf(profile.role) === -1) {
    toast(opsText("You do not have access to this workbench.", "আপনার এই কাজে প্রবেশাধিকার নেই।"), "error");
    navigate("dashboard");
    return false;
  }
  return true;
}

function opsAskPos() {
  if (window.__opsPos || !navigator.geolocation) return;
  try {
    navigator.geolocation.getCurrentPosition(
      pos => { window.__opsPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => {}, { timeout: 5000, maximumAge: 120000 });
  } catch { /* geolocation is optional */ }
}

function opsDistance(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return "—";
  const pos = window.__opsPos;
  if (!pos) return "—";
  return fmtDistance(haversine(pos.lat, pos.lng, lat, lng));
}

function opsProgress(pct) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  return '<div class="progress"><div class="bar-fill" style="width:' + value + '%;background:var(--primary)"></div></div>';
}

/* ─── 1. Notifications ───────────────────────────────────────────────────── */

window.__opsNotif = { items: [], page: 1, size: 20, unread: 0 };

const OPS_NOTIF_TYPES = {
  EMERGENCY: ["alert", "জরুরি সতর্কতা", "Alert"], ALERT: ["alert", "জরুরি সতর্কতা", "Alert"],
  TRIP_ESCALATION: ["alert", "যাত্রা সতর্কতা", "Alert"], TRIP: ["reminder", "অনুস্মারক", "Reminder"],
  REMINDER: ["reminder", "অনুস্মারক", "Reminder"], MODERATION: ["status", "অবস্থা", "Status"],
  STATUS: ["status", "অবস্থা", "Status"], REFERRAL: ["status", "রেফারেল", "Status"],
  RESPONDER: ["status", "রেসপন্ডার", "Status"], REPORT: ["report", "প্রতিবেদন", "Report"],
  INCIDENT: ["report", "প্রতিবেদন", "Report"]
};

function opsNotifChip(type) {
  const row = OPS_NOTIF_TYPES[type];
  if (!row) return '<span class="chip">' + esc(type || "—") + "</span>";
  const cls = { alert: "badge-danger", reminder: "badge-info", status: "badge-warning", report: "badge-success" }[row[0]];
  return '<span class="badge badge-' + cls + '">' + esc(LANG === "bn" ? row[1] : row[2]) + "</span>";
}

function opsNotifItem(n) {
  const title = LANG === "bn" ? (n.titleBn || n.titleEn || "") : (n.titleEn || n.titleBn || "");
  const body = LANG === "bn" ? (n.bodyBn || n.bodyEn || "") : (n.bodyEn || n.bodyBn || "");
  const style = n.isRead ? "" : ' style="border-left:3px solid var(--primary);background:var(--surface-alt)"';
  return '<div class="list-item" role="button" tabindex="0" onclick="window.opsNotifOpen(\'' + esc(n.id) + '\')"' + style + ">" +
    '<div class="list-main"><div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">' +
    opsNotifChip(n.type) + "<strong>" + esc(title || "—") + "</strong>" +
    (n.isRead ? "" : '<span class="chip chip-active">' + t("unread") + "</span>") + "</div>" +
    '<div class="list-meta muted small">' + esc(body) + "</div></div>" +
    '<div class="list-actions small muted nowrap">' + fmtDate(n.createdAt, true) + " →</div></div>";
}

function opsNotifPaint() {
  const el = document.getElementById("notifList");
  if (!el) return;
  const s = window.__opsNotif;
  const total = s.items.length;
  const pages = Math.max(1, Math.ceil(total / s.size));
  if (s.page > pages) s.page = pages;
  if (s.page < 1) s.page = 1;
  const start = (s.page - 1) * s.size;
  const slice = s.items.slice(start, start + s.size);
  el.innerHTML = slice.length ? slice.map(opsNotifItem).join("") : emptyState(t("none"));

  const badge = document.getElementById("notifUnread");
  if (badge) { badge.textContent = s.unread + " " + t("unread"); badge.style.display = s.unread ? "" : "none"; }
  window.__unreadCount = s.unread;
  const dot = document.getElementById("navUnread");
  if (dot) dot.textContent = s.unread;

  const pager = document.getElementById("notifPager");
  if (pager) {
    pager.innerHTML = pages > 1
      ? '<button class="btn btn-outline btn-sm" ' + (s.page <= 1 ? "disabled " : "") + 'onclick="window.opsNotifPage(-1)">← ' + opsText("Prev", "আগে") + "</button>" +
        '<span class="muted small">' + (start + 1) + "–" + Math.min(total, start + s.size) + " / " + total + "</span>" +
        '<button class="btn btn-outline btn-sm" ' + (s.page >= pages ? "disabled " : "") + 'onclick="window.opsNotifPage(1)">' + opsText("Next", "পরে") + " →</button>"
      : "";
  }
}

async function opsLoadNotifications() {
  const el = document.getElementById("notifList");
  if (!el) return;
  try {
    const data = await api("/api/notifications?take=200");
    const s = window.__opsNotif;
    s.items = (data && data.items) || [];
    s.unread = (data && data.unreadCount) || 0;
    s.page = 1;
    opsNotifPaint();
  } catch (e) {
    el.innerHTML = opsRetry("opsRenderNotifications", e);
  }
}

function opsRenderNotifications() {
  if (!token) { navigate("login"); return; }
  const html = '<div class="container section"><div class="page-head"><div class="flex-between" style="flex-wrap:wrap;gap:12px">' +
    '<div><h1 class="page-title">🔔 ' + t("notifications") + '</h1><p class="page-sub">' +
    opsText("Updates about your reports, trips and responders", "আপনার প্রতিবেদন, যাত্রা ও রেসপন্ডার সম্পর্কে সর্বশেষ খবর") + "</p></div>" +
    '<div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">' +
    '<span class="badge badge-danger" id="notifUnread" style="display:none">0 ' + t("unread") + "</span>" +
    '<button class="btn btn-outline btn-sm" onclick="window.opsNotifReadAll()">' + t("markAllRead") + "</button>" +
    '<button class="btn btn-primary btn-sm" onclick="window.opsNotifEnable()">🔔 ' + opsText("Enable browser alerts", "ব্রাউজার অ্যালার্ট চালু") + "</button>" +
    "</div></div></div>" +
    '<div id="notifList">' + spinner() + '</div><div class="flex-between" id="notifPager" style="margin-top:16px"></div></div>';
  document.getElementById("app").innerHTML = shell(html, "notifications");
  api("/api/notifications/unread-count").then(data => {
    window.__opsNotif.unread = (data && data.count) || 0;
    const badge = document.getElementById("notifUnread");
    if (badge) {
      badge.textContent = window.__opsNotif.unread + " " + t("unread");
      badge.style.display = window.__opsNotif.unread ? "" : "none";
    }
    window.__unreadCount = window.__opsNotif.unread;
    const dot = document.getElementById("navUnread");
    if (dot) dot.textContent = window.__opsNotif.unread;
  }).catch(() => { /* the list below still carries its own unreadCount */ });
  opsLoadNotifications();
}

window.opsNotifPage = function (delta) {
  window.__opsNotif.page += delta;
  opsNotifPaint();
};

window.opsNotifOpen = async function (id) {
  const item = window.__opsNotif.items.find(x => String(x.id) === String(id));
  if (!item) return;
  try {
    if (!item.isRead) {
      await api("/api/notifications/" + encodeURIComponent(id) + "/read", { method: "POST" });
      item.isRead = true;
      window.__opsNotif.unread = Math.max(0, window.__opsNotif.unread - 1);
      opsNotifPaint();
    }
  } catch { /* reading is non-critical — keep the page usable */ }
  const title = LANG === "bn" ? (item.titleBn || item.titleEn || "") : (item.titleEn || item.titleBn || "");
  const body = LANG === "bn" ? (item.bodyBn || item.bodyEn || "") : (item.bodyEn || item.bodyBn || "");
  notifyMe(title, body, item.linkHref || "");
  if (item.linkHref) navigate(String(item.linkHref).replace(/^#/, ""));
};

window.opsNotifReadAll = async function () {
  try {
    await api("/api/notifications/read-all", { method: "POST" });
    window.__opsNotif.items.forEach(n => { n.isRead = true; });
    window.__opsNotif.unread = 0;
    opsNotifPaint();
    toast(opsText("All notifications marked as read", "সব নোটিফিকেশন পড়া হয়েছে"), "success");
  } catch (e) { toast(apiErrorMessage(e), "error"); }
};

window.opsNotifEnable = async function () {
  if (!("Notification" in window)) {
    toast(opsText("This browser does not support notifications", "এই ব্রাউজারে নোটিফিকেশন সমর্থিত নয়"), "error");
    return;
  }
  const first = window.__opsNotif.items.find(n => !n.isRead) || window.__opsNotif.items[0] || null;
  const pick = (en, bn, fallback) => first ? (LANG === "bn" ? (bn || en || fallback) : (en || bn || fallback)) : fallback;
  const title = pick(first && first.titleEn, first && first.titleBn, t("notifications"));
  const body = pick(first && first.bodyEn, first && first.bodyBn,
    opsText("Browser alerts are enabled for Women Safety BD.", "ওমেন সেফটি বিডির ব্রাউজার অ্যালার্ট চালু হয়েছে।"));
  const href = (first && first.linkHref) || "#/notifications";
  try {
    const result = await Notification.requestPermission();
    if (result !== "granted") {
      toast(opsText("Permission not granted — alerts stay in this list", "অনুমতি পাওয়া যায়নি — খবর এখানেই থাকবে"), "error");
      return;
    }
    const fired = await notifyMe(title || t("notifications"), body || "", href);
    toast(fired
      ? opsText("Browser alerts enabled — a test notification was sent", "ব্রাউজার অ্যালার্ট চালু — পরীক্ষামূলক নোটিফিকেশন পাঠানো হয়েছে")
      : opsText("Permission granted — alerts will appear on this device", "অনুমতি দেওয়া হয়েছে — এই ডিভাইসে অ্যালার্ট দেখা যাবে"),
      "success");
  } catch (e) { toast(apiErrorMessage(e), "error"); }
};

/* ─── 2. Moderation ──────────────────────────────────────────────────────── */

window.__opsMod = { tab: "queue" };

function opsRenderModeration() {
  if (!opsGuardRole(["MODERATOR", "ADMIN"])) return;
  const tabs = [
    ["queue", opsText("Queue", "কিউ"), "window.opsModTab"],
    ["users", opsText("Users", "ব্যবহারকারী"), "window.opsModTab"],
    ["deletions", opsText("Deletions", "মুছে ফেলা"), "window.opsModTab"],
    ["audit", opsText("Audit log", "অডিট লগ"), "window.opsModTab"]
  ];
  const html = '<div class="container section">' +
    opsHead("🛡️ " + t("moderation"), opsText("Verify reports, review accounts and resolve privacy deletion requests.", "প্রতিবেদন যাচাই, অ্যাকাউন্ট পর্যালোচনা ও প্রাইভেসি ডিলিট অনুরোধ নিষ্পত্তি।")) +
    opsTabs(window.__opsMod.tab, tabs) +
    '<div id="modContent" style="margin-top:16px">' + spinner() + "</div></div>";
  document.getElementById("app").innerHTML = shell(html, "moderation");
  opsModLoad();
}

window.opsModTab = function (tab) {
  window.__opsMod.tab = tab;
  opsRenderModeration();
};

async function opsModLoad() {
  const el = document.getElementById("modContent");
  if (!el) return;
  const tab = window.__opsMod.tab;
  try {
    if (tab === "queue") {
      const rows = await api("/api/moderation/queue?take=100");
      el.innerHTML = opsModQueueHtml(Array.isArray(rows) ? rows : []);
    } else if (tab === "users") {
      const rows = await api("/api/moderation/users");
      el.innerHTML = opsModUsersHtml(Array.isArray(rows) ? rows : []);
    } else if (tab === "deletions") {
      const rows = await api("/api/moderation/deletion-requests");
      el.innerHTML = opsModDeletionsHtml(Array.isArray(rows) ? rows : []);
    } else {
      const data = await api("/api/moderation/audit-log");
      el.innerHTML = opsModAuditHtml(data || {});
    }
  } catch (e) {
    el.innerHTML = e && e.status === 403
      ? opsLock(opsText("This tab needs an administrator account — ask an admin to complete it.", "এই ট্যাবটির জন্য অ্যাডমিন অ্যাকাউন্ট প্রয়োজন।"))
      : opsRetry("opsRenderModeration", e);
  }
}

function opsModQueueHtml(rows) {
  if (!rows.length) return emptyState(t("none"));
  const head = "<thead><tr><th>" + opsText("Reference", "রেফারেন্স") + "</th><th>" + t("category") +
    "</th><th>" + t("status") + "</th><th>" + t("district") + "</th><th>" + t("date") +
    "</th><th>" + opsText("Signals", "সংকেত") + "</th><th>" + t("action") + "</th></tr></thead>";
  const body = rows.map(i => {
    const title = i.title || (i.description ? String(i.description).slice(0, 60) : "");
    return "<tr>" +
      '<td class="mono nowrap"><a href="#/incidents/' + esc(i.id) + '">' + esc(i.reference) + "</a>" +
      (i.isEmergency ? ' <span class="badge badge-danger">SOS</span>' : "") +
      (title ? '<div class="small muted">' + esc(title) + "</div>" : "") + "</td>" +
      "<td>" + esc(categoryLabel(i.category)) + "</td>" +
      "<td>" + statusBadge(i.status) + '<div class="small">' + statusBadge(i.verificationStatus) + "</div></td>" +
      "<td>" + esc(i.districtName || "—") + '</td><td class="nowrap small">' + fmtDate(i.createdAt) + "</td>" +
      '<td class="small nowrap">📎 ' + esc(i.evidenceCount || 0) + " · 👍 " + esc(i.helpfulVotes || 0) + "</td>" +
      '<td><div class="flex" style="gap:6px;flex-wrap:wrap">' +
      '<button class="btn btn-primary btn-sm" onclick="window.opsModDecide(\'' + esc(i.id) + '\',\'APPROVE\')">' + opsText("Approve", "অনুমোদন") + "</button>" +
      '<button class="btn btn-danger btn-sm" onclick="window.opsModDecide(\'' + esc(i.id) + '\',\'REJECT\')">' + opsText("Reject", "প্রত্যাখ্যান") + "</button>" +
      '<button class="btn btn-outline btn-sm" onclick="window.opsModDecide(\'' + esc(i.id) + '\',\'ESCALATE\')">' + opsText("Escalate", "উন্নীত") + "</button>" +
      "</div></td></tr>";
  }).join("");
  return '<div class="card"><div class="card-header">📋 ' + opsText("Verification queue", "যাচাই কিউ") +
    '</div><div class="table-wrap"><table>' + head + "<tbody>" + body + "</tbody></table></div></div>";
}

window.opsModDecide = async function (id, action) {
  if (action === "REJECT") {
    const sure = window.confirm(opsText("Reject this report? The reporter will be told that more detail is needed.",
      "এই প্রতিবেদনটি প্রত্যাখ্যান করবেন? প্রতিবেদককে আরও তথ্য প্রয়োজন বলে জানানো হবে।"));
    if (!sure) return;
  }
  const note = window.prompt(opsText("Optional note for the reporter (press Cancel to skip)", "প্রতিবেদকের জন্য ঐচ্ছিক নোট (বাদ দিতে Cancel চাপুন)"), "");
  const body = { approve: action !== "REJECT" };
  if (action === "ESCALATE") body.targetVerification = "OFFICIALLY_CONFIRMED";
  if (note) body.note = note;
  try {
    await api("/api/moderation/incidents/" + encodeURIComponent(id) + "/decision", { method: "POST", body: JSON.stringify(body) });
    toast(opsText("Decision recorded", "সিদ্ধান্ত সংরক্ষিত হয়েছে"), "success");
    opsModLoad();
  } catch (e) { toast(apiErrorMessage(e), "error"); }
};

function opsModUsersHtml(rows) {
  if (!rows.length) return emptyState(t("none"));
  const options = ["VICTIM", "MODERATOR", "RESPONDER", "ADMIN"].map(r => '<option value="' + r + '">' + r + "</option>").join("");
  const body = rows.map(u => "<tr>" +
    "<td><strong>" + esc(u.displayName) + '</strong><div class="small muted">' + esc(u.email || u.phoneNumber || "—") + "</div></td>" +
    "<td>" + opsRoleBadge(u.role) + "</td>" +
    '<td class="mono">' + esc(u.reputationScore) + '<div class="small muted">✓ ' + esc(u.verifiedReports) + " · 👍 " + esc(u.helpfulVotes) + " · ⚠ " + esc(u.strikes) + "</div></td>" +
    "<td>" + (u.isActive ? '<span class="badge badge-success">' + t("active") + "</span>"
      : '<span class="badge badge-muted">' + opsText("disabled", "নিষ্ক্রিয়") + "</span>") + "</td>" +
    '<td class="nowrap small">' + fmtDate(u.createdAt) + "</td>" +
    "<td>" + (profile && profile.role === "ADMIN"
      ? '<div class="stack" style="gap:6px"><select class="form-control" style="font-size:.85rem;padding:6px 8px" onchange="window.opsUserRole(\'' +
        esc(u.id) + '\', this.value)">' + options.replace('value="' + u.role + '"', 'value="' + u.role + '" selected') + "</select>" +
        '<button class="btn ' + (u.isActive ? "btn-danger" : "btn-primary") + ' btn-sm" onclick="window.opsUserActive(\'' + esc(u.id) + "'," + (!u.isActive) + ')">' +
        (u.isActive ? opsText("Deactivate", "নিষ্ক্রিয়") : opsText("Activate", "সক্রিয়")) + "</button></div>"
      : '<span class="muted small">' + opsText("admin only", "শুধু অ্যাডমিন") + "</span>") + "</td></tr>").join("");
  return '<div class="card"><div class="card-header">👥 ' + opsText("User oversight", "ব্যবহারকারী তদারকি") +
    '</div><div class="table-wrap"><table><thead><tr><th>' + t("name") + "</th><th>" + opsText("Role", "ভূমিকা") +
    "</th><th>" + opsText("Reputation", "রেপুটেশন") + "</th><th>" + t("status") + "</th><th>" + opsText("Joined", "যোগদান") +
    "</th><th>" + t("action") + "</th></tr></thead><tbody>" + body + "</tbody></table></div></div>";
}

window.opsUserRole = async function (id, role) {
  try {
    await api("/api/moderation/users/" + encodeURIComponent(id) + "/role", { method: "POST", body: JSON.stringify(role) });
    toast(opsText("Role updated", "ভূমিকা আপডেট হয়েছে"), "success");
  } catch (e) { toast(apiErrorMessage(e), "error"); }
  opsModLoad();
};

window.opsUserActive = async function (id, isActive) {
  const sure = window.confirm(isActive ? opsText("Reactivate this account?", "এই অ্যাকাউন্টটি আবার সক্রিয় করবেন?")
    : opsText("Deactivate this account? They will not be able to sign in.", "এই অ্যাকাউন্টটি নিষ্ক্রিয় করবেন? তারা লগইন করতে পারবে না।"));
  if (!sure) return;
  try {
    await api("/api/moderation/users/" + encodeURIComponent(id) + "/active", { method: "POST", body: JSON.stringify(!!isActive) });
    toast(opsText("Account updated", "অ্যাকাউন্ট আপডেট হয়েছে"), "success");
  } catch (e) { toast(apiErrorMessage(e), "error"); }
  opsModLoad();
};

function opsModDeletionsHtml(rows) {
  if (!rows.length) return emptyState(t("none"));
  const isAdmin = profile && profile.role === "ADMIN";
  const cards = rows.map(r => {
    const badge = r.status === "PENDING" ? "warning" : (r.status === "APPROVED" ? "success" : "muted");
    const actions = r.status === "PENDING" && isAdmin
      ? '<div class="flex" style="gap:8px;flex-wrap:wrap;margin-top:12px">' +
        '<button class="btn btn-danger btn-sm" onclick="window.opsModDelete(\'' + esc(r.id) + '\',true)">' + opsText("Approve deletion", "মুছে ফেলা অনুমোদন") + "</button>" +
        '<button class="btn btn-outline btn-sm" onclick="window.opsModDelete(\'' + esc(r.id) + '\',false)">' + opsText("Deny", "নাকচ") + "</button></div>"
      : "";
    return '<div class="card" style="margin-bottom:14px"><div class="flex-between" style="flex-wrap:wrap;gap:8px">' +
      "<div><strong>" + esc(r.reason || "—") + '</strong><div class="small muted">' + opsText("Requested ", "অনুরোধ ") + fmtDate(r.createdAt, true) +
      (r.resolvedAt ? " · " + opsText("Resolved ", "নিষ্পত্তি ") + fmtDate(r.resolvedAt, true) : "") + "</div></div>" +
      '<span class="badge badge-' + badge + '">' + esc(r.status) + "</span></div>" +
      (r.adminNote ? '<p class="small muted" style="margin-top:8px">' + esc(r.adminNote) + "</p>" : "") + actions + "</div>";
  }).join("");
  return '<div class="card"><div class="card-header">🗑️ ' + opsText("Deletion requests", "মুছে ফেলার অনুরোধ") + "</div>" + cards + "</div>";
}

window.opsModDelete = async function (id, approved) {
  const sure = window.confirm(approved
    ? opsText("Approve this deletion request? The account and its data are removed permanently.", "এই মুছে ফেলার অনুরোধ অনুমোদন করবেন? অ্যাকাউন্ট ও তথ্য স্থায়ীভাবে মুছে যাবে।")
    : opsText("Deny this deletion request? The account stays as it is.", "এই মুছে ফেলার অনুরোধ নাকচ করবেন? অ্যাকাউন্ট যথাপূর্বে থাকবে।"));
  if (!sure) return;
  try {
    await api("/api/moderation/deletion-requests/" + encodeURIComponent(id), { method: "POST", body: JSON.stringify(!!approved) });
    toast(opsText("Request resolved", "অনুরোধ নিষ্পত্তি হয়েছে"), "success");
    opsModLoad();
  } catch (e) { toast(apiErrorMessage(e), "error"); }
};

function opsModAuditHtml(data) {
  const entries = Array.isArray(data) ? data : (Array.isArray(data.entries) ? data.entries : null);
  if (entries && entries.length) {
    return '<div class="card"><div class="card-header">📜 ' + opsText("Audit log", "অডিট লগ") + '</div><div class="timeline">' +
      entries.map(e => '<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-body">' +
        "<strong>" + esc(e.action) + '</strong> · <span class="mono small">' + esc(e.entity || "") + "</span>" +
        '<div class="small muted">' + esc(e.detail || "") + " — " + esc(e.actor || "—") + "</div>" +
        '<div class="small">' + fmtDate(e.createdAt || e.at, true) + " " +
        (e.success ? '<span class="badge badge-success">' + t("verified") + "</span>" : '<span class="badge badge-danger">' + t("error") + "</span>") +
        "</div></div></div>").join("") + "</div></div>";
  }
  return '<div class="card"><div class="card-header">📜 ' + opsText("Audit log", "অডিট লগ") + "</div>" +
    '<div class="alert alert-info">' + esc(data.note || opsText("Audit events are written to the server log.", "অডিট ইভেন্ট সার্ভার লগে লেখা হয়।")) + "</div>" +
    emptyState(opsText("No audit entries are exposed through the API yet.", "এখান থেকে এখনো কোনো অডিট এন্ট্রি দেখানো যাচ্ছে না।")) + "</div>";
}

/* ─── 3. Responder console ───────────────────────────────────────────────── */

window.__opsResp = { tab: "available", stats: null, claimed: {} };

const OPS_NEXT_STATUS = {
  ALERTED: ["ACCEPTED", "CANCELLED"], ACCEPTED: ["EN_ROUTE", "CANCELLED"],
  EN_ROUTE: ["ON_SCENE", "CANCELLED"], ON_SCENE: ["COMPLETED"], COMPLETED: [], CANCELLED: []
};

const OPS_STATUS_LABEL = {
  ALERTED: ["সতর্ক", "Alerted"], ACCEPTED: ["গৃহীত", "Accepted"], EN_ROUTE: ["পথে", "En route"],
  ON_SCENE: ["ঘটনাস্থলে", "On scene"], COMPLETED: ["সম্পন্ন", "Completed"], CANCELLED: ["বাতিল", "Cancelled"]
};

function opsStatusLabel(status) {
  const row = OPS_STATUS_LABEL[status];
  return row ? (LANG === "bn" ? row[0] : row[1]) : status;
}

function opsRenderResponder() {
  if (!opsGuardRole(["RESPONDER", "MODERATOR", "ADMIN"])) return;
  const tabs = [["available", opsText("Available", "খালি ঘটনা"), "window.opsRespTab"],
    ["assignments", opsText("My assignments", "আমার দায়িত্ব"), "window.opsRespTab"]];
  const html = '<div class="container section">' +
    opsHead("🚑 " + t("responder"), opsText("Claim open emergencies near you and drive them from alert to resolution.", "আপনার কাছের খোলা জরুরি ঘটনা গ্রহণ করুন এবং সতর্কতা থেকে সমাধান পর্যন্ত চালান।")) +
    '<div class="card" style="margin-bottom:16px"><div class="flex-between" style="flex-wrap:wrap;gap:12px">' +
    '<label class="switch" style="display:inline-flex;align-items:center;gap:10px;font-weight:600">' +
    '<input id="dutySwitch" type="checkbox" class="switch-input" style="width:20px;height:20px;accent-color:var(--primary)" onchange="window.opsDuty(this.checked)"> ' +
    t("onDuty") + "</label>" +
    '<span class="muted small" id="dutyHint">' + opsText("Off duty — you will not receive new claims", "ডিউটির বাইরে — নতুন দায়িত্ব পাবেন না") + "</span></div>" +
    '<div class="grid grid-3" style="margin-top:16px" id="respStats">' + spinner() + "</div></div>" +
    opsTabs(window.__opsResp.tab, tabs) +
    '<div id="respContent" style="margin-top:16px">' + spinner() + "</div></div>";
  document.getElementById("app").innerHTML = shell(html, "responder");
  opsRespLoad();
}

window.opsRespTab = function (tab) {
  window.__opsResp.tab = tab;
  opsRenderResponder();
};

function opsPaintStats(stats) {
  const box = document.getElementById("respStats");
  if (box) {
    box.innerHTML = opsKpi(stats ? stats.total : 0, opsText("Total claims", "মোট দায়িত্ব")) +
      opsKpi(stats ? stats.active : 0, opsText("Active", "চলমান")) +
      opsKpi(stats ? stats.completed : 0, t("completed"));
  }
  const duty = document.getElementById("dutySwitch");
  if (duty) duty.checked = !!(stats && stats.isOnDuty);
  const hint = document.getElementById("dutyHint");
  if (hint && stats) {
    hint.textContent = stats.isOnDuty ? opsText("On duty — new claims are visible to you", "ডিউটিতে — নতুন ঘটনা দেখা যাচ্ছে")
      : opsText("Off duty — you will not receive new claims", "ডিউটির বাইরে — নতুন দায়িত্ব পাবেন না");
  }
}

async function opsRespLoad() {
  const el = document.getElementById("respContent");
  if (!el) return;
  try {
    const stats = await api("/api/responder/stats");
    window.__opsResp.stats = stats || {};
    opsPaintStats(stats);
  } catch { /* stats are optional — the list below still loads */ }
  try {
    if (window.__opsResp.tab === "available") {
      const rows = await api("/api/responder/available");
      opsAskPos();
      el.innerHTML = opsRespAvailableHtml(Array.isArray(rows) ? rows : []);
    } else {
      const rows = await api("/api/responder/assignments");
      el.innerHTML = opsRespAssignmentsHtml(Array.isArray(rows) ? rows : []);
    }
  } catch (e) {
    el.innerHTML = e && e.status === 403
      ? opsLock(opsText("Your role cannot open this console.", "আপনার ভূমিকায় এই কনসোল খোলা যায় না।"))
      : opsRetry("opsRenderResponder", e);
  }
}

function opsRespAvailableHtml(rows) {
  if (!rows.length) return emptyState(opsText("No unclaimed incidents right now — you are all caught up.", "এখন কোনো অনারোপিত ঘটনা নেই — সব শেষ।"));
  const items = rows.map(i => {
    const claimed = !!window.__opsResp.claimed[i.id];
    const action = claimed
      ? '<button class="btn btn-outline btn-sm" disabled title="' + esc(opsText("Already claimed", "ইতিমধ্যে গৃহীত")) + '">' + opsText("Claimed", "গৃহীত") + "</button>"
      : '<button class="btn btn-primary btn-sm" onclick="window.opsClaim(\'' + esc(i.id) + "')\">" + opsText("Claim", "গ্রহণ") + "</button>";
    return '<div class="list-item"><div class="list-main">' +
      '<div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">' +
      (i.isEmergency ? '<span class="badge badge-danger">SOS</span>' : '<span class="badge badge-info">' + esc(opsStatusLabel("ALERTED")) + "</span>") +
      '<strong class="mono">' + esc(i.reference) + "</strong><span>" + esc(categoryLabel(i.category)) + "</span>" + statusBadge(i.status) + "</div>" +
      '<div class="list-meta muted small">' + esc(i.districtName || opsText("Unknown district", "অজানা জেলা")) + " · " + fmtDate(i.createdAt, true) +
      " · " + opsText("reported ", "তথ্য ") + esc(i.minutesAgo) + opsText(" min ago", " মিনিট আগে") +
      " · " + t("distance") + " " + esc(opsDistance(i.latitude, i.longitude)) + "</div></div>" +
      '<div class="list-actions">' + action + ' <a class="btn btn-outline btn-sm" href="#/incidents/' + esc(i.id) + '">' + t("view") + "</a></div></div>";
  }).join("");
  return '<div class="card"><div class="card-header">📡 ' + opsText("Available incidents", "খালি ঘটনার তালিকা") + "</div>" + items +
    '<p class="muted small" style="margin-top:10px">' +
    opsText("Distance uses your device location only in this browser — it is never uploaded from this screen.", "দূরত্ব শুধু আপনার ব্রাউজারের লোকেশন থেকে দেখানো হয় — এখান থেকে কোনো অবস্থান পাঠানো হয় না।") + "</p></div>";
}

window.opsClaim = async function (id) {
  try {
    await api("/api/responder/incidents/" + encodeURIComponent(id) + "/claim", { method: "POST" });
    window.__opsResp.claimed[id] = true;
    toast(opsText("Incident claimed — it is now in your assignments", "ঘটনাটি গৃহীত — এটি আপনার দায়িত্বে যুক্ত হয়েছে"), "success");
    window.__opsResp.tab = "assignments";
    opsRenderResponder();
  } catch (e) {
    window.__opsResp.claimed[id] = true;
    toast(apiErrorMessage(e), "error");
    opsRespLoad();
  }
};

function opsRespAssignmentsHtml(rows) {
  if (!rows.length) return emptyState(opsText("No assignments yet — claim an incident from the Available tab.", "এখনো কোনো দায়িত্ব নেই — ‘খালি ঘটনা’ ট্যাব থেকে একটি গ্রহণ করুন।"));
  const cards = rows.map(a => {
    const next = OPS_NEXT_STATUS[a.status] || [];
    const buttons = next.map(s => '<button class="btn ' + (s === "CANCELLED" ? "btn-outline" : "btn-primary") + ' btn-sm" ' +
      'onclick="window.opsAssignStatus(\'' + esc(a.id) + "','" + s + "')\">→ " + esc(opsStatusLabel(s)) + "</button>").join("");
    return '<div class="card" style="margin-bottom:14px"><div class="flex-between" style="flex-wrap:wrap;gap:8px">' +
      '<div><strong class="mono">' + esc(a.reference || "—") + '</strong><div class="small muted">' + esc(categoryLabel(a.category || "OTHER")) +
      " · " + esc(a.informationShared || "") +
      (a.reportedDistanceMeters !== null && a.reportedDistanceMeters !== undefined ? " · " + fmtDistance(a.reportedDistanceMeters) : "") +
      "</div></div>" + statusBadge(a.status) + "</div>" +
      '<div class="panel" style="margin-top:10px;padding:10px"><div class="kv">' +
      opsKv(opsText("Alerted", "সতর্কতা"), fmtDate(a.alertedAt, true)) +
      opsKv(opsText("Claimed", "গ্রহণ"), fmtDate(a.createdAt, true)) +
      opsKv(opsText("Privacy mode", "প্রাইভেসি মোড"), esc(a.privacyMode || "—")) + "</div></div>" +
      '<div class="flex" style="gap:8px;flex-wrap:wrap;margin-top:12px">' + buttons +
      '<a class="btn btn-outline btn-sm" href="#/incidents/' + esc(a.incidentId) + '">' + opsText("View incident", "ঘটনা দেখুন") + "</a></div></div>";
  }).join("");
  return '<div class="card"><div class="card-header">✅ ' + opsText("Assignments", "দায়িত্বসমূহ") + "</div>" + cards +
    '<p class="muted small">' + opsText("Lifecycle: alerted → accepted → en route → on scene → completed.", "কার্যক্রম: সতর্কতা → গৃহীত → পথে → ঘটনাস্থলে → সম্পন্ন।") + "</p></div>";
}

window.opsAssignStatus = async function (id, status) {
  let note = null;
  if (status === "COMPLETED" || status === "CANCELLED") {
    const value = window.prompt(opsText("Closing note (optional — press Cancel to skip)", "সমাপনী নোট (ঐচ্ছিক — বাদ দিতে Cancel)"), "");
    if (value) note = value;
  }
  try {
    await api("/api/responder/assignments/" + encodeURIComponent(id) + "/status", { method: "POST", body: JSON.stringify({ status, note }) });
    toast(opsText("Assignment updated", "দায়িত্ব আপডেট হয়েছে"), "success");
  } catch (e) { toast(apiErrorMessage(e), "error"); }
  opsRespLoad();
};

window.opsDuty = async function (onDuty) {
  try {
    const data = await api("/api/responder/duty", { method: "POST", body: JSON.stringify(!!onDuty) });
    if (data) window.__opsResp.stats = Object.assign({}, window.__opsResp.stats, data);
    opsPaintStats(window.__opsResp.stats);
    toast(data && data.isOnDuty ? t("onDuty") : opsText("Off duty", "ডিউটির বাইরে"), "success");
  } catch (e) {
    toast(apiErrorMessage(e), "error");
    opsRespLoad();
  }
};

/* ─── 4. Police referrals ────────────────────────────────────────────────── */

const OPS_REF_NEXT = { DRAFT: ["SUBMITTED"], SUBMITTED: ["ACKNOWLEDGED"], ACKNOWLEDGED: ["CLOSED"], CLOSED: [] };
const OPS_REF_LABEL = { DRAFT: ["খসড়া", "Draft"], SUBMITTED: ["জমা দেওয়া", "Submitted"], ACKNOWLEDGED: ["গৃহীত", "Acknowledged"], CLOSED: ["বন্ধ", "Closed"] };

function opsRefLabel(status) {
  const row = OPS_REF_LABEL[status];
  return row ? (LANG === "bn" ? row[0] : row[1]) : status;
}

function opsRenderReferrals() {
  if (!token) { navigate("login"); return; }
  const html = '<div class="container section">' +
    opsHead("👮 " + t("referrals"), opsText("The police referrals you created and how far each one has progressed.", "আপনার তৈরি পুলিশ রেফারেল এবং প্রতিটির অগ্রগতি।")) +
    '<div id="refList">' + spinner() + "</div></div>";
  document.getElementById("app").innerHTML = shell(html, "referrals");
  opsRefLoad();
}

async function opsRefLoad() {
  const el = document.getElementById("refList");
  if (!el) return;
  try {
    const rows = await api("/api/incidents/referrals");
    const list = Array.isArray(rows) ? rows : [];
    el.innerHTML = list.length ? list.map(opsReferralCard).join("")
      : emptyState(opsText("No police referrals yet.", "এখনো কোনো পুলিশ রেফারেল নেই।"),
        '<div style="margin-top:14px"><a class="btn btn-primary btn-sm" href="#/report">📝 ' + opsText("Report an incident", "ঘটনার প্রতিবেদন করুন") + "</a></div>");
  } catch (e) { el.innerHTML = opsRetry("opsRenderReferrals", e); }
}

function opsReferralCard(r) {
  const next = OPS_REF_NEXT[r.status] || [];
  const buttons = next.map(s => '<button class="btn ' + (s === "CLOSED" ? "btn-outline" : "btn-primary") + ' btn-sm" ' +
    'onclick="window.opsRefStatus(\'' + esc(r.id) + "','" + s + "')\">" +
    (s === "SUBMITTED" ? opsText("Submit", "জমা দিন") : s === "ACKNOWLEDGED" ? opsText("Mark acknowledged", "গৃহীত চিহ্নিত") : opsText("Close", "বন্ধ")) + "</button>").join("");
  return '<div class="card" style="margin-bottom:16px"><div class="flex-between" style="flex-wrap:wrap;gap:8px">' +
    '<div><strong class="mono">' + esc(r.reference) + '</strong><div class="small muted">' + esc(r.stationName || "—") + " · " + esc(opsRefLabel(r.status)) + "</div></div>" +
    statusBadge(r.status) + "</div>" +
    '<div class="panel" style="margin-top:12px"><div class="panel-title">📄 ' + opsText("Referral letter", "রেফারেল চিঠি") + '</div><div class="kv">' +
    opsKv(opsText("Referral", "রেফারেল"), '<span class="mono">' + esc(r.reference) + "</span>") +
    opsKv(opsText("Incident", "ঘটনা"), '<a href="#/incidents/' + esc(r.incidentId) + '" class="mono">' + opsText("open report", "প্রতিবেদন খুলুন") + "</a>") +
    opsKv(opsText("Station", "থানা"), esc(r.stationName)) +
    opsKv(opsText("Contact", "যোগাযোগ"), r.stationName ? opsText("Call the station directly", "থানায় সরাসরি কল করুন") : "—") +
    opsKv(t("date"), fmtDate(r.createdAt, true)) +
    opsKv(opsText("Submitted", "জমা"), fmtDate(r.submittedAt, true)) +
    opsKv(opsText("Acknowledged", "গৃহীত"), fmtDate(r.acknowledgedAt, true)) +
    opsKv(opsText("Notes", "নোট"), esc(r.notes || "")) + "</div></div>" +
    '<div class="flex" style="gap:8px;flex-wrap:wrap;margin-top:12px">' + buttons +
    '<a class="btn btn-outline btn-sm" href="#/incidents/' + esc(r.incidentId) + '">' + opsText("View incident", "ঘটনা দেখুন") + "</a></div></div>";
}

window.opsRefStatus = async function (id, status) {
  const value = window.prompt(opsText("Note for this update (optional — press Cancel to skip)", "এই আপডেটের নোট (ঐচ্ছিক — বাদ দিতে Cancel)"), "");
  try {
    await api("/api/incidents/referrals/" + encodeURIComponent(id) + "/status", { method: "POST", body: JSON.stringify({ status, notes: value || null }) });
    toast(opsText("Referral updated", "রেফারেল আপডেট হয়েছে"), "success");
  } catch (e) { toast(apiErrorMessage(e), "error"); }
  opsRefLoad();
};

/* ─── 5. Privacy centre ──────────────────────────────────────────────────── */

const OPS_CONSENT_LABELS = {
  privacy_policy: ["প্রাইভেসি নীতি ও শর্তাবলি", "Privacy policy & terms"],
  location_tracking: ["অবস্থান ট্র্যাকিং", "Location tracking"],
  trusted_contact_alerts: ["বিশ্বস্ত পরিচিতির সতর্কতা", "Trusted contact alerts"],
  anonymous_statistics: ["বেনামী পরিসংখ্যান", "Anonymous statistics"],
  browser_notifications: ["ব্রাউজার নোটিফিকেশন", "Browser notifications"],
  marketing_messages: ["মার্কেটিং বার্তা", "Marketing messages"]
};

function opsConsentLabel(key) {
  const row = OPS_CONSENT_LABELS[key];
  return row ? (LANG === "bn" ? row[0] : row[1]) : key;
}

function opsRenderPrivacy() {
  if (!token) { navigate("login"); return; }
  const html = '<div class="container section">' +
    opsHead("🔒 " + t("privacy"), opsText("Consents, a full copy of your data and the account deletion request.", "সম্মতি, আপনার সম্পূর্ণ তথ্যের কপি ও অ্যাকাউন্ট মুছে ফেলার অনুরোধ।")) +
    '<div class="grid grid-2">' +
    '<div class="card"><div class="card-header">✅ ' + opsText("Consents", "সম্মতি") + '</div><div id="consentList">' + spinner() + "</div></div>" +
    '<div class="card"><div class="card-header">⬇️ ' + opsText("Data export", "তথ্য রপ্তানি") +
    '</div><p class="muted small">' + opsText("Download everything this platform stores about you as one JSON file.", "এই প্ল্যাটফর্মে আপনার সম্পর্কে যা কিছু আছে সব একটি JSON ফাইলে নামান।") + "</p>" +
    '<button id="privExportBtn" class="btn btn-primary btn-sm" onclick="window.opsExport()">' + opsText("Download my data", "আমার তথ্য নামান") + "</button>" +
    '<div id="privExportSummary" style="margin-top:12px"></div></div></div>' +
    '<div class="card danger-zone" style="margin-top:16px;border-left:4px solid var(--danger)"><div class="card-header">🗑️ ' + opsText("Account deletion", "অ্যাকাউন্ট মুছে ফেলা") + "</div>" +
    '<div class="alert alert-warn">' + opsText(
      "Deleting is permanent. After an administrator approves your request, your account, reports, trips, contacts and devices are erased and cannot be recovered. Until then your data stays private.",
      "মুছে ফেলা স্থায়ী। অ্যাডমিন অনুমোদনের পর আপনার অ্যাকাউন্ট, প্রতিবেদন, যাত্রা, পরিচিতি ও ডিভাইস মুছে যায় এবং ফেরার উপায় নেই। ততক্ষণ আপনার তথ্য ব্যক্তিগত থাকে।") + "</div>" +
    '<div id="delStatus">' + spinner() + "</div>" +
    '<div class="form-group" style="margin-top:12px"><label>' + opsText("Reason (required)", "কারণ (আবশ্যক)") + "</label>" +
    '<textarea id="delReason" class="form-control" rows="3" maxlength="500" placeholder="' +
    esc(opsText("Tell us why you want your account removed", "অ্যাকাউন্ট কেন মুছতে চান লিখুন")) + '"></textarea></div>' +
    opsErrLine("delError") +
    '<button id="delBtn" class="btn btn-danger btn-sm" onclick="window.opsDeleteRequest()">' + opsText("Request deletion", "মুছে ফেলার অনুরোধ") + "</button></div>" +
    '<div class="grid grid-2" style="margin-top:16px">' +
    '<div class="card"><div class="card-header">🔐 ' + opsText("How we handle your data", "তথ্য কীভাবে ব্যবহার হয়") + '</div>' +
    '<ul class="small" style="padding-left:18px;line-height:1.9">' +
    "<li>" + opsText("Stored: your profile, reports, evidence, trips, trusted contacts, consents and devices.", "সংরক্ষিত: প্রোফাইল, প্রতিবেদন, প্রমাণ, যাত্রা, বিশ্বস্ত পরিচিতি, সম্মতি ও ডিভাইস।") + "</li>" +
    "<li>" + opsText("Never shared: your identity, exact live location or evidence is never published.", "কখনো শেয়ার হয় না: পরিচয়, সঠিক অবস্থান বা প্রমাণ কখনো প্রকাশ করা হয় না।") + "</li>" +
    "<li>" + opsText("Public stats are suppressed below 5 reports so no district can identify one person.", "৫টির কম প্রতিবেদনে পাবলিক পরিসংখ্যান লুকানো হয়, যাতে কোনো জেলায় একজনকে চেনা না যায়।") + "</li></ul>" +
    '<p class="small muted" style="margin-top:8px">' + opsText("Exports are built on the server from your own rows only — nothing from other users is included.", "রপ্তানি ফাইল সার্ভারে শুধু আপনার নিজের তথ্য থেকে তৈরি হয় — অন্য কারো তথ্য থাকে না।") + "</p>" +
    '<div class="flex" style="gap:8px;flex-wrap:wrap;margin-top:10px">' +
    '<a class="btn btn-outline btn-sm" href="#/devices">🖥️ ' + t("devices") + "</a>" +
    '<a class="btn btn-outline btn-sm" href="#/community">🤝 ' + t("community") + "</a>" +
    '<a class="btn btn-outline btn-sm" href="#/safety">💡 ' + t("tips") + "</a></div></div>" +
    '<div class="card"><div class="card-header">💡 ' + opsText("Good to know", "জেনে রাখুন") + "</div>" +
    '<p class="small muted">' + opsText("You can change any consent at any time — every toggle is saved the moment you flip it.", "যেকোনো সময় সম্মতি বদলানো যায় — প্রতিটি টগল চালু হলেই সংরক্ষিত হয়।") + "</p>" +
    '<p class="small muted" style="margin-top:8px">' + opsText("One report is private by default; only aggregated, suppressed counts reach the public stats page.", "একটি প্রতিবেদন স্বয়ংক্রিয়ভাবে ব্যক্তিগত; পাবলিক পরিসংখ্যানে শুধু সমষ্টিগত ও দমিত সংখ্যা যায়।") + "</p>" +
    '<p class="small muted" style="margin-top:8px">' + opsText("Rate limits and audit logging apply to exports and deletion requests.", "রপ্তানি ও মুছে ফেলার অনুরোধে রেট লিমিট ও অডিট লগ প্রযোজ্য।") + "</p></div></div>";
  document.getElementById("app").innerHTML = shell(html, "privacy");
  opsPrivacyLoad();
}

async function opsPrivacyLoad() {
  try {
    const rows = await api("/api/privacy/consents");
    const list = Array.isArray(rows) ? rows : [];
    const el = document.getElementById("consentList");
    if (el) {
      el.innerHTML = list.length ? list.map(c =>
        '<div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border);gap:12px;flex-wrap:wrap">' +
        '<div><strong style="font-size:.95rem">' + esc(opsConsentLabel(c.key)) + '</strong><div class="small muted">' +
        opsText("Updated ", "সর্বশেষ ") + fmtDate(c.updatedAt, true) + "</div></div>" +
        '<label class="switch" style="display:inline-flex;align-items:center;gap:8px">' +
        '<input type="checkbox" class="switch-input" style="width:20px;height:20px;accent-color:var(--primary)"' +
        (c.granted ? " checked" : "") + ' onchange="window.opsConsent(\'' + esc(c.key) + '\', this.checked)">' +
        '<span class="small muted">' + (c.granted ? t("active") : opsText("off", "বন্ধ")) + "</span></label></div>").join("")
        : emptyState(t("none"));
    }
  } catch (e) {
    const el = document.getElementById("consentList");
    if (el) el.innerHTML = opsRetry("opsRenderPrivacy", e);
  }
  try {
    const rows = await api("/api/privacy/deletion-request");
    const list = Array.isArray(rows) ? rows : [];
    const el = document.getElementById("delStatus");
    if (el) {
      el.innerHTML = list.length
        ? list.map(r => '<div class="flex-between" style="gap:10px;flex-wrap:wrap;padding:8px 0"><span class="small">' +
            esc(r.reason || "—") + " · " + fmtDate(r.createdAt, true) + "</span>" +
            statusBadge(r.status === "PENDING" ? "AWAITING_VERIFICATION" : r.status) + "</div>").join("")
        : '<p class="small muted">' + opsText("No deletion request yet.", "এখনো মুছে ফেলার অনুরোধ নেই।") + "</p>";
    }
  } catch { /* deletion status is non-critical */ }
}

window.opsConsent = async function (key, granted) {
  try {
    await api("/api/privacy/consents", { method: "PUT", body: JSON.stringify([{ consentKey: key, granted: !!granted }]) });
    toast(t("save") + " ✓", "success");
  } catch (e) { toast(apiErrorMessage(e), "error"); }
  opsPrivacyLoad();
};

window.opsExport = async function () {
  const btn = document.getElementById("privExportBtn");
  if (btn) { btn.disabled = true; btn.textContent = t("loading"); }
  try {
    const data = await api("/api/privacy/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "women-safety-export-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    const summary = document.getElementById("privExportSummary");
    if (summary && data && typeof data === "object") {
      const rows = Object.keys(data).filter(k => Array.isArray(data[k])).map(k => opsKv(k, data[k].length)).join("");
      summary.innerHTML = '<div class="panel"><div class="panel-title">' + opsText("Included in this export", "এই রপ্তানিতে যা আছে") + '</div><div class="kv">' + rows + "</div></div>";
    }
    toast(opsText("Export downloaded", "রপ্তানি ফাইল নামানো হয়েছে"), "success");
  } catch (e) { toast(apiErrorMessage(e), "error"); }
  finally {
    if (btn) { btn.disabled = false; btn.textContent = opsText("Download my data", "আমার তথ্য নামান"); }
  }
};

window.opsDeleteRequest = async function () {
  const reason = opsVal("delReason");
  const err = document.getElementById("delError");
  if (err) err.textContent = "";
  if (reason.length < 5) {
    if (err) err.textContent = opsText("Please tell us why (at least 5 characters).", "কারণ লিখুন (কমপক্ষে ৫ অক্ষর)।");
    return;
  }
  const sure = window.confirm(opsText("Send this deletion request? An administrator will review it before anything is removed.", "মুছে ফেলার অনুরোধ পাঠাবেন? কিছু মুছে ফেলার আগে অ্যাডমিন এটি দেখবেন।"));
  if (!sure) return;
  const btn = document.getElementById("delBtn");
  if (btn) { btn.disabled = true; btn.textContent = t("loading"); }
  try {
    const data = await api("/api/privacy/deletion-request", { method: "POST", body: JSON.stringify({ reason }) });
    toast((data && data.note) || opsText("Deletion requested", "মুছে ফেলার অনুরোধ জমা হয়েছে"), "success");
    opsRenderPrivacy();
  } catch (e) {
    opsFail("delError", e);
    if (btn) { btn.disabled = false; btn.textContent = opsText("Request deletion", "মুছে ফেলার অনুরোধ"); }
  }
};

/* ─── 6. Community & reputation ──────────────────────────────────────────── */

function opsLevel(score) {
  if (score < 10) return ["নবাগত", "Newcomer", "badge-muted"];
  if (score < 50) return ["বিশ্বস্ত", "Trusted", "badge-info"];
  if (score < 100) return ["রক্ষক", "Guardian", "badge-warning"];
  return ["চ্যাম্পিয়ন", "Champion", "badge-success"];
}

function opsRenderCommunity() {
  if (!token) { navigate("login"); return; }
  const html = '<div class="container section">' +
    opsHead("🤝 " + t("community"), opsText("Your standing in the community, how reputation works and the shared rules.", "কমিউনিটিতে আপনার অবস্থান, রেপুটেশন কীভাবে কাজ করে ও সাধারণ নিয়ম।")) +
    '<div id="communityContent">' + spinner() + "</div></div>";
  document.getElementById("app").innerHTML = shell(html, "community");
  opsCommunityLoad();
}

async function opsCommunityLoad() {
  const el = document.getElementById("communityContent");
  if (!el) return;
  try {
    const me = await api("/api/auth/profile");
    persistSession(null, null, me);
    const level = opsLevel(me.reputationScore || 0);
    const headCard = '<div class="card" style="margin-bottom:16px"><div class="flex-between" style="flex-wrap:wrap;gap:10px">' +
      '<div><h2 style="font-size:1.3rem">' + esc(me.displayName) + '</h2><div class="small muted">' +
      opsText("Member since ", "সদস্য ") + fmtDate(me.createdAt) + "</div></div>" +
      '<span class="badge ' + level[2] + '">' + esc(LANG === "bn" ? level[0] : level[1]) + "</span></div>" +
      '<div class="grid grid-4" style="margin-top:12px">' +
      opsKpi(me.reputationScore, opsText("Reputation", "রেপুটেশন")) +
      opsKpi(me.verifiedReports, opsText("Verified reports", "যাচাইকৃত প্রতিবেদন")) +
      opsKpi(me.helpfulVotes, opsText("Helpful votes", "সহায়ক ভোট")) +
      opsKpi(me.strikes, opsText("Strikes", "স্ট্রাইক")) + "</div></div>";

    const rules = '<div class="card" style="margin-bottom:16px"><div class="card-header">📘 ' + opsText("How reputation works", "রেপুটেশন কীভাবে কাজ করে") + "</div>" +
      '<p class="small muted">' + opsText("Indicative values shown for guidance — your live score is always the one in your profile.", "নির্দেশক হিসাবে দেখানো মান; আপনার প্রকৃত স্কোর প্রোফাইলে যা আছে সেটিই প্রযোজ্য।") + "</p>" +
      '<div class="kv" style="margin-top:8px">' +
      opsKv(opsText("Verified report", "যাচাইকৃত প্রতিবেদন"), "+20") +
      opsKv(opsText("Helpful vote received", "প্রাপ্ত সহায়ক ভোট"), "+5") +
      opsKv(opsText("Rejected report", "প্রত্যাখ্যাত প্রতিবেদন"), "−10") +
      opsKv(opsText("Strike", "স্ট্রাইক"), "−25") + "</div>" +
      '<p class="small muted" style="margin-top:10px">' + opsText(
        "Strikes are added by moderators for false or abusive reports; public statistics never publish a district below 5 reports.",
        "মিথ্যা বা আপত্তিকর প্রতিবেদনে মডারেটর স্ট্রাইক দেন; ৫টির কম প্রতিবেদনে কোনো জেলার তথ্য পাবলিক হয় না।") + "</p></div>";

    const guidelines = '<div class="card"><div class="card-header">📏 ' + opsText("Community guidelines", "কমিউনিটি নির্দেশিকা") + "</div>" +
      '<ul class="small" style="padding-left:18px;line-height:1.9">' +
      "<li>" + opsText("Respect survivors — never shame, blame or question someone's account.", "বেঁচে থাকেদের সম্মান করুন — কাউকে লজ্জা দেবেন না, দোষারোপ করবেন না।") + "</li>" +
      "<li>" + opsText("No harassment, hate speech, threats or sharing of someone else's private details.", "হয়রানি, ঘৃণা, হুমকি বা অন্যের ব্যক্তিগত তথ্য শেয়ার করা যাবে না।") + "</li>" +
      "<li>" + opsText("Report abuse from any reference page — false reports cost reputation and can earn strikes.", "যেকোনো রেফারেন্স পেজ থেকে অপব্যবহার জানান — মিথ্যা প্রতিবেদনে রেপুটেশন কমে ও স্ট্রাইক পড়ে।") + "</li>" +
      "<li>" + opsText("Keep evidence lawful and relevant — never upload intimate material without consent.", "প্রমাণ বৈধ ও প্রাসঙ্গিক রাখুন — সম্মতি ছাড়া সংবেদনশীল ছবি রাখবেন না।") + "</li></ul>" +
      '<div class="flex" style="gap:8px;flex-wrap:wrap;margin-top:10px">' +
      '<a class="btn btn-outline btn-sm" href="#/directory">📒 ' + t("directory") + "</a>" +
      '<a class="btn btn-outline btn-sm" href="#/safety">💡 ' + t("tips") + "</a>" +
      '<a class="btn btn-outline btn-sm" href="#/my-stats">📊 ' + t("myStats") + "</a></div></div>";

    el.innerHTML = headCard + rules + '<div class="grid grid-2" style="margin:16px 0"><div id="leaderCard">' + spinner() + "</div>" + guidelines + "</div>";
    opsLoadLeaderboard(me.id);
  } catch (e) { el.innerHTML = opsRetry("opsRenderCommunity", e); }
}

async function opsLoadLeaderboard(myId) {
  const el = document.getElementById("leaderCard");
  if (!el) return;
  try {
    const rows = await api("/api/moderation/users");
    const list = (Array.isArray(rows) ? rows : []).slice().sort((a, b) => (b.reputationScore || 0) - (a.reputationScore || 0));
    if (!list.length) { el.innerHTML = emptyState(t("none")); return; }
    const body = list.slice(0, 10).map((u, index) =>
      '<div class="list-item"' + (String(u.id) === String(myId) ? ' style="background:var(--surface-alt)"' : "") + ">" +
      '<div class="list-main"><div class="flex" style="gap:8px;flex-wrap:wrap"><strong>#' + (index + 1) + "</strong><span>" + esc(u.displayName) + "</span>" +
      (String(u.id) === String(myId) ? '<span class="chip chip-active">' + opsText("you", "আপনি") + "</span>" : "") + opsRoleBadge(u.role) + "</div>" +
      '<div class="list-meta muted small">✓ ' + esc(u.verifiedReports || 0) + " · 👍 " + esc(u.helpfulVotes || 0) + " · " +
      esc(u.strikes || 0) + opsText(" strikes", " স্ট্রাইক") + "</div></div>" +
      '<div class="list-actions"><strong>' + esc(u.reputationScore || 0) + "</strong></div></div>").join("");
    el.innerHTML = '<div class="card"><div class="card-header">🏆 ' + opsText("Top contributors", "সেরা অবদানকারী") + "</div>" + body + "</div>";
  } catch (e) {
    el.innerHTML = '<div class="card"><div class="card-header">🏆 ' + opsText("Top contributors", "সেরা অবদানকারী") + "</div>" +
      (e && e.status === 403
        ? opsLock(opsText("Public rankings are reviewed by moderators — your own score is shown above.", "পাবলিক র‍্যাংকিং মডারেটররা দেখেন — আপনার নিজের স্কোর উপরে দেখা যাচ্ছে।")) +
          emptyState(opsText("Rankings are available to moderators.", "র‍্যাংকিং মডারেটরদের জন্য উন্মুক্ত।"))
        : opsRetry("opsRenderCommunity", e)) + "</div>";
  }
}

/* ─── 7. Personal analytics ──────────────────────────────────────────────── */

function opsMonthBuckets(items) {
  const buckets = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"),
      month: d.toLocaleDateString(LANG === "bn" ? "bn-BD" : "en-GB", { month: "short", year: "2-digit" }),
      count: 0
    });
  }
  (items || []).forEach(item => {
    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    const bucket = buckets.find(b => b.key === key);
    if (bucket) bucket.count++;
  });
  return buckets;
}

async function opsCategoryBuckets(items) {
  const sample = (items || []).slice(0, 24);
  if (!sample.length) return [];
  const details = await Promise.all(sample.map(item =>
    api("/api/incidents/" + encodeURIComponent(item.id) + "/detail").catch(() => null)));
  const counts = {};
  details.forEach(d => { if (d && d.category) counts[d.category] = (counts[d.category] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map(k => ({ label: categoryLabel(k), count: counts[k] }));
}

function opsStreakText(buckets) {
  let streak = 0;
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].count > 0) streak++;
    else break;
  }
  if (!streak) return opsText("No reporting streak yet — your first report starts one.", "এখনো কোনো ধারাবাহিক প্রতিবেদন নেই — প্রথম প্রতিবেদনেই শুরু হবে।");
  return opsText("Reporting streak: " + streak + " month" + (streak > 1 ? "s" : "") + " in a row.", "প্রতিবেদনের ধারা: টানা " + streak + " মাস।");
}

function opsRenderMyStats() {
  if (!token) { navigate("login"); return; }
  const html = '<div class="container section">' +
    opsHead("📊 " + t("myStats"), opsText("Your own reports, trips and engagement — nobody else can see this page.", "আপনার নিজের প্রতিবেদন, যাত্রা ও অংশগ্রহণ — এটি অন্য কেউ দেখতে পারে না।")) +
    '<div id="statsKpis" class="grid grid-4" style="margin-bottom:16px">' + spinner() + "</div>" +
    '<div class="grid grid-2">' +
    '<div class="card"><div class="card-header">📅 ' + opsText("Reports by month", "মাসভিত্তিক প্রতিবেদন") + '</div><div id="chartMonths">' + spinner() + "</div></div>" +
    '<div class="card"><div class="card-header">🗂️ ' + opsText("Reports by category", "ধরনভিত্তিক প্রতিবেদন") + '</div><div id="chartCats">' + spinner() + "</div></div></div>" +
    '<div class="grid grid-2" style="margin-top:16px">' +
    '<div class="card"><div class="card-header">🚶 ' + opsText("Trips vs completed", "যাত্রা বনাম সম্পন্ন") + '</div><div id="chartTrips">' + spinner() + "</div></div>" +
    '<div class="card"><div class="card-header">🔔 ' + opsText("Engagement", "অংশগ্রহণ") + '</div><div id="engagement">' + spinner() + "</div></div></div>" +
    '<p class="text-center" style="margin-top:16px"><a href="#/community">🤝 ' + opsText("How reputation works", "রেপুটেশন কীভাবে কাজ করে") + " →</a></p></div>";
  document.getElementById("app").innerHTML = shell(html, "my-stats");
  opsStatsLoad();
}

async function opsStatsLoad() {
  try {
    const results = await Promise.all([
      api("/api/incidents?take=200"),
      api("/api/trips"),
      api("/api/notifications?take=200").catch(() => ({ items: [] }))
    ]);
    const incidents = Array.isArray(results[0]) ? results[0] : [];
    const trips = Array.isArray(results[1]) ? results[1] : [];
    const notifications = (results[2] && results[2].items) || [];
    const emergencies = incidents.filter(i => i.isEmergency).length;
    const completedTrips = trips.filter(t => t.status === "COMPLETED").length;
    const read = notifications.filter(n => n.isRead).length;
    const readPct = notifications.length ? (read / notifications.length) * 100 : 0;
    const months = opsMonthBuckets(incidents);

    const kpiEl = document.getElementById("statsKpis");
    if (kpiEl) {
      kpiEl.innerHTML = opsKpi(incidents.length, opsText("Reports filed", "প্রতিবেদন")) +
        opsKpi(emergencies, opsText("Emergencies", "জরুরি")) +
        opsKpi(trips.length + " / " + completedTrips, opsText("Trips / completed", "যাত্রা / সম্পন্ন")) +
        opsKpi(notifications.length ? read + "/" + notifications.length : "—", opsText("Notifications read", "পড়া নোটিফিকেশন"));
    }
    const monthEl = document.getElementById("chartMonths");
    if (monthEl) monthEl.innerHTML = barsChart(months, "count", "month");

    const catEl = document.getElementById("chartCats");
    if (catEl) {
      catEl.innerHTML = spinner();
      const cats = await opsCategoryBuckets(incidents);
      catEl.innerHTML = cats.length ? barsChart(cats, "count", "label", "var(--accent)") : emptyState(t("none"));
    }
    const tripEl = document.getElementById("chartTrips");
    if (tripEl) {
      tripEl.innerHTML = barsChart([
        { label: opsText("All trips", "সব যাত্রা"), count: trips.length },
        { label: opsText("Completed", "সম্পন্ন"), count: completedTrips },
        { label: opsText("Active", "চলমান"), count: trips.filter(t => t.status === "ACTIVE").length },
        { label: opsText("Escalated", "স্বয়ংক্রিয় জরুরি"), count: trips.filter(t => t.status === "AUTO_ESCALATED").length }
      ], "count", "label", "var(--success)");
    }
    const engEl = document.getElementById("engagement");
    if (engEl) {
      engEl.innerHTML = '<p class="small muted">' + opsText("Notifications read", "পড়া নোটিফিকেশন") +
        ": <strong>" + read + "/" + notifications.length + "</strong> (" + Math.round(readPct) + "%)</p>" + opsProgress(readPct) +
        '<p class="small muted" style="margin-top:12px">📅 ' + esc(opsStreakText(months)) + "</p>" +
        '<p class="small" style="margin-top:8px"><a href="#/community">🤝 ' + t("community") + " →</a></p>";
    }
  } catch (e) {
    const el = document.getElementById("statsKpis");
    if (el) el.innerHTML = opsRetry("opsRenderMyStats", e);
    ["chartMonths", "chartCats", "chartTrips", "engagement"].forEach(id => {
      const box = document.getElementById(id);
      if (box) box.innerHTML = emptyState(apiErrorMessage(e));
    });
  }
}

/* ─── route registration ─────────────────────────────────────────────────── */

registerPage("notifications", opsRenderNotifications);
registerPage("moderation", opsRenderModeration);
registerPage("responder", opsRenderResponder);
registerPage("referrals", opsRenderReferrals);
registerPage("privacy", opsRenderPrivacy);
registerPage("community", opsRenderCommunity);
registerPage("my-stats", opsRenderMyStats);
