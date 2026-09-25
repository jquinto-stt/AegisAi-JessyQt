import type { NLUResult, CatalogItem } from './types.js';

function normStr(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export class TelegramNLU {
  /**
   * FAST-PATH DETERMINISTA (< 1ms):
   * Captura comandos de botones rápidos, teclados inline y comandos de sistema (/start).
   * Si el usuario escribió un texto libre o lenguaje natural, devuelve null para que
   * el motor semántico (Azure Structured Outputs) haga la extracción real sin regex frágiles.
   */
  interpretarFastPath(texto: string, catalogo: CatalogItem[], estadoActual?: string): NLUResult | null {
    const raw = (texto || '').trim();
    const norm = normStr(raw);

    // 0. Bloqueo inmediato de fuera de dominio puro (matemáticas)
    if (/^(?:cuanto\s+es\s+)?\d+\s*[\+\-\*\/xX]\s*\d+\s*\??$/i.test(norm) || /^(?:calcula|suma|resta|multiplica|divide)\s+\d+/i.test(norm)) {
      return { intent: 'FUERA_DE_DOMINIO', confidence: 1.0, entities: {}, rawText: raw };
    }

    // 1. Comandos de inicio y saludo básico
    if (norm === '/start' || norm === 'hola' || norm === 'buenas' || norm === 'buenos dias' || norm === 'buenas tardes') {
      return { intent: 'SALUDO', confidence: 1.0, entities: {}, rawText: raw };
    }

    // 2. Botones de Catálogo y Menú
    if (norm === 'ver catalogo' || norm === 'ver menu' || norm === 'catalogo' || norm === 'menu' || norm === 'ver menu 📜' || norm === 'ver catalogo 📜') {
      return { intent: 'VER_CATALOGO', confidence: 1.0, entities: {}, rawText: raw };
    }

    // 3. Botones de Modalidad y consultas sobre opciones de entrega
    if (
      (estadoActual === 'SOLICITANDO_ENTREGA' || estadoActual === 'CARRITO_EN_CONSTRUCCION') &&
      (norm.includes('opcion') || norm.includes('opciones') || norm.includes('cuales') || norm.includes('como entregan') || norm.includes('como es'))
    ) {
      return { intent: 'DUDA_PROCESO_PEDIDO', confidence: 1.0, entities: {}, rawText: raw };
    }

    if (norm === '🛵 a domicilio' || norm === 'a domicilio' || norm === 'domicilio' || norm === 'envio a domicilio') {
      return { intent: 'ELEGIR_MODALIDAD', confidence: 1.0, entities: { modalidad: 'domicilio' }, rawText: raw };
    }
    if (norm === '🛍️ para retirar' || norm === 'para retirar' || norm === 'retiro' || norm === 'retiro en local' || norm === 'para llevar' || norm.includes('recoger') || norm.includes('retirar')) {
      return { intent: 'ELEGIR_MODALIDAD', confidence: 1.0, entities: { modalidad: 'retiro' }, rawText: raw };
    }

    // 4. Botones de Flujo de Entrega / Carrito
    if (norm === '🛵 proceder a la entrega' || norm === 'proceder a la entrega' || norm === 'ya con eso' || norm === 'no ya con eso' || norm === 'eso es todo') {
      return { intent: 'PROCEDER_ENTREGA', confidence: 1.0, entities: {}, rawText: raw };
    }
    if (norm === '➕ agregar mas' || norm === '➕ agregar mas productos' || norm === 'agregar mas' || norm === 'agregar mas productos' || norm.includes('catalogo') || norm.includes('menu') || norm.includes('ver productos') || norm.includes('la carta') || norm === 'ver menu') {
      return { intent: 'VER_CATALOGO', confidence: 1.0, entities: {}, rawText: raw };
    }

    // 5. Botones de Confirmación y Cancelación
    const esAfirmativo = /^(?:si|sí|claro|dale|por favor|porfa|de una|obvio|yes)$/i.test(norm);
    if (esAfirmativo) {
      if (estadoActual === 'CONFIRMANDO_PEDIDO') {
        return { intent: 'CONFIRMAR_PEDIDO', confidence: 1.0, entities: {}, rawText: raw };
      }
      if (estadoActual === 'CONFIRMANDO_CANCELACION') {
        return { intent: 'CONFIRMAR_CANCELACION_SI', confidence: 1.0, entities: {}, rawText: raw };
      }
      return { intent: 'VER_CATALOGO', confidence: 1.0, entities: {}, rawText: raw };
    }

    if (norm === '✅ confirmar pedido' || norm === 'confirmar pedido' || norm === 'si confirmar' || norm === 'confirmar orden') {
      return { intent: 'CONFIRMAR_PEDIDO', confidence: 1.0, entities: {}, rawText: raw };
    }
    if (norm === 'si, cancelar pedido ❌' || norm === 'si, cancelar pedido' || norm === 'si cancelar' || norm === 'si cancelar orden') {
      return { intent: 'CONFIRMAR_CANCELACION_SI', confidence: 1.0, entities: {}, rawText: raw };
    }
    if (norm === 'no, mantener pedido ✅' || norm === 'no, mantener pedido' || norm === 'no mantener' || norm === 'mantener pedido' || norm === 'mantener orden') {
      return { intent: 'CONFIRMAR_CANCELACION_NO', confidence: 1.0, entities: {}, rawText: raw };
    }
    const matchCancelNum = norm.match(/^(?:❌\s*)?cancelar(?:\s+el)?(?:\s+pedido|\s+la\s+orden|\s+orden)?(?:\s+#?web-|\s+#|\s+)?(\d{2,4})$/i);
    if (matchCancelNum) {
      return { intent: 'CANCELAR_PEDIDO', confidence: 1.0, entities: { numeroPedido: matchCancelNum[1] }, rawText: raw };
    }
    if (norm === '❌ cancelar' || norm === 'cancelar pedido ❌' || norm === 'cancelar pedido' || norm === '❌ cancelar pedido' || norm === 'cancelar' || norm === 'cancelar orden') {
      return { intent: 'CANCELAR_PEDIDO', confidence: 1.0, entities: {}, rawText: raw };
    }
    if (norm === '✏️ modificar' || norm === 'modificar' || norm === 'modificar pedido' || norm === 'modificar orden') {
      return { intent: 'MODIFICAR_CANTIDAD', confidence: 1.0, entities: {}, rawText: raw };
    }

    // 6. Botones de Utilidad
    if (norm === '📦 estado del pedido' || norm === 'estado del pedido' || norm === 'como va mi pedido' || norm === 'mis pedidos' || norm === 'ver pedidos' || norm === 'pedidos' || norm === 'estado de mis pedidos' || norm === 'consultar pedidos') {
      return { intent: 'CONSULTA_ESTADO_PEDIDO', confidence: 1.0, entities: {}, rawText: raw };
    }
    if (norm === '👤 hablar con asesor' || norm === 'hablar con asesor 👤' || norm === 'asesor' || norm === 'humano' || norm === 'hablar con asesor') {
      return { intent: 'SOLICITAR_HUMANO', confidence: 1.0, entities: {}, rawText: raw };
    }
    if (norm === '🛒 hacer otro pedido' || norm.includes('otro pedido') || norm.includes('nuevo pedido') || norm.includes('otra orden') || norm.includes('hacer otro') || norm.includes('pedir otra cosa')) {
      return { intent: 'REINICIAR_PEDIDO', confidence: 1.0, entities: {}, rawText: raw };
    }

    // 7. Clicks en botones numerados del menú (ej. "1. Combo...", "2. Papas...")
    const matchBtnOrdinal = norm.match(/^(\d+)\.\s*(.+)/);
    if (matchBtnOrdinal) {
      const idx = parseInt(matchBtnOrdinal[1], 10);
      if (idx >= 1 && idx <= catalogo.length) {
        return {
          intent: 'SELECCION_POR_ORDINAL',
          confidence: 1.0,
          entities: { ordinalIndex: idx },
          rawText: raw,
        };
      }
    }

    // Si no es un botón explícito ni comando directo, retornar null para análisis semántico por LLM
    return null;
  }

  /**
   * FALLBACK LOCAL (por si la red o Azure no responden)
   */
  interpretarFallbackLocal(texto: string, catalogo: CatalogItem[], estadoActual?: string): NLUResult {
    const raw = (texto || '').trim();
    const norm = normStr(raw);

    const fast = this.interpretarFastPath(texto, catalogo, estadoActual);
    if (fast) return fast;

    if (estadoActual === 'SOLICITANDO_DIRECCION' && (/\d+/.test(raw) || norm.includes('calle') || norm.includes('carrera') || norm.includes('diagonal'))) {
      return { intent: 'DAR_DIRECCION', confidence: 0.8, entities: { direccion: raw }, rawText: raw };
    }

    return { intent: 'DESCONOCIDO', confidence: 0.5, entities: {}, rawText: raw };
  }
}