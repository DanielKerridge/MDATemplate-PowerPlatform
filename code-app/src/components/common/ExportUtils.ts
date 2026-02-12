/**
 * Export grid data to CSV file and trigger download.
 */
export function exportToExcel(
  columns: Array<{ key: string; header: string }>,
  rows: Record<string, unknown>[],
  filename: string
) {
  const headers = columns.map((c) => c.header);
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      columns
        .map((col) => {
          const val = String(row[col.key] ?? "");
          // Escape quotes and wrap in quotes if contains comma/quote/newline
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",")
    ),
  ];

  try {
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("CSV export failed:", err);
    throw new Error("Failed to export data. Please try again.");
  }
}

/**
 * Copy the current view URL to clipboard.
 */
export async function copyEmailLink(entityPath: string, viewName: string): Promise<boolean> {
  const url = `${window.location.origin}${window.location.pathname}#${entityPath}`;
  try {
    await navigator.clipboard.writeText(`${viewName}: ${url}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy a single record URL to clipboard.
 */
export async function copyRecordLink(entityPath: string, recordId: string): Promise<boolean> {
  const url = `${window.location.origin}${window.location.pathname}#${entityPath}/${recordId}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open Power Automate in a new tab.
 */
export function openFlowUrl() {
  window.open("https://make.powerautomate.com", "_blank");
}
