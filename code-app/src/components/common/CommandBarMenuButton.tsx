import {
  makeStyles,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from "@fluentui/react-components";
import { ChevronDownRegular } from "@fluentui/react-icons";

export interface MenuItemDef {
  key: string;
  label: string;
  icon?: React.ComponentType;
  onClick: () => void;
  disabled?: boolean;
}

interface CommandBarMenuButtonProps {
  icon: React.ComponentType;
  label: string;
  items: MenuItemDef[];
  iconColor?: string;
  disabled?: boolean;
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
  menuIcon: {
    fontSize: "16px",
    display: "flex",
    marginRight: "4px",
  },
});

export function CommandBarMenuButton({
  icon: Icon,
  label,
  items,
  iconColor,
  disabled,
}: CommandBarMenuButtonProps) {
  const styles = useStyles();

  if (disabled) {
    return (
      <button className={`${styles.btn} ${styles.btnDisabled}`} type="button" disabled>
        <span className={styles.btnIcon} style={iconColor ? { color: iconColor } : undefined}>
          <Icon />
        </span>
        <span>{label}</span>
        <span className={styles.chevron}><ChevronDownRegular /></span>
      </button>
    );
  }

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <button className={styles.btn} type="button">
          <span className={styles.btnIcon} style={iconColor ? { color: iconColor } : undefined}>
            <Icon />
          </span>
          <span>{label}</span>
          <span className={styles.chevron}><ChevronDownRegular /></span>
        </button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {items.map((item) => (
            <MenuItem
              key={item.key}
              icon={item.icon ? <span className={styles.menuIcon}><item.icon /></span> : undefined}
              onClick={item.onClick}
              disabled={item.disabled}
            >
              {item.label}
            </MenuItem>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
