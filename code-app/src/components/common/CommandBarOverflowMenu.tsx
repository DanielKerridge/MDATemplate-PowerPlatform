import {
  makeStyles,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from "@fluentui/react-components";
import {
  MoreHorizontalRegular,
  DocumentRegular,
  TableRegular,
  ArrowDownloadRegular,
} from "@fluentui/react-icons";

interface CommandBarOverflowMenuProps {
  onExportExcel?: () => void;
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
  btnIcon: {
    fontSize: "16px",
    color: "#605e5c",
    display: "flex",
  },
});

export function CommandBarOverflowMenu({ onExportExcel }: CommandBarOverflowMenuProps) {
  const styles = useStyles();

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <button className={styles.btn} type="button">
          <span className={styles.btnIcon}>
            <MoreHorizontalRegular />
          </span>
        </button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem icon={<DocumentRegular />} disabled>
            Run Report
          </MenuItem>
          <MenuItem icon={<TableRegular />} disabled>
            Excel Templates
          </MenuItem>
          <MenuItem
            icon={<ArrowDownloadRegular />}
            onClick={onExportExcel}
          >
            Export to Excel
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
