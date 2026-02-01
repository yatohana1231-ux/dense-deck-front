import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "../hooks/useAuth.js";

type SettingsPayload = {
  autoMuckWhenLosing: boolean;
  historyExcludePreflopFolds: boolean;
  stackDisplay: "chips" | "blinds";
};

type Props = {
  apiBase: string;
  user: AuthUser;
  settings: SettingsPayload | null;
  onSettingsSaved: (next: SettingsPayload) => void;
  onBack: () => void;
  onUserUpdated: () => void;
};

async function fetchJson(url: string, body?: any, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {}
    const error = new Error(`HTTP ${res.status}`);
    (error as any).payload = parsed ?? text;
    throw error;
  }
  if (!text) return null;
  return JSON.parse(text);
}

export default function SettingView({
  apiBase,
  user,
  settings,
  onSettingsSaved,
  onBack,
  onUserUpdated,
}: Props) {
  const [autoMuckWhenLosing, setAutoMuckWhenLosing] = useState(true);
  const [historyExcludePreflopFolds, setHistoryExcludePreflopFolds] = useState(false);
  const [stackDisplay, setStackDisplay] = useState<"chips" | "blinds">("blinds");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement | null>(null);

  const [username, setUsername] = useState(user.username);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setAutoMuckWhenLosing(settings.autoMuckWhenLosing);
    setHistoryExcludePreflopFolds(settings.historyExcludePreflopFolds);
    setStackDisplay(settings.stackDisplay);
  }, [settings]);

  const scrollTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveSettings = async () => {
    setSaving(true);
    setFieldErrors({});
    setBanner(null);
    try {
      const payload: SettingsPayload = {
        autoMuckWhenLosing,
        historyExcludePreflopFolds,
        stackDisplay,
      };
      const data = (await fetchJson(`${apiBase}/api/settings`, payload, "PUT")) as SettingsPayload;
      onSettingsSaved(data);
      setBanner({ type: "success", text: "更新成功" });
      scrollTop();
    } catch (e: any) {
      const payload = e?.payload;
      if (payload && typeof payload === "object") {
        setFieldErrors(payload);
      }
      setBanner({ type: "error", text: "更新失敗" });
      scrollTop();
    } finally {
      setSaving(false);
    }
  };

  const saveUsername = async () => {
    if (user.usernameChanged) return;
    setUsernameSaving(true);
    setUsernameError(null);
    try {
      await fetchJson(`${apiBase}/api/user/username`, { username }, "POST");
      onUserUpdated();
    } catch (e: any) {
      const payload = e?.payload;
      const msg = payload?.message ?? "Update failed";
      setUsernameError(msg);
    } finally {
      setUsernameSaving(false);
    }
  };

  const savePassword = async () => {
    setPasswordSaving(true);
    setPasswordError(null);
    try {
      await fetchJson(
        `${apiBase}/api/user/password`,
        {
          currentPassword,
          newPassword,
          confirmPassword,
        },
        "PUT"
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
    } catch (e: any) {
      const payload = e?.payload;
      if (payload && typeof payload === "object") {
        if (payload.currentPassword) setPasswordError("Current password is invalid");
        else if (payload.newPassword) setPasswordError("New password is too short");
        else if (payload.confirmPassword) setPasswordError("Password confirmation does not match");
        else setPasswordError("Update failed");
      } else {
        setPasswordError("Update failed");
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div ref={topRef} />
      <div className="w-full max-w-4xl flex items-center justify-between">
        <h1 className="text-2xl font-bold">Setting</h1>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Back
        </button>
      </div>

      {banner && (
        <div
          className={`w-full max-w-4xl px-4 py-2 rounded border text-sm ${
            banner.type === "success"
              ? "bg-emerald-900/40 border-emerald-500 text-emerald-200"
              : "bg-rose-900/40 border-rose-500 text-rose-200"
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="w-full max-w-4xl bg-slate-800/60 rounded-lg border border-slate-700 p-4 space-y-3">
        <div className="text-sm text-slate-300">Account</div>
        <div className="text-sm">Username: {user.username}</div>
        {!user.isGuest && <div className="text-sm">Email: {user.email ?? "-"}</div>}
      </div>

      <div className="w-full max-w-4xl bg-slate-800/60 rounded-lg border border-slate-700 p-4 space-y-4">
        <div className="text-sm font-semibold">Game Play</div>

        <div className="flex items-center justify-between">
          <label className="text-sm">Auto Muck when losing</label>
          <input
            type="checkbox"
            checked={autoMuckWhenLosing}
            onChange={(e) => setAutoMuckWhenLosing(e.target.checked)}
          />
        </div>
        {fieldErrors.autoMuckWhenLosing && (
          <div className="text-xs text-rose-400">内容を修正してください</div>
        )}

        <div className="flex flex-col gap-2">
          <div className="text-sm">Stack Display</div>
          <label className="text-xs text-slate-300 flex items-center gap-2">
            <input
              type="radio"
              name="stackDisplay"
              value="blinds"
              checked={stackDisplay === "blinds"}
              onChange={() => setStackDisplay("blinds")}
            />
            BB
          </label>
          <label className="text-xs text-slate-300 flex items-center gap-2">
            <input
              type="radio"
              name="stackDisplay"
              value="chips"
              checked={stackDisplay === "chips"}
              onChange={() => setStackDisplay("chips")}
            />
            Chips
          </label>
        </div>
        {fieldErrors.stackDisplay && (
          <div className="text-xs text-rose-400">内容を修正してください</div>
        )}
      </div>

      <div className="w-full max-w-4xl bg-slate-800/60 rounded-lg border border-slate-700 p-4 space-y-4">
        <div className="text-sm font-semibold">Hand History</div>
        <div className="flex items-center justify-between">
          <label className="text-sm">Exclude preflop folds</label>
          <input
            type="checkbox"
            checked={historyExcludePreflopFolds}
            onChange={(e) => setHistoryExcludePreflopFolds(e.target.checked)}
          />
        </div>
        {fieldErrors.historyExcludePreflopFolds && (
          <div className="text-xs text-rose-400">内容を修正してください</div>
        )}
      </div>

      <div className="w-full max-w-4xl bg-slate-800/60 rounded-lg border border-slate-700 p-4 space-y-4">
        <div className="text-sm font-semibold">User</div>

        <div className="flex flex-col gap-2">
          <label className="text-sm">Username change</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={user.usernameChanged}
            className={`px-3 py-2 rounded border text-sm ${
              user.usernameChanged
                ? "bg-slate-800 border-slate-700 text-slate-500"
                : "bg-slate-900 border-slate-700 text-slate-100"
            }`}
          />
          {usernameError && <div className="text-xs text-rose-400">{usernameError}</div>}
          <button
            onClick={saveUsername}
            disabled={user.usernameChanged || usernameSaving}
            className={`px-3 py-1.5 rounded text-sm font-semibold ${
              user.usernameChanged || usernameSaving
                ? "bg-slate-700 text-slate-400"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {user.usernameChanged ? "Change used" : "Save Username"}
          </button>
        </div>

        <div className="border-t border-slate-700 pt-4 flex flex-col gap-2">
          <label className="text-sm">Password change</label>
          <input
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            type="password"
            placeholder="Current password"
            className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-sm"
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            placeholder="New password"
            className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-sm"
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            placeholder="Confirm password"
            className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-sm"
          />
          {passwordError && <div className="text-xs text-rose-400">{passwordError}</div>}
          <button
            onClick={savePassword}
            disabled={passwordSaving}
            className={`px-3 py-1.5 rounded text-sm font-semibold ${
              passwordSaving
                ? "bg-slate-700 text-slate-400"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            Save Password
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className={`px-5 py-2 rounded text-sm font-semibold ${
            saving ? "bg-slate-700 text-slate-400" : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {saving ? "Saving..." : "保存"}
        </button>
      </div>
    </div>
  );
}
