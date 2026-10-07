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
// ── REVISIÓN DEL 07/10: DE OCHO SECCIONES A CINCO ────────────────────────
//
// La página tenía OCHO secciones y solo TRES estaban limpias. El usuario lo
// dijo así: «actualmente configuración de conversación solo da información y no
// es real». La revisión se hizo contra el código, no contra la impresión. El
// criterio que la ordenó fue UNO: **un dueño por ajuste**.
//
//   RETIRADAS por no ajustar nada:
//     · `perfil`         — tres datos de solo lectura. El número y el nombre del
//                          canal son IDENTIDAD: pasan a la CABECERA de la
//                          página, que es donde sirven de contexto, en vez de
//                          ser una sección que hay que abrir para leerlos.
//     · `automatizacion` — dos conteos y una leyenda. Los conteos viven en la
//                          consola de conversaciones, que es donde se actúa
//                          sobre ellos; repetirlos aquí era un informe dentro
//                          de un formulario.
//
//   RETIRADA por ser una COPIA de otra pantalla:
//     · `modulos`        — el mismo ajuste que «Módulos integrados» de
//                          `/asistente/config`: las dos tarjetas llaman a
//                          `integracionesStore.alternar(id)`, recorren el mismo
//                          `entradas.map` y derivan el estado igual. Además, el
//                          store declara por escrito que «Conector» es
//                          vocabulario interno que NO se pinta en ninguna
//                          superficie, y esta página pintaba «Permiso:
//                          orders.read», «Proveedor» y «Sincronización: En
//                          tiempo real».
//
//   RETIRADA por ser una preferencia GLOBAL, no del canal:
//     · `apariencia`     — el tema Y la densidad de la lista. La apariencia se
//                          administra en un solo sitio, `/configuracion →
//                          Apariencia`, que es la pantalla de los ajustes que
//                          valen para toda la aplicación. Un módulo no es dueño
//                          de una preferencia global.
//
//   RÓTULOS QUE MENTÍAN, corregidos:
//     1. «Plantillas de mensaje» decía «Solo referencia · No se envía nada». Es
//        FALSO: `pages/pedidos/pedidos.notificaciones.ts` publica la plantilla
//        en el hilo del cliente cada vez que un pedido cambia de estado.
//     2. «Aviso de pausa» editaba `plantillas.cancelado` —el MISMO campo que la
//        fila «Cancelado»— y lo presentaba como un aviso «fuera de horario» que
//        no existía en el código. Ahora es el ajuste real que decía ser
//        (`avisoFueraHorario`), sobre un campo propio.
//     3. La fila «Recibido» de las plantillas era un control muerto:
//        `PLANTILLA_POR_ESTADO` excluye los estados de entrada.
//
//   AÑADIDA, porque sí ajusta algo real:
//     · `atencion`       — si el canal responde solo. Ver `META_SECCION.atencion`.
//
// ALCANCE (lo que esta página NO es):
//   La app es un mock 100 % frontend sin backend. NO existen —y por tanto NO se
//   muestran— facturación, plan, créditos, claves de API, memoria del asistente,
//   modelos, conectores ni control de datos. Cada sección de abajo se apoya en
//   un campo REAL de `pedidosStore.config` o de `conversacionesStore` y tiene un
//   efecto comprobable. Inventar un valor de negocio para llenar una tarjeta
//   sería un defecto, no una funcionalidad.

// ═══════════════════════════════════════════════════════════════════════════
// SECCIONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Claves de las secciones de la página. La unión es la fuente de exhaustividad:
 * `seccionesPorGrupo` y `META_SECCION` son `Record` sobre ella, así que añadir
 * una sección sin darle grupo o metadatos es un error de compilación.
 */
export type SeccionCanal = "plantillas" | "horario" | "atencion" | "aviso" | "alertas";

/** Grupos de la navegación vertical, en orden de aparición. */
export type GrupoSeccionCanal = "canal" | "mensajeria";

/** Etiqueta del grupo tal como se pinta en la cabecera pequeña en mayúsculas. */
export const GRUPO_SECCION_LABEL: Record<GrupoSeccionCanal, string> = {
  canal: "CANAL",
  mensajeria: "MENSAJERÍA",
};

/**
 * Orden canónico de los grupos. Declarado aparte de `Object.keys` para que el
 * orden de la navegación no dependa del orden de inserción de un objeto, que es
 * un detalle de implementación y no una decisión de diseño.
 */
export const ORDEN_GRUPOS: GrupoSeccionCanal[] = ["canal", "mensajeria"];

/** Metadatos de presentación de una sección. */
export interface MetaSeccion {
  /** Etiqueta del ítem de la navegación vertical. */
  label: string;
  /** Descripción de una línea bajo el título del panel. */
  hint: string;
  /**
   * Pregunta que titula el bloque de contenido, en el lenguaje de
   * `BloqueConfig`.
   *
   * ── Por qué una PREGUNTA y no un rótulo ─────────────────────────────────
   *
   * El panel de una sección agrupaba tarjetas con un título corto («Identidad
   * del canal», «Pausa del canal»), y el resultado era un volcado de filas: no
   * se sabía qué decisión tomaba el usuario en esa pantalla. Un bloque titulado
   * con una pregunta obliga a que el contenido CONTESTE algo, y deja fuera lo
   * que no contesta nada — que era la mitad de las filas.
   *
   * Es el mismo criterio que ya rige en `configuracion` y en `equipo`, donde el
   * bloque se titula con la pregunta del usuario y no con el nombre del grupo.
   *
   * Vive aquí y no en el JSX por la razón de siempre: escrita a mano en la
   * página, la pregunta de una sección podría contradecir su `hint`.
   */
  pregunta: string;
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
export type IconoSeccion = "DocsIcon" | "TimeIcon" | "BoltIcon" | "InfoIcon" | "AlertIcon";

/**
 * Metadatos por sección. El orden de las claves de este objeto NO define el
 * orden de la navegación: lo define `ORDEN_SECCIONES`, para que reordenar la
 * navegación sea una edición explícita y no un efecto colateral de mover líneas.
 */
export const META_SECCION: Record<SeccionCanal, MetaSeccion> = {
  plantillas: {
    label: "Plantillas de mensaje",
    hint: "El texto que recibe el cliente cuando su pedido cambia de estado.",
    pregunta: "¿Qué le escribes al cliente en cada paso?",
    grupo: "canal",
    icono: "DocsIcon",
  },
  horario: {
    label: "Horario de atención",
    hint: "Días y horas en que el canal atiende pedidos.",
    pregunta: "¿A qué horas atiende tu canal?",
    grupo: "canal",
    icono: "TimeIcon",
  },
  atencion: {
    label: "Atención automática",
    hint: "Si el canal responde solo mientras nadie lo está atendiendo.",
    pregunta: "¿Responde el canal por su cuenta?",
    grupo: "mensajeria",
    icono: "BoltIcon",
  },
  aviso: {
    label: "Aviso fuera de horario",
    hint: "Lo que recibe el cliente que escribe con el negocio cerrado.",
    pregunta: "¿Qué le dices al cliente que escribe fuera de horario?",
    grupo: "mensajeria",
    icono: "InfoIcon",
  },
  alertas: {
    label: "Alertas",
    hint: "Aviso sonoro cuando hay clientes que requieren atención.",
    pregunta: "¿Cómo te avisamos de un cliente esperando?",
    grupo: "mensajeria",
    icono: "AlertIcon",
  },
};

/**
 * Secciones cuyo contenido escribe en el BORRADOR y por tanto necesitan el pie
 * de «Descartar / Guardar cambios».
 *
 * ── Por qué esta lista existe, y qué defecto corrige ──────────────────────
 *
 * El pie se pintaba en las ocho secciones, sin condición. En «Automatización y
 * escalado» —cuyo contenido eran dos conteos y una leyenda, cero controles— y
 * en «Perfil del canal» —cuyo único control era un campo de solo lectura—
 * ofrecía «Guardar cambios» sobre algo que no se puede cambiar. Un botón que no
 * guarda nada es exactamente la superficie que este proyecto rechaza. Esas dos
 * secciones ya no existen (07/10).
 *
 * Queda FUERA la que NO escribe en el borrador:
 *   · `atencion` — es un interruptor de OPERACIÓN que se aplica AL INSTANTE.
 *     Pulsarlo cambia el comportamiento del canal en ese momento y persiste en
 *     `conversacionesStore`; no pasa por «Guardar cambios». Ofrecerle el pie
 *     sería prometer un guardado que no existe — y el botón guardaría, además,
 *     un borrador de `pedidosStore` que esa sección ni toca.
 */
export const SECCIONES_CON_PIE_DE_GUARDADO: readonly SeccionCanal[] = [
  "plantillas",
  "horario",
  "aviso",
  "alertas",
];

/**
 * Las secciones que NO llevan pie de guardado. Se DERIVA de la lista de arriba
 * en vez de escribirse otra vez, para que las dos no puedan discrepar.
 */
type SeccionSinGuardado = Exclude<
  SeccionCanal,
  (typeof SECCIONES_CON_PIE_DE_GUARDADO)[number]
>;

/**
 * Qué se le dice al usuario donde no hay botón de guardar.
 *
 * El silencio no vale: quitar el pie sin explicar por qué deja al usuario
 * buscando el botón que ya no está. Cada nota dice **por qué** esa sección no
 * se guarda desde aquí y **dónde** se cambia lo que muestra.
 *
 * El tipo es `Record` sobre las secciones sin pie, así que añadir una sección
 * nueva y olvidar su nota es un error de compilación — no una pantalla que
 * pierde el pie sin decir nada.
 */
export const NOTA_SIN_GUARDADO: Record<SeccionSinGuardado, string> = {
  atencion:
    "Este interruptor se aplica al instante: apaga o enciende las respuestas automáticas de todo el canal en el momento en que lo pulsas, sin pasar por Guardar. El traspaso de un hilo concreto entre el bot y un asesor se hace desde la consola de conversaciones.",
};

/**
 * Nota de una sección, o `null` si esa sección sí se guarda.
 *
 * Existe para que la página no tenga que estrechar el tipo a mano: la única
 * conversión entre `SeccionCanal` y `SeccionSinGuardado` vive aquí, junto a las
 * dos tablas que la hacen cierta, y no repartida por el JSX.
 */
export function notaSinGuardado(seccion: SeccionCanal): string | null {
  return seccion in NOTA_SIN_GUARDADO
    ? NOTA_SIN_GUARDADO[seccion as SeccionSinGuardado]
    : null;
}

/** Orden de las secciones dentro de la navegación. */
export const ORDEN_SECCIONES: SeccionCanal[] = [
  "plantillas",
  "horario",
  "atencion",
  "aviso",
  "alertas",
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
// PLANTILLAS — una fila por transición que REALMENTE se envía
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fila editable por cada plantilla que el canal ENVÍA de verdad, en el ORDEN
 * del pipeline.
 *
 * ── Por qué NO están las siete claves del modelo (07/10) ──────────────────
 *
 * `PlantillasWhatsApp` tiene siete claves, pero `PLANTILLA_POR_ESTADO`
 * (`pages/pedidos/pedidos.notificaciones.ts`) mapea SEIS estados: `recibido`
 * queda fuera porque corresponde a los estados de ENTRADA (`nuevo`,
 * `programado`), y esos no avisan — el cliente acaba de pedir y agradecerle el
 * pedido que él mismo hizo no aporta.
 *
 * La consecuencia era un control que mentía: la fila «Recibido» se podía
 * editar, se guardaba, y su texto no llegaba nunca a ningún hilo. Ofrecer un
 * campo cuyo valor no tiene destino es peor que no ofrecerlo.
 *
 * `key` sigue siendo `keyof PlantillasWhatsApp` (no un string libre), así que
 * una clave mal escrita es un error de compilación. Lo que el test comprueba
 * ahora es la igualdad con el conjunto que el puente envía, que es la fuente
 * que de verdad decide: si mañana se añade una transición, el test cae.
 */
export const FILAS_PLANTILLA: { key: keyof PlantillasWhatsApp; label: string }[] = [
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
// PRESENTACIÓN DEL CANAL — etiqueta y color de la píldora de estado
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estado de atención del canal AHORA MISMO.
 *
 * Se DERIVA de `pedidosStore.estaAbierto()` y no de un campo propio: no hay un
 * booleano «conectado» en el modelo y no se inventa uno, porque un segundo
 * booleano sería un sitio más donde afirmar lo mismo que ya dice el horario, y
 * los dos podrían divergir.
 *
 * ── Por qué no se llama «pausado» (corregido el 07/10) ────────────────────
 *
 * La versión anterior derivaba el estado de `horario.activo` y rotulaba el caso
 * falso como «Atención en pausa». Eso era exactamente al revés: con el horario
 * DESACTIVADO el canal atiende a cualquier hora, así que «en pausa» describía
 * lo contrario de lo que pasaba. Los dos estados son ahora los dos estados
 * reales de `estaAbierto()`: atiende, o está fuera de horario.
 */
export type EstadoCanal = "atendiendo" | "fuera_horario";

export const ESTADO_CANAL_LABEL: Record<EstadoCanal, string> = {
  atendiendo: "Atendiendo ahora",
  fuera_horario: "Fuera de horario",
};

/**
 * Colores de la píldora. «Fuera de horario» va en `light` y NO en `warning`:
 * estar cerrado a las 3 de la mañana es el funcionamiento normal del negocio,
 * no una alarma. El naranja de `warning` es la rampa de la marca y convertiría
 * una situación prevista en una incidencia.
 */
export const ESTADO_CANAL_BADGE: Record<EstadoCanal, BadgeColor> = {
  atendiendo: "success",
  fuera_horario: "light",
};

/** Color de la pista del `Switch` cuando está encendido, por contexto de uso. */
export const SWITCH_COLOR: SwitchColor = "blue";
