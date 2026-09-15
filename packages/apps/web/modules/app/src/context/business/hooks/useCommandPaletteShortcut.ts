import { useState, useEffect } from "react";

/* ── Command palette shortcut domain ───────────────────────────────────
 * Owns the palette open/closed flag and binds the global Ctrl/Cmd+K
 * listener that toggles it.
 * ─────────────────────────────────────────────────────────────────── */

export function useCommandPaletteShortcut() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { isCommandPaletteOpen, setIsCommandPaletteOpen };
}

export type CommandPaletteShortcutState = ReturnType<typeof useCommandPaletteShortcut>;
