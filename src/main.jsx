import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import {
  defaultState,
  loadHouseholdCache,
  saveHouseholdCache,
} from "./lib/storage.js";
import { fetchSyncState, putSyncState } from "./lib/syncApi.js";
import "./index.css";

const SYNC_DEBOUNCE_MS = 800;

function BootScreen({ message = "正在验证登录状态…" }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f5f6f8] text-sm text-[#666]">
      {message}
    </div>
  );
}

function AppShell() {
  const { token, user, logout } = useAuth();
  const householdId = user?.householdId;
  const tokenRef = React.useRef(token);
  const readyRef = React.useRef(false);
  const skipSaveRef = React.useRef(true);
  const loadedHouseholdRef = React.useRef(null);

  const [state, setState] = React.useState(() => {
    const cached = loadHouseholdCache(householdId);
    return cached || null;
  });
  const [syncNotice, setSyncNotice] = React.useState("");

  React.useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // 仅在切换家庭账号时整页重载；换 token（如开管理员模式）不打断界面
  React.useEffect(() => {
    if (!householdId || !token) return;

    let cancelled = false;
    const householdChanged = loadedHouseholdRef.current !== householdId;

    async function syncFromCloud({ blocking }) {
      if (blocking) {
        readyRef.current = false;
        skipSaveRef.current = true;
        const cached = loadHouseholdCache(householdId);
        if (cached) {
          setState(cached);
        } else {
          setState(null);
        }
      }

      try {
        const payload = await fetchSyncState(tokenRef.current);
        if (cancelled) return;
        skipSaveRef.current = true;
        setState(payload.state);
        saveHouseholdCache(householdId, payload.state);
        setSyncNotice("");
        loadedHouseholdRef.current = householdId;
      } catch (error) {
        if (cancelled) return;
        if (error.status === 401 || error.status === 403) {
          logout();
          return;
        }
        const cached = loadHouseholdCache(householdId);
        if (cached) {
          skipSaveRef.current = true;
          setState(cached);
          setSyncNotice("云端暂不可用，已使用本机缓存");
          loadedHouseholdRef.current = householdId;
        } else if (blocking) {
          setState(structuredClone(defaultState));
          setSyncNotice(error.message || "云端同步失败，已使用空白数据");
          loadedHouseholdRef.current = householdId;
        }
      } finally {
        if (!cancelled) {
          readyRef.current = true;
        }
      }
    }

    void syncFromCloud({ blocking: householdChanged || state == null });

    return () => {
      cancelled = true;
    };
    // intentional: do not re-run on token change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, logout]);

  React.useEffect(() => {
    if (!state || !readyRef.current) return;

    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    saveHouseholdCache(householdId, state);
    const snapshot = state;
    const hid = householdId;

    const timer = window.setTimeout(() => {
      putSyncState(tokenRef.current, snapshot)
        .then(() => {
          setSyncNotice("");
        })
        .catch((error) => {
          if (error.status === 401 || error.status === 403) {
            logout();
            return;
          }
          setSyncNotice(error.message || "保存到云端失败，已缓存在本机");
        });
    }, SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [state, householdId, logout]);

  React.useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== "visible" || !tokenRef.current || !householdId) {
        return;
      }
      fetchSyncState(tokenRef.current)
        .then((payload) => {
          skipSaveRef.current = true;
          setState(payload.state);
          saveHouseholdCache(householdId, payload.state);
          setSyncNotice("");
        })
        .catch((error) => {
          if (error.status === 401 || error.status === 403) {
            logout();
          }
        });
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [householdId, logout]);

  if (!state) {
    return <BootScreen message="正在同步云端数据…" />;
  }

  return (
    <>
      {syncNotice ? (
        <div className="fixed left-1/2 top-3 z-[60] w-[min(92vw,22rem)] -translate-x-1/2 rounded-xl bg-[#fff8e6] px-3 py-2 text-center text-xs leading-5 text-[#996600] shadow-sm">
          {syncNotice}
        </div>
      ) : null}
      <App state={state} setState={setState} />
    </>
  );
}

function Gate() {
  const { booting, isAuthenticated } = useAuth();

  if (booting) return <BootScreen />;
  if (!isAuthenticated) return <AuthPage />;
  return <AppShell />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </React.StrictMode>
);
