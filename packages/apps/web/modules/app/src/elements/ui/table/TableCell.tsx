import { ReactNode } from "react";

interface TableCellProps {
  children: ReactNode;
  header?: boolean;
  className?: string;
}

/**
 * @kgId dbfedc0f16f0
 */
const TableCell: React.FC<TableCellProps> = ({ children, header, className = "" }) => {
  const Tag = header ? "th" : "td";
  // Cabecera: se abandona el `uppercase tracking-wider` generalizado (con 5–6
  // columnas por tabla era una fila entera "gritando") y se gana respiración
  // lateral (px-5). Cuerpo: `text-gray-900` competía con el valor real de la
  // métrica; baja a `text-gray-700` para que el dato destaque por peso, no por
  // negrura.
  const baseClasses = header
    ? "px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
    : "px-5 py-4 text-sm text-gray-700 dark:text-gray-200";

  return <Tag className={`${baseClasses} ${className}`}>{children}</Tag>;
};

export default TableCell;
