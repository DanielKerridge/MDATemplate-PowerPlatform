import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  makeStyles,
  mergeClasses,
} from "@fluentui/react-components";
import {
  ChevronDownRegular,
  ChevronUpRegular,
  ChevronUpDownRegular,
  ClockRegular,
  PinRegular,
  PinOffRegular,
  NavigationRegular,
  HomeRegular,
} from "@fluentui/react-icons";
import { NAVIGATION } from "@/config/navigation";
import { useAppStore } from "@/store/useAppStore";

const NAV_WIDTH = 200;
const NAV_COLLAPSED_WIDTH = 48;
const NAV_BG = "#f3f2f1";
const NAV_HOVER = "#edebe9";
const NAV_ACTIVE_BG = "#FFFFFF";
const NAV_TEXT = "#242424";
const NAV_TEXT_DIM = "#616161";
const GROUP_HEADER = "#323130";
const AREA_BG = "#F5F5F5";
const ACTIVE_ACCENT = "#0078d4";

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
    borderRight: "1px solid #d1d1d1",
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
    fontSize: "14px",
    position: "relative",
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
    "::before": {
      content: '""',
      position: "absolute",
      left: "0px",
      top: "50%",
      transform: "translateY(-50%)",
      width: "4px",
      height: "21px",
      borderRadius: "22px",
      backgroundColor: ACTIVE_ACCENT,
    },
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
    fontSize: "14px",
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
    padding: "16px 16px 2px",
    fontSize: "14px",
    fontWeight: 600,
    letterSpacing: "normal",
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
  recentItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 16px 6px 42px",
    cursor: "pointer",
    color: NAV_TEXT_DIM,
    fontSize: "13px",
    overflow: "hidden",
    ":hover": {
      backgroundColor: NAV_HOVER,
      color: NAV_TEXT,
    },
  },
  recentIcon: {
    width: "20px",
    height: "20px",
    borderRadius: "2px",
    backgroundColor: "#e8e8e8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 600,
    color: "#605e5c",
    flexShrink: 0,
  },
  recentLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  recentType: {
    fontSize: "11px",
    color: "#a0a0a0",
    flexShrink: 0,
  },
  pinBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "18px",
    height: "18px",
    borderRadius: "2px",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#a0a0a0",
    flexShrink: 0,
    padding: 0,
    opacity: 0,
    ":hover": {
      color: "#0078d4",
      backgroundColor: "#e8e8e8",
    },
  },
  pinBtnVisible: {
    opacity: 1,
  },
});

export function LeftNav() {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [activeAreaKey, setActiveAreaKey] = useState("projects");
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(true);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const recentItems = useAppStore((s) => s.recentItems);
  const pinnedItems = useAppStore((s) => s.pinnedItems);
  const pinItem = useAppStore((s) => s.pinItem);
  const unpinItem = useAppStore((s) => s.unpinItem);

  // Auto-sync area based on current URL (handles deep links, search navigation, etc.)
  useEffect(() => {
    const path = location.pathname;
    for (const area of NAVIGATION) {
      for (const group of area.groups) {
        if (group.items.some((item) => path === item.path || path.startsWith(item.path + "/"))) {
          if (area.key !== activeAreaKey) setActiveAreaKey(area.key);
          return;
        }
      }
    }
  }, [location.pathname, activeAreaKey]);

  /** Validate path before navigating (prevents external redirects from localStorage) */
  const safeNavigate = (path: string) => {
    if (path.startsWith("/") && !path.startsWith("//")) navigate(path);
  };

  const currentArea =
    NAVIGATION.find((a) => a.key === activeAreaKey) ?? NAVIGATION[0];

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/projects" && location.pathname === "/") ||
    (path !== "/" && location.pathname.startsWith(path));

  return (
    <div className={mergeClasses(styles.root, collapsed && styles.rootCollapsed)} data-print-hide>
      {/* Hamburger toggle */}
      <div
        className={styles.hamburger}
        onClick={() => setCollapsed(!collapsed)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCollapsed(!collapsed); } }}
        title={collapsed ? "Expand navigation" : "Collapse navigation"}
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        role="button"
        tabIndex={0}
      >
        <NavigationRegular className={styles.hamburgerIcon} />
      </div>

      <div className={styles.content}>
        {/* Home */}
        <div
          className={styles.navItem}
          onClick={() => navigate("/projects")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/projects"); } }}
          title={collapsed ? "Home" : undefined}
          role="button"
          tabIndex={0}
          aria-label="Home"
        >
          <HomeRegular className={styles.navIcon} />
          <span className={collapsed ? styles.labelHidden : undefined}>Home</span>
        </div>

        {/* Built-in: Recent (collapsible) */}
        <div
          className={styles.sectionHeader}
          onClick={() => setRecentOpen(!recentOpen)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRecentOpen(!recentOpen); } }}
          role="button"
          tabIndex={0}
          aria-expanded={recentOpen}
          aria-label="Recent items"
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
          recentItems.length === 0 ? (
            <div className={styles.emptyHint}>No recent items</div>
          ) : (
            recentItems.map((item) => {
              const isPinned = pinnedItems.some((p) => p.id === item.id);
              return (
                <div
                  key={item.id}
                  className={styles.recentItem}
                  onClick={() => safeNavigate(`${item.entityPath}/${item.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); safeNavigate(`${item.entityPath}/${item.id}`); } }}
                  title={`${item.title} (${item.entityType})`}
                  role="button"
                  tabIndex={0}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector("[data-pin]") as HTMLElement;
                    if (btn) btn.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector("[data-pin]") as HTMLElement;
                    if (btn && !isPinned) btn.style.opacity = "0";
                  }}
                >
                  <div className={styles.recentIcon}>
                    {item.entityType.charAt(0)}
                  </div>
                  <span className={styles.recentLabel}>{item.title}</span>
                  <button
                    data-pin
                    className={`${styles.pinBtn}${isPinned ? ` ${styles.pinBtnVisible}` : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPinned) unpinItem(item.id);
                      else pinItem({ id: item.id, title: item.title, entityPath: item.entityPath, entityType: item.entityType });
                    }}
                    title={isPinned ? "Unpin" : "Pin"}
                    aria-label={isPinned ? `Unpin ${item.title}` : `Pin ${item.title}`}
                    type="button"
                  >
                    {isPinned ? <PinOffRegular style={{ fontSize: 12 }} /> : <PinRegular style={{ fontSize: 12 }} />}
                  </button>
                </div>
              );
            })
          )
        )}

        {/* Built-in: Pinned (collapsible) */}
        <div
          className={styles.sectionHeader}
          onClick={() => !collapsed && setPinnedOpen(!pinnedOpen)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!collapsed) setPinnedOpen(!pinnedOpen); } }}
          role="button"
          tabIndex={0}
          aria-expanded={pinnedOpen}
          aria-label="Pinned items"
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
          pinnedItems.length === 0 ? (
            <div className={styles.emptyHint}>No pinned items</div>
          ) : (
            pinnedItems.map((item) => (
              <div
                key={item.id}
                className={styles.recentItem}
                onClick={() => safeNavigate(`${item.entityPath}/${item.id}`)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); safeNavigate(`${item.entityPath}/${item.id}`); } }}
                title={`${item.title} (${item.entityType})`}
                role="button"
                tabIndex={0}
                onMouseEnter={(e) => {
                  const btn = e.currentTarget.querySelector("[data-unpin]") as HTMLElement;
                  if (btn) btn.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget.querySelector("[data-unpin]") as HTMLElement;
                  if (btn) btn.style.opacity = "0";
                }}
              >
                <div className={styles.recentIcon}>
                  {item.entityType.charAt(0)}
                </div>
                <span className={styles.recentLabel}>{item.title}</span>
                <button
                  data-unpin
                  className={styles.pinBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    unpinItem(item.id);
                  }}
                  title="Unpin"
                  aria-label={`Unpin ${item.title}`}
                  type="button"
                >
                  <PinOffRegular style={{ fontSize: 12 }} />
                </button>
              </div>
            ))
          )
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
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(item.path); } }}
                  title={collapsed ? item.label : undefined}
                  role="button"
                  tabIndex={0}
                  aria-current={active ? "page" : undefined}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveAreaKey(area.key);
                      setAreaMenuOpen(false);
                      const firstItem = area.groups[0]?.items[0];
                      if (firstItem) navigate(firstItem.path);
                    }
                  }}
                  role="menuitem"
                  tabIndex={0}
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
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!collapsed) setAreaMenuOpen(!areaMenuOpen); } }}
          title={collapsed ? currentArea.label : undefined}
          role="button"
          tabIndex={0}
          aria-expanded={areaMenuOpen}
          aria-label={`Change area, current: ${currentArea.label}`}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: "#3b79b7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {currentArea.label.charAt(0)}
            </div>
            <span className={collapsed ? styles.labelHidden : undefined}>{currentArea.label}</span>
          </div>
          {!collapsed && <ChevronUpDownRegular style={{ fontSize: 16 }} />}
        </div>
      </div>
    </div>
  );
}
