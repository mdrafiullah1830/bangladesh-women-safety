import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { ApiError, http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { fmtDate, humanize } from "../lib/format";
import type { EmergencyPrivacyMode, SessionView } from "../types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  KeyValue,
  PageHeader,
  Spinner,
} from "../components/ui";

const PRIVACY_MODES: EmergencyPrivacyMode[] = [
  "MAXIMUM_PRIVACY",
  "BALANCED",
  "SHARE_EXACT_LOCATION",
];

export function ProfilePage() {
  const { t, lang } = useI18n();
  const { user, updateProfile } = useAuth();
  const { show } = useToast();

  const sessions = useAsync<SessionView[]>(() => http.get("/api/auth/sessions"), []);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage ?? lang);
  const [defaultPrivacyMode, setDefaultPrivacyMode] = useState<EmergencyPrivacyMode>(
    user?.defaultPrivacyMode ?? "BALANCED"
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const fail = (err: unknown) =>
    show(err instanceof ApiError ? err.message : t("error"), "error");

  const saveProfile = async () => {
    setBusy(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        preferredLanguage,
        defaultPrivacyMode,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setCurrentPassword("");
      setNewPassword("");
      show(t("profileSaved"), "success");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await http.del(`/api/auth/sessions/${id}`);
      show(t("deleted"), "success");
      sessions.reload();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div className="container section">
      <PageHeader title={`👤 ${t("profile")}`} subtitle={user?.displayName} />

      <div className="grid grid-2">
        <Card title={t("profile")}>
          <div className="form-group">
            <label>{t("displayName")}</label>
            <input
              className="form-control"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t("language")}</label>
              <select
                className="form-control"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
              >
                <option value="bn">বাংলা</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t("defaultPrivacyMode")}</label>
              <select
                className="form-control"
                value={defaultPrivacyMode}
                onChange={(e) => setDefaultPrivacyMode(e.target.value as EmergencyPrivacyMode)}
              >
                {PRIVACY_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {humanize(mode)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h4 style={{ margin: "8px 0" }}>{t("changePassword")}</h4>
          <div className="form-row">
            <div className="form-group">
              <label>{t("currentPassword")}</label>
              <input
                className="form-control"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t("newPassword")}</label>
              <input
                className="form-control"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <button className="btn btn-primary btn-block" onClick={saveProfile} disabled={busy}>
            {busy ? t("saving") : t("save")}
          </button>

          <div style={{ marginTop: 20 }}>
            <KeyValue label={t("role")}>{humanize(user?.role)}</KeyValue>
            <KeyValue label={t("reputation")}>{user?.reputationScore ?? 0}</KeyValue>
            <KeyValue label={t("verifiedReports")}>{user?.verifiedReports ?? 0}</KeyValue>
            <KeyValue label={t("helpfulVotes")}>{user?.helpfulVotes ?? 0}</KeyValue>
            <KeyValue label={t("memberSince")}>{fmtDate(user?.createdAt, false, lang)}</KeyValue>
          </div>
        </Card>

        <Card title={t("sessions")}>
          {sessions.loading ? (
            <Spinner />
          ) : sessions.error ? (
            <ErrorState message={sessions.error} onRetry={sessions.reload} />
          ) : (sessions.data ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            (sessions.data ?? []).map((session) => (
              <div className="list-item" key={session.id}>
                <div>
                  <strong>{session.platform || session.deviceId}</strong>
                  <div className="meta">
                    {t("lastCheckIn")}: {fmtDate(session.lastSeenAt, true, lang)}
                  </div>
                </div>
                <div className="flex" style={{ gap: 8 }}>
                  {session.isCurrent ? <Badge tone="success">{t("currentSession")}</Badge> : null}
                  {!session.isCurrent ? (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => revokeSession(session.id)}
                    >
                      {t("revokeSession")}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}