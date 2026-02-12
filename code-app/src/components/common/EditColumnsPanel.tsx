import { useState, useRef, useEffect } from "react";
import { makeStyles, Button } from "@fluentui/react-components";
import {
  DismissRegular,
  AddRegular,
  ArrowResetRegular,
  TextSortAscendingRegular,
  CalendarRegular,
  MoneyRegular,
  OptionsRegular,
  LinkRegular,
  NumberSymbolRegular,
  TextDescriptionRegular,
  ReOrderDotsVerticalRegular,
  SearchRegular,
} from "@fluentui/react-icons";

export interface EditColumnItem {
  key: string;
  header: string;
  /** Column data type for icon display */
  dataType?: "text" | "number" | "date" | "money" | "optionset" | "lookup" | "textarea" | "boolean";
}

interface EditColumnsPanelProps {
  open: boolean;
  entityName: string;
  columns: EditColumnItem[];
  /** All available columns (for the Add Columns picker) */
  allColumns?: EditColumnItem[];
  onApply: (columnKeys: string[]) => void;
  onCancel: () => void;
}

const DATA_TYPE_ICONS: Record<string, React.ElementType> = {
  text: TextSortAscendingRegular,
  number: NumberSymbolRegular,
  date: CalendarRegular,
  money: MoneyRegular,
  optionset: OptionsRegular,
  lookup: LinkRegular,
  textarea: TextDescriptionRegular,
  boolean: OptionsRegular,
};

const useStyles = makeStyles({
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  panel: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: "340px",
    backgroundColor: "#fff",
    boxShadow: "-4px 0 12px rgba(0,0,0,0.15)",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px 8px",
    borderBottom: "1px solid #edebe9",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#323130",
  },
  closeBtn: {
    cursor: "pointer",
    backgroundColor: "transparent",
    border: "none",
    padding: "4px",
    borderRadius: "2px",
    color: "#605e5c",
    display: "flex",
    alignItems: "center",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 20px",
    borderBottom: "1px solid #edebe9",
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    cursor: "pointer",
    backgroundColor: "transparent",
    border: "none",
    padding: "4px 8px",
    borderRadius: "2px",
    fontSize: "13px",
    color: "#0078d4",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  actionBtnDisabled: {
    color: "#a19f9d",
    cursor: "default",
    ":hover": {
      backgroundColor: "transparent",
    },
  },
  columnList: {
    flex: 1,
    overflow: "auto",
    padding: "0",
  },
  columnItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    borderBottom: "1px solid #f3f2f1",
    fontSize: "14px",
    color: "#323130",
    cursor: "grab",
    ":hover": {
      backgroundColor: "#faf9f8",
    },
  },
  columnIcon: {
    fontSize: "16px",
    color: "#605e5c",
    flexShrink: 0,
  },
  dragHandle: {
    fontSize: "16px",
    color: "#a19f9d",
    flexShrink: 0,
    cursor: "grab",
  },
  columnName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  removeBtn: {
    cursor: "pointer",
    backgroundColor: "transparent",
    border: "none",
    padding: "2px",
    borderRadius: "2px",
    color: "#a19f9d",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    opacity: 0,
    ":hover": {
      backgroundColor: "#f3f2f1",
      color: "#605e5c",
    },
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
    padding: "12px 20px",
    borderTop: "1px solid #edebe9",
  },
});

export function EditColumnsPanel({
  open,
  entityName,
  columns,
  allColumns,
  onApply,
  onCancel,
}: EditColumnsPanelProps) {
  const styles = useStyles();
  const [items, setItems] = useState<EditColumnItem[]>(columns);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const addSearchRef = useRef<HTMLInputElement>(null);

  // Sync items when panel opens (columns may have changed)
  if (open && !prevOpen) {
    setItems(columns);
    setShowAddPicker(false);
    setAddSearch("");
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  if (!open) return null;

  // Columns available to add (not currently in the list)
  const addableColumns = (allColumns ?? []).filter(
    (ac) => !items.some((i) => i.key === ac.key)
  );
  const canAdd = addableColumns.length > 0;

  const handleRemove = (key: string) => {
    // Don't allow removing the last column
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((c) => c.key !== key));
  };

  const handleAdd = (col: EditColumnItem) => {
    setItems((prev) => [...prev, col]);
  };

  const handleReset = () => {
    setItems(columns);
    setShowAddPicker(false);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newItems = [...items];
    const [dragged] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, dragged);
    setItems(newItems);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const getIcon = (dataType?: string) => {
    const Icon = DATA_TYPE_ICONS[dataType ?? "text"] ?? TextSortAscendingRegular;
    return <Icon className={styles.columnIcon} />;
  };

  return (
    <>
      <div className={styles.overlay} onMouseDown={onCancel} />
      <div className={styles.panel} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Edit columns: {entityName}</span>
          <button className={styles.closeBtn} onClick={onCancel} type="button">
            <DismissRegular style={{ fontSize: "16px" }} />
          </button>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.actionBtn}${!canAdd ? ` ${styles.actionBtnDisabled}` : ""}`}
            type="button"
            disabled={!canAdd}
            onClick={() => {
              setShowAddPicker((v) => !v);
              setAddSearch("");
              setTimeout(() => addSearchRef.current?.focus(), 50);
            }}
          >
            <AddRegular style={{ fontSize: "14px" }} />
            <span>Add columns</span>
          </button>
          <button className={styles.actionBtn} onClick={handleReset} type="button">
            <ArrowResetRegular style={{ fontSize: "14px" }} />
            <span>Reset to default</span>
          </button>
        </div>

        {/* Add columns picker */}
        {showAddPicker && addableColumns.length > 0 && (
          <div style={{
            borderBottom: "1px solid #edebe9",
            backgroundColor: "#faf9f8",
          }}>
            <div style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", gap: "8px" }}>
              <SearchRegular style={{ fontSize: "16px", color: "#605e5c" }} />
              <input
                ref={addSearchRef}
                type="text"
                placeholder="Search columns"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  backgroundColor: "transparent",
                  fontSize: "13px",
                  padding: "4px 0",
                  color: "#323130",
                }}
              />
              {addSearch && (
                <button
                  type="button"
                  onClick={() => setAddSearch("")}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#605e5c" }}
                >
                  <DismissRegular style={{ fontSize: "12px" }} />
                </button>
              )}
            </div>
            <div style={{ maxHeight: "180px", overflowY: "auto", padding: "0 12px 8px" }}>
              {addableColumns
                .filter((col) => !addSearch || col.header.toLowerCase().includes(addSearch.toLowerCase()))
                .map((col) => (
                <div
                  key={col.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#323130",
                    borderRadius: "2px",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#edebe9"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                  onClick={() => {
                    handleAdd(col);
                    const remaining = addableColumns.filter((ac) => ac.key !== col.key);
                    if (remaining.length === 0) setShowAddPicker(false);
                  }}
                >
                  {getIcon(col.dataType)}
                  <span style={{ flex: 1 }}>{col.header}</span>
                  <AddRegular style={{ fontSize: "12px", color: "#0078d4" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.columnList}>
          {items.map((col, i) => (
            <div
              key={col.key}
              className={styles.columnItem}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              style={{
                opacity: dragIndex === i ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                const removeBtn = e.currentTarget.querySelector("[data-remove]") as HTMLElement;
                if (removeBtn) removeBtn.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                const removeBtn = e.currentTarget.querySelector("[data-remove]") as HTMLElement;
                if (removeBtn) removeBtn.style.opacity = "0";
              }}
            >
              <ReOrderDotsVerticalRegular className={styles.dragHandle} />
              {getIcon(col.dataType)}
              <span className={styles.columnName}>{col.header}</span>
              <button
                data-remove
                className={styles.removeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(col.key);
                }}
                type="button"
              >
                <DismissRegular style={{ fontSize: "14px" }} />
              </button>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <Button
            appearance="primary"
            size="medium"
            onClick={() => onApply(items.map((c) => c.key))}
          >
            Apply
          </Button>
          <Button appearance="secondary" size="medium" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
}
