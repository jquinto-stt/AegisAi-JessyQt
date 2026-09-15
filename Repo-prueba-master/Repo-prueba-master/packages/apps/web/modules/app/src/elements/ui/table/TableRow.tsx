import { ReactNode } from "react";

interface TableRowProps {
  children: ReactNode;
  className?: string;
}

/**
 * @kgId 4b752e440474
 */
const TableRow: React.FC<TableRowProps> = ({ children, className = "" }) => {
  return <tr className={`border-b border-gray-200 dark:border-gray-800 ${className}`}>{children}</tr>;
};

export default TableRow;
