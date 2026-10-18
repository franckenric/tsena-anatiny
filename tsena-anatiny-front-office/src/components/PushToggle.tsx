import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, Loader2 } from "lucide-react";
import { useI18n } from "../contexts/I18nContext";
import {
  getNotificationPermission,
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush
} from "../lib/push";
import { cn } from "../lib/utils";

type SubState = "unknown" | "off" | "on" | "busy";

/**
 * Bouton « alertes sur l'icône » (Web Push) du front-office.
 *
 * Affiche l'etat reel de l'abonnement et bascule d'un clic. La demande de
 * permission part toujours d'un clic : iOS refuse `Notification.requestPermission()`
 * en dehors d'un geste utilisateur.
 */
export function PushToggle() {
  const { t } = useI18n();
  const [state, setState] = useState<SubState>("unknown");
  const [notice, setNotice] = useState<string | null>(null);

  const supported = isPushSupported();

  const refresh = useCallback(async () => {
    if (!supported) {
      setState("off");
      return;
    }
    const subscription = await getExistingSubscription();
    setState(subscription ? "on" : "off");
  }, [supported]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(id);
  }, [notice]);

  if (!supported) return null;
  // Permission refusee au niveau du navigateur : rien a activer, on masque le
  // bouton plutot que d'afficher une action qui echouerait a coup sur.
  if (state !== "unknown" && getNotificationPermission() === "denied") {
    return null;
  }

  const on = state === "on";
  const busy = state === "busy";

  const toggle = async () => {
    if (busy) return;
    setState("busy");
    if (on) {
      const removed = await unsubscribeFromPush();
      setState(removed ? "off" : "on");
      setNotice(removed ? t("push.disabled") : t("push.error"));
      return;
    }
    const result = await subscribeToPush();
    if (result.status === "subscribed") {
      setState("on");
      setNotice(t("push.enabled"));
      return;
    }
    setState("off");
    if (result.status === "denied") {
      setNotice(t("push.denied"));
    } else if (result.status === "error") {
      setNotice(result.message || t("push.error"));
    }
  };

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        aria-pressed={on}
        aria-label={on ? t("push.disable") : t("push.enable")}
        title={on ? t("push.disable") : t("push.enableHint")}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition active:scale-95",
          "disabled:cursor-default disabled:opacity-60",
          on
            ? "bg-brand/10 text-brand hover:bg-brand/15"
            : "text-muted hover:bg-brand/10 hover:text-brand"
        )}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : on ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
      </button>

      {notice && (
        <span
          role="status"
          className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-max max-w-[15rem] rounded-xl border border-border/60 bg-panel px-3 py-2 text-[11px] font-medium text-ink shadow-lift animate-fade-up"
        >
          {notice}
        </span>
      )}
    </div>
  );
}
