import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AddRegular } from "@fluentui/react-icons";
import { Pic_categoriesService } from "@generated/services/Pic_categoriesService";
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
import type { Pic_categories } from "@generated/models/Pic_categoriesModel";

const VIEWS = [
  { key: "active", label: "Active Categories", filter: "pic_isactive eq true" },
  { key: "all", label: "All Categories", filter: "" },
  { key: "inactive", label: "Inactive Categories", filter: "pic_isactive eq false" },
];

const BULK_EDIT_FIELDS: BulkEditField[] = [
  { key: "pic_isactive", label: "Active", type: "boolean" },
  { key: "pic_sortorder", label: "Sort Order", type: "number" },
];

const COLUMNS: ColumnDef<Pic_categories>[] = [
  { key: "pic_categoryname", header: "Category Name", width: "250px", dataType: "text" },
  { key: "pic_description", header: "Description", width: "300px", dataType: "text" },
  { key: "pic_color", header: "Color", width: "100px", dataType: "text" },
  {
    key: "pic_sortorder",
    header: "Sort Order",
    width: "100px",
    dataType: "number",
    editable: true,
    render: (row) => String(row.pic_sortorder ?? ""),
  },
  {
    key: "pic_isactive",
    header: "Active",
    width: "80px",
    dataType: "boolean",
    editable: true,
    render: (row) => (Number(row.pic_isactive) === 1 ? "Yes" : "No"),
  },
];

export function CategoryList() {
  const navigate = useNavigate();
  const addNotification = useAppStore((s) => s.addNotification);
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState(() => getStoredDefault("categories", "active"));
  useDocumentTitle("Active Categories");
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
    queryKey: ["categories", "list", activeView],
    queryFn: () =>
      Pic_categoriesService.getAll({
        select: [
          "pic_categoryid",
          "pic_categoryname",
          "pic_description",
          "pic_color",
          "pic_sortorder",
          "pic_isactive",
        ],
        filter: currentView.filter || undefined,
        orderBy: ["pic_sortorder asc"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await Pic_categoriesService.delete(id);
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      addNotification(`${ids.length} category(s) deleted`, "success");
      setSelectedIds(new Set());
      setDeleteTargetIds([]);
      setDeleteDialogOpen(false);
    },
    onError: (err) => {
      console.error("Delete failed:", err);
      addNotification(`Delete failed: ${err.message}`, "error");
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const inlineEditMutation = useMutation({
    mutationFn: async ({ rowId, field, value }: { rowId: string; field: string; value: unknown }) => {
      await Pic_categoriesService.update(rowId, { [field]: value } as never);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (err) => { console.error("Inline edit failed:", err); addNotification(`Inline edit failed: ${err.message}`, "error"); },
  });

  const handleInlineEdit = useCallback((rowId: string, columnKey: string, value: unknown) => {
    inlineEditMutation.mutate({ rowId, field: columnKey, value });
  }, [inlineEditMutation]);

  const bulkEditMutation = useMutation({
    mutationFn: async ({ fieldKey, value }: { fieldKey: string; value: unknown }) => {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((cid) =>
        Pic_categoriesService.update(cid, { [fieldKey]: value } as never)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      addNotification(`${selectedIds.size} category(s) updated`, "success");
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
    exportToExcel(COLUMNS, data.data as unknown as Record<string, unknown>[], "Categories");
    addNotification("Exported to CSV", "success");
  }, [data, addNotification]);

  const handleEmailLink = useCallback(async () => {
    const ok = await copyEmailLink("/categories", currentView.label);
    addNotification(ok ? "Link copied to clipboard" : "Failed to copy link", ok ? "success" : "error");
  }, [currentView, addNotification]);

  const handleShare = useCallback(async () => {
    const ok = await copyRecordLink("/categories", "");
    addNotification(ok ? "Link copied to clipboard" : "Failed to copy link", ok ? "success" : "error");
  }, [addNotification]);

  const activateMutation = useMutation({
    mutationFn: async ({ ids, activate }: { ids: string[]; activate: boolean }) => {
      for (const id of ids) {
        await Pic_categoriesService.update(id, { pic_isactive: activate as never });
      }
    },
    onSuccess: (_, { ids, activate }) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      addNotification(`${ids.length} category(s) ${activate ? "activated" : "deactivated"}`, "success");
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
            onClick: () => navigate("/categories/new"),
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
            navigate(`/categories/${Array.from(selectedIds)[0]}`);
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
        statusField="pic_isactive"
        labelMap={{
          "1": { label: "Active", color: "#107c10" },
          "0": { label: "Inactive", color: "#605e5c" },
        }}
        visible={chartVisible}
      />
      <EntityListView<Pic_categories>
        title="Categories"
        columns={COLUMNS}
        data={data?.data}
        isLoading={isLoading}
        idField="pic_categoryid"
        entityPath="/categories"
        views={VIEWS.map((v) => ({ key: v.key, label: v.label }))}
        activeView={activeView}
        onViewChange={setActiveView}
        onSelectionChange={setSelectedIds}
        onRowAction={handleRowAction}
        getRowActive={(row) => Number(row.pic_isactive) === 1}
        onInlineEdit={handleInlineEdit}
        extraColumns={[
          { key: "_pic_parentcategoryid_value", header: "Parent Category", dataType: "lookup" },
          { key: "createdon", header: "Created On", dataType: "date" },
          { key: "modifiedon", header: "Modified On", dataType: "date" },
        ]}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Categories"
        message={`Are you sure you want to delete ${deleteTargetIds.length} selected category(s)? This action cannot be undone.`}
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
        entityName="Category"
        selectedCount={selectedIds.size}
        fields={BULK_EDIT_FIELDS}
        onApply={(fieldKey, value) => bulkEditMutation.mutateAsync({ fieldKey, value })}
        onCancel={() => setBulkEditOpen(false)}
      />
      <ConfirmDialog
        open={activateDialogOpen}
        title={activateAction ? "Activate Categories" : "Deactivate Categories"}
        message={`Are you sure you want to ${activateAction ? "activate" : "deactivate"} ${selectedIds.size} selected category(s)?`}
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
