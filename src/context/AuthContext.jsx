import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  authLogin,
  authMe,
  authRegisterAdmin,
  authRegisterPatient,
  clearStoredToken,
  createInviteCode,
  fetchInviteCode,
  getStoredToken,
  getStoredUser,
  putAdminMode,
  setStoredToken,
  setStoredUser,
} from "../lib/authApi.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [booting, setBooting] = useState(() => {
    const stored = getStoredToken();
    // 有 token 且有本地用户缓存时，不必挡开屏
    return Boolean(stored) && !getStoredUser();
  });

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const applySession = useCallback((session) => {
    if (session?.token) {
      setStoredToken(session.token);
      setToken(session.token);
    }
    if (session?.user) {
      setStoredUser(session.user);
      setUser(session.user);
    }
    return session;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const stored = getStoredToken();
    if (!stored) {
      setBooting(false);
      setUser(null);
      return undefined;
    }

    async function refreshSession() {
      try {
        const result = await authMe(stored);
        if (cancelled) return;
        setToken(stored);
        setStoredUser(result.user);
        setUser(result.user);
      } catch (error) {
        if (cancelled) return;
        const fatal =
          error?.status === 401 ||
          error?.status === 403 ||
          !getStoredUser();
        if (fatal) {
          clearStoredToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    void refreshSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async ({ username, password, role }) => {
      const session = await authLogin({ username, password, role });
      return applySession(session);
    },
    [applySession]
  );

  const registerPatient = useCallback(
    async ({ username, password }) => {
      const session = await authRegisterPatient({ username, password });
      return applySession(session);
    },
    [applySession]
  );

  const registerAdmin = useCallback(
    async ({ username, password, inviteCode }) => {
      const session = await authRegisterAdmin({
        username,
        password,
        inviteCode,
      });
      return applySession(session);
    },
    [applySession]
  );

  const setAdminModeEnabled = useCallback(
    async (enabled) => {
      if (!token) throw new Error("未登录");
      const result = await putAdminMode(token, enabled);
      applySession(result);
      return result;
    },
    [token, applySession]
  );

  const loadInviteCode = useCallback(async () => {
    if (!token) throw new Error("未登录");
    return fetchInviteCode(token);
  }, [token]);

  const regenerateInviteCode = useCallback(async () => {
    if (!token) throw new Error("未登录");
    return createInviteCode(token);
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      booting,
      isAuthenticated: Boolean(token && user),
      role: user?.role || null,
      householdId: user?.householdId || null,
      patientNickname: user?.patientNickname || null,
      login,
      logout,
      registerPatient,
      registerAdmin,
      setAdminModeEnabled,
      loadInviteCode,
      regenerateInviteCode,
    }),
    [
      token,
      user,
      booting,
      login,
      logout,
      registerPatient,
      registerAdmin,
      setAdminModeEnabled,
      loadInviteCode,
      regenerateInviteCode,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
