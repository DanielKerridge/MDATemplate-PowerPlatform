import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AddRegular } from "@fluentui/react-icons";
import { Pic_tasksService } from "@generated/services/Pic_tasksService";
import { EntityListView } from "@/components/views/EntityListView";
import type { ColumnDef } from "@/components/views/EntityListView";
import { EntityCommandBar } from "@/components/common/EntityCommandBar";
import { getStoredDefault } from "@/components/common/ViewSelector";
import { ChartPanel } from "@/components/common/ChartPanel";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { BulkEditDialog } from "@/components/common/BulkEditDialog";
import type { BulkEditField } from "@/components/common/BulkEditDialog";
import { exportToExcel, copyEmailLink, openFlowUrl, copyRecordLink } from "@/components/common/ExportUtils";
import { AssignDialog } from "@/components/common/AssignDialog";
import { useAppStore } from "@/store/useAppStore";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { STATUS_COLORS, STATUS_OPTIONS } from "@/config/constants";
import type { Pic_tasks } from "@generated/models/Pic_tasksModel";

const TODAY_ISO = new Date().toISOString().split("T")[0];

const VIEWS = [
  { key: "active", label: "Active Tasks", filter: "statecode eq 0" },
  { key: "all", label: "All Tasks", filter: "" },
  { key: "overdue", label: "Overdue Tasks", filter: `statecode eq 0 and pic_status ne 10003 and pic_status ne 10004 and pic_duedate lt ${TODAY_ISO}` },
  { key: "milestones", label: "Milestones", filter: "pic_ismilestone eq true" },
];

const COLUMNS: ColumnDef<Pic_tasks>[] = [
  { key: "pic_taskname", header: "Task Name", width: "250px", dataType: "text" },
  {
    key: "pic_status",
    header: "Status",
    width: "120px",
    dataType: "optionset",
    editable: true,
    editOptions: STATUS_OPTIONS.task,
    render: (row) => {
      const status = Number(row.pic_status);
      const entry = (STATUS_COLORS.task as Record<number, { label: string; fg: string }>)[status];
      return entry?.label ?? String(row.pic_status ?? "");
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
      const priority = Number(row.pic_priority);
      const entry = (STATUS_COLORS.priority as Record<number, { label: string; fg: string }>)[priority];
      return entry?.label ?? String(row.pic_priority ?? "");
    },
  },
  { key: "_pic_projectid_value", header: "Project", width: "150px", dataType: "lookup", lookupEntityPath: "/projects",
    render: (row) => String((row as unknown as Record<string, unknown>)["_pic_projectid_value@OData.Community.Display.V1.FormattedValue"] ?? (row as unknown as Record<string, unknown>).pic_projectidname ?? ""),
  },
  { key: "_pic_assignedtoid_value", header: "Assigned To", width: "150px", dataType: "lookup", lookupEntityPath: "/teammembers",
    render: (row) => String((row as unknown as Record<string, unknown>)["_pic_assignedtoid_value@OData.Community.Display.V1.FormattedValue"] ?? (row as unknown as Record<string, unknown>).pic_assignedtoidname ?? ""),
  },
  {
    key: "pic_duedate",
    header: "Due Date",
    width: "110px",
    dataType: "date",
    render: (row) => {
      if (!row.pic_duedate) return "";
      const d = new Date(row.pic_duedate);
      const isOverdue = d < new Date() && row.pic_status !== 10003 && row.pic_status !== 10004;
      return <span style={isOverdue ? { color: "#d13438", fontWeight: 600 } : undefined}>{d.toLocaleDateString()}</span>;
    },
  },
  {
    key: "pic_completionpercent",
    header: "Completion %",
    width: "80px",
    dataType: "number",
    editable: true,
    render: (row) => `${Number(row.pic_completionpercent ?? 0)}%`,
  },
];

const chartLabelMap = Object.fromEntries(
  Object.entries(STATUS_COLORS.task).map(([val, info]) => [val, { label: info.label, color: info.bg }])
);

const BULK_EDIT_FIELDS: BulkEditField[] = [
  { key: "pic_status", label: "Status", type: "select", options: STATUS_OPTIONS.task },
  { key: "pic_priority", label: "Priority", type: "select", options: STATUS_OPTIONS.priority },
  { key: "pic_completionpercent", label: "Completion %", type: "number" },
];

export function TaskList() {
  const navigate = useNavigate();
  const addNotification = useAppStore((s) => s.addNotification);
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState(() => getStoredDefault("tasks", "active"));
  useDocumentTitle("Active Tasks");
  const [chartVisible, setChartVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [activateAction, setActivateAction] = useState(true);

  const currentView = VIEWS.find((v) => v.key === activeView) ?? VIEWS[0];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tasks", "list", activeView],
    queryFn: () =>
      Pic_tasksService.getAll({
        select: [
          "pic_taskid",
          "pic_taskname",
          "pic_status",
          "pic_priority",
          "pic_duedate",
          "pic_completionpercent",
          "pic_ismilestone",
          "_pic_projectid_value",
          "_pic_assignedtoid_value",
          "statecode",
        ],
        filter: currentView.filter || undefined,
        orderBy: ["pic_duedate desc"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await Pic_tasksService.delete(id);
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addNotification(`${ids.length} task(s) deleted`, "success");
      setSelectedIds(new Set());
      setDeleteTargetIds([]);
      setDeleteDialogOpen(false);
    },
    onError: (err) => {
      console.error("Delete failed:", err);
      addNotification(`Delete failed: ${err.message}`, "error");
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const inlineEditMutation = useMutation({
    mutationFn: async ({ rowId, field, value }: { rowId: string; field: string; value: unknown }) => {
      await Pic_tasksService.update(rowId, { [field]: value } as never);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); },
    onError: (err) => { console.error("Inline edit failed:", err); addNotification(`Inline edit failed: ${err.message}`, "error"); },
  });

  const handleInlineEdit = useCallback((rowId: string, columnKey: string, value: unknown) => {
    inlineEditMutation.mutate({ rowId, field: columnKey, value });
  }, [inlineEditMutation]);

  const bulkEditMutation = useMutation({
    mutationFn: async ({ fieldKey, value }: { fieldKey: string; value: unknown }) => {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((tid) =>
        Pic_tasksService.update(tid, { [fieldKey]: value } as never)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addNotification(`${selectedIds.size} task(s) updated`, "success");
      setSelectedIds(new Set());
      setBulkEditOpen(false);
    },
    onError: (err) => { console.error("Bulk edit failed:", err); addNotification(`Bulk edit failed: ${err.message}`, "error"); },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ ids, activate }: { ids: string[]; activate: boolean }) => {
      for (const tid of ids) {
        await Pic_tasksService.update(tid, {
          statecode: (activate ? 0 : 1) as never,
          statuscode: (activate ? 1 : 2) as never,
        });
      }
    },
    onSuccess: (_, { ids, activate }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addNotification(`${ids.length} task(s) ${activate ? "activated" : "deactivated"}`, "success");
      setSelectedIds(new Set());
    },
    onError: (err) => { console.error("Activate/deactivate failed:", err); addNotification(`Failed: ${err.message}`, "error"); },
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
    exportToExcel(COLUMNS, data.data as unknown as Record<string, unknown>[], "Tasks");
    addNotification("Exported to CSV", "success");
  }, [data, addNotification]);

  const handleEmailLink = useCallback(async () => {
    const ok = await copyEmailLink("/tasks", currentView.label);
    addNotification(ok ? "Link copied to clipboard" : "Failed to copy link", ok ? "success" : "error");
  }, [currentView, addNotification]);

  const handleShare = useCallback(async () => {
    const ok = await copyRecordLink("/tasks", "");
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
  }, [addNotification, activateMutation]);

  return (
    <>
      <EntityCommandBar
        actions={[
          {
            key: "new",
            label: "New",
            icon: AddRegular,
            primary: true,
            onClick: () => navigate("/tasks/new"),
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
            navigate(`/tasks/${Array.from(selectedIds)[0]}`);
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
      <EntityListView<Pic_tasks>
        title="Tasks"
        columns={COLUMNS}
        data={data?.data}
        isLoading={isLoading}
        idField="pic_taskid"
        entityPath="/tasks"
        views={VIEWS.map((v) => ({ key: v.key, label: v.label }))}
        activeView={activeView}
        onViewChange={setActiveView}
        onSelectionChange={setSelectedIds}
        onRowAction={handleRowAction}
        getRowActive={(row) => (row as any).statecode === 0}
        onInlineEdit={handleInlineEdit}
        extraColumns={[
          { key: "pic_description", header: "Description", dataType: "textarea" },
          { key: "pic_estimatedhours", header: "Estimated Hours", dataType: "number" },
          { key: "pic_actualhours", header: "Actual Hours", dataType: "number" },
          { key: "pic_ismilestone", header: "Milestone", dataType: "boolean" },
          { key: "createdon", header: "Created On", dataType: "date" },
          { key: "modifiedon", header: "Modified On", dataType: "date" },
        ]}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Tasks"
        message={`Are you sure you want to delete ${deleteTargetIds.length} selected task(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => deleteMutation.mutate(deleteTargetIds)}
        onCancel={() => { setDeleteDialogOpen(false); setDeleteTargetIds([]); }}
        danger
      />
      <AssignDialog
        open={assignDialogOpen}
        onAssign={(owner) => {
          addNotification(`Task assigned to ${owner}`, "success");
          setAssignDialogOpen(false);
        }}
        onCancel={() => setAssignDialogOpen(false)}
      />
      <BulkEditDialog
        open={bulkEditOpen}
        entityName="Task"
        selectedCount={selectedIds.size}
        fields={BULK_EDIT_FIELDS}
        onApply={(fieldKey, value) => bulkEditMutation.mutateAsync({ fieldKey, value })}
        onCancel={() => setBulkEditOpen(false)}
      />
      <ConfirmDialog
        open={activateDialogOpen}
        title={activateAction ? "Activate Tasks" : "Deactivate Tasks"}
        message={`Are you sure you want to ${activateAction ? "activate" : "deactivate"} ${selectedIds.size} selected task(s)?`}
        confirmLabel={activateAction ? "Activate" : "Deactivate"}
        onConfirm={() => {
          activateMutation.mutate({ ids: Array.from(selectedIds), activate: activateAction });
          setActivateDialogOpen(false);
        }}
        onCancel={() => setActivateDialogOpen(false)}
        danger={!activateAction}
      />
    </>
  );
}
