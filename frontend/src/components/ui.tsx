import type { ReactNode } from "react";
import { useI18n } from "../i18n";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex-center spinner-wrap">
      <div className="spinner" />
      {label ? <span className="spinner-label">{label}</span> : null}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || actions) && (
        <header className="card-head">
          {title ? <h3 className="card-title">{title}</h3> : <span />}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function SectionHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="section-header">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ title, hint }: { title?: string; hint?: string }) {
  const { t } = useI18n();
  return (
    <div className="empty-state">
      <div className="empty-icon">🗂️</div>
      <p>{title ?? t("none")}</p>
      {hint ? <span className="muted">{hint}</span> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="error-state">
      <p>⚠️ {message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
          {t("retry")}
        </button>
      ) : null}
    </div>
  );
}

export type BadgeTone = "success" | "warning" | "danger" | "info" | "muted";

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/** Maps an incident/trip/etc. status string to a sensible badge tone. */
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "EMERGENCY_ACTIVE":
    case "REJECTED":
    case "AUTO_ESCALATED":
    case "REVOKED":
      return "danger";
    case "OPEN":
    case "PENDING_REVIEW":
    case "UNVERIFIED":
    case "AWAITING_VERIFICATION":
    case "ALERTED":
    case "ACTIVE":
      return "warning";
    case "VERIFIED":
    case "VERIFIED_CASE":
    case "OFFICIALLY_CONFIRMED":
    case "RESOLVED":
    case "COMPLETED":
    case "ACKNOWLEDGED":
      return "success";
    case "POLICE_REFERRED":
    case "SUBMITTED":
    case "EN_ROUTE":
    case "ON_SCENE":
    case "ACCEPTED":
      return "info";
    default:
      return "muted";
  }
}

export function KeyValue({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="kv">
      <span className="kv-label">{label}</span>
      <span className="kv-value">{children}</span>
    </div>
  );
}