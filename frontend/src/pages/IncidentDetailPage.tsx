import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { ApiError, http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { fmtBytes, fmtDate, humanize } from "../lib/format";
import type {
  EvidenceView,
  IncidentDetail,
  IncidentLocationPoint,
  ReferralCreateResponse,
  ReferralView,
} from "../types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  KeyValue,
  PageHeader,
  Spinner,
  statusTone,
} from "../components/ui";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

export function IncidentDetailPage() {
  const { t, lang } = useI18n();
  const { show } = useToast();
  const navigate = useNavigate();
  const { id = "" } = useParams();

  const detail = useAsync<IncidentDetail>(
    () => http.get<IncidentDetail>(`/api/incidents/${id}/detail`),
    [id]
  );
  const locations = useAsync<IncidentLocationPoint[]>(
    () => http.get<IncidentLocationPoint[]>(`/api/incidents/${id}/locations`),
    [id]
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const [evidence, setEvidence] = useState<EvidenceView[]>([]);
  const [caption, setCaption] = useState("");
  const [stationName, setStationName] = useState("");
  const [referralNotes, setReferralNotes] = useState("");
  const [referral, setReferral] = useState<ReferralView | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (detail.data) {
      setEvidence(detail.data.evidence ?? []);
      setReferral(detail.data.referral ?? null);
    }
  }, [detail.data]);

  const fail = (err: unknown) =>
    show(err instanceof ApiError ? err.message : t("error"), "error");

  const uploadEvidence = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      show(t("required"), "error");
      return;
    }
    if (file.size > 6_000_000) {
      show("Maximum evidence size is 6 MB", "error");
      return;
    }
    setBusy(true);
    try {
      const base64 = await readAsDataUrl(file);
      const created = await http.post<EvidenceView>(`/api/incidents/${id}/evidence`, {
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        base64,
        caption: caption.trim() || undefined,
      });
      setEvidence((prev) => [created, ...prev]);
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      show(t("saved"), "success");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const cancelIncident = async () => {
    setBusy(true);
    try {
      await http.post(`/api/emergency/${id}/cancel`, { reason: cancelReason.trim() || undefined });
      show(t("saved"), "success");
      detail.reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const createReferral = async () => {
    if (!stationName.trim()) {
      show(t("required"), "error");
      return;
    }
    setBusy(true);
    try {
      const result = await http.post<ReferralCreateResponse>(`/api/incidents/${id}/referral`, {
        stationName: stationName.trim(),
        notes: referralNotes.trim() || undefined,
        submit: true,
      });
      show(`${t("reference")}: ${result.reference}`, "success");
      setStationName("");
      setReferralNotes("");
      detail.reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  if (detail.loading) return <div className="container section"><Spinner /></div>;
  if (detail.error || !detail.data)
    return (
      <div className="container section">
        <ErrorState message={detail.error ?? t("notFoundTitle")} onRetry={detail.reload} />
      </div>
    );

  const incident = detail.data;

  return (
    <div className="container section">
      <PageHeader
        title={`${incident.isEmergency ? "🆘 " : "📋 "}${incident.reference}`}
        subtitle={humanize(incident.category)}
        actions={
          <button className="btn btn-ghost" onClick={() => navigate("/incidents")}>
            {t("goBack")}
          </button>
        }
      />

      <div className="grid grid-2">
        <Card title={t("report")}>
          <div className="flex" style={{ gap: 6, marginBottom: 12 }}>
            <Badge tone={statusTone(incident.status)}>{humanize(incident.status)}</Badge>
            <Badge tone={statusTone(incident.verificationStatus)}>
              {humanize(incident.verificationStatus)}
            </Badge>
          </div>
          <KeyValue label={t("category")}>{humanize(incident.category)}</KeyValue>
          <KeyValue label={t("district")}>{incident.districtName || "—"}</KeyValue>
          <KeyValue label={t("addressText")}>{incident.addressText || "—"}</KeyValue>
          <KeyValue label={t("occurredAt")}>{fmtDate(incident.occurredAt, true, lang)}</KeyValue>
          <KeyValue label={t("created")}>{fmtDate(incident.createdAt, true, lang)}</KeyValue>
          {incident.description ? (
            <p className="muted" style={{ marginTop: 12 }}>
              {incident.description}
            </p>
          ) : null}

          {incident.status === "EMERGENCY_ACTIVE" || incident.status === "OPEN" ? (
            <div style={{ marginTop: 16 }}>
              <div className="form-group">
                <label>{t("cancelIncident")}</label>
                <input
                  className="form-control"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
              <button className="btn btn-danger" onClick={cancelIncident} disabled={busy}>
                {t("cancelIncident")}
              </button>
            </div>
          ) : null}
        </Card>

        <Card title={t("timeline")}>
          {(incident.timeline ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="timeline">
              {(incident.timeline ?? []).map((entry) => (
                <li key={entry.id}>
                  <strong>
                    {humanize(entry.from)} → {humanize(entry.to)}
                  </strong>
                  {entry.note ? <p className="muted">{entry.note}</p> : null}
                  <div className="meta">{fmtDate(entry.at, true, lang)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <Card title={t("addEvidence")}>
          <div className="form-group">
            <input className="form-control" type="file" ref={fileRef} />
          </div>
          <div className="form-group">
            <label>
              {t("description")} <span className="muted">({t("optional")})</span>
            </label>
            <input
              className="form-control"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={uploadEvidence} disabled={busy}>
            {busy ? t("saving") : t("addEvidence")}
          </button>

          <div style={{ marginTop: 16 }}>
            {evidence.length === 0 ? (
              <EmptyState />
            ) : (
              evidence.map((item) => (
                <div className="list-item" key={item.id}>
                  <div>
                    <strong>{item.fileName}</strong>
                    <div className="meta">
                      {fmtBytes(item.sizeBytes)} · {fmtDate(item.capturedAt, true, lang)}
                    </div>
                    {item.caption ? <p className="muted">{item.caption}</p> : null}
                  </div>
                  <Badge tone="muted">{item.visibility.replace(/_/g, " ")}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title={t("createReferral")}>
          {referral ? (
            <div style={{ marginBottom: 12 }}>
              <KeyValue label={t("reference")}>{referral.reference}</KeyValue>
              <KeyValue label={t("stationName")}>{referral.stationName}</KeyValue>
              <KeyValue label={t("status")}>
                <Badge tone={statusTone(referral.status)}>{humanize(referral.status)}</Badge>
              </KeyValue>
            </div>
          ) : null}
          <div className="form-group">
            <label>{t("stationName")}</label>
            <input
              className="form-control"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>
              {t("decisionNote")} <span className="muted">({t("optional")})</span>
            </label>
            <input
              className="form-control"
              value={referralNotes}
              onChange={(e) => setReferralNotes(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={createReferral} disabled={busy}>
            {t("createReferral")}
          </button>
        </Card>
      </div>

      <section style={{ marginTop: 24 }}>
        <Card title={t("locations")}>
          {locations.loading ? (
            <Spinner />
          ) : (locations.data ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("time")}</th>
                    <th>{t("latitude")}</th>
                    <th>{t("longitude")}</th>
                    <th>{t("distance")}</th>
                    <th>{t("dataSource")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(locations.data ?? []).slice(0, 50).map((point, index) => (
                    <tr key={index}>
                      <td>{fmtDate(point.recordedAt, true, lang)}</td>
                      <td className="mono">{point.latitude.toFixed(5)}</td>
                      <td className="mono">{point.longitude.toFixed(5)}</td>
                      <td>{point.accuracyLabel}</td>
                      <td>{point.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
