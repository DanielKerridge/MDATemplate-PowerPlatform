import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SaveRegular, DeleteRegular, ArrowLeftRegular, AddRegular } from "@fluentui/react-icons";
import { Button } from "@fluentui/react-components";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pic_projectsService } from "@generated/services/Pic_projectsService";
import type { Pic_projectsBase } from "@generated/models/Pic_projectsModel";
import { RecordForm } from "@/components/forms/RecordForm";
import { FormSection } from "@/components/forms/FormSection";
import { FormField } from "@/components/forms/FormField";
import { EntityCommandBar } from "@/components/common/EntityCommandBar";
import { BPFBar } from "@/components/common/BPFBar";
import { useAppStore } from "@/store/useAppStore";
import { STATUS_COLORS } from "@/config/constants";

export function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);

  const { data: record, isLoading } = useQuery({
    queryKey: ["projects", "record", id],
    queryFn: async () => {
      const result = await Pic_projectsService.get(id!);
      if (!result.success) throw new Error("Failed to load project");
      return result.data;
    },
    enabled: !!id,
  });

  const [formData, setFormData] = useState<Partial<Pic_projectsBase>>({});

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

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        const result = await Pic_projectsService.create(formData);
        if (!result.success) throw new Error("Failed to create");
        return result.data;
      }
      const result = await Pic_projectsService.update(id!, formData);
      if (!result.success) throw new Error("Failed to save");
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (isNew) {
        addNotification("Project created successfully", "success");
        const newId = (data as Record<string, unknown>)?.pic_projectid;
        if (newId) navigate(`/projects/${newId}`, { replace: true });
        else navigate("/projects");
      } else {
        addNotification("Project saved successfully", "success");
      }
    },
    onError: (err) => {
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
  });

  const statusOptions = Object.entries(STATUS_COLORS.project).map(([val, info]) => ({
    value: val,
    label: info.label,
  }));

  const priorityOptions = Object.entries(STATUS_COLORS.priority).map(([val, info]) => ({
    value: val,
    label: info.label,
  }));

  const riskOptions = Object.entries(STATUS_COLORS.risk).map(([val, info]) => ({
    value: val,
    label: info.label,
  }));

  const tabs = [
    {
      key: "general",
      label: "General",
      content: (
        <>
          <FormSection title="Project Information">
            <FormField
              label="Project Name"
              value={formData.pic_projectname}
              onChange={(v) => updateField("pic_projectname", v)}
              required
            />
            <FormField
              label="Project Code"
              value={record?.pic_projectcode}
              onChange={() => {}}
              type="readonly"
            />
            <FormField
              label="Status"
              value={formData.pic_status}
              onChange={(v) => updateField("pic_status", v)}
              type="select"
              options={statusOptions}
              required
            />
            <FormField
              label="Priority"
              value={formData.pic_priority}
              onChange={(v) => updateField("pic_priority", v)}
              type="select"
              options={priorityOptions}
              required
            />
            <FormField
              label="Risk Level"
              value={formData.pic_risklevel}
              onChange={(v) => updateField("pic_risklevel", v)}
              type="select"
              options={riskOptions}
            />
            <FormField
              label="Active"
              value={formData.pic_isactive}
              onChange={(v) => updateField("pic_isactive", v)}
              type="boolean"
            />
          </FormSection>
          <FormSection title="Schedule">
            <FormField
              label="Start Date"
              value={formData.pic_startdate}
              onChange={(v) => updateField("pic_startdate", v)}
              type="date"
              required
            />
            <FormField
              label="End Date"
              value={formData.pic_enddate}
              onChange={(v) => updateField("pic_enddate", v)}
              type="date"
            />
            <FormField
              label="Completion %"
              value={formData.pic_completionpercent}
              onChange={(v) => updateField("pic_completionpercent", v)}
              type="number"
              step={5}
            />
          </FormSection>
          <FormSection title="Description" columns={1}>
            <FormField
              label="Description"
              value={formData.pic_description}
              onChange={(v) => updateField("pic_description", v)}
              type="textarea"
            />
          </FormSection>
        </>
      ),
    },
    {
      key: "budget",
      label: "Budget",
      content: (
        <FormSection title="Financial">
          <FormField
            label="Budget"
            value={formData.pic_budget}
            onChange={(v) => updateField("pic_budget", v)}
            type="money"
          />
          <FormField
            label="Actual Cost"
            value={formData.pic_actualcost}
            onChange={(v) => updateField("pic_actualcost", v)}
            type="money"
          />
          <FormField
            label="Budget Utilization"
            value={record?.pic_budgetutilization}
            onChange={() => {}}
            type="readonly"
          />
        </FormSection>
      ),
    },
  ];

  return (
    <>
      <EntityCommandBar
        actions={[
          {
            key: "back",
            label: "Back",
            icon: ArrowLeftRegular,
            onClick: () => navigate("/projects"),
          },
          {
            key: "save",
            label: "Save",
            icon: SaveRegular,
            primary: true,
            onClick: () => saveMutation.mutate(),
            disabled: saveMutation.isPending,
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
            disabled: saveMutation.isPending,
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
                  key: "delete",
                  label: "Delete",
                  icon: DeleteRegular,
                  danger: true,
                  onClick: () => {
                    if (confirm("Delete this project? This action cannot be undone.")) {
                      deleteMutation.mutate();
                    }
                  },
                },
              ]
            : []),
        ]}
      />
      <RecordForm
        title={isNew ? "New Project" : (record?.pic_projectname ?? "Loading...")}
        tabs={tabs}
        isLoading={!isNew && isLoading}
        headerContent={
          !isNew && record ? (
            <BPFBar
              currentStage={record.pic_bpfstage}
              onStageClick={(stage) => {
                updateField("pic_bpfstage", stage);
                saveMutation.mutate();
              }}
            />
          ) : undefined
        }
      />
    </>
  );
}
