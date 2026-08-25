import { useHistory } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications } from "../contexts/NotificationsContext";

export function NotificationsBell() {
  const history = useHistory();
  const { unreadCount } = useNotifications();

  return (
    <button
      type="button"
      onClick={() => history.push("/notifications")}
      aria-label="Notifications"
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-brand/10 hover:text-brand active:scale-95"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-white shadow-sm">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
