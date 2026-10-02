import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useI18n } from "../i18n";
import { ApiError } from "../lib/api";

export function RegisterPage() {
  const { t, lang } = useI18n();
  const { register } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = displayName.trim() && password.length >= 6 && (phoneNumber || email);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await register({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        email: email.trim() || undefined,
        password,
        language: lang,
      });
      if (!result.succeeded) {
        show(result.error || t("error"), "error");
        return;
      }
      show(t("createAccount"), "success");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      show(err instanceof ApiError ? err.message : t("error"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>🛡️ {t("createAccount")}</h2>
        <p className="sub">{t("appTagline")}</p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>{t("displayName")}</label>
            <input
              className="form-control"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                {t("phone")} <span className="muted">({t("optional")})</span>
              </label>
              <input
                className="form-control"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="form-group">
              <label>
                {t("email")} <span className="muted">({t("optional")})</span>
              </label>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t("password")}</label>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <span className="muted">{t("passwordHint")}</span>
          </div>

          <button className="btn btn-primary btn-block" disabled={busy || !canSubmit}>
            {busy ? t("sending") : t("signUp")}
          </button>
        </form>

        <p className="auth-switch">
          {t("alreadyHaveAccount")} <Link to="/login">{t("signIn")}</Link>
        </p>
      </div>
    </div>
  );
}