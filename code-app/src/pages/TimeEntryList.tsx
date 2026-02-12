import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AddRegular } from "@fluentui/react-icons";
import { Pic_timeentriesService } from "@generated/services/Pic_timeentriesService";
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
import type { Pic_timeentries } from "@generated/models/Pic_timeentriesModel";

const VIEWS = [
  { key: "active", label: "Active Time Entries", filter: "statecode eq 0" },
  { key: "all", label: "All Time Entries", filter: "" },
  { key: "billable", label: "Billable Time", filter: "pic_isbillable eq true and statecode eq 0" },
];

const COLUMNS: ColumnDef<Pic_timeentries>[] = [
  { key: "pic_description", header: "Description", width: "250px", dataType: "text" },
  { key: "_pic_projectid_value", header: "Project", width: "150px", dataType: "lookup", lookupEntityPath: "/projects",
    render: (row) => String((row as unknown as Record<string, unknown>)["_pic_projectid_value@OData.Community.Display.V1.FormattedValue"] ?? ""),
  },
  { key: "_pic_teammemberid_value", header: "Team Member", width: "150px", dataType: "lookup", lookupEntityPath: "/teammembers",
    render: (row) => String((row as unknown as Record<string, unknown>)["_pic_teammemberid_value@OData.Community.Display.V1.FormattedValue"] ?? ""),
  },
  {
    key: "pic_entrydate",
    header: "Date",
    width: "110px",
    dataType: "date",
    render: (row) =>
      row.pic_entrydate ? new Date(row.pic_entrydate).toLocaleDateString() : "",
  },
  {
    key: "pic_duration",
    header: "Duration (hrs)",
    width: "110px",
    dataType: "number",
    editable: true,
    render: (row) => Number(row.pic_duration ?? 0).toFixed(2),
  },
  {
    key: "pic_isbillable",
    header: "Billable",
    width: "80px",
    dataType: "boolean",
    editable: true,
    render: (row) => (Number(row.pic_isbillable) === 1 ? "Yes" : "No"),
  },
];

const BULK_EDIT_FIELDS: BulkEditField[] = [
  { key: "pic_isbillable", label: "Billable", type: "boolean" },
  { key: "pic_duration", label: "Duration (hrs)", type: "number" },
];

const chartLabelMap: Record<string, { label: string; color: string }> = {
  "1": { label: "Billable", color: "#107c10" },
  "0": { label: "Non-Billable", color: "#605e5c" },
};

export function TimeEntryList() {
  const navigate = useNavigate();
  const addNotification = useAppStore((s) => s.addNotification);
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState(() => getStoredDefault("timeentries", "active"));
  useDocumentTitle("Active Time Entries");
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
    queryKey: ["timeentries", "list", activeView],
    queryFn: () =>
      Pic_timeentriesService.getAll({
        select: [
          "pic_timeentryid",
          "pic_description",
          "pic_entrydate",
          "pic_duration",
          "pic_isbillable",
          "_pic_projectid_value",
          "_pic_teammemberid_value",
          "statecode",
        ],
        filter: currentView.filter || undefined,
        orderBy: ["pic_entrydate desc"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await Pic_timeentriesService.delete(id);
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["timeentries"] });
      addNotification(`${ids.length} time entry(s) deleted`, "success");
      setSelectedIds(new Set());
      setDeleteTargetIds([]);
      setDeleteDialogOpen(false);
    },
    onError: (err) => {
      console.error("Delete failed:", err);
      addNotification(`Delete failed: ${err.message}`, "error");
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["timeentries"] });
    },
  });

  const inlineEditMutation = useMutation({
    mutationFn: async ({ rowId, field, value }: { rowId: string; field: string; value: unknown }) => {
      await Pic_timeentriesService.update(rowId, { [field]: value } as never);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timeentries"] }); },
    onError: (err) => { console.error("Inline edit failed:", err); addNotification(`Inline edit failed: ${err.message}`, "error"); },
  });

  const handleInlineEdit = useCallback((rowId: string, columnKey: string, value: unknown) => {
    inlineEditMutation.mutate({ rowId, field: columnKey, value });
  }, [inlineEditMutation]);

  const bulkEditMutation = useMutation({
    mutationFn: async ({ fieldKey, value }: { fieldKey: string; value: unknown }) => {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((tid) =>
        Pic_timeentriesService.update(tid, { [fieldKey]: value } as never)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeentries"] });
      addNotification(`${selectedIds.size} time entry(s) updated`, "success");
      setSelectedIds(new Set());
      setBulkEditOpen(false);
    },
    onError: (err) => { console.error("Bulk edit failed:", err); addNotification(`Bulk edit failed: ${err.message}`, "error"); },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ ids, activate }: { ids: string[]; activate: boolean }) => {
      for (const tid of ids) {
        await Pic_timeentriesService.update(tid, {
          statecode: (activate ? 0 : 1) as never,
          statuscode: (activate ? 1 : 2) as never,
        });
      }
    },
    onSuccess: (_, { ids, activate }) => {
      queryClient.invalidateQueries({ queryKey: ["timeentries"] });
      addNotification(`${ids.length} time entry(s) ${activate ? "activated" : "deactivated"}`, "success");
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
    exportToExcel(COLUMNS, data.data as unknown as Record<string, unknown>[], "TimeEntries");
    addNotification("Exported to CSV", "success");
  }, [data, addNotification]);

  const handleEmailLink = useCallback(async () => {
    const ok = await copyEmailLink("/timeentries", currentView.label);
    addNotification(ok ? "Link copied to clipboard" : "Failed to copy link", ok ? "success" : "error");
  }, [currentView, addNotification]);

  const handleShare = useCallback(async () => {
    const ok = await copyRecordLink("/timeentries", "");
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
            onClick: () => navigate("/timeentries/new"),
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
            navigate(`/timeentries/${Array.from(selectedIds)[0]}`);
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
        statusField="pic_isbillable"
        labelMap={chartLabelMap}
        visible={chartVisible}
      />
      <EntityListView<Pic_timeentries>
        title="Time Entries"
        columns={COLUMNS}
        data={data?.data}
        isLoading={isLoading}
        idField="pic_timeentryid"
        entityPath="/timeentries"
        views={VIEWS.map((v) => ({ key: v.key, label: v.label }))}
        activeView={activeView}
        onViewChange={setActiveView}
        onSelectionChange={setSelectedIds}
        onRowAction={handleRowAction}
        getRowActive={(row) => (row as any).statecode === 0}
        onInlineEdit={handleInlineEdit}
        extraColumns={[
          { key: "pic_description", header: "Description", dataType: "textarea" },
          { key: "_pic_categoryid_value", header: "Category", dataType: "lookup" },
          { key: "createdon", header: "Created On", dataType: "date" },
          { key: "modifiedon", header: "Modified On", dataType: "date" },
        ]}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Time Entries"
        message={`Are you sure you want to delete ${deleteTargetIds.length} selected time entry(s)? This action cannot be undone.`}
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
        entityName="Time Entry"
        selectedCount={selectedIds.size}
        fields={BULK_EDIT_FIELDS}
        onApply={(fieldKey, value) => bulkEditMutation.mutateAsync({ fieldKey, value })}
        onCancel={() => setBulkEditOpen(false)}
      />
      <ConfirmDialog
        open={activateDialogOpen}
        title={activateAction ? "Activate Time Entries" : "Deactivate Time Entries"}
        message={`Are you sure you want to ${activateAction ? "activate" : "deactivate"} ${selectedIds.size} selected time entry(s)?`}
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
