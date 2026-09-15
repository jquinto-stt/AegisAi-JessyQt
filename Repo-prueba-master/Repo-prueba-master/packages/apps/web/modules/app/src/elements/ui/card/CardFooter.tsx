import { ReactNode } from "react";
import { cn } from "@/utils";

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

/**
 * CardFooter — Semantic footer zone for Card with top divider.
 *
 * Renders a flex container with border-t and padding.
 * Use inside `<Card className="p-0 sm:p-0">` for slotted layout.
 * Typically contains action buttons or links.
 * @kgId 23f49bfa690c
 */
const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-gray-200 px-5 py-4 sm:px-6 dark:border-gray-800",
        className
      )}
    >
      {children}
    </div>
  );
};

export default CardFooter;
