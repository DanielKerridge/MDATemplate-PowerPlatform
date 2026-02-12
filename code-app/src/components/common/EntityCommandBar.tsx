import { useNavigate } from "react-router-dom";
import { makeStyles } from "@fluentui/react-components";
import {
  ArrowLeftRegular,
  DeleteRegular,
  ArrowSyncRegular,
  ShareRegular,
  DataBarVerticalRegular,
  SparkleRegular,
  MailRegular,
  PlayRegular,
  OpenRegular,
  DocumentRegular,
  EditRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  PersonRegular,
  ArrowDownloadRegular,
  ArrowUploadRegular,
  DocumentTableRegular,
  ShieldCheckmarkRegular,
  ListRegular,
} from "@fluentui/react-icons";
import { CommandBarButton } from "./CommandBarButton";
import { CommandBarMenuButton } from "./CommandBarMenuButton";
import type { MenuItemDef } from "./CommandBarMenuButton";
import { CommandBarOverflowMenu } from "./CommandBarOverflowMenu";

export interface CommandBarAction {
  key: string;
  label: string;
  icon: React.ComponentType;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  danger?: boolean;
  hasDropdown?: boolean;
  tooltip?: string;
}

interface EntityCommandBarProps {
  actions: CommandBarAction[];
  onRefresh?: () => void;
  onBack?: () => void;
  onDelete?: () => void;
  onShowChart?: () => void;
  onEmailLink?: () => void;
  onFlow?: () => void;
  onShare?: () => void;
  onExportExcel?: () => void;
  onOpenNewWindow?: () => void;
  chartActive?: boolean;
  /** Show standard MDA decorative actions (default: true) */
  showMDAActions?: boolean;
  /** Items for the Delete dropdown menu in list view */
  deleteMenuItems?: MenuItemDef[];
  /** Number of selected rows — changes command bar to selection mode */
  selectedCount?: number;
  /** Called when Edit is clicked (selection mode) */
  onEdit?: () => void;
  /** Called when Activate is clicked (selection mode) */
  onActivate?: () => void;
  /** Called when Deactivate is clicked (selection mode) */
  onDeactivate?: () => void;
  /** Called when Assign is clicked (selection mode) */
  onAssign?: () => void;
  /** Called when a report is clicked */
  onRunReport?: () => void;
  /** Record set navigator toggle (form mode) */
  onToggleRecordSet?: () => void;
  /** Whether record set panel is currently open */
  recordSetOpen?: boolean;
  /** Record set info text, e.g. "1 of 6" */
  recordSetInfo?: string;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    height: "44px",
    padding: "0 4px",
    backgroundColor: "#FFFFFF",
    flexShrink: 0,
    borderRadius: "4px",
    margin: "8px 0 4px",
    boxShadow: "rgba(0,0,0,0.12) 0 0 2px 0, rgba(0,0,0,0.14) 0 2px 4px 0",
  },
  divider: {
    width: "1px",
    height: "20px",
    backgroundColor: "#d2d0ce",
    margin: "0 2px",
    flexShrink: 0,
  },
});

export function EntityCommandBar({
  actions,
  onRefresh,
  onBack,
  onDelete,
  onShowChart,
  onEmailLink,
  onFlow,
  onShare,
  onExportExcel,
  onOpenNewWindow,
  chartActive,
  showMDAActions = true,
  deleteMenuItems,
  selectedCount = 0,
  onEdit,
  onActivate,
  onDeactivate,
  onAssign,
  onRunReport,
  onToggleRecordSet,
  recordSetOpen,
  recordSetInfo,
}: EntityCommandBarProps) {
  const styles = useStyles();
  const navigate = useNavigate();

  const handleBack = onBack ?? (() => navigate(-1));
  const hasSelection = selectedCount > 0;

  return (
    <div className={styles.root} role="toolbar" data-print-hide>
      {/* Back */}
      <CommandBarButton icon={ArrowLeftRegular} label="" onClick={handleBack} />

      {/* Open in new window — form-level only */}
      {!showMDAActions && (
        <CommandBarButton
          icon={OpenRegular}
          label=""
          onClick={onOpenNewWindow ?? (() => window.open(window.location.href, "_blank"))}
        />
      )}

      {/* Record set navigator icon — form-level only */}
      {!showMDAActions && onToggleRecordSet && (
        <CommandBarButton
          icon={ListRegular}
          label=""
          onClick={onToggleRecordSet}
          active={recordSetOpen}
          tooltip={recordSetInfo ? `Record ${recordSetInfo}` : "Open record set navigator"}
        />
      )}

      <div className={styles.divider} />

      {/* Show Chart — list view, both modes */}
      {showMDAActions && (
        <CommandBarButton
          icon={DataBarVerticalRegular}
          label="Show Chart"
          onClick={onShowChart}
          active={chartActive}
        />
      )}

      {/* === SELECTION MODE === */}
      {showMDAActions && hasSelection ? (
        <>
          <CommandBarButton
            icon={EditRegular}
            label="Edit"
            onClick={onEdit}
          />
          <CommandBarButton
            icon={CheckmarkCircleRegular}
            label="Activate"
            onClick={onActivate}
          />
          <CommandBarButton
            icon={DismissCircleRegular}
            label="Deactivate"
            onClick={onDeactivate}
          />

          {/* Delete */}
          {deleteMenuItems && deleteMenuItems.length > 0 ? (
            <CommandBarMenuButton
              icon={DeleteRegular}
              label="Delete"
              items={deleteMenuItems}
            />
          ) : (
            <CommandBarButton
              icon={DeleteRegular}
              label="Delete"
              onClick={onDelete}
              hasDropdown
            />
          )}

          <CommandBarButton
            icon={PersonRegular}
            label="Assign"
            onClick={onAssign}
          />
          <CommandBarButton
            icon={ShareRegular}
            label="Share"
            onClick={onShare}
          />

          <CommandBarMenuButton
            icon={MailRegular}
            label="Email a Link"
            items={[
              {
                key: "email-link",
                label: "Email a Link",
                icon: MailRegular,
                onClick: () => onEmailLink?.(),
              },
            ]}
          />
          <CommandBarMenuButton
            icon={PlayRegular}
            label="Flow"
            items={[
              {
                key: "see-flows",
                label: "See your flows",
                onClick: () => onFlow?.(),
              },
              {
                key: "create-flow",
                label: "Create a flow",
                onClick: () => onFlow?.(),
              },
            ]}
          />
          <CommandBarMenuButton
            icon={DocumentRegular}
            label="Run Report"
            items={[
              { key: "report-wizard", label: "Report Wizard", onClick: onRunReport ?? (() => {})},
              { key: "report-summary", label: "Project Summary", onClick: onRunReport ?? (() => {})},
              { key: "report-created", label: "Record Created/Modified", onClick: onRunReport ?? (() => {})},
            ]}
          />
          <CommandBarMenuButton
            icon={DocumentTableRegular}
            label="Word Templates"
            items={[
              {
                key: "word-template",
                label: "No templates available",
                onClick: () => {},
                disabled: true,
              },
            ]}
          />
          <CommandBarButton
            icon={ArrowDownloadRegular}
            label="Export to Excel"
            onClick={onExportExcel}
          />
        </>
      ) : showMDAActions ? (
        /* === DEFAULT MODE (no selection) === */
        <>
          {/* Entity-specific actions (e.g. + New) */}
          {actions.map((action) => (
            <CommandBarButton
              key={action.key}
              icon={action.icon}
              label={action.label}
              onClick={action.onClick}
              primary={action.primary}
              disabled={action.disabled}
              danger={action.danger}
              hasDropdown={action.hasDropdown}
              tooltip={action.tooltip}
            />
          ))}

          {/* Delete */}
          {deleteMenuItems && deleteMenuItems.length > 0 ? (
            <CommandBarMenuButton
              icon={DeleteRegular}
              label="Delete"
              items={deleteMenuItems}
            />
          ) : onDelete ? (
            <CommandBarButton
              icon={DeleteRegular}
              label="Delete"
              onClick={onDelete}
              hasDropdown
            />
          ) : (
            <CommandBarButton
              icon={DeleteRegular}
              label="Delete"
              hasDropdown
              disabled
            />
          )}

          <div className={styles.divider} />

          <CommandBarButton icon={ArrowSyncRegular} label="Refresh" onClick={onRefresh} />
          <CommandBarButton
            icon={SparkleRegular}
            label="Visualize this view"
            iconColor="#d29200"
            disabled
          />
          <CommandBarMenuButton
            icon={MailRegular}
            label="Email a Link"
            items={[
              {
                key: "email-link",
                label: "Email a Link",
                icon: MailRegular,
                onClick: () => onEmailLink?.(),
              },
            ]}
          />
          <CommandBarMenuButton
            icon={PlayRegular}
            label="Flow"
            items={[
              {
                key: "see-flows",
                label: "See your flows",
                onClick: () => onFlow?.(),
              },
              {
                key: "create-flow",
                label: "Create a flow",
                onClick: () => onFlow?.(),
              },
            ]}
          />
          <CommandBarMenuButton
            icon={DocumentRegular}
            label="Run Report"
            items={[
              { key: "report-wizard", label: "Report Wizard", onClick: onRunReport ?? (() => {})},
              { key: "report-summary", label: "Project Summary", onClick: onRunReport ?? (() => {})},
              { key: "report-created", label: "Record Created/Modified", onClick: onRunReport ?? (() => {})},
            ]}
          />
          <CommandBarMenuButton
            icon={DocumentTableRegular}
            label="Excel Templates"
            items={[
              {
                key: "excel-template",
                label: "No templates available",
                onClick: () => {},
                disabled: true,
              },
            ]}
          />
          <CommandBarButton
            icon={ArrowDownloadRegular}
            label="Export to Excel"
            onClick={onExportExcel}
            hasDropdown
          />
          <CommandBarButton
            icon={ArrowUploadRegular}
            label="Import from Excel"
            disabled
            hasDropdown
          />
        </>
      ) : (
        /* === FORM MODE (not list) === */
        <>
          {actions.map((action) => (
            <CommandBarButton
              key={action.key}
              icon={action.icon}
              label={action.label}
              onClick={action.onClick}
              primary={action.primary}
              disabled={action.disabled}
              danger={action.danger}
              hasDropdown={action.hasDropdown}
              tooltip={action.tooltip}
            />
          ))}
          {onDelete && (
            <CommandBarButton icon={DeleteRegular} label="Delete" onClick={onDelete} />
          )}
          {onRefresh && (
            <>
              <div className={styles.divider} />
              <CommandBarButton icon={ArrowSyncRegular} label="Refresh" onClick={onRefresh} />
            </>
          )}
          <CommandBarButton icon={ShieldCheckmarkRegular} label="Check Access" disabled />
          <CommandBarMenuButton
            icon={DocumentTableRegular}
            label="Word Templates"
            items={[
              { key: "word-template", label: "No templates available", onClick: () => {}, disabled: true },
            ]}
          />
          <CommandBarMenuButton
            icon={DocumentRegular}
            label="Run Report"
            items={[
              { key: "report-wizard", label: "Report Wizard", onClick: onRunReport ?? (() => {}) },
              { key: "report-created", label: "Record Created/Modified", onClick: onRunReport ?? (() => {}) },
            ]}
          />
          <div style={{ flex: 1 }} />
          <div className={styles.divider} />
          <CommandBarMenuButton
            icon={ShareRegular}
            label="Share"
            items={[
              { key: "copy-link", label: "Copy link", onClick: () => onShare?.() },
            ]}
          />
        </>
      )}

      {/* Spacer pushes Share to far right */}
      {showMDAActions && <div style={{ flex: 1 }} />}

      {/* Overflow + Share — only in non-selection default mode */}
      {showMDAActions && !hasSelection && (
        <>
          <CommandBarOverflowMenu onExportExcel={onExportExcel} />
          <div className={styles.divider} />
          <CommandBarMenuButton
            icon={ShareRegular}
            label="Share"
            items={[
              {
                key: "copy-link",
                label: "Copy link",
                onClick: () => onShare?.(),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
