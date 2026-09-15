import { ReactNode } from "react";

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

/**
 * @kgId 8f3bf8b1e28b
 */
const TableHeader: React.FC<TableHeaderProps> = ({ children, className = "" }) => {
  return <thead className={`bg-gray-50 dark:bg-gray-900 ${className}`}>{children}</thead>;
};

export default TableHeader;
