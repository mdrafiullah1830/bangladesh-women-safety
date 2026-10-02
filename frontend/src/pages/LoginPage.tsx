import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useI18n } from "../i18n";
import { ApiError } from "../lib/api";

export function LoginPage() {
  const { t } = useI18n();
  const { login, sendOtp, verifyOtp } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || "/dashboard";

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (err: unknown) =>
    show(err instanceof ApiError ? err.message : t("error"), "error");

  const onPasswordLogin = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await login(identifier.trim(), password);
      if (!result.succeeded) {
        show(result.error || t("error"), "error");
        return;
      }
      show(t("welcomeBack"), "success");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const onSendOtp = async () => {
    setBusy(true);
    try {
      const result = await sendOtp(identifier.trim(), "LOGIN");
      setOtpSent(true);
      if (result.devOtp) setDevOtp(result.devOtp);
      show("OTP sent", "success");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const onVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await verifyOtp(identifier.trim(), code.trim(), "LOGIN");
      if (!result.succeeded) {
        show(result.error || t("error"), "error");
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>🛡️ {t("welcomeBack")}</h2>
        <p className="sub">{t("signIn")}</p>

        <div className="form-group">
          <label>{t("identifier")}</label>
          <input
            className="form-control"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="01xxxxxxxxx / you@example.com"
          />
        </div>

        {mode === "password" ? (
          <form onSubmit={onPasswordLogin}>
            <div className="form-group">
              <label>{t("password")}</label>
              <input
                className="form-control"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy || !identifier || !password}>
              {busy ? t("loading") : t("signInCta")}
            </button>
          </form>
        ) : otpSent ? (
          <form onSubmit={onVerifyOtp}>
            <div className="form-group">
              <label>{t("otpCode")}</label>
              <input
                className="form-control"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            {devOtp ? (
              <p className="muted">
                {t("devOtp")}: <strong>{devOtp}</strong>
              </p>
            ) : null}
            <button className="btn btn-primary btn-block" disabled={busy || !code}>
              {busy ? t("loading") : t("verifyOtp")}
            </button>
          </form>
        ) : (
          <button
            className="btn btn-primary btn-block"
            disabled={busy || !identifier}
            onClick={onSendOtp}
          >
            {busy ? t("loading") : t("sendOtp")}
          </button>
        )}

        <button
          type="button"
          className="link-button"
          style={{ marginTop: 16, display: "block", marginInline: "auto" }}
          onClick={() => {
            setMode(mode === "password" ? "otp" : "password");
            setOtpSent(false);
          }}
        >
          {mode === "password" ? t("useOtp") : t("signIn")}
        </button>

        <p className="auth-switch">
          {t("noAccount")} <Link to="/register">{t("signUp")}</Link>
        </p>
      </div>
    </div>
  );
}