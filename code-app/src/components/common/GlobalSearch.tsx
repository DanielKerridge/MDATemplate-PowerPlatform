import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SearchRegular, DismissRegular } from "@fluentui/react-icons";
import { Spinner } from "@fluentui/react-components";
import { Pic_projectsService } from "@generated/services/Pic_projectsService";
import { Pic_tasksService } from "@generated/services/Pic_tasksService";
import { Pic_teammembersService } from "@generated/services/Pic_teammembersService";
import { Pic_timeentriesService } from "@generated/services/Pic_timeentriesService";
import { Pic_categoriesService } from "@generated/services/Pic_categoriesService";

interface SearchResult {
  id: string;
  title: string;
  entityType: string;
  entityPath: string;
}

const ENTITY_CONFIGS = [
  {
    label: "Project",
    path: "/projects",
    idField: "pic_projectid",
    nameField: "pic_projectname",
    service: Pic_projectsService,
    filterField: "pic_projectname",
  },
  {
    label: "Task",
    path: "/tasks",
    idField: "pic_taskid",
    nameField: "pic_taskname",
    service: Pic_tasksService,
    filterField: "pic_taskname",
  },
  {
    label: "Team Member",
    path: "/teammembers",
    idField: "pic_teammemberid",
    nameField: "pic_fullname",
    service: Pic_teammembersService,
    filterField: "pic_fullname",
  },
  {
    label: "Time Entry",
    path: "/timeentries",
    idField: "pic_timeentryid",
    nameField: "pic_description",
    service: Pic_timeentriesService,
    filterField: "pic_description",
  },
  {
    label: "Category",
    path: "/categories",
    idField: "pic_categoryid",
    nameField: "pic_categoryname",
    service: Pic_categoriesService,
    filterField: "pic_categoryname",
  },
];

const ENTITY_COLORS: Record<string, string> = {
  Project: "#0078d4",
  Task: "#d83b01",
  "Team Member": "#107c10",
  "Time Entry": "#8764b8",
  Category: "#ca5010",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const escaped = q.replace(/'/g, "''");
    try {
      const promises = ENTITY_CONFIGS.map(async (cfg) => {
        try {
          const result = await cfg.service.getAll({
            filter: `contains(${cfg.filterField}, '${escaped}')`,
            select: [cfg.idField, cfg.nameField],
            top: 3,
          } as never);
          return ((result.data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
            id: String(r[cfg.idField] ?? ""),
            title: String(r[cfg.nameField] ?? ""),
            entityType: cfg.label,
            entityPath: cfg.path,
          }));
        } catch (err) {
          console.error(`Global search failed for ${cfg.label}:`, err);
          return [];
        }
      });
      const all = await Promise.all(promises);
      setResults(all.flat());
    } catch (err) {
      console.error("Global search failed:", err);
      setResults([]);
    }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleSelect = (result: SearchResult) => {
    navigate(`${result.entityPath}/${result.id}`);
    setQuery("");
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1, maxWidth: "560px" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: isOpen ? "#fff" : "#f3f2f1",
        border: isOpen ? "1px solid #0078d4" : "1px solid transparent",
        borderRadius: "4px",
        padding: "4px 12px",
        height: "34px",
        boxShadow: isOpen ? "0 0 0 1px rgba(0,120,212,0.3)" : "none",
        transition: "background-color 0.15s, border-color 0.15s, box-shadow 0.15s",
      }}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.backgroundColor = "#e8e8e8"; }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.backgroundColor = "#f3f2f1"; }}
      >
        <SearchRegular style={{ fontSize: 16, color: "#605e5c", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search this app"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setSelectedIndex(-1); }}
          onFocus={(e) => {
            if (query.trim() || results.length > 0) setIsOpen(true);
            (e.currentTarget.parentElement as HTMLElement).style.backgroundColor = "#fff";
            (e.currentTarget.parentElement as HTMLElement).style.border = "1px solid #0078d4";
          }}
          onBlur={(e) => {
            // Reset styling on blur if dropdown isn't open
            setTimeout(() => {
              if (!isOpen) {
                (e.target.parentElement as HTMLElement).style.backgroundColor = "#f3f2f1";
                (e.target.parentElement as HTMLElement).style.border = "1px solid transparent";
              }
            }, 150);
          }}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: "14px",
            color: "#323130",
            backgroundColor: "transparent",
            fontFamily: "'Segoe UI', sans-serif",
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); inputRef.current?.focus(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "20px", height: "20px", border: "none", borderRadius: "50%",
              backgroundColor: "transparent", cursor: "pointer", color: "#605e5c",
              padding: 0,
            }}
          >
            <DismissRegular style={{ fontSize: 14 }} />
          </button>
        )}
        {isSearching && <Spinner size="tiny" />}
        {!query && !isOpen && (
          <span style={{ fontSize: "11px", color: "#a19f9d", fontFamily: "'Segoe UI', sans-serif" }}>/</span>
        )}
      </div>

      {isOpen && (query.trim() || results.length > 0) && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          border: "1px solid #d1d1d1",
          borderRadius: "0 0 4px 4px",
          boxShadow: "0 6.4px 14.4px rgba(0,0,0,0.13), 0 1.2px 3.6px rgba(0,0,0,0.11)",
          zIndex: 2000,
          maxHeight: "360px",
          overflowY: "auto",
          marginTop: "-1px",
        }}>
          {results.length === 0 && !isSearching && query.trim() && (
            <div style={{ padding: "16px", textAlign: "center", color: "#605e5c", fontSize: "14px" }}>
              No results found
            </div>
          )}
          {results.length === 0 && isSearching && (
            <div style={{ padding: "16px", textAlign: "center", color: "#605e5c", fontSize: "14px" }}>
              Searching...
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={`${r.entityType}-${r.id}`}
              onClick={() => handleSelect(r)}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor: i === selectedIndex ? "#f3f2f1" : "transparent",
              }}
            >
              <span style={{
                fontSize: "11px",
                fontWeight: 600,
                color: ENTITY_COLORS[r.entityType] ?? "#605e5c",
                backgroundColor: `${ENTITY_COLORS[r.entityType] ?? "#605e5c"}18`,
                padding: "2px 6px",
                borderRadius: "2px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}>
                {r.entityType}
              </span>
              <span title={r.title} style={{
                fontSize: "14px",
                color: "#323130",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {r.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
