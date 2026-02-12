import { useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { makeStyles, Input, Button, Textarea, Spinner } from "@fluentui/react-components";
import { useAppStore } from "@/store/useAppStore";
import {
  NoteRegular,
  SendRegular,
  DeleteRegular,
  EditRegular,
  DocumentRegular,
  FilterRegular,
  ArrowSortDownRegular,
  ArrowSortUpRegular,
  AttachRegular,
  DismissRegular,
  AddRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import { AnnotationsService } from "@generated/services/AnnotationsService";
import type { AnnotationRecord } from "@generated/services/AnnotationsService";

interface TimelineWallProps {
  objectId: string;
  objectTypeCode: string;
  isNew?: boolean;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  /* ---- Top bar with search + add ---- */
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 0 12px",
  },
  searchBox: {
    flex: 1,
  },
  addBtn: {
    whiteSpace: "nowrap",
  },
  /* ---- Filter / sort bar ---- */
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "0 0 8px",
    flexWrap: "wrap",
  },
  filterChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 10px",
    border: "1px solid #d2d0ce",
    borderRadius: "12px",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "12px",
    color: "#323130",
    fontFamily: "'Segoe UI', sans-serif",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  filterChipActive: {
    backgroundColor: "#e6f2fb",
    ...({ borderColor: "#0078d4" } as Record<string, string>),
    color: "#0078d4",
  },
  sortBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 8px",
    border: "none",
    borderRadius: "2px",
    backgroundColor: "transparent",
    cursor: "pointer",
    fontSize: "12px",
    color: "#605e5c",
    fontFamily: "'Segoe UI', sans-serif",
    marginLeft: "auto",
    ":hover": {
      backgroundColor: "#f3f2f1",
      color: "#323130",
    },
  },
  /* ---- Compose area ---- */
  composeArea: {
    border: "1px solid #d2d0ce",
    borderRadius: "4px",
    marginBottom: "12px",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  composeHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "14px 16px",
    fontSize: "14px",
    color: "#323130",
    fontWeight: 600,
    backgroundColor: "#faf9f8",
    borderBottom: "1px solid #edebe9",
  },
  composeBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  composeActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
    padding: "10px 16px",
    borderTop: "1px solid #edebe9",
    backgroundColor: "#faf9f8",
  },
  /* ---- Inline compose (MDA style) ---- */
  inlineCompose: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px 0",
    borderBottom: "1px solid #edebe9",
    marginBottom: "4px",
  },
  inlineAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#0078d4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "#fff",
    fontSize: "12px",
    fontWeight: 600,
  },
  inlineInput: {
    flex: 1,
    cursor: "text",
    padding: "6px 12px",
    border: "1px solid #d2d0ce",
    borderRadius: "4px",
    fontSize: "14px",
    color: "#a19f9d",
    backgroundColor: "#fff",
    ":hover": {
      ...({ borderColor: "#323130" } as Record<string, string>),
    },
  },
  /* ---- Date group header ---- */
  dateGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 0 6px",
  },
  dateGroupLine: {
    flex: 1,
    height: "1px",
    backgroundColor: "#edebe9",
  },
  dateGroupLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#605e5c",
    whiteSpace: "nowrap",
  },
  /* ---- Note item ---- */
  noteItem: {
    display: "flex",
    gap: "12px",
    padding: "12px 0",
    borderBottom: "1px solid #f3f2f1",
  },
  noteIconCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    width: "32px",
    flexShrink: 0,
  },
  noteIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: "14px",
  },
  noteIconNote: {
    backgroundColor: "#fff3cd",
    color: "#8a6914",
  },
  noteIconDoc: {
    backgroundColor: "#d6e8f0",
    color: "#0078d4",
  },
  noteContent: {
    flex: 1,
    minWidth: 0,
  },
  noteHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  noteExpandIcon: {
    fontSize: "12px",
    color: "#605e5c",
    flexShrink: 0,
  },
  noteTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#323130",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  noteCreator: {
    fontSize: "12px",
    color: "#605e5c",
    whiteSpace: "nowrap",
  },
  noteDate: {
    fontSize: "12px",
    color: "#a19f9d",
    whiteSpace: "nowrap",
  },
  noteBody: {
    marginTop: "6px",
    paddingLeft: "18px",
  },
  noteText: {
    fontSize: "14px",
    color: "#323130",
    lineHeight: "20px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  noteActions: {
    display: "flex",
    gap: "8px",
    marginTop: "6px",
    opacity: 0,
    transitionProperty: "opacity",
    transitionDuration: "0.15s",
  },
  noteActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: "2px",
    fontSize: "12px",
    color: "#605e5c",
    fontFamily: "'Segoe UI', sans-serif",
    ":hover": {
      backgroundColor: "#f3f2f1",
      color: "#323130",
    },
  },
  emptyState: {
    textAlign: "center",
    padding: "32px 16px",
    color: "#605e5c",
    fontSize: "14px",
  },
  attachment: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    borderRadius: "2px",
    backgroundColor: "#f3f2f1",
    fontSize: "12px",
    color: "#0078d4",
    marginTop: "4px",
    cursor: "pointer",
    ":hover": {
      backgroundColor: "#edebe9",
      textDecoration: "underline",
    },
  },
  recordCount: {
    fontSize: "12px",
    color: "#a19f9d",
    padding: "8px 0 0",
    textAlign: "center",
  },
});

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const noteDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - noteDay.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 14) return "Last Week";
  if (diffDays < 30) return "This Month";
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function TimelineWall({ objectId, objectTypeCode, isNew }: TimelineWallProps) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);

  // State
  const [composeOpen, setComposeOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [searchText, setSearchText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [attachFile, setAttachFile] = useState<{ name: string; size: number; type: string; base64: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "notes" | "attachments">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composeBodyRef = useRef<HTMLTextAreaElement>(null);

  const { data: notes, isLoading } = useQuery({
    queryKey: ["annotations", objectId],
    queryFn: () =>
      AnnotationsService.getAll({
        filter: `_objectid_value eq ${objectId}`,
        orderBy: ["createdon desc"],
      }),
    enabled: !isNew && !!objectId,
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setAttachFile({ name: file.name, size: file.size, type: file.type, base64 });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        subject: noteTitle || (attachFile ? attachFile.name : "Note"),
        notetext: noteBody,
        [`objectid_${objectTypeCode}@odata.bind`]: `/${objectTypeCode}s(${objectId})`,
      };
      if (attachFile) {
        payload.isdocument = true;
        payload.filename = attachFile.name;
        payload.mimetype = attachFile.type;
        payload.documentbody = attachFile.base64;
      }
      const result = await AnnotationsService.create(payload as Partial<AnnotationRecord>);
      // Dataverse POST returns 204 No Content — SDK may report success:false with no error
      if (result.error) throw new Error(result.error.message ?? "Create annotation failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["annotations", objectId] });
      setNoteTitle("");
      setNoteBody("");
      setAttachFile(null);
      setComposeOpen(false);
      addNotification("Note added", "success");
    },
    onError: (err) => addNotification(`Failed to add note: ${err.message}`, "error"),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      await AnnotationsService.update(id, {
        subject: editTitle,
        notetext: editBody,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["annotations", objectId] });
      setEditingId(null);
      addNotification("Note updated", "success");
    },
    onError: (err) => addNotification(`Failed to update note: ${err.message}`, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => AnnotationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["annotations", objectId] });
      setConfirmDeleteId(null);
      addNotification("Note deleted", "success");
    },
    onError: (err) => {
      addNotification(`Failed to delete note: ${err.message}`, "error");
      setConfirmDeleteId(null);
    },
  });

  const startEdit = useCallback((note: AnnotationRecord) => {
    setEditingId(note.annotationid ?? null);
    setEditTitle(note.subject ?? "");
    setEditBody(note.notetext ?? "");
  }, []);

  const downloadAttachment = useCallback(async (annotationId: string, filename: string, mimetype: string) => {
    try {
      const result = await AnnotationsService.getAll({
        filter: `annotationid eq ${annotationId}`,
        select: ["documentbody"],
      });
      const rec = (result.data as unknown as AnnotationRecord[])?.[0];
      const body = rec?.documentbody;
      if (!body) {
        addNotification("Attachment data not available", "error");
        return;
      }
      const byteChars = atob(body);
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteNumbers], { type: mimetype || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      addNotification(`Download failed: ${(err as Error).message}`, "error");
    }
  }, [addNotification]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const notesList = (notes?.data ?? []) as unknown as AnnotationRecord[];

  // Filter + search + sort
  const processedNotes = useMemo(() => {
    let list = [...notesList];
    // Filter by type
    if (filterType === "notes") list = list.filter((n) => !n.isdocument);
    if (filterType === "attachments") list = list.filter((n) => n.isdocument);
    // Search
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      list = list.filter(
        (n) =>
          (n.subject ?? "").toLowerCase().includes(lower) ||
          (n.notetext ?? "").toLowerCase().includes(lower)
      );
    }
    // Sort
    list.sort((a, b) => {
      const da = new Date(a.createdon ?? 0).getTime();
      const db = new Date(b.createdon ?? 0).getTime();
      return sortAsc ? da - db : db - da;
    });
    return list;
  }, [notesList, filterType, searchText, sortAsc]);

  // Group by date
  const groupedNotes = useMemo(() => {
    const groups: { label: string; notes: AnnotationRecord[] }[] = [];
    let currentGroup = "";
    for (const note of processedNotes) {
      const group = note.createdon ? getDateGroup(note.createdon) : "Unknown";
      if (group !== currentGroup) {
        currentGroup = group;
        groups.push({ label: group, notes: [] });
      }
      groups[groups.length - 1].notes.push(note);
    }
    return groups;
  }, [processedNotes]);

  if (isNew) {
    return (
      <div className={styles.root}>
        <div className={styles.emptyState}>
          Save the record first to add notes and activities.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Search + Add bar */}
      <div className={styles.topBar}>
        <div className={styles.searchBox}>
          <Input
            size="small"
            placeholder="Search timeline..."
            value={searchText}
            onChange={(_, d) => setSearchText(d.value)}
            contentBefore={<SearchRegular style={{ fontSize: 14, color: "#605e5c" }} />}
            appearance="outline"
            style={{ width: "100%" }}
          />
        </div>
        <Button
          size="small"
          appearance="primary"
          icon={<AddRegular />}
          onClick={() => {
            setComposeOpen(true);
            setTimeout(() => composeBodyRef.current?.focus(), 100);
          }}
          className={styles.addBtn}
        >
          Add note
        </Button>
      </div>

      {/* Filter chips + sort */}
      <div className={styles.filterBar}>
        <button
          type="button"
          className={`${styles.filterChip}${filterType === "all" ? ` ${styles.filterChipActive}` : ""}`}
          onClick={() => setFilterType("all")}
        >
          <FilterRegular style={{ fontSize: 12 }} />
          All
        </button>
        <button
          type="button"
          className={`${styles.filterChip}${filterType === "notes" ? ` ${styles.filterChipActive}` : ""}`}
          onClick={() => setFilterType("notes")}
        >
          <NoteRegular style={{ fontSize: 12 }} />
          Notes
        </button>
        <button
          type="button"
          className={`${styles.filterChip}${filterType === "attachments" ? ` ${styles.filterChipActive}` : ""}`}
          onClick={() => setFilterType("attachments")}
        >
          <DocumentRegular style={{ fontSize: 12 }} />
          Attachments
        </button>
        <button
          type="button"
          className={styles.sortBtn}
          onClick={() => setSortAsc((prev) => !prev)}
          title={sortAsc ? "Oldest first" : "Newest first"}
        >
          {sortAsc ? (
            <ArrowSortUpRegular style={{ fontSize: 14 }} />
          ) : (
            <ArrowSortDownRegular style={{ fontSize: 14 }} />
          )}
          {sortAsc ? "Oldest first" : "Newest first"}
        </button>
      </div>

      {/* Inline compose prompt (MDA-style) */}
      {!composeOpen && (
        <div className={styles.inlineCompose}>
          <div className={styles.inlineAvatar}>
            <NoteRegular style={{ fontSize: 14 }} />
          </div>
          <div
            className={styles.inlineInput}
            onClick={() => {
              setComposeOpen(true);
              setTimeout(() => composeBodyRef.current?.focus(), 100);
            }}
          >
            Enter a note...
          </div>
        </div>
      )}

      {/* Full compose area */}
      {composeOpen && (
        <div className={styles.composeArea}>
          <div className={styles.composeHeader}>
            <NoteRegular style={{ fontSize: 14 }} />
            <span>Note</span>
          </div>
          <div className={styles.composeBody}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#605e5c", marginBottom: "4px" }}>Title</label>
              <Input
                value={noteTitle}
                onChange={(_, d) => setNoteTitle(d.value)}
                placeholder="Enter a title"
                appearance="outline"
                size="medium"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#605e5c", marginBottom: "4px" }}>Description</label>
              <Textarea
                ref={composeBodyRef}
                value={noteBody}
                onChange={(_, d) => setNoteBody(d.value)}
                placeholder="Add a note..."
                rows={4}
                resize="vertical"
                appearance="outline"
                style={{ width: "100%" }}
              />
            </div>
            {attachFile && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", padding: "6px 8px", backgroundColor: "#f3f2f1", borderRadius: "4px", fontSize: "12px" }}>
                <DocumentRegular style={{ fontSize: 14 }} />
                <span style={{ flex: 1 }}>{attachFile.name} ({(attachFile.size / 1024).toFixed(0)} KB)</span>
                <DismissRegular
                  style={{ fontSize: 12, cursor: "pointer", color: "#605e5c" }}
                  onClick={() => setAttachFile(null)}
                />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
          </div>
          <div className={styles.composeActions}>
            <Button
              size="small"
              appearance="subtle"
              icon={<AttachRegular />}
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              Attach
            </Button>
            <div style={{ flex: 1 }} />
            <Button
              size="small"
              appearance="secondary"
              onClick={() => {
                setComposeOpen(false);
                setNoteTitle("");
                setNoteBody("");
                setAttachFile(null);
              }}
            >
              Discard
            </Button>
            <Button
              size="small"
              appearance="primary"
              icon={<SendRegular />}
              disabled={(!noteBody.trim() && !attachFile) || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Adding..." : "Add note"}
            </Button>
          </div>
        </div>
      )}

      {/* Notes list grouped by date */}
      {isLoading ? (
        <div style={{ padding: "24px", textAlign: "center" }}>
          <Spinner size="small" label="Loading timeline..." />
        </div>
      ) : processedNotes.length === 0 ? (
        <div className={styles.emptyState}>
          {searchText.trim()
            ? "No matching notes found."
            : "No notes yet. Add a note to get started."}
        </div>
      ) : (
        <>
          {groupedNotes.map((group) => (
            <div key={group.label}>
              {/* Date group separator */}
              <div className={styles.dateGroup}>
                <div className={styles.dateGroupLine} />
                <span className={styles.dateGroupLabel}>{group.label}</span>
                <div className={styles.dateGroupLine} />
              </div>
              {/* Notes in group */}
              {group.notes.map((note) => {
                const noteId = note.annotationid ?? "";
                const isExpanded = expandedIds.has(noteId);
                const isEditing = editingId === noteId;
                const hasBody = !!note.notetext;
                const hasAttachment = note.isdocument && note.filename;
                const creatorName = (note as unknown as Record<string, unknown>)?.["_createdby_value@OData.Community.Display.V1.FormattedValue"] as string | undefined;

                return (
                  <div
                    key={noteId}
                    className={styles.noteItem}
                    onMouseEnter={(e) => {
                      const acts = e.currentTarget.querySelector("[data-actions]") as HTMLElement;
                      if (acts) acts.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      const acts = e.currentTarget.querySelector("[data-actions]") as HTMLElement;
                      if (acts) acts.style.opacity = "0";
                    }}
                  >
                    {/* Icon column */}
                    <div className={styles.noteIconCol}>
                      <div className={`${styles.noteIcon} ${note.isdocument ? styles.noteIconDoc : styles.noteIconNote}`}>
                        {note.isdocument ? (
                          <DocumentRegular style={{ fontSize: 14 }} />
                        ) : (
                          <NoteRegular style={{ fontSize: 14 }} />
                        )}
                      </div>
                    </div>

                    {/* Content column */}
                    <div className={styles.noteContent}>
                      {/* Header row - always visible */}
                      <div
                        className={styles.noteHeaderRow}
                        onClick={() => toggleExpanded(noteId)}
                      >
                        <span className={styles.noteExpandIcon}>
                          {isExpanded ? <ChevronDownRegular /> : <ChevronRightRegular />}
                        </span>
                        <span className={styles.noteTitle}>
                          {note.subject || "Note"}
                        </span>
                        {creatorName && (
                          <span className={styles.noteCreator}>
                            {creatorName}
                          </span>
                        )}
                        <span className={styles.noteDate}>
                          {note.createdon ? formatRelativeDate(note.createdon) : ""}
                        </span>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className={styles.noteBody}>
                          {isEditing ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <Input
                                value={editTitle}
                                onChange={(_, d) => setEditTitle(d.value)}
                                placeholder="Title"
                                appearance="outline"
                                size="small"
                                style={{ width: "100%" }}
                              />
                              <Textarea
                                value={editBody}
                                onChange={(_, d) => setEditBody(d.value)}
                                rows={3}
                                resize="vertical"
                                appearance="outline"
                                style={{ width: "100%" }}
                              />
                              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                                <Button
                                  size="small"
                                  appearance="secondary"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="small"
                                  appearance="primary"
                                  onClick={() => updateMutation.mutate(noteId)}
                                  disabled={updateMutation.isPending}
                                >
                                  {updateMutation.isPending ? "Saving..." : "Save"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {hasBody && (
                                <div className={styles.noteText}>{note.notetext}</div>
                              )}
                              {hasAttachment && (
                                <div
                                  className={styles.attachment}
                                  onClick={() => downloadAttachment(noteId, note.filename ?? "attachment", note.mimetype ?? "")}
                                  title={`Download ${note.filename}`}
                                >
                                  <DocumentRegular style={{ fontSize: 12 }} />
                                  <span>{note.filename}</span>
                                  {note.filesize != null && (
                                    <span style={{ color: "#a19f9d" }}>
                                      ({(note.filesize / 1024).toFixed(0)} KB)
                                    </span>
                                  )}
                                </div>
                              )}
                              {!hasBody && !hasAttachment && (
                                <div style={{ fontSize: "13px", color: "#a19f9d", fontStyle: "italic" }}>
                                  No content
                                </div>
                              )}
                            </>
                          )}

                          {/* Actions row */}
                          {!isEditing && (
                            <div className={styles.noteActions} data-actions style={{ opacity: 1 }}>
                              <button
                                className={styles.noteActionBtn}
                                type="button"
                                onClick={() => startEdit(note)}
                              >
                                <EditRegular style={{ fontSize: 12 }} /> Edit
                              </button>
                              {confirmDeleteId === noteId ? (
                                <>
                                  <button
                                    className={styles.noteActionBtn}
                                    type="button"
                                    style={{ color: "#d13438" }}
                                    onClick={() => deleteMutation.mutate(noteId)}
                                  >
                                    Confirm delete
                                  </button>
                                  <button
                                    className={styles.noteActionBtn}
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  className={styles.noteActionBtn}
                                  type="button"
                                  onClick={() => setConfirmDeleteId(noteId)}
                                >
                                  <DeleteRegular style={{ fontSize: 12 }} /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Collapsed preview - show first line of text */}
                      {!isExpanded && hasBody && (
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#605e5c",
                            paddingLeft: "18px",
                            marginTop: "2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "500px",
                          }}
                        >
                          {note.notetext!.split("\n")[0]}
                        </div>
                      )}

                      {/* Hover actions for collapsed state */}
                      {!isExpanded && !isEditing && (
                        <div className={styles.noteActions} data-actions style={{ paddingLeft: "18px", marginTop: "2px" }}>
                          <button
                            className={styles.noteActionBtn}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startEdit(note); toggleExpanded(noteId); }}
                          >
                            <EditRegular style={{ fontSize: 12 }} /> Edit
                          </button>
                          <button
                            className={styles.noteActionBtn}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(noteId); toggleExpanded(noteId); }}
                          >
                            <DeleteRegular style={{ fontSize: 12 }} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Record count */}
          <div className={styles.recordCount}>
            Showing {processedNotes.length} of {notesList.length} record{notesList.length !== 1 ? "s" : ""}
          </div>
        </>
      )}
    </div>
  );
}
