import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  makeStyles,
  mergeClasses,
  Input,
  Spinner,
  Button,
  Checkbox,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from "@fluentui/react-components";
import {
  SearchRegular,
  ChevronDownRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  ArrowSortDownRegular,
  ArrowSortUpRegular,
  FilterRegular,
  TableRegular,
  GridRegular,
} from "@fluentui/react-icons";
import { APP_CONFIG } from "@/config/constants";

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
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
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  /* Filter bar */
  filterBar: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    gap: "16px",
    flexShrink: 0,
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
    fontWeight: 600,
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
  },
  searchContainer: {
    flexShrink: 0,
  },
  searchInput: {
    width: "200px",
  },
  /* Grid */
  gridContainer: {
    flex: 1,
    overflow: "auto",
    position: "relative",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  thCheckbox: {
    width: "40px",
    minWidth: "40px",
    maxWidth: "40px",
    textAlign: "center",
    padding: "0",
    height: "42px",
    backgroundColor: "#fff",
    borderBottom: "1px solid rgba(189,195,199,0.58)",
    position: "sticky" as const,
    top: 0,
    zIndex: 1,
  },
  tdCheckbox: {
    width: "40px",
    minWidth: "40px",
    maxWidth: "40px",
    textAlign: "center",
    padding: "0",
    height: "42px",
    borderBottom: "1px solid rgba(189,195,199,0.58)",
  },
  th: {
    textAlign: "left",
    padding: "0 12px",
    height: "42px",
    backgroundColor: "#fff",
    borderBottom: "1px solid rgba(189,195,199,0.58)",
    fontWeight: 400,
    color: "rgba(0,0,0,0.54)",
    fontSize: "14px",
    whiteSpace: "nowrap",
    userSelect: "none",
    position: "sticky",
    top: 0,
    zIndex: 1,
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
    gap: "2px",
  },
  sortIcon: {
    fontSize: "9px",
    color: "rgba(0,0,0,0.36)",
  },
  td: {
    padding: "0 12px",
    height: "42px",
    borderBottom: "1px solid rgba(189,195,199,0.58)",
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
  primaryLink: {
    color: "#0078d4",
    fontWeight: 600,
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
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    backgroundColor: "#f3f2f1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    fontSize: "48px",
    color: "#a19f9d",
  },
  emptyText: {
    color: "#605e5c",
    fontSize: "14px",
  },
  /* Footer */
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    borderTop: "1px solid #bdc3c7",
    backgroundColor: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    color: "rgba(0,0,0,0.38)",
    flexShrink: 0,
    height: "32px",
    borderRadius: "0",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  /* Loading */
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "48px",
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
}: EntityListViewProps<T>) {
  const styles = useStyles();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const pageSize = APP_CONFIG.DEFAULT_PAGE_SIZE;

  const activeViewLabel =
    views?.find((v) => v.key === activeView)?.label ?? title;

  // Client-side sort
  const sortedData = useMemo(() => {
    if (!data) return [];
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const va = (a as Record<string, unknown>)[sortCol] ?? "";
      const vb = (b as Record<string, unknown>)[sortCol] ?? "";
      const cmp = String(va).localeCompare(String(vb), undefined, {
        numeric: true,
      });
      return sortAsc ? cmp : -cmp;
    });
  }, [data, sortCol, sortAsc]);

  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const rowCount = totalCount ?? sortedData.length;

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
    onSearch?.(value);
  };

  const toggleSelect = (rowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const pageIds = pagedData.map((r) =>
    String((r as Record<string, unknown>)[idField])
  );
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  return (
    <div className={styles.root}>
      {/* Filter bar */}
      <div className={styles.filterBar}>
        {/* View selector */}
        {views && views.length > 1 ? (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button className={styles.viewTrigger} type="button">
                <span className={styles.viewName}>{activeViewLabel}</span>
                <ChevronDownRegular className={styles.viewChevron} />
              </button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {views.map((v) => (
                  <MenuItem key={v.key} onClick={() => onViewChange?.(v.key)}>
                    {v.label}
                  </MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
        ) : (
          <span className={styles.viewName}>{activeViewLabel}</span>
        )}

        {/* Spacer pushes right-side items */}
        <div style={{ flex: 1 }} />

        {/* Edit columns / Edit filters — right side like MDA */}
        <div className={styles.filterActions}>
          <button className={styles.filterBtn} type="button">
            <TableRegular className={styles.filterBtnIcon} />
            <span>Edit columns</span>
          </button>
          <button className={styles.filterBtn} type="button">
            <FilterRegular className={styles.filterBtnIcon} />
            <span>Edit filters</span>
          </button>
        </div>

        {/* Filter by keyword */}
        <div className={styles.searchContainer}>
          <Input
            className={styles.searchInput}
            contentBefore={<SearchRegular />}
            placeholder="Filter by keyword"
            size="small"
            value={searchText}
            onChange={(_, d) => handleSearch(d.value)}
            appearance="outline"
          />
        </div>
      </div>

      {/* Grid area */}
      <div className={styles.gridContainer}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner size="medium" label="Loading..." />
          </div>
        ) : (
          <>
            {/* Column headers — ALWAYS visible even when empty */}
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thCheckbox}>
                    <Checkbox
                      checked={allPageSelected ? true : selectedIds.size > 0 ? "mixed" : false}
                      onChange={toggleSelectAll}
                      size="medium"
                    />
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={mergeClasses(
                        styles.th,
                        col.sortable !== false && styles.thSortable
                      )}
                      style={{ width: col.width }}
                      onClick={() =>
                        col.sortable !== false && handleSort(col.key)
                      }
                    >
                      <span className={styles.thContent}>
                        {col.header}
                        {sortCol === col.key ? (
                          sortAsc ? (
                            <ArrowSortUpRegular className={styles.sortIcon} />
                          ) : (
                            <ArrowSortDownRegular className={styles.sortIcon} />
                          )
                        ) : (
                          <ChevronDownRegular className={styles.sortIcon} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              {pagedData.length > 0 && (
                <tbody>
                  {pagedData.map((row, i) => (
                    <tr
                      key={
                        String(
                          (row as Record<string, unknown>)[idField]
                        ) || String(i)
                      }
                      className={mergeClasses(
                        styles.row,
                        selectedIds.has(String((row as Record<string, unknown>)[idField])) && styles.rowSelected
                      )}
                      onClick={() =>
                        navigate(
                          `${entityPath}/${(row as Record<string, unknown>)[idField]}`
                        )
                      }
                    >
                      <td
                        className={styles.tdCheckbox}
                        onClick={(e) =>
                          toggleSelect(
                            String((row as Record<string, unknown>)[idField]),
                            e
                          )
                        }
                      >
                        <Checkbox
                          checked={selectedIds.has(
                            String((row as Record<string, unknown>)[idField])
                          )}
                          size="medium"
                        />
                      </td>
                      {columns.map((col, ci) => (
                        <td key={col.key} className={styles.td}>
                          {ci === 0 ? (
                            <span className={styles.primaryLink}>
                              {col.render
                                ? col.render(row)
                                : String(
                                    (row as Record<string, unknown>)[
                                      col.key
                                    ] ?? ""
                                  )}
                            </span>
                          ) : col.render ? (
                            col.render(row)
                          ) : (
                            String(
                              (row as Record<string, unknown>)[col.key] ?? ""
                            )
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>

            {/* Empty state — shown below the headers */}
            {pagedData.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconCircle}>
                  <GridRegular className={styles.emptyIcon} />
                </div>
                <span className={styles.emptyText}>
                  {emptyMessage || "We didn't find anything to show here"}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer — always visible */}
      <div className={styles.footer}>
        <span>Rows: {rowCount}</span>
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
    </div>
  );
}
