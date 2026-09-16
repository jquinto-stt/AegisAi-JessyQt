import type React from "react";
import { Link } from "react-router";

/**
 * Props for the **DropdownItem** component.
 * @kgId 6c8381eaab26
 */
export interface DropdownItemProps {
  /**
   * HTML element to render — `"button"` for actions,
   * `"a"` for navigation (renders React Router `Link`).
   *
   * @default `"button"`
   */
  tag?: "a" | "button";

  /**
   * Navigation target when `tag="a"`. Passed to React Router's `<Link>`.
   *
   * @example
   * ```tsx
   * <DropdownItem tag="a" to="/profile">Profile</DropdownItem>
   * ```
   */
  to?: string;

  /**
   * Callback fired when the item is clicked.
   */
  onClick?: () => void;

  /**
   * Additional callback fired after `onClick` — useful for closing
   * the parent `Dropdown` from within the item.
   */
  onItemClick?: () => void;

  /**
   * Base CSS classes for the item. Override to completely change
   * the item's appearance.
   *
   * @default `"block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"`
   */
  baseClassName?: string;

  /**
   * Additional CSS classes appended to `baseClassName`.
   *
   * @default `""`
   */
  className?: string;

  /**
   * Item content — text, icons, or composed elements.
   *
   * @example
   * ```tsx
   * <DropdownItem>
   *   <span className="flex items-center gap-2">
   *     <SettingsIcon /> Settings
   *   </span>
   * </DropdownItem>
   * ```
   */
  children: React.ReactNode;
}

/**
 * DropdownItem — Individual option within a `Dropdown` menu.
 *
 * Renders as a `<button>` for actions or a React Router `<Link>`
 * for navigation. Supports icons, text, and any composed content.
 *
 * @remarks
 * **Rendering modes:**
 * - `tag="button"` (default) — Renders a `<button>` for actions
 *   like "Sign out", "Delete", etc.
 * - `tag="a"` with `to` — Renders a React Router `<Link>` for
 *   navigation like "Profile", "Settings".
 *
 * **Limitations:**
 * - Does not use `cn()` — concatenates `baseClassName` + `className`.
 * - Coupled to `react-router` for link rendering.
 *
 * @example Action item
 * ```tsx
 * <DropdownItem onClick={() => logout()}>Sign out</DropdownItem>
 * ```
 *
 * @example Navigation item with icon
 * ```tsx
 * <DropdownItem tag="a" to="/settings">
 *   <span className="flex items-center gap-2">
 *     <GearIcon /> Settings
 *   </span>
 * </DropdownItem>
 * ```
 *
 * @see {@link Dropdown} — Parent container for dropdown items.
 * @kgId cbb4955548af
 */
export const DropdownItem: React.FC<DropdownItemProps> = ({
  tag = "button",
  to,
  onClick,
  onItemClick,
  baseClassName = "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900",
  className = "",
  children,
}) => {
  const combinedClasses = `${baseClassName} ${className}`.trim();

  const handleClick = (event: React.MouseEvent) => {
    if (tag === "button") {
      event.preventDefault();
    }
    if (onClick) onClick();
    if (onItemClick) onItemClick();
  };

  if (tag === "a" && to) {
    return (
      <Link to={to} className={combinedClasses} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={handleClick} className={combinedClasses}>
      {children}
    </button>
  );
};
