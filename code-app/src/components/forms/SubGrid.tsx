import { useState, useMemo } from "react";
import { makeStyles, Input, Checkbox, Spinner } from "@fluentui/react-components";
import {
  AddRegular,
  OpenRegular,
  DeleteRegular,
  ArrowSyncRegular,
  SearchRegular,
  EditRegular,
  ArrowSortDownRegular,
  ArrowSortUpRegular,
} from "@fluentui/react-icons";

export interface SubGridColumn {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "right" | "center";
  render?: (row: Record<string, unknown>) => React.ReactNode;
}

interface SubGridProps {
  title: string;
  columns: SubGridColumn[];
  data: Record<string, unknown>[];
  idField: string;
  onRowClick?: (id: string) => void;
  onAdd?: () => void;
  onViewAll?: () => void;
  onDelete?: (ids: string[]) => void;
  onRefresh?: () => void;
  emptyMessage?: string;
  addLabel?: string;
  searchable?: boolean;
  selectable?: boolean;
  isLoading?: boolean;
}

const useStyles = makeStyles({
  root: {
    border: "1px solid #edebe9",
    borderRadius: "4px",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    padding: "4px 8px",
    borderBottom: "1px solid #edebe9",
    backgroundColor: "#fff",
    flexWrap: "wrap",
    minHeight: "36px",
  },
  toolbarTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#323130",
    marginRight: "8px",
  },
  toolbarBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 10px",
    border: "none",
    borderRadius: "2px",
    backgroundColor: "transparent",
    cursor: "pointer",
    fontSize: "12px",
    color: "#323130",
    fontFamily: "'Segoe UI', sans-serif",
    whiteSpace: "nowrap",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  toolbarBtnDisabled: {
    color: "#a19f9d",
    cursor: "default",
    ":hover": {
      backgroundColor: "transparent",
    },
  },
  toolbarDivider: {
    width: "1px",
    height: "20px",
    backgroundColor: "#d2d0ce",
    margin: "0 2px",
    flexShrink: 0,
  },
  searchBox: {
    marginLeft: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    color: "rgba(0,0,0,0.54)",
    fontSize: "12px",
    fontWeight: 600,
    borderBottom: "1px solid #edebe9",
    backgroundColor: "#fff",
    whiteSpace: "nowrap",
    userSelect: "none",
    cursor: "pointer",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  thSorted: {
    color: "#0078d4",
  },
  sortIcon: {
    marginLeft: "4px",
    fontSize: "10px",
    verticalAlign: "middle",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f3f2f1",
    color: "#323130",
    fontSize: "13px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    height: "42px",
    boxSizing: "border-box",
  },
  tdLink: {
    color: "#0078d4",
    cursor: "pointer",
    ":hover": {
      textDecoration: "underline",
    },
  },
  row: {
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
  rowClickable: {
    cursor: "pointer",
  },
  empty: {
    padding: "24px 12px",
    color: "#605e5c",
    fontSize: "13px",
    textAlign: "center",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 12px",
    borderTop: "1px solid #edebe9",
    backgroundColor: "#fff",
    fontSize: "12px",
    color: "#605e5c",
  },
  viewAllLink: {
    color: "#0078d4",
    fontSize: "12px",
    cursor: "pointer",
    ":hover": {
      textDecoration: "underline",
    },
  },
  checkCell: {
    width: "36px",
    padding: "4px 8px",
  },
});

export function SubGrid({
  title,
  columns,
  data,
  idField,
  onRowClick,
  onAdd,
  onViewAll,
  onDelete,
  onRefresh,
  emptyMessage,
  addLabel,
  searchable = true,
  selectable = true,
  isLoading = false,
}: SubGridProps) {
  const styles = useStyles();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (colKey: string) => {
    if (sortCol === colKey) {
      setSortAsc((prev) => !prev);
    } else {
      setSortCol(colKey);
      setSortAsc(true);
    }
  };

  // Simple client-side search filter + sort
  const filteredData = useMemo(() => {
    let result = data;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.key];
          if (val == null) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const av = a[sortCol] ?? "";
        const bv = b[sortCol] ?? "";
        const aStr = String(av);
        const bStr = String(bv);
        const aNum = Number(av);
        const bNum = Number(bv);
        let cmp: number;
        if (!isNaN(aNum) && !isNaN(bNum) && aStr !== "" && bStr !== "") {
          cmp = aNum - bNum;
        } else {
          cmp = aStr.localeCompare(bStr);
        }
        return sortAsc ? cmp : -cmp;
      });
    }
    return result;
  }, [data, searchText, columns, sortCol, sortAsc]);

  const allSelected = filteredData.length > 0 && filteredData.every((r) => selectedIds.has(String(r[idField])));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((r) => String(r[idField]))));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasSelection = selectedIds.size > 0;

  return (
    <div className={styles.root}>
      {/* Toolbar — MDA layout: title | actions | spacer | search + utility */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>{title}</span>
        <div className={styles.toolbarDivider} />
        {onAdd && (
          <button type="button" className={styles.toolbarBtn} onClick={onAdd}>
            <AddRegular style={{ fontSize: 12 }} />
            {addLabel ?? "New"}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className={`${styles.toolbarBtn}${!hasSelection ? ` ${styles.toolbarBtnDisabled}` : ""}`}
            disabled={!hasSelection}
            onClick={() => onDelete(Array.from(selectedIds))}
          >
            <DeleteRegular style={{ fontSize: 12 }} />
            Delete
          </button>
        )}
        {hasSelection && (
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => {
              if (onRowClick && selectedIds.size === 1) {
                onRowClick(Array.from(selectedIds)[0]);
              }
            }}
          >
            <EditRegular style={{ fontSize: 12 }} />
            Edit
          </button>
        )}
        <div style={{ flex: 1 }} />
        {searchable && (
          <Input
            size="small"
            placeholder="Filter by keyword"
            value={searchText}
            onChange={(_, d) => setSearchText(d.value)}
            contentBefore={<SearchRegular style={{ fontSize: 12, color: "#605e5c" }} />}
            appearance="outline"
            style={{ width: "160px" }}
          />
        )}
        {onRefresh && (
          <button type="button" className={styles.toolbarBtn} onClick={onRefresh}>
            <ArrowSyncRegular style={{ fontSize: 12 }} />
          </button>
        )}
        {onViewAll && (
          <button type="button" className={styles.toolbarBtn} onClick={onViewAll}>
            <OpenRegular style={{ fontSize: 12 }} />
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className={styles.empty}>
          <Spinner size="small" label="Loading records..." />
        </div>
      ) : filteredData.length === 0 ? (
        <div className={styles.empty}>
          {searchText ? "No matching records." : (emptyMessage ?? "No records found.")}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                {selectable && (
                  <th className={`${styles.th} ${styles.checkCell}`}>
                    <Checkbox
                      checked={allSelected}
                      onChange={toggleAll}
                      size="medium"
                    />
                  </th>
                )}
                {columns.map((col) => {
                  const isSorted = sortCol === col.key;
                  return (
                    <th
                      key={col.key}
                      className={`${styles.th}${isSorted ? ` ${styles.thSorted}` : ""}`}
                      style={{ textAlign: col.align ?? "left", width: col.width }}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.header}
                      {isSorted && (
                        <span className={styles.sortIcon}>
                          {sortAsc ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => {
                const rowId = String(row[idField]);
                const isSelected = selectedIds.has(rowId);
                return (
                  <tr
                    key={rowId}
                    className={`${styles.row}${isSelected ? ` ${styles.rowSelected}` : ""}${onRowClick ? ` ${styles.rowClickable}` : ""}`}
                  >
                    {selectable && (
                      <td className={`${styles.td} ${styles.checkCell}`} style={{ borderBottom: "1px solid #f3f2f1" }}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleRow(rowId)}
                          size="medium"
                        />
                      </td>
                    )}
                    {columns.map((col, ci) => (
                      <td
                        key={col.key}
                        className={styles.td}
                        style={{ textAlign: col.align ?? "left" }}
                        onClick={ci === 0 && onRowClick ? () => onRowClick(rowId) : undefined}
                      >
                        {ci === 0 && onRowClick ? (
                          <span className={styles.tdLink}>
                            {col.render ? col.render(row) : String(row[col.key] ?? "")}
                          </span>
                        ) : col.render ? (
                          col.render(row)
                        ) : (
                          String(row[col.key] ?? "")
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <span>1 - {filteredData.length} of {data.length}{hasSelection ? ` (${selectedIds.size} selected)` : ""}</span>
        {onViewAll && (
          <span className={styles.viewAllLink} onClick={onViewAll}>
            See all records
          </span>
        )}
      </div>
    </div>
  );
}
