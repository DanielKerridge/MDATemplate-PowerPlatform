import { useEffect } from "react";

interface KeyboardShortcutOptions {
  onSave?: () => void;
  onSaveAndClose?: () => void;
  /** When true, keyboard shortcuts are suppressed (e.g., during a pending save) */
  disabled?: boolean;
}

/**
 * Registers keyboard shortcuts matching real MDA behavior:
 * - Ctrl+S → Save
 * - Ctrl+Shift+S → Save & Close
 */
export function useKeyboardShortcuts({ onSave, onSaveAndClose, disabled }: KeyboardShortcutOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (disabled) return;
        if (e.shiftKey && onSaveAndClose) {
          onSaveAndClose();
        } else if (!e.shiftKey && onSave) {
          onSave();
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onSave, onSaveAndClose, disabled]);
}
