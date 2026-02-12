# Project Instructions

## Available Skills (load automatically)

You have 8 domain skills in `.claude/skills/`. Use them based on the task:

| Skill | When to Use |
|---|---|
| `plan-with-team` | Planning/architecting any Power Platform app. Spawn an Agent Team with Data Architect, UX Designer, and The Skeptic. |
| `dataverse-web-api` | Creating Dataverse schema (tables, columns, relationships, views, forms) via the Web API. |
| `power-apps-code-apps` | Building Code App frontends with React/Vue/TS using the @microsoft/power-apps SDK. |
| `visual-qa` | Testing any web app visually — record actions, caption expected behavior, review with Gemini. |
| `code-review` | Deep code audit — finds dead wiring, silent failures, placeholders, bloated files, dead code. Produces graded report with pruning plan. |
| `dataverse-web-resources` | Creating, deploying, and managing web resources (JS form scripts, HTML dashboards, images). |
| `dataverse-plugins` | Developing and deploying C# Dataverse plugins for server-side business logic. |
| `pcf-controls` | Building, deploying, and using PowerApps Component Framework (PCF) controls — field controls, dataset controls, React virtual controls. |

## Standard Workflow

When building a new app, follow this sequence:

1. **Plan** — Use `plan-with-team` to spawn an Agent Team. The three specialists debate and produce a consolidated plan. Get user approval before proceeding.
2. **Build Schema** — Use `dataverse-web-api` to create the Dataverse tables, columns, relationships, option sets, forms, views, and app module.
3. **Build Frontend** — Use `power-apps-code-apps` to scaffold and build the Code App frontend if needed.
4. **Review** — Use `code-review` to audit the codebase for dead wiring, missing error handling, placeholders, bloat, and dead code. Fix all CRITICAL findings before testing.
5. **Test** — Use `visual-qa` to walk through the app, record with captions, and optionally send to Gemini for AI review.

## Rules

- Always use Agent Teams for planning if `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is enabled.
- Always include the `MSCRM.SolutionUniqueName` header when creating Dataverse components.
- Never write authentication code in Code Apps — the host manages auth.
- Use `@microsoft/power-apps` SDK v1.0.3+ (not v1.0.0). Do NOT call `initialize()`.
- After creating forms/views/sitemaps, always call `PublishXml`.
- When testing, run the edge case checklist from `visual-qa` — don't just test the happy path.
- When designing forms, always consult `dataverse-web-resources/resources/ux-decision-guide.md` to choose appropriate controls rather than defaulting to basic field types.
- For any field that could benefit from enhanced UX (ratings, toggles, rich text, address, maps), use the advanced control — not the default.
- Always plan a homepage strategy — consider Code App, HTML dashboard, or Power BI embed rather than defaulting to a blank MDA dashboard.
- Some Dataverse design decisions are PERMANENT (data types, table names, ownership type). Always consult `dataverse-web-api/resources/dataverse-design-rules.md` before designing tables.
- Always define a security model during planning. Copy Basic User role as a starting point — never build security roles from scratch.
- Use environment variables for any configuration that differs across environments. Never hardcode API URLs, feature flags, or connection references.
- When registering plugins on Update events, ALWAYS define filtering attributes to avoid triggering on autosave.
- Always plan testing strategy: use Power Apps Monitor for debugging, Application Insights for production telemetry, and PAD for automated MDA UI testing.

## Best Practices

- **No placeholder columns** — Never create empty columns "to be configured later." Use formula columns, plugins, or code instead.
- **No rollup fields** — Rollup field configuration via API is unreliable. Prefer code-based aggregation (query + compute + update) or server-side plugins.
- **Formula columns** — Use for simple calculations (concatenation, date math, basic arithmetic). Create via `FormulaDefinition` property on column metadata.
- **NO parallel table creation** — Dataverse takes an environment-wide `EntityCustomization` lock. Create all tables sequentially. Column additions to existing tables, views, and forms CAN be parallelized.
- **PowerShell only** — On Windows, always use `.ps1` scripts for Dataverse API calls. Bash/curl mangles OData `$` parameters.
- **Security model** — Plan security roles, column-level security, and app-level security during the design phase, not as an afterthought. See `dataverse-web-api/resources/security-model.md`.
- **Environment variables** — Use for all environment-specific configuration. See `dataverse-web-api/resources/environment-variables.md`.
- **Testing** — Use Monitor + Application Insights + PAD for comprehensive MDA testing. See `dataverse-web-api/resources/testing-monitoring.md`.
- **Custom APIs** — Prefer Custom APIs over Custom Actions for new development. See `dataverse-web-api/resources/custom-apis.md`.
- **Primary name column** — Every Dataverse POST must include the primary name column (and it's NOT always `prefix_name` — inspect metadata first).
- **Never silently swallow errors** — At minimum `console.error`, ideally show user feedback. Silent catch blocks hide real issues.
- **Dataverse POST returns 204** — A null return from POST means success (record created), not failure. Only exceptions mean failure. Use `Prefer: return=representation` to get the created record back.
- **Lookup @odata.bind is lowercase** — Navigation property names for `@odata.bind` must use the column logical name (lowercase), not the SchemaName.
- **GlobalOptionSet binding requires GUID** — Look up MetadataId first, cannot use `Name=` syntax.
- **Web resource Xrm fallback** — `Xrm` is not available in web resources loaded via sitemap. Use `parent.Xrm` or WhoAmI API fallback.
- **Code Apps cannot embed in MDAs** — Use web resources (vite-plugin-singlefile) for React apps inside an MDA. Code Apps are standalone only.
- **Code Apps require env admin enablement** — `pac code push` fails until an admin enables Code App operations in the environment.
- **Audit frontend-backend wiring** — Every service function needs a caller, every store action needs UI, every feature needs gameplay logic.

## Dataverse API Authentication

Before making any Dataverse Web API calls:

1. Run `pac auth list` to check if already connected.
2. If not connected, run `pac auth create --environment <org-url>` and follow the prompts.
3. For every API call, get a fresh token via Azure CLI:
   ```powershell
   $token = az account get-access-token --resource "https://[org].crm6.dynamics.com/" --tenant "[tenant-id]" --query accessToken -o tsv
   ```
4. Use the token as `Authorization: Bearer <token>` in all HTTP requests.

Tokens expire after ~1 hour. If a call returns 401, get a fresh token and retry.

**IMPORTANT:** On Windows, always use PowerShell `.ps1` scripts for Dataverse API calls. Bash/curl mangles OData `$` parameters (`$filter`, `$select`, etc.).

Example (PowerShell):
```powershell
$token = az account get-access-token --resource "https://org.crm6.dynamics.com/" --tenant "your-tenant-id" --query accessToken -o tsv
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json; charset=utf-8"
    "OData-Version" = "4.0"
    "MSCRM.SolutionUniqueName" = "MySolution"
}
Invoke-RestMethod -Uri "https://org.crm6.dynamics.com/api/data/v9.2/EntityDefinitions" -Method POST -Headers $headers -Body ($payload | ConvertTo-Json -Depth 10)
```

## Environment

- Platform: Windows
- Agent Teams are enabled (experimental)
- Claude in Chrome is available for browser automation and visual testing
- Auth via `pac auth` CLI (not MCP server)
