import { useState, useRef, useEffect, useCallback } from "react";
import {
  Field,
  Input,
  Textarea,
  Select,
  SpinButton,
  makeStyles,
} from "@fluentui/react-components";
import { LockClosedRegular, SearchRegular, CalendarRegular, DismissRegular, TableSimpleRegular } from "@fluentui/react-icons";
import { LookupModal } from "./LookupModal";
import type { LookupTableOption } from "./LookupModal";

export interface LookupSearchResult {
  id: string;
  name: string;
}

export interface FormFieldProps {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  type?:
    | "text"
    | "number"
    | "date"
    | "datetime"
    | "money"
    | "decimal"
    | "textarea"
    | "select"
    | "boolean"
    | "spinner"
    | "readonly"
    | "lookup";
  options?: Array<{ value: string | number; label: string }>;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  prefix?: string;
  step?: number;
  min?: number;
  max?: number;
  /** Validation error message shown below the field */
  validationMessage?: string;
  /** For lookup fields: callback to navigate to the related record */
  onLookupNavigate?: () => void;
  /** For lookup fields: search callback that returns matching records */
  onLookupSearch?: (query: string) => Promise<LookupSearchResult[]>;
  /** For lookup fields: callback when a search result is selected */
  onLookupSelect?: (result: LookupSearchResult) => void;
  /** For lookup fields: callback to clear the lookup value */
  onLookupClear?: () => void;
  /** For lookup fields: callback to create a new record inline */
  onLookupNewRecord?: () => void;
  /** For lookup fields: multiple table options for the modal (e.g., "Team Members", "Users") */
  lookupTables?: LookupTableOption[];
  /** Whether this field has been modified since last save */
  isDirty?: boolean;
}

const useStyles = makeStyles({
  moneyInput: {
    width: "100%",
  },
});

const editableStyle = { borderRadius: "2px", backgroundColor: "transparent" };
const disabledStyle = { borderRadius: "2px", backgroundColor: "#f3f2f1" };

/** Date field that shows "---" placeholder when empty, matching MDA behavior */
function DateField({
  label,
  value,
  onChange,
  disabled,
  required,
  isDateTime,
  validationMessage,
}: {
  label: string;
  value: string;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  required?: boolean;
  isDateTime?: boolean;
  validationMessage?: string;
}) {
  const [focused, setFocused] = useState(false);
  const validationProps = validationMessage
    ? { validationMessage, validationState: "error" as const }
    : {};
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value != null && value !== "";
  const showNative = focused || hasValue;

  const trimmedValue = hasValue
    ? value.substring(0, isDateTime ? 16 : 10)
    : "";

  if (!showNative) {
    return (
      <Field label={label} required={required} orientation="horizontal" {...validationProps}>
        <Input
          value=""
          readOnly
          disabled={disabled}
          appearance="filled-lighter"
          placeholder="---"
          contentAfter={
            <CalendarRegular
              style={{ fontSize: 14, color: "#605e5c", cursor: "pointer" }}
              onClick={() => {
                setFocused(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            />
          }
          onClick={() => setFocused(true)}
          style={{ cursor: "pointer", ...disabled ? disabledStyle : editableStyle }}
        />
      </Field>
    );
  }

  return (
    <Field label={label} required={required} orientation="horizontal" {...validationProps}>
      <Input
        ref={inputRef}
        type={isDateTime ? "datetime-local" : "date"}
        value={trimmedValue}
        onChange={(_, d) => onChange(d.value)}
        disabled={disabled}
        appearance="filled-lighter"
        style={disabled ? disabledStyle : editableStyle}
        onBlur={() => {
          if (!hasValue) setFocused(false);
        }}
      />
    </Field>
  );
}

/** Lookup field with inline search dropdown, matching MDA behavior */
function LookupField({
  label,
  value,
  required,
  disabled,
  placeholder,
  validationMessage,
  onLookupNavigate,
  onLookupSearch,
  onLookupSelect,
  onLookupClear,
  onLookupNewRecord,
  lookupTables,
}: {
  label: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  validationMessage?: string;
  onLookupNavigate?: () => void;
  onLookupSearch?: (query: string) => Promise<LookupSearchResult[]>;
  onLookupSelect?: (result: LookupSearchResult) => void;
  onLookupClear?: () => void;
  onLookupNewRecord?: () => void;
  lookupTables?: LookupTableOption[];
}) {
  const validationProps = validationMessage
    ? { validationMessage, validationState: "error" as const }
    : {};
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<LookupSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const hasValue = value && value !== "";

  const doSearch = useCallback(
    async (query: string) => {
      if (!onLookupSearch || query.trim().length < 1) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const r = await onLookupSearch(query.trim());
        setResults(r);
      } catch (err) {
        console.error("Lookup search failed:", err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [onLookupSearch]
  );

  const handleSearchInput = useCallback(
    (val: string) => {
      setSearchText(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(val), 300);
    },
    [doSearch]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchText("");
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  // When opening search, load initial results
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setSearchText("");
    doSearch("");
  }, [doSearch]);

  if (hasValue && !searchOpen) {
    return (
      <Field label={label} required={required} orientation="horizontal" {...validationProps}>
        <div
          ref={containerRef}
          style={{
            display: "flex",
            alignItems: "center",
            height: "32px",
            borderBottom: "none",
            gap: "4px",
            paddingRight: "4px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              backgroundColor: "#e6f2fb",
              borderRadius: "3px",
              maxWidth: "calc(100% - 40px)",
              flex: "0 1 auto",
              minWidth: 0,
            }}
          >
            <TableSimpleRegular style={{ fontSize: 12, color: "#0078d4", flexShrink: 0 }} />
            <span
              style={{
                color: "#0078d4",
                cursor: "pointer",
                fontSize: "14px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onClick={onLookupNavigate}
              title={`Open ${value}`}
            >
              {value}
            </span>
            {onLookupClear && !disabled && (
              <DismissRegular
                style={{ fontSize: 10, color: "#605e5c", cursor: "pointer", flexShrink: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onLookupClear();
                }}
                title="Clear"
              />
            )}
          </div>
          <div style={{ flex: 1 }} />
          <SearchRegular
            style={{
              fontSize: 14,
              color: "#605e5c",
              cursor: onLookupSearch ? "pointer" : undefined,
              flexShrink: 0,
            }}
            onClick={onLookupSearch ? (e) => {
              e.stopPropagation();
              setModalOpen(true);
            } : undefined}
            title={onLookupSearch ? "Look up more records" : undefined}
          />
        </div>
        {onLookupSearch && onLookupSelect && (
          <LookupModal
            open={modalOpen}
            title={label}
            onSearch={onLookupSearch}
            onSelect={(r) => {
              onLookupSelect(r);
              setModalOpen(false);
            }}
            onClose={() => setModalOpen(false)}
            onNewRecord={onLookupNewRecord}
            tables={lookupTables}
          />
        )}
      </Field>
    );
  }

  if (searchOpen && onLookupSearch) {
    return (
      <Field label={label} required={required} orientation="horizontal" {...validationProps}>
        <div ref={containerRef} style={{ position: "relative" }}>
          <Input
            value={searchText}
            onChange={(_, d) => handleSearchInput(d.value)}
            placeholder={placeholder ?? (label ? `Look for ${label}` : "Search...")}
            appearance="filled-lighter"
            autoFocus
            style={editableStyle}
            contentAfter={<SearchRegular style={{ fontSize: 14, color: "#605e5c" }} />}
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              borderRadius: "0 0 4px 4px",
              zIndex: 100,
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {searching && (
              <div style={{ padding: "8px 12px", color: "#605e5c", fontSize: "13px" }}>
                Searching...
              </div>
            )}
            {!searching && results.length === 0 && searchText.trim().length > 0 && (
              <div style={{ padding: "8px 12px", color: "#605e5c", fontSize: "13px" }}>
                No results found
              </div>
            )}
            {!searching &&
              results.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#323130",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f3f2f1";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                  }}
                  onClick={() => {
                    onLookupSelect?.(r);
                    setSearchOpen(false);
                    setSearchText("");
                    setResults([]);
                  }}
                >
                  {r.name}
                </div>
              ))}
          </div>
        </div>
      </Field>
    );
  }

  // No value, no search capability — just show the placeholder input
  return (
    <Field label={label} required={required} orientation="horizontal" {...validationProps}>
      <Input
        value=""
        readOnly={!onLookupSearch}
        disabled={disabled}
        appearance="filled-lighter"
        placeholder={placeholder ?? (label ? `Look for ${label}` : "---")}
        contentAfter={
          <SearchRegular
            style={{ fontSize: 14, color: "#605e5c", cursor: onLookupSearch ? "pointer" : undefined }}
            onClick={onLookupSearch ? (e) => {
              e.stopPropagation();
              setModalOpen(true);
            } : undefined}
          />
        }
        onClick={onLookupSearch ? openSearch : undefined}
        style={{ cursor: onLookupSearch ? "pointer" : undefined, ...disabled ? disabledStyle : editableStyle }}
      />
      {onLookupSearch && onLookupSelect && (
        <LookupModal
          open={modalOpen}
          title={label}
          onSearch={onLookupSearch}
          onSelect={(r) => {
            onLookupSelect(r);
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
          onNewRecord={onLookupNewRecord}
          tables={lookupTables}
        />
      )}
    </Field>
  );
}

function FormFieldContent({
  label,
  value,
  onChange,
  type = "text",
  options,
  required,
  disabled,
  placeholder,
  prefix,
  step,
  min,
  max,
  validationMessage,
  onLookupNavigate,
  onLookupSearch,
  onLookupSelect,
  onLookupClear,
  onLookupNewRecord,
  lookupTables,
}: FormFieldProps) {
  const styles = useStyles();
  const strValue = value == null ? "" : String(value);
  const validationProps = validationMessage
    ? { validationMessage, validationState: "error" as const }
    : {};

  if (type === "readonly") {
    return (
      <Field label={label} required={required} orientation="horizontal" {...validationProps}>
        <Input
          value={strValue}
          readOnly
          appearance="filled-lighter"
          placeholder="---"
          contentBefore={<LockClosedRegular style={{ fontSize: 14, color: "#605e5c" }} />}
          style={{ backgroundColor: "transparent", borderRadius: "4px" }}
        />
      </Field>
    );
  }

  if (type === "lookup") {
    return (
      <LookupField
        label={label}
        value={strValue}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        validationMessage={validationMessage}
        onLookupNavigate={onLookupNavigate}
        onLookupSearch={onLookupSearch}
        onLookupSelect={onLookupSelect}
        onLookupClear={onLookupClear}
        onLookupNewRecord={onLookupNewRecord}
        lookupTables={lookupTables}
      />
    );
  }

  if (type === "boolean") {
    const boolVal = value === true || value === 1 || value === "1";
    return (
      <Field label={label} orientation="horizontal">
        <Select
          appearance="filled-lighter"
          value={value == null ? "" : boolVal ? "1" : "0"}
          onChange={(_, d) => onChange(d.value === "" ? null : Number(d.value))}
          disabled={disabled}
          style={disabled ? disabledStyle : editableStyle}
        >
          <option value="">---</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </Select>
      </Field>
    );
  }

  if (type === "select" && options) {
    return (
      <Field label={label} required={required} orientation="horizontal" {...validationProps}>
        <Select
          value={strValue}
          onChange={(_, d) => {
            const v = d.value;
            // Option sets are always numeric in Dataverse; coerce to number
            onChange(v === "" ? null : isNaN(Number(v)) ? v : Number(v));
          }}
          disabled={disabled}
          appearance="filled-lighter"
          style={disabled ? disabledStyle : editableStyle}
        >
          <option value="">---</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (type === "textarea") {
    return (
      <Field label={label} required={required} style={{ gridColumn: "1 / -1" }} {...validationProps}>
        <Textarea
          value={strValue}
          onChange={(_, d) => onChange(d.value)}
          disabled={disabled}
          placeholder={placeholder}
          rows={4}
          resize="vertical"
          appearance="outline"
          style={disabled ? disabledStyle : editableStyle}
        />
      </Field>
    );
  }

  if (type === "spinner" || type === "decimal") {
    return (
      <Field label={label} required={required} orientation="horizontal" {...validationProps}>
        <SpinButton
          value={value != null ? Number(value) : undefined}
          onChange={(_, d) => onChange(d.value == null ? null : d.value)}
          disabled={disabled}
          step={step ?? 1}
          min={min}
          max={max}
          appearance="filled-lighter"
          style={disabled ? disabledStyle : editableStyle}
        />
      </Field>
    );
  }

  if (type === "money") {
    return (
      <Field label={label} required={required} orientation="horizontal" {...validationProps}>
        <Input
          className={styles.moneyInput}
          value={strValue}
          onChange={(_, d) => onChange(d.value === "" ? null : Number(d.value))}
          disabled={disabled}
          contentBefore={<span>{prefix ?? "$"}</span>}
          type="number"
          placeholder="---"
          appearance="filled-lighter"
          style={disabled ? disabledStyle : editableStyle}
        />
      </Field>
    );
  }

  if (type === "date" || type === "datetime") {
    return (
      <DateField
        label={label}
        value={strValue}
        onChange={onChange}
        disabled={disabled}
        required={required}
        isDateTime={type === "datetime"}
        validationMessage={validationMessage}
      />
    );
  }

  if (type === "number") {
    return (
      <Field label={label} required={required} orientation="horizontal" {...validationProps}>
        <Input
          type="number"
          value={strValue}
          onChange={(_, d) => onChange(d.value === "" ? null : Number(d.value))}
          disabled={disabled}
          step={step}
          placeholder="---"
          appearance="filled-lighter"
          style={disabled ? disabledStyle : editableStyle}
        />
      </Field>
    );
  }

  // Default: text
  return (
    <Field label={label} required={required} orientation="horizontal" {...validationProps}>
      <Input
        value={strValue}
        onChange={(_, d) => onChange(d.value)}
        disabled={disabled}
        placeholder={placeholder ?? "---"}
        appearance="filled-lighter"
        style={disabled ? disabledStyle : editableStyle}
      />
    </Field>
  );
}

/** Wrapper that adds a blue left-border accent on dirty (modified) fields, matching MDA behavior.
 *  IMPORTANT: Always wraps in a <div> to keep DOM structure stable — prevents React from
 *  unmounting/remounting the input (which causes focus loss) when isDirty toggles. */
export function FormField({ isDirty, ...rest }: FormFieldProps) {
  const content = <FormFieldContent {...rest} />;
  const style: React.CSSProperties = {};
  if (isDirty) {
    style.borderLeft = "3px solid #0078d4";
    style.paddingLeft = "8px";
  }
  if (rest.type === "textarea") {
    style.gridColumn = "1 / -1";
  }
  return <div style={Object.keys(style).length > 0 ? style : undefined}>{content}</div>;
}
