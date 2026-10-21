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
//   RETIRADA por tener su dueño en el módulo de Pedidos:
//     · `horario`        — las horas de apertura son del NEGOCIO, no del canal:
//                          gobiernan `pedidosStore.estaAbierto()`, que decide si
//                          un pedido se registra hoy o se sugiere programarlo. Se
//                          editaba en las dos pantallas sobre el mismo campo.
//                          Aquí se LEE —la sección «Aviso fuera de horario» lo
//                          necesita— y se edita en `/pedidos/config → Tiempos`.
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
export type SeccionCanal =
  | "modelo"
  | "qr"
  | "personalidad"
  | "instrucciones"
  | "servicios"
  | "horario"
  | "conocimiento"
  | "interruptor"
  | "probar";

/** Grupos de la navegación horizontal/vertical. */
export type GrupoSeccionCanal = "canal";

/** Etiqueta del grupo tal como se pinta en la cabecera pequeña en mayúsculas. */
export const GRUPO_SECCION_LABEL: Record<GrupoSeccionCanal, string> = {
  canal: "WHATSAPP & ASISTENTE IA",
};

/**
 * Orden canónico de los grupos.
 */
export const ORDEN_GRUPOS: GrupoSeccionCanal[] = ["canal"];

/** Metadatos de presentación de una sección. */
export interface MetaSeccion {
  label: string;
  hint: string;
  pregunta: string;
  grupo: GrupoSeccionCanal;
  icono: IconoSeccion;
}

/** Iconos disponibles para la navegación de secciones (subconjunto de `@/icons`). */
export type IconoSeccion = "DocsIcon" | "BoltIcon" | "InfoIcon" | "AlertIcon" | "PlugInIcon" | "AiIcon";

export const META_SECCION: Record<SeccionCanal, MetaSeccion> = {
  modelo: {
    label: "Modelo OpenRouter",
    hint: "Selección del LLM, temperatura y control del motor de inteligencia artificial.",
    pregunta: "¿Qué modelo de OpenRouter atiende a tus clientes?",
    grupo: "canal",
    icono: "AiIcon",
  },
  qr: {
    label: "WhatsApp QR",
    hint: "Estado de conexión Baileys, código QR y número vinculado.",
    pregunta: "¿Cómo está conectado tu WhatsApp?",
    grupo: "canal",
    icono: "PlugInIcon",
  },
  personalidad: {
    label: "Personalidad",
    hint: "Nombre del asistente, tono de comunicación y trato hacia el cliente.",
    pregunta: "¿Cuál es la personalidad y voz del asistente?",
    grupo: "canal",
    icono: "InfoIcon",
  },
  instrucciones: {
    label: "Instrucciones",
    hint: "Prompt del sistema, reglas de derivación y límites operativos.",
    pregunta: "¿Qué reglas e instrucciones sigue el asistente?",
    grupo: "canal",
    icono: "DocsIcon",
  },
  servicios: {
    label: "Servicios",
    hint: "Catálogo de servicios, precios, tiempos y herramientas de consulta.",
    pregunta: "¿Qué servicios e información puede ofrecer?",
    grupo: "canal",
    icono: "DocsIcon",
  },
  horario: {
    label: "Horario y Elevadores",
    hint: "Horario de atención, capacidad de bahías/elevadores y turnos.",
    pregunta: "¿Cuál es el horario y la capacidad operativa?",
    grupo: "canal",
    icono: "BoltIcon",
  },
  conocimiento: {
    label: "Conocimiento",
    hint: "Preguntas frecuentes (FAQ) e información general del negocio.",
    pregunta: "¿Qué información y preguntas frecuentes domina?",
    grupo: "canal",
    icono: "DocsIcon",
  },
  interruptor: {
    label: "Interruptor Maestro",
    hint: "Encendido y apagado global de respuestas automáticas en el canal.",
    pregunta: "¿Están activas las respuestas automáticas del asistente?",
    grupo: "canal",
    icono: "BoltIcon",
  },
  probar: {
    label: "Probar Asistente",
    hint: "Chat interno interactivo para probar respuestas y herramientas sin enviar a WhatsApp.",
    pregunta: "¿Cómo responde el asistente ante preguntas de prueba?",
    grupo: "canal",
    icono: "PlugInIcon",
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
  "modelo",
  "personalidad",
  "instrucciones",
  "servicios",
  "horario",
  "conocimiento",
];

/**
 * Las secciones que NO llevan pie de guardado. Se DERIVA de la lista de arriba
 * en vez de escribirse otra vez, para que las dos no puedan discrepar.
 */
type SeccionSinGuardado = Exclude<
  SeccionCanal,
  (typeof SECCIONES_CON_PIE_DE_GUARDADO)[number]
>;

export const NOTA_SIN_GUARDADO: Record<SeccionSinGuardado, string> = {
  qr: "El estado de vinculación se sincroniza en tiempo real con el socket de Baileys. Al escanear el QR o pulsar Desconectar, el cambio se aplica de inmediato.",
  interruptor:
    "Este interruptor maestro se aplica al instante: apaga o enciende las respuestas automáticas de todo el canal en el momento en que lo pulsas, sin pasar por Guardar.",
  probar:
    "El asistente de prueba corre en tiempo real en un entorno aislado sin enviar mensajes a clientes reales.",
};

/**
 * Nota de una sección, o `null` si esa sección sí se guarda.
 */
export function notaSinGuardado(seccion: SeccionCanal): string | null {
  return seccion in NOTA_SIN_GUARDADO
    ? NOTA_SIN_GUARDADO[seccion as SeccionSinGuardado]
    : null;
}

/** Orden de las secciones dentro de la navegación. */
export const ORDEN_SECCIONES: SeccionCanal[] = [
  "modelo",
  "qr",
  "personalidad",
  "instrucciones",
  "servicios",
  "horario",
  "conocimiento",
  "interruptor",
  "probar",
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
