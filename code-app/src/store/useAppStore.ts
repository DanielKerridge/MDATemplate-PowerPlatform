import { create } from "zustand";

export interface RecentItem {
  id: string;
  title: string;
  entityPath: string;
  entityType: string;
  timestamp: number;
}

interface AppState {
  /** Notification toasts */
  notifications: Array<{ id: string; message: string; type: "success" | "error" | "info" }>;
  addNotification: (message: string, type: "success" | "error" | "info") => void;
  removeNotification: (id: string) => void;

  /** Recent items */
  recentItems: RecentItem[];
  addRecentItem: (item: Omit<RecentItem, "timestamp">) => void;

  /** Pinned items */
  pinnedItems: RecentItem[];
  pinItem: (item: Omit<RecentItem, "timestamp">) => void;
  unpinItem: (id: string) => void;
  isItemPinned: (id: string) => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  notifications: [],
  addNotification: (message, type) =>
    set((s) => ({
      notifications: [
        ...s.notifications,
        { id: crypto.randomUUID(), message, type },
      ],
    })),
  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  recentItems: (() => {
    try {
      const saved = localStorage.getItem("recentItems");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })(),
  addRecentItem: (item) =>
    set((s) => {
      const filtered = s.recentItems.filter((r) => r.id !== item.id);
      const updated = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, 10);
      localStorage.setItem("recentItems", JSON.stringify(updated));
      return { recentItems: updated };
    }),

  pinnedItems: (() => {
    try {
      const saved = localStorage.getItem("pinnedItems");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })(),
  pinItem: (item) =>
    set((s) => {
      if (s.pinnedItems.some((p) => p.id === item.id)) return s;
      const updated = [...s.pinnedItems, { ...item, timestamp: Date.now() }];
      localStorage.setItem("pinnedItems", JSON.stringify(updated));
      return { pinnedItems: updated };
    }),
  unpinItem: (id) =>
    set((s) => {
      const updated = s.pinnedItems.filter((p) => p.id !== id);
      localStorage.setItem("pinnedItems", JSON.stringify(updated));
      return { pinnedItems: updated };
    }),
  isItemPinned: (id) => get().pinnedItems.some((p) => p.id === id),
}));
