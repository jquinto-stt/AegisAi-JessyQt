import type React from "react";
import { cn } from "@/utils";

export interface DropdownItemProps {
  tag?: "a" | "button";
  href?: string;
  onClick?: () => void;
  onItemClick?: () => void;
  baseClassName?: string;
  className?: string;
  children: React.ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  tag = "button",
  href,
  onClick,
  onItemClick,
  baseClassName = "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white transition-colors cursor-pointer",
  className = "",
  children,
}) => {
  const handleClick = (event: React.MouseEvent) => {
    if (tag === "button") {
      event.preventDefault();
    }
    onClick?.();
    onItemClick?.();
  };

  if (tag === "a" && href) {
    return (
      <a href={href} onClick={handleClick} className={cn(baseClassName, className)}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={handleClick} className={cn(baseClassName, className)}>
      {children}
    </button>
  );
};

export default DropdownItem;
