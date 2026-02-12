import { useState, useEffect, useCallback, useRef } from "react";
import { makeStyles, Input, Spinner, Select } from "@fluentui/react-components";
import { SearchRegular, DismissRegular, AddRegular } from "@fluentui/react-icons";
import type { LookupSearchResult } from "./FormField";

export interface LookupTableOption {
  key: string;
  label: string;
  onSearch: (query: string) => Promise<LookupSearchResult[]>;
}

interface LookupModalProps {
  open: boolean;
  title: string;
  onSearch: (query: string) => Promise<LookupSearchResult[]>;
  onSelect: (result: LookupSearchResult) => void;
  onClose: () => void;
  /** Multiple table options for the lookup (e.g., "Team Members", "Users") */
  tables?: LookupTableOption[];
  /** Called when user clicks "+ New Record" in the lookup modal */
  onNewRecord?: () => void;
}

const useStyles = makeStyles({
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
  },
  modal: {
    width: "600px",
    maxWidth: "90vw",
    maxHeight: "70vh",
    backgroundColor: "#fff",
    borderRadius: "4px",
    boxShadow: "0 25.6px 57.6px 0 rgba(0,0,0,0.22), 0 4.8px 14.4px 0 rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #edebe9",
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#323130",
  },
  closeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    border: "none",
    backgroundColor: "transparent",
    cursor: "pointer",
    borderRadius: "2px",
    color: "#605e5c",
    ":hover": {
      backgroundColor: "#f3f2f1",
      color: "#323130",
    },
  },
  searchArea: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    borderBottom: "1px solid #edebe9",
  },
  resultsArea: {
    flex: 1,
    overflow: "auto",
    minHeight: "200px",
  },
  resultItem: {
    display: "flex",
    alignItems: "center",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#323130",
    borderBottom: "1px solid #f3f2f1",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  resultItemSelected: {
    backgroundColor: "#e6f2fb",
  },
  resultName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  empty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 20px",
    color: "#605e5c",
    fontSize: "14px",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderTop: "1px solid #edebe9",
    backgroundColor: "#fff",
  },
  footerCount: {
    fontSize: "12px",
    color: "#605e5c",
  },
  selectBtn: {
    padding: "6px 20px",
    backgroundColor: "#0078d4",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "'Segoe UI', sans-serif",
    ":hover": {
      backgroundColor: "#106ebe",
    },
    ":disabled": {
      backgroundColor: "#c8c6c4",
      cursor: "default",
    },
  },
});

export function LookupModal({ open, title, onSearch, onSelect, onClose, tables, onNewRecord }: LookupModalProps) {
  const styles = useStyles();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<LookupSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState(tables?.[0]?.key ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const currentSearch = tables?.find((t) => t.key === activeTable)?.onSearch ?? onSearch;

  // Load initial results when modal opens or table changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (open) {
      setSearchText("");
      setSelectedId(null);
      setLoading(true);
      currentSearch("").then((r) => {
        setResults(r);
        setLoading(false);
      }).catch((err) => {
        console.error("Lookup initial load failed:", err);
        setResults([]);
        setLoading(false);
      });
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open, activeTable, currentSearch]);

  const doSearch = useCallback(
    (query: string) => {
      setLoading(true);
      currentSearch(query).then((r) => {
        setResults(r);
        setLoading(false);
      }).catch((err) => {
        console.error("Lookup search failed:", err);
        setResults([]);
        setLoading(false);
      });
    },
    [currentSearch]
  );

  const handleSearchChange = useCallback(
    (val: string) => {
      setSearchText(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(val), 300);
    },
    [doSearch]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSelect = useCallback(() => {
    const item = results.find((r) => r.id === selectedId);
    if (item) {
      onSelect(item);
      onClose();
    }
  }, [selectedId, results, onSelect, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const hasTables = tables && tables.length > 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Look Up Record - {title}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <DismissRegular style={{ fontSize: 16 }} />
          </button>
        </div>

        <div className={styles.searchArea}>
          {hasTables && (
            <Select
              value={activeTable}
              onChange={(_, d) => {
                setActiveTable(d.value);
                setSearchText("");
                setSelectedId(null);
              }}
              style={{ minWidth: "160px" }}
              appearance="outline"
            >
              {tables.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </Select>
          )}
          <Input
            ref={searchRef}
            value={searchText}
            onChange={(_, d) => handleSearchChange(d.value)}
            placeholder={`Search ${hasTables ? (tables.find((t) => t.key === activeTable)?.label ?? title) : title}...`}
            contentBefore={<SearchRegular style={{ fontSize: 16, color: "#605e5c" }} />}
            appearance="outline"
            style={{ flex: 1 }}
          />
        </div>

        <div className={styles.resultsArea}>
          {loading ? (
            <div className={styles.empty}>
              <Spinner size="small" label="Searching..." />
            </div>
          ) : results.length === 0 ? (
            <div className={styles.empty}>
              {searchText.trim() ? "No records found matching your search." : "No records available."}
            </div>
          ) : (
            results.map((r) => (
              <div
                key={r.id}
                className={`${styles.resultItem}${selectedId === r.id ? ` ${styles.resultItemSelected}` : ""}`}
                onClick={() => setSelectedId(r.id)}
                onDoubleClick={() => {
                  onSelect(r);
                  onClose();
                }}
              >
                <span className={styles.resultName}>{r.name}</span>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className={styles.footerCount}>
              {results.length} record{results.length !== 1 ? "s" : ""} found
            </span>
            {onNewRecord && (
              <button
                type="button"
                onClick={() => { onClose(); onNewRecord(); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  padding: "4px 10px", fontSize: "13px", color: "#0078d4",
                  backgroundColor: "transparent", border: "1px solid #0078d4",
                  borderRadius: "4px", cursor: "pointer", fontFamily: "'Segoe UI', sans-serif",
                }}
              >
                <AddRegular style={{ fontSize: 14 }} />
                New Record
              </button>
            )}
          </div>
          <button
            type="button"
            className={styles.selectBtn}
            disabled={!selectedId}
            onClick={handleSelect}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
