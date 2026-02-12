import { useState } from "react";
import { makeStyles, tokens, Text } from "@fluentui/react-components";
import { ChevronDownRegular, ChevronRightRegular } from "@fluentui/react-icons";

interface FormSectionProps {
  title: string;
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
  /** Start collapsed (default: false) */
  defaultCollapsed?: boolean;
}

const useStyles = makeStyles({
  section: {
    marginBottom: "16px",
    borderRadius: "4px",
    backgroundColor: tokens.colorNeutralBackground1,
    padding: "16px 20px 20px",
    boxShadow: "rgba(0,0,0,0.12) 0 0 2px 0, rgba(0,0,0,0.14) 0 2px 4px 0",
  },
  sectionCollapsed: {
    padding: "16px 20px",
  },
  sectionTitle: {
    paddingBottom: "12px",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    userSelect: "none",
  },
  sectionTitleCollapsed: {
    paddingBottom: "0",
    marginBottom: "0",
    borderBottom: "none",
  },
  chevron: {
    fontSize: "12px",
    color: "#605e5c",
    flexShrink: 0,
  },
  grid: {
    display: "grid",
    gap: "12px 24px",
  },
});

export function FormSection({ title, columns = 2, children, defaultCollapsed = false }: FormSectionProps) {
  const styles = useStyles();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`${styles.section}${collapsed ? ` ${styles.sectionCollapsed}` : ""}`}>
      <div
        className={`${styles.sectionTitle}${collapsed ? ` ${styles.sectionTitleCollapsed}` : ""}`}
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? (
          <ChevronRightRegular className={styles.chevron} />
        ) : (
          <ChevronDownRegular className={styles.chevron} />
        )}
        <Text size={400} weight="semibold">
          {title}
        </Text>
      </div>
      {!collapsed && (
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
