import { useMemo, useState } from "react";
import { http, qs } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { useI18n } from "../i18n";
import type { Division, PublicStatsEnvelope, TrendResponse } from "../types";
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function StatsPage() {
  const { t, lang } = useI18n();
  const [divisionId, setDivisionId] = useState("");

  const divisions = useAsync<Division[]>(() => http.get<Division[]>("/api/districts"), []);
  const stats = useAsync<PublicStatsEnvelope>(
    () => http.get<PublicStatsEnvelope>(`/api/statistics${qs({ lang, divisionId })}`),
    [lang, divisionId]
  );
  const trend = useAsync<TrendResponse>(
    () => http.get<TrendResponse>(`/api/public/trend${qs({ lang, months: 6 })}`),
    [lang]
  );

  const districts = useMemo(
    () => (stats.data?.districts ?? []).filter((d) => !d.suppressed),
    [stats.data]
  );

  const totals = useMemo(
    () => ({
      reported: sum(districts.map((d) => d.reportedIncidents)),
      emergency: sum(districts.map((d) => d.emergencyActivations)),
      verified: sum(districts.map((d) => d.verifiedCases)),
      referred: sum(districts.map((d) => d.policeReferred)),
      resolved: sum(districts.map((d) => d.resolvedCases)),
      pending: sum(districts.map((d) => d.pendingCases)),
    }),
    [districts]
  );

  return (
    <div className="container section">
      <PageHeader
        title={`📊 ${t("stats")}`}
        subtitle={t("nationalStats")}
        actions={
          <select
            className="form-control"
            value={divisionId}
            style={{ maxWidth: 240 }}
            onChange={(e) => setDivisionId(e.target.value)}
          >
            <option value="">{t("nationalStats")}</option>
            {(divisions.data ?? []).map((division) => (
              <option key={division.id} value={division.id}>
                {lang === "bn" ? division.nameBn : division.nameEn}
              </option>
            ))}
          </select>
        }
      />

      {stats.loading ? (
        <Spinner />
      ) : stats.error ? (
        <ErrorState message={stats.error} onRetry={stats.reload} />
      ) : (
        <>
          <div className="grid grid-4">
            <div className="stat-card">
              <div className="number">{totals.reported}</div>
              <div className="label">{t("reportedLabel")}</div>
            </div>
            <div className="stat-card tone-danger">
              <div className="number">{totals.emergency}</div>
              <div className="label">{t("emergencyLabel")}</div>
            </div>
            <div className="stat-card tone-success">
              <div className="number">{totals.verified}</div>
              <div className="label">{t("verifiedLabel")}</div>
            </div>
            <div className="stat-card tone-info">
              <div className="number">{totals.referred}</div>
              <div className="label">{t("policeReferredLabel")}</div>
            </div>
          </div>

          <section style={{ marginTop: 32 }}>
            <Card title={t("monthTrend")}>
              {(trend.data?.buckets ?? []).length === 0 ? (
                <EmptyState hint={trend.data?.note} />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("date")}</th>
                        <th>{t("reportedLabel")}</th>
                        <th>{t("emergencyLabel")}</th>
                        <th>{t("verifiedLabel")}</th>
                        <th>{t("policeReferredLabel")}</th>
                        <th>{t("resolvedLabel")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(trend.data?.buckets ?? []).map((bucket) => (
                        <tr key={bucket.month}>
                          <td>{bucket.month}</td>
                          <td>{bucket.reported}</td>
                          <td>{bucket.emergency}</td>
                          <td>{bucket.verified}</td>
                          <td>{bucket.referred}</td>
                          <td>{bucket.resolved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>

          <section style={{ marginTop: 24 }}>
            <Card title={t("byCategory")}>
              {(trend.data?.categories ?? []).length === 0 ? (
                <EmptyState />
              ) : (
                (trend.data?.categories ?? []).map((row) => (
                  <div className="kv" key={row.category}>
                    <span className="kv-label">{row.category.replace(/_/g, " ")}</span>
                    <span className="kv-value">{row.count}</span>
                  </div>
                ))
              )}
            </Card>
          </section>

          {stats.data?.definitions?.length ? (
            <section style={{ marginTop: 24 }}>
              <Card title={t("definitionsTitle")}>
                {stats.data.definitions.map((definition) => (
                  <div className="kv" key={definition.key}>
                    <span className="kv-label">
                      {lang === "bn" ? definition.labelBn : definition.labelEn}
                    </span>
                    <span className="kv-value muted">{definition.meaning}</span>
                  </div>
                ))}
              </Card>
            </section>
          ) : null}

          <p className="muted" style={{ marginTop: 16 }}>
            {t("suppressedNote")}
          </p>
        </>
      )}
    </div>
  );
}