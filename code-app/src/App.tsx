import { lazy, useEffect } from "react";
import { createHashRouter, RouterProvider, useLocation, useNavigate } from "react-router-dom";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import "@/styles/global.css";

const ROUTE_STORAGE_KEY = "mda_last_route";

// Lazy-load page components for code splitting
const ProjectList = lazy(() => import("@/pages/ProjectList").then((m) => ({ default: m.ProjectList })));
const ProjectForm = lazy(() => import("@/pages/ProjectForm").then((m) => ({ default: m.ProjectForm })));
const TaskList = lazy(() => import("@/pages/TaskList").then((m) => ({ default: m.TaskList })));
const TaskForm = lazy(() => import("@/pages/TaskForm").then((m) => ({ default: m.TaskForm })));
const TeamMemberList = lazy(() => import("@/pages/TeamMemberList").then((m) => ({ default: m.TeamMemberList })));
const TeamMemberForm = lazy(() => import("@/pages/TeamMemberForm").then((m) => ({ default: m.TeamMemberForm })));
const TimeEntryList = lazy(() => import("@/pages/TimeEntryList").then((m) => ({ default: m.TimeEntryList })));
const TimeEntryForm = lazy(() => import("@/pages/TimeEntryForm").then((m) => ({ default: m.TimeEntryForm })));
const CategoryList = lazy(() => import("@/pages/CategoryList").then((m) => ({ default: m.CategoryList })));
const CategoryForm = lazy(() => import("@/pages/CategoryForm").then((m) => ({ default: m.CategoryForm })));
const AssignmentList = lazy(() => import("@/pages/AssignmentList").then((m) => ({ default: m.AssignmentList })));

/** Saves the current route to sessionStorage so browser refresh can restore it */
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname + location.search;
    if (path && path !== "/") {
      sessionStorage.setItem(ROUTE_STORAGE_KEY, path);
    }
  }, [location]);
  return null;
}

function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 48px", gap: "16px", backgroundColor: "#fff", margin: "8px 16px 16px", borderRadius: "4px", boxShadow: "rgba(0,0,0,0.12) 0 0 2px 0, rgba(0,0,0,0.14) 0 2px 4px 0" }}>
      <div style={{ fontSize: "56px", fontWeight: 300, color: "#d2d0ce" }}>404</div>
      <div style={{ fontSize: "18px", fontWeight: 600, color: "#323130" }}>Page Not Found</div>
      <div style={{ fontSize: "14px", color: "#605e5c", textAlign: "center", maxWidth: "400px" }}>
        The page <span style={{ fontFamily: "monospace", backgroundColor: "#f3f2f1", padding: "2px 6px", borderRadius: "2px" }}>{location.pathname}</span> could not be found.
      </div>
      <button
        onClick={() => navigate("/projects")}
        style={{ marginTop: "8px", padding: "8px 24px", backgroundColor: "#0078d4", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px", fontFamily: "'Segoe UI', sans-serif" }}
      >
        Go to Projects
      </button>
    </div>
  );
}

// On initial load, if hash is empty but we have a saved route, restore it
const savedRoute = sessionStorage.getItem(ROUTE_STORAGE_KEY);
if (savedRoute && savedRoute !== "/" && (!window.location.hash || window.location.hash === "#/" || window.location.hash === "#")) {
  window.location.hash = "#" + savedRoute;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s before refetch
      retry: 1,
    },
  },
});

const router = createHashRouter([
  {
    element: <><RouteTracker /><AppShell /></>,
    children: [
      { index: true, element: <ProjectList /> },
      { path: "projects", element: <ProjectList /> },
      { path: "projects/new", element: <ProjectForm /> },
      { path: "projects/:id", element: <ProjectForm /> },
      { path: "tasks", element: <TaskList /> },
      { path: "tasks/new", element: <TaskForm /> },
      { path: "tasks/:id", element: <TaskForm /> },
      { path: "teammembers", element: <TeamMemberList /> },
      { path: "teammembers/new", element: <TeamMemberForm /> },
      { path: "teammembers/:id", element: <TeamMemberForm /> },
      { path: "timeentries", element: <TimeEntryList /> },
      { path: "timeentries/new", element: <TimeEntryForm /> },
      { path: "timeentries/:id", element: <TimeEntryForm /> },
      { path: "categories", element: <CategoryList /> },
      { path: "categories/new", element: <CategoryForm /> },
      { path: "categories/:id", element: <CategoryForm /> },
      { path: "assignments", element: <AssignmentList /> },
      { path: "assignments/:id", element: <AssignmentList /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </QueryClientProvider>
    </FluentProvider>
  );
}
