import { useState } from "react";
import { http, qs } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { useI18n } from "../i18n";
import type { LawResource, TipsResponse } from "../types";
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";

export function SafetyPage() {
  const { t, lang } = useI18n();
  const [nightOnly, setNightOnly] = useState(false);

  const tips = useAsync<TipsResponse>(
    () => http.get<TipsResponse>(`/api/directory/tips${qs({ nightOnly, lang })}`),
    [nightOnly, lang]
  );
  const laws = useAsync<LawResource[]>(
    () => http.get<LawResource[]>(`/api/directory/laws${qs({ lang })}`),
    [lang]
  );

  return (
    <div className="container section">
      <PageHeader
        title={`🛡️ ${t("safety")}`}
        subtitle={t("tips")}
        actions={
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={nightOnly}
              onChange={(e) => setNightOnly(e.target.checked)}
            />
            {t("nightOnlyTips")}
          </label>
        }
      />

      <section>
        {tips.loading ? (
          <Spinner />
        ) : tips.error ? (
          <ErrorState message={tips.error} onRetry={tips.reload} />
        ) : (tips.data?.tips ?? []).length === 0 ? (
          <EmptyState title={t("noEntries")} />
        ) : (
          <div className="grid grid-2">
            {(tips.data?.tips ?? []).map((tip) => (
              <div className="card" key={tip.id}>
                <div className="flex-between">
                  <strong>{tip.title}</strong>
                  {tip.nightOnly ? <span className="chip">🌙 {t("night")}</span> : null}
                </div>
                <p className="muted" style={{ marginTop: 8 }}>
                  {tip.body}
                </p>
                <span className="chip" style={{ marginTop: 8 }}>
                  {tip.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 40 }}>
        <Card title={`⚖️ ${t("laws")}`}>
          {laws.loading ? (
            <Spinner />
          ) : laws.error ? (
            <ErrorState message={laws.error} onRetry={laws.reload} />
          ) : (laws.data ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            (laws.data ?? []).map((law) => (
              <div className="list-item" key={law.id}>
                <div>
                  <strong>{law.title}</strong>
                  <p className="muted">{law.summary}</p>
                  {law.lawReference ? <span className="chip">{law.lawReference}</span> : null}
                </div>
                <div className="flex" style={{ gap: 8 }}>
                  {law.dialUri ? (
                    <a className="btn btn-sm btn-primary" href={law.dialUri}>
                      {t("call")}
                    </a>
                  ) : null}
                  {law.website ? (
                    <a className="btn btn-sm btn-outline" href={law.website} target="_blank" rel="noreferrer">
                      {t("open")}
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}