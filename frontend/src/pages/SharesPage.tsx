import { useState } from "react";
import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { ApiError, http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { fmtDate, getPosition } from "../lib/format";
import type { ShareCreateResponse, ShareView } from "../types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";

export function SharesPage() {
  const { t, lang } = useI18n();
  const { show } = useToast();
  const shares = useAsync<ShareView[]>(() => http.get<ShareView[]>("/api/shares"), []);

  const [note, setNote] = useState("");
  const [validityMinutes, setValidityMinutes] = useState(120);
  const [maxViews, setMaxViews] = useState(50);
  const [busy, setBusy] = useState(false);

  const fail = (err: unknown) =>
    show(err instanceof ApiError ? err.message : t("error"), "error");

  const createShare = async () => {
    setBusy(true);
    const position = await getPosition();
    if (!position) {
      setBusy(false);
      show(t("locationUnavailable"), "error");
      return;
    }
    try {
      const result = await http.post<ShareCreateResponse>("/api/shares", {
        note: note.trim() || undefined,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        validityMinutes,
        maxViews,
      });
      const url = `${window.location.origin}/track/${result.token}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* clipboard may be blocked */
      }
      show(`${t("shareLink")}: ${url}`, "success");
      setNote("");
      shares.reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await http.del(`/api/shares/${id}`);
      show(t("revoked"), "success");
      shares.reload();
    } catch (err) {
      fail(err);
    }
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/track/${token}`);
      show(t("copied"), "success");
    } catch {
      fail(new Error(t("failed")));
    }
  };

  return (
    <div className="container section">
      <PageHeader title={`📍 ${t("liveLocation")}`} subtitle={t("createShare")} />

      <div className="grid grid-2">
        <Card title={t("createShare")}>
          <div className="form-group">
            <label>
              {t("shareNote")} <span className="muted">({t("optional")})</span>
            </label>
            <input
              className="form-control"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t("validityMinutes")}</label>
              <input
                className="form-control"
                type="number"
                min={5}
                max={1440}
                value={validityMinutes}
                onChange={(e) => setValidityMinutes(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>{t("maxViews")}</label>
              <input
                className="form-control"
                type="number"
                min={1}
                max={1000}
                value={maxViews}
                onChange={(e) => setMaxViews(Number(e.target.value))}
              />
            </div>
          </div>
          <button className="btn btn-primary btn-block" onClick={createShare} disabled={busy}>
            {busy ? t("sending") : t("createShare")}
          </button>
        </Card>

        <Card title={t("myShares")}>
          {shares.loading ? (
            <Spinner />
          ) : shares.error ? (
            <ErrorState message={shares.error} onRetry={shares.reload} />
          ) : (shares.data ?? []).length === 0 ? (
            <EmptyState hint={t("noShares")} />
          ) : (
            (shares.data ?? []).map((share) => (
              <div className="list-item" key={share.id}>
                <div>
                  <strong>{share.note || t("liveLocation")}</strong>
                  <div className="meta">
                    {t("view")}: {share.viewCount}/{share.maxViews} · {t("date")}:
                    {fmtDate(share.expiresAt, true, lang)}
                  </div>
                  <div className="flex" style={{ gap: 6, marginTop: 6 }}>
                    <Badge tone={share.revoked ? "danger" : share.expired ? "muted" : "success"}>
                      {share.revoked ? t("revoked") : share.expired ? t("expired") : t("active")}
                    </Badge>
                  </div>
                </div>
                <div className="flex" style={{ gap: 8 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => copy(share.token)}>
                    {t("copy")}
                  </button>
                  {!share.revoked && !share.expired ? (
                    <button className="btn btn-sm btn-danger" onClick={() => revoke(share.id)}>
                      {t("revokeShare")}
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