import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AddRegular } from "@fluentui/react-icons";
import { Pic_projectsService } from "@generated/services/Pic_projectsService";
import { EntityListView } from "@/components/views/EntityListView";
import type { ColumnDef } from "@/components/views/EntityListView";
import { EntityCommandBar } from "@/components/common/EntityCommandBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { Pic_projects } from "@generated/models/Pic_projectsModel";

const VIEWS = [
  { key: "active", label: "Active Projects", filter: "statecode eq 0 and pic_status ne 10003 and pic_status ne 10004" },
  { key: "all", label: "All Projects", filter: "" },
  { key: "completed", label: "Completed Projects", filter: "pic_status eq 10003" },
  { key: "overbudget", label: "Over Budget", filter: "pic_budgetutilization gt 100" },
];

const COLUMNS: ColumnDef<Pic_projects>[] = [
  { key: "pic_projectname", header: "Project Name", width: "250px" },
  {
    key: "pic_status",
    header: "Status",
    width: "120px",
    render: (row) => <StatusBadge colorSet="project" value={row.pic_status} />,
  },
  {
    key: "pic_priority",
    header: "Priority",
    width: "100px",
    render: (row) => <StatusBadge colorSet="priority" value={row.pic_priority} />,
  },
  {
    key: "pic_startdate",
    header: "Start Date",
    width: "130px",
    render: (row) =>
      row.pic_startdate ? new Date(row.pic_startdate).toLocaleDateString() : "",
  },
  {
    key: "pic_enddate",
    header: "End Date",
    width: "130px",
    render: (row) =>
      row.pic_enddate ? new Date(row.pic_enddate).toLocaleDateString() : "",
  },
  {
    key: "pic_budget",
    header: "Budget",
    width: "120px",
    render: (row) =>
      row.pic_budget != null
        ? `$${Number(row.pic_budget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "",
  },
  { key: "pic_projectmanageridname", header: "Project Manager", width: "160px" },
];

export function ProjectList() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("active");

  const currentView = VIEWS.find((v) => v.key === activeView) ?? VIEWS[0];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["projects", "list", activeView],
    queryFn: () =>
      Pic_projectsService.getAll({
        select: [
          "pic_projectid",
          "pic_projectname",
          "pic_status",
          "pic_priority",
          "pic_startdate",
          "pic_enddate",
          "pic_budget",
          "_pic_projectmanagerid_value",
        ],
        filter: currentView.filter || undefined,
        orderBy: ["pic_startdate desc"],
      }),
  });

  return (
    <>
      <EntityCommandBar
        actions={[
          {
            key: "new",
            label: "New",
            icon: AddRegular,
            primary: true,
            onClick: () => navigate("/projects/new"),
          },
        ]}
        onRefresh={() => refetch()}
      />
      <EntityListView<Pic_projects>
        title="Projects"
        columns={COLUMNS}
        data={data?.data}
        isLoading={isLoading}
        idField="pic_projectid"
        entityPath="/projects"
        views={VIEWS.map((v) => ({ key: v.key, label: v.label }))}
        activeView={activeView}
        onViewChange={setActiveView}
      />
    </>
  );
}
