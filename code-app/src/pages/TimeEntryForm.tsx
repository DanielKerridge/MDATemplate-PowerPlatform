import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { SaveRegular, DeleteRegular, AddRegular, PlayRegular, DismissCircleRegular, PeopleRegular, HistoryRegular } from "@fluentui/react-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pic_timeentriesService } from "@generated/services/Pic_timeentriesService";
import { Pic_projectsService } from "@generated/services/Pic_projectsService";
import { Pic_teammembersService } from "@generated/services/Pic_teammembersService";
import type { Pic_timeentriesBase } from "@generated/models/Pic_timeentriesModel";
import { RecordForm } from "@/components/forms/RecordForm";
import { FormSection } from "@/components/forms/FormSection";
import { FormField } from "@/components/forms/FormField";
import type { LookupSearchResult } from "@/components/forms/FormField";
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
import { APP_CONFIG, GUID_RE } from "@/config/constants";

export function TimeEntryForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !id;
  const isValidId = !!id && GUID_RE.test(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const addRecentItem = useAppStore((s) => s.addRecentItem);

  const { data: record, isLoading, isError, error } = useQuery({
    queryKey: ["timeentries", "record", id],
    queryFn: async () => {
      const result = await Pic_timeentriesService.get(id!);
      if (!result.success) throw new Error("Failed to load time entry");
      return result.data;
    },
    enabled: isValidId,
  });

  useDocumentTitle(isNew ? "New Time Entry" : record?.pic_description ? `Time Entry: ${record.pic_description}` : "Time Entry");

  const [formData, setFormData] = useState<Partial<Pic_timeentriesBase>>(() => {
    if (isNew && searchParams.get("clone") === "1") {
      try {
        const raw = sessionStorage.getItem("cloneData_timeentries");
        if (raw) {
          sessionStorage.removeItem("cloneData_timeentries");
          return { ...JSON.parse(raw), pic_isbillable: 1 } as Partial<Pic_timeentriesBase>;
        }
      } catch (err) { console.warn("Clone parse failed:", err); }
    }
    return isNew ? { pic_isbillable: 1 as never } : {};
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
        title: record.pic_description ?? "Untitled Entry",
        entityPath: "/timeentries",
        entityType: "Time Entry",
      });
    }
  }, [record, id, addRecentItem]);

  useEffect(() => {
    if (record) {
      setFormData({
        pic_description: record.pic_description,
        pic_entrydate: record.pic_entrydate,
        pic_duration: record.pic_duration,
        pic_isbillable: record.pic_isbillable,
        pic_notes: record.pic_notes,
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
        const labelMap: Record<string, string> = { pic_description: "Description", pic_entrydate: "Entry Date" };
        const label = labelMap[field];
        if (label) next.delete(label);
        return next;
      });
    }
  };

  const validateRequired = (): boolean => {
    const missing: string[] = [];
    if (!formData.pic_description?.toString().trim()) missing.push("Description");
    if (!formData.pic_entrydate) missing.push("Entry Date");
    setValidationErrors(new Set(missing));
    if (missing.length > 0) {
      addNotification(`Required fields missing: ${missing.join(", ")}`, "error");
      setFormNotifications([{ id: "validation", message: `Required fields missing: ${missing.join(", ")}`, type: "error" }]);
      return false;
    }
    setFormNotifications((prev) => prev.filter((n) => n.id !== "validation"));

    // Cross-field business rules
    const warnings: string[] = [];
    if (formData.pic_duration != null && formData.pic_duration !== "") {
      const dur = Number(formData.pic_duration);
      if (dur <= 0) warnings.push("Duration must be greater than 0");
      if (dur > 24) warnings.push("Duration cannot exceed 24 hours");
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
      "pic_description", "pic_entrydate", "pic_duration",
      "pic_isbillable", "pic_notes",
    ];
    const numericFields = new Set(["pic_duration"]);
    const booleanFields = new Set(["pic_isbillable"]);
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
    // Include lookup @odata.bind fields if present
    const bindKeys = ["pic_ProjectId@odata.bind", "pic_TeamMemberId@odata.bind"];
    for (const bk of bindKeys) {
      const val = (formData as Record<string, unknown>)[bk];
      if (val !== undefined) payload[bk] = val;
    }
    return payload;
  }, [formData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validateRequired()) throw new Error("Validation failed");
      const payload = buildPayload();
      if (isNew) {
        const result = await Pic_timeentriesService.create(payload as never);
        if (!result.success) throw new Error(result.error?.message ?? "Failed to create");
        return result.data;
      }
      const result = await Pic_timeentriesService.update(id!, payload as never);
      if (result.error) throw new Error(result.error.message ?? "Failed to save");
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["timeentries"] });
      resetDirty();
      setLastSavedAt(new Date());
      if (isNew) {
        addNotification("Time entry created", "success");
        const newId = (data as unknown as Record<string, unknown>)?.pic_timeentryid;
        if (newId) navigate(`/timeentries/${newId}`, { replace: true });
        else navigate("/timeentries");
      } else {
        addNotification("Time entry saved", "success");
      }
    },
    onError: (err) => { console.error("Save failed:", err); addNotification(`Save failed: ${err.message}`, "error"); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => Pic_timeentriesService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeentries"] });
      addNotification("Time entry deleted", "success");
      navigate("/timeentries");
    },
    onError: (err) => { console.error("Delete failed:", err); addNotification(`Delete failed: ${err.message}`, "error"); },
  });

  const isDeactivated = !isNew && record?.statecode === 1;

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const active = record?.statecode === 0;
      const result = await Pic_timeentriesService.update(id!, {
        statecode: (active ? 1 : 0) as never,
        statuscode: (active ? 2 : 1) as never,
      });
      if (result.error) throw new Error(result.error.message ?? "Failed to update status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeentries"] });
      const wasActive = record?.statecode === 0;
      addNotification(wasActive ? "Time entry deactivated" : "Time entry activated", "success");
    },
    onError: (err) => { console.error("Deactivate failed:", err); addNotification(`Failed: ${err.message}`, "error"); },
  });

  useKeyboardShortcuts({
    onSave: useCallback(() => saveMutation.mutate(), [saveMutation]),
    onSaveAndClose: useCallback(() => {
      saveMutation.mutate(undefined, { onSuccess: () => navigate("/timeentries") });
    }, [saveMutation, navigate]),
    disabled: saveMutation.isPending,
  });

  useAutoSave({
    isDirty,
    isNew,
    isSaving: saveMutation.isPending,
    isDeactivated,
    onSave: () => saveMutation.mutate(),
  });

  const r = record as unknown as Record<string, unknown> | undefined;

  // Lookup names from record
  const projectName = r?.pic_projectidname
    ?? r?.["_pic_projectid_value@OData.Community.Display.V1.FormattedValue"]
    ?? "";
  const teamMemberName = r?.pic_teammemberidname
    ?? r?.["_pic_teammemberid_value@OData.Community.Display.V1.FormattedValue"]
    ?? "";

  const searchProjects = useCallback(async (query: string): Promise<LookupSearchResult[]> => {
    try {
      const filter = query ? `contains(pic_projectname, '${query.replace(/'/g, "''")}')` : undefined;
      const result = await Pic_projectsService.getAll({ filter, orderBy: ["pic_projectname asc"] });
      return (result.data ?? []).map((p) => ({
        id: String((p as unknown as Record<string, unknown>).pic_projectid ?? ""),
        name: String((p as unknown as Record<string, unknown>).pic_projectname ?? ""),
      }));
    } catch (err) {
      console.error("Project lookup search failed:", err);
      return [];
    }
  }, []);

  const searchTeamMembers = useCallback(async (query: string): Promise<LookupSearchResult[]> => {
    try {
      const filter = query ? `contains(pic_fullname, '${query.replace(/'/g, "''")}')` : undefined;
      const result = await Pic_teammembersService.getAll({ filter, orderBy: ["pic_fullname asc"] });
      return (result.data ?? []).map((t) => ({
        id: String((t as unknown as Record<string, unknown>).pic_teammemberid ?? ""),
        name: String((t as unknown as Record<string, unknown>).pic_fullname ?? ""),
      }));
    } catch (err) {
      console.error("Team member lookup search failed:", err);
      return [];
    }
  }, []);

  const [recordSetOpen, setRecordSetOpen] = useState(false);

  const recordNavItems = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("recordNav_/timeentries");
      const names = sessionStorage.getItem("recordNavNames_/timeentries");
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
        <FormSection title="Time Entry Details">
          <FormField label="Description" value={formData.pic_description} onChange={(v) => updateField("pic_description", v)} required disabled={isDeactivated} isDirty={df("pic_description")} validationMessage={validationErrors.has("Description") ? "Required" : undefined} />
          <FormField label="Entry Date" value={formData.pic_entrydate} onChange={(v) => updateField("pic_entrydate", v)} type="date" required disabled={isDeactivated} isDirty={df("pic_entrydate")} validationMessage={validationErrors.has("Entry Date") ? "Required" : undefined} />
          <FormField label="Duration (hours)" value={formData.pic_duration} onChange={(v) => updateField("pic_duration", v)} type="spinner" step={APP_CONFIG.TIME_ENTRY_MIN_DURATION} min={APP_CONFIG.TIME_ENTRY_MIN_DURATION} max={APP_CONFIG.TIME_ENTRY_MAX_DURATION} disabled={isDeactivated} isDirty={df("pic_duration")} />
          <FormField label="Billable" value={formData.pic_isbillable} onChange={(v) => updateField("pic_isbillable", v)} type="boolean" disabled={isDeactivated} isDirty={df("pic_isbillable")} />
          <FormField
            label="Project"
            value={String(projectName)}
            onChange={() => {}}
            type="lookup"
            disabled={isDeactivated}
            onLookupSearch={searchProjects}
            onLookupSelect={(result) => updateField("pic_ProjectId@odata.bind", `/pic_projects(${result.id})`)}
            onLookupClear={() => updateField("pic_ProjectId@odata.bind", null)}
            onLookupNewRecord={() => navigate("/projects/new")}
            onLookupNavigate={r?._pic_projectid_value ? () => navigate(`/projects/${r._pic_projectid_value}`) : undefined}
            lookupTables={[
              { key: "projects", label: "Projects", onSearch: searchProjects },
            ]}
          />
          <FormField
            label="Team Member"
            value={String(teamMemberName)}
            onChange={() => {}}
            type="lookup"
            disabled={isDeactivated}
            onLookupSearch={searchTeamMembers}
            onLookupSelect={(result) => updateField("pic_TeamMemberId@odata.bind", `/pic_teammembers(${result.id})`)}
            onLookupClear={() => updateField("pic_TeamMemberId@odata.bind", null)}
            onLookupNewRecord={() => navigate("/teammembers/new")}
            onLookupNavigate={r?._pic_teammemberid_value ? () => navigate(`/teammembers/${r._pic_teammemberid_value}`) : undefined}
            lookupTables={[
              { key: "teammembers", label: "Team Members", onSearch: searchTeamMembers },
            ]}
          />
          <FormField label="Internal Comments" value={formData.pic_notes} onChange={(v) => updateField("pic_notes", v)} type="textarea" disabled={isDeactivated} isDirty={df("pic_notes")} />
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
        <EntityCommandBar showMDAActions={false} onBack={() => navigate("/timeentries")} actions={[]} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 48px", gap: "16px", backgroundColor: "#fff", margin: "8px 0 16px", borderRadius: "4px", boxShadow: "rgba(0,0,0,0.12) 0 0 2px 0, rgba(0,0,0,0.14) 0 2px 4px 0" }}>
          <div style={{ fontSize: "48px", color: "#d13438" }}>!</div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#323130" }}>Record Not Found</div>
          <div style={{ fontSize: "14px", color: "#605e5c", textAlign: "center" }}>{error?.message || "The requested time entry could not be found or you don't have permission to view it."}</div>
          <button onClick={() => navigate("/timeentries")} style={{ marginTop: "8px", padding: "8px 24px", backgroundColor: "#0078d4", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>Back to Time Entries</button>
        </div>
      </>
    );
  }

  return (
    <>
      <EntityCommandBar
        showMDAActions={false}
        onBack={() => window.history.length > 2 ? navigate(-1) : navigate("/timeentries")}
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ["timeentries", "record", id] });
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
                onSuccess: () => navigate("/timeentries"),
              });
            },
            disabled: saveMutation.isPending || (!isDirty && !isNew),
            tooltip: "Ctrl+Shift+S",
          },
          {
            key: "new",
            label: "New",
            icon: AddRegular,
            onClick: () => navigate("/timeentries/new"),
          },
          ...(!isNew
            ? [
                {
                  key: "deactivate",
                  label: isDeactivated ? "Activate" : "Deactivate",
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
        title={isNew ? "New Time Entry" : (record?.pic_description ?? "Loading...")}
        subtitle="Time Entry"
        formOptions={["Time Entry Main Form"]}
        activeForm="Time Entry Main Form"
        entityColor="#ca5010"
        tabs={tabs}
        isLoading={!isNew && isLoading}
        isSaving={saveMutation.isPending}
        isDirty={isDirty}
        isDeactivated={isDeactivated}
        statusBadge={!isNew ? (record?.statecode === 0
          ? { bg: "#dff6dd", fg: "#107c10", label: "Active" }
          : { bg: "#edebe9", fg: "#797775", label: "Inactive" }) : undefined}
        currentRecordId={id}
        entityPath="/timeentries"
        keyFields={!isNew && record ? [
          { label: "Created On", value: record.createdon ? new Date(record.createdon).toLocaleString() : "" },
          { label: "Modified On", value: record.modifiedon ? new Date(record.modifiedon).toLocaleString() : "" },
        ] : undefined}
        recordNavItems={recordNavItems}
        recordSetOpen={recordSetOpen}
        onToggleRecordSet={() => setRecordSetOpen((v) => !v)}
        lastSavedAt={lastSavedAt}
        notifications={formNotifications}
        onDismissNotification={(nid) => setFormNotifications((prev) => prev.filter((n) => n.id !== nid))}
        recordInfo={!isNew && record ? {
          createdBy: record.createdbyname ?? undefined,
          createdOn: record.createdon ? new Date(record.createdon).toLocaleString() : undefined,
          modifiedBy: record.modifiedbyname ?? undefined,
          modifiedOn: record.modifiedon ? new Date(record.modifiedon).toLocaleString() : undefined,
        } : undefined}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Time Entry"
        message="Delete this time entry? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { deleteMutation.mutate(); setDeleteDialogOpen(false); }}
        onCancel={() => setDeleteDialogOpen(false)}
        danger
      />
      <ConfirmDialog
        open={deactivateDialogOpen}
        title={isDeactivated ? "Activate Time Entry" : "Deactivate Time Entry"}
        message={isDeactivated ? "Are you sure you want to activate this time entry?" : "Are you sure you want to deactivate this time entry?"}
        confirmLabel={isDeactivated ? "Activate" : "Deactivate"}
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
