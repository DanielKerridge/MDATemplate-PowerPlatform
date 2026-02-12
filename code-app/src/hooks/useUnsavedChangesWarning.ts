import { useEffect, useCallback, useState } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Blocks navigation when the form has unsaved changes.
 * Uses a ref for the blocker check so that resetDirty() works synchronously
 * (otherwise the blocker reads stale isDirty=true when navigate() is called
 * in the same synchronous block as resetDirty).
 */
export function useUnsavedChangesWarning(isDirtyRef: React.MutableRefObject<boolean>) {
  const [showDialog, setShowDialog] = useState(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirtyRef.current && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowDialog(true);
    }
  }, [blocker.state]);

  const confirmLeave = useCallback(() => {
    setShowDialog(false);
    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  }, [blocker]);

  const cancelLeave = useCallback(() => {
    setShowDialog(false);
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

  // Warn on browser close/refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirtyRef]);

  return { showDialog, confirmLeave, cancelLeave };
}
