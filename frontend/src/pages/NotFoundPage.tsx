import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { EmptyState } from "../components/ui";

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="container section">
      <EmptyState title={t("notFoundTitle")} hint={t("notFoundText")} />
      <div className="flex-center">
        <Link className="btn btn-primary" to="/">
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}