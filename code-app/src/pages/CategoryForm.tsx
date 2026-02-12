import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { SaveRegular, DeleteRegular, AddRegular, PlayRegular, DismissCircleRegular, PeopleRegular, HistoryRegular } from "@fluentui/react-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pic_categoriesService } from "@generated/services/Pic_categoriesService";
import type { Pic_categoriesBase } from "@generated/models/Pic_categoriesModel";
import { RecordForm } from "@/components/forms/RecordForm";
import { FormSection } from "@/components/forms/FormSection";
import { FormField } from "@/components/forms/FormField";
import { EntityCommandBar } from "@/components/common/EntityCommandBar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AssignDialog } from "@/components/common/AssignDialog";
import { useFormDirtyTracking } from "@/hooks/useFormDirtyTracking";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { openFlowUrl } from "@/components/common/ExportUtils";
import { useAppStore } from "@/store/useAppStore";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { GUID_RE } from "@/config/constants";

export function CategoryForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !id;
  const isValidId = !!id && GUID_RE.test(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const addRecentItem = useAppStore((s) => s.addRecentItem);

  const { data: record, isLoading, isError, error } = useQuery({
    queryKey: ["categories", "record", id],
    queryFn: async () => {
      const result = await Pic_categoriesService.get(id!);
      if (!result.success) throw new Error("Failed to load category");
      return result.data;
    },
    enabled: isValidId,
  });

  useDocumentTitle(isNew ? "New Category" : record?.pic_categoryname ? `Category: ${record.pic_categoryname}` : "Category");

  const [formData, setFormData] = useState<Partial<Pic_categoriesBase>>(() => {
    if (isNew && searchParams.get("clone") === "1") {
      try {
        const raw = sessionStorage.getItem("cloneData_categories");
        if (raw) {
          sessionStorage.removeItem("cloneData_categories");
          return { ...JSON.parse(raw), pic_isactive: 1 } as Partial<Pic_categoriesBase>;
        }
      } catch (err) { console.warn("Clone parse failed:", err); }
    }
    return isNew ? { pic_isactive: 1 as never, pic_sortorder: 0 as never } : {};
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [formNotifications, setFormNotifications] = useState<Array<{ id: string; message: string; type: "error" | "warning" | "info" }>>([]);

  useEffect(() => {
    if (record && id) {
      addRecentItem({
        id,
        title: record.pic_categoryname ?? "Untitled Category",
        entityPath: "/categories",
        entityType: "Category",
      });
    }
  }, [record, id, addRecentItem]);

  useEffect(() => {
    if (record) {
      setFormData({
        pic_categoryname: record.pic_categoryname,
        pic_description: record.pic_description,
        pic_color: record.pic_color,
        pic_sortorder: record.pic_sortorder,
        pic_isactive: record.pic_isactive,
      });
    }
  }, [record]);

  const { isDirty, isDirtyRef, dirtyFields, resetDirty } = useFormDirtyTracking(formData, id);
  const df = (field: string) => dirtyFields.includes(field);
  const { showDialog: showLeaveDialog, confirmLeave, cancelLeave } = useUnsavedChangesWarning(isDirtyRef);

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors.size > 0) {
      setValidationErrors((prev) => {
        const next = new Set(prev);
        if (field === "pic_categoryname") next.delete("Category Name");
        return next;
      });
    }
  };

  const validateRequired = (): boolean => {
    const missing: string[] = [];
    if (!formData.pic_categoryname?.toString().trim()) missing.push("Category Name");
    setValidationErrors(new Set(missing));
    if (missing.length > 0) {
      addNotification(`Required fields missing: ${missing.join(", ")}`, "error");
      setFormNotifications([{ id: "validation", message: `Required fields missing: ${missing.join(", ")}`, type: "error" }]);
      return false;
    }
    setFormNotifications((prev) => prev.filter((n) => n.id !== "validation"));

    // Cross-field business rules
    const warnings: string[] = [];
    if (formData.pic_sortorder != null && formData.pic_sortorder !== "") {
      const sort = Number(formData.pic_sortorder);
      if (sort < 0) warnings.push("Sort Order cannot be negative");
    }
    if (warnings.length > 0) {
      setFormNotifications((prev) => [
        ...prev.filter((n) => n.id !== "business-rules"),
        { id: "business-rules", message: warnings.join("; "), type: "warning" },
      ]);
      return false;
    }
    setFormNotifications((prev) => prev.filter((n) => n.id !== "business-rules"));
    return true;
  };

  const buildPayload = useCallback(() => {
    const payload: Record<string, unknown> = {};
    const writableFields = [
      "pic_categoryname", "pic_description", "pic_color",
      "pic_sortorder", "pic_isactive",
    ];
    const numericFields = new Set(["pic_sortorder"]);
    const booleanFields = new Set(["pic_isactive"]);
    for (const key of writableFields) {
      const val = (formData as Record<string, unknown>)[key];
      if (val !== undefined) {
        if (booleanFields.has(key)) {
          payload[key] = val === 1 || val === true || val === "1";
        } else if (numericFields.has(key)) {
          payload[key] = (val === null || val === "") ? null : Number(val);
        } else {
          payload[key] = val;
        }
      }
    }
    return payload;
  }, [formData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validateRequired()) throw new Error("Validation failed");
      const payload = buildPayload();
      if (isNew) {
        const name = String(formData.pic_categoryname ?? "").trim();
        if (name) {
          const dupCheck = await Pic_categoriesService.getAll({
            filter: `pic_categoryname eq '${name.replace(/'/g, "''")}'`,
            select: ["pic_categoryid", "pic_categoryname"],
          });
          if (dupCheck.data && dupCheck.data.length > 0) {
            throw new Error(`Duplicate detected: A category named "${name}" already exists.`);
          }
        }
        const result = await Pic_categoriesService.create(payload as never);
        if (!result.success) throw new Error(result.error?.message ?? "Failed to create");
        return result.data;
      }
      const result = await Pic_categoriesService.update(id!, payload as never);
      if (result.error) throw new Error(result.error.message ?? "Failed to save");
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      resetDirty();
      setLastSavedAt(new Date());
      if (isNew) {
        addNotification("Category created", "success");
        const newId = (data as unknown as Record<string, unknown>)?.pic_categoryid;
        if (newId) navigate(`/categories/${newId}`, { replace: true });
        else navigate("/categories");
      } else {
        addNotification("Category saved", "success");
      }
    },
    onError: (err) => { console.error("Save failed:", err); addNotification(`Save failed: ${err.message}`, "error"); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => Pic_categoriesService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      addNotification("Category deleted", "success");
      navigate("/categories");
    },
    onError: (err) => { console.error("Delete failed:", err); addNotification(`Delete failed: ${err.message}`, "error"); },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const active = Number(formData.pic_isactive) === 1;
      const result = await Pic_categoriesService.update(id!, {
        pic_isactive: (!active) as never,
      });
      if (result.error) throw new Error(result.error.message ?? "Failed to update status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      const wasActive = Number(formData.pic_isactive) === 1;
      addNotification(wasActive ? "Category deactivated" : "Category activated", "success");
    },
    onError: (err) => { console.error("Deactivate failed:", err); addNotification(`Failed: ${err.message}`, "error"); },
  });

  useKeyboardShortcuts({
    onSave: useCallback(() => saveMutation.mutate(), [saveMutation]),
    onSaveAndClose: useCallback(() => {
      saveMutation.mutate(undefined, { onSuccess: () => navigate("/categories") });
    }, [saveMutation, navigate]),
    disabled: saveMutation.isPending,
  });

  useAutoSave({
    isDirty,
    isNew,
    isSaving: saveMutation.isPending,
    isDeactivated: Number(formData.pic_isactive) !== 1,
    onSave: () => saveMutation.mutate(),
  });

  const formDisabled = !isNew && Number(formData.pic_isactive) !== 1;

  const r = record as unknown as Record<string, unknown> | undefined;

  const [recordSetOpen, setRecordSetOpen] = useState(false);

  const recordNavItems = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("recordNav_/categories");
      const names = sessionStorage.getItem("recordNavNames_/categories");
      if (!raw) return undefined;
      const ids: string[] = JSON.parse(raw);
      const nameMap: Record<string, string> = names ? JSON.parse(names) : {};
      return ids.map((rid) => ({ id: rid, name: nameMap[rid] || rid.substring(0, 8) + "..." }));
    } catch { return undefined; }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const recordSetInfo = useMemo(() => {
    if (!id || !recordNavItems) return undefined;
    const idx = recordNavItems.findIndex((r) => r.id === id);
    return idx >= 0 ? `${idx + 1} of ${recordNavItems.length}` : undefined;
  }, [id, recordNavItems]);

  const tabs = [
    {
      key: "general",
      label: "General",
      content: (
        <>
          <FormSection title="Category Details">
            <FormField label="Category Name" value={formData.pic_categoryname} onChange={(v) => updateField("pic_categoryname", v)} required disabled={formDisabled} isDirty={df("pic_categoryname")} validationMessage={validationErrors.has("Category Name") ? "Required" : undefined} />
            <FormField label="Color" value={formData.pic_color} onChange={(v) => updateField("pic_color", v)} placeholder="#0078d4" disabled={formDisabled} isDirty={df("pic_color")} />
            <FormField label="Sort Order" value={formData.pic_sortorder} onChange={(v) => updateField("pic_sortorder", v)} type="number" disabled={formDisabled} isDirty={df("pic_sortorder")} />
            <FormField label="Active" value={formData.pic_isactive} onChange={(v) => updateField("pic_isactive", v)} type="boolean" disabled={formDisabled} isDirty={df("pic_isactive")} />
            <FormField label="Description" value={formData.pic_description} onChange={(v) => updateField("pic_description", v)} type="textarea" disabled={formDisabled} isDirty={df("pic_description")} />
          </FormSection>
        </>
      ),
    },
    {
      key: "audit",
      label: "Audit History",
      isRelated: true,
      icon: <HistoryRegular />,
      content: (
        <FormSection title="Record Information">
          <FormField label="Created On" value={r?.createdon ? new Date(String(r.createdon)).toLocaleString() : "---"} onChange={() => {}} type="readonly" />
          <FormField label="Created By" value={String(r?.createdbyname ?? "---")} onChange={() => {}} type="readonly" />
          <FormField label="Modified On" value={r?.modifiedon ? new Date(String(r.modifiedon)).toLocaleString() : "---"} onChange={() => {}} type="readonly" />
          <FormField label="Modified By" value={String(r?.modifiedbyname ?? "---")} onChange={() => {}} type="readonly" />
          <FormField label="Owner" value={String(r?.owneridname ?? "---")} onChange={() => {}} type="readonly" />
        </FormSection>
      ),
    },
  ];

  if (!isNew && isError) {
    return (
      <>
        <EntityCommandBar showMDAActions={false} onBack={() => navigate("/categories")} actions={[]} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 48px", gap: "16px", backgroundColor: "#fff", margin: "8px 0 16px", borderRadius: "4px", boxShadow: "rgba(0,0,0,0.12) 0 0 2px 0, rgba(0,0,0,0.14) 0 2px 4px 0" }}>
          <div style={{ fontSize: "48px", color: "#d13438" }}>!</div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#323130" }}>Record Not Found</div>
          <div style={{ fontSize: "14px", color: "#605e5c", textAlign: "center" }}>{error?.message || "The requested category could not be found or you don't have permission to view it."}</div>
          <button onClick={() => navigate("/categories")} style={{ marginTop: "8px", padding: "8px 24px", backgroundColor: "#0078d4", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>Back to Categories</button>
        </div>
      </>
    );
  }

  return (
    <>
      <EntityCommandBar
        showMDAActions={false}
        onBack={() => window.history.length > 2 ? navigate(-1) : navigate("/categories")}
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ["categories", "record", id] });
          addNotification("Refreshed", "success");
        }}
        actions={[
          {
            key: "save",
            label: "Save",
            icon: SaveRegular,
            primary: true,
            onClick: () => saveMutation.mutate(),
            disabled: saveMutation.isPending || (!isDirty && !isNew),
            tooltip: "Ctrl+S",
          },
          {
            key: "saveclose",
            label: "Save & Close",
            icon: SaveRegular,
            onClick: () => {
              saveMutation.mutate(undefined, {
                onSuccess: () => navigate("/categories"),
              });
            },
            disabled: saveMutation.isPending || (!isDirty && !isNew),
            tooltip: "Ctrl+Shift+S",
          },
          {
            key: "new",
            label: "New",
            icon: AddRegular,
            onClick: () => navigate("/categories/new"),
          },
          ...(!isNew
            ? [
                {
                  key: "deactivate",
                  label: Number(formData.pic_isactive) === 1 ? "Deactivate" : "Activate",
                  icon: DismissCircleRegular,
                  onClick: () => setDeactivateDialogOpen(true),
                  disabled: deactivateMutation.isPending,
                },
                {
                  key: "assign",
                  label: "Assign",
                  icon: PeopleRegular,
                  onClick: () => setAssignDialogOpen(true),
                },
                {
                  key: "delete",
                  label: "Delete",
                  icon: DeleteRegular,
                  danger: true,
                  onClick: () => setDeleteDialogOpen(true),
                },
              ]
            : []),
          {
            key: "flow",
            label: "Flow",
            icon: PlayRegular,
            hasDropdown: true,
            onClick: openFlowUrl,
          },
        ]}
        onToggleRecordSet={() => setRecordSetOpen((v) => !v)}
        recordSetOpen={recordSetOpen}
        recordSetInfo={recordSetInfo}
      />
      <RecordForm
        title={isNew ? "New Category" : (record?.pic_categoryname ?? "Loading...")}
        subtitle="Category"
        formOptions={["Category Main Form"]}
        activeForm="Category Main Form"
        entityColor="#8764b8"
        tabs={tabs}
        isLoading={!isNew && isLoading}
        isSaving={saveMutation.isPending}
        isDirty={isDirty}
        isDeactivated={!isNew && Number(formData.pic_isactive) !== 1}
        currentRecordId={id}
        entityPath="/categories"
        keyFields={!isNew && record ? [
          { label: "Created On", value: record.createdon ? new Date(record.createdon).toLocaleString() : "" },
          { label: "Modified On", value: record.modifiedon ? new Date(record.modifiedon).toLocaleString() : "" },
        ] : undefined}
        recordNavItems={recordNavItems}
        recordSetOpen={recordSetOpen}
        onToggleRecordSet={() => setRecordSetOpen((v) => !v)}
        lastSavedAt={lastSavedAt}
        notifications={formNotifications}
        onDismissNotification={(id) => setFormNotifications((prev) => prev.filter((n) => n.id !== id))}
        statusBadge={!isNew ? (Number(formData.pic_isactive) === 1
          ? { bg: "#dff6dd", fg: "#107c10", label: "Active" }
          : { bg: "#edebe9", fg: "#797775", label: "Inactive" }) : undefined}
        recordInfo={!isNew && record ? {
          createdBy: record.createdbyname ?? undefined,
          createdOn: record.createdon ? new Date(record.createdon).toLocaleString() : undefined,
          modifiedBy: record.modifiedbyname ?? undefined,
          modifiedOn: record.modifiedon ? new Date(record.modifiedon).toLocaleString() : undefined,
        } : undefined}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Category"
        message="Delete this category? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { deleteMutation.mutate(); setDeleteDialogOpen(false); }}
        onCancel={() => setDeleteDialogOpen(false)}
        danger
      />
      <ConfirmDialog
        open={deactivateDialogOpen}
        title={Number(formData.pic_isactive) === 1 ? "Deactivate Category" : "Activate Category"}
        message={Number(formData.pic_isactive) === 1 ? "Are you sure you want to deactivate this category?" : "Are you sure you want to activate this category?"}
        confirmLabel={Number(formData.pic_isactive) === 1 ? "Deactivate" : "Activate"}
        onConfirm={() => { deactivateMutation.mutate(); setDeactivateDialogOpen(false); }}
        onCancel={() => setDeactivateDialogOpen(false)}
      />
      <ConfirmDialog
        open={showLeaveDialog}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave this page?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
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
    </>
  );
}
