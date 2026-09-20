/**
 * Widgets del Inicio de Pedidos — `/pedidos/inicio`.
 *
 * Cada widget es una pieza desacoplada que lee de los stores y comprueba sus
 * propias capacidades. `InicioPage` los compone según la vista derivada del rol;
 * ninguno sabe en qué vista está, y ninguno decide si se le pinta.
 *
 * Las piezas que comparten (paleta, moneda, tiempo relativo, cabecera de
 * tarjeta) viven en `widgets.comunes` para que no haya dos copias del mismo
 * formato de dinero en la misma pantalla.
 */
export { KpiExecutiveWidget, KpiProgramadosWidget } from "./KpiExecutiveWidget";
export { SalesTrendChartWidget } from "./SalesTrendChartWidget";
export { UrgentChatsWidget } from "./UrgentChatsWidget";
export { PrepQueueWidget } from "./PrepQueueWidget";
export { LogisticsDeliveryWidget } from "./LogisticsDeliveryWidget";

export {
  ORANGE,
  INDIGO,
  CELESTE,
  money,
  relativo,
  CabeceraWidget,
  ListaVacia,
  KpiCard,
  RejillaKpi,
} from "./widgets.comunes";
