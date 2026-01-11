import { useEffect, useState } from "react";
import TopView from "./views/TopView.js";
import HistoryView from "./views/HistoryView.js";
import AccountView from "./views/AccountView.js";
import LoginView from "./views/LoginView.js";
import RegisterView from "./views/RegisterView.js";
import UsernameChangeView from "./views/UsernameChangeView.js";
import ResetRequestView from "./views/ResetRequestView.js";
import ResetFormView from "./views/ResetFormView.js";
import ReplayView from "./views/ReplayView.js";
import LogoutConfirmView from "./views/LogoutConfirmView.js";
import RoomListView from "./views/RoomListView.js";
import RoomDetailView from "./views/RoomDetailView.js";
import RoomGameView from "./views/RoomGameView.js";
import { useHandHistory } from "./hooks/useHandHistory.js";
import { useAuth } from "./hooks/useAuth.js";
import type { HandRecord } from "./game/history/recorder.js";

function App() {
  type ViewMode =
    | "top"
    | "history"
    | "replay"
    | "account"
    | "login"
    | "register"
    | "username"
    | "resetRequest"
    | "resetForm"
    | "logoutConfirm"
    | "roomList"
    | "roomDetail"
    | "roomGame";

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("top");
  const [replayRecord, setReplayRecord] = useState<HandRecord | null>(null);

  const auth = useAuth();
  const authReady = auth.ready;
  const isLoggedIn = !!auth.user && !auth.user.isGuest;

  useEffect(() => {
    if (!authReady) return;
    const lastRoomId = window.localStorage.getItem("lastRoomId");
    if (lastRoomId) {
      setSelectedRoomId(lastRoomId);
      setView("roomGame");
    }
  }, [authReady]);

  const shouldLoadHistory = view === "history";
  const { history, refresh: refreshHistory } = useHandHistory(
    shouldLoadHistory,
    5,
    auth.user?.userId
  );

  const handleViewHands = () => {
    refreshHistory();
    setView("history");
  };

  const startReplay = (record: HandRecord) => {
    setReplayRecord(record);
    setView("replay");
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex items-center justify-center">
        <div className="text-sm text-slate-300">Loading...</div>
      </div>
    );
  }

  if (view === "top") {
    return (
      <TopView
        onViewHands={handleViewHands}
        onLogin={() => setView("login")}
        onLogoutRequest={() => setView("logoutConfirm")}
        isLoggedIn={isLoggedIn}
        username={auth.user?.username}
        onRooms={() => setView("roomList")}
      />
    );
  }

  if (view === "roomList") {
    return (
      <RoomListView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        onSelect={(id) => {
          setSelectedRoomId(id);
          setView("roomDetail");
        }}
        onJoin={(id) => {
          setSelectedRoomId(id);
          window.localStorage.setItem("lastRoomId", id);
          setView("roomGame");
        }}
        onBack={() => setView("top")}
      />
    );
  }

  if (view === "roomDetail" && selectedRoomId) {
    return (
      <RoomDetailView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        roomId={selectedRoomId}
        onBack={() => setView("roomList")}
        onEnterTable={() => setView("roomGame")}
      />
    );
  }

  if (view === "roomGame" && selectedRoomId) {
    return (
      <RoomGameView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        roomId={selectedRoomId}
        onBack={() => setView("roomDetail")}
        onRoomClosed={() => {
          setSelectedRoomId(null);
          window.localStorage.removeItem("lastRoomId");
          setView("roomList");
        }}
      />
    );
  }

  if (view === "history") {
    return (
      <HistoryView
        history={history}
        username={auth.user?.username}
        onSelectHand={startReplay}
        onBack={() => setView("top")}
      />
    );
  }

  if (view === "replay" && replayRecord) {
    return <ReplayView record={replayRecord} onBack={() => setView("history")} />;
  }

  if (view === "account" && auth.user) {
    return (
      <AccountView
        user={{
          userId: auth.user.userId,
          isGuest: auth.user.isGuest,
          username: auth.user.username,
          usernameChanged: auth.user.usernameChanged,
          email: auth.user.email,
        }}
        onBack={() => setView("top")}
        onLogout={() => auth.logout().then(() => setView("top"))}
        onGotoRegister={() => setView("register")}
        onGotoLogin={() => setView("login")}
        onGotoUsernameChange={() => setView("username")}
      />
    );
  }

  if (view === "login") {
    return (
      <LoginView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        onSuccess={() => {
          auth.refresh();
          setView("top");
        }}
        onBack={() => setView("top")}
        onGoRegister={() => setView("register")}
        onGoReset={() => setView("resetRequest")}
      />
    );
  }

  if (view === "register") {
    return (
      <RegisterView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        onSuccess={() => {
          auth.refresh();
          setView("top");
        }}
        onBack={() => setView("top")}
        onGoLogin={() => setView("login")}
      />
    );
  }

  if (view === "username" && auth.user) {
    return (
      <UsernameChangeView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        user={auth.user}
        onSuccess={() => {
          auth.refresh();
          setView("account");
        }}
        onBack={() => setView("account")}
      />
    );
  }

  if (view === "resetRequest") {
    return (
      <ResetRequestView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        onDone={() => setView("resetForm")}
        onBack={() => setView("login")}
      />
    );
  }

  if (view === "resetForm") {
    return (
      <ResetFormView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        onSuccess={() => setView("login")}
        onBack={() => setView("login")}
      />
    );
  }

  if (view === "logoutConfirm" && auth.user) {
    return (
      <LogoutConfirmView
        onConfirm={() =>
          auth.logout().then(() => {
            setView("top");
          })
        }
        onCancel={() => setView("top")}
      />
    );
  }

  return null;
}

export default App;
