/**
 * Qué transportadoras puede usar el negocio y cuál prefiere.
 *
 * Las reglas son puras y viven aquí, no en la pantalla de Ajustes ni en la de
 * creación de pedidos: la misma pregunta —«¿está disponible esta?»— se hace en
 * tres sitios (ajustes, cotizaciones y recolecciones) y contestarla de tres
 * formas distintas es cómo una transportadora apagada reaparece en un formulario.
 *
 * ── Se guarda lo apagado, no lo encendido ─────────────────────────────────
 *
 * `habilitadas[id] === false` es la única forma de decir «esta no». Un id que no
 * aparece está disponible: así, añadir una transportadora al catálogo mañana no
 * obliga a migrar la configuración de ningún negocio.
 */
import { TRANSPORTADORAS, type Transportadora } from "./transportadoras.catalogo";

export interface PreferenciasTransportadoras {
  /** id → `false` para las apagadas. Ausente = habilitada. */
  habilitadas?: Record<string, boolean>;
  /** Id de la favorita, o `null` si no hay ninguna. */
  favorita?: string | null;
}

export function estaHabilitada(prefs: PreferenciasTransportadoras, id: string): boolean {
  return prefs.habilitadas?.[id] !== false;
}

/** Las que se pueden ofrecer en una cotización, en el orden del catálogo. */
export function transportadorasDisponibles(
  prefs: PreferenciasTransportadoras,
): Transportadora[] {
  return TRANSPORTADORAS.filter((t) => estaHabilitada(prefs, t.id));
}

/**
 * La favorita, solo si sigue disponible.
 *
 * Una favorita apagada no se devuelve: la preferencia existe, pero no se puede
 * proponer en un envío lo que el negocio decidió no usar. Quien la lea para
 * preseleccionar un formulario recibirá `undefined` y caerá en la primera.
 */
export function transportadoraFavorita(
  prefs: PreferenciasTransportadoras,
): Transportadora | undefined {
  if (!prefs.favorita) return undefined;
  return transportadorasDisponibles(prefs).find((t) => t.id === prefs.favorita);
}

/**
 * Enciende o apaga una transportadora.
 *
 * Apagar la favorita la quita como favorita en el mismo movimiento: dejar
 * marcada como preferida una que ya no se ofrece es un estado que la interfaz
 * no puede explicar —una estrella sobre una tarjeta apagada—.
 */
export function conHabilitacion(
  prefs: PreferenciasTransportadoras,
  id: string,
  habilitada: boolean,
): PreferenciasTransportadoras {
  const habilitadas = { ...(prefs.habilitadas ?? {}), [id]: habilitada };
  const favorita = !habilitada && prefs.favorita === id ? null : (prefs.favorita ?? null);
  return { habilitadas, favorita };
}

/**
 * Marca una transportadora como favorita, o quita la que hubiera.
 *
 * Solo puede haber una: elegir otra reemplaza la anterior. Una favorita apagada
 * no se puede marcar —se ignora en vez de romper—.
 */
export function conFavorita(
  prefs: PreferenciasTransportadoras,
  id: string | null,
): PreferenciasTransportadoras {
  if (id !== null && !estaHabilitada(prefs, id)) return prefs;
  return { habilitadas: { ...(prefs.habilitadas ?? {}) }, favorita: id };
}
