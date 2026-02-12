import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { SaveRegular, DeleteRegular, AddRegular, DismissCircleRegular, PlayRegular, PeopleRegular, HistoryRegular, ClockRegular } from "@fluentui/react-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pic_tasksService } from "@generated/services/Pic_tasksService";
import { Pic_projectsService } from "@generated/services/Pic_projectsService";
import { Pic_teammembersService } from "@generated/services/Pic_teammembersService";
import { Pic_timeentriesService } from "@generated/services/Pic_timeentriesService";
import type { Pic_tasksBase } from "@generated/models/Pic_tasksModel";
import { RecordForm } from "@/components/forms/RecordForm";
import { FormSection } from "@/components/forms/FormSection";
import { FormField } from "@/components/forms/FormField";
import type { LookupSearchResult } from "@/components/forms/FormField";
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
import { STATUS_COLORS, STATUS_OPTIONS, GUID_RE } from "@/config/constants";

export function TaskForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !id;
  const isValidId = !!id && GUID_RE.test(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const addRecentItem = useAppStore((s) => s.addRecentItem);

  // Pre-populate project from SubGrid "New Task" link
  const presetProjectId = isNew ? searchParams.get("projectId") : null;
  const [projectDisplayName, setProjectDisplayName] = useState<string | null>(null);
  const [assignedToDisplayName, setAssignedToDisplayName] = useState<string | null>(null);
  const [parentTaskDisplayName, setParentTaskDisplayName] = useState<string | null>(null);

  const { data: record, isLoading, isError, error } = useQuery({
    queryKey: ["tasks", "record", id],
    queryFn: async () => {
      const result = await Pic_tasksService.get(id!);
      if (!result.success) throw new Error("Failed to load task");
      return result.data;
    },
    enabled: isValidId,
  });

  // Fetch related time entries for this task
  const { data: relatedTimeEntries } = useQuery({
    queryKey: ["timeentries", "byTask", id],
    queryFn: async () => {
      const result = await Pic_timeentriesService.getAll({
        filter: `_pic_taskid_value eq ${id}`,
      });
      return result.data ?? [];
    },
    enabled: isValidId,
  });

  useDocumentTitle(isNew ? "New Task" : record?.pic_taskname ? `Task: ${record.pic_taskname}` : "Task");

  const [formData, setFormData] = useState<Partial<Pic_tasksBase>>(() => {
    if (isNew && searchParams.get("clone") === "1") {
      try {
        const raw = sessionStorage.getItem("cloneData_tasks");
        if (raw) {
          sessionStorage.removeItem("cloneData_tasks");
          const clone = JSON.parse(raw);
          return { ...clone, pic_completionpercent: "0" } as Partial<Pic_tasksBase>;
        }
      } catch (err) { console.warn("Clone parse failed:", err); }
    }
    const initial: Partial<Pic_tasksBase> = isNew
      ? { pic_status: 10000 as never, pic_priority: 10001 as never, pic_completionpercent: "0" }
      : {};
    if (presetProjectId && GUID_RE.test(presetProjectId)) {
      (initial as Record<string, unknown>)["pic_ProjectId@odata.bind"] = `/pic_projects(${presetProjectId})`;
    }
    return initial;
  });

  // Fetch project name for pre-populated lookup display
  useEffect(() => {
    if (presetProjectId && GUID_RE.test(presetProjectId)) {
      Pic_projectsService.get(presetProjectId).then((result) => {
        if (result.success && result.data) {
          setProjectDisplayName((result.data as unknown as Record<string, unknown>).pic_projectname as string);
        }
      }).catch((err) => console.error("Failed to load preset project:", err));
    }
  }, [presetProjectId]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [formNotifications, setFormNotifications] = useState<Array<{ id: string; message: string; type: "error" | "warning" | "info" }>>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

  useEffect(() => {
    if (record && id) {
      addRecentItem({
        id,
        title: record.pic_taskname ?? "Untitled Task",
        entityPath: "/tasks",
        entityType: "Task",
      });
    }
  }, [record, id, addRecentItem]);

  useEffect(() => {
    if (record) {
      setFormData({
        pic_taskname: record.pic_taskname,
        pic_status: record.pic_status,
        pic_priority: record.pic_priority,
        pic_description: record.pic_description,
        pic_duedate: record.pic_duedate,
        pic_startdate: record.pic_startdate,
        pic_estimatedhours: record.pic_estimatedhours,
        pic_actualhours: record.pic_actualhours,
        pic_completionpercent: record.pic_completionpercent,
        pic_ismilestone: record.pic_ismilestone,
        pic_completiondate: record.pic_completiondate,
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
        const labelMap: Record<string, string> = { pic_taskname: "Task Name", pic_status: "Status" };
        const label = labelMap[field];
        if (label) next.delete(label);
        return next;
      });
    }
  };

  // Business rules
  const isCancelled = Number(formData.pic_status) === 10004;
  const isCompleted = Number(formData.pic_status) === 10003;
  const isDeactivated = !isNew && record?.statecode === 1;
  const isReadOnlyStatus = isCancelled || isCompleted || isDeactivated;

  const validateRequired = (): boolean => {
    const missing: string[] = [];
    if (!formData.pic_taskname?.toString().trim()) missing.push("Task Name");
    if (!formData.pic_status) missing.push("Status");
    setValidationErrors(new Set(missing));

    const warnings: string[] = [];
    if (formData.pic_startdate && formData.pic_duedate && formData.pic_duedate < formData.pic_startdate) {
      warnings.push("Due Date must be on or after Start Date");
    }
    if (formData.pic_estimatedhours != null && Number(formData.pic_estimatedhours) < 0) {
      warnings.push("Estimated Hours cannot be negative");
    }
    if (formData.pic_actualhours != null && Number(formData.pic_actualhours) < 0) {
      warnings.push("Actual Hours cannot be negative");
    }
    if (formData.pic_completionpercent != null) {
      const pct = Number(formData.pic_completionpercent);
      if (pct < 0 || pct > 100) warnings.push("Completion % must be between 0 and 100");
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
      "pic_taskname", "pic_status", "pic_priority", "pic_description",
      "pic_duedate", "pic_startdate", "pic_estimatedhours", "pic_actualhours",
      "pic_completionpercent", "pic_ismilestone", "pic_completiondate",
    ];
    const numericFields = new Set([
      "pic_status", "pic_priority", "pic_estimatedhours", "pic_actualhours",
      "pic_completionpercent",
    ]);
    const booleanFields = new Set(["pic_ismilestone"]);
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
    if ((formData as Record<string, unknown>)["pic_ProjectId@odata.bind"]) {
      payload["pic_ProjectId@odata.bind"] = (formData as Record<string, unknown>)["pic_ProjectId@odata.bind"];
    }
    if ((formData as Record<string, unknown>)["pic_AssignedToId@odata.bind"]) {
      payload["pic_AssignedToId@odata.bind"] = (formData as Record<string, unknown>)["pic_AssignedToId@odata.bind"];
    }
    if ((formData as Record<string, unknown>)["pic_ParentTaskId@odata.bind"]) {
      payload["pic_ParentTaskId@odata.bind"] = (formData as Record<string, unknown>)["pic_ParentTaskId@odata.bind"];
    }
    return payload;
  }, [formData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validateRequired()) throw new Error("Validation failed");
      const payload = buildPayload();
      if (isNew) {
        const name = String(formData.pic_taskname ?? "").trim();
        if (name) {
          const dupCheck = await Pic_tasksService.getAll({
            filter: `pic_taskname eq '${name.replace(/'/g, "''")}'`,
            select: ["pic_taskid", "pic_taskname"],
          });
          if (dupCheck.data && dupCheck.data.length > 0) {
            throw new Error(`Duplicate detected: A task named "${name}" already exists.`);
          }
        }
        const result = await Pic_tasksService.create(payload as never);
        if (!result.success) throw new Error(result.error?.message ?? "Failed to create");
        return result.data;
      }
      const result = await Pic_tasksService.update(id!, payload as never);
      if (result.error) throw new Error(result.error.message ?? "Failed to save");
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      resetDirty();
      setLastSavedAt(new Date());
      if (isNew) {
        addNotification("Task created", "success");
        const newId = (data as unknown as Record<string, unknown>)?.pic_taskid;
        if (newId) navigate(`/tasks/${newId}`, { replace: true });
        else navigate("/tasks");
      } else {
        addNotification("Task saved", "success");
      }
    },
    onError: (err) => { console.error("Save failed:", err); addNotification(`Save failed: ${err.message}`, "error"); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => Pic_tasksService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addNotification("Task deleted", "success");
      navigate("/tasks");
    },
    onError: (err) => { console.error("Delete failed:", err); addNotification(`Delete failed: ${err.message}`, "error"); },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const active = record?.statecode === 0;
      const result = await Pic_tasksService.update(id!, {
        statecode: (active ? 1 : 0) as never,
        statuscode: (active ? 2 : 1) as never,
      });
      if (result.error) throw new Error(result.error.message ?? "Failed to update status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      const wasActive = record?.statecode === 0;
      addNotification(wasActive ? "Task deactivated" : "Task activated", "success");
    },
    onError: (err) => { console.error("Deactivate failed:", err); addNotification(`Failed: ${err.message}`, "error"); },
  });

  useKeyboardShortcuts({
    onSave: useCallback(() => saveMutation.mutate(), [saveMutation]),
    onSaveAndClose: useCallback(() => {
      saveMutation.mutate(undefined, { onSuccess: () => navigate("/tasks") });
    }, [saveMutation, navigate]),
    disabled: saveMutation.isPending,
  });

  useAutoSave({
    isDirty,
    isNew,
    isSaving: saveMutation.isPending,
    isDeactivated: isReadOnlyStatus,
    onSave: () => saveMutation.mutate(),
  });

  const taskStatusOptions = STATUS_OPTIONS.task;
  const priorityOptions = STATUS_OPTIONS.priority;

  const r = record as unknown as Record<string, unknown> | undefined;

  // Project lookup
  const projectName = projectDisplayName
    ?? r?.["_pic_projectid_value@OData.Community.Display.V1.FormattedValue"]
    ?? "";

  const searchProjects = useCallback(async (query: string): Promise<LookupSearchResult[]> => {
    try {
      const filter = query ? `contains(pic_projectname, '${query.replace(/'/g, "''")}')` : undefined;
      const result = await Pic_projectsService.getAll({ filter, orderBy: ["pic_projectname asc"] });
      return (result.data ?? []).map((p) => ({
        id: String((p as unknown as Record<string, unknown>).pic_projectid ?? ""),
        name: String((p as unknown as Record<string, unknown>).pic_projectname ?? ""),
      }));
    } catch {
      return [];
    }
  }, []);

  // Assigned To lookup (team members)
  const assignedToName = assignedToDisplayName
    ?? r?.["_pic_assignedtoid_value@OData.Community.Display.V1.FormattedValue"]
    ?? "";

  const searchTeamMembers = useCallback(async (query: string): Promise<LookupSearchResult[]> => {
    try {
      const filter = query ? `contains(pic_fullname, '${query.replace(/'/g, "''")}')` : undefined;
      const result = await Pic_teammembersService.getAll({ filter, orderBy: ["pic_fullname asc"] });
      return (result.data ?? []).map((tm) => ({
        id: String((tm as unknown as Record<string, unknown>).pic_teammemberid ?? ""),
        name: String((tm as unknown as Record<string, unknown>).pic_fullname ?? ""),
      }));
    } catch {
      return [];
    }
  }, []);

  // Parent Task lookup (self-referential)
  const parentTaskName = parentTaskDisplayName
    ?? r?.["_pic_parenttaskid_value@OData.Community.Display.V1.FormattedValue"]
    ?? "";

  const searchTasks = useCallback(async (query: string): Promise<LookupSearchResult[]> => {
    try {
      let filter = query ? `contains(pic_taskname, '${query.replace(/'/g, "''")}')` : undefined;
      // Exclude current record from self-referential lookup
      if (id && filter) filter += ` and pic_taskid ne ${id}`;
      else if (id) filter = `pic_taskid ne ${id}`;
      const result = await Pic_tasksService.getAll({ filter, orderBy: ["pic_taskname asc"] });
      return (result.data ?? []).map((t) => ({
        id: String((t as unknown as Record<string, unknown>).pic_taskid ?? ""),
        name: String((t as unknown as Record<string, unknown>).pic_taskname ?? ""),
      }));
    } catch {
      return [];
    }
  }, [id]);

  const [recordSetOpen, setRecordSetOpen] = useState(false);

  const recordNavItems = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("recordNav_/tasks");
      const names = sessionStorage.getItem("recordNavNames_/tasks");
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
          <FormSection title="Task Details">
            {/* Row 1: Task Name | Task Number */}
            <FormField label="Task Name" value={formData.pic_taskname} onChange={(v) => updateField("pic_taskname", v)} required disabled={isReadOnlyStatus} isDirty={df("pic_taskname")} validationMessage={validationErrors.has("Task Name") ? "Required" : undefined} />
            <FormField label="Task Number" value={record?.pic_tasknumber} onChange={() => {}} type="readonly" />
            {/* Row 2: Status | Priority */}
            <FormField label="Status" value={formData.pic_status} onChange={(v) => updateField("pic_status", v)} type="select" options={taskStatusOptions} required disabled={isReadOnlyStatus} isDirty={df("pic_status")} validationMessage={validationErrors.has("Status") ? "Required" : undefined} />
            <FormField label="Priority" value={formData.pic_priority} onChange={(v) => updateField("pic_priority", v)} type="select" options={priorityOptions} disabled={isReadOnlyStatus} isDirty={df("pic_priority")} />
            {/* Row 3: Start Date | Due Date */}
            <FormField label="Start Date" value={formData.pic_startdate} onChange={(v) => updateField("pic_startdate", v)} type="date" disabled={isReadOnlyStatus} isDirty={df("pic_startdate")} />
            <FormField label="Due Date" value={formData.pic_duedate} onChange={(v) => updateField("pic_duedate", v)} type="date" disabled={isReadOnlyStatus} isDirty={df("pic_duedate")} />
            {/* Row 4: Project | Assigned To */}
            <FormField
              label="Project"
              value={String(projectName)}
              onChange={() => {}}
              type="lookup"
              onLookupSearch={searchProjects}
              onLookupSelect={(result) => { updateField("pic_ProjectId@odata.bind", `/pic_projects(${result.id})`); setProjectDisplayName(result.name); }}
              onLookupClear={() => { updateField("pic_ProjectId@odata.bind", null); setProjectDisplayName(null); }}
              onLookupNewRecord={() => navigate("/projects/new")}
              onLookupNavigate={r?._pic_projectid_value ? () => navigate(`/projects/${r._pic_projectid_value}`) : undefined}
              lookupTables={[
                { key: "projects", label: "Projects", onSearch: searchProjects },
              ]}
            />
            <FormField
              label="Assigned To"
              value={String(assignedToName)}
              onChange={() => {}}
              type="lookup"
              onLookupSearch={searchTeamMembers}
              onLookupSelect={(result) => { updateField("pic_AssignedToId@odata.bind", `/pic_teammembers(${result.id})`); setAssignedToDisplayName(result.name); }}
              onLookupClear={() => { updateField("pic_AssignedToId@odata.bind", null); setAssignedToDisplayName(null); }}
              onLookupNewRecord={() => navigate("/teammembers/new")}
              onLookupNavigate={r?._pic_assignedtoid_value ? () => navigate(`/teammembers/${r._pic_assignedtoid_value}`) : undefined}
              lookupTables={[
                { key: "teammembers", label: "Team Members", onSearch: searchTeamMembers },
              ]}
            />
            {/* Row 5: Estimated Hours | Actual Hours */}
            <FormField label="Estimated Hours" value={formData.pic_estimatedhours} onChange={(v) => updateField("pic_estimatedhours", v)} type="decimal" step={0.5} disabled={isReadOnlyStatus} isDirty={df("pic_estimatedhours")} />
            <FormField label="Actual Hours" value={formData.pic_actualhours} onChange={(v) => updateField("pic_actualhours", v)} type="decimal" step={0.5} disabled={isReadOnlyStatus} isDirty={df("pic_actualhours")} />
            {/* Row 6: Completion % | Is Milestone */}
            <FormField label="Completion %" value={isCompleted ? 100 : formData.pic_completionpercent} onChange={(v) => updateField("pic_completionpercent", v)} type={isReadOnlyStatus ? "readonly" : "number"} step={5} disabled={isReadOnlyStatus} isDirty={df("pic_completionpercent")} />
            <FormField label="Is Milestone" value={formData.pic_ismilestone} onChange={(v) => updateField("pic_ismilestone", v)} type="boolean" disabled={isReadOnlyStatus} isDirty={df("pic_ismilestone")} />
            {/* Row 7: Parent Task | Completion Date */}
            <FormField
              label="Parent Task"
              value={String(parentTaskName)}
              onChange={() => {}}
              type="lookup"
              onLookupSearch={searchTasks}
              onLookupSelect={(result) => { updateField("pic_ParentTaskId@odata.bind", `/pic_tasks(${result.id})`); setParentTaskDisplayName(result.name); }}
              onLookupClear={() => { updateField("pic_ParentTaskId@odata.bind", null); setParentTaskDisplayName(null); }}
              onLookupNewRecord={() => navigate("/tasks/new")}
              onLookupNavigate={r?._pic_parenttaskid_value ? () => navigate(`/tasks/${r._pic_parenttaskid_value}`) : undefined}
              lookupTables={[
                { key: "tasks", label: "Tasks", onSearch: searchTasks },
              ]}
            />
            <FormField label="Completion Date" value={formData.pic_completiondate} onChange={(v) => updateField("pic_completiondate", v)} type="date" disabled={isReadOnlyStatus} isDirty={df("pic_completiondate")} />
          </FormSection>
          <FormSection title="Description" columns={1}>
            <FormField label="Description" value={formData.pic_description} onChange={(v) => updateField("pic_description", v)} type="textarea" disabled={isReadOnlyStatus} isDirty={df("pic_description")} />
          </FormSection>
        </>
      ),
    },
    {
      key: "timeentries",
      label: `Time Entries${relatedTimeEntries?.length ? ` (${relatedTimeEntries.length})` : ""}`,
      isRelated: true,
      icon: <ClockRegular />,
      content: (
        <FormSection title="Related Time Entries" columns={1}>
          {isNew ? (
            <div style={{ padding: "24px 0", color: "#605e5c", fontSize: "14px" }}>
              Save the record first to see time entries.
            </div>
          ) : (
            <SubGrid
              title="Time Entries"
              idField="pic_timeentryid"
              columns={[
                { key: "pic_description", header: "Description" },
                { key: "pic_entrydate", header: "Entry Date", render: (row) => row.pic_entrydate ? new Date(String(row.pic_entrydate)).toLocaleDateString() : "" },
                { key: "pic_duration", header: "Duration (hrs)", align: "right" },
                { key: "_pic_teammemberid_value", header: "Team Member", render: (row) => String(row["_pic_teammemberid_value@OData.Community.Display.V1.FormattedValue"] ?? "") },
              ]}
              data={(relatedTimeEntries ?? []) as unknown as Record<string, unknown>[]}
              onRowClick={(teId) => navigate(`/timeentries/${teId}`)}
              onAdd={() => navigate(`/timeentries/new?taskId=${id}`)}
              onDelete={(ids) => {
                Promise.all(ids.map((teId) => Pic_timeentriesService.delete(teId)))
                  .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["timeentries", "byTask", id] });
                    addNotification(`${ids.length} time entry(ies) deleted`, "success");
                  })
                  .catch((err) => { console.error("Delete time entries failed:", err); addNotification(`Delete failed: ${err.message}`, "error"); });
              }}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["timeentries", "byTask", id] })}
              onViewAll={() => navigate("/timeentries")}
              addLabel="New Time Entry"
              emptyMessage="No time entries found for this task."
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
        <EntityCommandBar showMDAActions={false} onBack={() => navigate("/tasks")} actions={[]} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 48px", gap: "16px", backgroundColor: "#fff", margin: "8px 0 16px", borderRadius: "4px", boxShadow: "rgba(0,0,0,0.12) 0 0 2px 0, rgba(0,0,0,0.14) 0 2px 4px 0" }}>
          <div style={{ fontSize: "48px", color: "#d13438" }}>!</div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#323130" }}>Record Not Found</div>
          <div style={{ fontSize: "14px", color: "#605e5c", textAlign: "center" }}>{error?.message || "The requested task could not be found or you don't have permission to view it."}</div>
          <button onClick={() => navigate("/tasks")} style={{ marginTop: "8px", padding: "8px 24px", backgroundColor: "#0078d4", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>Back to Tasks</button>
        </div>
      </>
    );
  }

  return (
    <>
      <EntityCommandBar
        showMDAActions={false}
        onBack={() => window.history.length > 2 ? navigate(-1) : navigate("/tasks")}
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ["tasks", "record", id] });
          queryClient.invalidateQueries({ queryKey: ["timeentries", "byTask", id] });
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
                onSuccess: () => navigate("/tasks"),
              });
            },
            disabled: saveMutation.isPending || (!isDirty && !isNew),
            tooltip: "Ctrl+Shift+S",
          },
          {
            key: "new",
            label: "New",
            icon: AddRegular,
            onClick: () => navigate("/tasks/new"),
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
        title={isNew ? "New Task" : (record?.pic_taskname ?? "Loading...")}
        subtitle="Task"
        formOptions={["Task Main Form"]}
        activeForm="Task Main Form"
        entityColor="#498205"
        tabs={tabs}
        isLoading={!isNew && isLoading}
        isSaving={saveMutation.isPending}
        isDirty={isDirty}
        statusBadge={formData.pic_status ? (STATUS_COLORS.task as Record<number, { bg: string; fg: string; label: string }>)[Number(formData.pic_status)] : undefined}
        isDeactivated={isDeactivated}
        currentRecordId={id}
        entityPath="/tasks"
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
        title="Delete Task"
        message="Delete this task? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { deleteMutation.mutate(); setDeleteDialogOpen(false); }}
        onCancel={() => setDeleteDialogOpen(false)}
        danger
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
        currentOwner={record?.pic_assignedtoidname}
        onAssign={(owner) => {
          addNotification(`Task assigned to ${owner}`, "success");
          setAssignDialogOpen(false);
        }}
        onCancel={() => setAssignDialogOpen(false)}
      />
      <ConfirmDialog
        open={deactivateDialogOpen}
        title={isDeactivated ? "Activate Task" : "Deactivate Task"}
        message={isDeactivated ? "Are you sure you want to activate this task?" : "Are you sure you want to deactivate this task?"}
        confirmLabel={isDeactivated ? "Activate" : "Deactivate"}
        onConfirm={() => { deactivateMutation.mutate(); setDeactivateDialogOpen(false); }}
        onCancel={() => setDeactivateDialogOpen(false)}
      />
    </>
  );
}
