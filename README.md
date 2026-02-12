# MDA Template — Power Apps Code App

A standalone React Code App that replicates the full **Model-Driven App (MDA)** experience on the Power Platform. Built as a reusable template demonstrating all major MDA UI patterns powered by Dataverse.

Built entirely with [Claude Code](https://claude.ai/claude-code) using the [Power Platform Skills for Claude Code](https://github.com/DanielKerridge/claude-code-power-platform-skills).

## What It Does

This app implements a **Project Management** domain to showcase diverse Dataverse column types, relationships, and real business workflows. The entire MDA chrome (navigation, grids, forms, command bars, etc.) is rebuilt in React because Code Apps cannot be embedded inside MDAs (CSP blocks iframing).

### Features

- **Entity Grids** — Sortable, filterable data grids with column resizing, edit columns, view selector, search, export to Excel, chart panel
- **Record Forms** — Full CRUD forms with section cards, underline inputs, horizontal labels, lookup modals, form dirty tracking
- **Business Process Flow** — Visual BPF bar with stage progression and progress indicator
- **SubGrids** — Related record grids embedded in form tabs (e.g., Tasks on a Project)
- **Timeline** — Notes and attachments with create/edit/delete, file upload/download
- **Command Bar** — Context-aware toolbar with New, Delete, Activate/Deactivate, Assign, Export, Email a Link, Run Report
- **Left Navigation** — Collapsible sidebar with grouped nav items matching MDA sitemap structure
- **Global Search** — Cross-entity search modal
- **Record Set Navigator** — Browse through records without returning to the grid
- **Bulk Operations** — Multi-select rows for bulk edit, delete, assign

### Data Model

6 Dataverse tables with the `pic_` publisher prefix:

| Table | Columns | Purpose |
|---|---|---|
| Project | 20 | Core entity — name, status, priority, budget, dates, manager |
| Task | 15 | Work items linked to projects — status, priority, assignee, % complete |
| Team Member | 12 | People — name, role, email, department, availability |
| Time Entry | 8 | Hours logged against projects — date, duration, category, description |
| Category | 6 | Hierarchical classification — parent/child categories |
| Project Assignment | 7 | Junction table — team member to project with role and allocation % |

Plus 4 global option sets, 4 local option sets, 1 formula column, and 3 alternate keys.

## Tech Stack

- **React 18** + TypeScript
- **Fluent UI v2** (`@fluentui/react-components`)
- **React Router v6** (HashRouter)
- **TanStack Query v5** (data fetching/caching)
- **Zustand** (state management)
- **Chart.js** (grid chart panel)
- **@microsoft/power-apps SDK** (Dataverse data access)
- **Vite** (build tooling)

## Quick Start

### Option A: Deploy the Template As-Is

Use this if you want to run the Project Management template in your own environment.

1. **Import the Dataverse schema**
   - Go to [Power Apps Maker Portal](https://make.powerapps.com/) > your environment > Solutions > Import
   - Upload `solutions/MDATemplate_1_0_0_3.zip`
   - Follow the import wizard and publish all customizations

2. **Clone and install**
   ```bash
   git clone https://github.com/DanielKerridge/MDATemplate-PowerPlatform.git
   cd MDATemplate-PowerPlatform/code-app
   npm install
   ```

3. **Configure environment**
   ```bash
   cp power.config.json.example power.config.json
   ```
   Edit `power.config.json` — replace `YOUR_APP_ID` and `YOUR_ENVIRONMENT_ID` with your values from the Power Apps maker portal.

4. **Authenticate and initialize**
   ```bash
   pac auth create --environment https://yourorg.crm.dynamics.com/
   pac code init -n "MDA Template" -env YOUR_ENVIRONMENT_ID
   ```

5. **Generate data source schemas**
   ```bash
   pac code add-datasource --name projects --table pic_project
   pac code add-datasource --name tasks --table pic_task
   pac code add-datasource --name teammembers --table pic_teammember
   pac code add-datasource --name timeentries --table pic_timeentry
   pac code add-datasource --name categories --table pic_category
   pac code add-datasource --name projectassignments --table pic_projectassignment
   ```

6. **Run locally**
   ```bash
   npm run dev
   ```

7. **Deploy to Power Platform**
   ```powershell
   .\scripts\deploy.ps1 -Environment "https://yourorg.crm.dynamics.com/"
   ```

### Option B: Build Your Own MDA with Claude Code

Use the [Power Platform Skills for Claude Code](https://github.com/DanielKerridge/claude-code-power-platform-skills) to build a completely new MDA from scratch. The skills provide Claude Code with deep Power Platform knowledge to:

1. **Plan** your app with an Agent Team (Data Architect + UX Designer + Skeptic)
2. **Build the Dataverse schema** (tables, columns, relationships, views, forms) via the Web API
3. **Build the React frontend** using the @microsoft/power-apps SDK
4. **Review** the code for dead wiring, missing features, and security issues
5. **Test** visually with AI-powered screenshot comparison

This template was built entirely using those skills — you can use them to build anything from a simple CRUD app to a full enterprise solution.

## Project Structure

```
MDATemplate-PowerPlatform/
  code-app/
    src/
      components/
        common/       # Shared UI — CommandBar, BPFBar, SubGrid, Timeline, etc.
        forms/        # Form components — RecordForm, FormField, FormSection
        layout/       # AppShell, LeftNav, Header
        views/        # EntityListView (grid component)
      config/         # Navigation config, constants
      generated/      # Auto-generated Dataverse models & services
      hooks/          # Custom hooks — useEntityActions, useFormDirtyTracking
      pages/          # Page components — ProjectList, ProjectForm, TaskList, etc.
      store/          # Zustand stores
      styles/         # Global styles
      App.tsx         # Root component with routes
      main.tsx        # Entry point
    power.config.json.example   # Template for environment config
    package.json
    vite.config.ts
    tsconfig.json
  solutions/          # Dataverse solution export (import into your environment)
  docs/               # Implementation plan with full schema specification
  scripts/            # Deploy script
  CLAUDE.md           # Claude Code project instructions
```

## Adapting for Your Own Domain

To adapt this template for a different domain (e.g., CRM, HR, Asset Management):

1. **Design your schema** — Edit `docs/implementation-plan.md` with your tables, columns, and relationships
2. **Create a new Dataverse solution** — Use the maker portal or the `dataverse-web-api` skill
3. **Update `code-app/src/config/`** — Change navigation items and constants to match your entities
4. **Update page components** — Copy and modify the existing List/Form pages for your new entities
5. **Update `power.config.json`** — Add your tables to `databaseReferences`
6. **Generate new services** — Run `pac code add-datasource` for each table
7. **Deploy** — `npm run build` and `pac code push`

Or just point Claude Code at this repo with the [Power Platform Skills](https://github.com/DanielKerridge/claude-code-power-platform-skills) installed and ask it to build what you need.

## License

MIT
