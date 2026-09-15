/**
 * Pedidos — Superficie pública del módulo.
 *
 * ⚠️ Lo que sale por aquí es **contrato entre el módulo y el resto de Necto**. Hoy
 * sólo el shell (`NectoApp`) y el Dashboard de tienda consumen Pedidos:
 *
 *   · `OrdersProvider`       → el estado de órdenes, que el shell monta **una vez**
 *                              por encima de la vista del módulo y del widget (§25).
 *   · `OrdersModule`         → la pantalla del módulo.
 *   · `DEFAULT_ORDERS_SECTION` → el destino con el que abre, para que el shell y
 *                              el widget del Dashboard no escriban literales.
 *   · `ORDERS_SECTIONS`      → el vocabulario de sus siete destinos.
 *   · `ORDERS_SECTION_META`  → sus rótulos e iconos, para que la barra lateral del
 *                              shell y la del módulo digan lo mismo.
 *   · `PedidosDashboardWidget` → el widget que Pedidos aporta al Dashboard (§25).
 *
 * ⚠️ El contrato de dominio vive en `@/contracts/order.contract` (compartido, porque
 * el bus de eventos lo tipa). Los detalles internos —vistas, semilla, máquina de
 * estados, capa operativa— no se exportan: nadie fuera del módulo debe depender de
 * ellos, y así se puede reestructurar el interior sin romper a nadie.
 *
 * ⚠️ `ORDERS_SECTION_META` es la **única** excepción a esa regla, y es deliberada:
 * la barra lateral del shell necesita listar los destinos de Pedidos, y darle sólo
 * las claves la obligaría a inventarse los rótulos — con dos vocabularios visuales
 * para las mismas siete pantallas.
 */

export { OrdersModule } from "./OrdersModule";
export type { OrdersModuleProps, OrdersSectionKey, OrdersSectionMeta } from "./OrdersModule";
export { ORDERS_SECTIONS, ORDERS_SECTION_META, oneOfSections } from "./OrdersModule";
export { DEFAULT_ORDERS_SECTION } from "./OrdersModule";
export { OrdersProvider, useOrders } from "./context/OrdersContext";
export { PedidosDashboardWidget } from "./widgets/PedidosDashboardWidget";
