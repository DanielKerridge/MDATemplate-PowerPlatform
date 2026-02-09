import { useNavigate } from "react-router-dom";
import { makeStyles, mergeClasses } from "@fluentui/react-components";
import {
  ArrowLeftRegular,
  AddRegular,
  DeleteRegular,
  ArrowSyncRegular,
  MoreHorizontalRegular,
  ShareRegular,
  ChevronDownRegular,
  DataBarVerticalRegular,
  EyeRegular,
  MailRegular,
  PlayRegular,
  DocumentRegular,
} from "@fluentui/react-icons";

export interface CommandBarAction {
  key: string;
  label: string;
  icon: typeof AddRegular;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  danger?: boolean;
  hasDropdown?: boolean;
}

interface EntityCommandBarProps {
  actions: CommandBarAction[];
  onRefresh?: () => void;
  onBack?: () => void;
  onDelete?: () => void;
  /** Show standard MDA decorative actions (default: true) */
  showMDAActions?: boolean;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    height: "40px",
    padding: "0 12px",
    backgroundColor: "#FFFFFF",
    flexShrink: 0,
    borderBottom: "1px solid #edebe9",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    cursor: "pointer",
    border: "none",
    backgroundColor: "transparent",
    color: "#242424",
    fontSize: "14px",
    whiteSpace: "nowrap",
    borderRadius: "2px",
    lineHeight: "1",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  btnDisabled: {
    color: "#a19f9d",
    cursor: "default",
    ":hover": {
      backgroundColor: "transparent",
    },
  },
  btnIcon: {
    fontSize: "16px",
    color: "#605e5c",
    display: "flex",
  },
  chevron: {
    fontSize: "8px",
    color: "#605e5c",
    marginLeft: "1px",
    display: "flex",
  },
  divider: {
    width: "1px",
    height: "20px",
    backgroundColor: "#d2d0ce",
    margin: "0 2px",
    flexShrink: 0,
  },
});

export function EntityCommandBar({
  actions,
  onRefresh,
  onBack,
  onDelete,
  showMDAActions = true,
}: EntityCommandBarProps) {
  const styles = useStyles();
  const navigate = useNavigate();

  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <div className={styles.root} role="toolbar">
      {/* Back */}
      <button className={styles.btn} onClick={handleBack} type="button">
        <span className={styles.btnIcon}><ArrowLeftRegular /></span>
      </button>

      <div className={styles.divider} />

      {/* Show Chart — appears active like MDA */}
      {showMDAActions && (
        <button className={styles.btn} type="button">
          <span className={styles.btnIcon}><DataBarVerticalRegular /></span>
          <span>Show Chart</span>
        </button>
      )}

      {/* Entity-specific actions */}
      {actions.map((action) => (
        <button
          key={action.key}
          className={mergeClasses(
            styles.btn,
            action.disabled && styles.btnDisabled
          )}
          onClick={action.disabled ? undefined : action.onClick}
          disabled={action.disabled}
          type="button"
        >
          <span className={styles.btnIcon}><action.icon /></span>
          <span>{action.label}</span>
          {action.hasDropdown && (
            <span className={styles.chevron}><ChevronDownRegular /></span>
          )}
        </button>
      ))}

      {/* Delete — appears active like MDA (enabled when onDelete provided) */}
      {showMDAActions && (
        <button
          className={styles.btn}
          onClick={onDelete ?? undefined}
          type="button"
        >
          <span className={styles.btnIcon}><DeleteRegular /></span>
          <span>Delete</span>
        </button>
      )}

      <div className={styles.divider} />

      {/* Refresh */}
      {onRefresh && (
        <button className={styles.btn} onClick={onRefresh} type="button">
          <span className={styles.btnIcon}><ArrowSyncRegular /></span>
          <span>Refresh</span>
        </button>
      )}

      {/* MDA standard actions — all appear active like real MDA */}
      {showMDAActions && (
        <>
          <button className={styles.btn} type="button">
            <span className={styles.btnIcon}><EyeRegular /></span>
            <span>Visualize this view</span>
          </button>
          <button className={styles.btn} type="button">
            <span className={styles.btnIcon}><MailRegular /></span>
            <span>Email a Link</span>
          </button>
          <button className={styles.btn} type="button">
            <span className={styles.btnIcon}><PlayRegular /></span>
            <span>Flow</span>
            <span className={styles.chevron}><ChevronDownRegular /></span>
          </button>
          <button className={styles.btn} type="button">
            <span className={styles.btnIcon}><DocumentRegular /></span>
            <span>Run Report</span>
            <span className={styles.chevron}><ChevronDownRegular /></span>
          </button>
        </>
      )}

      {/* Overflow */}
      <button className={styles.btn} type="button">
        <span className={styles.btnIcon}><MoreHorizontalRegular /></span>
      </button>

      <div className={styles.divider} />

      {/* Share */}
      {showMDAActions && (
        <button className={styles.btn} type="button">
          <span className={styles.btnIcon}><ShareRegular /></span>
          <span>Share</span>
        </button>
      )}
    </div>
  );
}
