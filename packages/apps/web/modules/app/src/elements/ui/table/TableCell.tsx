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
  const baseClasses = header
    ? "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
    : "px-4 py-4 text-sm text-gray-900 dark:text-white";

  return <Tag className={`${baseClasses} ${className}`}>{children}</Tag>;
};

export default TableCell;
