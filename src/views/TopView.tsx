type Props = {
  onViewHands: () => void;
  onLogin: () => void;
  onLogoutRequest: () => void;
  isLoggedIn: boolean;
  username?: string;
  onRooms?: () => void;
};

function TopView({
  onViewHands,
  onLogin,
  onLogoutRequest,
  isLoggedIn,
  username,
  onRooms,
}: Props) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Dense Deck Poker</h1>
        <p className="text-base text-slate-300">
          {isLoggedIn ? `Welcome, ${username ?? ""}!` : "Guest"}
        </p>
      </div>
      {/* Online Rooms を最上段＆強調 */}
      {onRooms && (
        <button
          onClick={onRooms}
          className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-lg font-semibold shadow-lg transition-colors"
        >
          Online Rooms
        </button>
      )}
      <button
        onClick={onViewHands}
        className="px-5 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-sm font-semibold shadow transition-colors"
      >
        View Hands
      </button>
      {isLoggedIn ? (
        <button
          onClick={onLogoutRequest}
          className="px-5 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-sm font-semibold shadow transition-colors"
        >
          Logout
        </button>
      ) : (
        <button
          onClick={onLogin}
          className="px-5 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-sm font-semibold shadow transition-colors"
        >
          Login / Register
        </button>
      )}
    </div>
  );
}

export default TopView;
