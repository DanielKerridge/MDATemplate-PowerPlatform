import { useEffect } from "react";

/**
 * Sets document.title to match MDA pattern.
 * List pages: "{Entity} - Power Apps"
 * Form pages: "{Entity}: {RecordName} - Power Apps" or "New {Entity} - Power Apps"
 */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) {
      document.title = `${title} - Power Apps`;
    }
    return () => {
      document.title = "MDA Template - Power Apps";
    };
  }, [title]);
}
