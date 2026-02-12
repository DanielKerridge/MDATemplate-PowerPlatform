import { useEffect, useRef } from "react";

const AUTOSAVE_DELAY_MS = 30_000; // 30 seconds after last change

/**
 * Auto-saves a form after a period of inactivity when dirty.
 * Only triggers on existing records (not new ones).
 * Calls `onSave` after the delay if the form is still dirty.
 */
export function useAutoSave(options: {
  isDirty: boolean;
  isNew: boolean;
  isSaving: boolean;
  isDeactivated?: boolean;
  onSave: () => void;
}) {
  const { isDirty, isNew, isSaving, isDeactivated, onSave } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    // Clear any pending timer when dependencies change
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Only autosave existing, active, dirty records that aren't already saving
    if (!isDirty || isNew || isSaving || isDeactivated) return;

    timerRef.current = setTimeout(() => {
      onSaveRef.current();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isDirty, isNew, isSaving, isDeactivated]);
}
