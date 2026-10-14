import { ReactNode } from "react";
import { cn } from "@/utils";

interface CardTitleProps {
  children: ReactNode;
  /** @deprecated Use CardHeader for divider layout instead. Will be removed in a future version. */
  divider?: boolean;
  className?: string;
}

/**
 * @kgId e2e59632e082
 */
const CardTitle: React.FC<CardTitleProps> = ({ children, divider, className }) => {
  return (
    <h4 
      className={cn(
        "mb-1 font-medium text-gray-800 text-theme-xl dark:text-white/90",
        divider && "pb-4 mb-4 border-b border-gray-100 dark:border-gray-800",
        className
      )}
    >
      {children}
    </h4>
  );
};

export default CardTitle;
