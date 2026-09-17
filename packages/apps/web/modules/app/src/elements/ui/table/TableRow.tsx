import { ReactNode, MouseEventHandler, CSSProperties } from "react";

interface TableRowProps {
  children: ReactNode;
  className?: string;
  /**
   * Estilos en línea de la fila.
   *
   * Se expone sobre todo para `animationDelay`: las tablas que entran
   * escalonadas necesitan un retardo distinto por fila y no hay clase de
   * Tailwind que lo exprese sin generar una por índice.
   */
  style?: CSSProperties;
  /** Opcional: hace la fila interactiva (por ejemplo, abrir un detalle al hacer click). */
  onClick?: MouseEventHandler<HTMLTableRowElement>;
}

/**
 * @kgId 4b752e440474
 */
const TableRow: React.FC<TableRowProps> = ({ children, className = "", style, onClick }) => {
  return (
    <tr
      className={`border-b border-gray-200/70 dark:border-white/5 ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

export default TableRow;
