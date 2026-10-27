/**
 * Etapas del pipeline comercial (Seguimiento) — fuente única.
 *
 * ── Qué problema resuelve este archivo (26/10) ──────────────────────────────
 *
 * La etapa de una conversación se calculaba en DOS sitios con la misma regla
 * copiada (`SeguimientoPipelineView` y `ChatEnVivoBoard`), y la regla miraba
 * solo el estado del HILO: `cerrada → Validación de pago`. Eso convertía la
 * última columna del embudo en un cajón de sastre:
 *
 *   · Un hilo cerrado SIN pedido —una consulta de horarios— caía en «Validación
 *     de pago», que es la columna que más importa del tablero. En el seed pasa
 *     literalmente: `conv-8` es una consulta resuelta y el propio seed dice
 *     «demuestra que un hilo puede terminar sin que nadie compre nada».
 *   · Un hilo cerrado CON el pedido ya entregado y pagado seguía en «Validación
 *     de pago» para siempre, con la tarjeta rotulada «Lead · Sin valor».
 *   · Un pedido esperando que se validara una transferencia no aparecía ahí si
 *     el hilo seguía abierto.
 *
 * ── La regla ───────────────────────────────────────────────────────────────
 *
 * El HILO dice quién atiende; el PEDIDO dice dónde va la venta. Cuando hay
 * pedido, manda el pedido. Cuando no lo hay, no existe ninguna otra señal y se
 * usa el estado del hilo — con una consecuencia que conviene tener escrita:
 * sin cotización en el sistema, «Oferta Enviada» y «Seguimiento» son
 * APROXIMACIONES a partir de si hay un asesor encima del hilo o de si el
 * cliente está esperando respuesta. No se inventan un campo para fingir
 * precisión.
 *
 *   CON pedido (el pedido manda), en este orden:
 *     1. cobro en trámite     → Validación de pago   manda el DINERO
 *     2. programado           → Oferta Enviada       agendado, aún no entró
 *     3. nuevo / confirmado   → En Cierre            falta arrancar preparación
 *     4. en_preparacion o más → null                 venta ganada: sale del embudo
 *
 * El cobro va PRIMERO a propósito. Un pedido por transferencia sin pagar que ya
 * entró a preparación sigue teniendo dinero sin confirmar, y esconderlo porque
 * «la venta ya se cerró» pierde justo lo que esta columna existe para vigilar.
 * El embudo de ventas puede terminar en la confirmación; la COBRANZA no termina
 * hasta que el pago está validado.
 *
 *   SIN pedido (el hilo es la única señal):
 *     abierta               → Contacto Inicial
 *     en_espera             → Seguimiento       el hilo está parado
 *     atendida              → Oferta Enviada    un asesor lo está trabajando
 *     cerrada               → null              resuelto y sin venta
 *
 * `null` significa «fuera del embudo comercial»: la tarjeta no se pinta. Es la
 * pieza que faltaba — un embudo de ventas necesita un final, y sin él las
 * ventas ganadas y los hilos resueltos se acumulaban en la última columna.
 * Quien quiera ver esos pedidos tiene /pedidos (operación) y el historial.
 *
 * La regla es una PARTICIÓN: cada conversación cae en una etapa o en ninguna,
 * nunca en dos, así que los contadores de las columnas suman el total visible.
 */

import { esperaValidacionPago, pedidosStore } from "@/stores/pedidos.store";
import type { ConversacionCanal } from "@/stores";

/** Las cinco etapas del embudo comercial, del primer «hola» al cobro. */
export type EtapaSeguimiento =
  | "contacto_inicial"
  | "oferta_enviada"
  | "seguimiento"
  | "en_cierre"
  | "validacion_pago";

export interface EtapaSeguimientoConfig {
  clave: EtapaSeguimiento;
  label: string;
  /**
   * Clase Tailwind del punto de la columna.
   *
   * El color viaja con la ETAPA, no con la tarjeta: con cinco columnas, el ojo
   * necesita anclar cada tarjeta a su etapa cuando la columna se sale de
   * pantalla.
   */
  punto: string;
}

export const ETAPAS_SEGUIMIENTO: readonly EtapaSeguimientoConfig[] = [
  { clave: "contacto_inicial", label: "Contacto Inicial", punto: "bg-accent-500" },
  { clave: "oferta_enviada", label: "Oferta Enviada", punto: "bg-brand-500" },
  { clave: "seguimiento", label: "Seguimiento", punto: "bg-secondary-500" },
  { clave: "en_cierre", label: "En Cierre", punto: "bg-success-500" },
  { clave: "validacion_pago", label: "Validación de pago", punto: "bg-warning-500" },
];

/**
 * En qué etapa del embudo cae un hilo — o `null` si ya salió del embudo.
 *
 * Ver la cabecera del archivo para la tabla completa y el porqué de cada fila.
 */
export function etapaDe(conv: ConversacionCanal): EtapaSeguimiento | null {
  const pedido = pedidosStore.pedidoActivoDe(conv.contacto.telefono);

  if (pedido) {
    // El cobro manda sobre la etapa de cumplimiento: si el dinero está en
    // trámite, la tarjeta pertenece a «Validación de pago» aunque el pedido ya
    // esté en preparación. Ver la cabecera del archivo.
    if (esperaValidacionPago(pedido)) return "validacion_pago";
    if (pedido.estado === "programado") return "oferta_enviada";
    if (pedido.estado === "nuevo" || pedido.estado === "confirmado") return "en_cierre";
    // en_preparacion, listo, en_camino: venta cerrada y cobro resuelto. Su sitio
    // es /pedidos, no un embudo de ventas.
    return null;
  }

  if (conv.estado === "cerrada") return null;
  if (conv.estado === "en_espera") return "seguimiento";
  if (conv.estado === "atendida") return "oferta_enviada";
  return "contacto_inicial";
}

/** Hilos de una etapa, del más reciente al más viejo. */
export function conversacionesDeEtapa(
  convs: ConversacionCanal[],
  etapa: EtapaSeguimiento,
): ConversacionCanal[] {
  return convs
    .filter((c) => etapaDe(c) === etapa)
    .sort((a, b) => b.ultimaActividad.localeCompare(a.ultimaActividad));
}
