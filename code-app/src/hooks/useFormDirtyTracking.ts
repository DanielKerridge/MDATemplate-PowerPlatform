import { useState, useCallback, useMemo, useRef, useEffect } from "react";

function serialize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFormDirtyTracking(currentValues: Record<string, any>, resetKey?: string) {
  const initialRef = useRef<Record<string, unknown> | null>(null);
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const prevValuesRef = useRef<string>("");
  const isDirtyRef = useRef(false);
  const resetKeyRef = useRef(resetKey);

  // When resetKey changes (e.g., navigating to a different record),
  // clear the snapshot so the next data load is treated as initial
  useEffect(() => {
    if (resetKey !== resetKeyRef.current) {
      resetKeyRef.current = resetKey;
      initialRef.current = null;
      isDirtyRef.current = false;
      prevValuesRef.current = "";
      setSnapshotVersion((v) => v + 1);
    }
  }, [resetKey]);

  // Re-capture snapshot whenever the values change significantly
  // This handles: initial default state -> record loads -> form populated
  // We consider "significant" to mean the serialized values changed
  // The snapshot is always the LATEST stable state before user edits
  useEffect(() => {
    const serialized = JSON.stringify(currentValues);
    if (serialized !== prevValuesRef.current) {
      // Only update snapshot if this looks like a data load (not a user edit)
      // A data load changes many fields at once; a user edit changes one field
      const prevKeys = prevValuesRef.current ? Object.keys(JSON.parse(prevValuesRef.current) || {}) : [];
      const currentKeys = Object.keys(currentValues);
      const isInitialLoad = !initialRef.current;
      const isRecordLoad = currentKeys.length > prevKeys.length + 1;

      if (isInitialLoad || isRecordLoad) {
        initialRef.current = { ...currentValues };
        isDirtyRef.current = false;
        setSnapshotVersion((v) => v + 1);
      }
      prevValuesRef.current = serialized;
    }
  }, [currentValues]);

  const isDirty = useMemo(() => {
    if (!initialRef.current) return false;
    const initial = initialRef.current;
    const dirty = Object.keys(currentValues).some(
      (key) => serialize(currentValues[key]) !== serialize(initial[key])
    );
    isDirtyRef.current = dirty;
    return dirty;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValues, snapshotVersion]);

  const dirtyFields = useMemo(() => {
    if (!initialRef.current) return [];
    const initial = initialRef.current;
    return Object.keys(currentValues).filter(
      (key) => serialize(currentValues[key]) !== serialize(initial[key])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValues, snapshotVersion]);

  const resetDirty = useCallback(() => {
    initialRef.current = { ...currentValues };
    isDirtyRef.current = false; // Synchronous clear — blocker reads this immediately
    setSnapshotVersion((v) => v + 1);
  }, [currentValues]);

  return { isDirty, isDirtyRef, dirtyFields, resetDirty };
}
