import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { SaveRegular, DeleteRegular, AddRegular, DismissCircleRegular, PlayRegular, PeopleRegular, HistoryRegular, ClipboardTaskRegular } from "@fluentui/react-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pic_teammembersService } from "@generated/services/Pic_teammembersService";
import { Pic_projectassignmentsService } from "@generated/services/Pic_projectassignmentsService";
import type { Pic_teammembersBase } from "@generated/models/Pic_teammembersModel";
import { RecordForm } from "@/components/forms/RecordForm";
import { FormSection } from "@/components/forms/FormSection";
import { FormField } from "@/components/forms/FormField";
import { EntityCommandBar } from "@/components/common/EntityCommandBar";
import { SubGrid } from "@/components/forms/SubGrid";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AssignDialog } from "@/components/common/AssignDialog";
import { useFormDirtyTracking } from "@/hooks/useFormDirtyTracking";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { openFlowUrl } from "@/components/common/ExportUtils";
import { useAppStore } from "@/store/useAppStore";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { STATUS_OPTIONS, GUID_RE } from "@/config/constants";

export function TeamMemberForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !id;
  const isValidId = !!id && GUID_RE.test(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const addRecentItem = useAppStore((s) => s.addRecentItem);

  const { data: record, isLoading, isError, error } = useQuery({
    queryKey: ["teammembers", "record", id],
    queryFn: async () => {
      const result = await Pic_teammembersService.get(id!);
      if (!result.success) throw new Error("Failed to load team member");
      return result.data;
    },
    enabled: isValidId,
  });

  // Fetch related project assignments
  const { data: relatedAssignments } = useQuery({
    queryKey: ["assignments", "byTeamMember", id],
    queryFn: async () => {
      const result = await Pic_projectassignmentsService.getAll({
        filter: `_pic_teammemberid_value eq ${id}`,
      });
      return result.data ?? [];
    },
    enabled: isValidId,
  });

  useDocumentTitle(isNew ? "New Team Member" : record?.pic_fullname ? `Team Member: ${record.pic_fullname}` : "Team Member");

  const [formData, setFormData] = useState<Partial<Pic_teammembersBase>>(() => {
    if (isNew && searchParams.get("clone") === "1") {
      try {
        const raw = sessionStorage.getItem("cloneData_teammembers");
        if (raw) {
          sessionStorage.removeItem("cloneData_teammembers");
          return { ...JSON.parse(raw), pic_isavailable: 1 } as Partial<Pic_teammembersBase>;
        }
      } catch (err) { console.warn("Clone parse failed:", err); }
    }
    return isNew ? { statecode: 0 as never, pic_isavailable: 1 as never } : {};
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
        title: record.pic_fullname ?? "Untitled Member",
        entityPath: "/teammembers",
        entityType: "Team Member",
      });
    }
  }, [record, id, addRecentItem]);

  useEffect(() => {
    if (record) {
      setFormData({
        pic_fullname: record.pic_fullname,
        pic_email: record.pic_email,
        pic_phone: record.pic_phone,
        pic_role: record.pic_role,
        pic_department: record.pic_department,
        pic_location: record.pic_location,
        statecode: record.statecode,
        pic_isavailable: record.pic_isavailable,
        pic_hourlyrate: record.pic_hourlyrate,
        pic_joindate: record.pic_joindate,
        pic_skills: record.pic_skills,
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
        const labelMap: Record<string, string> = { pic_fullname: "Full Name", pic_email: "Email", pic_role: "Role" };
        const label = labelMap[field];
        if (label) next.delete(label);
        return next;
      });
    }
  };

  const validateRequired = (): boolean => {
    const missing: string[] = [];
    if (!formData.pic_fullname?.toString().trim()) missing.push("Full Name");
    if (!formData.pic_email?.toString().trim()) missing.push("Email");
    if (!formData.pic_role) missing.push("Role");
    setValidationErrors(new Set(missing));

    const warnings: string[] = [];
    const email = formData.pic_email?.toString().trim() ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      warnings.push("Email format appears invalid");
    }
    if (formData.pic_hourlyrate != null && Number(formData.pic_hourlyrate) < 0) {
      warnings.push("Hourly Rate cannot be negative");
    }

    const notifications: typeof formNotifications = [];
    if (missing.length > 0) {
      addNotification(`Required fields missing: ${missing.join(", ")}`, "error");
      notifications.push({ id: "validation", message: `Required fields missing: ${missing.join(", ")}`, type: "error" });
    }
    if (warnings.length > 0) {
      notifications.push({ id: "business-rules", message: warnings.join("; "), type: "warning" });
    }
    setFormNotifications(notifications.length > 0 ? notifications : []);
    return missing.length === 0;
  };

  const buildPayload = useCallback(() => {
    const payload: Record<string, unknown> = {};
    const writableFields = [
      "pic_fullname", "pic_email", "pic_phone", "pic_role",
      "pic_department", "pic_location", "pic_isavailable", "pic_hourlyrate",
      "pic_joindate", "pic_skills",
    ];
    const numericFields = new Set([
      "pic_role", "pic_department", "pic_hourlyrate", "pic_skills",
    ]);
    const booleanFields = new Set(["pic_isavailable"]);
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
        const name = String(formData.pic_fullname ?? "").trim();
        if (name) {
          const dupCheck = await Pic_teammembersService.getAll({
            filter: `pic_fullname eq '${name.replace(/'/g, "''")}'`,
            select: ["pic_teammemberid", "pic_fullname"],
          });
          if (dupCheck.data && dupCheck.data.length > 0) {
            throw new Error(`Duplicate detected: A team member named "${name}" already exists.`);
          }
        }
        const result = await Pic_teammembersService.create(payload as never);
        if (!result.success) throw new Error(result.error?.message ?? "Failed to create");
        return result.data;
      }
      const result = await Pic_teammembersService.update(id!, payload as never);
      if (result.error) throw new Error(result.error.message ?? "Failed to save");
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teammembers"] });
      resetDirty();
      setLastSavedAt(new Date());
      if (isNew) {
        addNotification("Team member created", "success");
        const newId = (data as unknown as Record<string, unknown>)?.pic_teammemberid;
        if (newId) navigate(`/teammembers/${newId}`, { replace: true });
        else navigate("/teammembers");
      } else {
        addNotification("Team member saved", "success");
      }
    },
    onError: (err) => { console.error("Save failed:", err); addNotification(`Save failed: ${err.message}`, "error"); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => Pic_teammembersService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teammembers"] });
      addNotification("Team member deleted", "success");
      navigate("/teammembers");
    },
    onError: (err) => { console.error("Delete failed:", err); addNotification(`Delete failed: ${err.message}`, "error"); },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const active = record?.statecode === 0;
      const result = await Pic_teammembersService.update(id!, {
        statecode: (active ? 1 : 0) as never,
        statuscode: (active ? 2 : 1) as never,
      });
      if (result.error) throw new Error(result.error.message ?? "Failed to update status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teammembers"] });
      const wasActive = record?.statecode === 0;
      addNotification(wasActive ? "Team member deactivated" : "Team member activated", "success");
    },
    onError: (err) => { console.error("Deactivate failed:", err); addNotification(`Failed: ${err.message}`, "error"); },
  });

  useKeyboardShortcuts({
    onSave: useCallback(() => saveMutation.mutate(), [saveMutation]),
    onSaveAndClose: useCallback(() => {
      saveMutation.mutate(undefined, { onSuccess: () => navigate("/teammembers") });
    }, [saveMutation, navigate]),
    disabled: saveMutation.isPending,
  });

  const isActive = isNew || record?.statecode === 0;
  const formDisabled = !isNew && !isActive;

  useAutoSave({
    isDirty,
    isNew,
    isSaving: saveMutation.isPending,
    isDeactivated: !isActive,
    onSave: () => saveMutation.mutate(),
  });

  const roleOptions = STATUS_OPTIONS.role;

  const deptOptions = [
    { value: "10000", label: "Engineering" },
    { value: "10001", label: "Design" },
    { value: "10002", label: "QA" },
    { value: "10003", label: "Product" },
    { value: "10004", label: "Marketing" },
    { value: "10005", label: "Sales" },
    { value: "10006", label: "Operations" },
  ];

  const skillsOptions = [
    { value: "10000", label: "JavaScript" },
    { value: "10001", label: "TypeScript" },
    { value: "10002", label: "React" },
    { value: "10003", label: "C#" },
    { value: "10004", label: "SQL" },
    { value: "10005", label: "Power Platform" },
    { value: "10006", label: "Azure" },
    { value: "10007", label: "UI/UX Design" },
    { value: "10008", label: "DevOps" },
  ];

  const r = record as unknown as Record<string, unknown> | undefined;

  const [recordSetOpen, setRecordSetOpen] = useState(false);

  const recordNavItems = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("recordNav_/teammembers");
      const names = sessionStorage.getItem("recordNavNames_/teammembers");
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
          <FormSection title="Personal Information">
            {/* Row 1: Full Name | Email */}
            <FormField label="Full Name" value={formData.pic_fullname} onChange={(v) => updateField("pic_fullname", v)} required disabled={formDisabled} isDirty={df("pic_fullname")} validationMessage={validationErrors.has("Full Name") ? "Required" : undefined} />
            <FormField label="Email" value={formData.pic_email} onChange={(v) => updateField("pic_email", v)} required disabled={formDisabled} isDirty={df("pic_email")} validationMessage={validationErrors.has("Email") ? "Required" : undefined} />
            {/* Row 2: Phone | Role */}
            <FormField label="Phone" value={formData.pic_phone} onChange={(v) => updateField("pic_phone", v)} disabled={formDisabled} isDirty={df("pic_phone")} />
            <FormField label="Role" value={formData.pic_role} onChange={(v) => updateField("pic_role", v)} type="select" options={roleOptions} required disabled={formDisabled} isDirty={df("pic_role")} validationMessage={validationErrors.has("Role") ? "Required" : undefined} />
            {/* Row 3: Department | Location */}
            <FormField label="Department" value={formData.pic_department} onChange={(v) => updateField("pic_department", v)} type="select" options={deptOptions} disabled={formDisabled} isDirty={df("pic_department")} />
            <FormField label="Location" value={formData.pic_location} onChange={(v) => updateField("pic_location", v)} disabled={formDisabled} isDirty={df("pic_location")} />
            {/* Row 4: Join Date | Hourly Rate */}
            <FormField label="Join Date" value={formData.pic_joindate} onChange={(v) => updateField("pic_joindate", v)} type="date" disabled={formDisabled} isDirty={df("pic_joindate")} />
            <FormField label="Hourly Rate" value={formData.pic_hourlyrate} onChange={(v) => updateField("pic_hourlyrate", v)} type="money" disabled={formDisabled} isDirty={df("pic_hourlyrate")} />
            {/* Row 5: Is Available */}
            <FormField label="Is Available" value={formData.pic_isavailable} onChange={(v) => updateField("pic_isavailable", v)} type="boolean" disabled={formDisabled} isDirty={df("pic_isavailable")} />
          </FormSection>
          <FormSection title="Skills">
            <FormField label="Skills" value={formData.pic_skills} onChange={(v) => updateField("pic_skills", v)} type="select" options={skillsOptions} disabled={formDisabled} isDirty={df("pic_skills")} />
          </FormSection>
        </>
      ),
    },
    {
      key: "assignments",
      label: `Project Assignments${relatedAssignments?.length ? ` (${relatedAssignments.length})` : ""}`,
      isRelated: true,
      icon: <ClipboardTaskRegular />,
      content: (
        <FormSection title="Project Assignments" columns={1}>
          {isNew ? (
            <div style={{ padding: "24px 0", color: "#605e5c", fontSize: "14px" }}>
              Save the record first to see assignments.
            </div>
          ) : (
            <SubGrid
              title="Project Assignments"
              idField="pic_projectassignmentid"
              columns={[
                { key: "_pic_projectid_value", header: "Project", render: (row) => String(row["_pic_projectid_value@OData.Community.Display.V1.FormattedValue"] ?? row.pic_projectidname ?? "") },
                { key: "pic_role", header: "Role", render: (row) => String(row["pic_role@OData.Community.Display.V1.FormattedValue"] ?? row.pic_role ?? "") },
                { key: "pic_allocationpercent", header: "Allocation %", align: "right", render: (row) => row.pic_allocationpercent != null ? `${row.pic_allocationpercent}%` : "" },
              ]}
              data={(relatedAssignments ?? []) as unknown as Record<string, unknown>[]}
              onRowClick={(aid) => navigate(`/assignments/${aid}`)}
              onAdd={() => navigate(`/assignments?addFor=teammember&id=${id}`)}
              onDelete={(ids) => {
                Promise.all(ids.map((aid) => Pic_projectassignmentsService.delete(aid)))
                  .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["assignments", "byTeamMember", id] });
                    addNotification(`${ids.length} assignment(s) deleted`, "success");
                  })
                  .catch((err) => { console.error("Delete assignments failed:", err); addNotification(`Delete failed: ${err.message}`, "error"); });
              }}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["assignments", "byTeamMember", id] })}
              onViewAll={() => navigate("/assignments")}
              addLabel="New Assignment"
              emptyMessage="No project assignments for this team member."
            />
          )}
        </FormSection>
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
          <FormField label="Record Status" value={r?.statecode === 0 ? "Active" : "Inactive"} onChange={() => {}} type="readonly" />
        </FormSection>
      ),
    },
  ];

  if (!isNew && isError) {
    return (
      <>
        <EntityCommandBar showMDAActions={false} onBack={() => navigate("/teammembers")} actions={[]} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 48px", gap: "16px", backgroundColor: "#fff", margin: "8px 0 16px", borderRadius: "4px", boxShadow: "rgba(0,0,0,0.12) 0 0 2px 0, rgba(0,0,0,0.14) 0 2px 4px 0" }}>
          <div style={{ fontSize: "48px", color: "#d13438" }}>!</div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#323130" }}>Record Not Found</div>
          <div style={{ fontSize: "14px", color: "#605e5c", textAlign: "center" }}>{error?.message || "The requested team member could not be found or you don't have permission to view it."}</div>
          <button onClick={() => navigate("/teammembers")} style={{ marginTop: "8px", padding: "8px 24px", backgroundColor: "#0078d4", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>Back to Team Members</button>
        </div>
      </>
    );
  }

  return (
    <>
      <EntityCommandBar
        showMDAActions={false}
        onBack={() => window.history.length > 2 ? navigate(-1) : navigate("/teammembers")}
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ["teammembers", "record", id] });
          queryClient.invalidateQueries({ queryKey: ["assignments", "byTeamMember", id] });
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
                onSuccess: () => navigate("/teammembers"),
              });
            },
            disabled: saveMutation.isPending || (!isDirty && !isNew),
            tooltip: "Ctrl+Shift+S",
          },
          {
            key: "new",
            label: "New",
            icon: AddRegular,
            onClick: () => navigate("/teammembers/new"),
          },
          ...(!isNew
            ? [
                {
                  key: "deactivate",
                  label: isActive ? "Deactivate" : "Activate",
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
        title={isNew ? "New Team Member" : (record?.pic_fullname ?? "Loading...")}
        subtitle="Team Member"
        formOptions={["Team Member Main Form"]}
        activeForm="Team Member Main Form"
        entityColor="#0078d4"
        tabs={tabs}
        isLoading={!isNew && isLoading}
        isSaving={saveMutation.isPending}
        isDirty={isDirty}
        statusBadge={!isNew ? (formData.statecode === 0
          ? { bg: "#dff6dd", fg: "#107c10", label: "Active" }
          : { bg: "#edebe9", fg: "#797775", label: "Inactive" }) : undefined}
        isDeactivated={!isNew && !isActive}
        currentRecordId={id}
        entityPath="/teammembers"
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
        title="Delete Team Member"
        message="Delete this team member? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { deleteMutation.mutate(); setDeleteDialogOpen(false); }}
        onCancel={() => setDeleteDialogOpen(false)}
        danger
      />
      <ConfirmDialog
        open={deactivateDialogOpen}
        title={isActive ? "Deactivate Team Member" : "Activate Team Member"}
        message={isActive ? "Are you sure you want to deactivate this team member?" : "Are you sure you want to activate this team member?"}
        confirmLabel={isActive ? "Deactivate" : "Activate"}
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
