// ═══════════════════════════════════════════════════════════════════════════
// ADAPTADORES: filas de `necto` ──▶ tipos de dominio del frontend
// ═══════════════════════════════════════════════════════════════════════════
//
// Traduce lo que hay en la base a los contratos que el store ya conoce
// (`Conversacion`, `Mensaje`, `Contacto`, …). El store NO se toca: sigue
// recibiendo los mismos tipos, solo que ahora pueden venir de Supabase.
//
// ── Los desajustes reales que estos adaptadores resuelven ──────────────────
//
// Medidos contra la base el 22/09/2026, columna por columna. Ninguno es
// hipotético:
//
// 1. **`conversacion.estado` NO es el `EstadoConversacion` del frontend.**
//    La base usa `nueva | abierta | …`; el frontend `abierta | en_espera |
//    atendida | cerrada`. Valores vistos en la base: `abierta`, `nueva`.
//    `nueva` no existe en el tipo del frontend y hay que mapearlo, no castearlo:
//    un cast deja pasar un valor que la UI no sabe pintar.
//
// 2. **`mensaje.autor` usa `asistente`, no `bot`.** La base: `cliente`,
//    `asistente`. El frontend: `cliente`, `negocio`, `bot`. `asistente` → `bot`.
//    Un `asistente` sin mapear cae fuera del tipo y la UI lo rotula mal o no lo
//    pinta.
//
// 3. **`modo_atencion` es 1:1** (`bot` | `humano`) y coincide con `atencion`.
//    Es el único de los tres que no necesita traducción.
//
// 4. **`mensaje.contenido` es jsonb** con forma `{ texto: "..." }`, que es
//    justo el envoltorio `MensajeContenido` del frontend (`{tipo, texto}`). Se
//    rellena `tipo: 'texto'` porque en el MVP todo es texto. Un contenido con
//    otra forma NO se inventa: se descarta el texto y se deja vacío, para que
//    no aparezca como mensaje en blanco sin explicación.
//
// 5. **El contacto viene en tabla aparte.** `conversacion` solo tiene
//    `contacto_id`. El frontend espera `contacto` anidado dentro de
//    `Conversacion`, así que hay que unir en memoria.
import type {
  Conversacion,
  EstadoConversacion,
  Mensaje,
  MensajeContenido,
  AutorMensaje,
  ModoAtencion,
  ModuloDestino,
  CanalId,
  Contacto,
} from "@/stores/conversaciones.types";

// ── Formas crudas de la base ───────────────────────────────────────────────
// Se declaran explícitamente y no se usa `any`: si el DDL cambia, queremos un
// error de compilación, no un `undefined` silencioso en tiempo de ejecución.

export interface FilaContacto {
  id: string;
  organizacion_id: string;
  telefono: string;
  telefono_norm: string | null;
  nombre: string | null;
  origen: string | null;
}

export interface FilaConversacion {
  id: string;
  organizacion_id: string;
  contacto_id: string;
  canal: string;
  estado: string;
  modo_atencion: string;
  modulo_destino: string | null;
  no_leidos: number | null;
  creada_en: string;
  actualizada_en: string | null;
  zernio_conversation_id: string | null;
}

export interface FilaMensaje {
  id: string;
  conversacion_id: string;
  autor: string;
  contenido: unknown;
  enviado_en: string;
  zernio_event_id: string | null;
}

// ── Traducciones ───────────────────────────────────────────────────────────

/**
 * Estado de la base al estado del frontend.
 *
 * `nueva` no tiene equivalente exacto. Se mapea a `abierta` a propósito y no
 * se añade `nueva` al tipo: el estado del frontend describe la máquina de
 * atención (¿la lleva el bot, un humano, está cerrada?), y una conversación
 * recién creada está, por definición, abierta y sin tomar. Añadir un quinto
 * valor obligaría a tocar cada `switch` de la UI para un matiz que nadie
 * distingue en pantalla.
 */
export function estadoDeBase(v: string): EstadoConversacion {
  switch (v) {
    case "cerrada":
      return "cerrada";
    case "atendida":
      return "atendida";
    case "en_espera":
      return "en_espera";
    case "abierta":
    case "nueva":
      return "abierta";
    default:
      // Un valor que no conocemos no se inventa: se trata como abierta, que es
      // el estado neutro, y queda visible en el log si algún día aparece.
      return "abierta";
  }
}

/**
 * Autoría de la base al frontend.
 *
 * `asistente` → `bot`. Ver el punto 2 de la cabecera: es el desajuste que más
 * callado falla, porque `asistente` no está en el tipo del frontend.
 */
export function autorDeBase(v: string): AutorMensaje {
  switch (v) {
    case "cliente":
      return "cliente";
    case "asistente":
    case "bot":
      return "bot";
    case "negocio":
    case "operador":
      return "negocio";
    default:
      return "negocio";
  }
}

/** Modo de atención: la base y el frontend ya coinciden. */
export function atencionDeBase(v: string): ModoAtencion {
  return v === "humano" ? "humano" : "bot";
}

/** Canal: whatsapp o telegram. */
export function canalDeBase(v: string): CanalId {
  if (v === "telegram") return "telegram";
  return "whatsapp";
}

/** Módulo destino, restringido a los valores que el frontend conoce. */
export function moduloDeBase(v: string | null): ModuloDestino | undefined {
  if (v === "pedidos" || v === "inventario" || v === "general") return v;
  return undefined;
}

/**
 * Contenido jsonb al envoltorio tipado.
 *
 * Solo se acepta texto. Cualquier otra forma (imagen, adjunto, o un jsonb
 * inesperado) devuelve texto vacío en vez de un `[object Object]` pintado en la
 * burbuja del chat.
 */
export function contenidoDeBase(v: unknown): MensajeContenido {
  if (v && typeof v === "object" && "texto" in v) {
    const t = (v as { texto?: unknown }).texto;
    if (typeof t === "string") return { tipo: "texto", texto: t };
  }
  if (typeof v === "string") return { tipo: "texto", texto: v };
  return { tipo: "texto", texto: "" };
}

// ── Composición ────────────────────────────────────────────────────────────

/**
 * Une contactos y conversaciones en el tipo `Conversacion` del frontend.
 *
 * Una conversación sin su contacto NO se descarta en silencio: se descarta y se
 * cuenta, porque una cabecera de bandeja sin teléfono es una fila que la UI no
 * puede cruzar con Pedidos (el teléfono es la clave de cruce). Mostrarla sería
 * enseñar un hilo sin forma de saber de quién es.
 */
export function construirConversaciones(
  filasConv: FilaConversacion[],
  filasCont: FilaContacto[]
): { conversaciones: Conversacion[]; huerfanas: number } {
  const porId = new Map(filasCont.map((c) => [c.id, c]));
  const conversaciones: Conversacion[] = [];
  let huerfanas = 0;

  for (const f of filasConv) {
    const c = porId.get(f.contacto_id);
    if (!c) {
      huerfanas++;
      continue;
    }

    const esTelegram =
      f.canal === "telegram" ||
      c.origen === "telegram" ||
      c.telefono?.startsWith("tg:");
    const canal: CanalId = esTelegram ? "telegram" : canalDeBase(f.canal);

    const contacto: Contacto = {
      telefono: c.telefono,
      nombre: c.nombre ?? c.telefono,
      origen: esTelegram ? "telegram" : "whatsapp",
    };

    conversaciones.push({
      id: f.id,
      canal,
      contacto,
      estado: estadoDeBase(f.estado),
      atencion: atencionDeBase(f.modo_atencion),
      // El frontend espera `string | null`. La base no tiene esta columna
      // poblada todavía, así que `null` es la verdad: nadie la ha tomado.
      operadorAsignadoId: null,
      noLeidos: f.no_leidos ?? 0,
      // `ultimaActividad` cae a `creada_en` si nunca se actualizó: una
      // conversación sin actividad posterior sigue existiendo, y `undefined`
      // rompería el orden de la bandeja.
      ultimaActividad: f.actualizada_en ?? f.creada_en,
    });
  }

  return { conversaciones, huerfanas };
}

/** Mensajes crudos al tipo del frontend. Descarta los de contenido vacío. */
export function construirMensajes(filas: FilaMensaje[]): Mensaje[] {
  const salida: Mensaje[] = [];
  for (const f of filas) {
    const m = convertirFilaMensaje(f);
    if (m) salida.push(m);
  }
  return salida;
}

/** Convierte una sola fila de mensaje de Supabase al tipo del frontend */
export function convertirFilaMensaje(f: FilaMensaje): Mensaje | null {
  const contenido = contenidoDeBase(f.contenido);
  if (!contenido.texto || contenido.texto.trim() === "") return null;
  return {
    id: f.id,
    conversacionId: f.conversacion_id,
    autor: autorDeBase(f.autor),
    contenido,
    timestamp: f.enviado_en,
  };
}

