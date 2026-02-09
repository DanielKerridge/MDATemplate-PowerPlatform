import { Outlet } from "react-router-dom";
import { makeStyles } from "@fluentui/react-components";
import { LeftNav } from "./LeftNav";
import { NotificationCenter } from "../common/NotificationCenter";

const useStyles = makeStyles({
  root: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  main: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
});

export function AppShell() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <LeftNav />
      <div className={styles.content}>
        <div className={styles.main}>
          <Outlet />
        </div>
      </div>
      <NotificationCenter />
    </div>
  );
}
