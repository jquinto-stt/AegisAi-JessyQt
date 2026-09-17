import { useState } from "react";
import { observer } from "mobx-react-lite";

import { Badge, type BadgeColor } from "@/elements/ui/badge";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";
import type { Pedido, PedidoEstado } from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// PANEL DE CONTEXTO — pestañas Pedidos / Turnos (tarea 6.6)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pestañas disponibles del panel de contexto. "Pedidos" tiene contenido real
 * (cruce del contacto con `pedidosStore`); "Turnos" es un placeholder reservado
 * para uso futuro (Req 7.8).
 */
type TabId = "pedidos" | "turnos";

/**
 * Etiqueta y color del badge de ESTADO DE PREPARACIÓN de un pedido (Req 7.5).
 * Comunica en qué punto del pipeline está el pedido del contacto. Es un
 * indicador distinto del badge de estado de pago (más abajo).
 */
const ESTADO_PREP_META: Record<
  PedidoEstado,
  { etiqueta: string; color: BadgeColor }
> = {
  programado: { etiqueta: "Programado", color: "light" },
  nuevo: { etiqueta: "Nuevo", color: "info" },
  confirmado: { etiqueta: "Confirmado", color: "info" },
  en_preparacion: { etiqueta: "En preparación", color: "warning" },
  listo: { etiqueta: "Listo", color: "success" },
  en_camino: { etiqueta: "En camino", color: "warning" },
  entregado: { etiqueta: "Entregado", color: "success" },
  cancelado: { etiqueta: "Cancelado", color: "error" },
};

/**
 * Tarjeta de un pedido del contacto en la pestaña Pedidos. Muestra el número,
 * el resumen de items y DOS badges distintos (Req 7.5): el estado de
 * preparación (pipeline) y el estado de pago (`pagado?`).
 */
const PedidoItemCard = observer(({ pedido }: { pedido: Pedido }) => {
  const prep = ESTADO_PREP_META[pedido.estado];
  // Estado de pago (Req 7.5): `pagado` es opcional (mock). `true` = Pagado,
  // cualquier otro valor (false/undefined) = Pago pendiente.
  const pagado = pedido.pagado === true;

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-gray-200/80 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {pedido.numero}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(pedido.createdAt).toLocaleString()}
        </span>
      </div>

      <span className="truncate text-xs text-gray-500 dark:text-gray-400">
        {pedidosStore.resumenItems(pedido)}
      </span>

      {/* Dos badges DISTINTOS (Req 7.5): preparación vs pago. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge color={prep.color} size="xs">
          {prep.etiqueta}
        </Badge>
        <Badge
          variant={pagado ? "solid" : "light"}
          color={pagado ? "success" : "warning"}
          size="xs"
        >
          {pagado ? "Pagado" : "Pago pendiente"}
        </Badge>
      </div>
    </li>
  );
});

/**
 * TabPedidos — pestaña de Pedidos del panel de contexto (Req 7.3–7.7).
 *
 * Obtiene la conversación por `convId`, saca `contacto.telefono` y lista los
 * pedidos del contacto vía `pedidosStore.porTelefono(telefono)` (ya ordenados
 * del más reciente al más antiguo, Req 7.3). Por cada pedido muestra su estado
 * de preparación y su estado de pago (Req 7.5). Si el contacto no tiene pedidos,
 * muestra un mensaje de ausencia (Req 7.4).
 *
 * Botón [Crear pedido] (Req 7.6): prellena `cliente = contacto.nombre`,
 * `telefono = contacto.telefono`, `origen = "whatsapp"` e invoca
 * `pedidosStore.crearPedido(...)`. Como `crearPedido` exige `modalidad` e
 * `items`, se usan valores mínimos válidos: `modalidad "retiro"` (siempre
 * habilitada) y un item mínimo `1× Pedido WhatsApp`. La llamada va envuelta en
 * try/catch: si falla (Req 7.7) se muestra un mensaje de error y se conservan
 * los datos prellenados (que se derivan del contacto, por lo que persisten al
 * reintentar).
 */
const TabPedidos = observer(({ convId }: { convId: string }) => {
  const [error, setError] = useState<string | null>(null);

  const conv = conversacionesStore.getConversacion(convId);
  if (!conv) {
    return (
      <p className="px-1 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
        No se encontró la conversación.
      </p>
    );
  }

  const { telefono, nombre } = conv.contacto;
  // Cruce con Pedidos por la puerta pública (Req 7.3): NO se lee el array
  // `pedidos` ni se importa lógica interna; `porTelefono` ya ordena desc.
  const pedidos = pedidosStore.porTelefono(telefono);

  const crearPedido = () => {
    // Datos prellenados a partir del contacto (Req 7.6). Se conservan aquí:
    // derivan del contacto, así que un reintento vuelve a usarlos (Req 7.7).
    try {
      pedidosStore.crearPedido({
        cliente: nombre,
        telefono,
        origen: "whatsapp",
        // `crearPedido` exige `modalidad` e `items`: valores mínimos válidos.
        // "retiro" está siempre habilitada; un item mínimo evita un pedido vacío.
        modalidad: "retiro",
        items: [{ nombre: "Pedido WhatsApp", cantidad: 1 }],
      });
      setError(null);
    } catch {
      // Camino de error defensivo (Req 7.7): en el mock `crearPedido` no suele
      // lanzar, pero si lo hiciera mostramos el error y conservamos los datos
      // prellenados (que se recalculan del contacto en cada intento).
      setError("No se pudo crear el pedido. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <button
        type="button"
        onClick={crearPedido}
        className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
      >
        Crear pedido
      </button>

      {/* Mensaje de error si `crearPedido` falla (Req 7.7). */}
      {error && (
        <p className="rounded-lg bg-error-50 px-3 py-2 text-xs text-error-600 dark:bg-error-500/15 dark:text-error-500">
          {error}
        </p>
      )}

      {/* Lista de pedidos del contacto (Req 7.3) o mensaje de ausencia (Req 7.4). */}
      {pedidos.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-3 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
          Este contacto no tiene pedidos asociados.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {pedidos.map((pedido) => (
            <PedidoItemCard key={pedido.id} pedido={pedido} />
          ))}
        </ul>
      )}
    </div>
  );
});

/**
 * TabTurnos — placeholder reservado para uso futuro (Req 7.8). El módulo de
 * Turnos aún no está activo; se muestra un aviso informativo sin lógica.
 */
const TabTurnos = () => (
  <div className="flex h-full flex-col items-center justify-center gap-2 px-3 py-8 text-center">
    <span aria-hidden="true" className="text-2xl">
      🗓️
    </span>
    <p className="text-xs text-gray-400 dark:text-gray-500">
      Disponible cuando se active el módulo de Turnos.
    </p>
  </div>
);

/**
 * PanelContexto — contenido del panel derecho de la consola `/conversaciones`
 * (tarea 6.6). El panel en sí es colapsable a nivel de la Page (Req 7.1/7.2);
 * aquí se implementa el CONTENIDO con pestañas "Pedidos" y "Turnos".
 *
 * Props: `convId` (id de la conversación seleccionada, o `null` si no hay
 * ninguna). Sin selección se muestra un aviso "Selecciona una conversación".
 *
 * Es `observer` para reaccionar a cambios del contacto/pedidos por reactividad
 * MobX.
 *
 * Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8.
 */
export const PanelContexto = observer(
  ({ convId }: { convId: string | null }) => {
    const [tab, setTab] = useState<TabId>("pedidos");

    return (
      <div className="flex h-full flex-col gap-3">
        {/* Pestañas Pedidos / Turnos. */}
        <div className="flex gap-1.5" role="tablist" aria-label="Contexto">
          {(
            [
              { id: "pedidos", etiqueta: "Pedidos" },
              { id: "turnos", etiqueta: "Turnos" },
            ] as ReadonlyArray<{ id: TabId; etiqueta: string }>
          ).map((t) => {
            const activo = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activo}
                onClick={() => setTab(t.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  activo
                    ? "border-brand-300 bg-brand-500 text-white dark:border-brand-500"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {t.etiqueta}
              </button>
            );
          })}
        </div>

        {/* Contenido de la pestaña activa. */}
        <div className="min-h-0 flex-1">
          {convId === null ? (
            <p className="flex h-full items-center justify-center px-3 py-8 text-center text-xs text-gray-400 dark:text-gray-500">
              Selecciona una conversación
            </p>
          ) : tab === "pedidos" ? (
            <TabPedidos convId={convId} />
          ) : (
            <TabTurnos />
          )}
        </div>
      </div>
    );
  },
);

export default PanelContexto;
