import {
  FolderOpenRegular,
  PeopleRegular,
  SettingsRegular,
  PuzzlePieceRegular,
  PersonRegular,
  PeopleTeamRegular,
  TagRegular,
} from "@fluentui/react-icons";

export interface NavItem {
  key: string;
  label: string;
  icon: typeof FolderOpenRegular;
  path: string;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

export interface NavArea {
  key: string;
  label: string;
  icon: typeof FolderOpenRegular;
  groups: NavGroup[];
}

export const NAVIGATION: NavArea[] = [
  {
    key: "projects",
    label: "Projects",
    icon: FolderOpenRegular,
    groups: [
      {
        key: "management",
        label: "Management",
        items: [
          { key: "projects", label: "Projects", icon: PuzzlePieceRegular, path: "/projects" },
          { key: "tasks", label: "Tasks", icon: PuzzlePieceRegular, path: "/tasks" },
        ],
      },
      {
        key: "tracking",
        label: "Tracking",
        items: [
          { key: "timeentries", label: "Time Entries", icon: PuzzlePieceRegular, path: "/timeentries" },
        ],
      },
    ],
  },
  {
    key: "team",
    label: "Team",
    icon: PeopleRegular,
    groups: [
      {
        key: "people",
        label: "People",
        items: [
          { key: "teammembers", label: "Team Members", icon: PersonRegular, path: "/teammembers" },
          { key: "assignments", label: "Assignments", icon: PeopleTeamRegular, path: "/assignments" },
        ],
      },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: SettingsRegular,
    groups: [
      {
        key: "configuration",
        label: "Configuration",
        items: [
          { key: "categories", label: "Categories", icon: TagRegular, path: "/categories" },
        ],
      },
    ],
  },
];
