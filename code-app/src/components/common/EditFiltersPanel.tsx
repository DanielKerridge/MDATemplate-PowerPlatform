import { useState } from "react";
import { makeStyles, Button, Select, Input } from "@fluentui/react-components";
import { DismissRegular, AddRegular } from "@fluentui/react-icons";

export interface FilterColumn {
  key: string;
  header: string;
  dataType?: "text" | "number" | "date" | "money" | "optionset" | "lookup" | "boolean" | "textarea";
}

export interface FilterCondition {
  id: string;
  column: string;
  operator: string;
  value: string;
}

interface EditFiltersPanelProps {
  open: boolean;
  entityName: string;
  columns: FilterColumn[];
  onApply: (conditions: FilterCondition[]) => void;
  onCancel: () => void;
}

const OPERATORS: Record<string, Array<{ value: string; label: string }>> = {
  text: [
    { value: "contains", label: "Contains" },
    { value: "eq", label: "Equals" },
    { value: "neq", label: "Does not equal" },
    { value: "startswith", label: "Begins with" },
    { value: "endswith", label: "Ends with" },
  ],
  number: [
    { value: "eq", label: "Equals" },
    { value: "neq", label: "Does not equal" },
    { value: "gt", label: "Is greater than" },
    { value: "lt", label: "Is less than" },
    { value: "gte", label: "Is greater than or equal to" },
    { value: "lte", label: "Is less than or equal to" },
  ],
  date: [
    { value: "eq", label: "On" },
    { value: "gt", label: "After" },
    { value: "lt", label: "Before" },
  ],
  money: [
    { value: "eq", label: "Equals" },
    { value: "gt", label: "Is greater than" },
    { value: "lt", label: "Is less than" },
  ],
  optionset: [
    { value: "eq", label: "Equals" },
    { value: "neq", label: "Does not equal" },
  ],
  default: [
    { value: "contains", label: "Contains" },
    { value: "eq", label: "Equals" },
    { value: "neq", label: "Does not equal" },
  ],
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
    width: "380px",
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
  conditionList: {
    flex: 1,
    overflow: "auto",
    padding: "12px 20px",
  },
  condition: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    borderRadius: "4px",
    backgroundColor: "#faf9f8",
    border: "1px solid #edebe9",
    marginBottom: "8px",
    position: "relative",
  },
  conditionRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  conditionLabel: {
    fontSize: "12px",
    color: "#605e5c",
    fontWeight: 600,
    minWidth: "55px",
  },
  removeBtn: {
    position: "absolute",
    top: "8px",
    right: "8px",
    cursor: "pointer",
    backgroundColor: "transparent",
    border: "none",
    padding: "2px",
    borderRadius: "2px",
    color: "#a19f9d",
    display: "flex",
    alignItems: "center",
    ":hover": {
      backgroundColor: "#f3f2f1",
      color: "#d13438",
    },
  },
  emptyState: {
    padding: "40px 20px",
    textAlign: "center",
    color: "#605e5c",
    fontSize: "14px",
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

export function EditFiltersPanel({
  open,
  entityName,
  columns,
  onApply,
  onCancel,
}: EditFiltersPanelProps) {
  const styles = useStyles();
  const [conditions, setConditions] = useState<FilterCondition[]>([]);

  if (!open) return null;

  const addCondition = () => {
    const firstCol = columns[0];
    setConditions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        column: firstCol?.key ?? "",
        operator: "contains",
        value: "",
      },
    ]);
  };

  const updateCondition = (id: string, field: keyof FilterCondition, val: string) => {
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (field === "column") {
          const col = columns.find((col) => col.key === val);
          const ops = OPERATORS[col?.dataType ?? "default"] ?? OPERATORS.default;
          return { ...c, column: val, operator: ops[0].value, value: "" };
        }
        return { ...c, [field]: val };
      })
    );
  };

  const removeCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const clearAll = () => {
    setConditions([]);
  };

  const getOperators = (columnKey: string) => {
    const col = columns.find((c) => c.key === columnKey);
    return OPERATORS[col?.dataType ?? "default"] ?? OPERATORS.default;
  };

  return (
    <>
      <div className={styles.overlay} onMouseDown={onCancel} />
      <div className={styles.panel} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Edit filters: {entityName}</span>
          <button className={styles.closeBtn} onClick={onCancel} type="button">
            <DismissRegular style={{ fontSize: "16px" }} />
          </button>
        </div>

        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={addCondition} type="button">
            <AddRegular style={{ fontSize: "14px" }} />
            <span>Add condition</span>
          </button>
          {conditions.length > 0 && (
            <button className={styles.actionBtn} onClick={clearAll} type="button">
              <span>Clear all</span>
            </button>
          )}
        </div>

        <div className={styles.conditionList}>
          {conditions.length === 0 ? (
            <div className={styles.emptyState}>
              No filter conditions. Click &quot;Add condition&quot; to filter records.
            </div>
          ) : (
            conditions.map((cond, i) => (
              <div key={cond.id} className={styles.condition}>
                <button
                  className={styles.removeBtn}
                  onClick={() => removeCondition(cond.id)}
                  type="button"
                  title="Remove condition"
                >
                  <DismissRegular style={{ fontSize: "14px" }} />
                </button>
                {i > 0 && (
                  <div style={{ fontSize: "12px", color: "#0078d4", fontWeight: 600, marginBottom: "4px" }}>
                    AND
                  </div>
                )}
                <div className={styles.conditionRow}>
                  <span className={styles.conditionLabel}>Column</span>
                  <Select
                    size="small"
                    value={cond.column}
                    onChange={(_, d) => updateCondition(cond.id, "column", d.value)}
                    style={{ flex: 1 }}
                  >
                    {columns.map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.header}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className={styles.conditionRow}>
                  <span className={styles.conditionLabel}>Operator</span>
                  <Select
                    size="small"
                    value={cond.operator}
                    onChange={(_, d) => updateCondition(cond.id, "operator", d.value)}
                    style={{ flex: 1 }}
                  >
                    {getOperators(cond.column).map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className={styles.conditionRow}>
                  <span className={styles.conditionLabel}>Value</span>
                  <Input
                    size="small"
                    value={cond.value}
                    onChange={(_, d) => updateCondition(cond.id, "value", d.value)}
                    placeholder="Enter a value"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <Button
            appearance="primary"
            size="medium"
            onClick={() => onApply(conditions.filter((c) => c.value.trim() !== ""))}
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
