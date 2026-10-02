import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="container">
        <div className="grid grid-3">
          <div>
            <h4>🛡️ {t("brand")}</h4>
            <p className="bn">বাংলাদেশ নারী নিরাপত্তা প্ল্যাটফর্ম</p>
            <p className="footer-note">
              Emergency reporting, trusted contacts and offline-first safety tools.
            </p>
          </div>
          <div>
            <h4>{t("emergencyNumbers")}</h4>
            <p>🚑 999</p>
            <p>📞 109</p>
            <p>💚 106</p>
            <p>⚖️ 16432</p>
          </div>
          <div>
            <h4>{t("quickActions")}</h4>
            <p>
              <Link to="/directory">{t("directory")}</Link>
            </p>
            <p>
              <Link to="/safety">{t("tips")}</Link>
            </p>
            <p>
              <Link to="/stats">{t("stats")}</Link>
            </p>
            <p>
              <Link to="/privacy">{t("privacy")}</Link>
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} Women Safety Bangladesh. This platform never contacts
            emergency services on your behalf.
          </p>
        </div>
      </div>
    </footer>
  );
}