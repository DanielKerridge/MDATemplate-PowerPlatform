import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AddRegular } from "@fluentui/react-icons";
import { Pic_teammembersService } from "@generated/services/Pic_teammembersService";
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
import type { Pic_teammembers } from "@generated/models/Pic_teammembersModel";

const DEPT_LABELS: Record<number, string> = {
  10000: "Engineering", 10001: "Design", 10002: "QA",
  10003: "Product", 10004: "Marketing", 10005: "Sales", 10006: "Operations",
};

const VIEWS = [
  { key: "active", label: "Active Members", filter: "statecode eq 0" },
  { key: "all", label: "All Members", filter: "" },
];

const COLUMNS: ColumnDef<Pic_teammembers>[] = [
  { key: "pic_fullname", header: "Full Name", width: "200px", dataType: "text" },
  { key: "pic_email", header: "Email", width: "220px", dataType: "text" },
  {
    key: "pic_role",
    header: "Role",
    width: "140px",
    dataType: "optionset",
    editable: true,
    editOptions: STATUS_OPTIONS.role,
    render: (row) => {
      const entry = (STATUS_COLORS.role as Record<number, { label: string }>)[Number(row.pic_role)];
      return entry?.label ?? String(row.pic_role ?? "");
    },
  },
  { key: "pic_department", header: "Department", width: "140px", dataType: "optionset", render: (row) => DEPT_LABELS[Number(row.pic_department)] ?? String(row.pic_department ?? "") },
  {
    key: "pic_isavailable",
    header: "Is Available",
    width: "100px",
    dataType: "boolean",
    editable: true,
    render: (row) => (Number(row.pic_isavailable) === 1 ? "Yes" : "No"),
  },
];

const chartLabelMap = Object.fromEntries(
  Object.entries(STATUS_COLORS.role).map(([val, info]) => [val, { label: info.label, color: info.bg }])
);

const BULK_EDIT_FIELDS: BulkEditField[] = [
  { key: "pic_role", label: "Role", type: "select", options: STATUS_OPTIONS.role },
  { key: "pic_isavailable", label: "Is Available", type: "boolean" },
];

export function TeamMemberList() {
  const navigate = useNavigate();
  const addNotification = useAppStore((s) => s.addNotification);
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState(() => getStoredDefault("teammembers", "active"));
  useDocumentTitle("Active Team Members");
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
    queryKey: ["teammembers", "list", activeView],
    queryFn: () =>
      Pic_teammembersService.getAll({
        select: [
          "pic_teammemberid",
          "pic_fullname",
          "pic_email",
          "pic_role",
          "pic_department",
          "pic_isavailable",
          "statecode",
        ],
        filter: currentView.filter || undefined,
        orderBy: ["pic_fullname asc"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await Pic_teammembersService.delete(id);
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["teammembers"] });
      addNotification(`${ids.length} team member(s) deleted`, "success");
      setSelectedIds(new Set());
      setDeleteTargetIds([]);
      setDeleteDialogOpen(false);
    },
    onError: (err) => {
      console.error("Delete failed:", err);
      addNotification(`Delete failed: ${err.message}`, "error");
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["teammembers"] });
    },
  });

  const inlineEditMutation = useMutation({
    mutationFn: async ({ rowId, field, value }: { rowId: string; field: string; value: unknown }) => {
      await Pic_teammembersService.update(rowId, { [field]: value } as never);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teammembers"] }); },
    onError: (err) => { console.error("Inline edit failed:", err); addNotification(`Inline edit failed: ${err.message}`, "error"); },
  });

  const handleInlineEdit = useCallback((rowId: string, columnKey: string, value: unknown) => {
    inlineEditMutation.mutate({ rowId, field: columnKey, value });
  }, [inlineEditMutation]);

  const bulkEditMutation = useMutation({
    mutationFn: async ({ fieldKey, value }: { fieldKey: string; value: unknown }) => {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((mid) =>
        Pic_teammembersService.update(mid, { [fieldKey]: value } as never)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teammembers"] });
      addNotification(`${selectedIds.size} team member(s) updated`, "success");
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
    exportToExcel(COLUMNS, data.data as unknown as Record<string, unknown>[], "TeamMembers");
    addNotification("Exported to CSV", "success");
  }, [data, addNotification]);

  const handleEmailLink = useCallback(async () => {
    const ok = await copyEmailLink("/teammembers", currentView.label);
    addNotification(ok ? "Link copied to clipboard" : "Failed to copy link", ok ? "success" : "error");
  }, [currentView, addNotification]);

  const handleShare = useCallback(async () => {
    const ok = await copyRecordLink("/teammembers", "");
    addNotification(ok ? "Link copied to clipboard" : "Failed to copy link", ok ? "success" : "error");
  }, [addNotification]);

  const activateMutation = useMutation({
    mutationFn: async ({ ids, activate }: { ids: string[]; activate: boolean }) => {
      for (const id of ids) {
        await Pic_teammembersService.update(id, {
          statecode: (activate ? 0 : 1) as never,
          statuscode: (activate ? 1 : 2) as never,
        });
      }
    },
    onSuccess: (_, { ids, activate }) => {
      queryClient.invalidateQueries({ queryKey: ["teammembers"] });
      addNotification(`${ids.length} member(s) ${activate ? "activated" : "deactivated"}`, "success");
      setSelectedIds(new Set());
    },
    onError: (err) => { console.error("Activate/deactivate failed:", err); addNotification(`Failed: ${err.message}`, "error"); },
  });

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
            onClick: () => navigate("/teammembers/new"),
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
            navigate(`/teammembers/${Array.from(selectedIds)[0]}`);
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
        statusField="pic_role"
        labelMap={chartLabelMap}
        visible={chartVisible}
      />
      <EntityListView<Pic_teammembers>
        title="Team Members"
        columns={COLUMNS}
        data={data?.data}
        isLoading={isLoading}
        idField="pic_teammemberid"
        entityPath="/teammembers"
        views={VIEWS.map((v) => ({ key: v.key, label: v.label }))}
        activeView={activeView}
        onViewChange={setActiveView}
        onSelectionChange={setSelectedIds}
        onRowAction={handleRowAction}
        getRowActive={(row) => (row as any).statecode === 0}
        onInlineEdit={handleInlineEdit}
        extraColumns={[
          { key: "pic_phone", header: "Phone", dataType: "text" },
          { key: "pic_department", header: "Department", dataType: "text" },
          { key: "pic_jobtitle", header: "Job Title", dataType: "text" },
          { key: "createdon", header: "Created On", dataType: "date" },
          { key: "modifiedon", header: "Modified On", dataType: "date" },
        ]}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Team Members"
        message={`Are you sure you want to delete ${deleteTargetIds.length} selected team member(s)? This action cannot be undone.`}
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
        entityName="Team Member"
        selectedCount={selectedIds.size}
        fields={BULK_EDIT_FIELDS}
        onApply={(fieldKey, value) => bulkEditMutation.mutateAsync({ fieldKey, value })}
        onCancel={() => setBulkEditOpen(false)}
      />
      <ConfirmDialog
        open={activateDialogOpen}
        title={activateAction ? "Activate Team Members" : "Deactivate Team Members"}
        message={`Are you sure you want to ${activateAction ? "activate" : "deactivate"} ${selectedIds.size} selected team member(s)?`}
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
