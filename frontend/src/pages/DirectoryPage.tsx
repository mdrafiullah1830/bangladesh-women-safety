import { useMemo, useState } from "react";
import { http, qs } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { fmtDistance, getPosition, humanize } from "../lib/format";
import type { DirectoryCategory, DirectoryEntry, Division, NearbyEntry } from "../types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";

const CATEGORIES: DirectoryCategory[] = [
  "POLICE",
  "HOSPITAL",
  "FIRE_SERVICE",
  "AMBULANCE",
  "LEGAL_AID",
  "COUNSELING",
  "SAFE_PLACE",
  "SHELTER",
  "ONE_STOP",
  "GOVERNMENT",
];

export function DirectoryPage() {
  const { t, lang } = useI18n();
  const { show } = useToast();
  const [category, setCategory] = useState<DirectoryCategory | "">("");
  const [query, setQuery] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [nearby, setNearby] = useState<NearbyEntry[] | null>(null);
  const [locating, setLocating] = useState(false);

  const divisions = useAsync<Division[]>(() => http.get<Division[]>("/api/districts"), []);

  const entries = useAsync<DirectoryEntry[]>(
    () =>
      http.get<DirectoryEntry[]>(
        `/api/directory${qs({ category, q: query, districtId, lang, take: 300 })}`
      ),
    [category, query, districtId, lang]
  );

  const districts = useMemo(
    () =>
      (divisions.data ?? []).flatMap((division) =>
        division.districts.map((d) => ({ id: d.id, name: lang === "bn" ? d.nameBn : d.nameEn }))
      ),
    [divisions.data, lang]
  );

  const findNearby = async () => {
    setLocating(true);
    const position = await getPosition();
    setLocating(false);
    if (!position) {
      show(t("locationUnavailable"), "error");
      return;
    }
    try {
      const rows = await http.get<NearbyEntry[]>(
        `/api/directory/nearby${qs({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          lang,
          limit: 12,
        })}`
      );
      setNearby(rows);
    } catch {
      show(t("error"), "error");
    }
  };

  return (
    <div className="container section">
      <PageHeader
        title={`🏥 ${t("directory")}`}
        subtitle={t("emergencyNumbers")}
        actions={
          <button className="btn btn-outline" onClick={findNearby} disabled={locating}>
            📍 {locating ? t("loading") : t("nearbyServices")}
          </button>
        }
      />

      {nearby ? (
        <Card
          title={t("nearbyServices")}
          actions={
            <button className="link-button" onClick={() => setNearby(null)}>
              {t("close")}
            </button>
          }
        >
          {nearby.length === 0 ? (
            <EmptyState />
          ) : (
            nearby.map((row) => (
              <div className="list-item" key={row.id}>
                <div>
                  <strong>{row.name}</strong>
                  <div className="meta">
                    {humanize(row.category)} · {fmtDistance(row.distanceMeters)}
                    {row.is24x7 ? ` · ${t("open24x7")}` : ""}
                  </div>
                </div>
                <div className="flex" style={{ gap: 8 }}>
                  <a
                    className="btn btn-sm btn-outline"
                    href={row.mapUri}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("viewOnMap")}
                  </a>
                  {row.dialUri ? (
                    <a className="btn btn-sm btn-primary" href={row.dialUri}>
                      {t("call")}
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </Card>
      ) : null}

      <Card className="filters">
        <div className="form-row">
          <div className="form-group">
            <label>{t("search")}</label>
            <input
              className="form-control"
              placeholder={t("searchDirectory")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>{t("category")}</label>
            <select
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value as DirectoryCategory | "")}
            >
              <option value="">{t("categoryAll")}</option>
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t("district")}</label>
            <select
              className="form-control"
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
            >
              <option value="">{t("all")}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {entries.loading ? (
        <Spinner />
      ) : entries.error ? (
        <ErrorState message={entries.error} onRetry={entries.reload} />
      ) : (entries.data ?? []).length === 0 ? (
        <EmptyState title={t("noEntries")} />
      ) : (
        <div className="grid grid-2">
          {(entries.data ?? []).map((entry) => (
            <div className="card" key={entry.id}>
              <div className="flex-between">
                <strong>{entry.name}</strong>
                <div className="flex" style={{ gap: 6 }}>
                  {entry.isVerified ? <Badge tone="success">{t("verified")}</Badge> : null}
                  {entry.is24x7 ? <Badge tone="info">24/7</Badge> : null}
                </div>
              </div>
              <p className="muted" style={{ marginTop: 4 }}>
                {humanize(entry.category)}
                {entry.districtName ? ` · ${entry.districtName}` : ""}
              </p>
              {entry.address ? <p className="muted">{entry.address}</p> : null}
              <div className="flex" style={{ gap: 8, marginTop: 10 }}>
                {entry.dialUri ? (
                  <a className="btn btn-sm btn-primary" href={entry.dialUri}>
                    📞 {entry.phoneNumber}
                  </a>
                ) : null}
                {entry.latitude && entry.longitude ? (
                  <a
                    className="btn btn-sm btn-outline"
                    href={`https://www.openstreetmap.org/?mlat=${entry.latitude}&mlon=${entry.longitude}#map=16/${entry.latitude}/${entry.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("viewOnMap")}
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}