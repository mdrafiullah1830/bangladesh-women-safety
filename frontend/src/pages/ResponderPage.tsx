import { useState } from "react";
import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { ApiError, http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { fmtDate, humanize } from "../lib/format";
import type {
  ResponderAssignment,
  ResponderAssignmentStatus,
  ResponderAvailableIncident,
  ResponderStats,
} from "../types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  statusTone,
} from "../components/ui";

const FLOW: ResponderAssignmentStatus[] = [
  "ACCEPTED",
  "EN_ROUTE",
  "ON_SCENE",
  "COMPLETED",
  "CANCELLED",
];

export function ResponderPage() {
  const { t, lang } = useI18n();
  const { show } = useToast();

  const available = useAsync<ResponderAvailableIncident[]>(
    () => http.get("/api/responder/available"),
    []
  );
  const assignments = useAsync<ResponderAssignment[]>(
    () => http.get("/api/responder/assignments"),
    []
  );
  const stats = useAsync<ResponderStats>(() => http.get("/api/responder/stats"), []);

  const [busy, setBusy] = useState(false);
  const onDuty = Boolean(stats.data?.isOnDuty);

  const fail = (err: unknown) =>
    show(err instanceof ApiError ? err.message : t("error"), "error");

  const claim = async (id: string) => {
    setBusy(true);
    try {
      await http.post(`/api/responder/incidents/${id}/claim`);
      show(t("saved"), "success");
      available.reload();
      assignments.reload();
      stats.reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (assignmentId: string, status: ResponderAssignmentStatus) => {
    try {
      await http.post(`/api/responder/assignments/${assignmentId}/status`, { status });
      assignments.reload();
      stats.reload();
    } catch (err) {
      fail(err);
    }
  };

  const toggleDuty = async () => {
    try {
      await http.post("/api/responder/duty", !onDuty);
      show(t("saved"), "success");
      stats.reload();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div className="container section">
      <PageHeader
        title={`🚑 ${t("responderConsole")}`}
        subtitle={t("dutyStatus")}
        actions={
          <button className="btn btn-primary" onClick={toggleDuty}>
            {onDuty ? t("goOffDuty") : t("goOnDuty")}
          </button>
        }
      />

      <div className="grid grid-4">
        <div className="stat-card">
          <div className="number">{stats.data?.total ?? 0}</div>
          <div className="label">{t("total")}</div>
        </div>
        <div className="stat-card tone-warning">
          <div className="number">{stats.data?.active ?? 0}</div>
          <div className="label">{t("active")}</div>
        </div>
        <div className="stat-card tone-success">
          <div className="number">{stats.data?.completed ?? 0}</div>
          <div className="label">{t("completed")}</div>
        </div>
        <div className="stat-card">
          <div className="number">{onDuty ? "✅" : "⛔"}</div>
          <div className="label">{onDuty ? t("onDuty") : t("goOnDuty")}</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <Card title={t("availableIncidents")}>
          {available.loading ? (
            <Spinner />
          ) : available.error ? (
            <ErrorState message={available.error} onRetry={available.reload} />
          ) : (available.data ?? []).length === 0 ? (
            <EmptyState hint={t("noAvailable")} />
          ) : (
            (available.data ?? []).map((incident) => (
              <div className="list-item" key={incident.id}>
                <div>
                  <strong>
                    {incident.isEmergency ? "🆘 " : ""}
                    {incident.reference}
                  </strong>
                  <div className="meta">
                    {humanize(incident.category)}
                    {incident.districtName ? ` · ${incident.districtName}` : ""} ·{" "}
                    {incident.minutesAgo} {t("minutesAgo")}
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => claim(incident.id)}
                  disabled={busy}
                >
                  {t("claim")}
                </button>
              </div>
            ))
          )}
        </Card>

        <Card title={t("myAssignments")}>
          {assignments.loading ? (
            <Spinner />
          ) : assignments.error ? (
            <ErrorState message={assignments.error} onRetry={assignments.reload} />
          ) : (assignments.data ?? []).length === 0 ? (
            <EmptyState hint={t("noAssignments")} />
          ) : (
            (assignments.data ?? []).map((assignment) => (
              <div className="card" key={assignment.id} style={{ marginBottom: 12 }}>
                <div className="flex-between">
                  <strong>{assignment.reference || assignment.incidentId}</strong>
                  <Badge tone={statusTone(assignment.status)}>
                    {humanize(assignment.status)}
                  </Badge>
                </div>
                <div className="meta">
                  {humanize(assignment.category)}
                  {assignment.alertedAt ? ` · ${fmtDate(assignment.alertedAt, true, lang)}` : ""}
                </div>
                <div className="form-group" style={{ marginTop: 10 }}>
                  <label>{t("updateStatus")}</label>
                  <select
                    className="form-control"
                    value={assignment.status}
                    onChange={(e) =>
                      setStatus(assignment.id, e.target.value as ResponderAssignmentStatus)
                    }
                  >
                    <option value={assignment.status}>{humanize(assignment.status)}</option>
                    {FLOW.filter((status) => status !== assignment.status).map((status) => (
                      <option key={status} value={status}>
                        {humanize(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}