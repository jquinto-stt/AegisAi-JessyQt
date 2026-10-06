// Re-export from shell (canonical location)
export { uiStore, UIStore } from '@/shell/stores';
export type { Theme, UIPreferences } from '@/shell/stores';

// Domain stores
export { pedidosStore, PedidosStore, ETIQUETA_PAGO, META_ESTADO_PEDIDO, ORDEN_ESTADOS } from '@/stores/pedidos.store';
export type {
  Pedido,
  PedidoEstado,
  PedidoItem,
  PedidosConfig,
  CatalogoItem,
  PlantillasWhatsApp,
  DireccionEntrega,
  MetodoPago,
} from '@/stores/pedidos.store';
export type { Modalidad, Modalidad as ModalidadPedido } from '@/stores/pedidos.store';


export { sessionStore, SessionStore, modulosOperablesDeSesion } from '@/stores/session.store';
export type { Modulo, TipoSesion, AccessContext, DataScope } from '@/stores/session.store';

export { organizacionStore, OrganizacionStore } from '@/stores/organizacion.store';
export type {
  UsuarioPerfil,
  RedesSociales,
  DireccionPerfil,
  OrganizacionWorkspace,
  OnboardingStep,
} from '@/stores/organizacion.store';

export {
  rolesStore,
  RolesStore,
  CAPACIDADES,
  CAPACIDAD_LABEL,
  CAPACIDAD_GRUPOS,
  ROLES_SEED,
  ROL_ADMIN,
} from '@/stores/roles.store';
export type { Rol, Capacidad, CapacidadGrupo, PortadorDeRol } from '@/stores/roles.store';

export { operadoresStore, OperadoresStore, SECCIONES } from '@/stores/operadores.store';
export type { Operador, OperadorEstado, Seccion } from '@/stores/operadores.store';

export {
  conversacionesStore,
  ConversacionesStore,
  normalizarTelefono,
  ESTADO_CONVERSACION_META,
  etiquetaEstado,
  badgeEstado,
  presenciaDe,
  ETIQUETA_RESOLVER,
  ATENCION_LABEL,
  ATENCION_BADGE,
} from '@/stores/conversaciones.store';
export type {
  Conversacion as ConversacionCanal,
  EstadoConversacion,
  PresenciaContacto,
  ModoAtencion,
  Mensaje as MensajeCanal,
  EventoSistema,
  ItemLineaTiempo,
  FiltroBandeja,
} from '@/stores/conversaciones.types';

export { AssistantStore, assistantStore } from './assistant.store';
export type { Conversacion, GrupoConversaciones } from './assistant.store';

// Módulos integrados: qué módulos tiene conectados el Asistente de Necto.
export {
  integracionesStore,
  IntegracionesStore,
  MODULOS_INTEGRABLES,
  ORDEN_MODULOS_INTEGRABLES,
  IDS_MODULOS_INTEGRABLES,
} from './integraciones.store';
export type {
  ModuloIntegrable,
  EntradaModuloIntegrable,
  EntradaDisponible,
  EntradaDeclarada,
} from './integraciones.store';

// NIVEL 1 — Catálogo de la plataforma: qué módulos y conectores EXISTEN.
// Solo lectura. Qué tiene activado una organización es nivel 2 (`organizacionStore`).
export {
  plataformaStore,
  PlataformaStore,
  CATALOGO_MODULOS,
  DETALLE_CONECTORES,
  IDS_CONECTORES,
} from './plataforma.store';
export type {
  IdModuloNegocio,
  IdConector,
  InfoModuloNegocio,
  InfoConectorModulo,
  EstadoModuloNegocio,
} from './plataforma.store';

// Helpers de capacidad para las páginas (capa de conveniencia sobre hasPermission)
export {
  puede,
  CAPACIDAD_POR_DESTINO,
  puedeMoverA,
  capacidadParaAvanzar,
  puedeConfirmarPedido,
  puedePrepararPedido,
  puedeCancelarPedido,
  puedeCrearPedido,
  puedeVerProgramados,
  puedeGestionarProgramados,
  puedeEscribirCliente,
  puedeEditarPlantillas,
  puedeVerConversaciones,
  puedeResponderConversacion,
  puedeGuardarConfig,
  puedeVerConfig,
  puedeGestionarEquipo,
  motivoSinPermiso,
  // Inventarios
  puedeVerInventarios,
  puedeContarInventario,
  puedeGestionarCatalogo,
  puedeFinalizarInventario,
  puedeConfigurarInventarios,
} from '@/stores/acceso.utils';

// Inventarios — conteos. Sin dependencias de otros módulos: los actores se
// pasan como `actorId` y los nombres legibles viven en su propio seed.
export {
  inventariosStore,
  InventariosStore,
  ORDEN_ESTADOS_LINEA,
  ORDEN_ESTADOS_INVENTARIO,
  ORDEN_ESTADOS_ELEMENTO,
} from '@/stores/inventarios.store';
export type {
  ResultadoMutacion,
  EntradaLinea,
  DatosElemento,
  DatosUbicacion,
  DatosInventario,
} from '@/stores/inventarios.store';

export { NOMBRES_ACTORES, nombreDeActor, RESPONSABLE_POR_DEFECTO } from '@/stores/inventarios.seed';

// Dominio de Inventarios — tipos y funciones puras. Se re-exporta para que las
// páginas importen de un solo sitio sin depender de la ruta interna del dominio.
export * from '@/domain/inventarios/inventarios.domain';
