/** GUID format validation (for URL param safety) */
export const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** App-level constants (would be environment variables in production) */
export const APP_CONFIG = {
  DEFAULT_PAGE_SIZE: 50,
  TIME_ENTRY_MIN_DURATION: 0.25,
  TIME_ENTRY_MAX_DURATION: 24,
  RECENT_DAYS_FILTER: 30,
} as const;

/** Badge color mappings for option sets */
export const STATUS_COLORS = {
  // pic_projectstatus
  project: {
    10000: { bg: "#deecf9", fg: "#0078d4", label: "Planning" },
    10001: { bg: "#dff6dd", fg: "#107c10", label: "Active" },
    10002: { bg: "#fff4ce", fg: "#ffb900", label: "On Hold" },
    10003: { bg: "#dff6dd", fg: "#107c10", label: "Completed" },
    10004: { bg: "#fde7e9", fg: "#d13438", label: "Cancelled" },
  },
  // pic_priority
  priority: {
    10000: { bg: "#edebe9", fg: "#797775", label: "Low" },
    10001: { bg: "#deecf9", fg: "#0078d4", label: "Medium" },
    10002: { bg: "#fff4ce", fg: "#ffb900", label: "High" },
    10003: { bg: "#fde7e9", fg: "#d13438", label: "Critical" },
  },
  // pic_taskstatus
  task: {
    10000: { bg: "#edebe9", fg: "#797775", label: "Not Started" },
    10001: { bg: "#deecf9", fg: "#0078d4", label: "In Progress" },
    10002: { bg: "#fde7e9", fg: "#d13438", label: "Blocked" },
    10003: { bg: "#dff6dd", fg: "#107c10", label: "Completed" },
    10004: { bg: "#fde7e9", fg: "#d13438", label: "Cancelled" },
  },
  // pic_teamrole
  role: {
    10000: { bg: "#deecf9", fg: "#0078d4", label: "Project Manager" },
    10001: { bg: "#dff6dd", fg: "#107c10", label: "Developer" },
    10002: { bg: "#e8deee", fg: "#8764b8", label: "Designer" },
    10003: { bg: "#fff4ce", fg: "#ffb900", label: "Tester" },
    10004: { bg: "#edebe9", fg: "#797775", label: "Business Analyst" },
    10005: { bg: "#deecf9", fg: "#005a9e", label: "Tech Lead" },
    10006: { bg: "#fde7e9", fg: "#d13438", label: "Scrum Master" },
  },
  // pic_risklevel
  risk: {
    10000: { bg: "#dff6dd", fg: "#107c10", label: "Low" },
    10001: { bg: "#fff4ce", fg: "#ffb900", label: "Medium" },
    10002: { bg: "#fff4ce", fg: "#da3b01", label: "High" },
    10003: { bg: "#fde7e9", fg: "#d13438", label: "Critical" },
  },
} as const;

/** Pre-computed select options from STATUS_COLORS (avoids re-creating on every render) */
function toOptions(group: Record<string, { label: string }>) {
  return Object.entries(group).map(([value, info]) => ({ value, label: info.label }));
}
export const STATUS_OPTIONS = {
  project: toOptions(STATUS_COLORS.project),
  priority: toOptions(STATUS_COLORS.priority),
  task: toOptions(STATUS_COLORS.task),
  role: toOptions(STATUS_COLORS.role),
  risk: toOptions(STATUS_COLORS.risk),
};

/** BPF stage definitions */
export const BPF_STAGES = [
  { value: 10000, label: "Initiation" },
  { value: 10001, label: "Planning" },
  { value: 10002, label: "Execution" },
  { value: 10003, label: "Monitoring" },
  { value: 10004, label: "Closure" },
] as const;
