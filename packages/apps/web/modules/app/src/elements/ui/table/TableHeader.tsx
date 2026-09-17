import { ReactNode } from "react";

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

/**
 * @kgId 8f3bf8b1e28b
 */
const TableHeader: React.FC<TableHeaderProps> = ({ children, className = "" }) => {
  // Antes `dark:bg-gray-900`: un fondo OSCURO OPACO dentro de tarjetas que
  // usan `dark:bg-white/[0.03]`. Era el caso de libro del "box-in-a-box" con
  // fondo competidor. Se alinea con la superficie de la tarjeta.
  return <thead className={`bg-gray-50/70 dark:bg-white/[0.02] ${className}`}>{children}</thead>;
};

export default TableHeader;
