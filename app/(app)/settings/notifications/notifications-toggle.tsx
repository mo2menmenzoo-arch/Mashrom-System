"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  subscribePushAction,
  unsubscribePushAction,
} from "@/actions/notifications";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    arr[i] = rawData.charCodeAt(i);
  }
  return arr.buffer as ArrayBuffer;
}

export function NotificationsToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager
        .getSubscription()
        .then((sub) => setSubscribed(!!sub))
        .catch(() => setSubscribed(false)),
    );
  }, []);

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        المتصفح الحالي لا يدعم الإشعارات.
      </p>
    );
  }

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (subscribed) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await sub.unsubscribe();
            await unsubscribePushAction(sub.endpoint);
          }
          setSubscribed(false);
        } else {
          if (!VAPID_PUBLIC_KEY) {
            setError("مفتاح VAPID غير مضبوط — تواصل مع المدير");
            return;
          }
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setError("لم يتم السماح بالإشعارات. تحقق من إعدادات المتصفح.");
            return;
          }
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
          const json = sub.toJSON() as {
            endpoint: string;
            keys: Record<string, string>;
          };
          const result = await subscribePushAction({
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSubscribed(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطأ غير متوقع");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {subscribed
            ? "الإشعارات مفعّلة على هذا الجهاز"
            : "الإشعارات معطّلة على هذا الجهاز"}
        </p>
        <Button
          variant={subscribed ? "outline" : "default"}
          size="sm"
          onClick={handleToggle}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : subscribed ? (
            <>
              <BellOff className="me-2 h-4 w-4" />
              تعطيل
            </>
          ) : (
            <>
              <Bell className="me-2 h-4 w-4" />
              تفعيل
            </>
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
