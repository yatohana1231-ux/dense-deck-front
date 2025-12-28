import type { AuthUser } from "../hooks/useAuth.js";

type Props = {
  user: AuthUser;
  onBack: () => void;
  onLogout: () => void;
  onGotoRegister: () => void;
  onGotoLogin: () => void;
  onGotoUsernameChange: () => void;
};

export default function AccountView({
  user,
  onBack,
  onLogout,
  onGotoRegister,
  onGotoLogin,
  onGotoUsernameChange,
}: Props) {
  const isGuest = user.isGuest;
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="text-sm text-slate-300">{isGuest ? "Guest session" : "Registered user"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
          >
            Back
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-sm font-semibold"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="w-full max-w-xl space-y-4">
        <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700">
          <div className="text-sm text-slate-300">Username</div>
          <div className="text-lg font-semibold text-emerald-300">{user.username}</div>
          <div className="mt-2 flex gap-2 items-center">
            <button
              onClick={onGotoUsernameChange}
              disabled={user.usernameChanged}
              className={`px-3 py-1.5 rounded text-sm font-semibold ${
                user.usernameChanged
                  ? "bg-slate-700 text-slate-400"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {user.usernameChanged ? "Change used" : "Change username"}
            </button>
            {user.usernameChanged && (
              <span className="text-xs text-slate-400">Username change already used</span>
            )}
          </div>
        </div>

        {!isGuest ? (
          <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700 space-y-2">
            <div className="text-sm text-slate-300">Email</div>
            <div className="text-sm text-slate-100">{user.email ?? "-"}</div>
          </div>
        ) : (
          <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700 space-y-2">
            <div className="text-sm text-slate-300">Upgrade account</div>
            <div className="text-xs text-slate-400">Register to keep your history across sessions.</div>
            <div className="flex gap-2">
              <button
                onClick={onGotoRegister}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
              >
                Register
              </button>
              <button
                onClick={onGotoLogin}
                className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
              >
                Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

