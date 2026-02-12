import { useState, useEffect } from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Select,
  Input,
  Checkbox,
  Spinner,
} from "@fluentui/react-components";

export interface BulkEditField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "date" | "money";
  options?: Array<{ value: string | number; label: string }>;
}

interface BulkEditDialogProps {
  open: boolean;
  entityName: string;
  selectedCount: number;
  fields: BulkEditField[];
  onApply: (fieldKey: string, value: unknown) => Promise<void>;
  onCancel: () => void;
}

export function BulkEditDialog({
  open,
  entityName,
  selectedCount,
  fields,
  onApply,
  onCancel,
}: BulkEditDialogProps) {
  const [selectedField, setSelectedField] = useState("");
  const [fieldValue, setFieldValue] = useState<unknown>("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedField("");
      setFieldValue("");
      setApplying(false);
      setError(null);
    }
  }, [open]);

  const currentField = fields.find((f) => f.key === selectedField);

  const handleApply = async () => {
    if (!selectedField || !currentField) return;
    setApplying(true);
    setError(null);
    try {
      let coerced: unknown = fieldValue;
      if (currentField.type === "number" || currentField.type === "money") {
        coerced = fieldValue === "" ? null : Number(fieldValue);
      } else if (currentField.type === "select") {
        coerced = fieldValue === "" ? null : isNaN(Number(fieldValue)) ? fieldValue : Number(fieldValue);
      } else if (currentField.type === "boolean") {
        coerced = fieldValue === 1 || fieldValue === true || fieldValue === "1";
      }
      await onApply(selectedField, coerced);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply changes");
      setApplying(false);
    }
  };

  const renderValueInput = () => {
    if (!currentField) return null;

    switch (currentField.type) {
      case "select":
        return (
          <Select
            value={String(fieldValue ?? "")}
            onChange={(_, d) => setFieldValue(d.value)}
            appearance="outline"
          >
            <option value="">---</option>
            {currentField.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        );
      case "boolean":
        return (
          <Checkbox
            checked={fieldValue === 1 || fieldValue === true}
            onChange={(_, d) => setFieldValue(d.checked ? 1 : 0)}
            label={currentField.label}
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={String(fieldValue ?? "")}
            onChange={(_, d) => setFieldValue(d.value)}
            appearance="outline"
          />
        );
      case "money":
        return (
          <Input
            type="number"
            value={String(fieldValue ?? "")}
            onChange={(_, d) => setFieldValue(d.value)}
            contentBefore={<span>$</span>}
            appearance="outline"
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={String(fieldValue ?? "")}
            onChange={(_, d) => setFieldValue(d.value)}
            appearance="outline"
          />
        );
      default:
        return (
          <Input
            value={String(fieldValue ?? "")}
            onChange={(_, d) => setFieldValue(d.value)}
            appearance="outline"
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => { if (!data.open && !applying) onCancel(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Edit {selectedCount} {entityName}{selectedCount !== 1 ? "s" : ""}</DialogTitle>
          <DialogContent>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: "360px" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#605e5c" }}>
                Choose a field to update across all {selectedCount} selected record{selectedCount !== 1 ? "s" : ""}.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#323130" }}>Field</label>
                <Select
                  value={selectedField}
                  onChange={(_, d) => {
                    setSelectedField(d.value);
                    setFieldValue("");
                  }}
                  appearance="outline"
                >
                  <option value="">Select a field...</option>
                  {fields.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </Select>
              </div>
              {currentField && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#323130" }}>New Value</label>
                  {renderValueInput()}
                </div>
              )}
              {error && (
                <div style={{ padding: "8px 12px", backgroundColor: "#fde7e9", borderLeft: "4px solid #d13438", borderRadius: "2px", fontSize: "13px", color: "#a4262c" }}>
                  {error}
                </div>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel} disabled={applying}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleApply}
              disabled={applying || !selectedField}
            >
              {applying ? <Spinner size="tiny" /> : `Apply to ${selectedCount} record${selectedCount !== 1 ? "s" : ""}`}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
