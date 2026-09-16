import type React from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/utils";

/**
 * Props for the **Dropdown** component.
 * @kgId c1cce267a5a6
 */
export interface DropdownProps {
  /**
   * Controls whether the dropdown is visible.
   *
   * Managed externally — the parent component toggles this value.
   *
   * @example
   * ```tsx
   * const [open, setOpen] = useState(false);
   * <Dropdown isOpen={open} onClose={() => setOpen(false)}>
   *   ...
   * </Dropdown>
   * ```
   */
  isOpen: boolean;

  /**
   * Callback fired when the dropdown should close — triggered by
   * clicking outside the dropdown area.
   */
  onClose: () => void;

  /**
   * Content rendered inside the dropdown panel.
   *
   * Typically a list of `DropdownItem` components, optionally
   * separated by dividers (`<hr>` or border divs).
   *
   * @example
   * ```tsx
   * <Dropdown isOpen={open} onClose={() => setOpen(false)}>
   *   <DropdownItem>Profile</DropdownItem>
   *   <DropdownItem>Settings</DropdownItem>
   *   <hr className="border-gray-200 dark:border-gray-700" />
   *   <DropdownItem onClick={logout}>Sign out</DropdownItem>
   * </Dropdown>
   * ```
   */
  children: React.ReactNode;

  /**
   * Additional CSS classes merged via `cn()` with `tailwind-merge`.
   *
   * Allows overriding width, position, padding, etc.
   *
   * @default `""`
   *
   * @example
   * ```tsx
   * <Dropdown isOpen={open} onClose={close} className="w-64">
   *   ...
   * </Dropdown>
   * ```
   */
  className?: string;
}

/**
 * Dropdown — Floating panel with a list of selectable options or actions.
 *
 * A controlled component that renders a positioned panel when `isOpen`
 * is `true`. Closes automatically when clicking outside. Commonly used
 * for profile menus, action menus on avatars, or contextual option lists.
 *
 * @remarks
 * **When to use Dropdown vs related components:**
 * - Use `Dropdown` + `DropdownItem` for a structured list of actions
 *   or navigation options (e.g. profile menu, settings menu, row actions).
 * - Use **Popover** for richer content that isn't a simple list — titles,
 *   descriptions, mixed content with buttons and text.
 * - Use **Modal** when the options require full user attention and
 *   should block the page.
 * - Use **Tooltip** for brief non-interactive hints on hover.
 *
 * **Structure:**
 * - `Dropdown` is the container — handles visibility, positioning,
 *   and click-outside detection.
 * - `DropdownItem` is each option — can render as `<button>` or
 *   `<a>` (React Router `Link`). Supports icons, dividers between items.
 *
 * **Behavior:**
 * - Fully controlled — parent manages `isOpen` state.
 * - Closes on click outside via `mousedown` listener.
 * - Positioned `absolute` to the right of its parent (`right-0`).
 * - Uses `cn()` for class merging.
 *
 * **Limitations:**
 * - No `position` prop — always renders below-right.
 * - No keyboard navigation (arrow keys, Enter, Escape to close).
 * - Trigger element must have class `dropdown-toggle` for click-outside
 *   detection to work correctly.
 *
 * @example Profile dropdown
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <div className="relative">
 *   <button className="dropdown-toggle" onClick={() => setOpen(!open)}>
 *     <Avatar src="/img/user.jpg" size="small" />
 *   </button>
 *   <Dropdown isOpen={open} onClose={() => setOpen(false)}>
 *     <DropdownItem tag="a" to="/profile">Profile</DropdownItem>
 *     <DropdownItem tag="a" to="/settings">Settings</DropdownItem>
 *     <DropdownItem onClick={logout}>Sign out</DropdownItem>
 *   </Dropdown>
 * </div>
 * ```
 *
 * @see {@link DropdownItem} — Individual option within the dropdown.
 * @see {@link Popover} — For richer non-list content.
 * @see {@link Modal} — For full-attention dialogs.
 * @kgId 8e06cf665c03
 */
export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(".dropdown-toggle")
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={cn(
        "absolute z-40 right-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark",
        className
      )}
    >
      {children}
    </div>
  );
};
