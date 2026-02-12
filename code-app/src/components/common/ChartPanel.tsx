import { useMemo } from "react";
import { makeStyles } from "@fluentui/react-components";

interface ChartPanelProps {
  data: Record<string, unknown>[];
  statusField: string;
  labelMap?: Record<string, { label: string; color: string }>;
  visible: boolean;
}

const useStyles = makeStyles({
  root: {
    backgroundColor: "#fff",
    borderRadius: "4px",
    boxShadow: "rgba(0,0,0,0.12) 0px 0px 2px 0px, rgba(0,0,0,0.14) 0px 2px 4px 0px",
    margin: "8px 0 0",
    padding: "16px 24px",
    overflow: "hidden",
  },
  title: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#323130",
    marginBottom: "12px",
  },
  chartArea: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    height: "160px",
    padding: "0 4px",
  },
  barGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    minWidth: "40px",
    maxWidth: "80px",
  },
  bar: {
    width: "100%",
    borderRadius: "2px 2px 0 0",
    minHeight: "2px",
    transition: "height 0.3s ease",
  },
  barLabel: {
    fontSize: "11px",
    color: "#605e5c",
    marginTop: "6px",
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "80px",
  },
  barCount: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#323130",
    marginBottom: "4px",
  },
  empty: {
    padding: "24px 0",
    color: "#605e5c",
    fontSize: "13px",
    textAlign: "center",
  },
});

const DEFAULT_COLORS = [
  "#0078d4", "#107c10", "#d29200", "#d13438", "#5c2d91",
  "#008272", "#ca5010", "#004b50", "#881798", "#498205",
];

export function ChartPanel({ data, statusField, labelMap, visible }: ChartPanelProps) {
  const styles = useStyles();

  const groups = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of data) {
      const key = String(row[statusField] ?? "Unknown");
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).map(([key, count], i) => ({
      key,
      label: labelMap?.[key]?.label ?? key,
      color: labelMap?.[key]?.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      count,
    }));
  }, [data, statusField, labelMap]);

  const maxCount = Math.max(1, ...groups.map((g) => g.count));

  if (!visible) return null;

  return (
    <div className={styles.root}>
      <div className={styles.title}>Records by {statusField.replace(/^pic_/, "").replace(/([A-Z])/g, " $1").trim()}</div>
      {groups.length === 0 ? (
        <div className={styles.empty}>No data available</div>
      ) : (
        <div className={styles.chartArea}>
          {groups.map((g) => (
            <div key={g.key} className={styles.barGroup}>
              <span className={styles.barCount}>{g.count}</span>
              <div
                className={styles.bar}
                style={{
                  height: `${(g.count / maxCount) * 130}px`,
                  backgroundColor: g.color,
                }}
              />
              <span className={styles.barLabel} title={g.label}>{g.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
