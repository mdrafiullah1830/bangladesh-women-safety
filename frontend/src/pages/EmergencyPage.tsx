import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { ApiError, http } from "../lib/api";
import { getPosition, humanize, newIdempotencyKey } from "../lib/format";
import type { CreateEmergencyResponse, EmergencyPrivacyMode } from "../types";
import { Card, ErrorState, PageHeader } from "../components/ui";

const PRIVACY_MODES: EmergencyPrivacyMode[] = [
  "MAXIMUM_PRIVACY",
  "BALANCED",
  "SHARE_EXACT_LOCATION",
];

export function EmergencyPage() {
  const { t } = useI18n();
  const { show } = useToast();
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [addressText, setAddressText] = useState("");
  const [notifyTrustedContacts, setNotifyTrustedContacts] = useState(true);
  const [privacyMode, setPrivacyMode] = useState<EmergencyPrivacyMode>("BALANCED");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(
    null
  );
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = async () => {
    setLocating(true);
    const position = await getPosition();
    setLocating(false);
    if (!position) {
      show(t("locationUnavailable"), "error");
      return;
    }
    setCoords({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    });
    show(t("locationCaptured"), "success");
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await http.post<CreateEmergencyResponse>("/api/emergency", {
        description: description.trim() || undefined,
        addressText: addressText.trim() || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
        accuracyMeters: coords?.accuracy,
        locationSource: coords ? "GPS" : undefined,
        isEmergency: true,
        notifyTrustedContacts,
        privacyMode,
        idempotencyKey: newIdempotencyKey(),
        clientRecordedAt: new Date().toISOString(),
      });
      show(result.duplicate ? t("duplicateNotice") : t("emergencyCreated"), "success");
      navigate(`/incidents/${result.incident.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container section">
      <PageHeader title={`🆘 ${t("emergencyMode")}`} subtitle={t("emergencyDisclaimer")} />

      {error ? <ErrorState message={error} /> : null}

      <div className="grid grid-2">
        <Card title={t("reportIncident")}>
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label>{t("description")}</label>
              <textarea
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("description")}
              />
            </div>

            <div className="form-group">
              <label>
                {t("addressText")} <span className="muted">({t("optional")})</span>
              </label>
              <input
                className="form-control"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>{t("privacyMode")}</label>
              <select
                className="form-control"
                value={privacyMode}
                onChange={(e) => setPrivacyMode(e.target.value as EmergencyPrivacyMode)}
              >
                {PRIVACY_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {humanize(mode)}
                  </option>
                ))}
              </select>
            </div>

            <label className="checkbox-row" style={{ marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={notifyTrustedContacts}
                onChange={(e) => setNotifyTrustedContacts(e.target.checked)}
              />
              {t("notifyContacts")}
            </label>

            <button type="submit" className="btn btn-danger btn-lg btn-block" disabled={busy}>
              {busy ? t("sending") : `🆘 ${t("emergency")}`}
            </button>
          </form>
        </Card>

        <Card title={t("useMyLocation")}>
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={captureLocation}
            disabled={locating}
          >
            📍 {locating ? t("loading") : t("useMyLocation")}
          </button>

          {coords ? (
            <div style={{ marginTop: 16 }}>
              <div className="kv">
                <span className="kv-label">{t("latitude")}</span>
                <span className="kv-value mono">{coords.lat.toFixed(6)}</span>
              </div>
              <div className="kv">
                <span className="kv-label">{t("longitude")}</span>
                <span className="kv-value mono">{coords.lng.toFixed(6)}</span>
              </div>
              <div className="kv">
                <span className="kv-label">{t("distance")}</span>
                <span className="kv-value">±{Math.round(coords.accuracy)} m</span>
              </div>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 12 }}>
              {t("useLocationForNearby")}
            </p>
          )}

          <div className="warning-banner" style={{ marginTop: 16 }}>
            {t("emergencyDisclaimer")}
          </div>
        </Card>
      </div>
    </div>
  );
}