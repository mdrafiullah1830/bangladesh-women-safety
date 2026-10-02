import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { ApiError, http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { fmtDate, humanize } from "../lib/format";
import type { ConsentView, DeletionRequestView } from "../types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";

const CONSENT_KEYS: { key: string; label: string }[] = [
  { key: "privacy_policy", label: "consentPrivacyPolicy" },
  { key: "location_tracking", label: "consentLocation" },
  { key: "trusted_contact_alerts", label: "consentContactAlerts" },
  { key: "anonymous_statistics", label: "consentAnonymousStats" },
  { key: "browser_notifications", label: "consentBrowserNotifications" },
  { key: "marketing_messages", label: "consentMarketing" },
];

export function PrivacyPage() {
  const { t, lang } = useI18n();
  const { show } = useToast();

  const consents = useAsync<ConsentView[]>(() => http.get("/api/privacy/consents"), []);
  const requests = useAsync<DeletionRequestView[]>(
    () => http.get("/api/privacy/deletion-request"),
    []
  );

  const [state, setState] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (consents.data) {
      const next: Record<string, boolean> = {};
      for (const consent of consents.data) next[consent.key] = consent.granted;
      setState(next);
    }
  }, [consents.data]);

  const fail = (err: unknown) =>
    show(err instanceof ApiError ? err.message : t("error"), "error");

  const saveConsents = async () => {
    setBusy(true);
    try {
      // The API accepts a list of ConsentRequest objects.
      await http.put(
        "/api/privacy/consents",
        CONSENT_KEYS.map((item) => ({
          consentKey: item.key,
          granted: Boolean(state[item.key]),
        }))
      );
      show(t("savedConsents"), "success");
      consents.reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const downloadExport = async () => {
    try {
      const data = await http.get<unknown>("/api/privacy/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `women-safety-export-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      fail(err);
    }
  };

  const requestDeletion = async () => {
    if (!reason.trim()) {
      show(t("required"), "error");
      return;
    }
    setBusy(true);
    try {
      await http.post("/api/privacy/deletion-request", { reason: reason.trim() });
      show(t("deletionQueued"), "success");
      setReason("");
      requests.reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container section">
      <PageHeader title={`🔒 ${t("privacy")}`} subtitle={t("consentsTitle")} />

      <div className="grid grid-2">
        <Card title={t("consentsTitle")}>
          {consents.loading ? (
            <Spinner />
          ) : consents.error ? (
            <ErrorState message={consents.error} onRetry={consents.reload} />
          ) : (
            <>
              {CONSENT_KEYS.map((item) => (
                <label className="checkbox-row" key={item.key} style={{ padding: "8px 0" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(state[item.key])}
                    onChange={(e) => setState({ ...state, [item.key]: e.target.checked })}
                  />
                  {t(item.label)}
                </label>
              ))}
              <button
                className="btn btn-primary btn-block"
                style={{ marginTop: 12 }}
                onClick={saveConsents}
                disabled={busy}
              >
                {busy ? t("saving") : t("save")}
              </button>
            </>
          )}
        </Card>

        <Card title={t("exportTitle")}>
          <p className="muted">{t("exportHint")}</p>
          <button className="btn btn-outline btn-block" style={{ marginTop: 12 }} onClick={downloadExport}>
            ⬇️ {t("downloadExport")}
          </button>

          <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid var(--border)" }} />

          <h4 style={{ marginBottom: 8 }}>{t("deletionTitle")}</h4>
          <p className="muted">{t("deletionHint")}</p>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>{t("deletionReason")}</label>
            <input
              className="form-control"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <button className="btn btn-danger" onClick={requestDeletion} disabled={busy}>
            {t("requestDeletion")}
          </button>
        </Card>
      </div>

      <section style={{ marginTop: 24 }}>
        <Card title={t("myRequests")}>
          {requests.loading ? (
            <Spinner />
          ) : (requests.data ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            (requests.data ?? []).map((request) => (
              <div className="list-item" key={request.id}>
                <div>
                  <strong>{request.reason}</strong>
                  <div className="meta">{fmtDate(request.createdAt, true, lang)}</div>
                </div>
                <Badge tone={request.status === "APPROVED" ? "success" : "warning"}>
                  {humanize(request.status)}
                </Badge>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}