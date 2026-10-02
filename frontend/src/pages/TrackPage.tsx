import { useParams } from "react-router-dom";
import { useI18n } from "../i18n";
import { http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import type { SharePublicView } from "../types";
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";

export function TrackPage() {
  const { t } = useI18n();
  const { token = "" } = useParams();
  const share = useAsync<SharePublicView>(
    () => http.get<SharePublicView>(`/api/shares/${token}`),
    [token]
  );

  const stateMessage: Record<string, string> = {
    REVOKED: t("trackingRevoked"),
    EXPIRED: t("trackingExpired"),
    LIMIT_REACHED: t("trackingLimitReached"),
  };

  return (
    <div className="container section">
      <PageHeader title={`📍 ${t("trackingActive")}`} subtitle={t("sharedByAnonymous")} />

      {share.loading ? (
        <Spinner />
      ) : share.error ? (
        <ErrorState message={share.error} onRetry={share.reload} />
      ) : !share.data ? (
        <EmptyState title={t("trackingNotFound")} />
      ) : share.data.state !== "ACTIVE" ? (
        <Card>
          <EmptyState title={stateMessage[share.data.state] ?? t("trackingNotFound")} />
        </Card>
      ) : (
        <Card title={share.data.note || t("liveLocation")}>
          <div className="kv">
            <span className="kv-label">{t("latitude")}</span>
            <span className="kv-value mono">{share.data.latitude?.toFixed(6)}</span>
          </div>
          <div className="kv">
            <span className="kv-label">{t("longitude")}</span>
            <span className="kv-value mono">{share.data.longitude?.toFixed(6)}</span>
          </div>
          <div className="kv">
            <span className="kv-label">{t("viewsRemaining")}</span>
            <span className="kv-value">{share.data.viewsRemaining}</span>
          </div>
          {share.data.mapUri ? (
            <a
              className="btn btn-primary btn-block"
              style={{ marginTop: 16 }}
              href={share.data.mapUri}
              target="_blank"
              rel="noreferrer"
            >
              🗺️ {t("viewOnMap")}
            </a>
          ) : null}
        </Card>
      )}
    </div>
  );
}