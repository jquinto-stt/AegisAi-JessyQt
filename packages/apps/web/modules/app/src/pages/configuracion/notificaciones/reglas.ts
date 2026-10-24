/**
 * Reglas de notificaciones de la organización.
 *
 * ── Por qué en `localStorage` y no en el store ────────────────────────────
 *
 * Sigue el mismo patrón que `pedidos_canales_integraciones`: es configuración
 * de mensajería que se lee en varios sitios (esta pantalla y, más adelante, el
 * motor de envío) sin ser identidad de la organización. Una clave propia evita
 * mezclarla con `organizacion.v1`, que ya carga archivos pesados.
 *
 * ── Lo que este módulo NO hace ────────────────────────────────────────────
 *
 * No envía nada. No hay servidor de correo ni de WhatsApp, y el cobro por
 * mensaje del que habla la pantalla no se descuenta de ninguna billetera: no
 * hay billetera. La UI lo dice donde corresponde.
 */

export interface ReglaNotificacion {
  id: string;
  titulo: string;
  /** Interruptor maestro de la regla. */
  activa: boolean;
  correo: boolean;
  whatsapp: boolean;
  /** Cuerpo de la plantilla de correo. `{cliente}` y `{guia}` son marcadores. */
  plantillaCorreo: string;
  /** Cuerpo de la plantilla de WhatsApp (texto plano, sin formato). */
  plantillaWhatsapp: string;
}

export interface ConfigNotificaciones {
  /** Número de servicio al cliente que se comparte con el cliente final. */
  numeroServicio: string;
  /**
   * ¿Se aceptó el cobro por mensaje de WhatsApp?
   *
   * Sin esto, la columna de WhatsApp no se puede activar: el concepto pide una
   * confirmación explícita con el costo antes de encender el canal.
   */
  whatsappActivado: boolean;
  reglas: ReglaNotificacion[];
}

const CLAVE = "necto.reglas_notificaciones";

/** Número por defecto: el mismo del concepto, para que la pantalla no nazca vacía. */
const NUMERO_POR_DEFECTO = "3774474574";

export const REGLAS_POR_DEFECTO: ReglaNotificacion[] = [
  {
    id: "guia-generada",
    titulo: "Guía generada",
    activa: true,
    correo: true,
    whatsapp: false,
    plantillaCorreo:
      "Hola {cliente}: tu pedido fue registrado y ya tiene guía {guia}. Puedes seguir el envío con ese número.",
    plantillaWhatsapp:
      "Hola {cliente} 👋 Tu pedido ya tiene guía *{guia}*. Puedes seguir el envío con ese número.",
  },
  {
    id: "en-transito",
    titulo: "Tu pedido está en tránsito",
    activa: true,
    correo: true,
    whatsapp: false,
    plantillaCorreo:
      "Hola {cliente}: tu pedido va en camino. Guía {guia}. Te avisaremos cuando llegue a la ciudad de destino.",
    plantillaWhatsapp: "Hola {cliente} 🚚 Tu pedido va en camino. Guía *{guia}*.",
  },
  {
    id: "retraso-carretera",
    titulo: "Novedad (Informativa) · Retrasos en carretera",
    activa: true,
    correo: true,
    whatsapp: false,
    plantillaCorreo:
      "Hola {cliente}: tu pedido puede tardar un poco más por retrasos en carretera. Guía {guia}.",
    plantillaWhatsapp:
      "Hola {cliente} ⚠️ Tu pedido puede tardar un poco más por retrasos en carretera. Guía *{guia}*.",
  },
  {
    id: "llega-hoy",
    titulo: "Tu pedido llegará hoy",
    activa: true,
    correo: true,
    whatsapp: false,
    plantillaCorreo: "Hola {cliente}: tu pedido llega hoy. Ten a mano tu documento para recibirlo.",
    plantillaWhatsapp: "Hola {cliente} 📦 Tu pedido llega HOY. Ten a mano tu documento.",
  },
  {
    id: "entregado",
    titulo: "Tu pedido fue entregado",
    activa: true,
    correo: true,
    whatsapp: false,
    plantillaCorreo: "Hola {cliente}: tu pedido fue entregado. Gracias por tu compra.",
    plantillaWhatsapp: "Hola {cliente} ✅ Tu pedido fue entregado. ¡Gracias por tu compra!",
  },
  {
    id: "cliente-ausente",
    titulo: "Novedad (De gestión) · Cliente Ausente/Desconocido",
    activa: true,
    correo: true,
    whatsapp: false,
    plantillaCorreo:
      "Hola {cliente}: no pudimos entregar tu pedido porque no había nadie en la dirección. Guía {guia}.",
    plantillaWhatsapp:
      "Hola {cliente}: no pudimos entregar tu pedido, no había nadie en la dirección. Guía *{guia}*.",
  },
  {
    id: "direccion-incorrecta",
    titulo: "Novedad (De gestión) · Dirección Incorrecta/Incompleta",
    activa: true,
    correo: true,
    whatsapp: false,
    plantillaCorreo:
      "Hola {cliente}: la dirección de tu pedido está incompleta. Escríbenos para corregirla. Guía {guia}.",
    plantillaWhatsapp:
      "Hola {cliente}: la dirección de tu pedido está incompleta. Escríbenos para corregirla. Guía *{guia}*.",
  },
];

export function configPorDefecto(): ConfigNotificaciones {
  return {
    numeroServicio: NUMERO_POR_DEFECTO,
    whatsappActivado: false,
    reglas: REGLAS_POR_DEFECTO.map((r) => ({ ...r })),
  };
}

/**
 * Lee la configuración guardada.
 *
 * Se normaliza contra el catálogo de reglas en vez de confiar en lo guardado:
 * si mañana se añade una regla nueva, una configuración vieja no la tendría y
 * la pantalla la pintaría como inexistente. Las reglas nuevas entran con sus
 * valores por defecto y las guardadas conservan lo suyo.
 */
export function leerNotificaciones(): ConfigNotificaciones {
  const base = configPorDefecto();
  if (typeof localStorage === "undefined") return base;

  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return base;

    const guardado = JSON.parse(raw) as Partial<ConfigNotificaciones>;
    const porId = new Map((guardado.reglas ?? []).map((r) => [r.id, r]));

    return {
      numeroServicio: guardado.numeroServicio ?? base.numeroServicio,
      whatsappActivado: Boolean(guardado.whatsappActivado),
      reglas: base.reglas.map((r) => {
        const previa = porId.get(r.id);
        return previa ? { ...r, ...previa } : r;
      }),
    };
  } catch {
    return base;
  }
}

export function guardarNotificaciones(config: ConfigNotificaciones): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(config));
  } catch {
    // Sin localStorage o cuota llena: no-op. La pantalla mantiene su estado.
  }
}
