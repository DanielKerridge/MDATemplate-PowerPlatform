import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AddRegular } from "@fluentui/react-icons";
import { Pic_projectassignmentsService } from "@generated/services/Pic_projectassignmentsService";
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
import type { Pic_projectassignments } from "@generated/models/Pic_projectassignmentsModel";

const VIEWS = [
  { key: "active", label: "Active Assignments", filter: "statecode eq 0" },
  { key: "all", label: "All Assignments", filter: "" },
];

const COLUMNS: ColumnDef<Pic_projectassignments>[] = [
  { key: "_pic_projectid_value", header: "Project", width: "200px", dataType: "lookup", lookupEntityPath: "/projects",
    render: (row) => String((row as unknown as Record<string, unknown>)["_pic_projectid_value@OData.Community.Display.V1.FormattedValue"] ?? ""),
  },
  { key: "_pic_teammemberid_value", header: "Team Member", width: "200px", dataType: "lookup", lookupEntityPath: "/teammembers",
    render: (row) => String((row as unknown as Record<string, unknown>)["_pic_teammemberid_value@OData.Community.Display.V1.FormattedValue"] ?? ""),
  },
  {
    key: "pic_roleonproject",
    header: "Role",
    width: "140px",
    dataType: "optionset",
    editable: true,
    editOptions: STATUS_OPTIONS.role,
    render: (row) => {
      const entry = (STATUS_COLORS.role as Record<number, { label: string }>)[Number(row.pic_roleonproject)];
      return entry?.label ?? String(row.pic_roleonproject ?? "");
    },
  },
  {
    key: "pic_allocationpercent",
    header: "Allocation %",
    width: "110px",
    dataType: "number",
    editable: true,
    render: (row) => `${Number(row.pic_allocationpercent ?? 0)}%`,
  },
  {
    key: "pic_startdate",
    header: "Start Date",
    width: "110px",
    dataType: "date",
    render: (row) =>
      row.pic_startdate ? new Date(row.pic_startdate).toLocaleDateString() : "",
  },
  {
    key: "pic_enddate",
    header: "End Date",
    width: "110px",
    dataType: "date",
    render: (row) =>
      row.pic_enddate ? new Date(row.pic_enddate).toLocaleDateString() : "",
  },
];

const chartLabelMap = Object.fromEntries(
  Object.entries(STATUS_COLORS.role).map(([val, info]) => [val, { label: info.label, color: info.bg }])
);

const BULK_EDIT_FIELDS: BulkEditField[] = [
  { key: "pic_roleonproject", label: "Role on Project", type: "select", options: STATUS_OPTIONS.role },
  { key: "pic_allocationpercent", label: "Allocation %", type: "number" },
];

export function AssignmentList() {
  const addNotification = useAppStore((s) => s.addNotification);
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState(() => getStoredDefault("assignments", "active"));
  useDocumentTitle("Active Assignments");
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
    queryKey: ["assignments", "list", activeView],
    queryFn: () =>
      Pic_projectassignmentsService.getAll({
        select: [
          "pic_projectassignmentid",
          "pic_roleonproject",
          "pic_allocationpercent",
          "pic_startdate",
          "pic_enddate",
          "_pic_projectid_value",
          "_pic_teammemberid_value",
          "statecode",
        ],
        filter: currentView.filter || undefined,
        orderBy: ["createdon desc"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await Pic_projectassignmentsService.delete(id);
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      addNotification(`${ids.length} assignment(s) deleted`, "success");
      setSelectedIds(new Set());
      setDeleteTargetIds([]);
      setDeleteDialogOpen(false);
    },
    onError: (err) => {
      console.error("Delete failed:", err);
      addNotification(`Delete failed: ${err.message}`, "error");
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });

  const inlineEditMutation = useMutation({
    mutationFn: async ({ rowId, field, value }: { rowId: string; field: string; value: unknown }) => {
      await Pic_projectassignmentsService.update(rowId, { [field]: value } as never);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["assignments"] }); },
    onError: (err) => { console.error("Inline edit failed:", err); addNotification(`Inline edit failed: ${err.message}`, "error"); },
  });

  const handleInlineEdit = useCallback((rowId: string, columnKey: string, value: unknown) => {
    inlineEditMutation.mutate({ rowId, field: columnKey, value });
  }, [inlineEditMutation]);

  const bulkEditMutation = useMutation({
    mutationFn: async ({ fieldKey, value }: { fieldKey: string; value: unknown }) => {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((aid) =>
        Pic_projectassignmentsService.update(aid, { [fieldKey]: value } as never)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      addNotification(`${selectedIds.size} assignment(s) updated`, "success");
      setSelectedIds(new Set());
      setBulkEditOpen(false);
    },
    onError: (err) => { console.error("Bulk edit failed:", err); addNotification(`Bulk edit failed: ${err.message}`, "error"); },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ ids, activate }: { ids: string[]; activate: boolean }) => {
      for (const aid of ids) {
        await Pic_projectassignmentsService.update(aid, {
          statecode: (activate ? 0 : 1) as never,
          statuscode: (activate ? 1 : 2) as never,
        });
      }
    },
    onSuccess: (_, { ids, activate }) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      addNotification(`${ids.length} assignment(s) ${activate ? "activated" : "deactivated"}`, "success");
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
    exportToExcel(COLUMNS, data.data as unknown as Record<string, unknown>[], "Assignments");
    addNotification("Exported to CSV", "success");
  }, [data, addNotification]);

  const handleEmailLink = useCallback(async () => {
    const ok = await copyEmailLink("/assignments", currentView.label);
    addNotification(ok ? "Link copied to clipboard" : "Failed to copy link", ok ? "success" : "error");
  }, [currentView, addNotification]);

  const handleShare = useCallback(async () => {
    const ok = await copyRecordLink("/assignments", "");
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
            onClick: () => addNotification("Open a project to manage assignments", "info"),
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
          if (selectedIds.size > 1) {
            setBulkEditOpen(true);
          } else {
            addNotification("Open a project to edit assignments", "info");
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
        statusField="pic_roleonproject"
        labelMap={chartLabelMap}
        visible={chartVisible}
      />
      <EntityListView<Pic_projectassignments>
        title="Project Assignments"
        columns={COLUMNS}
        data={data?.data}
        isLoading={isLoading}
        idField="pic_projectassignmentid"
        entityPath="/assignments"
        views={VIEWS.map((v) => ({ key: v.key, label: v.label }))}
        activeView={activeView}
        onViewChange={setActiveView}
        onSelectionChange={setSelectedIds}
        onRowAction={handleRowAction}
        getRowActive={(row) => (row as any).statecode === 0}
        onInlineEdit={handleInlineEdit}
        extraColumns={[
          { key: "pic_notes", header: "Notes", dataType: "textarea" },
          { key: "createdon", header: "Created On", dataType: "date" },
          { key: "modifiedon", header: "Modified On", dataType: "date" },
        ]}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Assignments"
        message={`Are you sure you want to delete ${deleteTargetIds.length} selected assignment(s)? This action cannot be undone.`}
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
      <BulkEditDialog
        open={bulkEditOpen}
        entityName="Assignment"
        selectedCount={selectedIds.size}
        fields={BULK_EDIT_FIELDS}
        onApply={(fieldKey, value) => bulkEditMutation.mutateAsync({ fieldKey, value })}
        onCancel={() => setBulkEditOpen(false)}
      />
      <ConfirmDialog
        open={activateDialogOpen}
        title={activateAction ? "Activate Assignments" : "Deactivate Assignments"}
        message={`Are you sure you want to ${activateAction ? "activate" : "deactivate"} ${selectedIds.size} selected assignment(s)?`}
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
