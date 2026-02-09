import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  makeStyles,
  mergeClasses,
} from "@fluentui/react-components";
import {
  ChevronDownRegular,
  ChevronUpRegular,
  ChevronUpDownRegular,
  HomeRegular,
  ClockRegular,
  PinRegular,
  NavigationRegular,
} from "@fluentui/react-icons";
import { NAVIGATION } from "@/config/navigation";

const NAV_WIDTH = 220;
const NAV_COLLAPSED_WIDTH = 48;
const NAV_BG = "#FFFFFF";
const NAV_HOVER = "#F5F5F5";
const NAV_ACTIVE_BG = "#FFFFFF";
const NAV_TEXT = "#242424";
const NAV_TEXT_DIM = "#616161";
const GROUP_HEADER = "#8A8886";
const AREA_BG = "#F5F5F5";
const ACTIVE_ACCENT = "#0078D4";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    width: `${NAV_WIDTH}px`,
    minWidth: `${NAV_WIDTH}px`,
    height: "100%",
    backgroundColor: NAV_BG,
    color: NAV_TEXT,
    userSelect: "none",
    overflow: "hidden",
    borderRight: "1px solid #E0E0E0",
    transitionProperty: "width, min-width",
    transitionDuration: "0.15s",
    transitionTimingFunction: "ease",
  },
  rootCollapsed: {
    width: `${NAV_COLLAPSED_WIDTH}px`,
    minWidth: `${NAV_COLLAPSED_WIDTH}px`,
  },
  hamburger: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "32px",
    cursor: "pointer",
    color: NAV_TEXT_DIM,
    margin: "2px 4px 0",
    borderRadius: "4px",
    flexShrink: 0,
    ":hover": {
      backgroundColor: NAV_HOVER,
      color: NAV_TEXT,
    },
  },
  hamburgerIcon: {
    fontSize: "18px",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    paddingTop: "0px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 16px",
    cursor: "pointer",
    color: NAV_TEXT_DIM,
    fontSize: "1rem",
    borderLeft: "3px solid transparent",
    transitionProperty: "background",
    transitionDuration: "0.1s",
    ":hover": {
      backgroundColor: NAV_HOVER,
      color: NAV_TEXT,
    },
  },
  navItemActive: {
    backgroundColor: NAV_ACTIVE_BG,
    color: NAV_TEXT,
    fontWeight: 600,
    borderLeftColor: ACTIVE_ACCENT,
  },
  navIcon: {
    fontSize: "16px",
    flexShrink: 0,
    color: NAV_TEXT_DIM,
  },
  navIconActive: {
    color: ACTIVE_ACCENT,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 16px",
    cursor: "pointer",
    color: NAV_TEXT_DIM,
    fontSize: "1rem",
    borderLeft: "3px solid transparent",
    ":hover": {
      backgroundColor: NAV_HOVER,
      color: NAV_TEXT,
    },
  },
  sectionLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  sectionChevron: {
    fontSize: "14px",
    color: "#A0A0A0",
  },
  emptyHint: {
    padding: "4px 16px 4px 42px",
    fontSize: "11px",
    color: "#A0A0A0",
    fontStyle: "italic",
  },
  separator: {
    height: "1px",
    backgroundColor: "#DCDCDC",
    margin: "4px 0",
  },
  groupHeader: {
    padding: "14px 16px 4px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.3px",
    color: GROUP_HEADER,
  },
  areaSwitcher: {
    borderTop: "1px solid #DCDCDC",
    backgroundColor: AREA_BG,
  },
  areaButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "10px 16px",
    cursor: "pointer",
    color: NAV_TEXT,
    fontSize: "1rem",
    fontWeight: 600,
    ":hover": {
      backgroundColor: NAV_HOVER,
    },
  },
  areaMenu: {
    borderTop: "1px solid #DCDCDC",
  },
  areaOption: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    cursor: "pointer",
    color: NAV_TEXT_DIM,
    fontSize: "1rem",
    ":hover": {
      backgroundColor: NAV_HOVER,
      color: NAV_TEXT,
    },
  },
  areaOptionActive: {
    color: NAV_TEXT,
    fontWeight: 600,
    backgroundColor: NAV_ACTIVE_BG,
  },
  labelHidden: {
    display: "none",
  },
});

export function LeftNav() {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [activeAreaKey, setActiveAreaKey] = useState("projects");
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);

  const currentArea =
    NAVIGATION.find((a) => a.key === activeAreaKey) ?? NAVIGATION[0];

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  return (
    <div className={mergeClasses(styles.root, collapsed && styles.rootCollapsed)}>
      {/* Hamburger toggle */}
      <div
        className={styles.hamburger}
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expand navigation" : "Collapse navigation"}
      >
        <NavigationRegular className={styles.hamburgerIcon} />
      </div>

      <div className={styles.content}>
        {/* Built-in: Home */}
        <div
          className={mergeClasses(
            styles.navItem,
            location.pathname === "/" && styles.navItemActive
          )}
          onClick={() => navigate("/")}
        >
          <HomeRegular
            className={mergeClasses(
              styles.navIcon,
              location.pathname === "/" && styles.navIconActive
            )}
          />
          <span className={collapsed ? styles.labelHidden : undefined}>Home</span>
        </div>

        {/* Built-in: Recent (collapsible) */}
        <div
          className={styles.sectionHeader}
          onClick={() => setRecentOpen(!recentOpen)}
        >
          <div className={styles.sectionLeft}>
            <ClockRegular className={styles.navIcon} />
            <span className={collapsed ? styles.labelHidden : undefined}>Recent</span>
          </div>
          {!collapsed && (recentOpen ? (
            <ChevronUpRegular className={styles.sectionChevron} />
          ) : (
            <ChevronDownRegular className={styles.sectionChevron} />
          ))}
        </div>
        {recentOpen && !collapsed && (
          <div className={styles.emptyHint}>No recent items</div>
        )}

        {/* Built-in: Pinned (collapsible) */}
        <div
          className={styles.sectionHeader}
          onClick={() => !collapsed && setPinnedOpen(!pinnedOpen)}
        >
          <div className={styles.sectionLeft}>
            <PinRegular className={styles.navIcon} />
            <span className={collapsed ? styles.labelHidden : undefined}>Pinned</span>
          </div>
          {!collapsed && (pinnedOpen ? (
            <ChevronUpRegular className={styles.sectionChevron} />
          ) : (
            <ChevronDownRegular className={styles.sectionChevron} />
          ))}
        </div>
        {pinnedOpen && !collapsed && (
          <div className={styles.emptyHint}>No pinned items</div>
        )}

        <div className={styles.separator} />

        {/* Area-specific navigation groups */}
        {currentArea.groups.map((group) => (
          <div key={group.key}>
            {!collapsed && <div className={styles.groupHeader}>{group.label}</div>}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <div
                  key={item.key}
                  className={mergeClasses(
                    styles.navItem,
                    active && styles.navItemActive
                  )}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={mergeClasses(
                      styles.navIcon,
                      active && styles.navIconActive
                    )}
                  />
                  <span className={collapsed ? styles.labelHidden : undefined}>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Area switcher at bottom */}
      <div className={styles.areaSwitcher}>
        {areaMenuOpen && !collapsed && (
          <div className={styles.areaMenu}>
            {NAVIGATION.map((area) => {
              const Icon = area.icon;
              return (
                <div
                  key={area.key}
                  className={mergeClasses(
                    styles.areaOption,
                    activeAreaKey === area.key && styles.areaOptionActive
                  )}
                  onClick={() => {
                    setActiveAreaKey(area.key);
                    setAreaMenuOpen(false);
                    const firstItem = area.groups[0]?.items[0];
                    if (firstItem) navigate(firstItem.path);
                  }}
                >
                  <Icon style={{ fontSize: 16 }} />
                  <span>{area.label}</span>
                </div>
              );
            })}
          </div>
        )}
        <div
          className={styles.areaButton}
          onClick={() => !collapsed && setAreaMenuOpen(!areaMenuOpen)}
          title={collapsed ? currentArea.label : undefined}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <currentArea.icon style={{ fontSize: 16 }} />
            <span className={collapsed ? styles.labelHidden : undefined}>{currentArea.label}</span>
          </div>
          {!collapsed && <ChevronUpDownRegular style={{ fontSize: 16 }} />}
        </div>
      </div>
    </div>
  );
}
