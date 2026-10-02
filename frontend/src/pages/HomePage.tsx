import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { useAsync } from "../lib/hooks";
import { http } from "../lib/api";
import type { EmergencyNumber } from "../types";
import { Card, ErrorState, SectionHeader, Spinner } from "../components/ui";

export function HomePage() {
  const { t, lang } = useI18n();
  const { authenticated } = useAuth();
  const numbers = useAsync<EmergencyNumber[]>(
    () => http.get<EmergencyNumber[]>(`/api/directory/numbers?lang=${lang}`),
    [lang]
  );

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>{t("heroTitle")}</h1>
          <p className="subtitle">{t("heroSubtitle")}</p>
          <p className="bn subtitle">বাংলাদেশ নারী নিরাপত্তা প্ল্যাটফর্ম</p>
          <div className="hero-actions">
            <Link
              to={authenticated ? "/emergency" : "/login"}
              className="sos-btn"
              style={{ textDecoration: "none" }}
            >
              <span className="sos-icon">🆘</span>
              {t("heroEmergency")}
              <span className="sos-sub">SOS</span>
            </Link>
            <div className="stack" style={{ justifyContent: "center" }}>
              <Link to="/directory" className="btn btn-white btn-lg">
                {t("heroBrowse")}
              </Link>
              {!authenticated ? (
                <Link to="/register" className="btn btn-outline btn-lg btn-on-dark">
                  {t("createAccount")}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="warning-banner">{t("emergencyDisclaimer")}</div>

          <div style={{ marginTop: 32 }}>
            <SectionHeader title={t("emergencyNumbers")} subtitle={t("all")} />
            {numbers.loading ? (
              <Spinner />
            ) : numbers.error ? (
              <ErrorState message={numbers.error} onRetry={numbers.reload} />
            ) : (
              <div className="grid grid-2">
                {(numbers.data ?? []).map((n) => (
                  <div className="em-card" key={n.id}>
                    <div className="info">
                      <h3>📞 {n.service}</h3>
                      <p className="bn">{n.serviceBn}</p>
                      {n.note ? <p className="meta muted">{n.note}</p> : null}
                    </div>
                    <a className="dial" href={n.dialUri || `tel:${n.number}`}>
                      {n.number}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 48 }}>
            <SectionHeader title={t("quickActions")} />
            <div className="grid grid-3">
              <Link to="/directory" className="card">
                <div className="card-title">🏥 {t("viewDirectory")}</div>
                <p className="muted">{t("safePlaces")}</p>
              </Link>
              <Link to="/safety" className="card">
                <div className="card-title">🛡️ {t("viewTips")}</div>
                <p className="muted">{t("tips")}</p>
              </Link>
              <Link to="/stats" className="card">
                <div className="card-title">📊 {t("viewStats")}</div>
                <p className="muted">{t("stats")}</p>
              </Link>
              <Link to="/privacy" className="card">
                <div className="card-title">🔒 {t("viewPrivacy")}</div>
                <p className="muted">{t("privacy")}</p>
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 48 }}>
            <Card title={`🔐 ${t("privacy")}`}>
              <p className="muted">
                Statistics are suppressed below a minimum aggregation threshold; individual
                locations and identities are never published.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}