import { useState, useRef, useEffect } from "react";
import {
  makeStyles,
  tokens,
  Text,
  TabList,
  Tab,
  Spinner,
} from "@fluentui/react-components";
import { ChevronDownRegular, DismissRegular } from "@fluentui/react-icons";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";

export interface FormTab {
  key: string;
  label: string;
  content: React.ReactNode;
  /** If true, this tab appears under the "Related" dropdown instead of as a standalone tab */
  isRelated?: boolean;
  /** Optional icon component for Related dropdown items */
  icon?: React.ReactNode;
}

interface RecordFormProps {
  title: string;
  subtitle?: string;
  /** Color for entity initials circle (e.g., "#e3008c" for pink) */
  entityColor?: string;
  tabs: FormTab[];
  isLoading?: boolean;
  /** Extra content above tabs (e.g., BPF bar) */
  headerContent?: React.ReactNode;
  /** Show saving indicator */
  isSaving?: boolean;
  /** Show unsaved changes indicator (asterisk in title) */
  isDirty?: boolean;
  /** Status badge text and color */
  statusBadge?: { label: string; bg: string; fg: string };
  /** Available form names for the form selector dropdown */
  formOptions?: string[];
  /** Currently selected form name */
  activeForm?: string;
  /** Called when user picks a different form */
  onFormChange?: (formName: string) => void;
  /** When true, shows deactivated banner and makes form appear readonly */
  isDeactivated?: boolean;
  /** Current record ID for record navigation */
  currentRecordId?: string;
  /** Entity path prefix for navigation (e.g., "/projects") */
  entityPath?: string;
  /** Key fields to display in the header area (e.g., Created On, Modified On) */
  keyFields?: Array<{ label: string; value: string }>;
  /** Timestamp of last successful save (manual or autosave) */
  lastSavedAt?: Date | null;
  /** Form notification messages (shown as colored banners) */
  notifications?: Array<{
    id: string;
    message: string;
    type: "error" | "warning" | "info";
  }>;
  /** Called when user dismisses a notification */
  onDismissNotification?: (id: string) => void;
  /** Record info for footer (created/modified by and dates) */
  recordInfo?: {
    createdBy?: string;
    createdOn?: string;
    modifiedBy?: string;
    modifiedOn?: string;
  };
  /** Record set navigator items: list of records to navigate between */
  recordNavItems?: Array<{ id: string; name: string }>;
  /** Whether the record set panel is open (controlled from parent) */
  recordSetOpen?: boolean;
  /** Toggle callback for record set panel (controlled from parent) */
  onToggleRecordSet?: () => void;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#f3f2f1",
    margin: "0 -16px",
    padding: "0 16px",
  },
  headerArea: {
    backgroundColor: tokens.colorNeutralBackground1,
    padding: "16px 20px 0",
    borderRadius: "4px 4px 0 0",
    margin: "8px 0 0",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  },
  entityIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: "'Segoe UI', sans-serif",
    flexShrink: 0,
  },
  titleGroup: {
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
    fontSize: "12px",
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
  },
  subtitleClickable: {
    cursor: "pointer",
    ":hover": {
      color: "#323130",
    },
  },
  tabList: {
    paddingBottom: "5px",
  },
  tabContent: {
    flex: 1,
    overflow: "auto",
    padding: "12px 16px",
    margin: "0 -16px",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    padding: "48px",
  },
  relatedTrigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "transparent",
    fontSize: "1.143rem",
    lineHeight: "28px",
    fontFamily: "'Segoe UI', sans-serif",
    color: "#242424",
    position: "relative",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  relatedTriggerActive: {
    color: "#0078d4",
    ":after": {
      content: '""',
      position: "absolute",
      bottom: "-6px",
      left: "12px",
      right: "12px",
      height: "2px",
      backgroundColor: "#0078d4",
      borderRadius: "2px",
    },
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    width: "220px",
    backgroundColor: "#ffffff",
    border: "1px solid #bebebe",
    borderRadius: "2px",
    boxShadow: "0 6.4px 14.4px 0 rgba(0,0,0,0.13), 0 1.2px 3.6px 0 rgba(0,0,0,0.11)",
    padding: "4px 0",
    zIndex: 1000,
    marginTop: "4px",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#323130",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  formDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    width: "240px",
    backgroundColor: "#ffffff",
    border: "1px solid #bebebe",
    borderRadius: "2px",
    boxShadow: "0 6.4px 14.4px 0 rgba(0,0,0,0.13), 0 1.2px 3.6px 0 rgba(0,0,0,0.11)",
    padding: "4px 0",
    zIndex: 1000,
    marginTop: "2px",
  },
});

/** Generate 1-2 character initials from a title string */
function getInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

export function RecordForm({
  title,
  subtitle,
  entityColor = "#8764b8",
  tabs,
  isLoading,
  headerContent,
  isSaving,
  isDirty,
  statusBadge,
  formOptions,
  activeForm,
  onFormChange,
  isDeactivated,
  currentRecordId,
  entityPath,
  keyFields,
  lastSavedAt,
  notifications,
  onDismissNotification,
  recordInfo,
  recordNavItems,
  recordSetOpen,
  onToggleRecordSet,
}: RecordFormProps) {
  const styles = useStyles();
  const navigate = useNavigate();
  const addNotification = useAppStore((s) => s.addNotification);

  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? "");
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [formSelectorOpen, setFormSelectorOpen] = useState(false);
  const relatedRef = useRef<HTMLDivElement>(null);
  const formSelectorRef = useRef<HTMLSpanElement>(null);

  // Separate tabs into regular and related
  const regularTabs = tabs.filter((t) => !t.isRelated);
  const relatedTabs = tabs.filter((t) => t.isRelated);
  const hasRelated = relatedTabs.length > 0;

  // Check if active tab is a related tab
  const isRelatedActive = relatedTabs.some((t) => t.key === activeTab);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!relatedOpen && !formSelectorOpen) return;
    const handler = (e: MouseEvent) => {
      if (relatedOpen && relatedRef.current && !relatedRef.current.contains(e.target as Node)) {
        setRelatedOpen(false);
      }
      if (formSelectorOpen && formSelectorRef.current && !formSelectorRef.current.contains(e.target as Node)) {
        setFormSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [relatedOpen, formSelectorOpen]);

  if (isLoading) {
    return (
      <div className={styles.root}>
        <div className={styles.headerArea}>
          {/* Skeleton header */}
          <div className={styles.header}>
            <div className={styles.entityIcon} style={{ backgroundColor: "#edebe9", animation: "shimmer 1.5s infinite" }} />
            <div className={styles.titleGroup}>
              <div style={{ width: "220px", height: "20px", backgroundColor: "#edebe9", borderRadius: "4px", animation: "shimmer 1.5s infinite" }} />
              <div style={{ width: "120px", height: "14px", backgroundColor: "#edebe9", borderRadius: "4px", marginTop: "6px", animation: "shimmer 1.5s infinite", animationDelay: "0.1s" }} />
            </div>
          </div>
          {/* Skeleton tab bar */}
          <div style={{ display: "flex", gap: "16px", paddingTop: "12px", paddingBottom: "10px", borderBottom: `1px solid ${tokens.colorNeutralStroke2}` }}>
            <div style={{ width: "80px", height: "20px", backgroundColor: "#edebe9", borderRadius: "4px", animation: "shimmer 1.5s infinite", animationDelay: "0.2s" }} />
            <div style={{ width: "60px", height: "20px", backgroundColor: "#edebe9", borderRadius: "4px", animation: "shimmer 1.5s infinite", animationDelay: "0.25s" }} />
            <div style={{ width: "70px", height: "20px", backgroundColor: "#edebe9", borderRadius: "4px", animation: "shimmer 1.5s infinite", animationDelay: "0.3s" }} />
          </div>
        </div>
        {/* Skeleton form body */}
        <div style={{ padding: "16px 0" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "4px", padding: "20px", boxShadow: "rgba(0,0,0,0.12) 0 0 2px 0, rgba(0,0,0,0.14) 0 2px 4px 0" }}>
            {/* Section title */}
            <div style={{ width: "140px", height: "14px", backgroundColor: "#edebe9", borderRadius: "4px", marginBottom: "16px", animation: "shimmer 1.5s infinite", animationDelay: "0.35s" }} />
            {/* Field rows */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                <div style={{ width: "120px", height: "14px", backgroundColor: "#edebe9", borderRadius: "4px", flexShrink: 0, animation: "shimmer 1.5s infinite", animationDelay: `${0.4 + i * 0.08}s` }} />
                <div style={{ flex: 1, height: "32px", backgroundColor: "#edebe9", borderRadius: "4px", animation: "shimmer 1.5s infinite", animationDelay: `${0.44 + i * 0.08}s` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentTab = tabs.find((t) => t.key === activeTab) ?? tabs[0];
  const displayTitle = title;
  const hasFormSelector = formOptions && formOptions.length > 0;

  return (
    <div className={styles.root}>
      {/* Print header — only visible when printing */}
      <div className="print-header" style={{ display: "none" }}>
        <h1>{displayTitle}</h1>
        <div className="print-date">{subtitle} &middot; Printed on {new Date().toLocaleDateString()}</div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Record Set Navigator panel — full height from header top */}
        {recordSetOpen && recordNavItems && recordNavItems.length > 0 && (
          <div style={{
            width: "260px",
            flexShrink: 0,
            backgroundColor: "#fff",
            borderRight: "1px solid #edebe9",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid #edebe9",
              fontWeight: 600,
              fontSize: "14px",
              color: "#323130",
            }}>
              <span>Record Set</span>
              <button
                type="button"
                onClick={() => onToggleRecordSet?.()}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "24px", height: "24px", border: "none", borderRadius: "2px",
                  backgroundColor: "transparent", cursor: "pointer", color: "#605e5c",
                }}
              >
                <DismissRegular style={{ fontSize: 14 }} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              {recordNavItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => { onToggleRecordSet?.(); navigate(`${entityPath}/${item.id}`); }}
                  style={{
                    padding: "10px 16px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: item.id === currentRecordId ? "#0078d4" : "#323130",
                    fontWeight: item.id === currentRecordId ? 600 : 400,
                    backgroundColor: item.id === currentRecordId ? "#deecf9" : "transparent",
                    borderBottom: "1px solid #f3f2f1",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => { if (item.id !== currentRecordId) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f3f2f1"; }}
                  onMouseLeave={(e) => { if (item.id !== currentRecordId) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                >
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

      <div className={styles.headerArea}>
        <div className={styles.header}>
          <div className={styles.entityIcon} style={{ backgroundColor: entityColor }}>
            {getInitials(title)}
          </div>
          <div className={styles.titleGroup}>
            <div className={styles.titleRow}>
              <Text size={600} weight="semibold">{displayTitle}</Text>
              {isSaving ? (
                <Spinner size="tiny" label="Saving..." labelPosition="after" style={{ fontSize: "12px", color: "#605e5c" }} />
              ) : isDirty ? (
                <span style={{ fontSize: "14px", color: "#797775", fontWeight: 400 }}>
                  &middot; Unsaved changes
                </span>
              ) : !isLoading ? (
                <span style={{ fontSize: "14px", color: "#797775", fontWeight: 400 }}>
                  &middot; Saved
                </span>
              ) : null}
              {statusBadge && (
                <span style={{
                  backgroundColor: statusBadge.bg,
                  color: statusBadge.fg,
                  padding: "2px 8px",
                  borderRadius: "2px",
                  fontSize: "12px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}>
                  {statusBadge.label}
                </span>
              )}
              {/* Key fields inline (Created On / Modified On) */}
              {keyFields && keyFields.length > 0 && (
                <div data-print-hide style={{ display: "inline-flex", alignItems: "center", gap: "16px", marginLeft: "auto" }}>
                  {keyFields.map((kf) => (
                    <span key={kf.label} style={{ fontSize: "12px", color: "#605e5c" }}>
                      {kf.label}: <span style={{ color: "#323130" }}>{kf.value || "---"}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {subtitle && (
              <span
                ref={formSelectorRef}
                className={`${styles.subtitle}${hasFormSelector ? ` ${styles.subtitleClickable}` : ""}`}
                onClick={hasFormSelector ? () => setFormSelectorOpen((v) => !v) : undefined}
              >
                {subtitle}{activeForm ? ` · ${activeForm}` : ""}
                {hasFormSelector && (
                  <ChevronDownRegular style={{ fontSize: 10, marginLeft: "2px" }} />
                )}
                {formSelectorOpen && hasFormSelector && (
                  <div className={styles.formDropdown}>
                    {formOptions!.map((name) => (
                      <div
                        key={name}
                        className={styles.dropdownItem}
                        style={name === activeForm ? { fontWeight: 600, color: "#0078d4" } : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFormChange?.(name);
                          setFormSelectorOpen(false);
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Form notification banners */}
        {notifications && notifications.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", margin: "8px 0 0" }}>
            {notifications.map((n) => {
              const colors = n.type === "error"
                ? { bg: "#fde7e9", border: "#d13438", fg: "#a4262c", icon: "!" }
                : n.type === "warning"
                ? { bg: "#fff4ce", border: "#f7d87c", fg: "#835b00", icon: "\u26A0" }
                : { bg: "#deecf9", border: "#0078d4", fg: "#004578", icon: "\u2139" };
              return (
                <div key={n.id} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "6px 12px", backgroundColor: colors.bg,
                  borderLeft: `4px solid ${colors.border}`, borderRadius: "2px",
                  fontSize: "13px", color: colors.fg,
                }}>
                  <span style={{ fontWeight: 600, flexShrink: 0 }}>{colors.icon}</span>
                  <span style={{ flex: 1 }}>{n.message}</span>
                  {onDismissNotification && (
                    <button type="button" onClick={() => onDismissNotification(n.id)} style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: "20px", height: "20px", border: "none", borderRadius: "2px",
                      backgroundColor: "transparent", cursor: "pointer", color: colors.fg,
                      flexShrink: 0, padding: 0,
                    }}>
                      <DismissRegular style={{ fontSize: 12 }} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isDeactivated && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            margin: "8px 0 0",
            backgroundColor: "#fff4ce",
            border: "1px solid #f7d87c",
            borderRadius: "4px",
            fontSize: "13px",
            color: "#323130",
          }}>
            <span style={{ fontSize: "16px" }}>&#9432;</span>
            <span>This record is deactivated. To make changes, reactivate it.</span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-end", borderBottom: `1px solid ${tokens.colorNeutralStroke2}` }}>
          <TabList
            className={styles.tabList}
            selectedValue={isRelatedActive ? "__none__" : activeTab}
            onTabSelect={(_, d) => {
              const val = d.value as string;
              if (val !== "__none__") {
                setActiveTab(val);
              }
            }}
            size="small"
          >
            {regularTabs.map((tab) => (
              <Tab key={tab.key} value={tab.key} content={{ style: { fontSize: "1.143rem", lineHeight: "28px" } }}>
                {tab.label}
              </Tab>
            ))}
          </TabList>

          {/* Related dropdown */}
          {hasRelated && (
            <div ref={relatedRef} style={{ position: "relative", paddingBottom: "5px" }}>
              <button
                type="button"
                className={`${styles.relatedTrigger}${isRelatedActive ? ` ${styles.relatedTriggerActive}` : ""}`}
                onClick={() => setRelatedOpen((v) => !v)}
              >
                Related
                <ChevronDownRegular style={{ fontSize: 12 }} />
              </button>
              {relatedOpen && (
                <div className={styles.dropdown}>
                  {relatedTabs.map((tab) => (
                    <div
                      key={tab.key}
                      className={styles.dropdownItem}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        ...(tab.key === activeTab ? { fontWeight: 600, color: "#0078d4" } : undefined),
                      }}
                      onClick={() => {
                        setActiveTab(tab.key);
                        setRelatedOpen(false);
                      }}
                    >
                      {tab.icon && <span style={{ display: "flex", fontSize: "16px", flexShrink: 0 }}>{tab.icon}</span>}
                      {tab.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {headerContent}
      </div>

      <div key={activeTab} className={styles.tabContent} style={{ flex: 1 }}>{currentTab?.content}</div>

      {/* Record info footer */}
      {recordInfo && (recordInfo.createdBy || recordInfo.modifiedBy) && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "6px 20px",
          backgroundColor: "#faf9f8",
          borderTop: "1px solid #edebe9",
          fontSize: "12px",
          color: "#605e5c",
          flexShrink: 0,
          borderRadius: "0 0 4px 4px",
          flexWrap: "wrap",
        }}>
          {recordInfo.createdBy && (
            <span>Created by <strong style={{ fontWeight: 600, color: "#323130" }}>{recordInfo.createdBy}</strong>{recordInfo.createdOn ? ` on ${recordInfo.createdOn}` : ""}</span>
          )}
          {recordInfo.modifiedBy && (
            <>
              <span style={{ color: "#c8c6c4" }}>|</span>
              <span>Modified by <strong style={{ fontWeight: 600, color: "#323130" }}>{recordInfo.modifiedBy}</strong>{recordInfo.modifiedOn ? ` on ${recordInfo.modifiedOn}` : ""}</span>
            </>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
