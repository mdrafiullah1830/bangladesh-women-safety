import type { UserProfileView } from "../types";

/**
 * Session storage. Keys are intentionally identical to the legacy `wwwroot` SPA so a user
 * moving between the two builds keeps their session and installation identity.
 */
const KEYS = {
  access: "token",
  refresh: "refresh",
  profile: "profile",
  installation: "installationId",
} as const;

export function getInstallationId(): string {
  let id = localStorage.getItem(KEYS.installation);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `inst-${Date.now()}`;
    localStorage.setItem(KEYS.installation, id);
  }
  return id;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(KEYS.access);
}

export function getRefreshToken(): string {
  return localStorage.getItem(KEYS.refresh) || "";
}

export function getStoredProfile(): UserProfileView | null {
  const raw = localStorage.getItem(KEYS.profile);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfileView;
  } catch {
    return null;
  }
}

export function persistSession(
  accessToken?: string | null,
  refreshToken?: string | null,
  user?: UserProfileView | null
): void {
  if (accessToken) localStorage.setItem(KEYS.access, accessToken);
  if (refreshToken) localStorage.setItem(KEYS.refresh, refreshToken);
  if (user) localStorage.setItem(KEYS.profile, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(KEYS.access);
  localStorage.removeItem(KEYS.refresh);
  localStorage.removeItem(KEYS.profile);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
