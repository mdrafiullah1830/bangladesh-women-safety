import { useState } from "react";
import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { ApiError, http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { fmtDate, humanize } from "../lib/format";
import type { TripView } from "../types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  statusTone,
} from "../components/ui";

export function TripsPage() {
  const { t, lang } = useI18n();
  const { show } = useToast();
  const trips = useAsync<TripView[]>(() => http.get<TripView[]>("/api/trips"), []);

  const [title, setTitle] = useState("");
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [expectedMinutes, setExpectedMinutes] = useState(45);
  const [checkInIntervalMinutes, setCheckInIntervalMinutes] = useState(15);
  const [transportMode, setTransportMode] = useState("");
  const [busy, setBusy] = useState(false);

  const fail = (err: unknown) =>
    show(err instanceof ApiError ? err.message : t("error"), "error");

  const createTrip = async () => {
    if (!title.trim() || !destinationText.trim()) {
      show(t("required"), "error");
      return;
    }
    setBusy(true);
    try {
      await http.post("/api/trips", {
        title: title.trim(),
        originText: originText.trim() || undefined,
        destinationText: destinationText.trim(),
        expectedMinutes,
        checkInIntervalMinutes,
        transportMode: transportMode.trim() || undefined,
      });
      setTitle("");
      setOriginText("");
      setDestinationText("");
      setTransportMode("");
      show(t("saved"), "success");
      trips.reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: "checkin" | "complete" | "cancel") => {
    try {
      await http.post(`/api/trips/${id}/${action}`, action === "checkin" ? {} : undefined);
      show(t("saved"), "success");
      trips.reload();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div className="container section">
      <PageHeader title={`🚕 ${t("trips")}`} subtitle={t("startTrip")} />

      <div className="grid grid-2">
        <Card title={t("startTrip")}>
          <div className="form-group">
            <label>{t("tripTitle")}</label>
            <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t("origin")}</label>
              <input
                className="form-control"
                value={originText}
                onChange={(e) => setOriginText(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t("destination")}</label>
              <input
                className="form-control"
                value={destinationText}
                onChange={(e) => setDestinationText(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t("expectedMinutes")}</label>
              <input
                className="form-control"
                type="number"
                min={5}
                max={600}
                value={expectedMinutes}
                onChange={(e) => setExpectedMinutes(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>{t("checkInInterval")}</label>
              <input
                className="form-control"
                type="number"
                min={5}
                max={120}
                value={checkInIntervalMinutes}
                onChange={(e) => setCheckInIntervalMinutes(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="form-group">
            <label>
              {t("transportMode")} <span className="muted">({t("optional")})</span>
            </label>
            <input
              className="form-control"
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-block" onClick={createTrip} disabled={busy}>
            {busy ? t("saving") : t("startTrip")}
          </button>
        </Card>

        <Card title={t("activeTrips")}>
          {trips.loading ? (
            <Spinner />
          ) : trips.error ? (
            <ErrorState message={trips.error} onRetry={trips.reload} />
          ) : (trips.data ?? []).length === 0 ? (
            <EmptyState hint={t("noTrips")} />
          ) : (
            (trips.data ?? []).map((trip) => (
              <div className="card" key={trip.id} style={{ marginBottom: 12 }}>
                <div className="flex-between">
                  <strong>{trip.title}</strong>
                  <Badge tone={statusTone(trip.status)}>{humanize(trip.status)}</Badge>
                </div>
                <p className="muted">
                  {trip.originText ? `${trip.originText} → ` : ""}
                  {trip.destinationText}
                </p>
                <div className="kv">
                  <span className="kv-label">{t("expectedArrival")}</span>
                  <span className="kv-value">{fmtDate(trip.expectedArrivalAt, true, lang)}</span>
                </div>
                <div className="kv">
                  <span className="kv-label">{t("lastCheckIn")}</span>
                  <span className="kv-value">{fmtDate(trip.lastCheckInAt, true, lang)}</span>
                </div>
                {trip.status === "ACTIVE" || trip.status === "AUTO_ESCALATED" ? (
                  <div className="flex" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-sm btn-primary" onClick={() => act(trip.id, "checkin")}>
                      ✅ {t("checkInNow")}
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => act(trip.id, "complete")}>
                      {t("arrivedSafely")}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => act(trip.id, "cancel")}>
                      {t("cancelTrip")}
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}