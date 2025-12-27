type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

function LogoutConfirmView({ onConfirm, onCancel }: Props) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-3xl font-bold mb-2">Logout</h1>
        <p className="text-slate-300">Are you sure you want to logout?</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold shadow transition-colors"
        >
          Logout
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-sm font-semibold shadow transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default LogoutConfirmView;
