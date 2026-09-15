import { ReactNode } from "react";

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

/**
 * @kgId 9c874d89832a
 */
const TableBody: React.FC<TableBodyProps> = ({ children, className = "" }) => {
  return <tbody className={className}>{children}</tbody>;
};

export default TableBody;
