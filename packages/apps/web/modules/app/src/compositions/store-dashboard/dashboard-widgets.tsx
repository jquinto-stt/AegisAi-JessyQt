import { StoreActionsWidget } from "./widgets/StoreActionsWidget";
import { StoreActivityWidget } from "./widgets/StoreActivityWidget";
import { StoreChannelsWidget } from "./widgets/StoreChannelsWidget";
import { StoreIdentityWidget } from "./widgets/StoreIdentityWidget";
import { PedidosDashboardWidget, DEFAULT_ORDERS_SECTION } from "@/compositions/orders";
import type { StoreDashboardWidgetDef } from "./store-dashboard.types";

/**
 * El catálogo de widgets del Dashboard de tienda.
 *
 * ⚠️ **Aquí es donde un módulo se suma al Dashboard.** Declara su widget con
 * `source: "<su NectoModuleKey>"` y no toca nada más: el shell lo filtra por
 * `business.activeModules`, así que aparece y desaparece con el módulo, sin que
 * el shell ni los demás widgets sepan que existe.
 *
 * ✅ **Pedidos ya está implementado** y aporta `pedidos-summary` (`source:
 * "pedidos"`). Es la primera prueba de que el eje funciona: el widget se pinta
 * sólo cuando la tienda tiene `pedidos` acoplado, y el shell no pregunta por él en
 * ninguna parte.
 *
 * El `order` sigue el orden de lectura: quién es la tienda, qué está pasando y
 * por último las puertas a la acción. Los módulos ocupan la franja 20–29, que
 * queda entre el contexto y la actividad — y hoy Pedidos ocupa el 20.
 */
export const STORE_DASHBOARD_WIDGETS: StoreDashboardWidgetDef[] = [
  {
    id: "store-identity",
    source: "store",
    span: "full",
    order: 10,
    render: ctx => <StoreIdentityWidget ctx={ctx} />,
  },
  {
    /**
     * ⚠️ El widget de Pedidos **pertenece al módulo** (§25), aunque viva en este
     * catálogo: por eso su `render` delega en la superficie pública de
     * `compositions/orders`. Y ojo con `onOpenOrders`: el Dashboard no navega al
     * módulo por su cuenta —eso duplicaría la lógica del shell—; lo pide, y el
     * shell decide a dónde lleva.
     *
     * ⚠️ El destino que pide es `DEFAULT_ORDERS_SECTION`, la constante **del
     * módulo**, y no un literal: antes pedía `"ordenes"`, una sección que el
     * vocabulario nuevo ya no tiene. Funcionaba sólo de rebote —`oneOfSections` la
     * rechazaba y el shell caía al valor por defecto—, así que el widget habría
     * seguido "funcionando" mientras pedía una pantalla inexistente.
     */
    id: "pedidos-summary",
    source: "pedidos",
    span: "full",
    order: 20,
    render: ctx => (
      <PedidosDashboardWidget
        ctx={ctx}
        onOpenOrders={() => ctx.onOpenModuleView?.("pedidos", DEFAULT_ORDERS_SECTION)}
      />
    ),
  },
  {
    id: "store-activity",
    source: "store",
    span: "full",
    order: 30,
    render: ctx => <StoreActivityWidget ctx={ctx} />,
  },
  {
    id: "store-channels",
    source: "store",
    span: "half",
    order: 40,
    render: ctx => <StoreChannelsWidget ctx={ctx} />,
  },
  {
    id: "store-actions",
    source: "store",
    span: "half",
    order: 50,
    render: ctx => <StoreActionsWidget ctx={ctx} />,
  },
];
