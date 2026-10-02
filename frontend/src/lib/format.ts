/* Women Safety BD — small formatting helpers shared across pages */

export function fmtDate(iso?: string | null, withTime = false, lang = "bn"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const locale = lang === "bn" ? "bn-BD" : "en-GB";
  return withTime
    ? d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
    : d.toLocaleDateString(locale, { dateStyle: "medium" });
}

export function fmtDistance(meters?: number | null): string {
  if (meters === null || meters === undefined) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function fmtBytes(bytes?: number | null): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/** Turns SCREAMING_SNAKE_CASE enum values into readable "Title Case" labels. */
export function humanize(value?: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function mapUri(lat?: number | null, lng?: number | null): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Reads the device's current position, resolving to null when unavailable/denied. */
export function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}
