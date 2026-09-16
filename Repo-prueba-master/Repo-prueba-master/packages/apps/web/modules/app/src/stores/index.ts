// Re-export from shell (canonical location)
export { uiStore, UIStore } from '@/shell/stores';
export type { Theme, UIPreferences } from '@/shell/stores';

// Session store
export { sessionStore, SessionStore } from '@/stores/session.store';
export type { Modulo, Rol } from '@/stores/session.store';

// Pedidos store
export { pedidosStore, PedidosStore } from '@/stores/pedidos.store';
export type {
  Pedido,
  PedidoItem,
  PedidoEstado,
  Modalidad,
  PedidosConfig,
} from '@/stores/pedidos.store';

// Operadores store
export { operadoresStore, OperadoresStore, SECCIONES } from '@/stores/operadores.store';
export type { Operador, OperadorEstado, Seccion } from '@/stores/operadores.store';
