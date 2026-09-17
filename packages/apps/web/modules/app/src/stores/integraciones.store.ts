import { makeAutoObservable } from "mobx";

import type { Capacidad } from "@/stores/roles.store";
import type { Modulo } from "@/stores/session.store";
import type { ModuloDestino } from "@/stores/conversaciones.types";

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULOS INTEGRADOS — qué módulos tiene conectados el Asistente de Necto
// ═══════════════════════════════════════════════════════════════════════════
//
// Este store responde a UNA pregunta: **¿con qué módulos está conectado el
// asistente?** Y su respuesta tiene un efecto real, no decorativo: el núcleo del
// asistente filtra sus herramientas por `enabledModules` (ver
// `assistant/registry/tool-registry.ts`), así que un módulo desconectado aquí
// deja de aportar herramientas de verdad. El interruptor no miente.
//
// ── Vocabulario ───────────────────────────────────────────────────────────
// El nombre de cara al usuario es **«Módulos integrados»**. «Conector» es el
// concepto técnico interno (el cable entre el asistente y las capacidades de un
// módulo) y NO se pinta en ninguna superficie.
//
// ── La dirección de la dependencia (importa) ──────────────────────────────
// Este store NO conoce a WhatsApp ni a la pantalla de configuración. Declara el
// estado de la conexión y el vocabulario de los módulos; quien pinta —la config
// del asistente y el chat— lee de aquí. La relación del producto queda así:
//
//     Configuración IA → Módulos integrados → capacidades del Asistente
//                                                      ↓
//                                      contexto visible en cada conversación
//
// ── Por qué el catálogo vive AQUÍ ─────────────────────────────────────────
// Dos superficies distintas necesitan nombrar los mismos módulos: la sección
// «Módulos integrados» de `/asistente/config` y las pestañas de contexto del
// chat. Si cada una escribiera su etiqueta, el día que un módulo cambie de
// nombre las dos pantallas lo dirían distinto. Es el mismo motivo por el que
// `ESTADO_CONVERSACION_LABEL` vive en `conversaciones.store.ts`.
//
// Los `id` del catálogo son los de `ModuloDestino` (el vocabulario de dominio
// de Conversaciones) para que «Pedidos» sea la MISMA cosa en la bandeja, en el
// badge de un mensaje y en una pestaña de contexto. Un test lo verifica.
//
// ═══════════════════════════════════════════════════════════════════════════
// LO QUE ESTE STORE NO HACE (y por qué)
// ═══════════════════════════════════════════════════════════════════════════
//
// 1. **No otorga acceso.** Conectar un módulo NO concede capacidades: el filtro
//    del registry es la INTERSECCIÓN módulos ∩ capacidades. Un operador sin
//    `orders.read` no ve las herramientas de Pedidos aunque el módulo esté
//    conectado. Este store solo puede QUITAR alcance, nunca darlo.
//
// 2. **No inventa módulos.** Solo se pueden conectar módulos con proveedor de
//    herramientas real (`disponible: true`). Marcar como conectado un módulo sin
//    provider prometería un alcance inexistente — el defecto que
//    `MODULOS_CONOCIDOS` ya previene en la página de configuración.
//
// 3. **No es un almacén de «conectores» externos.** La app es un mock sin
//    backend: no hay OAuth, ni tokens, ni servidores de terceros que enlazar.
//
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE MÓDULOS INTEGRABLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Módulos que el producto ofrece al asistente.
 *
 * Es un subconjunto DELIBERADO de `ModuloDestino`: `turnos` y `agendamiento`
 * existen como dominio declarado en Conversaciones pero están congelados con el
 * modelo de secciones (contrato §5) y no aportan herramientas al asistente, así
 * que no se ofrecen aquí. `general` no es un módulo: es la ausencia de dominio.
 */
export type ModuloIntegrable = Extract<ModuloDestino, "pedidos" | "inventario">;

/** Base común a toda entrada del catálogo. */
interface EntradaBase {
  /** Nombre visible del módulo. Debe coincidir con `MODULO_DESTINO_LABEL`. */
  label: string;
  /** Qué aporta al asistente, en una frase. */
  descripcion: string;
  /**
   * Ejemplos concretos de lo que el asistente podrá hacer con este módulo. Se
   * pintan en la tarjeta para que «conectar» signifique algo tangible y no un
   * concepto abstracto.
   */
  ejemplos: string[];
}

/**
 * Módulo DISPONIBLE: existe de verdad, tiene proveedor de herramientas y, por
 * tanto, se puede conectar y desconectar.
 */
export interface EntradaDisponible extends EntradaBase {
  disponible: true;
  /** Módulo de sesión equivalente. Es lo que entra en `enabledModules`. */
  modulo: Modulo;
  /**
   * Capacidad que debe poseer el operador para VER el contexto de este módulo en
   * una conversación. Sin ella, la pestaña no se pinta: mostrar el contexto de
   * un módulo que el rol no alcanza sería una fuga de alcance.
   */
  capacidad: Capacidad;
}

/**
 * Módulo DECLARADO pero NO disponible: aparece en el catálogo (es una intención
 * del producto, y nombrarlo es legítimo) pero todavía no aporta capacidades al
 * asistente porque no tiene proveedor de herramientas.
 *
 * La tarjeta se pinta con su estado real y su control DESHABILITADO. Es la
 * decisión de diseño más importante de esta pantalla: un interruptor que se
 * puede pulsar pero no conecta nada sería un control que miente, y eso es peor
 * que no ofrecer el control.
 */
export interface EntradaDeclarada extends EntradaBase {
  disponible: false;
  modulo: null;
  capacidad: null;
}

/** Una entrada del catálogo de módulos integrables. */
export type EntradaModuloIntegrable = EntradaDisponible | EntradaDeclarada;

/**
 * El catálogo, indexado por id de módulo.
 *
 * Es un `Record` sobre la unión `ModuloIntegrable` ⇒ **exhaustivo por
 * construcción**: no se puede añadir un módulo al tipo sin darle entrada aquí, y
 * el compilador lo exige.
 *
 * `inventario` está declarado y NO disponible. El día que exista su proveedor
 * de herramientas, este catálogo es el ÚNICO sitio que hay que tocar: basta con
 * pasar `disponible` a `true`, rellenar `modulo` y `capacidad`, y tanto el
 * interruptor de la configuración como la pestaña del chat se encienden solos —
 * ninguna de las dos superficies pregunta «¿es inventario?».
 */
export const MODULOS_INTEGRABLES: Record<ModuloIntegrable, EntradaModuloIntegrable> = {
  pedidos: {
    disponible: true,
    modulo: "pedidos",
    capacidad: "orders.read",
    label: "Pedidos",
    descripcion: "Gestiona pedidos desde la IA.",
    ejemplos: [
      "Consultar pedidos y su estado",
      "Resumir la actividad del día",
      "Comparar periodos y señalar patrones",
    ],
  },
  inventario: {
    disponible: false,
    modulo: null,
    capacidad: null,
    label: "Inventario",
    descripcion: "Consulta información de productos y disponibilidad.",
    ejemplos: [
      "Consultar productos",
      "Consultar disponibilidad",
      "Consultar existencias",
    ],
  },
};

/** Orden canónico de las tarjetas en la pantalla de configuración. */
export const ORDEN_MODULOS_INTEGRABLES: ModuloIntegrable[] = ["pedidos", "inventario"];

/**
 * Ids del catálogo como lista, para validar entradas persistidas sin recorrer
 * las claves de un objeto (el orden de `Object.keys` no es contrato).
 */
export const IDS_MODULOS_INTEGRABLES: ModuloIntegrable[] = ORDEN_MODULOS_INTEGRABLES;

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCIA (mock, localStorage — mismo patrón que el resto de stores)
// ═══════════════════════════════════════════════════════════════════════════

/** Clave propia en `localStorage`. */
const STORAGE_KEY = "necto.integraciones";

/**
 * Conexiones de fábrica.
 *
 * Pedidos arranca CONECTADO porque el asistente ya operaba sobre él: nacer
 * desconectado dejaría al asistente sin ninguna herramienta tras la primera
 * carga, y el usuario leería eso como una avería, no como un estado.
 *
 * Inventario no aparece porque no se puede conectar (no está disponible); el
 * seed no debe declarar algo que el propio catálogo prohíbe.
 */
const CONECTADOS_INICIALES: ModuloIntegrable[] = ["pedidos"];

/** ¿Es `valor` un id del catálogo? Guarda de forma para lo persistido. */
function esModuloIntegrable(valor: unknown): valor is ModuloIntegrable {
  return (
    typeof valor === "string" &&
    (IDS_MODULOS_INTEGRABLES as string[]).includes(valor)
  );
}

/**
 * Lee las conexiones persistidas, de forma defensiva y **fail-closed**.
 *
 * Devuelve `null` SOLO cuando no hay nada legible que restaurar (sin
 * `localStorage`, sin clave, JSON inválido o forma que no es un array), en cuyo
 * caso el store arranca con las conexiones de fábrica.
 *
 * ⚠️ Un array VACÍO **no** es «nada que restaurar»: es el estado «ningún módulo
 * conectado», que es una configuración legítima y deliberada. Devolver `null`
 * ahí haría que desconectar Pedidos y recargar la página volviera a conectarlo
 * solo — el interruptor se desharía sin que nadie lo tocara, que es la peor
 * forma de mentir que puede tener un control.
 *
 * Dos recortes deliberados sobre lo leído:
 *
 *  - Se descartan los ids que no están en el catálogo (versión antigua del
 *    producto, dato manipulado).
 *  - Se descartan los módulos que HOY no están disponibles. Si una versión
 *    anterior llegó a guardar `inventario` como conectado, restaurarlo dejaría
 *    el estado afirmando una conexión que el catálogo no respalda. Ante la duda,
 *    se desconecta: el asistente es fail-closed en todo su recorrido.
 */
function loadConectados(): ModuloIntegrable[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;

    const validos = parsed.filter(
      (id): id is ModuloIntegrable =>
        esModuloIntegrable(id) && MODULOS_INTEGRABLES[id].disponible,
    );

    // Se deduplica y se reordena según el catálogo, no según el fichero: el
    // estado interno no debe depender de cómo quedó serializado.
    return ORDEN_MODULOS_INTEGRABLES.filter((id) => validos.includes(id));
  } catch {
    // Sin localStorage o JSON inválido: se usan las conexiones de fábrica.
    return null;
  }
}

function persistConectados(conectados: ModuloIntegrable[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conectados));
  } catch {
    // Sin localStorage o cuota excedida: no-op (se sigue operando en memoria).
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * IntegracionesStore — estado de las conexiones del asistente con los módulos.
 *
 * Expone el estado y las mutaciones; el filtro efectivo lo aplica
 * `buildAccessContext()` en `assistant/bootstrap.ts`, que es el punto de
 * cableado entre la sesión, este store y el núcleo del asistente.
 */
export class IntegracionesStore {
  /** Módulos conectados al asistente, en orden canónico. */
  conectados: ModuloIntegrable[] = [...CONECTADOS_INICIALES];

  constructor() {
    // Ojo con la guarda: `loadConectados` devuelve `null` cuando NO hay nada
    // legible, pero un array VACÍO es un valor legítimo («ningún módulo
    // conectado») y también es *truthy* en JavaScript, así que se restaura tal
    // cual. Confundir ambos casos haría que desconectar todo se deshiciera solo
    // al recargar.
    const guardado = loadConectados();
    if (guardado) this.conectados = guardado;
    makeAutoObservable(this);
  }

  // ── Lectura ─────────────────────────────────────────────────────────────

  /**
   * ¿Está este módulo conectado al asistente?
   *
   * Es la ÚNICA definición de «conectado»: cualquier superficie que necesite
   * pintar el estado (la tarjeta de configuración, una pestaña del chat) lee
   * esto en vez de recorrer `conectados` por su cuenta.
   */
  estaConectado(id: ModuloIntegrable): boolean {
    return this.conectados.includes(id);
  }

  /** Las entradas del catálogo, en el orden en que se pintan. */
  get entradas(): { id: ModuloIntegrable; entrada: EntradaModuloIntegrable }[] {
    return ORDEN_MODULOS_INTEGRABLES.map((id) => ({
      id,
      entrada: MODULOS_INTEGRABLES[id],
    }));
  }

  /**
   * Los módulos conectados QUE EXISTEN, como `Modulo[]`.
   *
   * Es lo que el asistente recibe como `enabledModules`. Doble filtro, ambos
   * fail-closed: (a) la conexión está declarada y (b) el módulo está
   * disponible. El estrechamiento del tipo se hace con el discriminante
   * `disponible`, así que `modulo` no puede ser `null` aquí.
   */
  get modulosHabilitados(): Modulo[] {
    return ORDEN_MODULOS_INTEGRABLES.filter((id) => this.estaConectado(id))
      .map((id) => MODULOS_INTEGRABLES[id])
      .filter((e): e is EntradaDisponible => e.disponible)
      .map((e) => e.modulo);
  }

  /**
   * Módulos cuyo contexto puede pintarse en una conversación.
   *
   * Es `modulosHabilitados` con su etiqueta y su capacidad, para que el chat
   * construya las pestañas sin volver a consultar el catálogo ni decidir nada.
   * El llamador añade la comprobación de capacidad, que es del operador y no del
   * asistente.
   */
  get modulosConContexto(): { id: ModuloIntegrable; label: string; capacidad: Capacidad }[] {
    return ORDEN_MODULOS_INTEGRABLES.filter((id) => this.estaConectado(id))
      .map((id) => ({ id, entrada: MODULOS_INTEGRABLES[id] }))
      .filter(
        (x): x is { id: ModuloIntegrable; entrada: EntradaDisponible } =>
          x.entrada.disponible,
      )
      .map(({ id, entrada }) => ({
        id,
        label: entrada.label,
        capacidad: entrada.capacidad,
      }));
  }

  // ── Mutaciones ──────────────────────────────────────────────────────────

  /**
   * Conecta un módulo al asistente.
   *
   * Rechaza sin mutar estado si el módulo no está disponible: es la guarda de
   * profundidad de la decisión de diseño («no se puede conectar lo que no
   * existe»), por si algún llamador futuro olvidara consultar `disponible`. La
   * UI ya deshabilita el control, pero un control deshabilitado no es una regla.
   *
   * @returns `true` si el módulo quedó conectado.
   */
  conectar(id: ModuloIntegrable): boolean {
    if (!MODULOS_INTEGRABLES[id].disponible) return false;
    if (this.estaConectado(id)) return true;

    // Se reconstruye en orden canónico para que el estado no dependa del orden
    // en que se pulsaron los interruptores.
    const siguiente = [...this.conectados, id];
    this.conectados = ORDEN_MODULOS_INTEGRABLES.filter((m) =>
      siguiente.includes(m),
    );
    persistConectados(this.conectados);
    return true;
  }

  /**
   * Desconecta un módulo del asistente.
   *
   * No hay guarda de disponibilidad: desconectar un módulo declarado es una
   * operación coherente (lo deja como estaba de fábrica) y nunca concede nada.
   */
  desconectar(id: ModuloIntegrable): void {
    if (!this.estaConectado(id)) return;
    this.conectados = this.conectados.filter((m) => m !== id);
    persistConectados(this.conectados);
  }

  /**
   * Alterna la conexión de un módulo. Es lo que llama el interruptor de la
   * pantalla de configuración, que no necesita saber en qué estado estaba.
   */
  alternar(id: ModuloIntegrable): void {
    if (this.estaConectado(id)) this.desconectar(id);
    else this.conectar(id);
  }

  /** Restaura las conexiones de fábrica (usado por las pruebas y por un reset). */
  reiniciar(): void {
    this.conectados = [...CONECTADOS_INICIALES];
    persistConectados(this.conectados);
  }
}

/** Singleton, consumido por la configuración del asistente, el chat y el bootstrap. */
export const integracionesStore = new IntegracionesStore();
