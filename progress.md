# MDA Parity Progress Log

---

## Iteration 1 — 2026-02-09T10:00:00Z

### Phase: DIFF (Initial Gap Discovery)

Opened both apps side-by-side at 1657x741 resolution:
- **MDA** (tab 633386620): Projects > Active Projects view
- **Code App** (tab 633386621): Projects list view

### Findings Summary

Identified **12 gaps** across categories.

### Gaps Fixed This Iteration

**GAP-001: Grid columns mismatch** (view-grid, severity 2) — **DONE**
- Before: Code App showed Project Name, Code, Status, Priority, Manager, Start Date, Progress
- After: Code App shows Project Name, Status, Priority, Start Date, End Date, Budget, Project Manager
- Matches MDA Active Projects view exactly
- Files changed: `code-app/src/pages/ProjectList.tsx` (COLUMNS array + select fields + orderBy)

**GAP-004: Left nav styling** (styling, severity 6) — **DONE**
- Before: Gray #F0F0F0 background, UPPERCASE group headers
- After: White #FFFFFF background, Title Case group headers (Management, Tracking)
- Files changed: `code-app/src/components/layout/LeftNav.tsx` (NAV_BG, removed textTransform)

**GAP-005: Grid header styling** (styling, severity 6) — **DONE**
- Before: fontWeight 600 headers, borderRight dividers between columns
- After: fontWeight 400, no borderRight
- Files changed: `code-app/src/components/views/EntityListView.tsx`

**GAP-006: Card shadows on command bar & grid** (styling, severity 6) — **DONE**
- Before: Both had boxShadow, borderRadius 4px, margin
- After: Flat toolbar with borderBottom, flat grid, no shadows/radius/margin
- Files changed: `code-app/src/components/common/EntityCommandBar.tsx`, `code-app/src/components/views/EntityListView.tsx`

**GAP-009: Content area background** (styling, severity 6) — **DONE**
- Before: #FAFAFA gray background
- After: #FFFFFF white background
- Files changed: `code-app/src/components/layout/AppShell.tsx`

### Deploy + Smoke Test

- **Deploy**: SUCCESS via `pac code push -s "MDA Template"`
- **Smoke test**: PASS
  - App loaded successfully at Code App URL
  - Navigated to Dashboard, then to Projects list
  - Columns display correctly: Project Name, Status, Priority, Start Date, End Date, Budget, Project Manager
  - Left nav shows white background with Title Case group headers
  - Command bar is flat (no shadow)
  - Grid is flat (no shadow)
  - Content background is white
  - No console errors

### Verification (Code App vs MDA)

Side-by-side zoomed comparison of column headers confirms:
- MDA: Project Name, Status, Priority, Start Date ↓, End Date, Budget, Project Manager
- Code App: Project Name, Status, Priority, Start Date, End Date, Budget, Project Manager
- Match confirmed

### Additional Discovery

Verified GAP-010 by clicking +New in MDA:
- MDA opens **full record form** (not quick create)
- Form has tabs: General, Budget, Tasks, Team
- Command bar: Back, Open New Window, Save, Save & Close, +New, Flow

### Next Candidates (by priority)

1. **GAP-010** (crud, severity 1): New button should navigate to full form, not quick create
2. **GAP-003** (navigation, severity 2): Remove Dashboard nav item (not in MDA)
3. **GAP-007** (view-grid, severity 2): Add row checkbox selection
4. **GAP-002** (command-bar, severity 3): Add Excel Templates + Export to Excel buttons
5. **GAP-011** (command-bar, severity 3): Add dropdown chevron to Delete button

### Score

- Gaps found: 12
- Gaps fixed: 5 (GAP-001, GAP-004, GAP-005, GAP-006, GAP-009)
- Gaps won't-fix: 1 (GAP-008 - host header)
- Gaps remaining: 6

