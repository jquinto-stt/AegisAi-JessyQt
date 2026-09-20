import type { ComponentType, SVGProps } from "react";

import {
  CallIcon,
  AlertHexaIcon,
  DollarLineIcon,
  CloseLineIcon,
  PencilIcon,
  TruckDelivery,
} from "@/icons";

// ═══════════════════════════════════════════════════════════════════════════
// NOVEDAD DE ENTREGA — catálogo de motivos y formateo
// ═══════════════════════════════════════════════════════════════════════════
//
// Un repartidor en la calle no puede cerrar una entrega por varios motivos, y
// el motivo NO es decorativo: decide qué hace el negocio después. «Cliente no
// responde» pide reintento; «dirección errónea» pide corregir el dato;
// «rechazó el pago» pide cobrar por otro medio. Un desplegable de texto libre
// obligaría a cada repartidor a inventar su propia taxonomía, y entonces no se
// podría contar nada.
//
// ── Por qué los motivos viven aquí y no en el modal ────────────────────────
// Porque el TEXTO que se anexa a `pedido.notas` y el `id` que se guarda son
// datos, no presentación: `novedadTexto()` se usa desde el puente de
// notificaciones (capa de UI, sin React) y el catálogo lo pinta el modal. Con
// dos copias, la nota y la pastilla podrían divergir — el mismo defecto que
// este proyecto ya retiró de la configuración.
//
// ── Por qué el motivo «otro» exige texto ───────────────────────────────────
// Es la única opción que no dice nada por sí sola. Guardar «Otro» sin detalle
// produce una nota que no le sirve a nadie y un contador que suma un cero. Si
// el repartidor elige «Otro», la observación deja de ser opcional.
// ═══════════════════════════════════════════════════════════════════════════

/** Icono del catálogo `@/icons`. Nunca un emoji: el repo no usa emojis en UI. */
export type IconoMotivo = ComponentType<SVGProps<SVGSVGElement>>;

export interface MotivoNovedad {
  id: string;
  /** Etiqueta corta, la que se pinta en la opción. */
  label: string;
  /**
   * Frase que se anexa a `pedido.notas`. En prosa y en tercera persona: la nota
   * la lee el operador que retoma el pedido, no el repartidor que la escribió.
   */
  texto: string;
  icono: IconoMotivo;
  /** Si es `true`, la observación es obligatoria (no basta con la etiqueta). */
  requiereTexto: boolean;
}

/**
 * Catálogo de motivos, en el orden en que se ofrecen.
 *
 * El orden no es alfabético ni arbitrario: va de lo más frecuente a lo menos,
 * con «otro» al final. Un repartidor con el cliente delante elige el primero
 * que le sirve, así que los tres primeros tienen que ser los tres casos que
 * cubren la mayoría de las entregas fallidas.
 */
export const MOTIVOS_NOVEDAD: MotivoNovedad[] = [
  {
    id: "no_responde",
    label: "Cliente no responde / no estaba",
    texto: "Cliente no responde en el domicilio. Intento fallido.",
    icono: CallIcon,
    requiereTexto: false,
  },
  {
    id: "direccion",
    label: "Dirección errónea o inaccesible",
    texto: "Dirección errónea o inaccesible.",
    icono: AlertHexaIcon,
    requiereTexto: false,
  },
  {
    id: "pago",
    label: "Rechazó pago contra entrega",
    texto: "El cliente rechazó el pago contra entrega o no había vuelto.",
    icono: DollarLineIcon,
    requiereTexto: false,
  },
  {
    id: "cancela_en_puerta",
    label: "Cliente canceló en la puerta",
    texto: "El cliente canceló el pedido al momento de la entrega.",
    icono: CloseLineIcon,
    requiereTexto: false,
  },
  {
    id: "otro",
    label: "Otro motivo",
    texto: "",
    icono: PencilIcon,
    requiereTexto: true,
  },
];

/** Motivo por `id`, o `undefined` si el id no está en el catálogo. */
export function motivoPorId(id: string): MotivoNovedad | undefined {
  return MOTIVOS_NOVEDAD.find((m) => m.id === id);
}

// ── Desenlace: qué pasa con el pedido después de la novedad ────────────────

/**
 * Qué se hace con el pedido tras reportar la novedad.
 *
 * `cancelar` es terminal; `reintentar` lo devuelve al reparto para una segunda
 * vuelta. Se declara como unión y no como booleano porque son dos desenlaces
 * con capacidades DISTINTAS (`orders.cancel` vs `preparation.manage`) y con
 * textos distintos en la nota: un `boolean` obligaría a nombrarlo peor.
 */
export type DesenlaceNovedad = "cancelar" | "reintentar";

export const DESENLACE_LABEL: Record<DesenlaceNovedad, string> = {
  cancelar: "Cancelar el pedido",
  reintentar: "Reintentar la entrega",
};

export const DESENLACE_AYUDA: Record<DesenlaceNovedad, string> = {
  cancelar: "El pedido queda cerrado y sale de la hoja de ruta.",
  reintentar: "El pedido vuelve a «Listo» para un segundo intento.",
};

/**
 * Frase que acompaña al motivo en la nota según el desenlace.
 *
 * Se escribe aparte del motivo en vez de concatenarlo dentro del catálogo: el
 * mismo motivo («cliente no responde») puede terminar en reintento o en
 * cancelación, y la nota tiene que decir cuál fue.
 */
export const DESENLACE_NOTA: Record<DesenlaceNovedad, string> = {
  cancelar: "Se cancela el pedido.",
  reintentar: "Vuelve a la hoja de ruta para reintento.",
};

// ── Formateo de la nota ────────────────────────────────────────────────────

/** `HH:mm` local de 24 horas, con cero a la izquierda. */
export function horaCorta(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Bloque de nota que se anexa a `pedido.notas`.
 *
 * Formato: `[Novedad Logística HH:mm] <frase del motivo>. <detalle> <desenlace>`
 *
 * El prefijo entre corchetes es lo que hace la nota LEGIBLE en una lista de
 * notas acumuladas: `pedido.notas` ya trae texto del cliente («Sin cebolla»,
 * «Mesa 5») y sin marca el añadido se lee como si lo hubiera pedido el cliente.
 * La hora se sella en el momento de confirmar, no cuando se abre el modal: un
 * modal abierto mientras el repartidor llama al cliente debe fechar la llamada,
 * no la apertura.
 *
 * La puntuación se normaliza aquí —no se confía en que el catálogo la traiga—
 * para que un motivo nuevo sin punto final no produzca `...fallido Vuelve a...`.
 */
export function novedadTexto(
  motivo: MotivoNovedad,
  detalle: string,
  desenlace: DesenlaceNovedad,
  cuando: Date = new Date(),
): string {
  const partes: string[] = [];

  const frase = motivo.texto.trim() || motivo.label.trim();
  if (frase) partes.push(/[.;]$/.test(frase) ? frase : `${frase}.`);

  // El detalle libre va tal cual, sin punto forzado: puede ser una dirección o
  // un «timbre 3B» y añadirle puntuación lo estropea más de lo que lo ordena.
  const libre = detalle.trim();
  if (libre) partes.push(libre);

  partes.push(DESENLACE_NOTA[desenlace]);

  return `[Novedad Logística ${horaCorta(cuando)}] ${partes.join(" ")}`;
}

/**
 * Anexa un bloque a unas notas existentes, sin perder las anteriores.
 *
 * Es la razón por la que existe esta función: `pedido.notas` es un campo del
 * cliente y **sobrescribirlo borra lo que pidió**. El bug se ve en el Tablero,
 * que hace `pedido.notas = \`Cancelado: ${motivo}\`` y machaca «Sin cebolla en
 * uno». Aquí se ANEXA siempre.
 */
export function anexarNota(notas: string | undefined, bloque: string): string {
  const previo = (notas ?? "").trim();
  return previo ? `${previo}\n${bloque}` : bloque;
}

// ── Validación del formulario ──────────────────────────────────────────────

/**
 * ¿Se puede confirmar con este motivo y este detalle?
 *
 * Fail-closed: exige un motivo ELEGIDO explícitamente. Sin selección no se
 * confirma, en vez de asumir el primero de la lista — el primero de la lista es
 * «cliente no responde», y asumirlo por defecto escribiría en la nota del
 * cliente un hecho que nadie declaró.
 */
export function puedeConfirmarNovedad(
  motivo: MotivoNovedad | undefined,
  detalle: string,
): boolean {
  if (!motivo) return false;
  if (motivo.requiereTexto && detalle.trim() === "") return false;
  return true;
}

/**
 * Motivo por defecto al abrir el modal: NINGUNO.
 *
 * Devuelve `undefined` a propósito. Ver `puedeConfirmarNovedad`.
 */
export function motivoInicial(): MotivoNovedad | undefined {
  return undefined;
}

/** Icono del desenlace, para el selector del modal. */
export const DESENLACE_ICONO: Record<DesenlaceNovedad, IconoMotivo> = {
  cancelar: CloseLineIcon,
  reintentar: TruckDelivery,
};
