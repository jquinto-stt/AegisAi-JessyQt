import { ReactNode, MouseEventHandler } from "react";

interface TableRowProps {
  children: ReactNode;
  className?: string;
  /** Opcional: hace la fila interactiva (por ejemplo, abrir un detalle al hacer click). */
  onClick?: MouseEventHandler<HTMLTableRowElement>;
}

/**
 * @kgId 4b752e440474
 */
const TableRow: React.FC<TableRowProps> = ({ children, className = "", onClick }) => {
  return (
    <tr className={`border-b border-gray-200/70 dark:border-white/5 ${className}`} onClick={onClick}>
      {children}
    </tr>
  );
};

export default TableRow;
