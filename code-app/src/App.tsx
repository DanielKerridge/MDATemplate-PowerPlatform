import { HashRouter, Routes, Route } from "react-router-dom";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { QuickCreateDialog } from "@/components/forms/QuickCreateDialog";
import { Dashboard } from "@/pages/Dashboard";
import { ProjectList } from "@/pages/ProjectList";
import { ProjectForm } from "@/pages/ProjectForm";
import { TaskList } from "@/pages/TaskList";
import { TaskForm } from "@/pages/TaskForm";
import { TeamMemberList } from "@/pages/TeamMemberList";
import { TeamMemberForm } from "@/pages/TeamMemberForm";
import { TimeEntryList } from "@/pages/TimeEntryList";
import { TimeEntryForm } from "@/pages/TimeEntryForm";
import { CategoryList } from "@/pages/CategoryList";
import { CategoryForm } from "@/pages/CategoryForm";
import { AssignmentList } from "@/pages/AssignmentList";
import "@/styles/global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s before refetch
      retry: 1,
    },
  },
});

export function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<ProjectList />} />
              <Route path="projects/new" element={<ProjectForm />} />
              <Route path="projects/:id" element={<ProjectForm />} />
              <Route path="tasks" element={<TaskList />} />
              <Route path="tasks/:id" element={<TaskForm />} />
              <Route path="teammembers" element={<TeamMemberList />} />
              <Route path="teammembers/:id" element={<TeamMemberForm />} />
              <Route path="timeentries" element={<TimeEntryList />} />
              <Route path="timeentries/:id" element={<TimeEntryForm />} />
              <Route path="categories" element={<CategoryList />} />
              <Route path="categories/:id" element={<CategoryForm />} />
              <Route path="assignments" element={<AssignmentList />} />
            </Route>
          </Routes>
          <QuickCreateDialog />
        </HashRouter>
      </QueryClientProvider>
    </FluentProvider>
  );
}
