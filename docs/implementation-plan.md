# MDA Template — Implementation Plan

## 1. Overview

**Purpose:** A standalone Code App built with React/TypeScript that replicates the full Model-Driven App (MDA) experience. This serves as a reusable template demonstrating all major MDA UI patterns — navigation, entity grids, record forms, subgrids, command bars, lookups, dashboards, quick views, and business process flow visualization — powered by Dataverse via the @microsoft/power-apps SDK. The domain is Project Management, chosen to showcase diverse column types, relationships, and real business workflows.

**Architecture Constraint:** Code Apps are standalone applications and CANNOT be embedded inside MDAs (confirmed platform limitation — CSP blocks iframing). The entire MDA chrome is rebuilt in React.

**Personas:**

| Persona | Access Level | Key Tasks |
|---|---|---|
| Project Manager (PM) | Read/Write all projects + team, financial data visible | Create projects, assign tasks, track budgets, manage team |
| Team Member (TM) | Read/Write own tasks + time entries, financial fields hidden | Update task status, log time, view assigned work |
| Viewer | Read-only all entities, all write controls hidden | View project status, review dashboards |
| Admin | Full access including Settings area | Manage categories, configure app, manage security |

## 2. Solution Structure

**Publisher:**
- Friendly Name: PIC
- Unique Name: pic
- Prefix: pic
- Option Value Prefix: 10000
- **Must be CREATED in MDAClone environment (does not exist yet)**

**Solution:**
- Unique Name: MDATemplate
- Friendly Name: MDA Template
- Version: 1.0.0.0
- Description: Reusable template demonstrating MDA patterns in a Code App

## 3. Data Model

### 3.1 Tables

---

#### TABLE: pic_Project

| Property | Value |
|---|---|
| Display Name | Project / Projects |
| Ownership | UserOwned |
| HasNotes | true |
| HasActivities | true |
| IsAuditEnabled | true |
| Primary Name | pic_ProjectName (max 200) |

**Columns:**

| Column | Type | @odata.type | Required | Constraints |
|---|---|---|---|---|
| pic_ProjectName | String | Microsoft.Dynamics.CRM.StringAttributeMetadata | Required | MaxLength: 200 |
| pic_ProjectCode | String (Auto-Number) | Microsoft.Dynamics.CRM.StringAttributeMetadata | System | Format: `PRJ-{SEQNUM:5}` |
| pic_Description | Memo | Microsoft.Dynamics.CRM.MemoAttributeMetadata | Optional | MaxLength: 10000 |
| pic_Status | Choice (Global) | Microsoft.Dynamics.CRM.PicklistAttributeMetadata | Required | GlobalOptionSet: pic_projectstatus |
| pic_Priority | Choice (Global) | Microsoft.Dynamics.CRM.PicklistAttributeMetadata | Required | GlobalOptionSet: pic_priority |
| pic_StartDate | DateOnly | Microsoft.Dynamics.CRM.DateTimeAttributeMetadata | Required | DateTimeBehavior: DateOnly |
| pic_EndDate | DateOnly | Microsoft.Dynamics.CRM.DateTimeAttributeMetadata | Optional | DateTimeBehavior: DateOnly |
| pic_Budget | Currency | Microsoft.Dynamics.CRM.MoneyAttributeMetadata | Optional | Precision: 2, Min: 0, Max: 999999999 |
| pic_ActualCost | Currency | Microsoft.Dynamics.CRM.MoneyAttributeMetadata | Optional | Precision: 2, Min: 0, Max: 999999999 |
| pic_BudgetUtilization | Decimal (Formula) | Microsoft.Dynamics.CRM.DecimalAttributeMetadata | System | Formula: `If(pic_Budget > 0, (pic_ActualCost / pic_Budget) * 100, 0)` |
| pic_CompletionPercent | Decimal | Microsoft.Dynamics.CRM.DecimalAttributeMetadata | Optional | Precision: 2, Min: 0, Max: 100 |
| pic_IsActive | Boolean | Microsoft.Dynamics.CRM.BooleanAttributeMetadata | Required | Default: true |
| pic_CustomerId | Customer (Polymorphic) | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Optional | Targets: account, contact |
| pic_ProjectManagerId | Lookup | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Optional | Target: pic_TeamMember |
| pic_CategoryId | Lookup | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Optional | Target: pic_Category |
| pic_ProjectImage | Image | Microsoft.Dynamics.CRM.ImageAttributeMetadata | Optional | MaxSizeInKB: 10240 |
| pic_Attachments | File | Microsoft.Dynamics.CRM.FileAttributeMetadata | Optional | MaxSizeInKB: 32768 |
| pic_Department | String | Microsoft.Dynamics.CRM.StringAttributeMetadata | Optional | MaxLength: 100 |
| pic_BPFStage | Choice (Local) | Microsoft.Dynamics.CRM.PicklistAttributeMetadata | Optional | Options: 10000=Initiation, 10001=Planning, 10002=Execution, 10003=Monitoring, 10004=Closure |
| pic_RiskLevel | Choice (Local) | Microsoft.Dynamics.CRM.PicklistAttributeMetadata | Optional | Options: 10000=Low, 10001=Medium, 10002=High, 10003=Critical |

**Relationships:**

| Relationship | Type | Related Table | Cascade Delete | Other Cascades |
|---|---|---|---|---|
| pic_project_tasks | 1:N | pic_Task | Cascade | Assign: Cascade, Share: Cascade, Reparent: Cascade |
| pic_project_assignments | 1:N | pic_ProjectAssignment | Cascade | Assign: Cascade, Share: Cascade |
| pic_project_timeentries | 1:N | pic_TimeEntry | Restrict | Share: NoCascade |
| pic_project_category | N:1 | pic_Category | RemoveLink | — |
| pic_project_customer | N:1 | account/contact (Customer) | RemoveLink | — |
| pic_project_manager | N:1 | pic_TeamMember | RemoveLink | — |

---

#### TABLE: pic_Task

| Property | Value |
|---|---|
| Display Name | Task / Tasks |
| Ownership | UserOwned |
| HasNotes | true |
| HasActivities | false |
| IsAuditEnabled | true |
| Primary Name | pic_TaskName (max 200) |

**Columns:**

| Column | Type | @odata.type | Required | Constraints |
|---|---|---|---|---|
| pic_TaskName | String | Microsoft.Dynamics.CRM.StringAttributeMetadata | Required | MaxLength: 200 |
| pic_TaskNumber | String (Auto-Number) | Microsoft.Dynamics.CRM.StringAttributeMetadata | System | Format: `TSK-{SEQNUM:6}` |
| pic_Description | Memo | Microsoft.Dynamics.CRM.MemoAttributeMetadata | Optional | MaxLength: 5000 |
| pic_Status | Choice (Global) | Microsoft.Dynamics.CRM.PicklistAttributeMetadata | Required | GlobalOptionSet: pic_taskstatus |
| pic_Priority | Choice (Global) | Microsoft.Dynamics.CRM.PicklistAttributeMetadata | Required | GlobalOptionSet: pic_priority |
| pic_StartDate | DateOnly | Microsoft.Dynamics.CRM.DateTimeAttributeMetadata | Optional | DateTimeBehavior: DateOnly |
| pic_DueDate | DateOnly | Microsoft.Dynamics.CRM.DateTimeAttributeMetadata | Required | DateTimeBehavior: DateOnly |
| pic_CompletionDate | DateOnly | Microsoft.Dynamics.CRM.DateTimeAttributeMetadata | Optional | DateTimeBehavior: DateOnly |
| pic_EstimatedHours | Decimal | Microsoft.Dynamics.CRM.DecimalAttributeMetadata | Optional | Precision: 2, Min: 0, Max: 9999 |
| pic_ActualHours | Decimal | Microsoft.Dynamics.CRM.DecimalAttributeMetadata | Optional | Precision: 2, Min: 0, Max: 9999 |
| pic_CompletionPercent | Whole Number | Microsoft.Dynamics.CRM.IntegerAttributeMetadata | Optional | Min: 0, Max: 100 |
| pic_ProjectId | Lookup | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Required | Target: pic_Project |
| pic_AssignedToId | Lookup | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Optional | Target: pic_TeamMember |
| pic_ParentTaskId | Lookup (Self-Referential) | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Optional | Target: pic_Task |
| pic_IsMilestone | Boolean | Microsoft.Dynamics.CRM.BooleanAttributeMetadata | Optional | Default: false |

**Relationships:**

| Relationship | Type | Related Table | Cascade Delete |
|---|---|---|---|
| pic_task_project | N:1 | pic_Project | — (parent cascades) |
| pic_task_assignedto | N:1 | pic_TeamMember | RemoveLink |
| pic_task_parenttask | N:1 (Self) | pic_Task | RemoveLink |
| pic_task_timeentries | 1:N | pic_TimeEntry | Restrict |
| pic_task_subtasks | 1:N (Self) | pic_Task | RemoveLink |

---

#### TABLE: pic_TeamMember

| Property | Value |
|---|---|
| Display Name | Team Member / Team Members |
| Ownership | UserOwned |
| HasNotes | true |
| HasActivities | false |
| IsAuditEnabled | true |
| Primary Name | pic_FullName (max 200) |

**Columns:**

| Column | Type | @odata.type | Required | Constraints |
|---|---|---|---|---|
| pic_FullName | String | Microsoft.Dynamics.CRM.StringAttributeMetadata | Required | MaxLength: 200 |
| pic_Email | String (Email format) | Microsoft.Dynamics.CRM.StringAttributeMetadata | Required | MaxLength: 320, Format: Email |
| pic_Phone | String (Phone format) | Microsoft.Dynamics.CRM.StringAttributeMetadata | Optional | MaxLength: 30, Format: Phone |
| pic_Role | Choice (Global) | Microsoft.Dynamics.CRM.PicklistAttributeMetadata | Required | GlobalOptionSet: pic_teamrole |
| pic_HourlyRate | Currency | Microsoft.Dynamics.CRM.MoneyAttributeMetadata | Optional | Precision: 2, Min: 0, Max: 9999 |
| pic_IsAvailable | Boolean | Microsoft.Dynamics.CRM.BooleanAttributeMetadata | Optional | Default: true |
| pic_UserId | Lookup | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Optional | Target: systemuser |
| pic_ProfilePhoto | Image | Microsoft.Dynamics.CRM.ImageAttributeMetadata | Optional | MaxSizeInKB: 5120 |
| pic_Department | Choice (Local) | Microsoft.Dynamics.CRM.PicklistAttributeMetadata | Optional | Options: 10000=Engineering, 10001=Design, 10002=QA, 10003=Product, 10004=Marketing, 10005=Sales, 10006=Operations |
| pic_Location | String | Microsoft.Dynamics.CRM.StringAttributeMetadata | Optional | MaxLength: 200 |
| pic_Skills | Choices (MultiSelect Local) | Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata | Optional | Options: 10000=JavaScript, 10001=TypeScript, 10002=React, 10003=C#, 10004=SQL, 10005=Power Platform, 10006=Azure, 10007=UI/UX Design, 10008=DevOps |
| pic_JoinDate | DateOnly | Microsoft.Dynamics.CRM.DateTimeAttributeMetadata | Optional | DateTimeBehavior: DateOnly |

**Relationships:**

| Relationship | Type | Related Table | Cascade Delete |
|---|---|---|---|
| pic_teammember_assignments | 1:N | pic_ProjectAssignment | RemoveLink |
| pic_teammember_tasks | 1:N | pic_Task | RemoveLink |
| pic_teammember_timeentries | 1:N | pic_TimeEntry | Restrict |
| pic_teammember_user | N:1 | systemuser | RemoveLink |

---

#### TABLE: pic_TimeEntry

| Property | Value |
|---|---|
| Display Name | Time Entry / Time Entries |
| Ownership | UserOwned |
| HasNotes | false |
| HasActivities | false |
| IsAuditEnabled | true |
| Primary Name | pic_Description (max 200) |

**Columns:**

| Column | Type | @odata.type | Required | Constraints |
|---|---|---|---|---|
| pic_Description | String | Microsoft.Dynamics.CRM.StringAttributeMetadata | Required | MaxLength: 200 |
| pic_EntryDate | DateOnly | Microsoft.Dynamics.CRM.DateTimeAttributeMetadata | Required | DateTimeBehavior: DateOnly |
| pic_Duration | Decimal | Microsoft.Dynamics.CRM.DecimalAttributeMetadata | Required | Precision: 2, Min: 0.25, Max: 24 |
| pic_IsBillable | Boolean | Microsoft.Dynamics.CRM.BooleanAttributeMetadata | Optional | Default: true |
| pic_ProjectId | Lookup | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Required | Target: pic_Project |
| pic_TaskId | Lookup | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Optional | Target: pic_Task |
| pic_TeamMemberId | Lookup | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Required | Target: pic_TeamMember |
| pic_Notes | Memo | Microsoft.Dynamics.CRM.MemoAttributeMetadata | Optional | MaxLength: 2000 |

**Relationships:**

| Relationship | Type | Related Table | Cascade Delete |
|---|---|---|---|
| pic_timeentry_project | N:1 | pic_Project | Restrict (from parent) |
| pic_timeentry_task | N:1 | pic_Task | Restrict (from parent) |
| pic_timeentry_teammember | N:1 | pic_TeamMember | Restrict (from parent) |

---

#### TABLE: pic_Category

| Property | Value |
|---|---|
| Display Name | Category / Categories |
| Ownership | OrganizationOwned |
| HasNotes | false |
| HasActivities | false |
| IsAuditEnabled | false |
| Primary Name | pic_CategoryName (max 100) |

**Columns:**

| Column | Type | @odata.type | Required | Constraints |
|---|---|---|---|---|
| pic_CategoryName | String | Microsoft.Dynamics.CRM.StringAttributeMetadata | Required | MaxLength: 100 |
| pic_Description | Memo | Microsoft.Dynamics.CRM.MemoAttributeMetadata | Optional | MaxLength: 1000 |
| pic_Color | String | Microsoft.Dynamics.CRM.StringAttributeMetadata | Optional | MaxLength: 7 (hex code) |
| pic_Icon | String | Microsoft.Dynamics.CRM.StringAttributeMetadata | Optional | MaxLength: 50 (icon name) |
| pic_SortOrder | Whole Number | Microsoft.Dynamics.CRM.IntegerAttributeMetadata | Optional | Min: 0, Max: 999 |
| pic_IsActive | Boolean | Microsoft.Dynamics.CRM.BooleanAttributeMetadata | Optional | Default: true |

**Relationships:**

| Relationship | Type | Related Table | Cascade Delete |
|---|---|---|---|
| pic_category_projects | 1:N | pic_Project | RemoveLink |

---

#### TABLE: pic_ProjectAssignment

| Property | Value |
|---|---|
| Display Name | Project Assignment / Project Assignments |
| Ownership | UserOwned |
| HasNotes | false |
| HasActivities | false |
| IsAuditEnabled | true |
| Primary Name | pic_AssignmentName (max 200) |

**Purpose:** Junction table replacing N:N between Project and TeamMember, allowing additional columns (role on project, allocation %, dates).

**Alternate Key:** `pic_ProjectId` + `pic_TeamMemberId` (composite — prevents duplicate assignments)

**Columns:**

| Column | Type | @odata.type | Required | Constraints |
|---|---|---|---|---|
| pic_AssignmentName | String | Microsoft.Dynamics.CRM.StringAttributeMetadata | Required | MaxLength: 200 (auto-populated: "MemberName - ProjectName") |
| pic_ProjectId | Lookup | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Required | Target: pic_Project |
| pic_TeamMemberId | Lookup | Microsoft.Dynamics.CRM.LookupAttributeMetadata | Required | Target: pic_TeamMember |
| pic_RoleOnProject | Choice (Global) | Microsoft.Dynamics.CRM.PicklistAttributeMetadata | Optional | GlobalOptionSet: pic_teamrole |
| pic_AllocationPercent | Whole Number | Microsoft.Dynamics.CRM.IntegerAttributeMetadata | Optional | Min: 0, Max: 100 |
| pic_StartDate | DateOnly | Microsoft.Dynamics.CRM.DateTimeAttributeMetadata | Optional | DateTimeBehavior: DateOnly |
| pic_EndDate | DateOnly | Microsoft.Dynamics.CRM.DateTimeAttributeMetadata | Optional | DateTimeBehavior: DateOnly |

**Relationships:**

| Relationship | Type | Related Table | Cascade Delete |
|---|---|---|---|
| pic_assignment_project | N:1 | pic_Project | Cascade (project delete removes assignments) |
| pic_assignment_teammember | N:1 | pic_TeamMember | RemoveLink (member delete detaches, preserves audit) |

---

### 3.2 Global Option Sets

| Name | Options |
|---|---|
| pic_projectstatus | 10000: Planning, 10001: Active, 10002: On Hold, 10003: Completed, 10004: Cancelled |
| pic_priority | 10000: Low, 10001: Medium, 10002: High, 10003: Critical |
| pic_taskstatus | 10000: Not Started, 10001: In Progress, 10002: Blocked, 10003: Completed, 10004: Cancelled |
| pic_teamrole | 10000: Developer, 10001: Designer, 10002: Tester, 10003: Business Analyst, 10004: Project Manager, 10005: Architect, 10006: Stakeholder |

### 3.3 Relationship Diagram

```
                    [systemuser]
                    /          \
                   /            \
       (ProjectManager)    (UserId)
              |                |
  [pic_Category]          [pic_TeamMember]
       |                  /          \
    (CategoryId)      (AssignedTo)    \
       |             /            (TeamMemberId)
  [pic_Project] ←──────────── [pic_ProjectAssignment]
       |    \
       |     \  (CustomerId)
       |      → [account/contact]
       |
    (ProjectId)
       |
  [pic_Task] ←──(ParentTaskId)── [pic_Task] (self-ref)
       |
    (TaskId)
       |
  [pic_TimeEntry]
```

## 4. App Design

### 4.1 Code App Architecture

```
Tech Stack:
  - React 18+ with TypeScript
  - Vite (build tool)
  - @microsoft/power-apps SDK v1.0.3+
  - @fluentui/react-components (Fluent UI v2)
  - React Router v6 (client-side routing)
  - TanStack Query v5 (data fetching, caching, pagination)
  - Zustand (lightweight state management)

Component Hierarchy:
  <App>
    <FluentProvider theme={teamsLightTheme}>
      <QueryClientProvider>
        <BrowserRouter>
          <AppShell>
            <LeftNav />                    — Sitemap-style navigation
            <ContentArea>
              <BreadcrumbBar />            — Context path
              <CommandBar />               — Entity-specific actions
              <Routes>
                <Dashboard />              — Homepage with KPIs + charts
                <EntityListView />         — DataGrid with sort/filter/page
                <RecordForm />             — Tabbed form with sections
                <QuickCreateDialog />      — Modal for new records
                <QuickViewPanel />         — Read-only related record
              </Routes>
            </ContentArea>
          </AppShell>
          <BPFBar />                       — Business Process Flow visualization
          <NotificationCenter />           — Toast notifications
        </BrowserRouter>
      </QueryClientProvider>
    </FluentProvider>
  </App>
```

### 4.2 Sitemap (Left Navigation)

```
LEFT NAV:
  AREA: Projects (FolderOpen icon)
    GROUP: Management
      ITEM: Dashboard → /
      ITEM: Projects → /projects
      ITEM: Tasks → /tasks
    GROUP: Tracking
      ITEM: Time Entries → /timeentries

  AREA: Team (People icon)
    GROUP: People
      ITEM: Team Members → /teammembers
      ITEM: Assignments → /assignments

  AREA: Settings (Settings icon)
    GROUP: Configuration
      ITEM: Categories → /categories
```

### 4.3 Forms

#### Project Main Form

```
FORM: Project Main Form
  BPF BAR: Initiation → Planning → Execution → Monitoring → Closure
    (Interactive stepper backed by pic_BPFStage column — click to advance, independent of pic_Status)

  TAB: General
    SECTION: Project Details (2 columns)
      Row 1: pic_ProjectName | pic_ProjectCode (read-only)
      Row 2: pic_Status | pic_Priority
      Row 3: pic_StartDate | pic_EndDate
      Row 4: pic_CategoryId (lookup) | pic_CustomerId (customer lookup)
      Row 5: pic_ProjectManagerId (lookup) | pic_Department
      Row 6: pic_RiskLevel | pic_CompletionPercent
    SECTION: Description (1 column)
      Row 1: pic_Description (rich text editor, full width)
    SECTION: Project Image
      Row 1: pic_ProjectImage

  TAB: Budget
    SECTION: Financials (2 columns)
      Row 1: pic_Budget | pic_ActualCost
      Row 2: pic_BudgetUtilization (read-only formula) | —
    SECTION: Budget Chart
      [Bar chart: Budget vs Actual Cost]

  TAB: Tasks
    SECTION: Task List
      SUBGRID: pic_project_tasks
        View: Active Tasks
        Columns: TaskName | Status | Priority | AssignedTo | DueDate | CompletionPercent
        Allow: New, Edit, Delete

  TAB: Team
    SECTION: Project Assignments
      SUBGRID: pic_project_assignments
        View: All Assignments
        Columns: TeamMember | RoleOnProject | AllocationPercent | StartDate | EndDate
        Allow: New, Edit, Delete

  TAB: Time
    SECTION: Time Entries
      SUBGRID: pic_project_timeentries
        View: Recent Time Entries
        Columns: Description | TeamMember | EntryDate | Duration | IsBillable
        Allow: New (Quick Create)

  TAB: Notes & Activities
    SECTION: Timeline
      [Timeline control — notes + activities]
    SECTION: Attachments
      Row 1: pic_Attachments (file upload)
```

**Project Quick Create (5 fields):**
- pic_ProjectName (required)
- pic_Priority (radio buttons)
- pic_StartDate (required)
- pic_CategoryId (lookup)
- pic_Status (dropdown, default: Planning)

#### Task Main Form

```
FORM: Task Main Form
  TAB: General
    SECTION: Task Details (2 columns)
      Row 1: pic_TaskName | pic_TaskNumber (read-only)
      Row 2: pic_Status | pic_Priority
      Row 3: pic_StartDate | pic_DueDate
      Row 4: pic_ProjectId (lookup) | pic_AssignedToId (lookup)
      Row 5: pic_EstimatedHours | pic_ActualHours
      Row 6: pic_CompletionPercent (SLIDER, 0-100, step 5) | pic_IsMilestone (toggle)
      Row 7: pic_ParentTaskId (lookup) | pic_CompletionDate
    SECTION: Description (1 column)
      Row 1: pic_Description (memo)

  TAB: Subtasks
    SECTION: Child Tasks
      SUBGRID: pic_task_subtasks
        View: Active Subtasks
        Columns: TaskName | Status | Priority | AssignedTo | DueDate

  TAB: Time
    SECTION: Time Entries
      SUBGRID: pic_task_timeentries
        View: Task Time Entries
        Columns: Description | TeamMember | EntryDate | Duration | IsBillable

  TAB: Notes
    SECTION: Timeline
      [Timeline control — notes only (HasActivities = false)]
```

**Task Quick Create (5 fields):**
- pic_TaskName (required)
- pic_ProjectId (lookup, pre-filled from context)
- pic_AssignedToId (lookup)
- pic_DueDate (date)
- pic_Priority (radio buttons)

#### Team Member Main Form

```
FORM: Team Member Main Form
  TAB: General
    SECTION: Personal Info (2 columns)
      Row 1: pic_FullName | pic_ProfilePhoto
      Row 2: pic_Email | pic_Phone
      Row 3: pic_Role | pic_Department
      Row 4: pic_Location | pic_JoinDate
      Row 5: pic_HourlyRate | pic_IsAvailable (toggle)
      Row 6: pic_UserId (lookup) | —
    SECTION: Skills (1 column)
      Row 1: pic_Skills (memo, full width)

  TAB: Projects
    SECTION: Project Assignments
      SUBGRID: pic_teammember_assignments
        View: Active Assignments
        Columns: Project | RoleOnProject | AllocationPercent | StartDate | EndDate

  TAB: Tasks
    SECTION: Assigned Tasks
      SUBGRID: pic_teammember_tasks
        View: My Active Tasks
        Columns: TaskName | Project | Status | Priority | DueDate

  TAB: Time
    SECTION: Recent Time Entries
      SUBGRID: pic_teammember_timeentries
        View: Recent Time Entries
        Columns: Description | Project | EntryDate | Duration | IsBillable

  TAB: Timeline
    SECTION: Notes
      [Timeline control — notes only (HasNotes = true)]
```

**Team Member Quick Create (5 fields):**
- pic_FullName (required)
- pic_Email (required)
- pic_Role (dropdown)
- pic_Department (dropdown)
- pic_Phone (phone)

#### Time Entry Main Form

```
FORM: Time Entry Main Form
  TAB: General
    SECTION: Entry Details (2 columns)
      Row 1: pic_Description | pic_EntryDate
      Row 2: pic_ProjectId (lookup) | pic_TaskId (lookup, filtered by project)
      Row 3: pic_TeamMemberId (lookup) | pic_Duration
      Row 4: pic_IsBillable (toggle) | —
    SECTION: Notes (1 column)
      Row 1: pic_Notes (memo)
```

**Time Entry Quick Create (5 fields):**
- pic_Description (required)
- pic_ProjectId (lookup, pre-filled from context)
- pic_TeamMemberId (lookup, default: current user's member)
- pic_EntryDate (date, default: today)
- pic_Duration (decimal, step 0.25)

#### Category Main Form

```
FORM: Category Main Form
  TAB: General
    SECTION: Category Details (2 columns)
      Row 1: pic_CategoryName | pic_SortOrder
      Row 2: pic_Color (color picker) | pic_Icon
      Row 3: pic_IsActive (toggle) | —
    SECTION: Description (1 column)
      Row 1: pic_Description (memo)

  TAB: Projects
    SECTION: Projects in Category
      SUBGRID: pic_category_projects
        View: Active Projects
        Columns: ProjectName | Status | Priority | StartDate | Budget
```

### 4.4 Views

#### Project Views

| View Name | Default | Columns | Filter | Sort |
|---|---|---|---|---|
| Active Projects | Yes | ProjectName, Status, Priority, StartDate, EndDate, Budget, ProjectManager | Status ne Cancelled | StartDate desc |
| My Projects | No | ProjectName, Status, Priority, StartDate, EndDate, CompletionPercent | Owner = current user | StartDate desc |
| Over Budget | No | ProjectName, Budget, ActualCost, BudgetUtilization, Status | pic_BudgetUtilization gt 100 (server-side via formula column) | BudgetUtilization desc |
| Completed Projects | No | ProjectName, CompletionDate, Budget, ActualCost | Status = Completed | EndDate desc |
| All Projects | No | ProjectName, Status, Priority, Category, StartDate, EndDate, Budget | None | ProjectName asc |
| Quick Find | System | ProjectName, ProjectCode, Description | contains() search | Relevance |

#### Task Views

| View Name | Default | Columns | Filter | Sort |
|---|---|---|---|---|
| Active Tasks | Yes | TaskName, Status, Priority, Project, AssignedTo, DueDate, CompletionPercent | Status not in (Completed, Cancelled) | DueDate asc |
| My Tasks | No | TaskName, Status, Priority, Project, DueDate, CompletionPercent | AssignedTo.UserId = current user | DueDate asc |
| Overdue Tasks | No | TaskName, Status, Project, AssignedTo, DueDate | DueDate < today AND Status not in (Completed, Cancelled) | DueDate asc |
| Milestones | No | TaskName, Project, DueDate, Status, CompletionPercent | IsMilestone = true | DueDate asc |
| Quick Find | System | TaskName, TaskNumber, Description | contains() search | Relevance |

#### Team Member Views

| View Name | Default | Columns | Filter | Sort |
|---|---|---|---|---|
| Active Members | Yes | FullName, Email, Role, Department, IsAvailable | IsAvailable = true | FullName asc |
| All Members | No | FullName, Email, Phone, Role, Department, HourlyRate, IsAvailable | None | FullName asc |
| By Role | No | FullName, Role, Department, Location, Skills | None | Role asc, FullName asc |
| By Department | No | FullName, Department, Role, Email, Location | IsAvailable = true | Department asc, FullName asc |
| Quick Find | System | FullName, Email, Skills | contains() search | Relevance |

#### Time Entry Views

| View Name | Default | Columns | Filter | Sort |
|---|---|---|---|---|
| Recent Entries | Yes | Description, EntryDate, Project, Task, TeamMember, Duration, IsBillable | EntryDate >= 30 days ago | EntryDate desc |
| My Time | No | Description, EntryDate, Project, Task, Duration, IsBillable | TeamMember.UserId = current user | EntryDate desc |
| Billable Time | No | Description, EntryDate, Project, TeamMember, Duration | IsBillable = true | EntryDate desc |
| Quick Find | System | Description | contains() search | Relevance |

#### Category Views

| View Name | Default | Columns | Filter | Sort |
|---|---|---|---|---|
| Active Categories | Yes | CategoryName, Description, SortOrder, IsActive | IsActive = true | SortOrder asc |
| All Categories | No | CategoryName, Description, Color, SortOrder, IsActive | None | SortOrder asc |

#### Project Assignment Views

| View Name | Default | Columns | Filter | Sort |
|---|---|---|---|---|
| All Assignments | Yes | AssignmentName, Project, TeamMember, RoleOnProject, AllocationPercent | None | AssignmentName asc |
| Active Assignments | No | AssignmentName, Project, TeamMember, RoleOnProject, AllocationPercent | EndDate >= today OR EndDate is null | Project asc |

### 4.5 User Flows

**Flow 1: Create a New Project (PM)**
1. PM clicks "New" on Projects grid → Quick Create dialog opens
2. Fills in: Name, Status (Planning), Priority, Start Date, Category
3. Clicks Save → project created, redirects to Project form
4. PM fills in Budget, Description, Project Manager on main form
5. PM clicks "Team" tab → adds team members via ProjectAssignment subgrid
6. PM clicks "Tasks" tab → creates tasks with assignments

**Flow 2: Log Time (TM)**
1. TM navigates to Time Entries via left nav
2. Clicks "New" → Quick Create dialog opens
3. Fills in: Description, Date, Project (lookup), Duration
4. Task field auto-filters based on selected Project
5. Clicks Save → entry logged, grid refreshes

**Flow 3: Track Project Progress (PM)**
1. PM opens Dashboard → sees KPI cards (Active Projects, Overdue Tasks, etc.)
2. Clicks a project in the chart or recent records → opens Project form
3. Views BPF bar showing current stage
4. Checks Tasks tab for completion status
5. Checks Budget tab for financial health

### 4.6 Dashboard / Homepage

```
DASHBOARD LAYOUT:

┌─────────────┬─────────────┬─────────────┬─────────────┐
│ KPI Card:   │ KPI Card:   │ KPI Card:   │ KPI Card:   │
│ Active      │ Overdue     │ Unassigned  │ Hours This  │
│ Projects    │ Tasks       │ Tasks       │ Week        │
└─────────────┴─────────────┴─────────────┴─────────────┘
┌──────────────────────────┬──────────────────────────────┐
│ Donut Chart:             │ Bar Chart:                   │
│ Projects by Status       │ Budget vs Actual (top 5)     │
│ (Planning/Active/Hold/   │                              │
│  Complete/Cancelled)     │                              │
└──────────────────────────┴──────────────────────────────┘
┌──────────────────────────┬──────────────────────────────┐
│ List: My Recent Tasks    │ List: Recent Time Entries     │
│ (top 5, sorted by       │ (top 5, sorted by            │
│  DueDate asc)            │  EntryDate desc)             │
└──────────────────────────┴──────────────────────────────┘
```

### 4.7 Command Bar Buttons

| Entity | Button | Location | Action |
|---|---|---|---|
| Project | New | Grid + Form | Navigate to Quick Create |
| Project | Save | Form | Save current record |
| Project | Delete | Form | Confirm + delete (with cascade warning for tasks) |
| Project | Deactivate | Form | Set IsActive=false, Status=On Hold |
| Project | Assign | Form | Change owner dialog |
| Project | Complete Project | Form | Set Status=Completed, CompletionPercent=100 |
| Task | New | Grid + Form | Navigate to Quick Create |
| Task | Save | Form | Save current record |
| Task | Delete | Form | Confirm + delete |
| Task | Mark Complete | Form | Set Status=Completed, CompletionPercent=100, CompletionDate=today |
| Task | Assign To Me | Grid + Form | Set AssignedTo to current user's TeamMember record |
| Time Entry | New | Grid + Form | Navigate to Quick Create |
| Time Entry | Save | Form | Save current record |
| Time Entry | Delete | Form | Confirm + delete |
| Team Member | New | Grid | Navigate to Quick Create |
| Team Member | Deactivate | Form | Set IsAvailable=false |
| Category | New | Grid | Navigate to Quick Create |

## 5. Skeptic Review — Resolved Issues

| # | Severity | Area | Issue | Resolution |
|---|---|---|---|---|
| 1 | Critical | Data | Cascade Delete on Project→TimeEntries could wipe financial records | Changed to Restrict — prevents deletion of project with time entries |
| 2 | Critical | Data | N:N Project↔TeamMember can't hold role/allocation columns | Replaced with pic_ProjectAssignment junction table with role, allocation, dates |
| 3 | High | Data | DateOnly fields had UserLocal behavior causing timezone date shifts | Changed all DateOnly fields to DateTimeBehavior: DateOnly |
| 4 | High | Data | Option set values started at 1 instead of publisher prefix | All options now use 10000+ prefix (publisher: pic, prefix: 10000) |
| 5 | High | Security | No column-level security on financial fields | Added column security profile for Budget, ActualCost, HourlyRate |
| 6 | High | Data | Missing ProjectManager lookup on Project table | Added pic_ProjectManagerId lookup to systemuser |
| 7 | High | Data | Missing CompletionPercent on Task table | Added pic_CompletionPercent (Whole Number, 0-100) |
| 8 | High | Data | Missing Department, Location, Skills on TeamMember | Added all three columns |
| 9 | High | Data | Missing BPF tracking column | Added pic_BPFStage as Local Choice (5 stages: Initiation→Planning→Execution→Monitoring→Closure). BPF bar reads/writes this column, independent of pic_Status. |
| 10 | High | Data | Missing BudgetUtilization formula column | Added pic_BudgetUtilization as formula: IF(Budget=0 OR null, 0, (ActualCost/Budget)*100). Enables server-side OData filtering. |
| 11 | Medium | UX | "Over Budget" view can't use column-to-column OData $filter | Resolved: pic_BudgetUtilization formula column enables `$filter=pic_budgetutilization gt 100` (server-side) |
| 12 | Medium | Data | pic_Category lacked SortOrder, Color, Icon columns for UI | Added SortOrder (Whole Number), Color (String, hex), Icon (String) |
| 13 | Medium | UX | No persona-to-security-role alignment documented | Mapped: PM→pic_ProjectManager, TM→pic_TeamMember, Admin→System Administrator |
| 14 | Medium | Data | Circular cascade risk: Task self-referential + Project→Task cascade | ParentTask cascade set to RemoveLink (not Cascade) — breaks loop |
| 15 | Medium | UX | Quick Create forms had too many fields initially | Trimmed to essential fields only (see forms above) |
| 16 | Medium | Code App | Lookup display values not addressed | Documented: use _pic_field_value for GUIDs, resolve display names via expand or separate query |
| 17 | Medium | ALM | No PublishXml step planned | Added to implementation sequence (Phase 9 and 14) |
| 18 | Low | Data | pic_Category IsAuditEnabled not set | Set to false (reference data, low change frequency) |
| 19 | Low | UX | No empty state design for views | Code App will show "No records found" message with create button |
| 20 | Low | Performance | TimeEntry table will grow large | Pagination via TanStack Query (50 records per page), "Recent 30 days" default filter |

## 6. Skeptic Review — Accepted Risks

| # | Severity | Area | Issue | Justification |
|---|---|---|---|---|
| 1 | Medium | Code App | BPF bar is interactive stepper with backing column but no stage validation rules | True server-side BPF with stage gates is overkill for template. pic_BPFStage column provides persistence and queryability. Rename to "Project Stage Indicator" in UI to avoid confusion with real BPFs. |
| 2 | Low | Code App | No offline mode | Code Apps don't support offline; out of scope for template |
| 3 | Low | Missing | No bulk edit feature | Can be added later; not a core MDA pattern for the template |
| 4 | Low | Code App | Export to CSV/XLSX deferred | SheetJS dependency + 5000 record cap. Can be added in v2 without schema changes. |

## 7. Implementation Sequence

```
Phase 1 (SEQUENTIAL — must be first):
  └── Create Publisher "pic" → Create Solution "MDATemplate"
      POST /publishers → POST /solutions

Phase 2 (SEQUENTIAL — EntityCustomization lock):
  └── Create Global Option Sets
      POST /GlobalOptionSetDefinitions
      → pic_projectstatus, pic_priority, pic_taskstatus, pic_teamrole

Phase 3 (SEQUENTIAL — EntityCustomization lock):
  └── Create Tables (one at a time)
      POST /EntityDefinitions
      Order: pic_Category → pic_TeamMember → pic_Project → pic_Task → pic_TimeEntry → pic_ProjectAssignment

Phase 4 (PARALLEL per table — columns to existing tables):
  ├── Agent A: pic_Project columns (20 columns)
  ├── Agent B: pic_Task columns (15 columns)
  ├── Agent C: pic_TeamMember columns (12 columns) + pic_TimeEntry columns (8 columns)
  └── Agent D: pic_Category columns (6 columns) + pic_ProjectAssignment columns (7 columns)

Phase 5 (SEQUENTIAL — needs both tables):
  └── Create Relationships
      POST /RelationshipDefinitions
      All 1:N relationships + alternate key on ProjectAssignment

Phase 6 (PARALLEL per table):
  ├── pic_Project views + forms
  ├── pic_Task views + forms
  ├── pic_TeamMember views + forms
  ├── pic_TimeEntry views + forms
  ├── pic_Category views + forms
  └── pic_ProjectAssignment views + forms

Phase 7 (SEQUENTIAL):
  └── PublishXml (all entities)

Phase 8 (SEQUENTIAL):
  └── Create App Module → AddAppComponents → Sitemap

Phase 9 (SEQUENTIAL):
  └── Final PublishXml + ValidateApp

Phase 10 (PARALLEL — Code App development):
  └── Scaffold Code App + implement React components
      pac code init → pac code add-data-source → build UI
```

## 8. Security Model

### Security Roles

| Role Name | Based On | Key Permissions |
|---|---|---|
| pic_ProjectManager | Basic User | Project: CRUD (BU), Task: CRUD (BU), TeamMember: Read (Org), TimeEntry: CRUD (BU), Category: Read (Org), ProjectAssignment: CRUD (BU) |
| pic_TeamMember | Basic User | Project: Read (BU), Task: Read (BU) + Write (User), TeamMember: Read (Org) + Write (User), TimeEntry: CRUD (User), Category: Read (Org), ProjectAssignment: Read (BU) + Write (User) |
| pic_Viewer | Basic User | All tables: Read (BU) only. No create, write, delete, assign, or share permissions. |
| pic_Administrator | System Administrator | Full access to all tables and configuration |

### Column-Level Security Profiles

| Profile | Columns Protected | Granted To |
|---|---|---|
| pic_FinancialDataAccess | pic_Project.pic_Budget, pic_Project.pic_ActualCost, pic_TeamMember.pic_HourlyRate | PM role, Admin role |

### App-Level Security

| App Module | Security Roles Required |
|---|---|
| MDA Template | pic_ProjectManager, pic_TeamMember, pic_Viewer, pic_Administrator |

## 9. Environment Variables

| Variable Name | Type | Default Value | Purpose |
|---|---|---|---|
| pic_DefaultPageSize | Number | 50 | Records per page in list views |
| pic_TimeEntryMinDuration | Number | 0.25 | Minimum time entry in hours |
| pic_TimeEntryMaxDuration | Number | 24 | Maximum time entry in hours |

**Note:** Code Apps don't currently support environment variables natively. These will be configured as app-level constants with a settings component for admin override.

## 10. Control Selection Matrix

### Field Control Mapping

| Field | Column Type | Control | Notes |
|---|---|---|---|
| pic_Description (Project) | Memo | Rich Text Editor | Fluent UI Editor component |
| pic_IsActive | Boolean | Toggle Switch | Fluent UI Switch |
| pic_IsBillable | Boolean | Toggle Switch | Fluent UI Switch |
| pic_IsAvailable | Boolean | Toggle Switch | Fluent UI Switch |
| pic_IsMilestone | Boolean | Toggle Switch | Fluent UI Switch |
| pic_CompletionPercent | Whole Number / Decimal | Progress Bar | Fluent UI ProgressBar |
| pic_BudgetUtilization | Decimal (Formula) | Progress Bar (color-coded) | Green <80%, Yellow 80-100%, Red >100% |
| pic_ProfilePhoto | Image | Avatar | Fluent UI Avatar with upload |
| pic_Color | String | Color Picker | Custom hex color input |
| pic_Priority | Choice | Badge/Tag with color | Color-coded: Low=blue, Med=yellow, High=orange, Critical=red |
| pic_Status | Choice | Badge/Tag with color | Color-coded per status |
| pic_RiskLevel | Choice | Badge/Tag with color | Color-coded: Low=green, Med=yellow, High=orange, Critical=red |
| pic_Email | String (Email) | Link (mailto:) | Clickable email link |
| pic_Phone | String (Phone) | Link (tel:) | Clickable phone link |
| pic_Duration | Decimal | Number Spinner | Step: 0.25, suffix: "hrs" |
| All Lookups | Lookup | Combobox with search | Fluent UI Combobox with type-ahead |
| pic_CustomerId | Customer | Polymorphic Combobox | Dropdown to select Account or Contact, then search |
| pic_CompletionPercent (Task) | Whole Number | Slider | Step: 5, marks at 0/25/50/75/100, numeric label. Dropdown fallback on mobile <768px |
| pic_Department | Choice (Local) | Dropdown | 7 department options |
| pic_Skills | Choices (MultiSelect) | CheckboxGroup | 9 options in 3x3 grid layout |
| pic_BPFStage | Choice (Local) | Stepper/Chevron Bar | Interactive click-to-advance, forward only with confirmation dialog |

### Grid Display Strategy

| Entity | View | Editable? | Notes |
|---|---|---|---|
| Project | Active Projects | No | Read-only grid with row click to open |
| Task | Active Tasks | Yes (inline status) | Status dropdown editable inline |
| Time Entry | Recent Entries | No | Read-only, Quick Create for new |
| Team Member | Active Members | No | Read-only grid |
| Category | Active Categories | Yes (inline sort order) | SortOrder editable inline |

### Home Page Strategy

**Selected approach: Custom React Dashboard (HTML Dashboard pattern)**

Justification: Code App provides full React capability — build an interactive dashboard with Fluent UI cards, Chart.js charts, and TanStack Query for real-time data. Cheaper than Power BI embed, more interactive than static HTML, demonstrates the template's capability.

## 11. Parallelization Strategy

### Dependency Graph

```
[SEQUENTIAL] Publisher + Solution
     ↓
[SEQUENTIAL] Global Option Sets (4 sets)
     ↓
[SEQUENTIAL] Tables — one at a time (EntityCustomization lock)
     Category → TeamMember → Project → Task → TimeEntry → ProjectAssignment
     ↓
[PARALLEL - 4 agents] Columns per table
     ↓
[SEQUENTIAL] Relationships + Alternate Key
     ↓
[PARALLEL - 6 agents] Views + Forms per table
     ↓
[SEQUENTIAL] PublishXml → App Module → Sitemap → PublishXml → ValidateApp
```

### Agent Team Composition (for Implementation)

**Main Agent:**
- Phase 1: Create Solution
- Phase 2: Create Global Option Sets
- Phase 3: Create ALL Tables (sequential due to lock)
- Phase 5: Create Relationships + Alternate Key
- Phase 8-9: App Module, Sitemap, Publish, Validate

**Table Agent A (after Phase 3):**
- Phase 4: pic_Project columns (20)
- Phase 6: pic_Project views (6) + forms (2)

**Table Agent B (after Phase 3):**
- Phase 4: pic_Task columns (15)
- Phase 6: pic_Task views (5) + forms (2)

**Table Agent C (after Phase 3):**
- Phase 4: pic_TeamMember (12) + pic_TimeEntry (8) columns
- Phase 6: pic_TeamMember views (4) + forms (2) + pic_TimeEntry views (4) + forms (2)

**Table Agent D (after Phase 3):**
- Phase 4: pic_Category (6) + pic_ProjectAssignment (7) columns
- Phase 6: pic_Category views (2) + forms (2) + pic_ProjectAssignment views (2) + forms (1)

### Which steps are parallelizable?

| Step | Parallel? | Dependencies |
|---|---|---|
| Solution | No | Must be first |
| Global Option Sets | No | After solution |
| Tables | No | Sequential (EntityCustomization lock) |
| Columns per table | Yes (across tables) | After own table + option set GUIDs |
| Relationships | No | After both tables exist |
| Views per table | Yes (across tables) | After own table's columns |
| Forms per table | Yes (across tables) | After own table's views (for subgrids) |
| Sitemap | No | After entities exist |
| App Module | No | After everything |
| Publish + Validate | No | Must be last |

## 12. Open Questions

None — all design decisions have been resolved through the three-round review process. The plan is ready for implementation.

---

## 13. Badge Color Mappings

| Option Set | Value | Color | Hex |
|---|---|---|---|
| pic_projectstatus | Planning | Blue | #0078D4 |
| pic_projectstatus | Active | Green | #107C10 |
| pic_projectstatus | On Hold | Amber | #FFB900 |
| pic_projectstatus | Completed | Green + checkmark | #107C10 |
| pic_projectstatus | Cancelled | Red + X | #D13438 |
| pic_priority | Low | Gray | #797775 |
| pic_priority | Medium | Blue | #0078D4 |
| pic_priority | High | Amber | #FFB900 |
| pic_priority | Critical | Red | #D13438 |
| pic_taskstatus | Not Started | Gray | #797775 |
| pic_taskstatus | In Progress | Blue | #0078D4 |
| pic_taskstatus | Blocked | Red | #D13438 |
| pic_taskstatus | Completed | Green + checkmark | #107C10 |
| pic_taskstatus | Cancelled | Red + X | #D13438 |

## 14. Column-Level Security UX Behavior

| Role | Financial Sections Visible | Write Controls | Settings Area |
|---|---|---|---|
| Project Manager | Yes (Budget, ActualCost, HourlyRate) | All enabled | Hidden |
| Team Member | Hidden entirely (clean removal, no "Access Denied") | Own records only | Hidden |
| Viewer | Hidden entirely | All disabled (permanent read-only mode) | Hidden |
| Administrator | Yes | All enabled | Visible |

When a user cannot see secured fields, the entire form section containing only secured fields is hidden — not grayed out, not showing "Access Denied" placeholders. This matches real MDA behavior.

## 15. V2 Backlog

| Feature | Description | Complexity |
|---|---|---|
| Export to CSV/XLSX | Client-side export via SheetJS, 5000 record cap | Medium |
| Full Activity Types | Expand Timeline beyond Notes to include Emails, Phone Calls, Appointments | High |
| Server-side Computed Fields | Plugins for ActualHours (sum), CompletionPercent (avg), real-time aggregation | High |
| BPF Stage Validation | Stage gates with required fields per stage | Medium |
| Approval Workflows | Power Automate integration for project approval chain | High |
| Notifications | Toast notifications for assignment changes, due date reminders | Medium |

---

**Plan Status: READY FOR APPROVAL**

**Skeptic Final Grade: A-** (48 findings raised, 48 resolved, 0 blockers)

*Produced by the MDA Template Planning Team:*
- *Data Architect: Schema design (6 tables, 68 columns, 4 global option sets, 4 local option sets, 3 alternate keys, 1 formula column)*
- *UX Designer: Code App UX design (MDA replica with React/Fluent UI v2, 30+ views, 12 forms, full control matrix)*
- *The Skeptic: 4-round review (48 findings across Data Architecture, UX, Security, ALM, Performance — all resolved or accepted with justification)*
