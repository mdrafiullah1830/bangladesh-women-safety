import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { fmtDate, humanize } from "../lib/format";
import type { IncidentOwnerView } from "../types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  statusTone,
} from "../components/ui";

export function IncidentsPage() {
  const { t, lang } = useI18n();
  const incidents = useAsync<IncidentOwnerView[]>(
    () => http.get<IncidentOwnerView[]>("/api/incidents?take=100"),
    []
  );

  return (
    <div className="container section">
      <PageHeader
        title={`📋 ${t("incidents")}`}
        subtitle={t("dashboardSubtitle")}
        actions={
          <Link to="/emergency" className="btn btn-danger">
            🆘 {t("emergency")}
          </Link>
        }
      />

      <Card>
        {incidents.loading ? (
          <Spinner />
        ) : incidents.error ? (
          <ErrorState message={incidents.error} onRetry={incidents.reload} />
        ) : (incidents.data ?? []).length === 0 ? (
          <EmptyState hint={t("reportIncident")} />
        ) : (
          (incidents.data ?? []).map((incident) => (
            <Link
              to={`/incidents/${incident.id}`}
              className="list-item"
              key={incident.id}
              style={{ color: "inherit" }}
            >
              <div>
                <strong>
                  {incident.isEmergency ? "🆘 " : ""}
                  {incident.incidentReference}
                </strong>
                <div className="meta">
                  {fmtDate(incident.createdAt, true, lang)}
                  {incident.addressText ? ` · ${incident.addressText}` : ""}
                </div>
              </div>
              <div className="flex" style={{ gap: 6 }}>
                <Badge tone={statusTone(incident.status)}>{humanize(incident.status)}</Badge>
                <Badge tone={statusTone(incident.verificationStatus)}>
                  {humanize(incident.verificationStatus)}
                </Badge>
              </div>
            </Link>
          ))
        )}
      </Card>
    </div>
  );
}