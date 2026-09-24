/**
 * Widgets del Inicio de Pedidos — `/pedidos/inicio`.
 *
 * Cada widget es una pieza desacoplada que lee de los stores y comprueba sus
 * propias capacidades. `InicioPage` los compone; ninguno sabe dónde está, y
 * ninguno decide si se le pinta.
 *
 * El **calendario** (`CalendarioInicioWidget` + `ResumenDiaWidget`) es el
 * control del Inicio: el estado del mes y del día vive en la página, y los
 * widgets solo lo pintan y avisan. El gráfico de volumen acepta un `rango`
 * externo para poder seguirlo.
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
export { CalendarioInicioWidget, CalendarioInicioModal } from "./CalendarioInicioWidget";
export { ResumenDiaWidget } from "./ResumenDiaWidget";

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
