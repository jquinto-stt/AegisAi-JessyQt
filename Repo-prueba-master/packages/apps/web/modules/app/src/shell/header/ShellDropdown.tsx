/**
 * ShellDropdown — Self-contained dropdown for the shell header.
 *
 * Inlines the Dropdown/DropdownItem pattern so the shell has zero
 * dependencies on @/elements/ui/dropdown. This is intentional duplication
 * to keep the shell fully self-contained and portable.
 */

import { useEffect, useRef, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { Link } from "react-router";

// ─── Dropdown Container ─────────────────────────────────────────────────────

interface ShellDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * @kgId 605c30bd3b40
 */
export function ShellDropdown({ isOpen, onClose, children, className = "" }: ShellDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(".dropdown-toggle")
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ─── Dropdown Item ──────────────────────────────────────────────────────────

interface ShellDropdownItemProps {
  tag?: "a" | "button";
  to?: string;
  onClick?: () => void;
  onItemClick?: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * @kgId 0b0278f3e84a
 */
export function ShellDropdownItem({
  tag = "button",
  to,
  onClick,
  onItemClick,
  className = "",
  children,
}: ShellDropdownItemProps) {
  const handleClick = (event: ReactMouseEvent) => {
    if (tag === "button") event.preventDefault();
    onClick?.();
    onItemClick?.();
  };

  if (tag === "a" && to) {
    return (
      <Link to={to} className={className} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
