/* Women Safety BD — auth pages: login, OTP verification, register, profile, devices */

/* ─── shared helpers ─────────────────────────────────────────────────────── */

function authText(en, bn) { return LANG === "bn" ? bn : en; }

function authVal(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function authErr(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message || "";
}

function authErrLine(id) {
  return '<p id="' + id + '" style="color:var(--danger);font-size:.9rem;min-height:1.2em;margin-top:4px"></p>';
}

function authFail(id, error) {
  const message = apiErrorMessage(error);
  authErr(id, message);
  toast(message, "error");
}

function authBusy(buttonId, busy) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  if (busy) {
    btn.dataset.label = btn.textContent;
    btn.disabled = true;
    btn.textContent = t("loading");
  } else {
    btn.disabled = false;
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }
}

function authKpi(value, label) {
  return '<div class="kpi"><div class="kpi-value">' + esc(value === null || value === undefined ? "—" : value) +
    '</div><div class="kpi-label">' + esc(label) + "</div></div>";
}

function authVerifiedChip(ok) {
  return ok
    ? '<span class="badge badge-success">' + t("verified") + "</span>"
    : '<span class="badge badge-muted">' + authText("unverified", "অযাচাইকৃত") + "</span>";
}

function authOtpTarget() {
  return {
    destination: localStorage.getItem("wsOtpDest") || "",
    purpose: localStorage.getItem("wsOtpPurpose") || "LOGIN"
  };
}

function authClearOtp() {
  localStorage.removeItem("wsOtpDest");
  localStorage.removeItem("wsOtpPurpose");
  localStorage.removeItem("wsDevOtp");
}

function authStartSession(result) {
  if (!result || !result.tokens || !result.tokens.accessToken) return false;
  persistSession(result.tokens.accessToken, result.tokens.refreshToken, result.user);
  return true;
}

/* ─── 1. Login ───────────────────────────────────────────────────────────── */

const AUTH_DEMO_ACCOUNTS = ["victim@demo", "moderator@demo", "responder@demo", "admin@demo"];
const AUTH_DEMO_PASSWORD = "Demo@1234";

function renderLogin() {
  const demoRows = AUTH_DEMO_ACCOUNTS.map(account =>
    '<div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border)">' +
    "<div><strong style=\"font-size:.9rem\">" + esc(account.split("@")[0]) + "</strong>" +
    '<div style="font-size:.82rem;color:var(--text-sec)">' + esc(account) + "</div></div>" +
    '<button type="button" class="btn btn-outline btn-sm" onclick="useDemo(\'' + esc(account) + '\')">' +
    authText("Use", "ব্যবহার") + "</button></div>").join("");

  const html =
    '<section class="auth-page"><div class="auth-card">' +
    "<h2>🛡️ " + t("login") + "</h2>" +
    '<form onsubmit="return false">' +
    '<div class="form-group"><label>' + authText("Phone or email", "ফোন বা ইমেইল") + "</label>" +
    '<input id="loginIdentifier" class="form-control" type="text" autocomplete="username" ' +
    'placeholder="01XXXXXXXXX / name@mail.com"></div>' +
    '<div class="form-group"><label>' + t("password") + "</label>" +
    '<input id="loginPassword" class="form-control" type="password" autocomplete="current-password"></div>' +
    '<label style="display:flex;gap:8px;align-items:center;font-size:.9rem;margin-bottom:8px">' +
    '<input id="loginShow" type="checkbox" onchange="toggleLoginPassword()"> ' +
    authText("Show password", "পাসওয়ার্ড দেখুন") + "</label>" +
    authErrLine("loginError") +
    '<button id="loginBtn" type="button" class="btn btn-primary btn-lg" style="width:100%" onclick="doLogin()">' +
    t("login") + "</button>" +
    "</form>" +
    '<div class="card" style="margin-top:20px;padding:16px">' +
    '<div class="card-header" style="font-size:.95rem;margin-bottom:6px">⚡ ' +
    authText("Demo accounts", "ডেমো অ্যাকাউন্ট") + "</div>" +
    demoRows +
    '<p style="margin-top:10px;font-size:.85rem;color:var(--text-sec)">' + t("password") +
    ': <code>Demo@1234</code></p>' +
    "</div>" +
    '<p class="text-center" style="margin-top:16px">' + authText("No account yet?", "অ্যাকাউন্ট নেই?") +
    ' <a href="#/register">' + t("register") + " →</a></p>" +
    "</div></section>";

  document.getElementById("app").innerHTML = shell(html, "login");
}

window.toggleLoginPassword = function () {
  const input = document.getElementById("loginPassword");
  const box = document.getElementById("loginShow");
  if (input) input.type = box && box.checked ? "text" : "password";
};

window.useDemo = function (account) {
  const idEl = document.getElementById("loginIdentifier");
  const pwEl = document.getElementById("loginPassword");
  if (idEl) idEl.value = account;
  if (pwEl) pwEl.value = AUTH_DEMO_PASSWORD;
  authErr("loginError", "");
  toast(authText("Demo credentials filled", "ডেমো তথ্য বসানো হয়েছে"), "success");
};

window.doLogin = async function () {
  const identifier = authVal("loginIdentifier");
  const password = authVal("loginPassword");
  authErr("loginError", "");
  if (!identifier || !password) {
    authErr("loginError", authText("Enter your phone/email and password.", "ফোন/ইমেইল ও পাসওয়ার্ড দিন।"));
    return;
  }
  authBusy("loginBtn", true);
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password })
    });
    if (!result.succeeded) throw { message: result.error || t("error") };
    if (result.devOtp && !result.tokens) {
      localStorage.setItem("wsOtpDest", identifier);
      localStorage.setItem("wsOtpPurpose", "LOGIN");
      if (result.devOtp) localStorage.setItem("wsDevOtp", result.devOtp);
      navigate("otp");
      return;
    }
    if (!authStartSession(result)) throw { message: t("error") };
    toast(authText("Signed in", "লগইন সফল"), "success");
    navigate("dashboard");
    refreshUnread();
  } catch (e) {
    authFail("loginError", e);
  } finally {
    authBusy("loginBtn", false);
  }
};

/* ─── 2. OTP verification ────────────────────────────────────────────────── */

let authOtpCooldown = 0;
let authOtpTimer = null;

function authOtpInputs() {
  return Array.from(document.querySelectorAll(".otp-digit"));
}

function authBindOtp() {
  const inputs = authOtpInputs();
  inputs.forEach((input, index) => {
    input.addEventListener("focus", () => input.select());
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 1);
      if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
    });
    input.addEventListener("keydown", event => {
      if (event.key === "Backspace" && !input.value && index > 0) inputs[index - 1].focus();
    });
    input.addEventListener("paste", event => {
      event.preventDefault();
      const text = (event.clipboardData || window.clipboardData).getData("text") || "";
      const chars = text.replace(/\D/g, "").slice(0, 6).split("");
      chars.forEach((char, position) => { if (inputs[position]) inputs[position].value = char; });
      if (chars.length) inputs[Math.min(chars.length, inputs.length - 1)].focus();
    });
  });
  if (inputs[0]) inputs[0].focus();
}

function authShowDevOtp(code) {
  const box = document.getElementById("otpDevHint");
  const value = document.getElementById("otpDevCode");
  if (!box || !value) return;
  value.textContent = code || "—";
  box.style.display = code ? "" : "none";
}

function authOtpTick() {
  const btn = document.getElementById("otpResendBtn");
  if (!btn) {
    if (authOtpTimer) clearInterval(authOtpTimer);
    authOtpTimer = null;
    return;
  }
  if (authOtpCooldown <= 0) {
    btn.disabled = false;
    btn.textContent = authText("Resend code", "আবার পাঠান");
    if (authOtpTimer) clearInterval(authOtpTimer);
    authOtpTimer = null;
    return;
  }
  btn.disabled = true;
  btn.textContent = authText("Resend in ", "আবার পাঠান ") + authOtpCooldown + "s";
  authOtpCooldown--;
}

function authStartCooldown() {
  authOtpCooldown = 60;
  if (authOtpTimer) clearInterval(authOtpTimer);
  authOtpTimer = setInterval(authOtpTick, 1000);
  authOtpTick();
}

function renderOtp() {
  const { destination, purpose } = authOtpTarget();
  if (!destination) { navigate("login"); return; }

  const digitInputs = [0, 1, 2, 3, 4, 5].map(i =>
    '<input class="otp-digit" id="otpDigit' + i + '" type="text" inputmode="numeric" ' +
    'autocomplete="one-time-code" maxlength="1" pattern="[0-9]*" ' +
    'style="width:48px;height:56px;text-align:center;font-size:1.4rem;font-weight:700;' +
    'border:1px solid var(--border);border-radius:var(--r-sm)">').join("");

  const devOtp = localStorage.getItem("wsDevOtp") || "";

  const html =
    '<section class="auth-page"><div class="auth-card">' +
    "<h2>🔐 " + authText("Verify code", "কোড যাচাই") + "</h2>" +
    '<p class="text-center" style="color:var(--text-sec);font-size:.92rem;margin-bottom:16px">' +
    authText("Enter the 6-digit code sent to ", "৬ সংখ্যার কোড পাঠানো হয়েছে: ") +
    "<strong>" + esc(destination) + "</strong><br>" +
    '<span style="font-size:.8rem">' + authText("Purpose", "উদ্দেশ্য") + ": " + esc(purpose) + "</span></p>" +
    '<form onsubmit="return false">' +
    '<div class="otp-box" id="otpBox" style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">' +
    digitInputs + "</div>" +
    authErrLine("otpError") +
    '<button id="otpVerifyBtn" type="button" class="btn btn-primary btn-lg" style="width:100%" ' +
    'onclick="verifyOtp()">' + authText("Verify", "যাচাই করুন") + "</button>" +
    "</form>" +
    '<div id="otpDevHint" class="card" style="padding:12px;margin-top:16px;background:var(--surface-alt);' +
    'border-style:dashed' + (devOtp ? "" : ";display:none") + '">' +
    '<div style="font-size:.75rem;font-weight:700;letter-spacing:.6px;text-transform:uppercase;' +
    'color:var(--text-sec)">Development OTP</div>' +
    '<div id="otpDevCode" style="font-family:monospace;font-size:1.5rem;font-weight:800;letter-spacing:6px">' +
    esc(devOtp || "—") + "</div>" +
    '<p style="font-size:.78rem;color:var(--text-sec);margin-top:4px">' +
    authText("Shown because no SMS gateway is configured in development.",
      "ডেভেলপমেন্টে এসএমএস সংযোগ না থাকায় শুধু এখানে দেখানো হচ্ছে।") + "</p></div>" +
    '<div class="flex-between" style="margin-top:16px">' +
    '<button id="otpResendBtn" type="button" class="btn btn-outline btn-sm" onclick="resendOtp()">' +
    authText("Resend code", "আবার পাঠান") + "</button>" +
    '<a href="#/login" style="font-size:.9rem">← ' + t("login") + "</a></div>" +
    "</div></section>";

  document.getElementById("app").innerHTML = shell(html, "otp");
  authBindOtp();
  if (authOtpCooldown > 0) authStartCooldown();
}

window.verifyOtp = async function () {
  const code = authOtpInputs().map(input => input.value).join("");
  const { destination, purpose } = authOtpTarget();
  authErr("otpError", "");
  if (code.length !== 6) {
    authErr("otpError", authText("Enter all 6 digits.", "৬টি সংখ্যা পূরণ করুন।"));
    return;
  }
  if (!destination) { navigate("login"); return; }
  authBusy("otpVerifyBtn", true);
  try {
    const result = await api("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ destination, code, purpose })
    });
    if (!result.succeeded) throw { message: result.error || t("error") };
    if (!authStartSession(result)) throw { message: t("error") };
    authClearOtp();
    toast(authText("Verified — welcome!", "যাচাই সফল — স্বাগতম!"), "success");
    navigate("dashboard");
    refreshUnread();
  } catch (e) {
    authFail("otpError", e);
  } finally {
    authBusy("otpVerifyBtn", false);
  }
};

window.resendOtp = async function () {
  if (authOtpCooldown > 0) return;
  const { destination, purpose } = authOtpTarget();
  if (!destination) { navigate("login"); return; }
  authErr("otpError", "");
  const btn = document.getElementById("otpResendBtn");
  if (btn) btn.disabled = true;
  try {
    const result = await api("/api/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ destination, purpose })
    });
    if (result.devOtp) {
      localStorage.setItem("wsDevOtp", result.devOtp);
      authShowDevOtp(result.devOtp);
    }
    toast(authText("Code sent", "কোড পাঠানো হয়েছে"), "success");
    authStartCooldown();
  } catch (e) {
    if (btn) btn.disabled = false;
    authFail("otpError", e);
  }
};

/* ─── 3. Register ────────────────────────────────────────────────────────── */

function renderRegister() {
  const html =
    '<section class="auth-page"><div class="auth-card">' +
    "<h2>🛡️ " + t("register") + "</h2>" +
    '<form onsubmit="return false">' +
    '<div class="form-group"><label>' + t("name") + ' <span style="color:var(--danger)">*</span></label>' +
    '<input id="regName" class="form-control" type="text" maxlength="80" autocomplete="name"></div>' +
    '<div class="form-group"><label>' + t("phone") + " (" + authText("optional", "ঐচ্ছিক") + ")</label>" +
    '<input id="regPhone" class="form-control" type="tel" inputmode="numeric" maxlength="11" ' +
    'pattern="01[0-9]{9}" placeholder="01XXXXXXXXX"></div>' +
    '<div class="form-group"><label>' + t("email") + " (" + authText("optional", "ঐচ্ছিক") + ")</label>" +
    '<input id="regEmail" class="form-control" type="email" autocomplete="email" placeholder="name@mail.com"></div>' +
    '<div class="form-group"><label>' + t("password") + " (" + authText("min 6", "সর্বনিম্ন ৬") + ")</label>" +
    '<input id="regPassword" class="form-control" type="password" minlength="6" autocomplete="new-password"></div>' +
    '<div class="form-group"><label>' + authText("Confirm password", "পাসওয়ার্ড নিশ্চিত করুন") + "</label>" +
    '<input id="regPassword2" class="form-control" type="password" minlength="6" autocomplete="new-password"></div>' +
    '<div class="form-group"><label>' + t("district") + " (" + authText("optional", "ঐচ্ছিক") + ")</label>" +
    '<div id="regDistrictWrap">' + spinner(t("loading")) + "</div></div>" +
    '<div class="form-group"><label>' + t("language") + "</label>" +
    '<div class="flex" style="gap:20px;margin-top:4px">' +
    '<label style="display:flex;gap:6px;align-items:center;font-weight:500">' +
    '<input type="radio" name="regLang" value="bn" checked> বাংলা</label>' +
    '<label style="display:flex;gap:6px;align-items:center;font-weight:500">' +
    '<input type="radio" name="regLang" value="en"> English</label></div></div>' +
    authErrLine("regError") +
    '<button id="regBtn" type="button" class="btn btn-primary btn-lg" style="width:100%" onclick="doRegister()">' +
    t("register") + "</button>" +
    "</form>" +
    '<p class="text-center" style="margin-top:16px">' + authText("Already registered?", "ইতিমধ্যে রেজিস্টার করা?") +
    ' <a href="#/login">' + t("login") + " →</a></p>" +
    "</div></section>";

  document.getElementById("app").innerHTML = shell(html, "register");
  loadRegisterDistricts();
}

async function loadRegisterDistricts() {
  const wrap = document.getElementById("regDistrictWrap");
  if (!wrap) return;
  try {
    await ensureDistricts();
    const current = authVal("regDistrict");
    wrap.innerHTML = districtSelectHtml("regDistrict", current);
  } catch (e) {
    wrap.innerHTML = '<p style="color:var(--danger);font-size:.9rem">' + esc(apiErrorMessage(e)) + "</p>";
  }
}

window.doRegister = async function () {
  const displayName = authVal("regName");
  const phoneNumber = authVal("regPhone");
  const email = authVal("regEmail");
  const password = authVal("regPassword");
  const password2 = authVal("regPassword2");
  const districtEl = document.getElementById("regDistrict");
  const districtId = districtEl ? districtEl.value : "";
  const langEl = document.querySelector("input[name=regLang]:checked");
  const language = langEl && langEl.value === "en" ? "en" : "bn";

  authErr("regError", "");
  if (!displayName) {
    authErr("regError", authText("Display name is required.", "প্রদর্শন নাম আবশ্যক।"));
    return;
  }
  if (!phoneNumber && !email) {
    authErr("regError", authText("Provide a phone number or an email address.", "ফোন নম্বর বা ইমেইল দিন।"));
    return;
  }
  if (phoneNumber && !/^01\d{9}$/.test(phoneNumber)) {
    authErr("regError", authText("Phone must look like 01XXXXXXXXX.", "ফোন ০১XXXXXXXXX আকারে হতে হবে।"));
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    authErr("regError", authText("That email address looks invalid.", "ইমেইল ঠিকানাটি সঠিক নয়।"));
    return;
  }
  if (password.length < 6) {
    authErr("regError", authText("Password must be at least 6 characters.", "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।"));
    return;
  }
  if (password !== password2) {
    authErr("regError", authText("Passwords do not match.", "পাসওয়ার্ড মিলছে না।"));
    return;
  }

  authBusy("regBtn", true);
  try {
    const body = { displayName, password, language };
    if (phoneNumber) body.phoneNumber = phoneNumber;
    if (email) body.email = email;
    if (districtId) body.districtId = districtId;

    const result = await api("/api/auth/register", { method: "POST", body: JSON.stringify(body) });
    if (!result.succeeded) throw { message: result.error || t("error") };

    if (result.devOtp) {
      localStorage.setItem("wsOtpDest", phoneNumber || email);
      localStorage.setItem("wsOtpPurpose", "REGISTER");
      localStorage.setItem("wsDevOtp", result.devOtp);
      navigate("otp");
      return;
    }
    if (!authStartSession(result)) throw { message: t("error") };
    toast(authText("Account created", "অ্যাকাউন্ট তৈরি হয়েছে"), "success");
    navigate("dashboard");
    refreshUnread();
  } catch (e) {
    authFail("regError", e);
  } finally {
    authBusy("regBtn", false);
  }
};

/* ─── 4. Profile ─────────────────────────────────────────────────────────── */

const AUTH_PRIVACY_MODES = [
  {
    value: "MAXIMUM_PRIVACY",
    bn: "সর্বোচ্চ প্রাইভেসি — শুধু ফোন/SMS সতর্কতা, কোনো অবস্থান শেয়ার হয় না",
    en: "Maximum privacy — phone/SMS alerts only, no location shared"
  },
  {
    value: "BALANCED",
    bn: "ভারসাম্য — বিশ্বস্ত ও রেসপন্ডাররা আনুমানিক এলাকা দেখতে পায়",
    en: "Balanced — trusted contacts and responders see a rough area"
  },
  {
    value: "SHARE_EXACT_LOCATION",
    bn: "সঠিক অবস্থান — জরুরি অবস্থায় নির্ভুল লোকেশন পাঠানো হয়",
    en: "Share exact location — precise coordinates sent in emergencies"
  }
];

function authPrivacySelectHtml(selected) {
  return '<select id="profPrivacy" class="form-control">' + AUTH_PRIVACY_MODES.map(mode =>
    '<option value="' + mode.value + '"' + (String(selected) === mode.value ? " selected" : "") + ">" +
    esc(LANG === "bn" ? mode.bn : mode.en) + "</option>").join("") + "</select>";
}

function paintProfile(p) {
  const roleBadge = statusBadge(p.role);
  const phoneRow = p.phoneNumber
    ? '<div class="def-item"><span class="key">' + t("phone") + '</span><span class="meaning">' +
      esc(p.phoneNumber) + " " + authVerifiedChip(p.isPhoneVerified) + "</span></div>"
    : "";
  const emailRow = p.email
    ? '<div class="def-item"><span class="key">' + t("email") + '</span><span class="meaning">' +
      esc(p.email) + " " + authVerifiedChip(p.isEmailVerified) + "</span></div>"
    : "";

  const header =
    '<div class="card" style="margin-bottom:16px">' +
    '<div class="flex-between" style="flex-wrap:wrap;gap:8px">' +
    '<div><h2 style="font-size:1.4rem">' + esc(p.displayName) + "</h2>" +
    '<div style="font-size:.88rem;color:var(--text-sec)">' +
    esc(LANG === "bn" ? "সদস্য হয়েছেন " + fmtDate(p.createdAt) : "Joined " + fmtDate(p.createdAt)) +
    (p.lastLoginAt ? " · " + authText("Last login ", "সর্বশেষ লগইন ") + fmtDate(p.lastLoginAt, true) : "") +
    "</div></div>" + roleBadge + "</div>" +
    '<div style="margin-top:12px">' +
    '<div class="def-item"><span class="key">' + t("district") + '</span><span class="meaning">' +
    esc(p.districtName || "—") + "</span></div>" +
    phoneRow + emailRow + "</div>" +
    '<div class="grid grid-4" style="margin-top:16px">' +
    authKpi(p.reputationScore, authText("Reputation", "রেপুটেশন")) +
    authKpi(p.verifiedReports, authText("Verified reports", "যাচাইকৃত প্রতিবেদন")) +
    authKpi(p.helpfulVotes, authText("Helpful votes", "সহায়ক ভোট")) +
    authKpi(p.strikes, authText("Strikes", "স্ট্রাইক")) +
    "</div></div>";

  const edit =
    '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-header">✏️ ' + authText("Edit profile", "প্রোফাইল সম্পাদনা") + "</div>" +
    '<form onsubmit="return false">' +
    '<div class="form-group"><label>' + t("name") + "</label>" +
    '<input id="profName" class="form-control" type="text" maxlength="80" value="' + esc(p.displayName) + '"></div>' +
    '<div class="form-group"><label>' + t("district") + "</label>" +
    districtSelectHtml("profDistrict", p.districtId || "") + "</div>" +
    '<div class="form-group"><label>' + t("language") + "</label>" +
    '<select id="profLang" class="form-control">' +
    '<option value="bn"' + (p.preferredLanguage === "bn" ? " selected" : "") + ">বাংলা</option>" +
    '<option value="en"' + (p.preferredLanguage === "en" ? " selected" : "") + ">English</option>" +
    "</select></div>" +
    '<div class="form-group"><label>' + authText("Default privacy mode", "ডিফল্ট প্রাইভেসি মোড") + "</label>" +
    authPrivacySelectHtml(p.defaultPrivacyMode) + "</div>" +
    '<div class="form-group" style="background:var(--surface-alt);border-radius:var(--r-sm);padding:12px">' +
    '<label>' + authText("Change password", "পাসওয়ার্ড পরিবর্তন") +
    ' <span style="font-weight:400;color:var(--text-sec)">(' + authText("leave blank to keep current", "না দিলে আগেরটি থাকবে") + ")</span></label>" +
    '<input id="pwCurrent" class="form-control" type="password" autocomplete="current-password" ' +
    'placeholder="' + t("password") + '" style="margin-top:6px">' +
    '<input id="pwNew" class="form-control" type="password" minlength="6" autocomplete="new-password" ' +
    'placeholder="' + authText("New password", "নতুন পাসওয়ার্ড") + '" style="margin-top:8px"></div>' +
    authErrLine("profError") +
    '<div class="flex" style="flex-wrap:wrap;gap:10px">' +
    '<button id="profSaveBtn" type="button" class="btn btn-primary" onclick="saveProfile()">' + t("save") + "</button>" +
    '<button type="button" class="btn btn-outline" onclick="toggleLang()">' + t("language") + ": " +
    (LANG === "bn" ? "EN" : "বাংলা") + "</button>" +
    '<button type="button" class="btn btn-danger" onclick="doLogout()">' + t("logout") + "</button>" +
    "</div></form></div>";

  const links =
    '<div class="card"><div class="card-header">🔗 ' + authText("Account & privacy", "অ্যাকাউন্ট ও প্রাইভেসি") + "</div>" +
    '<div class="flex" style="flex-wrap:wrap;gap:10px">' +
    '<a class="btn btn-outline btn-sm" href="#/devices">🖥️ ' + t("devices") + "</a>" +
    '<a class="btn btn-outline btn-sm" href="#/privacy">🔒 ' + t("privacy") + "</a>" +
    '<a class="btn btn-outline btn-sm" href="#/my-stats">📊 ' + t("myStats") + "</a>" +
    "</div></div>";

  const html = '<section class="section"><div class="container" style="max-width:760px">' +
    '<div class="section-header"><h2>👤 ' + t("profile") + "</h2></div>" +
    header + edit + links + "</div></section>";

  document.getElementById("app").innerHTML = shell(html, "profile");
}

async function renderProfile() {
  if (!token) { navigate("login"); return; }
  document.getElementById("app").innerHTML =
    shell('<section class="section"><div class="container">' + spinner() + "</div></section>", "profile");
  try {
    const data = await api("/api/auth/profile");
    persistSession(null, null, data);
    try { await ensureDistricts(); } catch { /* district list is optional for display */ }
    paintProfile(data);
  } catch (e) {
    document.getElementById("app").innerHTML =
      shell('<section class="section"><div class="container card">' +
        emptyState(apiErrorMessage(e),
          '<button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="renderProfile()">' +
          t("retry") + "</button>") + "</div></section>", "profile");
  }
}

window.saveProfile = async function () {
  const displayName = authVal("profName");
  const currentPassword = authVal("pwCurrent");
  const newPassword = authVal("pwNew");
  const districtEl = document.getElementById("profDistrict");
  const langEl = document.getElementById("profLang");
  const privacyEl = document.getElementById("profPrivacy");

  authErr("profError", "");
  if (!displayName) {
    authErr("profError", authText("Display name is required.", "প্রদর্শন নাম আবশ্যক।"));
    return;
  }
  if (newPassword && newPassword.length < 6) {
    authErr("profError", authText("New password must be at least 6 characters.",
      "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।"));
    return;
  }
  if (newPassword && !currentPassword) {
    authErr("profError", authText("Enter your current password to change it.",
      "পাসওয়ার্ড বদলাতে বর্তমান পাসওয়ার্ড দিন।"));
    return;
  }

  const body = {
    displayName,
    districtId: districtEl ? districtEl.value : "",
    preferredLanguage: langEl ? langEl.value : undefined,
    defaultPrivacyMode: privacyEl ? privacyEl.value : undefined
  };
  if (currentPassword || newPassword) {
    body.currentPassword = currentPassword;
    body.newPassword = newPassword;
  }

  authBusy("profSaveBtn", true);
  try {
    const data = await api("/api/auth/profile", { method: "PUT", body: JSON.stringify(body) });
    persistSession(null, null, data);
    toast(authText("Profile saved", "প্রোফাইল সংরক্ষিত হয়েছে"), "success");
    renderProfile();
  } catch (e) {
    authFail("profError", e);
  } finally {
    authBusy("profSaveBtn", false);
  }
};

/* ─── 5. Devices / sessions ──────────────────────────────────────────────── */

function paintDevices(sessions) {
  const rows = sessions.map(s => {
    const deviceId = String(s.deviceId || "");
    return "<tr>" +
      '<td style="font-family:monospace;font-size:.85rem;max-width:170px;overflow:hidden;' +
      'text-overflow:ellipsis;white-space:nowrap" title="' + esc(deviceId) + '">' +
      esc(deviceId.slice(0, 14) || "—") + (deviceId.length > 14 ? "…" : "") + "</td>" +
      "<td>" + esc(s.platform || "—") + "</td>" +
      "<td>" + fmtDate(s.lastSeenAt, true) + "</td>" +
      "<td>" + fmtDate(s.createdAt) + "</td>" +
      "<td>" + (s.isCurrent
        ? '<span class="badge badge-success">' + authText("current", "বর্তমান") + "</span>"
        : "") + "</td>" +
      '<td><button type="button" class="btn btn-danger btn-sm" onclick="revokeSession(\'' +
      esc(s.id) + "')\">" + authText("Revoke", "বাতিল") + "</button></td>" +
      "</tr>";
  }).join("");

  const body = sessions.length
    ? rows
    : '<tr><td colspan="6">' + emptyState(t("none")) + "</td></tr>";

  const html = '<section class="section"><div class="container" style="max-width:900px">' +
    '<div class="section-header"><h2>🖥️ ' + t("devices") + "</h2><p>" +
    authText("Signed-in devices and active sessions for your account.",
      "আপনার অ্যাকাউন্টে লগইন থাকা ডিভাইস ও সক্রিয় সেশন।") + "</p></div>" +
    '<div class="card"><div class="table-wrap"><table>' +
    "<thead><tr><th>" + authText("Device", "ডিভাইস") + "</th><th>" +
    authText("Platform", "প্ল্যাটফর্ম") + "</th><th>" + authText("Last seen", "সর্বশেষ দেখা") +
    "</th><th>" + t("date") + "</th><th>" + t("status") + "</th><th>" + t("action") + "</th></tr></thead>" +
    "<tbody>" + body + "</tbody></table></div></div>" +
    '<div class="card" style="margin-top:16px;border-left:4px solid var(--warning)">' +
    '<div class="card-header">🔐 ' + authText("Security", "নিরাপত্তা") + "</div>" +
    "<p style=\"font-size:.92rem\">" +
    authText("Refresh tokens are rotated on every renewal and can be revoked here at any time.",
      "রিফ্রেশ টোকেন প্রতিবার নতুন করে তৈরি হয় এবং এখান থেকে যেকোনো সময় বাতিল করা যায়।") + "</p>" +
    '<p style="font-size:.92rem;margin-top:8px">' +
    authText("If you spot a device you do not recognize — an unfamiliar device id, platform or a " +
      "“last seen” time you were not active — revoke it immediately and change your password.",
      "চেনা না এমন ডিভাইস (অপরিচিত ডিভাইস আইডি, প্ল্যাটফর্ম বা অচেনা সময়ে “সর্বশেষ দেখা”) দেখলে " +
      "সাথে সাথে বাতিল করে পাসওয়ার্ড পরিবর্তন করুন।") + "</p></div>" +
    '<p style="margin-top:16px"><a href="#/profile">← ' + t("profile") + "</a></p>" +
    "</div></section>";

  document.getElementById("app").innerHTML = shell(html, "devices");
}

async function renderDevices() {
  if (!token) { navigate("login"); return; }
  document.getElementById("app").innerHTML =
    shell('<section class="section"><div class="container">' + spinner() + "</div></section>", "devices");
  try {
    const sessions = await api("/api/auth/sessions");
    paintDevices(Array.isArray(sessions) ? sessions : []);
  } catch (e) {
    document.getElementById("app").innerHTML =
      shell('<section class="section"><div class="container card">' +
        emptyState(apiErrorMessage(e),
          '<button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="renderDevices()">' +
          t("retry") + "</button>") + "</div></section>", "devices");
  }
}

window.revokeSession = async function (sessionId) {
  const confirmed = window.confirm(authText(
    "Revoke this device? Its sessions will be signed out.",
    "এই ডিভাইসটি বাতিল করবেন? এর সেশনগুলো সাইন আউট হবে।"));
  if (!confirmed) return;
  try {
    await api("/api/auth/sessions/" + encodeURIComponent(sessionId), { method: "DELETE" });
    toast(authText("Device revoked", "ডিভাইস বাতিল হয়েছে"), "success");
    renderDevices();
  } catch (e) {
    toast(apiErrorMessage(e), "error");
  }
};

/* ─── route registration ─────────────────────────────────────────────────── */

registerPage("login", renderLogin);
registerPage("otp", renderOtp);
registerPage("register", renderRegister);
registerPage("profile", renderProfile);
registerPage("devices", renderDevices);
