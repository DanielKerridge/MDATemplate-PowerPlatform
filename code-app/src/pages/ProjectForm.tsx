import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { SaveRegular, DeleteRegular, AddRegular, DismissCircleRegular, PlayRegular, PeopleRegular, HistoryRegular, LinkRegular } from "@fluentui/react-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pic_projectsService } from "@generated/services/Pic_projectsService";
import { Pic_tasksService } from "@generated/services/Pic_tasksService";
import { Pic_projectassignmentsService } from "@generated/services/Pic_projectassignmentsService";
import { Pic_categoriesService } from "@generated/services/Pic_categoriesService";
import { Pic_teammembersService } from "@generated/services/Pic_teammembersService";
import type { Pic_projectsBase } from "@generated/models/Pic_projectsModel";
import { RecordForm } from "@/components/forms/RecordForm";
import { FormSection } from "@/components/forms/FormSection";
import { FormField } from "@/components/forms/FormField";
import type { LookupSearchResult } from "@/components/forms/FormField";
import { EntityCommandBar } from "@/components/common/EntityCommandBar";
import { SubGrid } from "@/components/forms/SubGrid";
import { BPFBar } from "@/components/common/BPFBar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AssignDialog } from "@/components/common/AssignDialog";
import { useFormDirtyTracking } from "@/hooks/useFormDirtyTracking";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { openFlowUrl } from "@/components/common/ExportUtils";
import { TimelineWall } from "@/components/common/TimelineWall";
import { useAppStore } from "@/store/useAppStore";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { STATUS_COLORS, STATUS_OPTIONS, GUID_RE } from "@/config/constants";

export function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !id;
  const isValidId = !!id && GUID_RE.test(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const addRecentItem = useAppStore((s) => s.addRecentItem);

  const { data: record, isLoading, isError, error } = useQuery({
    queryKey: ["projects", "record", id],
    queryFn: async () => {
      const result = await Pic_projectsService.get(id!);
      if (!result.success) throw new Error("Failed to load project");
      return result.data;
    },
    enabled: isValidId,
    retry: false,
  });

  // Fetch related tasks
  const { data: relatedTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", "byProject", id],
    queryFn: async () => {
      const result = await Pic_tasksService.getAll({
        filter: `_pic_projectid_value eq ${id}`,
      });
      return result.data ?? [];
    },
    enabled: isValidId,
  });

  // Fetch related project assignments
  const { data: relatedAssignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["assignments", "byProject", id],
    queryFn: async () => {
      const result = await Pic_projectassignmentsService.getAll({
        filter: `_pic_projectid_value eq ${id}`,
      });
      return result.data ?? [];
    },
    enabled: isValidId,
  });

  useDocumentTitle(isNew ? "New Project" : record?.pic_projectname ? `Project: ${record.pic_projectname}` : "Project");

  const [formData, setFormData] = useState<Partial<Pic_projectsBase>>(() => {
    if (isNew && searchParams.get("clone") === "1") {
      try {
        const raw = sessionStorage.getItem("cloneData_projects");
        if (raw) {
          sessionStorage.removeItem("cloneData_projects");
          const clone = JSON.parse(raw);
          // Clear read-only / identity fields
          delete clone.pic_projectcode;
          return { ...clone, pic_isactive: 1 } as Partial<Pic_projectsBase>;
        }
      } catch (err) { console.warn("Clone parse failed:", err); }
    }
    return { pic_isactive: isNew ? 1 : undefined } as Partial<Pic_projectsBase>;
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [categoryDisplayName, setCategoryDisplayName] = useState<string | null>(null);
  const [pmDisplayName, setPmDisplayName] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [formNotifications, setFormNotifications] = useState<Array<{ id: string; message: string; type: "error" | "warning" | "info" }>>([]);

  useEffect(() => {
    if (record && id) {
      addRecentItem({
        id,
        title: record.pic_projectname ?? "Untitled Project",
        entityPath: "/projects",
        entityType: "Project",
      });
    }
  }, [record, id, addRecentItem]);

  useEffect(() => {
    if (record) {
      setFormData({
        pic_projectname: record.pic_projectname,
        pic_status: record.pic_status,
        pic_priority: record.pic_priority,
        pic_description: record.pic_description,
        pic_startdate: record.pic_startdate,
        pic_enddate: record.pic_enddate,
        pic_budget: record.pic_budget,
        pic_actualcost: record.pic_actualcost,
        pic_completionpercent: record.pic_completionpercent,
        pic_isactive: record.pic_isactive,
        pic_bpfstage: record.pic_bpfstage,
        pic_risklevel: record.pic_risklevel,
        pic_department: record.pic_department,
      });
    }
  }, [record]);

  const { isDirty, isDirtyRef, dirtyFields, resetDirty } = useFormDirtyTracking(formData, id);
  const df = (field: string) => dirtyFields.includes(field);
  const { showDialog: showLeaveDialog, confirmLeave, cancelLeave } = useUnsavedChangesWarning(isDirtyRef);

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field when user edits it
    if (validationErrors.size > 0) {
      setValidationErrors((prev) => {
        const next = new Set(prev);
        // Map field names to validation labels
        const labelMap: Record<string, string> = {
          pic_projectname: "Project Name",
          pic_status: "Status",
          pic_priority: "Priority",
          pic_startdate: "Start Date",
        };
        const label = labelMap[field];
        if (label) next.delete(label);
        return next;
      });
    }
  };

  const validateRequired = (): string[] => {
    const errors: string[] = [];
    if (!formData.pic_projectname?.toString().trim()) errors.push("Project Name");
    if (!formData.pic_status) errors.push("Status");
    if (!formData.pic_priority) errors.push("Priority");
    if (!formData.pic_startdate) errors.push("Start Date");
    setValidationErrors(new Set(errors));

    // Cross-field business rules
    const warnings: string[] = [];
    if (formData.pic_startdate && formData.pic_enddate && formData.pic_enddate < formData.pic_startdate) {
      warnings.push("End Date must be on or after Start Date");
    }
    if (formData.pic_budget != null && Number(formData.pic_budget) < 0) {
      warnings.push("Budget cannot be negative");
    }
    if (formData.pic_actualcost != null && Number(formData.pic_actualcost) < 0) {
      warnings.push("Actual Cost cannot be negative");
    }
    if (formData.pic_completionpercent != null) {
      const pct = Number(formData.pic_completionpercent);
      if (pct < 0 || pct > 100) warnings.push("Completion % must be between 0 and 100");
    }

    const notifications: typeof formNotifications = [];
    if (errors.length > 0) {
      notifications.push({ id: "validation", message: `Required fields missing: ${errors.join(", ")}`, type: "error" });
    }
    if (warnings.length > 0) {
      notifications.push({ id: "business-rules", message: warnings.join("; "), type: "warning" });
    }
    setFormNotifications(notifications.length > 0 ? notifications : []);
    return errors;
  };

  // Build a clean payload that excludes read-only and computed fields
  const buildPayload = useCallback(() => {
    const payload: Record<string, unknown> = {};
    // Only include writable fields
    const writableFields = [
      "pic_projectname", "pic_status", "pic_priority", "pic_description",
      "pic_startdate", "pic_enddate", "pic_budget", "pic_actualcost",
      "pic_completionpercent", "pic_bpfstage",
      "pic_risklevel", "pic_department",
    ];
    // Dataverse expects numbers for option sets, money, and integer fields
    const numericFields = new Set([
      "pic_status", "pic_priority", "pic_bpfstage", "pic_risklevel",
      "pic_budget", "pic_actualcost", "pic_completionpercent",
    ]);
    // Dataverse Boolean columns need true/false, not 0/1
    const booleanFields = new Set<string>();
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
    if ((formData as Record<string, unknown>)["pic_CategoryId@odata.bind"]) {
      payload["pic_CategoryId@odata.bind"] = (formData as Record<string, unknown>)["pic_CategoryId@odata.bind"];
    }
    if ((formData as Record<string, unknown>)["pic_ProjectManagerId@odata.bind"]) {
      payload["pic_ProjectManagerId@odata.bind"] = (formData as Record<string, unknown>)["pic_ProjectManagerId@odata.bind"];
    }
    return payload;
  }, [formData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const missing = validateRequired();
      if (missing.length > 0) {
        throw new Error(`Required fields missing: ${missing.join(", ")}`);
      }
      const payload = buildPayload();
      if (isNew) {
        // Duplicate detection: check if a project with the same name exists
        const name = String(formData.pic_projectname ?? "").trim();
        if (name) {
          const dupCheck = await Pic_projectsService.getAll({
            filter: `pic_projectname eq '${name.replace(/'/g, "''")}'`,
            select: ["pic_projectid", "pic_projectname"],
          });
          if (dupCheck.data && dupCheck.data.length > 0) {
            throw new Error(`Duplicate detected: A project named "${name}" already exists. Change the name or cancel.`);
          }
        }
        const result = await Pic_projectsService.create(payload as never);
        if (!result.success) throw new Error(result.error?.message ?? "Failed to create");
        return result.data;
      }
      // PATCH returns 204 No Content — SDK may return success: false with no error
      const result = await Pic_projectsService.update(id!, payload as never);
      if (result.error) throw new Error(result.error.message ?? "Failed to save");
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      resetDirty();
      setLastSavedAt(new Date());
      if (isNew) {
        addNotification("Project created", "success");
        const newId = (data as unknown as Record<string, unknown>)?.pic_projectid;
        if (newId) navigate(`/projects/${newId}`, { replace: true });
        else navigate("/projects");
      } else {
        addNotification("Project saved", "success");
      }
    },
    onError: (err) => {
      console.error("Save failed:", err);
      addNotification(`Save failed: ${err.message}`, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => Pic_projectsService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      addNotification("Project deleted", "success");
      navigate("/projects");
    },
    onError: (err) => { console.error("Delete failed:", err); addNotification(`Delete failed: ${err.message}`, "error"); },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const active = record?.statecode === 0;
      const result = await Pic_projectsService.update(id!, {
        statecode: (active ? 1 : 0) as never,
        statuscode: (active ? 2 : 1) as never,
      });
      if (result.error) throw new Error(result.error.message ?? "Failed to update status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const wasActive = record?.statecode === 0;
      addNotification(wasActive ? "Project deactivated" : "Project activated", "success");
    },
    onError: (err) => { console.error("Deactivate failed:", err); addNotification(`Failed: ${err.message}`, "error"); },
  });

  useKeyboardShortcuts({
    onSave: useCallback(() => saveMutation.mutate(), [saveMutation]),
    onSaveAndClose: useCallback(() => {
      saveMutation.mutate(undefined, { onSuccess: () => navigate("/projects") });
    }, [saveMutation, navigate]),
    disabled: saveMutation.isPending,
  });

  const isActive = isNew || record?.statecode === 0;

  useAutoSave({
    isDirty,
    isNew,
    isSaving: saveMutation.isPending,
    isDeactivated: !isActive,
    onSave: () => saveMutation.mutate(),
  });

  const statusOptions = STATUS_OPTIONS.project;
  const priorityOptions = STATUS_OPTIONS.priority;
  const riskOptions = STATUS_OPTIONS.risk;

  // Lookup search handlers
  const searchCategories = useCallback(async (query: string): Promise<LookupSearchResult[]> => {
    try {
      const filter = query ? `contains(pic_categoryname, '${query.replace(/'/g, "''")}')` : undefined;
      const result = await Pic_categoriesService.getAll({ filter, orderBy: ["pic_categoryname asc"] });
      return (result.data ?? []).map((c) => ({
        id: String((c as unknown as Record<string, unknown>).pic_categoryid ?? ""),
        name: String((c as unknown as Record<string, unknown>).pic_categoryname ?? ""),
      }));
    } catch (err) {
      console.error("Category lookup search failed:", err);
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

  const handleCategorySelect = useCallback((result: LookupSearchResult) => {
    updateField("pic_CategoryId@odata.bind" as keyof Pic_projectsBase, `/pic_categories(${result.id})`);
    // Store the display name locally so the form shows it immediately
    setCategoryDisplayName(result.name);
  }, []);

  const handlePMSelect = useCallback((result: LookupSearchResult) => {
    updateField("pic_ProjectManagerId@odata.bind" as keyof Pic_projectsBase, `/pic_teammembers(${result.id})`);
    setPmDisplayName(result.name);
  }, []);

  // Business rules — show/hide/disable fields based on values
  const isCancelled = Number(formData.pic_status) === 10004;
  const isCompleted = Number(formData.pic_status) === 10003;
  const formDisabled = !isNew && !isActive;
  const isReadOnlyStatus = isCancelled || isCompleted || formDisabled;

  // Record set navigator items from the list view's stored record order
  const [recordSetOpen, setRecordSetOpen] = useState(false);

  const recordNavItems = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("recordNav_/projects");
      const names = sessionStorage.getItem("recordNavNames_/projects");
      if (!raw) return undefined;
      const ids: string[] = JSON.parse(raw);
      const nameMap: Record<string, string> = names ? JSON.parse(names) : {};
      return ids.map((rid) => ({ id: rid, name: nameMap[rid] || rid.substring(0, 8) + "..." }));
    } catch {
      return undefined;
    }
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
          <FormSection title="Project Details">
            <FormField label="Project Name" value={formData.pic_projectname} onChange={(v) => updateField("pic_projectname", v)} required disabled={isCancelled || formDisabled} isDirty={df("pic_projectname")} validationMessage={validationErrors.has("Project Name") ? "Required" : undefined} />
            <FormField label="Project Code" value={record?.pic_projectcode} onChange={() => {}} type="readonly" />
            <FormField label="Status" value={formData.pic_status} onChange={(v) => updateField("pic_status", v)} type="select" options={statusOptions} required disabled={formDisabled} isDirty={df("pic_status")} validationMessage={validationErrors.has("Status") ? "Required" : undefined} />
            <FormField label="Priority" value={formData.pic_priority} onChange={(v) => updateField("pic_priority", v)} type="select" options={priorityOptions} required disabled={isReadOnlyStatus} isDirty={df("pic_priority")} validationMessage={validationErrors.has("Priority") ? "Required" : undefined} />
            <FormField label="Start Date" value={formData.pic_startdate} onChange={(v) => updateField("pic_startdate", v)} type="date" required disabled={isReadOnlyStatus} isDirty={df("pic_startdate")} validationMessage={validationErrors.has("Start Date") ? "Required" : undefined} />
            <FormField label="End Date" value={formData.pic_enddate} onChange={(v) => updateField("pic_enddate", v)} type="date" disabled={isReadOnlyStatus} isDirty={df("pic_enddate")} />
            <FormField
              label="Category"
              value={categoryDisplayName ?? (record as unknown as Record<string, unknown>)?.["_pic_categoryid_value@OData.Community.Display.V1.FormattedValue"] ?? ""}
              onChange={() => {}}
              type="lookup"
              disabled={formDisabled}
              onLookupNavigate={
                (record as unknown as Record<string, unknown>)?.["_pic_categoryid_value"]
                  ? () => navigate(`/categories/${(record as unknown as Record<string, unknown>)["_pic_categoryid_value"]}`)
                  : undefined
              }
              onLookupSearch={searchCategories}
              onLookupSelect={handleCategorySelect}
              onLookupClear={() => {
                updateField("pic_CategoryId@odata.bind" as keyof Pic_projectsBase, null);
                setCategoryDisplayName(null);
              }}
              onLookupNewRecord={() => navigate("/categories/new")}
              lookupTables={[
                { key: "categories", label: "Categories", onSearch: searchCategories },
              ]}
            />
            <FormField
              label="Project Manager"
              value={pmDisplayName ?? (record as unknown as Record<string, unknown>)?.["_pic_projectmanagerid_value@OData.Community.Display.V1.FormattedValue"] ?? ""}
              onChange={() => {}}
              type="lookup"
              disabled={formDisabled}
              onLookupNavigate={
                (record as unknown as Record<string, unknown>)?.["_pic_projectmanagerid_value"]
                  ? () => navigate(`/teammembers/${(record as unknown as Record<string, unknown>)["_pic_projectmanagerid_value"]}`)
                  : undefined
              }
              onLookupSearch={searchTeamMembers}
              onLookupSelect={handlePMSelect}
              onLookupNewRecord={() => navigate("/teammembers/new")}
              onLookupClear={() => {
                updateField("pic_ProjectManagerId@odata.bind" as keyof Pic_projectsBase, null);
                setPmDisplayName(null);
              }}
              lookupTables={[
                { key: "teammembers", label: "Team Members", onSearch: searchTeamMembers },
              ]}
            />
            <FormField label="Risk Level" value={formData.pic_risklevel} onChange={(v) => updateField("pic_risklevel", v)} type="select" options={riskOptions} disabled={isReadOnlyStatus} isDirty={df("pic_risklevel")} />
            <FormField label="Completion %" value={isCompleted ? 100 : formData.pic_completionpercent} onChange={(v) => updateField("pic_completionpercent", v)} type={isCompleted ? "readonly" : "number"} step={5} disabled={isCancelled || formDisabled} isDirty={df("pic_completionpercent")} />
            <FormField label="Department" value={formData.pic_department} onChange={(v) => updateField("pic_department", v)} disabled={isReadOnlyStatus} isDirty={df("pic_department")} />
            <FormField label="Description" value={formData.pic_description} onChange={(v) => updateField("pic_description", v)} type="textarea" disabled={isReadOnlyStatus} isDirty={df("pic_description")} />
          </FormSection>
          <FormSection title="Timeline" columns={1}>
            <TimelineWall
              objectId={id ?? ""}
              objectTypeCode="pic_project"
              isNew={isNew}
            />
          </FormSection>
        </>
      ),
    },
    {
      key: "budget",
      label: "Budget",
      content: (
        <FormSection title="Financials">
          <FormField label="Budget" value={formData.pic_budget} onChange={(v) => updateField("pic_budget", v)} type="money" disabled={isReadOnlyStatus} isDirty={df("pic_budget")} />
          <FormField label="Actual Cost" value={formData.pic_actualcost} onChange={(v) => updateField("pic_actualcost", v)} type="money" disabled={isCancelled || formDisabled} isDirty={df("pic_actualcost")} />
          <FormField label="Budget Utilization %" value={record?.pic_budgetutilization} onChange={() => {}} type="readonly" />
        </FormSection>
      ),
    },
    {
      key: "tasks",
      label: `Tasks${relatedTasks?.length ? ` (${relatedTasks.length})` : ""}`,
      content: (
        <FormSection title="Project Tasks" columns={1}>
          {isNew ? (
            <div style={{ padding: "24px 0", color: "#605e5c", fontSize: "14px" }}>
              Save the record first to add tasks.
            </div>
          ) : (
            <SubGrid
              title="Tasks"
              idField="pic_taskid"
              columns={[
                { key: "pic_taskname", header: "Task Name" },
                { key: "pic_status", header: "Status", render: (r) => String(r["pic_status@OData.Community.Display.V1.FormattedValue"] ?? r.pic_status ?? "") },
                { key: "pic_priority", header: "Priority", render: (r) => String(r["pic_priority@OData.Community.Display.V1.FormattedValue"] ?? r.pic_priority ?? "") },
                { key: "_pic_assignedtoid_value", header: "Assigned To", render: (r) => String(r["_pic_assignedtoid_value@OData.Community.Display.V1.FormattedValue"] ?? r.pic_assignedtoidname ?? "") },
                { key: "pic_duedate", header: "Due Date", render: (r) => r.pic_duedate ? new Date(String(r.pic_duedate)).toLocaleDateString() : "" },
                { key: "pic_completionpercent", header: "Completion %", align: "right", render: (r) => r.pic_completionpercent != null ? `${r.pic_completionpercent}%` : "" },
              ]}
              data={(relatedTasks ?? []) as unknown as Record<string, unknown>[]}
              isLoading={tasksLoading}
              onRowClick={(taskId) => navigate(`/tasks/${taskId}`)}
              onAdd={() => navigate(`/tasks/new?projectId=${id}`)}
              onDelete={(ids) => {
                Promise.all(ids.map((tid) => Pic_tasksService.delete(tid)))
                  .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["tasks", "byProject", id] });
                    addNotification(`${ids.length} task(s) deleted`, "success");
                  })
                  .catch((err) => addNotification(`Delete failed: ${err.message}`, "error"));
              }}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["tasks", "byProject", id] })}
              onViewAll={() => navigate("/tasks")}
              addLabel="New Task"
              emptyMessage="No tasks found for this project."
            />
          )}
        </FormSection>
      ),
    },
    {
      key: "team",
      label: `Team${relatedAssignments?.length ? ` (${relatedAssignments.length})` : ""}`,
      content: (
        <FormSection title="Project Assignments" columns={1}>
          {isNew ? (
            <div style={{ padding: "24px 0", color: "#605e5c", fontSize: "14px" }}>
              Save the record first to add team members.
            </div>
          ) : (
            <SubGrid
              title="Project Assignments"
              idField="pic_projectassignmentid"
              columns={[
                { key: "_pic_teammemberid_value", header: "Team Member", render: (r) => String(r["_pic_teammemberid_value@OData.Community.Display.V1.FormattedValue"] ?? r.pic_teammemberidname ?? "") },
                { key: "pic_role", header: "Role", render: (r) => String(r["pic_role@OData.Community.Display.V1.FormattedValue"] ?? r.pic_role ?? "") },
                { key: "pic_allocationpercent", header: "Allocation %", align: "right", render: (r) => r.pic_allocationpercent != null ? `${r.pic_allocationpercent}%` : "" },
              ]}
              data={(relatedAssignments ?? []) as unknown as Record<string, unknown>[]}
              isLoading={assignmentsLoading}
              onAdd={() => navigate(`/assignments/new?projectId=${id}`)}
              onDelete={(ids) => {
                Promise.all(ids.map((aid) => Pic_projectassignmentsService.delete(aid)))
                  .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["assignments", "byProject", id] });
                    addNotification(`${ids.length} assignment(s) deleted`, "success");
                  })
                  .catch((err) => addNotification(`Delete failed: ${err.message}`, "error"));
              }}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["assignments", "byProject", id] })}
              onViewAll={() => navigate("/assignments")}
              addLabel="New Assignment"
              emptyMessage="No team members assigned to this project."
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
          <FormField label="Created On" value={record?.createdon ? new Date(record.createdon).toLocaleString() : "---"} onChange={() => {}} type="readonly" />
          <FormField label="Created By" value={record?.createdbyname ?? "---"} onChange={() => {}} type="readonly" />
          <FormField label="Modified On" value={record?.modifiedon ? new Date(record.modifiedon).toLocaleString() : "---"} onChange={() => {}} type="readonly" />
          <FormField label="Modified By" value={record?.modifiedbyname ?? "---"} onChange={() => {}} type="readonly" />
          <FormField label="Owner" value={record?.owneridname ?? "---"} onChange={() => {}} type="readonly" />
          <FormField label="Record Status" value={record?.statecodename ?? "---"} onChange={() => {}} type="readonly" />
          <FormField label="Version" value={record?.versionnumber ?? "---"} onChange={() => {}} type="readonly" />
        </FormSection>
      ),
    },
    {
      key: "connections",
      label: "Connections",
      isRelated: true,
      icon: <LinkRegular />,
      content: (
        <FormSection title="Connections" columns={1}>
          <div style={{ padding: "24px 0", color: "#605e5c", fontSize: "14px", textAlign: "center" }}>
            No connections found for this record.
          </div>
        </FormSection>
      ),
    },
  ];

  if (!isNew && isError) {
    return (
      <>
        <EntityCommandBar
          showMDAActions={false}
          onBack={() => navigate("/projects")}
          actions={[]}
        />
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 48px", gap: "16px",
          backgroundColor: "#fff", margin: "8px 0 16px", borderRadius: "4px",
          boxShadow: "rgba(0,0,0,0.12) 0 0 2px 0, rgba(0,0,0,0.14) 0 2px 4px 0",
        }}>
          <div style={{ fontSize: "48px", color: "#d13438" }}>!</div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#323130" }}>
            Record Not Found
          </div>
          <div style={{ fontSize: "14px", color: "#605e5c", textAlign: "center" }}>
            {error?.message || "The requested project could not be found or you don't have permission to view it."}
          </div>
          <button
            onClick={() => navigate("/projects")}
            style={{
              marginTop: "8px", padding: "8px 24px", backgroundColor: "#0078d4",
              color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Back to Projects
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <EntityCommandBar
        showMDAActions={false}
        onBack={() => window.history.length > 2 ? navigate(-1) : navigate("/projects")}
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ["projects", "record", id] });
          queryClient.invalidateQueries({ queryKey: ["tasks", "byProject", id] });
          queryClient.invalidateQueries({ queryKey: ["assignments", "byProject", id] });
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
                onSuccess: () => navigate("/projects"),
              });
            },
            disabled: saveMutation.isPending || (!isDirty && !isNew),
            tooltip: "Ctrl+Shift+S",
          },
          {
            key: "new",
            label: "New",
            icon: AddRegular,
            onClick: () => navigate("/projects/new"),
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
              ]
            : []),
          ...(!isNew
            ? [
                {
                  key: "assign",
                  label: "Assign",
                  icon: PeopleRegular,
                  onClick: () => setAssignDialogOpen(true),
                },
              ]
            : []),
          ...(!isNew
            ? [
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
        title={isNew ? "New Project" : (record?.pic_projectname ?? "Loading...")}
        subtitle="Project"
        formOptions={["Project Main Form"]}
        activeForm="Project Main Form"
        entityColor="#e3008c"
        tabs={tabs}
        isLoading={!isNew && isLoading}
        isSaving={saveMutation.isPending}
        isDirty={isDirty}
        statusBadge={formData.pic_status ? (STATUS_COLORS.project as Record<number, { bg: string; fg: string; label: string }>)[Number(formData.pic_status)] : undefined}
        isDeactivated={!isNew && !isActive}
        currentRecordId={id}
        entityPath="/projects"
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
        headerContent={
          !isNew && record ? (
            <BPFBar
              currentStage={record.pic_bpfstage}
              onStageClick={isActive ? (stage) => {
                updateField("pic_bpfstage", stage);
                saveMutation.mutate();
              } : undefined}
            />
          ) : undefined
        }
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Project"
        message="Delete this project? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { deleteMutation.mutate(); setDeleteDialogOpen(false); }}
        onCancel={() => setDeleteDialogOpen(false)}
        danger
      />
      <ConfirmDialog
        open={deactivateDialogOpen}
        title={isActive ? "Deactivate Project" : "Activate Project"}
        message={isActive ? "Are you sure you want to deactivate this project?" : "Are you sure you want to activate this project?"}
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
        currentOwner={record?.pic_projectmanageridname}
        onAssign={(owner) => {
          addNotification(`Record assigned to ${owner}`, "success");
          setAssignDialogOpen(false);
        }}
        onCancel={() => setAssignDialogOpen(false)}
      />
    </>
  );
}
