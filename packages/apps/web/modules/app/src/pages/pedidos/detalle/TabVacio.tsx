import type { ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// PESTAÑA VACÍA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TabVacio — el estado «todavía no hay nada» de Novedades y Devoluciones.
 *
 * Existe como pieza propia porque las dos pestañas dicen lo mismo con otro
 * texto, y dos bloques copiados acaban separándose (uno con icono y otro sin
 * él, uno centrado y otro no). El mensaje NO promete que algo vaya a aparecer:
 * describe lo que hay, que es nada.
 */
export const TabVacio = ({
  icono,
  titulo,
  detalle,
}: {
  icono: ReactNode;
  titulo: string;
  detalle?: string;
}) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <span className="flex size-16 items-center justify-center rounded-full bg-gray-50 text-gray-300 dark:bg-gray-800/60 dark:text-gray-600">
      {icono}
    </span>
    <p className="mt-4 text-sm font-semibold text-gray-400 dark:text-gray-500">{titulo}</p>
    {detalle && (
      <p className="mt-1 max-w-sm text-xs text-gray-400 dark:text-gray-500">{detalle}</p>
    )}
  </div>
);

export default TabVacio;
