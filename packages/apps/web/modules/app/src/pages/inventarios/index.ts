// ═══════════════════════════════════════════════════════════════════════════
// INVENTARIOS — barril de pantallas
// ═══════════════════════════════════════════════════════════════════════════
//
// Un único punto de entrada para que `App.tsx` importe las rutas sin conocer
// el despiece interno del módulo. Aquí solo se re-exporta: la lógica vive en
// cada archivo y las piezas compartidas del módulo en `inventarios.ui.tsx`,
// `inventarios.widgets.tsx`, `inventarios.constants.ts` e
// `inventarios.presentacion.ts`.
//
// No se exportan `inventarios.presentacion.ts` ni `inventarios.constants.ts`:
// son vocabulario interno de las pantallas, no superficie del módulo.

export { DashboardPage } from "./DashboardPage";
export { ProductosPage } from "./ProductosPage";
export { DetalleProductoPage } from "./DetalleProductoPage";
export { SedesPage } from "./SedesPage";
export { OrdenesPage } from "./OrdenesPage";
export { ProveedoresPage } from "./ProveedoresPage";
export { ReportesPage } from "./ReportesPage";
export { InventariosConfigPage } from "./ConfigPage";
export { InventarioZeroState } from "./InventarioZeroState";
export { InventariosPage, default as InventariosPageDefault } from "./InventariosPage";
export { CrearInventarioPage } from "./CrearInventarioPage";
export { DetalleInventarioPage } from "./DetalleInventarioPage";
export { ElementosPage } from "./ElementosPage";
export { DetalleElementoPage } from "./DetalleElementoPage";
export { UbicacionesPage } from "./UbicacionesPage";
export { HistorialPage } from "./HistorialPage";
export { AlertasPage } from "./AlertasPage";

export { ModalAgregarElemento } from "./ModalAgregarElemento";
export { ModalElemento } from "./ModalElemento";
export { ModalUbicacion, NodoUbicacion } from "./ModalUbicacion";

export { InventariosTabla } from "./InventariosTabla";
export { LineasTabla } from "./LineasTabla";
export { CabeceraPagina, ContenedorPagina, EnlaceVolver } from "./inventarios.ui";
export * from "./inventarios.widgets";
export * from "./inventarios.constants";
