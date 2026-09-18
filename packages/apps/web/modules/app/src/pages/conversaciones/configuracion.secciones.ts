import type { SwitchColor } from "@/elements/form/switch";
import type { BadgeColor } from "@/elements/ui/badge";
import type { PlantillasWhatsApp } from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE PRESENTACIÓN — Configuración del canal (WhatsApp)
// ═══════════════════════════════════════════════════════════════════════════
//
// Este módulo es la ÚNICA fuente de verdad del VOCABULARIO de la página de
// configuración del canal: qué secciones existen, cómo se llaman, en qué grupo
// van, en qué orden, y con qué icono. La página importa estas tablas; ninguna
// superficie escribe una etiqueta de sección como literal.
//
// POR QUÉ EXISTE (y por qué no vive dentro del componente):
//   Una etiqueta escrita a mano dentro de un JSX es invisible para los tests y
//   para cualquier otra superficie. Al extraerla a una tabla tipada, el
//   compilador puede comprobar que el catálogo es EXHAUSTIVO sobre la unión de
//   claves (`SeccionCanal`), y un test puede recorrerlo entero. Es el mismo
//   patrón que `ESTADO_CONVERSACION_LABEL` / `PLANTILLA_META` en el resto del
//   proyecto: el vocabulario se declara junto al tipo que lo define.
//
// ALCANCE (lo que esta página NO es):
//   La app es un mock 100 % frontend sin backend. NO existen —y por tanto NO se
//   muestran— facturación, plan, créditos, claves de API, memoria del asistente,
//   modelos, conectores ni control de datos. Cada sección de abajo se apoya en
//   un campo REAL de `pedidosStore.config` o se declara explícitamente como
//   preferencia local de interfaz. Inventar un valor de negocio para llenar una
//   tarjeta sería un defecto, no una funcionalidad.

// ═══════════════════════════════════════════════════════════════════════════
// SECCIONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Claves de las secciones de la página. La unión es la fuente de exhaustividad:
 * `SECCIONES_POR_GRUPO` y `META_SECCION` son `Record` sobre ella, así que añadir
 * una sección sin darle grupo o metadatos es un error de compilación.
 */
export type SeccionCanal =
  | "perfil"
  | "modulos"
  | "plantillas"
  | "horario"
  | "automatizacion"
  | "aviso"
  | "alertas"
  | "apariencia";

/** Grupos de la navegación vertical, en orden de aparición. */
export type GrupoSeccionCanal = "canal" | "mensajeria" | "preferencias";

/** Etiqueta del grupo tal como se pinta en la cabecera pequeña en mayúsculas. */
export const GRUPO_SECCION_LABEL: Record<GrupoSeccionCanal, string> = {
  canal: "CANAL",
  mensajeria: "MENSAJERÍA",
  preferencias: "PREFERENCIAS",
};

/**
 * Orden canónico de los grupos. Declarado aparte de `Object.keys` para que el
 * orden de la navegación no dependa del orden de inserción de un objeto, que es
 * un detalle de implementación y no una decisión de diseño.
 */
export const ORDEN_GRUPOS: GrupoSeccionCanal[] = ["canal", "mensajeria", "preferencias"];

/** Metadatos de presentación de una sección. */
export interface MetaSeccion {
  /** Etiqueta del ítem de la navegación vertical. */
  label: string;
  /** Descripción de una línea bajo el título del panel. */
  hint: string;
  /** Grupo al que pertenece. */
  grupo: GrupoSeccionCanal;
  /**
   * Nombre del icono del catálogo `@/icons` que representa la sección.
   *
   * Se guarda como NOMBRE (string) y la página lo resuelve contra un mapa
   * explícito, en vez de guardar el elemento JSX ya montado. Motivo: un módulo
   * de catálogo sin JSX se puede importar desde un test de Node sin arrastrar el
   * runtime de React ni el plugin de SVG.
   */
  icono: IconoSeccion;
}

/** Iconos disponibles para la navegación de secciones (subconjunto de `@/icons`). */
export type IconoSeccion =
  | "ChatIcon"
  | "PlugInIcon"
  | "DocsIcon"
  | "TimeIcon"
  | "BoltIcon"
  | "InfoIcon"
  | "AlertIcon"
  | "EyeIcon";

/**
 * Metadatos por sección. El orden de las claves de este objeto NO define el
 * orden de la navegación: lo define `ORDEN_SECCIONES`, para que reordenar la
 * navegación sea una edición explícita y no un efecto colateral de mover líneas.
 */
export const META_SECCION: Record<SeccionCanal, MetaSeccion> = {
  perfil: {
    label: "Perfil del canal",
    hint: "Identidad del canal y disponibilidad para atender.",
    grupo: "canal",
    icono: "ChatIcon",
  },
  modulos: {
    label: "Módulos conectados",
    hint: "Módulos del negocio integrados con el canal de WhatsApp.",
    grupo: "canal",
    icono: "PlugInIcon",
  },
  plantillas: {
    label: "Plantillas de mensaje",
    hint: "Guion sugerido para cada transición del pipeline. Solo referencia.",
    grupo: "canal",
    icono: "DocsIcon",
  },
  horario: {
    label: "Horario de atención",
    hint: "Días y horas en que el canal atiende pedidos.",
    grupo: "canal",
    icono: "TimeIcon",
  },
  automatizacion: {
    label: "Automatización y escalado",
    hint: "Quién responde y cómo se pasa el hilo a un asesor.",
    grupo: "mensajeria",
    icono: "BoltIcon",
  },
  aviso: {
    label: "Aviso de pausa",
    hint: "Mensaje que ve el cliente mientras la atención está en pausa.",
    grupo: "mensajeria",
    icono: "InfoIcon",
  },
  alertas: {
    label: "Alertas",
    hint: "Aviso sonoro cuando hay clientes que requieren atención.",
    grupo: "mensajeria",
    icono: "AlertIcon",
  },
  apariencia: {
    label: "Apariencia",
    hint: "Preferencias locales de la interfaz. No afectan a datos del negocio.",
    grupo: "preferencias",
    icono: "EyeIcon",
  },
};

/** Orden de las secciones dentro de la navegación. */
export const ORDEN_SECCIONES: SeccionCanal[] = [
  "perfil",
  "modulos",
  "plantillas",
  "horario",
  "automatizacion",
  "aviso",
  "alertas",
  "apariencia",
];

/**
 * Secciones agrupadas para la navegación, derivadas del catálogo.
 *
 * Es una función (no una constante) para que no exista una segunda copia del
 * agrupamiento que pudiera desincronizarse de `META_SECCION.grupo`. La página
 * la llama una vez con `useMemo`.
 */
export function seccionesPorGrupo(): { grupo: GrupoSeccionCanal; secciones: SeccionCanal[] }[] {
  return ORDEN_GRUPOS.map((grupo) => ({
    grupo,
    secciones: ORDEN_SECCIONES.filter((s) => META_SECCION[s].grupo === grupo),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANTILLAS — una fila por transición del pipeline
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fila editable por cada plantilla del pipeline, en el ORDEN del pipeline.
 *
 * `key` es `keyof PlantillasWhatsApp`, no un string libre: si mañana se añade
 * una transición a `PedidosConfig.plantillas`, esta tabla queda incompleta y el
 * test de exhaustividad falla. Es la garantía de que la página no se olvide de
 * una plantilla nueva — el defecto silencioso que este catálogo existe para
 * impedir.
 *
 * `estado` es la clave del pipeline (`PedidoEstado`) que corresponde a cada
 * plantilla, para poder contrastar la fila contra el vocabulario de Pedidos sin
 * reescribir la etiqueta.
 */
export const FILAS_PLANTILLA: { key: keyof PlantillasWhatsApp; label: string }[] = [
  { key: "recibido", label: "Recibido" },
  { key: "confirmado", label: "Confirmado" },
  { key: "enPreparacion", label: "En preparación" },
  { key: "listo", label: "Listo" },
  { key: "enCamino", label: "En camino" },
  { key: "entregado", label: "Entregado" },
  { key: "cancelado", label: "Cancelado" },
];

// ═══════════════════════════════════════════════════════════════════════════
// DÍAS DE LA SEMANA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Días de atención, en orden de PRESENTACIÓN (lunes primero, como un calendario
 * laboral) pero con el índice `d` de `Date.getDay()` (0 = domingo), que es lo que
 * guarda `HorarioAtencion.dias`. Las dos cosas no coinciden, así que el orden
 * visual se declara aquí y no se deriva del índice.
 */
export const DIAS_ATENCION: { d: number; label: string; largo: string }[] = [
  { d: 1, label: "Lun", largo: "Lunes" },
  { d: 2, label: "Mar", largo: "Martes" },
  { d: 3, label: "Mié", largo: "Miércoles" },
  { d: 4, label: "Jue", largo: "Jueves" },
  { d: 5, label: "Vie", largo: "Viernes" },
  { d: 6, label: "Sáb", largo: "Sábado" },
  { d: 0, label: "Dom", largo: "Domingo" },
];

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENCIAS LOCALES DE UI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tema de la interfaz. Tres estados: claro, oscuro y **sistema**.
 *
 * El store de shell (`uiStore`) solo modela `light | dark`; "sistema" es un
 * estado de la PREFERENCIA (qué eligió el usuario) que no coincide con el tema
 * EFECTIVO (cuál está aplicado). La página mantiene la preferencia y resuelve el
 * tema efectivo antes de escribir en `uiStore.setTheme`. No se amplía el store
 * del shell para no cambiar un contrato compartido por toda la app.
 */
export type PreferenciaTema = "claro" | "oscuro" | "sistema";

export const OPCIONES_TEMA: { value: PreferenciaTema; label: string }[] = [
  { value: "claro", label: "Claro" },
  { value: "oscuro", label: "Oscuro" },
  { value: "sistema", label: "Sistema" },
];

/** Densidad de la bandeja de conversaciones. */
export type DensidadBandeja = "compacta" | "comoda";

export const OPCIONES_DENSIDAD: { value: DensidadBandeja; label: string }[] = [
  { value: "compacta", label: "Compacta" },
  { value: "comoda", label: "Cómoda" },
];

// ═══════════════════════════════════════════════════════════════════════════
// PRESENTACIÓN DEL CANAL — etiqueta y color de la píldora de estado
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estado de conexión del canal. Se declara como unión + catálogo, no como un
 * booleano suelto, porque la presentación (etiqueta y color) necesita un sitio
 * donde vivir y ese sitio no es el JSX.
 */
export type EstadoCanal = "conectado" | "pausado";

export const ESTADO_CANAL_LABEL: Record<EstadoCanal, string> = {
  conectado: "Conectado",
  pausado: "Atención en pausa",
};

export const ESTADO_CANAL_BADGE: Record<EstadoCanal, BadgeColor> = {
  conectado: "success",
  pausado: "warning",
};

/** Estado de integración de los módulos del negocio con el canal. */
export type EstadoIntegracionCanal = "conectado" | "desconectado" | "no_disponible";

export const ESTADO_INTEGRACION_LABEL: Record<EstadoIntegracionCanal, string> = {
  conectado: "Conectado",
  desconectado: "Desconectado",
  no_disponible: "No disponible",
};

export const ESTADO_INTEGRACION_BADGE: Record<EstadoIntegracionCanal, BadgeColor> = {
  conectado: "success",
  desconectado: "light",
  no_disponible: "warning",
};

/** Color de la pista del `Switch` cuando está encendido, por contexto de uso. */
export const SWITCH_COLOR: SwitchColor = "blue";

