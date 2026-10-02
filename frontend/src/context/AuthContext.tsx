import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { http, onUnauthorized } from "../lib/api";
import { clearSession, getStoredProfile, isAuthenticated, persistSession } from "../lib/session";
import type { AuthResult, OtpPurpose, UserProfileView, UserRole } from "../types";

export interface RegisterPayload {
  displayName: string;
  phoneNumber?: string;
  email?: string;
  password: string;
  districtId?: string;
  language?: string;
}

export interface ProfileUpdatePayload {
  displayName?: string;
  districtId?: string;
  preferredLanguage?: string;
  defaultPrivacyMode?: string;
  currentPassword?: string;
  newPassword?: string;
}

interface AuthValue {
  user: UserProfileView | null;
  authenticated: boolean;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  sendOtp: (destination: string, purpose?: OtpPurpose) => Promise<AuthResult>;
  verifyOtp: (destination: string, code: string, purpose?: OtpPurpose) => Promise<AuthResult>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<UserProfileView>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfileView | null>(() => getStoredProfile());
  const [loading, setLoading] = useState(() => isAuthenticated());

  const apply = useCallback((result: AuthResult) => {
    persistSession(result.tokens?.accessToken, result.tokens?.refreshToken, result.user);
    if (result.user) setUser(result.user);
    return result;
  }, []);

  // A dead session (expired + unrefreshable) drops the user back on the login screen.
  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
      navigate("/login");
    });
    return () => onUnauthorized(null);
  }, [navigate]);

  // Hydrate the live profile once per authenticated app load.
  useEffect(() => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    http
      .get<UserProfileView>("/api/auth/profile")
      .then((profile) => {
        if (cancelled) return;
        setUser(profile);
        persistSession(undefined, undefined, profile);
      })
      .catch(() => {
        /* keep the stored profile; the api layer handles 401s */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const result = await http.post<AuthResult>("/api/auth/login", { identifier, password });
      return apply(result);
    },
    [apply]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const result = await http.post<AuthResult>("/api/auth/register", {
        language: "bn",
        ...payload,
      });
      return apply(result);
    },
    [apply]
  );

  const sendOtp = useCallback(
    (destination: string, purpose: OtpPurpose = "LOGIN") =>
      http.post<AuthResult>("/api/auth/otp/send", { destination, purpose }),
    []
  );

  const verifyOtp = useCallback(
    async (destination: string, code: string, purpose: OtpPurpose = "LOGIN") => {
      const result = await http.post<AuthResult>("/api/auth/otp/verify", {
        destination,
        code,
        purpose,
      });
      return apply(result);
    },
    [apply]
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const refreshProfile = useCallback(async () => {
    const profile = await http.get<UserProfileView>("/api/auth/profile");
    setUser(profile);
    persistSession(undefined, undefined, profile);
  }, []);

  const updateProfile = useCallback(async (payload: ProfileUpdatePayload) => {
    const profile = await http.put<UserProfileView>("/api/auth/profile", payload);
    setUser(profile);
    persistSession(undefined, undefined, profile);
    return profile;
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => Boolean(user && roles.includes(user.role)),
    [user]
  );

  const value = useMemo<AuthValue>(
    () => ({
      user,
      authenticated: Boolean(user),
      loading,
      login,
      register,
      sendOtp,
      verifyOtp,
      logout,
      refreshProfile,
      updateProfile,
      hasRole,
    }),
    [
      user,
      loading,
      login,
      register,
      sendOtp,
      verifyOtp,
      logout,
      refreshProfile,
      updateProfile,
      hasRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}