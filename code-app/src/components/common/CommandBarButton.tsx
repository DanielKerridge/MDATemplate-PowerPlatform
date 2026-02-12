import { mergeClasses, makeStyles } from "@fluentui/react-components";
import { ChevronDownRegular } from "@fluentui/react-icons";

interface CommandBarButtonProps {
  icon: React.ComponentType;
  label: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  danger?: boolean;
  hasDropdown?: boolean;
  active?: boolean;
  iconColor?: string;
  tooltip?: string;
}

const useStyles = makeStyles({
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "1px 12px",
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
  btnActive: {
    backgroundColor: "#edebe9",
  },
  btnIcon: {
    fontSize: "16px",
    color: "#605e5c",
    display: "flex",
  },
  btnIconPrimary: {
    color: "#107c10",
  },
  btnIconDanger: {
    color: "#d13438",
  },
  chevron: {
    fontSize: "8px",
    color: "#605e5c",
    marginLeft: "1px",
    display: "flex",
  },
});

export function CommandBarButton({
  icon: Icon,
  label,
  onClick,
  primary,
  disabled,
  danger,
  hasDropdown,
  active,
  iconColor,
  tooltip,
}: CommandBarButtonProps) {
  const styles = useStyles();

  return (
    <button
      className={mergeClasses(styles.btn, disabled && styles.btnDisabled, active && styles.btnActive)}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      type="button"
      title={tooltip}
    >
      <span
        className={mergeClasses(
          styles.btnIcon,
          primary && styles.btnIconPrimary,
          danger && styles.btnIconDanger
        )}
        style={iconColor ? { color: iconColor } : undefined}
      >
        <Icon />
      </span>
      {label && <span>{label}</span>}
      {hasDropdown && (
        <span className={styles.chevron}>
          <ChevronDownRegular />
        </span>
      )}
    </button>
  );
}
