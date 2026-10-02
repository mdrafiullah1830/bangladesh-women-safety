import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { useUnreadCount } from "../lib/useUnreadCount";

function linkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? "nav-item active" : "nav-item";
}

export function Navbar() {
  const { t, lang, toggle } = useI18n();
  const { authenticated, user, logout, hasRole } = useAuth();
  const unread = useUnreadCount();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <nav className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="nav-brand" onClick={close}>
          <span className="icon">🛡️</span> {t("brand")}
        </Link>

        <button
          className="nav-burger"
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>

        <div className={`nav-links${open ? " open" : ""}`}>
          {authenticated ? (
            <>
              <NavLink to="/dashboard" className={linkClass} onClick={close}>
                {t("dashboard")}
              </NavLink>
              <NavLink to="/emergency" className={linkClass} onClick={close}>
                {t("emergency")}
              </NavLink>
              <NavLink to="/incidents" className={linkClass} onClick={close}>
                {t("incidents")}
              </NavLink>
              <NavLink to="/contacts" className={linkClass} onClick={close}>
                {t("contacts")}
              </NavLink>
              <NavLink to="/trips" className={linkClass} onClick={close}>
                {t("trips")}
              </NavLink>
              <NavLink to="/shares" className={linkClass} onClick={close}>
                {t("liveLocation")}
              </NavLink>
              <NavLink to="/directory" className={linkClass} onClick={close}>
                {t("directory")}
              </NavLink>
              {hasRole("RESPONDER", "MODERATOR", "ADMIN") && (
                <NavLink to="/responder" className={linkClass} onClick={close}>
                  {t("responder")}
                </NavLink>
              )}
              {hasRole("MODERATOR", "ADMIN") && (
                <NavLink to="/moderation" className={linkClass} onClick={close}>
                  {t("moderation")}
                </NavLink>
              )}
              <NavLink to="/notifications" className={linkClass} onClick={close}>
                {t("notifications")}
                {unread > 0 ? <span className="nav-badge">{unread}</span> : null}
              </NavLink>
              <NavLink to="/profile" className={linkClass} onClick={close}>
                {user?.displayName || t("profile")}
              </NavLink>
              <button
                type="button"
                className="nav-item nav-logout"
                onClick={() => {
                  close();
                  logout();
                }}
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/directory" className={linkClass} onClick={close}>
                {t("directory")}
              </NavLink>
              <NavLink to="/safety" className={linkClass} onClick={close}>
                {t("safety")}
              </NavLink>
              <NavLink to="/stats" className={linkClass} onClick={close}>
                {t("stats")}
              </NavLink>
              <NavLink to="/login" className={linkClass} onClick={close}>
                {t("login")}
              </NavLink>
              <NavLink to="/register" className={linkClass} onClick={close}>
                {t("register")}
              </NavLink>
            </>
          )}

          <button className="lang-toggle" type="button" onClick={toggle} title={t("language")}>
            {lang === "bn" ? "EN" : "বাংলা"}
          </button>
        </div>
      </div>
    </nav>
  );
}