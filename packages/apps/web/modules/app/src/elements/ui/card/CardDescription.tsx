import { ReactNode } from "react";
import { cn } from "@/utils";

interface CardDescriptionProps {
  children: ReactNode;
  /**
   * Additional CSS classes merged via `cn()`.
   *
   * Mirrors `CardHeader` / `CardBody` / `CardTitle` / `CardFooter`, which
   * already accept `className`. Needed for centred empty states
   * (`mx-auto max-w-md text-center`) and for spacing overrides.
   */
  className?: string;
}

/**
 * @kgId 6887c0113283
 */
const CardDescription: React.FC<CardDescriptionProps> = ({ children, className }) => {
  return (
    <p className={cn("text-sm text-gray-500 dark:text-gray-400", className)}>{children}</p>
  );
};

export default CardDescription;
