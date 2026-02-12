import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  makeStyles,
  mergeClasses,
  Input,
  Button,
  Checkbox,
} from "@fluentui/react-components";
import {
  SearchRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  ChevronRight16Regular,
  ChevronDown16Regular,
  ArrowSortDownRegular,
  ArrowSortUpRegular,
  FilterRegular,
  ColumnTripleRegular,
} from "@fluentui/react-icons";
import { ViewSelector } from "@/components/common/ViewSelector";
import { EditColumnsPanel } from "@/components/common/EditColumnsPanel";
import type { EditColumnItem } from "@/components/common/EditColumnsPanel";
import { EditFiltersPanel } from "@/components/common/EditFiltersPanel";
import type { FilterCondition, FilterColumn } from "@/components/common/EditFiltersPanel";
import { APP_CONFIG } from "@/config/constants";

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  /** Data type hint for Edit Columns panel icon */
  dataType?: "text" | "number" | "date" | "money" | "optionset" | "lookup" | "textarea" | "boolean";
  /** If true, cell can be inline-edited by double-clicking */
  editable?: boolean;
  /** Options for inline select (optionset columns) */
  editOptions?: Array<{ value: string | number; label: string }>;
  /** For lookup columns: entity route path for navigation (e.g., "/projects") */
  lookupEntityPath?: string;
}

interface EntityListViewProps<T> {
  title: string;
  columns: ColumnDef<T>[];
  data: T[] | undefined;
  isLoading: boolean;
  idField: string;
  entityPath: string;
  views?: Array<{ key: string; label: string }>;
  activeView?: string;
  onViewChange?: (viewKey: string) => void;
  onSearch?: (text: string) => void;
  totalCount?: number;
  emptyMessage?: string;
  /** Column key for default sort (matches view's orderBy) */
  defaultSortCol?: string;
  /** Default sort direction: true = ascending, false = descending */
  defaultSortAsc?: boolean;
  /** Called when row selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Called when row context menu action is triggered */
  onRowAction?: (action: string, rowId: string) => void;
  /** If provided, rows get an expand chevron. Return content to show in the expanded area. */
  renderExpanded?: (row: T) => React.ReactNode;
  /** Called when a cell is inline-edited. Columns must have `editable: true`. */
  onInlineEdit?: (rowId: string, columnKey: string, value: unknown) => void;
  /** Extra columns available in Edit Columns panel that aren't in the default view */
  extraColumns?: Array<{ key: string; header: string; dataType?: ColumnDef<T>["dataType"] }>;
  /** Returns true if a row is currently active. Used to toggle Activate/Deactivate in context menu. */
  getRowActive?: (row: T) => boolean;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    margin: "8px 0 16px",
    borderRadius: "4px",
    boxShadow: "rgba(0,0,0,0.12) 0px 0px 2px 0px, rgba(0,0,0,0.14) 0px 2px 4px 0px",
  },
  /* Filter bar */
  filterBar: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    gap: "16px",
    flexShrink: 0,
    borderRadius: "4px 4px 0 0",
  },
  viewTrigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    cursor: "pointer",
    backgroundColor: "transparent",
    border: "none",
    padding: "4px 6px",
    borderRadius: "2px",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  viewName: {
    fontWeight: 400,
    fontSize: "20px",
    lineHeight: "24px",
    color: "#242424",
  },
  viewChevron: {
    fontSize: "14px",
    color: "#323130",
  },
  filterActions: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexShrink: 0,
  },
  filterBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    cursor: "pointer",
    color: "#242424",
    fontSize: "14px",
    fontWeight: 400,
    backgroundColor: "transparent",
    border: "none",
    padding: "4px 8px",
    borderRadius: "4px",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  filterBtnIcon: {
    fontSize: "14px",
    color: "#0078d4",
  },
  searchContainer: {
    flexShrink: 0,
  },
  searchInput: {
    width: "200px",
    borderRadius: "2px",
    ...({ borderColor: "#8a8886" } as Record<string, string>),
  },
  /* Grid */
  gridContainer: {
    flex: 1,
    overflow: "auto",
    position: "relative",
    borderBottom: "none",
    paddingLeft: "12px",
    paddingRight: "12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed" as const,
    fontSize: "14px",
  },
  thCheckbox: {
    width: "44px",
    minWidth: "44px",
    maxWidth: "44px",
    textAlign: "center",
    padding: "0",
    height: "42px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #e0e0e0",
    position: "sticky" as const,
    top: 0,
    zIndex: 1,
  },
  tdCheckbox: {
    width: "44px",
    minWidth: "44px",
    maxWidth: "44px",
    textAlign: "center",
    padding: "0",
    height: "42px",
    borderBottom: "1px solid #e0e0e0",
  },
  th: {
    textAlign: "left",
    padding: "0 12px",
    height: "42px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #e0e0e0",
    fontWeight: 600,
    color: "rgba(0, 0, 0, 0.54)",
    fontSize: "12px",
    whiteSpace: "nowrap",
    userSelect: "none",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  resizeHandle: {
    position: "absolute",
    right: "-8px",
    top: 0,
    width: "16px",
    height: "100%",
    cursor: "ew-resize",
    zIndex: 2,
    ":hover::after": {
      content: '""',
      position: "absolute",
      left: "7px",
      top: "20%",
      width: "2px",
      height: "60%",
      backgroundColor: "#0078d4",
    },
  },
  thSortable: {
    cursor: "pointer",
    ":hover": {
      backgroundColor: "#faf9f8",
      color: "#323130",
    },
  },
  thContent: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1px",
  },
  sortIcon: {
    fontSize: "10px",
    color: "#605e5c",
  },
  td: {
    padding: "0 12px",
    height: "42px",
    borderBottom: "1px solid #e0e0e0",
    color: "#000",
    fontSize: "14px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "300px",
  },
  row: {
    cursor: "pointer",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  rowSelected: {
    backgroundColor: "#e6f2fb",
    ":hover": {
      backgroundColor: "#deecf9",
    },
  },
  rowFocused: {
    outline: "2px solid #0078d4",
    outlineOffset: "-2px",
  },
  primaryLink: {
    color: "#0078d4",
    fontWeight: 400,
    cursor: "pointer",
    ":hover": {
      textDecoration: "underline",
    },
  },
  /* Empty state */
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 48px",
    gap: "16px",
  },
  emptyIconCircle: {
    width: "170px",
    height: "170px",
    borderRadius: "50%",
    backgroundColor: "#c8c6c4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  emptyText: {
    color: "#605e5c",
    fontSize: "15px",
    marginTop: "8px",
  },
  scrollTrack: {
    height: "8px",
    backgroundColor: "#edebe9",
    borderRadius: "4px",
    margin: "4px 8px",
    flexShrink: 0,
  },
  /* Footer */
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    borderTop: "1px solid #edebe9",
    backgroundColor: "#fff",
    fontSize: "12px",
    fontWeight: 400,
    color: "#323130",
    flexShrink: 0,
    height: "32px",
    borderRadius: "0 0 4px 4px",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  /* Loading (skeleton rendered inline) */
  contextMenu: {
    position: "fixed",
    backgroundColor: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15), 0 0 2px rgba(0,0,0,0.12)",
    borderRadius: "4px",
    padding: "4px 0",
    zIndex: 1000,
    minWidth: "160px",
  },
  contextMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#242424",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  contextMenuDivider: {
    height: "1px",
    backgroundColor: "#edebe9",
    margin: "4px 0",
  },
  expandTd: {
    width: "28px",
    minWidth: "28px",
    maxWidth: "28px",
    textAlign: "center",
    padding: "0",
    height: "42px",
    borderBottom: "1px solid #e0e0e0",
  },
  expandTh: {
    width: "28px",
    minWidth: "28px",
    maxWidth: "28px",
    textAlign: "center",
    padding: "0",
    height: "42px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #e0e0e0",
    position: "sticky" as const,
    top: 0,
    zIndex: 1,
  },
  expandChevron: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: "2px",
    borderRadius: "2px",
    color: "#605e5c",
    transition: "transform 0.15s ease",
    ":hover": {
      backgroundColor: "#f3f2f1",
      color: "#323130",
    },
  },
  expandedRow: {
    backgroundColor: "#faf9f8",
  },
  expandedCell: {
    padding: "12px 16px 12px 72px",
    borderBottom: "1px solid #e0e0e0",
  },
  inlineEditCell: {
    padding: "0 4px",
  },
  inlineInput: {
    width: "100%",
    height: "32px",
    padding: "0 8px",
    fontSize: "14px",
    border: "1px solid #0078d4",
    borderRadius: "2px",
    outline: "none",
    backgroundColor: "#fff",
    boxSizing: "border-box" as const,
  },
  inlineSelect: {
    width: "100%",
    height: "32px",
    padding: "0 4px",
    fontSize: "14px",
    border: "1px solid #0078d4",
    borderRadius: "2px",
    outline: "none",
    backgroundColor: "#fff",
    boxSizing: "border-box" as const,
  },
});

export function EntityListView<T>({
  title,
  columns,
  data,
  isLoading,
  idField,
  entityPath,
  views,
  activeView,
  onViewChange,
  onSearch,
  totalCount,
  emptyMessage,
  defaultSortCol,
  defaultSortAsc = true,
  onSelectionChange,
  onRowAction,
  renderExpanded,
  onInlineEdit,
  extraColumns,
  getRowActive,
}: EntityListViewProps<T>) {
  const styles = useStyles();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(defaultSortCol ?? null);
  const [sortAsc, setSortAsc] = useState(defaultSortAsc);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(null);
  const [editColumnsOpen, setEditColumnsOpen] = useState(false);
  const [editFiltersOpen, setEditFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);
  const [jumpLetter, setJumpLetter] = useState<string | null>(null);
  const [dragColKey, setDragColKey] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string; value: string } | null>(null);
  const editInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[] | null>(() => {
    const storageKey = `editcols_${entityPath}`;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Build a map of all available column definitions (base + extra)
  const allColumnDefs = useMemo(() => {
    const map = new Map<string, ColumnDef<T>>();
    for (const c of columns) map.set(c.key, c);
    if (extraColumns) {
      for (const ec of extraColumns) {
        if (!map.has(ec.key)) {
          map.set(ec.key, { key: ec.key, header: ec.header, dataType: ec.dataType });
        }
      }
    }
    return map;
  }, [columns, extraColumns]);

  // Compute visible columns based on user customization
  const visibleColumns = useMemo(() => {
    if (!visibleColumnKeys) return columns;
    return visibleColumnKeys
      .map((k) => allColumnDefs.get(k))
      .filter(Boolean) as ColumnDef<T>[];
  }, [columns, visibleColumnKeys, allColumnDefs]);

  const editColumnItems: EditColumnItem[] = useMemo(
    () => (visibleColumnKeys ? visibleColumns : columns).map((c) => ({
      key: c.key,
      header: c.header,
      dataType: c.dataType,
    })),
    [visibleColumns, columns, visibleColumnKeys]
  );

  const allColumnItems: EditColumnItem[] = useMemo(
    () => {
      const base = columns.map((c) => ({
        key: c.key,
        header: c.header,
        dataType: c.dataType,
      }));
      if (extraColumns) {
        const existing = new Set(base.map((c) => c.key));
        for (const ec of extraColumns) {
          if (!existing.has(ec.key)) {
            base.push({ key: ec.key, header: ec.header, dataType: ec.dataType });
          }
        }
      }
      return base;
    },
    [columns, extraColumns]
  );

  const filterColumns: FilterColumn[] = useMemo(
    () => visibleColumns.map((c) => ({
      key: c.key,
      header: c.header,
      dataType: c.dataType,
    })),
    [visibleColumns]
  );

  const handleEditColumnsApply = useCallback((keys: string[]) => {
    setVisibleColumnKeys(keys);
    const storageKey = `editcols_${entityPath}`;
    localStorage.setItem(storageKey, JSON.stringify(keys));
    setEditColumnsOpen(false);
  }, [entityPath]);

  // Column resize state — persisted to localStorage per entity
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const storageKey = `colwidths_${entityPath}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    const initial: Record<string, number> = {};
    columns.forEach((col) => {
      initial[col.key] = parseInt(col.width ?? "150", 10) || 150;
    });
    return initial;
  });
  const resizeRef = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleResizeStart = useCallback(
    (colKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startWidth = columnWidths[colKey] ?? 150;
      resizeRef.current = { colKey, startX: e.clientX, startWidth };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const delta = ev.clientX - resizeRef.current.startX;
        const newWidth = Math.max(50, resizeRef.current.startWidth + delta);
        setColumnWidths((prev) => ({ ...prev, [resizeRef.current!.colKey]: newWidth }));
      };

      const handleMouseUp = () => {
        resizeRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        // Persist column widths to localStorage
        setColumnWidths((current) => {
          try { localStorage.setItem(`colwidths_${entityPath}`, JSON.stringify(current)); } catch { /* ignore */ }
          return current;
        });
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    },
    [columnWidths]
  );

  // Column drag-to-reorder handlers
  const handleColumnDragStart = useCallback((colKey: string, e: React.DragEvent) => {
    setDragColKey(colKey);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", colKey);
  }, []);

  const handleColumnDragOver = useCallback((colKey: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (colKey !== dragColKey) setDragOverColKey(colKey);
  }, [dragColKey]);

  const handleColumnDrop = useCallback((targetColKey: string, e: React.DragEvent) => {
    e.preventDefault();
    if (!dragColKey || dragColKey === targetColKey) {
      setDragColKey(null);
      setDragOverColKey(null);
      return;
    }
    const currentKeys = visibleColumnKeys ?? visibleColumns.map((c) => c.key);
    const fromIdx = currentKeys.indexOf(dragColKey);
    const toIdx = currentKeys.indexOf(targetColKey);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...currentKeys];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, dragColKey);
    setVisibleColumnKeys(reordered);
    localStorage.setItem(`editcols_${entityPath}`, JSON.stringify(reordered));
    setDragColKey(null);
    setDragOverColKey(null);
  }, [dragColKey, visibleColumnKeys, visibleColumns, entityPath]);

  const handleColumnDragEnd = useCallback(() => {
    setDragColKey(null);
    setDragOverColKey(null);
  }, []);

  const pageSize = APP_CONFIG.DEFAULT_PAGE_SIZE;

  // Debounce ref for search
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focused row index for keyboard navigation
  const [focusedRow, setFocusedRow] = useState<number>(-1);
  const lastClickedIndex = useRef<number>(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  // Reset page, selection, and focus when view changes
  useEffect(() => {
    setPage(0);
    setSelectedIds(new Set());
    setFocusedRow(-1);
  }, [activeView]);

  const activeViewLabel =
    views?.find((v) => v.key === activeView)?.label ?? title;

  // Client-side filter by keyword
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchText.trim()) return data;
    const lower = searchText.toLowerCase();
    return data.filter((row) => {
      const rec = row as Record<string, unknown>;
      return visibleColumns.some((col) => {
        const val = rec[col.key];
        return val != null && String(val).toLowerCase().includes(lower);
      });
    });
  }, [data, searchText, visibleColumns]);

  // Apply structured filter conditions (from Edit Filters panel)
  const conditionFilteredData = useMemo(() => {
    if (activeFilters.length === 0) return filteredData;
    return filteredData.filter((row) => {
      const rec = row as Record<string, unknown>;
      return activeFilters.every((cond) => {
        const raw = rec[cond.column];
        const val = raw == null ? "" : String(raw).toLowerCase();
        const target = cond.value.toLowerCase();
        switch (cond.operator) {
          case "contains": return val.includes(target);
          case "eq": return val === target;
          case "neq": return val !== target;
          case "startswith": return val.startsWith(target);
          case "endswith": return val.endsWith(target);
          case "gt": return Number(raw) > Number(cond.value);
          case "lt": return Number(raw) < Number(cond.value);
          case "gte": return Number(raw) >= Number(cond.value);
          case "lte": return Number(raw) <= Number(cond.value);
          default: return true;
        }
      });
    });
  }, [filteredData, activeFilters]);

  // Jump bar filter (A-Z)
  const jumpFilteredData = useMemo(() => {
    if (!jumpLetter) return conditionFilteredData;
    const primaryKey = visibleColumns[0]?.key;
    if (!primaryKey) return conditionFilteredData;
    return conditionFilteredData.filter((row) => {
      const val = String((row as Record<string, unknown>)[primaryKey] ?? "");
      if (jumpLetter === "#") return val.length > 0 && !/^[a-zA-Z]/.test(val);
      return val.toUpperCase().startsWith(jumpLetter);
    });
  }, [conditionFilteredData, jumpLetter, visibleColumns]);

  // Client-side sort
  const sortedData = useMemo(() => {
    if (!sortCol) return jumpFilteredData;
    return [...jumpFilteredData].sort((a, b) => {
      const va = (a as Record<string, unknown>)[sortCol] ?? "";
      const vb = (b as Record<string, unknown>)[sortCol] ?? "";
      const cmp = String(va).localeCompare(String(vb), undefined, {
        numeric: true,
      });
      return sortAsc ? cmp : -cmp;
    });
  }, [jumpFilteredData, sortCol, sortAsc]);

  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const rowCount = totalCount ?? sortedData.length;

  // Store sorted record IDs and names in sessionStorage for form record-navigation
  useEffect(() => {
    if (sortedData.length > 0) {
      const ids = sortedData.map((r) => String((r as Record<string, unknown>)[idField]));
      sessionStorage.setItem(`recordNav_${entityPath}`, JSON.stringify(ids));
      // Store record names for the Record Set Navigator panel
      const nameMap: Record<string, string> = {};
      const nameCol = columns[0]?.key;
      if (nameCol) {
        for (const r of sortedData) {
          const row = r as Record<string, unknown>;
          nameMap[String(row[idField])] = String(row[nameCol] ?? "");
        }
      }
      sessionStorage.setItem(`recordNavNames_${entityPath}`, JSON.stringify(nameMap));
    }
  }, [sortedData, idField, entityPath, columns]);

  const handleSort = (colKey: string) => {
    if (sortCol === colKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(colKey);
      setSortAsc(true);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(0);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      onSearch?.(value);
    }, 300);
  };

  const toggleSelect = (rowId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = pagedData.map((r) =>
      String((r as Record<string, unknown>)[idField])
    );
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(selectedIds);
  }, [selectedIds, onSelectionChange]);

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  // Grid keyboard navigation: Arrow Up/Down, Enter to open, Space to select, Escape to deselect
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (pagedData.length === 0) return;
      // Only handle when grid area has focus (not search input or panels)
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedRow((prev) => Math.min(prev + 1, pagedData.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedRow((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && focusedRow >= 0 && focusedRow < pagedData.length) {
        e.preventDefault();
        const rowId = String((pagedData[focusedRow] as Record<string, unknown>)[idField]);
        navigate(`${entityPath}/${rowId}`);
      } else if (e.key === " " && focusedRow >= 0 && focusedRow < pagedData.length) {
        e.preventDefault();
        const rowId = String((pagedData[focusedRow] as Record<string, unknown>)[idField]);
        toggleSelect(rowId);
      } else if (e.key === "Escape") {
        if (editColumnsOpen) { setEditColumnsOpen(false); return; }
        if (editFiltersOpen) { setEditFiltersOpen(false); return; }
        if (selectedIds.size > 0) {
          setSelectedIds(new Set());
          setFocusedRow(-1);
        }
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [pagedData, focusedRow, idField, entityPath, navigate, editColumnsOpen, editFiltersOpen, selectedIds.size]);

  // Auto-scroll to keep focused row visible
  useEffect(() => {
    if (focusedRow < 0 || !gridRef.current) return;
    const rows = gridRef.current.querySelectorAll("tbody tr");
    if (rows[focusedRow]) {
      rows[focusedRow].scrollIntoView({ block: "nearest" });
    }
  }, [focusedRow]);

  // Cleanup search debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const handleContextMenu = (rowId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const menuW = 180, menuH = 250;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8);
    setContextMenu({ x, y, rowId });
  };

  // Inline edit handlers
  const commitInlineEdit = useCallback(() => {
    if (!editingCell || !onInlineEdit) return;
    const col = visibleColumns.find((c) => c.key === editingCell.colKey);
    let finalValue: unknown = editingCell.value;
    if (col?.dataType === "number" || col?.dataType === "money") {
      finalValue = editingCell.value === "" ? null : Number(editingCell.value);
    } else if (col?.dataType === "boolean") {
      finalValue = editingCell.value === "true" || editingCell.value === "1";
    } else if (col?.dataType === "optionset") {
      finalValue = editingCell.value === "" ? null : Number(editingCell.value);
    }
    onInlineEdit(editingCell.rowId, editingCell.colKey, finalValue);
    setEditingCell(null);
  }, [editingCell, onInlineEdit, visibleColumns]);

  const cancelInlineEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const startInlineEdit = useCallback((rowId: string, colKey: string, currentValue: unknown) => {
    if (!onInlineEdit) return;
    const col = visibleColumns.find((c) => c.key === colKey);
    if (!col?.editable) return;
    setEditingCell({ rowId, colKey, value: currentValue == null ? "" : String(currentValue) });
  }, [onInlineEdit, visibleColumns]);

  // Focus edit input when it appears
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      if (editInputRef.current instanceof HTMLInputElement) {
        editInputRef.current.select();
      }
    }
  }, [editingCell]);

  const pageIds = pagedData.map((r) =>
    String((r as Record<string, unknown>)[idField])
  );
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  return (
    <div className={styles.root}>
      {/* Print header — only visible when printing */}
      <div className="print-header" style={{ display: "none" }}>
        <h1>{activeViewLabel}</h1>
        <div className="print-date">Printed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</div>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar} data-print-hide-grid>
        {/* View selector */}
        {views && views.length > 1 && onViewChange ? (
          <ViewSelector
            views={views}
            activeView={activeView ?? views[0].key}
            entityKey={entityPath.replace(/^\//, "")}
            onViewChange={onViewChange}
          />
        ) : (
          <span className={styles.viewName}>{activeViewLabel}</span>
        )}

        {/* Spacer pushes right-side items */}
        <div style={{ flex: 1 }} />

        {/* Edit columns / Edit filters — right side like MDA */}
        <div className={styles.filterActions}>
          <button className={styles.filterBtn} type="button" onClick={(e) => { e.stopPropagation(); setEditColumnsOpen(true); }}>
            <ColumnTripleRegular className={styles.filterBtnIcon} />
            <span>Edit columns</span>
          </button>
          <button className={styles.filterBtn} type="button" onClick={(e) => { e.stopPropagation(); setEditFiltersOpen(true); }}>
            <FilterRegular className={styles.filterBtnIcon} />
            <span>Edit filters</span>
            {activeFilters.length > 0 && (
              <span style={{ backgroundColor: "#0078d4", color: "#fff", borderRadius: "8px", padding: "0 6px", fontSize: "11px", fontWeight: 600, marginLeft: "2px" }}>
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter by keyword */}
        <div className={styles.searchContainer}>
          <Input
            className={styles.searchInput}
            contentBefore={<SearchRegular />}
            placeholder="Filter by keyword"
            aria-label="Filter by keyword"
            size="small"
            value={searchText}
            onChange={(_, d) => handleSearch(d.value)}
            appearance="outline"
          />
        </div>
      </div>

      {/* Grid area */}
      <div className={styles.gridContainer} ref={gridRef} tabIndex={0} style={{ outline: "none" }} role="region" aria-label={`${title} data grid`}>
        {isLoading ? (
          <table className={styles.table} aria-label={`${title} loading`}>
            <thead>
              <tr>
                <th className={styles.thCheckbox} data-print-hide-cell />
                {renderExpanded && <th className={styles.expandTh} />}
                {visibleColumns.map((col) => (
                  <th key={col.key} className={styles.th} style={{ width: `${columnWidths[col.key] ?? 150}px` }}>
                    <span className={styles.thContent}>{col.header}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }, (_, i) => (
                <tr key={i} style={{ height: "42px" }}>
                  <td className={styles.tdCheckbox} data-print-hide-cell />
                  {renderExpanded && <td className={styles.expandTd} data-print-hide-cell />}
                  {visibleColumns.map((col, ci) => (
                    <td key={col.key} className={styles.td} style={{ width: `${columnWidths[col.key] ?? 150}px` }}>
                      <div style={{
                        width: ci === 0 ? "60%" : `${50 + (ci * 7) % 30}%`,
                        height: "14px",
                        backgroundColor: "#edebe9",
                        borderRadius: "4px",
                        animation: "shimmer 1.5s infinite",
                        animationDelay: `${i * 0.06 + ci * 0.03}s`,
                      }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <>
            {/* Column headers — ALWAYS visible even when empty */}
            <table className={styles.table} aria-label={`${title} records`}>
              <thead>
                <tr>
                  <th className={styles.thCheckbox} data-print-hide-cell>
                    {pagedData.length > 0 && (
                      <Checkbox
                        checked={allPageSelected ? true : selectedIds.size > 0 ? "mixed" : false}
                        onChange={toggleSelectAll}
                        size="medium"
                        aria-label="Select all rows on this page"
                      />
                    )}
                  </th>
                  {renderExpanded && <th className={styles.expandTh} data-print-hide-cell />}
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      className={mergeClasses(
                        styles.th,
                        col.sortable !== false && styles.thSortable
                      )}
                      style={{
                        width: `${columnWidths[col.key] ?? 150}px`,
                        ...(dragOverColKey === col.key ? { borderLeft: "2px solid #0078d4" } : undefined),
                        ...(dragColKey === col.key ? { opacity: 0.4 } : undefined),
                      }}
                      aria-sort={sortCol === col.key ? (sortAsc ? "ascending" : "descending") : (col.sortable !== false ? "none" : undefined)}
                      onClick={() =>
                        col.sortable !== false && handleSort(col.key)
                      }
                      draggable
                      onDragStart={(e) => handleColumnDragStart(col.key, e)}
                      onDragOver={(e) => handleColumnDragOver(col.key, e)}
                      onDrop={(e) => handleColumnDrop(col.key, e)}
                      onDragEnd={handleColumnDragEnd}
                    >
                      <span className={styles.thContent}>
                        {col.header}
                        {col.sortable !== false && (
                          sortCol === col.key ? (
                            sortAsc ? (
                              <ArrowSortUpRegular className={styles.sortIcon} />
                            ) : (
                              <ArrowSortDownRegular className={styles.sortIcon} />
                            )
                          ) : (
                            <ChevronDown16Regular className={styles.sortIcon} style={{ fontSize: 10, opacity: 0.5 }} />
                          )
                        )}
                      </span>
                      <div
                        className={styles.resizeHandle}
                        onMouseDown={(e) => handleResizeStart(col.key, e)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              {pagedData.length > 0 && (
                <tbody>
                  {pagedData.map((row, i) => {
                    const rowId = String((row as Record<string, unknown>)[idField]) || String(i);
                    const isExpanded = expandedRowId === rowId;
                    return (
                      <React.Fragment key={rowId}>
                        <tr
                          className={mergeClasses(
                            styles.row,
                            selectedIds.has(rowId) && styles.rowSelected,
                            focusedRow === i && styles.rowFocused
                          )}
                          onClick={(e) => {
                            setFocusedRow(i);
                            if (e.shiftKey && lastClickedIndex.current >= 0) {
                              // Range selection
                              const from = Math.min(lastClickedIndex.current, i);
                              const to = Math.max(lastClickedIndex.current, i);
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                for (let ri = from; ri <= to; ri++) {
                                  const rid = String((pagedData[ri] as Record<string, unknown>)[idField]);
                                  next.add(rid);
                                }
                                return next;
                              });
                            } else {
                              toggleSelect(rowId);
                              lastClickedIndex.current = i;
                            }
                          }}
                          onDoubleClick={() =>
                            navigate(`${entityPath}/${(row as Record<string, unknown>)[idField]}`)
                          }
                          onContextMenu={(e) => handleContextMenu(rowId, e)}
                        >
                          <td className={styles.tdCheckbox} data-print-hide-cell>
                            <Checkbox
                              checked={selectedIds.has(rowId)}
                              size="medium"
                              aria-label={`Select row ${i + 1}`}
                            />
                          </td>
                          {renderExpanded && (
                            <td className={styles.expandTd} data-print-hide-cell>
                              <span
                                className={styles.expandChevron}
                                style={isExpanded ? { transform: "rotate(90deg)" } : undefined}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedRowId(isExpanded ? null : rowId);
                                }}
                                title={isExpanded ? "Collapse" : "Expand"}
                              >
                                <ChevronRight16Regular />
                              </span>
                            </td>
                          )}
                          {visibleColumns.map((col, ci) => {
                            const rawVal = (row as Record<string, unknown>)[col.key];
                            const isEditing = editingCell?.rowId === rowId && editingCell?.colKey === col.key;
                            return (
                              <td
                                key={col.key}
                                className={isEditing ? styles.inlineEditCell : styles.td}
                                style={{ width: `${columnWidths[col.key] ?? 150}px` }}
                                title={!isEditing ? String(rawVal ?? "") : undefined}
                                onDoubleClick={(e) => {
                                  if (ci > 0 && col.editable && onInlineEdit) {
                                    e.stopPropagation();
                                    startInlineEdit(rowId, col.key, rawVal);
                                  }
                                }}
                              >
                                {isEditing ? (
                                  col.dataType === "optionset" && col.editOptions ? (
                                    <select
                                      ref={(el) => { editInputRef.current = el; }}
                                      className={styles.inlineSelect}
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell((prev) => prev ? { ...prev, value: e.target.value } : null)}
                                      onBlur={commitInlineEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") commitInlineEdit();
                                        else if (e.key === "Escape") cancelInlineEdit();
                                      }}
                                    >
                                      <option value="">---</option>
                                      {col.editOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                  ) : col.dataType === "boolean" ? (
                                    <select
                                      ref={(el) => { editInputRef.current = el; }}
                                      className={styles.inlineSelect}
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell((prev) => prev ? { ...prev, value: e.target.value } : null)}
                                      onBlur={commitInlineEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") commitInlineEdit();
                                        else if (e.key === "Escape") cancelInlineEdit();
                                      }}
                                    >
                                      <option value="true">Yes</option>
                                      <option value="false">No</option>
                                    </select>
                                  ) : (
                                    <input
                                      ref={(el) => { editInputRef.current = el; }}
                                      className={styles.inlineInput}
                                      type={col.dataType === "number" || col.dataType === "money" ? "number" : col.dataType === "date" ? "date" : "text"}
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell((prev) => prev ? { ...prev, value: e.target.value } : null)}
                                      onBlur={commitInlineEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") commitInlineEdit();
                                        else if (e.key === "Escape") cancelInlineEdit();
                                      }}
                                    />
                                  )
                                ) : col.key === columns[0]?.key ? (
                                  <span
                                    className={styles.primaryLink}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`${entityPath}/${(row as Record<string, unknown>)[idField]}`);
                                    }}
                                  >
                                    {col.render
                                      ? col.render(row)
                                      : String(rawVal ?? "")}
                                  </span>
                                ) : col.dataType === "lookup" && col.lookupEntityPath && rawVal ? (
                                  <span
                                    className={styles.primaryLink}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`${col.lookupEntityPath}/${rawVal}`);
                                    }}
                                  >
                                    {col.render ? col.render(row) : String(rawVal ?? "")}
                                  </span>
                                ) : col.render ? (
                                  col.render(row)
                                ) : (
                                  (() => {
                                    // Smart rendering for columns without explicit render functions
                                    const rec = row as Record<string, unknown>;
                                    // Lookup columns: show the formatted display name from OData annotation
                                    if (col.dataType === "lookup") {
                                      const formatted = rec[`${col.key}@OData.Community.Display.V1.FormattedValue`];
                                      return String(formatted ?? rawVal ?? "");
                                    }
                                    // Optionset columns: show the formatted label
                                    if (col.dataType === "optionset") {
                                      const formatted = rec[`${col.key}@OData.Community.Display.V1.FormattedValue`];
                                      return String(formatted ?? rawVal ?? "");
                                    }
                                    // Date columns: format nicely
                                    if (col.dataType === "date" && rawVal) {
                                      try { return new Date(String(rawVal)).toLocaleDateString(); } catch { /* fall through */ }
                                    }
                                    // Money columns: format with $
                                    if (col.dataType === "money" && rawVal != null) {
                                      return `$${Number(rawVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                    }
                                    return String(rawVal ?? "");
                                  })()
                                )}
                              </td>
                            );
                          })}
                        </tr>
                        {isExpanded && renderExpanded && (
                          <tr className={styles.expandedRow}>
                            <td
                              className={styles.expandedCell}
                              colSpan={visibleColumns.length + 2}
                            >
                              {renderExpanded(row)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              )}
            </table>

            {/* Empty state — shown below the headers */}
            {pagedData.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconCircle}>
                  <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                    {/* Rounded container for the grid */}
                    <rect x="12" y="24" width="76" height="68" rx="6" fill="rgba(255,255,255,0.15)" />
                    {/* 3x3 grid of white rounded tiles */}
                    {/* Row 1 */}
                    <rect x="16" y="28" width="22" height="18" rx="3" fill="#fff" opacity="0.95" />
                    <rect x="42" y="28" width="22" height="18" rx="3" fill="#fff" opacity="0.95" />
                    <rect x="68" y="28" width="22" height="18" rx="3" fill="#fff" opacity="0.95" />
                    {/* Row 2 */}
                    <rect x="16" y="50" width="22" height="18" rx="3" fill="#fff" opacity="0.95" />
                    <rect x="42" y="50" width="22" height="18" rx="3" fill="#fff" opacity="0.95" />
                    <rect x="68" y="50" width="22" height="18" rx="3" fill="#fff" opacity="0.95" />
                    {/* Row 3 */}
                    <rect x="16" y="72" width="22" height="16" rx="3" fill="#fff" opacity="0.9" />
                    <rect x="42" y="72" width="22" height="16" rx="3" fill="#fff" opacity="0.9" />
                    <rect x="68" y="72" width="22" height="16" rx="3" fill="#fff" opacity="0.9" />
                    {/* Sparkle decorations — white, upper area */}
                    <path d="M58 4L60.5 10L67 12.5L60.5 15L58 21L55.5 15L49 12.5L55.5 10Z" fill="#fff" opacity="0.9" />
                    <path d="M69 1L70.5 4.5L74 6L70.5 7.5L69 11L67.5 7.5L64 6L67.5 4.5Z" fill="#fff" opacity="0.7" />
                  </svg>
                </div>
                <span className={styles.emptyText}>
                  {emptyMessage || "We didn't find anything to show here"}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Jump Bar (A-Z) */}
      <div data-print-hide-grid style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "1px", padding: "2px 8px", backgroundColor: "#fff",
        borderTop: "1px solid #edebe9", flexShrink: 0, flexWrap: "wrap",
      }}>
        {["All", "#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map((letter) => {
          const isActive = letter === "All" ? !jumpLetter : jumpLetter === letter;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => { setJumpLetter(letter === "All" ? null : letter); setPage(0); }}
              style={{
                padding: "1px 4px", fontSize: "11px", fontWeight: isActive ? 600 : 400,
                color: isActive ? "#0078d4" : "#605e5c", backgroundColor: isActive ? "#deecf9" : "transparent",
                border: "none", borderRadius: "2px", cursor: "pointer", minWidth: "18px",
                lineHeight: "18px",
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Footer — always visible (hidden in print) */}
      <div className={styles.footer} data-print-hide-grid>
        <span>{page * pageSize + 1} - {Math.min((page + 1) * pageSize, rowCount)} of {rowCount}{selectedIds.size > 0 ? ` (${selectedIds.size} selected)` : ""}</span>
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Button
              size="small"
              appearance="subtle"
              icon={<ChevronLeftRegular />}
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            />
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <Button
              size="small"
              appearance="subtle"
              icon={<ChevronRightRegular />}
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            />
          </div>
        )}
      </div>

      {/* Edit Columns Panel */}
      <EditColumnsPanel
        open={editColumnsOpen}
        entityName={title}
        columns={editColumnItems}
        allColumns={allColumnItems}
        onApply={handleEditColumnsApply}
        onCancel={() => setEditColumnsOpen(false)}
      />

      {/* Edit Filters Panel */}
      <EditFiltersPanel
        open={editFiltersOpen}
        entityName={title}
        columns={filterColumns}
        onApply={(conditions) => {
          setActiveFilters(conditions);
          setEditFiltersOpen(false);
          setPage(0);
        }}
        onCancel={() => setEditFiltersOpen(false)}
      />

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
          aria-label="Row actions"
        >
          <div
            className={styles.contextMenuItem}
            role="menuitem"
            onClick={() => {
              navigate(`${entityPath}/${contextMenu.rowId}`);
              setContextMenu(null);
            }}
          >
            Open
          </div>
          <div
            className={styles.contextMenuItem}
            role="menuitem"
            onClick={() => {
              window.open(`${window.location.origin}${window.location.pathname}#${entityPath}/${contextMenu.rowId}`, "_blank");
              setContextMenu(null);
            }}
          >
            Open in new window
          </div>
          <div className={styles.contextMenuDivider} role="separator" />
          <div
            className={styles.contextMenuItem}
            role="menuitem"
            onClick={() => {
              onRowAction?.("delete", contextMenu.rowId);
              setContextMenu(null);
            }}
          >
            Delete
          </div>
          <div
            className={styles.contextMenuItem}
            role="menuitem"
            onClick={() => {
              onRowAction?.("assign", contextMenu.rowId);
              setContextMenu(null);
            }}
          >
            Assign
          </div>
          {(() => {
            const ctxRow = data?.find((r) => (r as Record<string, unknown>)[idField] === contextMenu.rowId);
            const isActive = ctxRow && getRowActive ? getRowActive(ctxRow) : true;
            return (
              <div
                className={styles.contextMenuItem}
                role="menuitem"
                onClick={() => {
                  onRowAction?.(isActive ? "deactivate" : "activate", contextMenu.rowId);
                  setContextMenu(null);
                }}
              >
                {isActive ? "Deactivate" : "Activate"}
              </div>
            );
          })()}
          <div className={styles.contextMenuDivider} role="separator" />
          <div
            className={styles.contextMenuItem}
            role="menuitem"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}${window.location.pathname}#${entityPath}/${contextMenu.rowId}`
              );
              setContextMenu(null);
            }}
          >
            Copy a link
          </div>
          <div
            className={styles.contextMenuItem}
            role="menuitem"
            onClick={() => {
              navigator.clipboard.writeText(
                `${entityPath}/${contextMenu.rowId}: ${window.location.origin}${window.location.pathname}#${entityPath}/${contextMenu.rowId}`
              );
              setContextMenu(null);
            }}
          >
            Email a link
          </div>
        </div>
      )}
    </div>
  );
}
