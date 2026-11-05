/**
 * Cómo se confirman las órdenes que entran al negocio.
 *
 * ── Tres reglas, y la primera ALIMENTA a la segunda ───────────────────────
 *
 *   1. PRESUPUESTO DE ENVÍO  → ¿qué pedidos se marcan como riesgosos por su valor?
 *   2. ÓRDENES RIESGOSAS     → ¿esos pedidos se revisan a mano?
 *   3. JERARQUÍA             → ¿cómo se confirman los demás?
 *
 * Las tres viven en el mismo módulo porque se leen entre sí: la 1 produce la
 * lista de riesgosas que consume la 2, y la 2 es la excepción que la 3 tiene que
 * respetar. Quien pregunta «¿esta orden se confirma sola?» necesita las tres
 * respuestas, y tenerlas en tres sitios es cómo una pantalla acaba diciendo
 * «automática» sobre un pedido que otra ya mandó a revisión.
 *
 * ── Por qué la jerarquía es UNA forma y no tres interruptores ─────────────
 *
 * La referencia la presenta como tres interruptores, pero describen el mismo
 * hecho: «cómo te gustaría confirmar tus órdenes». Con los tres encendidos no
 * hay jerarquía posible —una orden no puede esperar confirmación manual y
 * confirmarse sola al mismo tiempo—, así que el modelo guarda UNA forma y la
 * interfaz la ofrece como una elección excluyente. Un estado imposible no debe
 * poder guardarse: si se pudiera, alguien lo guardaría y luego habría que
 * decidir en tiempo de lectura cuál de los tres interruptores manda.
 *
 * `null` es una respuesta legítima y distinta de «manual»: no se ha elegido
 * ninguna forma, las órdenes entran y esperan. No se confunde con «automática».
 */

/** Las tres formas de aceptar una orden. `null` (en `ReglasConfirmacion`) = ninguna. */
export type FormaConfirmacion = "manual" | "whatsapp" | "automatica";

/**
 * Tope de valor de envío a partir del cual un pedido se marca como riesgoso.
 *
 * Es una regla de rentabilidad, no de logística: por encima de este monto el
 * envío se come el margen de la venta, así que el pedido no debe confirmarse
 * solo aunque la jerarquía diga «automática».
 */
export interface PresupuestoEnvio {
  /** ¿Se aplica el tope? Apagado, el valor del envío no marca nada. */
  activo: boolean;
  /**
   * Valor máximo en pesos. `0` significa «sin tope definido» — y con `activo`
   * encendido eso no marca ningún pedido, que es lo que el negocio ve escrito
   * en la pantalla para no creer que tiene una protección que no tiene.
   */
  valorMaximo: number;
}

/** El estado persistible de las tres reglas. */
export interface ReglasConfirmacion {
  /** Tope de valor de envío. Ver `PresupuestoEnvio`. */
  presupuestoEnvio: PresupuestoEnvio;
  /**
   * ¿Las órdenes calificadas como riesgosas se confirman a mano?
   *
   * Encendido, ninguna forma automática las alcanza: ni WhatsApp ni la
   * confirmación automática. Apagado, una orden riesgosa se trata como
   * cualquier otra — que es exactamente lo que el negocio está decidiendo
   * cuando apaga el interruptor.
   */
  riesgosas: boolean;
  /** Forma de confirmación vigente para las órdenes no riesgosas. */
  forma: FormaConfirmacion | null;
}

/**
 * De fábrica: el tope de envío encendido en 22.000, riesgosas a mano y
 * confirmación manual.
 *
 * Los tres valores son los conservadores, por la misma razón que el aviso fuera
 * de horario nace apagado: confirmar sola una orden que nadie miró no se
 * deshace —ya salió la guía, ya se prometió una entrega—, mientras que
 * confirmar a mano solo cuesta un clic. El tope nace encendido porque su
 * ausencia es la que cuesta dinero: sin él, un envío caro pasa por bueno.
 */
export const REGLAS_CONFIRMACION_INICIAL: ReglasConfirmacion = {
  presupuestoEnvio: { activo: true, valorMaximo: 22_000 },
  riesgosas: true,
  forma: "manual",
};

/** Orden en que se presentan. Va de la más conservadora a la más automática. */
export const FORMAS_CONFIRMACION: readonly FormaConfirmacion[] = [
  "manual",
  "whatsapp",
  "automatica",
];

/**
 * Nombre de cada forma, en un solo sitio.
 *
 * Lo leen el interruptor de la sección, el resumen del pie y la tarjeta del hub.
 * Escribirlo tres veces es cómo el hub acaba anunciando «Confirmación por
 * WhatsApp» de una regla que la sección llama «WhatsApp».
 */
export const ETIQUETA_FORMA: Record<FormaConfirmacion, string> = {
  manual: "Confirmación manual",
  whatsapp: "Confirmación por WhatsApp",
  automatica: "Confirmación automática",
};

export function esForma(v: unknown): v is FormaConfirmacion {
  return v === "manual" || v === "whatsapp" || v === "automatica";
}

/**
 * Las reglas efectivas, con los valores por defecto rellenados.
 *
 * Se llama en la pantalla y en el resumen del hub para que una configuración
 * vieja —guardada antes de que existiera esta sección, o antes del tope de
 * envío— no se lea como «todo apagado»: sin el campo, rigen las reglas de
 * fábrica.
 */
export function reglasVigentes(r: ReglasConfirmacion | undefined): ReglasConfirmacion {
  if (!r) return { ...REGLAS_CONFIRMACION_INICIAL, presupuestoEnvio: { ...REGLAS_CONFIRMACION_INICIAL.presupuestoEnvio } };
  return {
    presupuestoEnvio: {
      activo: r.presupuestoEnvio?.activo !== false,
      valorMaximo: Number.isFinite(r.presupuestoEnvio?.valorMaximo)
        ? Math.max(0, Math.round(r.presupuestoEnvio.valorMaximo))
        : REGLAS_CONFIRMACION_INICIAL.presupuestoEnvio.valorMaximo,
    },
    riesgosas: r.riesgosas !== false,
    forma: esForma(r.forma) ? r.forma : null,
  };
}

/** Enciende o apaga la revisión manual de las órdenes riesgosas. */
export function conRiesgosas(
  reglas: ReglasConfirmacion,
  encendida: boolean,
): ReglasConfirmacion {
  return { ...reglas, riesgosas: encendida };
}

/** Cambia el tope de envío (interruptor o valor) sin tocar las otras dos reglas. */
export function conPresupuesto(
  reglas: ReglasConfirmacion,
  cambio: Partial<PresupuestoEnvio>,
): ReglasConfirmacion {
  return { ...reglas, presupuestoEnvio: { ...reglas.presupuestoEnvio, ...cambio } };
}

/**
 * Enciende o apaga una forma de confirmación.
 *
 * Encender una APAGA la que estuviera activa: son excluyentes (ver la cabecera).
 * Apagar la que está activa deja `null` —ninguna forma—; apagar una que no lo
 * está no toca la vigente, para que el interruptor de una fila inactiva no
 * borre por accidente la elección hecha en otra.
 */
export function conForma(
  reglas: ReglasConfirmacion,
  forma: FormaConfirmacion,
  encendida: boolean,
): ReglasConfirmacion {
  if (encendida) return { ...reglas, forma };
  return { ...reglas, forma: reglas.forma === forma ? null : reglas.forma };
}

/**
 * ¿El envío de este pedido supera el tope?
 *
 * Es el único punto que traduce el presupuesto a «este pedido es riesgoso». Con
 * el tope apagado —o sin valor definido— devuelve `false`: una regla apagada no
 * puede marcar nada, y un tope en 0 no es «todo es riesgoso» sino «no hay tope».
 */
export function superaPresupuesto(reglas: ReglasConfirmacion, costoEnvio: number): boolean {
  const { activo, valorMaximo } = reglas.presupuestoEnvio;
  if (!activo || valorMaximo <= 0) return false;
  return costoEnvio > valorMaximo;
}

/**
 * ¿La forma vigente alcanza a las órdenes riesgosas?
 *
 * Solo cuando el interruptor de riesgosas está apagado. Es la pregunta que
 * decide si la fila de WhatsApp muestra «No aplica a los pedidos riesgosos»: la
 * excepción es real, y enseñarla cuando NO existe sería una advertencia falsa.
 */
export function aplicaARiesgosas(reglas: ReglasConfirmacion): boolean {
  return !reglas.riesgosas;
}

/**
 * Qué pasa con una orden cuando entra, en una frase.
 *
 * Es el resumen que se pinta bajo los interruptores. Existe porque tres
 * interruptores no dicen por sí solos qué acaba ocurriendo con el pedido, y esa
 * consecuencia es lo que el negocio está eligiendo.
 */
export function resumenReglas(reglas: ReglasConfirmacion): string {
  switch (reglas.forma) {
    case "manual":
      return "Cada orden que entre espera a que alguien la confirme, una por una.";
    case "whatsapp":
      return "El cliente confirma, edita la dirección o cancela respondiendo el mensaje automático de WhatsApp.";
    case "automatica":
      return "Las órdenes se confirman solas al entrar y quedan listas para alistar; solo falta generar la guía.";
    default:
      return "No hay forma elegida: las órdenes entran y esperan a que alguien las confirme.";
  }
}
