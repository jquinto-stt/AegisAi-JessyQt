/**
 * Pedidos — Shell del módulo (§11, §26)
 * =====================================
 *
 * Es el armazón del módulo: la navegación entre sus ocho destinos, el punto único
 * donde se monta el detalle de una orden, y el estado del movimiento recién hecho.
 *
 * ── Estructura de navegación (§26) ─────────────────────────────────────────
 *
 *     PEDIDOS
 *     ├── Panel de pedidos        ← el estado del día y un atajo a cada pantalla
 *     ├── Bandeja de entrada      ← triaje: PENDING y CONFIRMED (§11, §12)
 *     ├── Mesa de alistamiento    ← IN_PREPARATION, por urgencia (§16)
 *     ├── Despacho y entrega      ← READY, IN_TRANSIT y DELIVERED, por modalidad (§8)
 *     ├── Programados             ← lo que tiene fecha comprometida (§15)
 *     ├── Historial y auditoría   ← COMPLETED, CANCELLED y RETURNED, con motivos (§10)
 *     ├── Canales de origen       ← sólo el origen, no el dominio de Canales (§18, §26)
 *     └── Configuración del flujo ← umbrales y avisos propios de Pedidos (§17)
 *
 * ⚠️ **Una pantalla de entrada, cinco de trabajo y dos de contexto.** El Panel abre
 * la marcha y **no opera** órdenes: no las lista ni las transiciona, sólo resume el
 * día y lleva a donde sí se opera. Las cinco siguientes operan sobre órdenes y
 * llevan filtros; las dos últimas explican contexto —una, de dónde vienen las
 * órdenes; la otra, cómo se comporta el flujo—.
 *
 * ⚠️ **El Panel no es el Dashboard de la Tienda, y no compite con él.** El
 * Dashboard de la Tienda (§25) es del negocio entero —ventas, canales, sedes— y
 * Pedidos sólo le aporta un widget. El Panel es de Pedidos y **sólo** de Pedidos:
 * responde "¿en qué pantalla de este módulo hay trabajo ahora?", y para eso no
 * necesita mirar nada que no sean órdenes.
 *
 * ⚠️ Esta distinción es la que faltaba cuando las cuatro cifras se pintaban en la
 * cabecera de **las cinco** pantallas de trabajo: allí no resumían la fase de
 * nadie —eran las mismas en todas—, así que eran un resumen metido a la fuerza en
 * cada pestaña, ocupando su franja más valiosa y empujando hacia abajo lo único
 * que allí se opera, que es la lista. Un resumen tiene **una** pantalla, y es esta.
 *
 * ⚠️ Tampoco hay "Ítems", "Clientes" ni "Inventario": no son de este dominio (§29).
 *
 * ── Por qué el detalle y el movimiento viven aquí ──────────────────────────
 *
 * ⚠️ El detalle de la orden se monta **una sola vez**, no en cada vista. Si cada
 * pantalla abriera su propio drawer, dos pantallas podrían divergir en qué
 * acciones ofrecen —y las acciones dependen de la máquina de estados, que es una—.
 *
 * ⚠️ Y por eso el **movimiento** también vive aquí: la transición ocurre en el
 * detalle, así que el hecho "pasó de X a Y" nace en el shell. El drawer lo
 * reporta, el shell lo guarda y la vista activa lo pinta (§27). Si cada vista
 * guardara el suyo, el cambio hecho en el detalle no tendría forma de llegar a la
 * pantalla que lo muestra.
 */

import { useCallback, useEffect, useState } from "react";

import { useBusiness } from "@/context/BusinessContext";
import { useOrders } from "./context/OrdersContext";
import { OrdersFlowSettingsProvider } from "./operational/flow-settings";
import { screenForStatus } from "./operational/order-operations";
import { useOrderMovement } from "./shared/use-order-movement";
import type { OrderMovement } from "./shared/OrdersMovementBand";
import {
  DEFAULT_ORDERS_SECTION,
  ORDERS_SECTION_META,
} from "./shared/orders-destinations";
import type { OrdersSectionKey } from "./shared/orders-destinations";
import { OrderDetailDrawer } from "./views/OrderDetailDrawer";
import { OrdersPanelView } from "./views/OrdersPanelView";
import { OrdersInboxView } from "./views/OrdersInboxView";
import { OrdersPreparationView } from "./views/OrdersPreparationView";
import { OrdersDispatchView } from "./views/OrdersDispatchView";
import { OrdersScheduledView } from "./views/OrdersScheduledView";
import { OrdersHistoryView } from "./views/OrdersHistoryView";
import { ChannelsView } from "./views/ChannelsView";
import { OrdersFlowConfigView } from "./views/OrdersFlowConfigView";

/* ── Vocabulario de secciones ──────────────────────────────────────────────── */

/**
 * ⚠️ El vocabulario —claves, rótulos, iconos y propósitos— vive en
 * `shared/orders-destinations.ts` y se **reexporta** desde aquí para no romper a
 * quien ya lo importaba. Se mudó porque el Panel, que es una de las vistas, tiene
 * que listar los destinos: con el vocabulario dentro de este archivo, la vista
 * cerraba el ciclo `OrdersModule → OrdersPanelView → OrdersModule`.
 */
export {
  ORDERS_SECTIONS,
  ORDERS_SECTION_META,
  DEFAULT_ORDERS_SECTION,
  oneOfSections,
} from "./shared/orders-destinations";
export type { OrdersSectionKey, OrdersSectionMeta } from "./shared/orders-destinations";

/* ── Shell ─────────────────────────────────────────────────────────────────── */

export interface OrdersModuleProps {
  /** Sección inicial, típicamente resuelta desde la URL por `NectoApp`. */
  initialSection?: OrdersSectionKey;
  /** Abre Ajustes de Sede en la pestaña de canales (puente de §26). */
  onOpenStoreChannels?: () => void;
  /** Abre Ajustes de Sede (puente de §17). */
  onOpenStoreSettings?: () => void;
  /**
   * Avisa de que el usuario cambió de sección **dentro** del módulo.
   *
   * ⚠️ El módulo no escribe la URL por su cuenta (no conoce la ruta del shell):
   * la sección es suya, pero publicarla es del shell. Sin este aviso, moverse a
   * "Despacho" dejaba la URL diciendo `bandeja` y el enlace no describía la
   * pantalla.
   */
  onSectionChange?: (section: OrdersSectionKey) => void;
  /**
   * Vuelve a la conversación de la que salió una orden.
   *
   * ⚠️ Es un **puente**, igual que `onOpenStoreChannels`: Pedidos no posee el
   * canal y no sabe abrir una conversación (§18). El módulo sólo dice "el
   * operador quiere responder a este hilo"; quien lo resuelve es Canales.
   */
  onReplyToSource?: (orderId: string) => void;
  /** Explicación cuando el puente a la conversación aún no existe. */
  replyUnavailableHint?: string;
}

/**
 * La pantalla del módulo Pedidos.
 *
 * ⚠️ **No monta el `OrdersProvider`.** El provider vive en el shell (`NectoApp`),
 * por encima de las **dos** pantallas que consumen Pedidos: esta vista y el widget
 * del Dashboard de tienda (§25). Si se montara aquí dentro, el widget —que se pinta
 * dentro del Dashboard, fuera del módulo— no lo alcanzaría; y si se montara en los
 * dos sitios, serían **dos almacenes distintos**: una orden confirmada en el módulo
 * no cambiaría en el widget. Montarlo una sola vez, arriba, es lo que hace que
 * ambos miren las mismas órdenes.
 *
 * ⚠️ Lo que **sí** monta aquí es el `OrdersFlowSettingsProvider` (§17): los
 * umbrales de demora son de Pedidos, no de la Tienda, y sólo este módulo los lee.
 * Montarlos en el shell global acoplaría la tienda a un detalle de operación.
 */
export function OrdersModule({
  initialSection = DEFAULT_ORDERS_SECTION,
  onOpenStoreChannels,
  onOpenStoreSettings,
  onSectionChange,
  onReplyToSource,
  replyUnavailableHint,
}: OrdersModuleProps) {
  const { activeBusiness } = useBusiness();

  return (
    <OrdersFlowSettingsProvider businessId={activeBusiness?.id ?? null}>
      <OrdersModuleShell
        initialSection={initialSection}
        onOpenStoreChannels={onOpenStoreChannels}
        onOpenStoreSettings={onOpenStoreSettings}
        onSectionChange={onSectionChange}
        onReplyToSource={onReplyToSource}
        replyUnavailableHint={replyUnavailableHint}
      />
    </OrdersFlowSettingsProvider>
  );
}

/** El shell **siempre** recibe la sección: el valor por defecto lo pone el módulo. */
type OrdersShellProps = Omit<OrdersModuleProps, "initialSection"> & {
  initialSection: OrdersSectionKey;
};

/**
 * El deep-link pendiente: a qué pantalla y con qué fase ya elegida.
 *
 * ⚠️ Se guarda **como estado del shell** y no se pasa directo a la vista, porque la
 * fase tiene que sobrevivir al salto de sección: el Panel no está montado cuando
 * la vista destino se monta, así que nadie podría entregársela. Y se limpia en
 * cuanto el operador navega por su cuenta —véase `goToSection`— para que un salto
 * pedido hace cinco minutos no reencuadre una pantalla que el operador ya estaba
 * mirando.
 */
interface PendingDeepLink {
  section: OrdersSectionKey;
  phase: string;
}

function OrdersModuleShell({
  initialSection,
  onOpenStoreChannels,
  onOpenStoreSettings,
  onSectionChange,
  onReplyToSource,
  replyUnavailableHint,
}: OrdersShellProps) {
  const { activeBusiness } = useBusiness();
  const { orderById } = useOrders();
  const { movement, report, dismiss } = useOrderMovement();

  const [section, setSection] = useState<OrdersSectionKey>(initialSection);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [pendingDeepLink, setPendingDeepLink] = useState<PendingDeepLink | null>(null);

  // ⚠️ La sección también se sigue desde fuera: si el shell (`NectoApp`) cambia
  // `initialSection` —porque el widget del Dashboard pidió "Pedidos", por ejemplo—
  // el módulo debe moverse a esa sección. Sin esto, el prop sólo se leería al
  // montar y la petición del widget se perdería con el módulo ya abierto.
  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  /**
   * Navegación normal: mueve la sección **y** avisa al shell para que la URL siga
   * describiéndola.
   *
   * ⚠️ Limpia el deep-link pendiente. Es lo que impide que la fase que pidió el
   * Panel se quede pegada: sin esto, entrar en Alistamiento desde el Panel con
   * "Demoradas" y luego volver a Alistamiento desde la barra lateral aterrizaría
   * otra vez filtrado, y el operador creería que su mesa sólo tiene tres órdenes.
   */
  const goToSection = useCallback(
    (next: OrdersSectionKey) => {
      setPendingDeepLink(null);
      setSection(next);
      onSectionChange?.(next);
    },
    [onSectionChange]
  );

  /**
   * Deep-link del Panel: sección **más** la fase con la que debe abrir.
   *
   * ⚠️ Es un camino distinto del de `goToSection` a propósito. Si el Panel usara
   * la navegación normal, la cifra que el operador acaba de pulsar —"3 demoradas"—
   * se perdería en el salto y tendría que volver a buscar a mano las tres órdenes
   * que le acabamos de contar. Una cifra que no lleva a su lista es decoración.
   */
  const goToSectionWithPhase = useCallback(
    (next: OrdersSectionKey, phase?: string) => {
      // Un atajo **sin** fase no es un deep-link: es navegación normal, y tiene que
      // pasar por `goToSection` para limpiar cualquier fase pendiente anterior.
      if (phase === undefined) {
        goToSection(next);
        return;
      }
      setPendingDeepLink({ section: next, phase });
      setSection(next);
      onSectionChange?.(next);
    },
    [goToSection, onSectionChange]
  );

  /**
   * La fase con la que abre una pantalla, o `undefined` si nadie la pidió.
   *
   * ⚠️ La compara contra **su** sección: el deep-link es de una sola pantalla, y
   * dárselo a las cinco haría que la fase `"late"` de Alistamiento intentara
   * aplicarse también en Historial, donde no existe.
   */
  const initialPhaseFor = useCallback(
    (target: OrdersSectionKey): string | undefined =>
      pendingDeepLink?.section === target ? pendingDeepLink.phase : undefined,
    [pendingDeepLink]
  );

  /**
   * Lleva a donde vive ahora la orden que se acaba de mover (§27).
   *
   * ⚠️ El destino lo decide el **estado de destino**, no la pantalla de origen:
   * cerrar una orden desde Despacho la manda a Historial, y confirmarla desde la
   * Bandeja la deja donde estaba. `screenForStatus` es la única traducción de
   * estado a pantalla, y por eso la confirmación y este salto no pueden discrepar.
   */
  const seeMovement = useCallback(
    (moved: OrderMovement) => {
      goToSection(screenForStatus(moved.to));
    },
    [goToSection]
  );

  if (!activeBusiness) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 py-20 dark:border-gray-800">
        <p className="text-theme-sm font-medium text-gray-500 dark:text-gray-400">
          Pedidos necesita una tienda
        </p>
        <p className="max-w-md text-center text-theme-xs text-gray-400 dark:text-gray-500">
          Las órdenes pertenecen a una tienda. Crea o selecciona una sede para gestionarlas.
        </p>
      </div>
    );
  }

  const openOrder = openOrderId ? orderById(openOrderId) ?? null : null;
  const viewProps = {
    onOpenOrder: setOpenOrderId,
    onSeeMovement: seeMovement,
    movement,
    onDismissMovement: dismiss,
  };

  return (
    <div data-orders-module className="flex flex-col gap-6">
      {/* ── Navegación del módulo ──────────────────────────────────────────── */}
      <nav
        aria-label="Secciones de Pedidos"
        className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 pb-3 dark:border-gray-800"
      >
        {ORDERS_SECTION_META.map(meta => {
          const Icon = meta.icon;
          const isActive = section === meta.key;
          return (
            <button
              key={meta.key}
              type="button"
              onClick={() => goToSection(meta.key)}
              aria-current={isActive ? "page" : undefined}
              data-orders-section={meta.key}
              title={meta.label}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-theme-sm font-medium transition-colors ${
                isActive
                  ? "bg-secondary-600 text-white dark:bg-white dark:text-secondary-900"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 flex-none" aria-hidden />
              {meta.label}
            </button>
          );
        })}
      </nav>

      {/* ── Sección activa ─────────────────────────────────────────────────── */}
      {section === "panel" && <OrdersPanelView onNavigate={goToSectionWithPhase} />}
      {section === "bandeja" && (
        <OrdersInboxView {...viewProps} initialPhase={initialPhaseFor("bandeja")} />
      )}
      {section === "alistamiento" && (
        <OrdersPreparationView {...viewProps} initialPhase={initialPhaseFor("alistamiento")} />
      )}
      {section === "despacho" && (
        <OrdersDispatchView {...viewProps} initialPhase={initialPhaseFor("despacho")} />
      )}
      {section === "programados" && (
        <OrdersScheduledView {...viewProps} initialPhase={initialPhaseFor("programados")} />
      )}
      {section === "historial" && (
        <OrdersHistoryView {...viewProps} initialPhase={initialPhaseFor("historial")} />
      )}
      {section === "canales" && (
        <ChannelsView onOpenStoreChannels={onOpenStoreChannels ?? (() => {})} />
      )}
      {section === "configuracion" && (
        <OrdersFlowConfigView onOpenStoreSettings={onOpenStoreSettings ?? (() => {})} />
      )}

      {/* ── Detalle (única instancia, §14) ─────────────────────────────────── */}
      <OrderDetailDrawer
        order={openOrder}
        onClose={() => setOpenOrderId(null)}
        onReplyToSource={
          onReplyToSource && openOrderId
            ? () => onReplyToSource(openOrderId)
            : undefined
        }
        replyUnavailableHint={replyUnavailableHint}
        onTransition={report}
      />
    </div>
  );
}

export default OrdersModule;
