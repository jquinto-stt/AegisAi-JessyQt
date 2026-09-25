export type FSMState =
  | 'IDLE'
  | 'CATALOGO_ACTIVO'
  | 'CARRITO_EN_CONSTRUCCION'
  | 'SOLICITANDO_ENTREGA'
  | 'SOLICITANDO_DIRECCION'
  | 'CONFIRMANDO_PEDIDO'
  | 'CONFIRMANDO_CANCELACION'
  | 'CONFIRMANDO_RETOMA'
  | 'MODO_HUMANO';

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
  | 'DUDA_PROCESO_PEDIDO'
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
  orderCreated?: {
    id: string;
    numero: string;
    total: number;
    modalidad?: 'domicilio' | 'retiro';
    direccion?: string | null;
    lineas?: CartLine[];
  };
}
