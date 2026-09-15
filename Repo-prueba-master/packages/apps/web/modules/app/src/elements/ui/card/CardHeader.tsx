import { ReactNode } from "react";
import { cn } from "@/utils";

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

/**
 * CardHeader — Semantic header zone for Card with bottom divider.
 *
 * Renders a flex container with border-b and padding.
 * Use inside `<Card className="p-0 sm:p-0">` for slotted layout.
 * Typically contains CardTitle + action buttons/filters.
 * @kgId 7cfe276a89b5
 */
const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6 dark:border-gray-800",
        className
      )}
    >
      {children}
    </div>
  );
};

export default CardHeader;
