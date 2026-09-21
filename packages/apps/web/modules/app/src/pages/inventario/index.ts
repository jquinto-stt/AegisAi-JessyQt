// Barrell de las superficies de Inventario.
//
// Los nombres exportados son los que `App.tsx` importa, y son los únicos que
// llevan el módulo en el nombre: dentro de `pages/inventario/` las páginas se
// llaman `InicioPage` / `ExistenciasPage` / `MovimientosPage` / `ConfigPage`,
// igual que en `pages/pedidos/`. `App.tsx` las aliasa al importarlas, que es
// como ya resuelve la colisión entre los dos `ConfigPage`.
export { InicioPage as InventarioInicioPage } from "./InicioPage";
export { ExistenciasPage } from "./ExistenciasPage";
export { MovimientosPage } from "./MovimientosPage";
export { ConfigPage as InventarioConfigPage } from "./ConfigPage";
