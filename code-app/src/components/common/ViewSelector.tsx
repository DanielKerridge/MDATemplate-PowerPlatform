import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { makeStyles } from "@fluentui/react-components";
import {
  ChevronDownRegular,
  CheckmarkRegular,
  SearchRegular,
  PinRegular,
  ArrowResetRegular,
  SettingsRegular,
} from "@fluentui/react-icons";
import { useAppStore } from "@/store/useAppStore";

export interface ViewOption {
  key: string;
  label: string;
}

interface ViewSelectorProps {
  views: ViewOption[];
  activeView: string;
  /** Key for localStorage (e.g. "projects", "tasks") */
  entityKey: string;
  onViewChange: (viewKey: string) => void;
}

const STORAGE_PREFIX = "mda_defaultView_";

export function getStoredDefault(entityKey: string, fallback: string): string {
  try {
    return localStorage.getItem(STORAGE_PREFIX + entityKey) ?? fallback;
  } catch {
    return fallback;
  }
}

function setStoredDefault(entityKey: string, viewKey: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + entityKey, viewKey);
  } catch {
    // ignore
  }
}

const useStyles = makeStyles({
  wrapper: {
    position: "relative",
  },
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    cursor: "pointer",
    backgroundColor: "transparent",
    border: "1px solid transparent",
    padding: "4px 8px",
    borderRadius: "2px",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  triggerOpen: {
    border: "1px solid #605e5c",
  },
  triggerText: {
    fontWeight: 400,
    fontSize: "20px",
    lineHeight: "24px",
    color: "#242424",
  },
  triggerChevron: {
    fontSize: "12px",
    color: "#616161",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    width: "280px",
    backgroundColor: "#ffffff",
    border: "1px solid #c8c6c4",
    borderRadius: "2px",
    boxShadow:
      "0 6.4px 14.4px 0 rgba(0,0,0,0.13), 0 1.2px 3.6px 0 rgba(0,0,0,0.11)",
    padding: "8px 0",
    zIndex: 1000,
    marginTop: "2px",
  },
  searchWrapper: {
    padding: "0 8px 8px",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    height: "32px",
    padding: "0 8px",
    border: "1px solid #605e5c",
    borderRadius: "2px",
    backgroundColor: "#fff",
    ...({ ":focus-within": {
      borderColor: "#0078d4",
      borderWidth: "2px",
      padding: "0 7px",
    } } as Record<string, Record<string, string>>),
  },
  searchIcon: {
    fontSize: "16px",
    color: "#605e5c",
    flexShrink: 0,
  },
  searchInput: {
    border: "none",
    outline: "none",
    flex: 1,
    fontSize: "14px",
    color: "#323130",
    backgroundColor: "transparent",
    fontFamily: "'Segoe UI', sans-serif",
    "::placeholder": {
      color: "#a19f9d",
    },
  },
  viewList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    maxHeight: "300px",
    overflowY: "auto",
  },
  viewItem: {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 400,
    color: "#323130",
    gap: "8px",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  viewItemSelected: {
    fontWeight: 600,
  },
  checkIcon: {
    fontSize: "12px",
    color: "#323130",
    width: "16px",
    flexShrink: 0,
  },
  checkPlaceholder: {
    width: "16px",
    flexShrink: 0,
  },
  viewLabel: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  defaultBadge: {
    backgroundColor: "#f3f2f1",
    color: "#605e5c",
    fontSize: "12px",
    fontWeight: 400,
    padding: "1px 6px",
    borderRadius: "8px",
    flexShrink: 0,
  },
  separator: {
    height: "1px",
    backgroundColor: "#e1dfdd",
    margin: "8px 0",
    border: "none",
  },
  actionItem: {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#323130",
    gap: "8px",
    backgroundColor: "transparent",
    border: "none",
    width: "100%",
    textAlign: "left",
    fontFamily: "'Segoe UI', sans-serif",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  actionIcon: {
    fontSize: "16px",
    color: "#323130",
    flexShrink: 0,
  },
  systemLabel: {
    fontSize: "12px",
    color: "#a19f9d",
    flexShrink: 0,
  },
  resultCount: {
    padding: "4px 12px",
    fontSize: "12px",
    color: "#a19f9d",
  },
});

export function ViewSelector({
  views,
  activeView,
  entityKey,
  onViewChange,
}: ViewSelectorProps) {
  const addNotification = useAppStore((s) => s.addNotification);
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [defaultViewKey, setDefaultViewKey] = useState(() =>
    getStoredDefault(entityKey, views[0]?.key ?? "")
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeLabel =
    views.find((v) => v.key === activeView)?.label ?? activeView;
  const systemDefault = views[0]?.key ?? "";
  const isOnDefault = activeView === defaultViewKey;
  const hasUserOverride = defaultViewKey !== systemDefault;

  const filteredViews = useMemo(() => {
    if (!search) return views;
    const lower = search.toLowerCase();
    return views.filter((v) => v.label.toLowerCase().includes(lower));
  }, [views, search]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = useCallback(
    (key: string) => {
      setOpen(false);
      setSearch("");
      if (key !== activeView) {
        onViewChange(key);
      }
    },
    [activeView, onViewChange]
  );

  const handleSetDefault = useCallback(() => {
    setStoredDefault(entityKey, activeView);
    setDefaultViewKey(activeView);
    setOpen(false);
    setSearch("");
  }, [entityKey, activeView]);

  const handleResetDefault = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_PREFIX + entityKey);
    } catch {
      // ignore
    }
    setDefaultViewKey(systemDefault);
    setOpen(false);
    setSearch("");
  }, [entityKey, systemDefault]);

  const handleManageViews = useCallback(() => {
    setOpen(false);
    setSearch("");
    addNotification("Manage and share views is not available in Code Apps", "info");
  }, [addNotification]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={`${styles.trigger}${open ? ` ${styles.triggerOpen}` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.triggerText}>{activeLabel}</span>
        <ChevronDownRegular className={styles.triggerChevron} />
      </button>

      {open && (
        <div className={styles.dropdown}>
          {/* Search */}
          <div className={styles.searchWrapper}>
            <div className={styles.searchBox}>
              <SearchRegular className={styles.searchIcon} />
              <input
                ref={searchRef}
                className={styles.searchInput}
                placeholder="Search views"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* View list */}
          <ul className={styles.viewList}>
            {filteredViews.map((v) => {
              const isSelected = v.key === activeView;
              const isDefault = v.key === defaultViewKey;
              return (
                <li
                  key={v.key}
                  className={`${styles.viewItem}${isSelected ? ` ${styles.viewItemSelected}` : ""}`}
                  onClick={() => handleSelect(v.key)}
                >
                  {isSelected ? (
                    <CheckmarkRegular className={styles.checkIcon} />
                  ) : (
                    <span className={styles.checkPlaceholder} />
                  )}
                  <span className={styles.viewLabel}>{v.label}</span>
                  {isDefault ? (
                    <span className={styles.defaultBadge}>Default</span>
                  ) : (
                    <span className={styles.systemLabel}>System view</span>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Results count */}
          <div className={styles.resultCount}>
            {filteredViews.length} results found
          </div>

          {/* Separator */}
          <hr className={styles.separator} />

          {/* Actions */}
          {!isOnDefault ? (
            <button
              type="button"
              className={styles.actionItem}
              onClick={handleSetDefault}
            >
              <PinRegular className={styles.actionIcon} />
              <span>Set as default view</span>
            </button>
          ) : hasUserOverride ? (
            <button
              type="button"
              className={styles.actionItem}
              onClick={handleResetDefault}
            >
              <ArrowResetRegular className={styles.actionIcon} />
              <span>Reset default view</span>
            </button>
          ) : null}
          <button
            type="button"
            className={styles.actionItem}
            onClick={handleManageViews}
          >
            <SettingsRegular className={styles.actionIcon} />
            <span>Manage and share views</span>
          </button>
        </div>
      )}
    </div>
  );
}
