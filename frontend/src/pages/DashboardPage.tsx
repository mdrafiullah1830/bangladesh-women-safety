import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { fmtDate, humanize } from "../lib/format";
import type { IncidentOwnerView } from "../types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, statusTone } from "../components/ui";

export function DashboardPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const incidents = useAsync<IncidentOwnerView[]>(
    () => http.get<IncidentOwnerView[]>("/api/incidents?take=5"),
    []
  );

  const active = (incidents.data ?? []).filter(
    (incident) =>
      incident.status === "EMERGENCY_ACTIVE" ||
      incident.status === "OPEN" ||
      incident.status === "AWAITING_VERIFICATION"
  ).length;

  return (
    <div className="container section">
      <PageHeader
        title={`${t("greetings")}, ${user?.displayName ?? ""}`}
        subtitle={t("dashboardSubtitle")}
        actions={
          <Link to="/emergency" className="btn btn-danger">
            🆘 {t("emergency")}
          </Link>
        }
      />

      <div className="grid grid-4">
        <div className="stat-card">
          <div className="number">{user?.reputationScore ?? 0}</div>
          <div className="label">{t("reputation")}</div>
        </div>
        <div className="stat-card tone-success">
          <div className="number">{user?.verifiedReports ?? 0}</div>
          <div className="label">{t("verifiedReports")}</div>
        </div>
        <div className="stat-card tone-info">
          <div className="number">{user?.helpfulVotes ?? 0}</div>
          <div className="label">{t("helpfulVotes")}</div>
        </div>
        <div className="stat-card tone-danger">
          <div className="number">{active}</div>
          <div className="label">{t("openIncidents")}</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <Card title={`👤 ${t("profile")}`}>
          <div className="kv">
            <span className="kv-label">{t("role")}</span>
            <span className="kv-value">{humanize(user?.role)}</span>
          </div>
          <div className="kv">
            <span className="kv-label">{t("phone")}</span>
            <span className="kv-value">{user?.phoneNumber || "—"}</span>
          </div>
          <div className="kv">
            <span className="kv-label">{t("email")}</span>
            <span className="kv-value">{user?.email || "—"}</span>
          </div>
          <div className="kv">
            <span className="kv-label">{t("privacyMode")}</span>
            <span className="kv-value">{humanize(user?.defaultPrivacyMode)}</span>
          </div>
          <div className="kv">
            <span className="kv-label">{t("memberSince")}</span>
            <span className="kv-value">{fmtDate(user?.createdAt, false, lang)}</span>
          </div>
        </Card>

        <Card title={`🆘 ${t("quickActions")}`}>
          <div className="stack">
            <Link to="/emergency" className="btn btn-danger btn-block">
              {t("emergency")}
            </Link>
            <Link to="/contacts" className="btn btn-outline btn-block">
              {t("contacts")}
            </Link>
            <Link to="/trips" className="btn btn-outline btn-block">
              {t("trips")}
            </Link>
            <Link to="/shares" className="btn btn-outline btn-block">
              {t("liveLocation")}
            </Link>
            <Link to="/privacy-centre" className="btn btn-outline btn-block">
              {t("privacy")}
            </Link>
          </div>
        </Card>
      </div>

      <section style={{ marginTop: 24 }}>
        <Card
          title={t("incidents")}
          actions={
            <Link to="/incidents" className="link-button">
              {t("viewAll")}
            </Link>
          }
        >
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
                  <strong>{incident.incidentReference}</strong>
                  <div className="meta">{fmtDate(incident.createdAt, true, lang)}</div>
                </div>
                <Badge tone={statusTone(incident.status)}>{humanize(incident.status)}</Badge>
              </Link>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}