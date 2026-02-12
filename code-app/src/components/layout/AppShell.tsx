import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { makeStyles, Spinner } from "@fluentui/react-components";
import { LeftNav } from "./LeftNav";
import { NotificationCenter } from "../common/NotificationCenter";
import { GlobalSearch } from "../common/GlobalSearch";

const useStyles = makeStyles({
  root: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "#f3f2f1",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  searchBar: {
    display: "flex",
    alignItems: "center",
    padding: "6px 16px",
    backgroundColor: "#f3f2f1",
    borderBottom: "1px solid #edebe9",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    padding: "0 16px",
  },
});

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
      <Spinner size="medium" label="Loading..." />
    </div>
  );
}

export function AppShell() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <LeftNav />
      <div className={styles.main}>
        <div className={styles.searchBar} data-print-hide>
          <GlobalSearch />
        </div>
        <div className={styles.content}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
      <NotificationCenter />
    </div>
  );
}
