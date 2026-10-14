import { ReactNode } from "react";
import { cn } from "@/utils";

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

/**
 * CardBody — Semantic body/content zone for Card.
 *
 * Renders a container with padding for the main content area.
 * Use inside `<Card className="p-0 sm:p-0">` for slotted layout.
 * @kgId 3dfc312903f9
 */
const CardBody: React.FC<CardBodyProps> = ({ children, className }) => {
  return (
    <div className={cn("p-5 sm:p-6", className)}>
      {children}
    </div>
  );
};

export default CardBody;
