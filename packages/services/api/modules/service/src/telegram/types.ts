export type FSMState =
  | 'IDLE'
  | 'ONBOARDING_NOMBRE'
  | 'ONBOARDING_APELLIDO'
  | 'ONBOARDING_EMAIL'
  | 'ONBOARDING_TELEFONO'
  | 'ONBOARDING_CONFIRMAR'
  | 'ONBOARDING_PRIVACIDAD'
  | 'SELECCIONANDO_DESTINATARIO'
  | 'SOLICITANDO_RECEPTOR_NOMBRE'
  | 'SOLICITANDO_RECEPTOR_TELEFONO'
  | 'SOLICITANDO_ENTREGA_PREVIA'
  | 'SOLICITANDO_DIRECCION_PREVIA'
  | 'CATALOGO_ACTIVO'
  | 'CARRITO_EN_CONSTRUCCION'
  | 'SOLICITANDO_ENTREGA'
  | 'SOLICITANDO_DIRECCION'
  | 'CONFIRMANDO_PEDIDO'
  | 'CONFIRMANDO_CANCELACION'
  | 'CONFIRMANDO_RETOMA'
  | 'MODO_HUMANO';

export interface ClientePerfil {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  terminosAceptados: boolean;
  completado: boolean;
}

export interface DestinatarioInfo {
  tipo: 'propio' | 'tercero';
  nombre?: string;
  telefono?: string;
}

export interface CartLine {
  productId: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
}

export interface CartDraft {
  lineas: CartLine[];
  modalidad: 'domicilio' | 'retiro' | null;
  direccion: string | null;
  destinatario?: DestinatarioInfo | null;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  disponible: boolean;
}

export interface BusinessProfile {
  perfilComercial: string; // 'food' | 'retail' | 'services'
  etiquetaCatalogo: string; // 'Menú' | 'Productos disponibles' | 'Servicios disponibles'
  costoEnvio: number;
  horarioAtencion: string;
}

export type IntentType =
  | 'SALUDO'
  | 'VER_CATALOGO'
  | 'AGREGAR_ITEMS'
  | 'MODIFICAR_CANTIDAD'
  | 'ELIMINAR_ITEM'
  | 'SUSTITUIR_ITEM'
  | 'ELEGIR_MODALIDAD'
  | 'DAR_DIRECCION'
  | 'CONFIRMAR_PEDIDO'
  | 'CANCELAR_PEDIDO'
  | 'REINICIAR_PEDIDO'
  | 'CONSULTA_COSTO_ENVIO'
  | 'CONSULTA_HORARIO'
  | 'CONSULTA_ESTADO_PEDIDO'
  | 'SOLICITAR_HUMANO'
  | 'SELECCION_POR_ORDINAL'
  | 'CONTINUAR_RETOMA'
  | 'DESCARTAR_RETOMA'
  | 'CONFIRMAR_CANCELACION_SI'
  | 'CONFIRMAR_CANCELACION_NO'
  | 'PROCEDER_ENTREGA'
  | 'FUERA_DE_DOMINIO'
  | 'CONSULTAR_PRODUCTO'
  | 'CONSULTAR_PRECIO'
  | 'CONSULTAR_STOCK_INVENTARIO'
  | 'CONSULTAR_ALERTAS_INVENTARIO'
  | 'CONSULTAR_RESUMEN_INVENTARIO'
  | 'CONSULTAR_BODEGAS'
  | 'DUDA_PROCESO_PEDIDO'
  | 'VER_MENU_PRINCIPAL'
  | 'DESTINATARIO_PROPIO'
  | 'DESTINATARIO_TERCERO'
  | 'DESCONOCIDO';

export interface ExtractedEntity {
  nombreItem?: string;
  cantidad?: number;
  modalidad?: 'domicilio' | 'retiro';
  direccion?: string;
  ordinalIndex?: number;
  reemplazarItem?: string;
  nuevoItem?: string;
  numeroPedido?: string;
  articulo?: string;
  bodega?: string;
}

export interface NLUResult {
  intent: IntentType;
  confidence: number;
  entities: ExtractedEntity;
  itemsParaAgregar?: { query: string; cantidad: number }[];
  rawText: string;
}

export interface FSMTransitionResult {
  nextState: FSMState;
  nextDraft: CartDraft | null;
  replyText: string;
  buttons: string[];
  removeKeyboard?: boolean;
  orderCancelledId?: string;
  clientePerfil?: ClientePerfil | null;
  orderCreated?: {
    id: string;
    numero: string;
    total: number;
    modalidad?: 'domicilio' | 'retiro';
    direccion?: string | null;
    destinatario?: DestinatarioInfo | null;
    lineas?: CartLine[];
  };
}
