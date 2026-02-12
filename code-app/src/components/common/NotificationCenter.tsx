import { useEffect } from "react";
import {
  Toast,
  Toaster,
  ToastTitle,
  useToastController,
  useId,
} from "@fluentui/react-components";
import { useAppStore } from "@/store/useAppStore";

export function NotificationCenter() {
  const toasterId = useId("toaster");
  const { dispatchToast } = useToastController(toasterId);
  const { notifications, removeNotification } = useAppStore();

  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[notifications.length - 1];
    const intent =
      latest.type === "success"
        ? "success"
        : latest.type === "error"
          ? "error"
          : "info";

    dispatchToast(
      <Toast>
        <ToastTitle>{latest.message}</ToastTitle>
      </Toast>,
      { intent, timeout: 4000 }
    );
    // Remove from store after dispatching
    removeNotification(latest.id);
  }, [notifications.length]);

  return <Toaster toasterId={toasterId} position="top-end" />;
}
