import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AddRegular } from "@fluentui/react-icons";
import { Pic_projectsService } from "@generated/services/Pic_projectsService";
import { Pic_tasksService } from "@generated/services/Pic_tasksService";
import { EntityListView } from "@/components/views/EntityListView";
import type { ColumnDef } from "@/components/views/EntityListView";
import { EntityCommandBar } from "@/components/common/EntityCommandBar";
import { ChartPanel } from "@/components/common/ChartPanel";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { BulkEditDialog } from "@/components/common/BulkEditDialog";
import type { BulkEditField } from "@/components/common/BulkEditDialog";
import { exportToExcel, copyEmailLink, openFlowUrl, copyRecordLink } from "@/components/common/ExportUtils";
import { getStoredDefault } from "@/components/common/ViewSelector";
import { AssignDialog } from "@/components/common/AssignDialog";
import { useAppStore } from "@/store/useAppStore";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { STATUS_COLORS, STATUS_OPTIONS } from "@/config/constants";
import type { Pic_projects } from "@generated/models/Pic_projectsModel";

const STATUS_LABELS: Record<number, string> = {
  10000: "Planning", 10001: "Active", 10002: "On Hold", 10003: "Completed", 10004: "Cancelled",
};
const PRIORITY_LABELS: Record<number, string> = {
  10000: "Low", 10001: "Medium", 10002: "High", 10003: "Critical",
};

const VIEWS = [
  { key: "active", label: "Active Projects", filter: "statecode eq 0" },
  { key: "all", label: "All Projects", filter: "" },
  { key: "completed", label: "Completed Projects", filter: "pic_status eq 10003" },
  { key: "overbudget", label: "Over Budget", filter: "pic_budgetutilization gt 100" },
];

const COLUMNS: ColumnDef<Pic_projects>[] = [
  { key: "pic_projectname", header: "Project Name", width: "250px", dataType: "text" },
  {
    key: "pic_status",
    header: "Status",
    width: "120px",
    dataType: "optionset",
    editable: true,
    editOptions: STATUS_OPTIONS.project,
    render: (row) => {
      const status = row.pic_status as number;
      return STATUS_LABELS[status] ?? String(status ?? "");
    },
  },
  {
    key: "pic_priority",
    header: "Priority",
    width: "100px",
    dataType: "optionset",
    editable: true,
    editOptions: STATUS_OPTIONS.priority,
    render: (row) => {
      const priority = row.pic_priority as number;
      return PRIORITY_LABELS[priority] ?? String(priority ?? "");
    },
  },
  {
    key: "pic_startdate",
    header: "Start Date",
    width: "130px",
    dataType: "date",
    render: (row) =>
      row.pic_startdate ? new Date(row.pic_startdate).toLocaleDateString() : "",
  },
  {
    key: "pic_enddate",
    header: "End Date",
    width: "130px",
    dataType: "date",
    render: (row) => {
      if (!row.pic_enddate) return "";
      const d = new Date(row.pic_enddate);
      const isOverdue = d < new Date() && row.pic_status !== 10003 && row.pic_status !== 10004;
      return <span style={isOverdue ? { color: "#d13438", fontWeight: 600 } : undefined}>{d.toLocaleDateString()}</span>;
    },
  },
  {
    key: "pic_budget",
    header: "Budget",
    width: "120px",
    dataType: "money",
    editable: true,
    render: (row) =>
      row.pic_budget != null
        ? `$${Number(row.pic_budget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "",
  },
  {
    key: "_pic_projectmanagerid_value",
    header: "Project Manager",
    width: "160px",
    dataType: "lookup",
    lookupEntityPath: "/teammembers",
    render: (row) => {
      const r = row as unknown as Record<string, unknown>;
      const name = r["pic_projectmanageridname"] ??
        r["_pic_projectmanagerid_value@OData.Community.Display.V1.FormattedValue"];
      return String(name ?? "");
    },
  },
];

const chartLabelMap = Object.fromEntries(
  Object.entries(STATUS_COLORS.project).map(([val, info]) => [val, { label: info.label, color: info.bg }])
);

const BULK_EDIT_FIELDS: BulkEditField[] = [
  { key: "pic_status", label: "Status", type: "select", options: STATUS_OPTIONS.project },
  { key: "pic_priority", label: "Priority", type: "select", options: STATUS_OPTIONS.priority },
  { key: "pic_risklevel", label: "Risk Level", type: "select", options: STATUS_OPTIONS.risk },
  { key: "pic_budget", label: "Budget", type: "money" },
];

export function ProjectList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const [activeView, setActiveView] = useState(() => getStoredDefault("projects", "active"));
  useDocumentTitle("Active Projects");
  const [chartVisible, setChartVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [activateAction, setActivateAction] = useState(true);

  const currentView = VIEWS.find((v) => v.key === activeView) ?? VIEWS[0];

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", "all-for-expand"],
    queryFn: () => Pic_tasksService.getAll({
      select: ["pic_taskid", "pic_taskname", "pic_status", "pic_duedate", "_pic_projectid_value"],
      orderBy: ["pic_duedate asc"],
    }),
    staleTime: 60_000,
  });

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Array<Record<string, unknown>>>();
    if (!tasksData?.data) return map;
    for (const t of tasksData.data) {
      const rec = t as unknown as Record<string, unknown>;
      const pid = String(rec["_pic_projectid_value"] ?? "");
      if (!pid) continue;
      const arr = map.get(pid) ?? [];
      arr.push(rec);
      map.set(pid, arr);
    }
    return map;
  }, [tasksData]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["projects", "list", activeView],
    queryFn: () =>
      Pic_projectsService.getAll({
        filter: currentView.filter || undefined,
        orderBy: ["pic_projectname asc"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await Pic_projectsService.delete(id);
      }
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      addNotification(`${ids.length} project(s) deleted`, "success");
      setSelectedIds(new Set());
      setDeleteTargetIds([]);
      setDeleteDialogOpen(false);
    },
    onError: (err) => {
      console.error("Delete failed:", err);
      addNotification(`Delete failed: ${err.message}`, "error");
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ ids, activate }: { ids: string[]; activate: boolean }) => {
      for (const pid of ids) {
        await Pic_projectsService.update(pid, {
          statecode: (activate ? 0 : 1) as never,
          statuscode: (activate ? 1 : 2) as never,
        });
      }
    },
    onSuccess: (_data, { ids, activate }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      addNotification(`${ids.length} project(s) ${activate ? "activated" : "deactivated"}`, "success");
      setSelectedIds(new Set());
      setActivateDialogOpen(false);
    },
    onError: (err) => {
      console.error("Activate/deactivate failed:", err);
      addNotification(`Failed: ${err.message}`, "error");
      setActivateDialogOpen(false);
    },
  });

  const inlineEditMutation = useMutation({
    mutationFn: async ({ rowId, field, value }: { rowId: string; field: string; value: unknown }) => {
      await Pic_projectsService.update(rowId, { [field]: value } as never);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => { console.error("Inline edit failed:", err); addNotification(`Inline edit failed: ${err.message}`, "error"); },
  });

  const handleInlineEdit = useCallback((rowId: string, columnKey: string, value: unknown) => {
    inlineEditMutation.mutate({ rowId, field: columnKey, value });
  }, [inlineEditMutation]);

  const bulkEditMutation = useMutation({
    mutationFn: async ({ fieldKey, value }: { fieldKey: string; value: unknown }) => {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((pid) =>
        Pic_projectsService.update(pid, { [fieldKey]: value } as never)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      addNotification(`${selectedIds.size} project(s) updated`, "success");
      setSelectedIds(new Set());
      setBulkEditOpen(false);
    },
    onError: (err) => { console.error("Bulk edit failed:", err); addNotification(`Bulk edit failed: ${err.message}`, "error"); },
  });

  const handleDelete = useCallback(() => {
    if (selectedIds.size === 0) {
      addNotification("Select records to delete", "info");
      return;
    }
    setDeleteTargetIds(Array.from(selectedIds));
    setDeleteDialogOpen(true);
  }, [selectedIds, addNotification]);

  const handleExport = useCallback(() => {
    if (!data?.data || data.data.length === 0) {
      addNotification("No data to export", "info");
      return;
    }
    exportToExcel(COLUMNS, data.data as unknown as Record<string, unknown>[], "Projects");
    addNotification("Exported to CSV", "success");
  }, [data, addNotification]);

  const handleEmailLink = useCallback(async () => {
    const ok = await copyEmailLink("/projects", currentView.label);
    addNotification(ok ? "Link copied to clipboard" : "Failed to copy link", ok ? "success" : "error");
  }, [currentView, addNotification]);

  const handleShare = useCallback(async () => {
    const ok = await copyRecordLink("/projects", "");
    addNotification(ok ? "Link copied to clipboard" : "Failed to copy link", ok ? "success" : "error");
  }, [addNotification]);

  const handleRowAction = useCallback((action: string, rowId: string) => {
    if (action === "delete") {
      setDeleteTargetIds([rowId]);
      setDeleteDialogOpen(true);
    } else if (action === "assign") {
      setAssignDialogOpen(true);
    } else if (action === "deactivate") {
      activateMutation.mutate({ ids: [rowId], activate: false });
    } else if (action === "activate") {
      activateMutation.mutate({ ids: [rowId], activate: true });
    }
  }, [activateMutation]);

  return (
    <>
      <EntityCommandBar
        actions={[
          {
            key: "new",
            label: "New",
            icon: AddRegular,
            primary: true,
            onClick: () => navigate("/projects/new"),
          },
        ]}
        selectedCount={selectedIds.size}
        onRefresh={async () => { await refetch(); addNotification("Refreshed", "success"); }}
        onDelete={handleDelete}
        onShowChart={() => setChartVisible((v) => !v)}
        chartActive={chartVisible}
        onEmailLink={handleEmailLink}
        onFlow={openFlowUrl}
        onShare={handleShare}
        onExportExcel={handleExport}
        onEdit={() => {
          if (selectedIds.size === 1) {
            navigate(`/projects/${Array.from(selectedIds)[0]}`);
          } else if (selectedIds.size > 1) {
            setBulkEditOpen(true);
          }
        }}
        onActivate={() => {
          if (selectedIds.size === 0) { addNotification("Select records to activate", "info"); return; }
          setActivateAction(true);
          setActivateDialogOpen(true);
        }}
        onDeactivate={() => {
          if (selectedIds.size === 0) { addNotification("Select records to deactivate", "info"); return; }
          setActivateAction(false);
          setActivateDialogOpen(true);
        }}
        onAssign={() => setAssignDialogOpen(true)}
        onRunReport={() => addNotification("Reports are not available in Code Apps", "info")}
      />
      <ChartPanel
        data={(data?.data ?? []) as unknown as Record<string, unknown>[]}
        statusField="pic_status"
        labelMap={chartLabelMap}
        visible={chartVisible}
      />
      <EntityListView<Pic_projects>
        title="Projects"
        columns={COLUMNS}
        data={data?.data}
        isLoading={isLoading}
        idField="pic_projectid"
        entityPath="/projects"
        views={VIEWS.map((v) => ({ key: v.key, label: v.label }))}
        activeView={activeView}
        onViewChange={setActiveView}
        onSelectionChange={setSelectedIds}
        onRowAction={handleRowAction}
        getRowActive={(row) => (row as any).statecode === 0}
        defaultSortCol="pic_startdate"
        defaultSortAsc={false}
        onInlineEdit={handleInlineEdit}
        extraColumns={[
          { key: "pic_description", header: "Description", dataType: "textarea" },
          { key: "pic_actualcost", header: "Actual Cost", dataType: "money" },
          { key: "pic_budgetutilization", header: "Budget Utilization %", dataType: "number" },
          { key: "createdon", header: "Created On", dataType: "date" },
          { key: "modifiedon", header: "Modified On", dataType: "date" },
          { key: "_pic_categoryid_value", header: "Category", dataType: "lookup" },
        ]}
        renderExpanded={(row) => {
          const pid = String((row as unknown as Record<string, unknown>).pic_projectid ?? "");
          const tasks = tasksByProject.get(pid) ?? [];
          if (tasks.length === 0) {
            return <div style={{ color: "#605e5c", fontSize: "13px", padding: "4px 0" }}>No related tasks</div>;
          }
          const taskStatusLabel: Record<number, string> = { 10000: "Not Started", 10001: "In Progress", 10002: "Blocked", 10003: "Completed", 10004: "Cancelled" };
          return (
            <div>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "#323130", marginBottom: "6px" }}>
                Tasks ({tasks.length})
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "4px 8px", color: "rgba(0,0,0,0.54)", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid #edebe9" }}>Task Name</th>
                    <th style={{ textAlign: "left", padding: "4px 8px", color: "rgba(0,0,0,0.54)", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid #edebe9" }}>Status</th>
                    <th style={{ textAlign: "left", padding: "4px 8px", color: "rgba(0,0,0,0.54)", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid #edebe9" }}>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.slice(0, 5).map((t) => (
                    <tr key={String(t.pic_taskid)} style={{ cursor: "pointer" }} onClick={() => navigate(`/tasks/${t.pic_taskid}`)}>
                      <td style={{ padding: "4px 8px", color: "#0078d4", borderBottom: "1px solid #f3f2f1" }}>{String(t.pic_taskname ?? "")}</td>
                      <td style={{ padding: "4px 8px", borderBottom: "1px solid #f3f2f1" }}>{taskStatusLabel[Number(t.pic_status)] ?? ""}</td>
                      <td style={{ padding: "4px 8px", borderBottom: "1px solid #f3f2f1" }}>{t.pic_duedate ? new Date(String(t.pic_duedate)).toLocaleDateString() : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tasks.length > 5 && (
                <div style={{ fontSize: "12px", color: "#0078d4", cursor: "pointer", marginTop: "4px" }} onClick={() => navigate(`/tasks`)}>
                  View all {tasks.length} tasks...
                </div>
              )}
            </div>
          );
        }}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Projects"
        message={`Are you sure you want to delete ${deleteTargetIds.length} selected project(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => deleteMutation.mutate(deleteTargetIds)}
        onCancel={() => { setDeleteDialogOpen(false); setDeleteTargetIds([]); }}
        danger
      />
      <AssignDialog
        open={assignDialogOpen}
        onAssign={(owner) => {
          addNotification(`Record assigned to ${owner}`, "success");
          setAssignDialogOpen(false);
        }}
        onCancel={() => setAssignDialogOpen(false)}
      />
      <ConfirmDialog
        open={activateDialogOpen}
        title={activateAction ? "Activate Projects" : "Deactivate Projects"}
        message={`Are you sure you want to ${activateAction ? "activate" : "deactivate"} ${selectedIds.size} selected project(s)?`}
        confirmLabel={activateAction ? "Activate" : "Deactivate"}
        onConfirm={() => {
          activateMutation.mutate({ ids: Array.from(selectedIds), activate: activateAction });
          setActivateDialogOpen(false);
        }}
        onCancel={() => setActivateDialogOpen(false)}
        danger={!activateAction}
      />
      <BulkEditDialog
        open={bulkEditOpen}
        entityName="Project"
        selectedCount={selectedIds.size}
        fields={BULK_EDIT_FIELDS}
        onApply={(fieldKey, value) => bulkEditMutation.mutateAsync({ fieldKey, value })}
        onCancel={() => setBulkEditOpen(false)}
      />
    </>
  );
}
