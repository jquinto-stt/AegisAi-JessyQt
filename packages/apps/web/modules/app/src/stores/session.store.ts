import { makeAutoObservable } from "mobx";
import { operadoresStore, SECCIONES, type Seccion } from "@/stores/operadores.store";
import { rolesStore, ROL_ADMIN, type Capacidad } from "@/stores/roles.store";

// ═══════════════════════════════════════════════════════════════════════════
// CONTRATO DE ARQUITECTURA
// ═══════════════════════════════════════════════════════════════════════════
//
// Este archivo implementa el contrato de acceso de Necto:
//   outputs/contrato-arquitectura-acceso-necto.md
//
// Regla de autoridad: si este código contradice el contrato, gana el contrato.
//
// Los conceptos que viven aquí, y los que NO:
//
//   Sesión         (§1.1)  → quién opera y en qué módulos. NO contiene permisos.
//   Tipo de sesión (§1.2)  → vía de entrada. SOLO enrutamiento, NUNCA autorización.
//   AccessContext  (§1.8)  → snapshot derivado. SOLO autorización.
//   DataScope      (§1.6)  → qué datos se ven. Capa aparte de la autorización.
//
//   Rol (§1.3) y Capacidad (§1.4) viven en `roles.store.ts`.
//   Sección (§1.5) vive en `SECCIONES` (operadores.store.ts).
//   Simulación (§1.7) es una herramienta de admin, no autenticación.
//
// LÍMITE DEL MOCK: no hay backend ni Cognito. "Administrador" se auto-declara en
// `/seleccionar` sin credenciales, así que los guards de este archivo dan
// **coherencia y UX**, no seguridad real. Eso solo llega con auth de verdad,
// que está fuera del contrato (§9).
//
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Los módulos del producto. */
export type Modulo = "pedidos";

/**
 * Tipo de sesión — la **vía de entrada** elegida en `/seleccionar`.
 *
 * Contrato §1.2: **no es autorización.** Solo decide a qué onboarding ir tras
 * `/seleccionar` y sirve para copia de UI. Ningún guard ni componente de
 * negocio puede leerlo para decidir acceso (invariante C1).
 *
 * Se llamaba `Rol`, y se renombró precisamente para que nadie lo confunda con
 * el `Rol` de dominio (`roles.store.ts`).
 */
export type TipoSesion = "administrador" | "operador";

/**
 * Scope de datos — qué **registros** puede ver la sesión (contrato §1.6).
 *
 * Responde "¿qué datos puede ver?", no "¿puede hacer esto?". Es una capa
 * separada de la autorización y **no** vive en `AccessContext` (invariante C6).
 *
 * Se hace explícito el caso "ve todo" en vez de usar `null`, que era el patrón
 * ambiguo anterior (`null` = todas / `[]` = ninguna).
 */
export type DataScope =
  | { tipo: "sin_restriccion" }
  | { tipo: "restringido"; ids: string[] };

/**
 * AccessContext — snapshot derivado y de solo lectura que responde
 * "¿qué puede hacer esta sesión?" (contrato §1.8).
 *
 * Es **exclusivamente autorización**. Deliberadamente NO contiene:
 *   - `nombre`        → es presentación (leer `operadoresStore` por `operadorId`)
 *   - `esAdmin`       → el admin es un rol normal (invariante C9)
 *   - `secciones`     → se deriva de las capacidades, no se almacena
 *   - `colaIds` / `profesionalIds` → son scope de datos, no autorización (C6)
 */
export interface AccessContext {
  /** ¿Hay una sesión utilizable? Sin esto no se entra al shell. */
  autenticado: boolean;
  /** Cómo se llegó a la sesión. SOLO enrutamiento de flujo. NUNCA autorización. */
  tipoSesion: TipoSesion | null;
  /** Id del operador cuando se está simulando; `null` en sesión directa. */
  operadorId: string | null;
  /** Rol efectivo del que se derivan las capacidades. */
  rolId: string | null;
  /** Lista efectiva de capacidades. NUNCA `null`. Sin configurar = `[]`. */
  capacidades: Capacidad[];
  /** Módulos habilitados para esta sesión. */
  modulos: Modulo[];
}

/** Snapshot del estado previo a una simulación, para poder restaurarlo. */
interface PreSimulacion {
  modulos: Modulo[];
  tipoSesion: TipoSesion | null;
}

interface SessionSnapshot {
  modulos: Modulo[];
  tipoSesion: TipoSesion | null;
  operadorSimuladoId: string | null;
  preSimulacion: PreSimulacion | null;
}

/**
 * Forma persistida por versiones anteriores de la app, que guardaban el tipo de
 * sesión bajo la clave `rol`. Se acepta al leer para no cerrar la sesión de
 * golpe al actualizar el código.
 */
interface LegacySnapshot extends Partial<SessionSnapshot> {
  rol?: TipoSesion | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCIA (mock, localStorage)
// ═══════════════════════════════════════════════════════════════════════════
//
// La sesión se guarda en localStorage para que sobreviva a recargas de página.
// Sin esto, al recargar se pierden módulos/tipo de sesión y el sidebar cae al
// fallback (mostraba todos los módulos y ocultaba Operadores).
//
// OJO: la sesión NO guarda permisos ni capacidades. Esos se derivan en cada
// render a partir del rol. Ver contrato §1.1.

const SESSION_KEY = "necto.session";

function loadSession(): SessionSnapshot {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as LegacySnapshot;
      return {
        modulos: Array.isArray(s.modulos) ? s.modulos : [],
        // `s.rol` es la clave antigua: compatibilidad de lectura.
        tipoSesion: s.tipoSesion ?? s.rol ?? null,
        operadorSimuladoId: s.operadorSimuladoId ?? null,
        preSimulacion: s.preSimulacion ?? null,
      };
    }
  } catch {
    // Sin localStorage o JSON inválido: sesión vacía.
  }
  return { modulos: [], tipoSesion: null, operadorSimuladoId: null, preSimulacion: null };
}

function persistSession(s: SessionSnapshot): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // Sin localStorage: no-op.
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION STORE (mock)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SessionStore — fuente de verdad de la "configuración previa" del usuario:
 * qué módulos eligió trabajar y con qué tipo de sesión.
 *
 * Es 100% mock (no hay backend ni Cognito todavía). La vista de selección
 * (`/seleccionar`) escribe aquí, y el resto de la app lee de aquí para adaptar
 * lo que muestra.
 *
 * **Qué NO hace este store:** no guarda permisos ni capacidades. La autorización
 * se deriva en `accessContext` a partir del rol asignado (contrato §1.8).
 */
export class SessionStore {
  /** Módulos seleccionados por el usuario (puede ser uno o los dos). */
  modulos: Modulo[] = [];

  /**
   * Vía de entrada elegida en `/seleccionar`.
   *
   * Solo enrutamiento de flujo. NUNCA leer esto para decidir acceso (C1).
   */
  tipoSesion: TipoSesion | null = null;

  /**
   * Id del operador que se está simulando ("Viendo como").
   *
   * Contrato §1.7: la simulación es una **herramienta administrativa**, no
   * autenticación. Cuando no es null, la app corre "como" ese operador.
   */
  operadorSimuladoId: string | null = null;

  /**
   * Estado previo a la simulación, para poder restaurarlo al salir.
   *
   * Sin esto, `simular()` pisaba `tipoSesion` y `modulos` sin vuelta atrás y
   * `salirSimulacion()` tenía que resetear todo (bug del análisis anterior).
   */
  preSimulacion: PreSimulacion | null = null;

  constructor() {
    // Restaura la sesión guardada (sobrevive a recargas de página).
    const s = loadSession();
    this.modulos = s.modulos;
    this.tipoSesion = s.tipoSesion;
    this.operadorSimuladoId = s.operadorSimuladoId;
    this.preSimulacion = s.preSimulacion;
    makeAutoObservable(this);

    // Tras hidratar, valida que el operador simulado siga existiendo.
    //
    // `operadoresStore` es memoria pura y vuelve al SEED en cada recarga,
    // mientras que `operadorSimuladoId` SÍ se persiste. Sin esta reconciliación,
    // un id que ya no existe dejaba la simulación activa con permisos vacíos
    // (sidebar en blanco). Ver invariante de vida de la simulación.
    this.reconciliar();
  }

  /** Guarda el estado actual en localStorage. */
  private persist() {
    persistSession({
      modulos: this.modulos,
      tipoSesion: this.tipoSesion,
      operadorSimuladoId: this.operadorSimuladoId,
      preSimulacion: this.preSimulacion,
    });
  }

  // ── Estado del flujo ────────────────────────────────────────────────────

  /**
   * true cuando hay una sesión utilizable. Es la puerta que usa `RequireSession`.
   *
   * Contrato §2: sin configurar (`modulos` vacío o sin rol resoluble) es
   * `false`. Esto corrige el bug H2 del análisis: antes una sesión vacía se
   * comportaba como administrador porque `permisosActuales` devolvía `null`.
   */
  get isReady() {
    return this.accessContext.autenticado;
  }

  // ── Módulos ─────────────────────────────────────────────────────────────

  /** true si el módulo dado está seleccionado. */
  hasModulo(modulo: Modulo) {
    return this.modulos.includes(modulo);
  }

  /** Etiqueta legible del conjunto de módulos seleccionados. */
  get modulosLabel() {
    return "Pedidos";
  }

  /**
   * Módulo "principal" con el que arranca la app tras la selección.
   */
  get moduloPrincipal(): Modulo | null {
    if (this.modulos.includes("pedidos")) return "pedidos";
    return null;
  }

  /**
   * Módulo de la sesión actual: el del operador simulado si lo hay, o el
   * principal.
   */
  get moduloActual(): Modulo | null {
    return this.operadorSimulado?.modulo ?? this.moduloPrincipal;
  }

  /**
   * Ruta de entrada tras iniciar sesión / entrar al módulo.
   */
  get moduloEntryPath() {
    const modulo = this.moduloPrincipal;
    if (modulo === null) return "/seleccionar";
    const inicio = SECCIONES[modulo]?.find((s) => s.id === "inicio");
    return inicio?.path ?? "/pedidos/inicio";
  }

  // ── Simulación de operador ("Viendo como") ──────────────────────────────

  /** true si la app está corriendo en modo "viendo como". */
  get isSimulando() {
    return this.operadorSimuladoId !== null;
  }

  /**
   * El operador que se está simulando (o null).
   *
   * Es la fuente del `nombre` para el chip y el banner: el `AccessContext` no
   * lleva datos de presentación (contrato §1.8).
   */
  get operadorSimulado() {
    return operadoresStore.porId(this.operadorSimuladoId) ?? null;
  }

  // ── AccessContext (autorización) ────────────────────────────────────────

  /**
   * Snapshot de autorización de la sesión actual.
   *
   * Resolución (contrato §2):
   *
   * | Estado                        | autenticado | rolId         | capacidades |
   * |-------------------------------|-------------|---------------|-------------|
   * | Sin configurar                | false       | null          | []          |
   * | Sesión directa de admin       | true        | admin_tienda  | las 16      |
   * | Simulando operador X          | true        | X.rolId       | efectivas X |
   * | Sesión directa de operador    | false       | null          | []          |
   */
  get accessContext(): AccessContext {
    const op = this.operadorSimulado;

    // 1. Simulando un operador existente: sus capacidades efectivas.
    if (op) {
      return {
        autenticado: true,
        tipoSesion: "operador",
        operadorId: op.id,
        rolId: op.rolId ?? null,
        capacidades: rolesStore.capacidadesEfectivas(op),
        modulos: [op.modulo],
      };
    }

    // 2. Sesión directa: solo el administrador resuelve a un rol.
    //
    // El admin NO tiene rama especial (contrato §6): se le asigna el rol
    // `admin_tienda` y a partir de ahí todo pasa por `hasPermission()`.
    const rolId = this.tipoSesion === "administrador" ? ROL_ADMIN : null;

    return {
      autenticado: this.modulos.length > 0 && rolId !== null,
      tipoSesion: this.tipoSesion,
      operadorId: null,
      rolId,
      capacidades: rolesStore.capacidadesDe(rolId),
      modulos: this.modulos,
    };
  }

  /**
   * ¿La sesión actual tiene la capacidad dada?
   *
   * Es la API canónica de autorización. Toda decisión de "¿puede hacer esto?"
   * pasa por aquí (contrato §2).
   */
  hasPermission(capacidad: Capacidad): boolean {
    return this.accessContext.capacidades.includes(capacidad);
  }

  /**
   * Puente legado: ¿la sesión opera sin restricción?
   *
   * @deprecated Solo para `turnos` y `agendamiento`, que están congelados con el
   * modelo de secciones (contrato §5). **En código nuevo usar `hasPermission()`.**
   *
   * Lee `rolId` —la fuente de verdad del contrato— en vez de un flag `esAdmin`
   * suelto, para no reintroducir la semántica especial que el contrato elimina
   * (invariante C9). Se retira cuando esos módulos migren a capacidades.
   */
  get accesoTotal(): boolean {
    return this.accessContext.rolId === ROL_ADMIN;
  }

  // ── Secciones (navegación) ──────────────────────────────────────────────

  /**
   * ¿Puede la sesión actual entrar a la sección dada de un módulo?
   *
   * Es la API canónica de navegación, y recibe el módulo porque los ids de
   * sección **no son únicos** entre módulos (`inicio` y `crear` se repiten).
   *
   * - `pedidos` → capacidad declarada por la sección (`Seccion.capacidad`).
   * - `turnos` / `agendamiento` → lista blanca de `op.permisos` (legado).
   *
   * Invariante C5: entrar a una sección NO implica poder operarla. Las acciones
   * de dentro se comprueban aparte con `hasPermission()`.
   */
  puedeVerSeccion(modulo: Modulo, seccionId: string): boolean {
    const seccion = SECCIONES.pedidos.find((s) => s.id === seccionId);
    return seccion?.capacidad ? this.hasPermission(seccion.capacidad) : false;
  }

  /** Adaptador de compatibilidad con la firma antigua. */
  puedeVer(seccionId: string): boolean {
    const modulo = this.moduloActual;
    if (!modulo) return false;
    return this.puedeVerSeccion(modulo, seccionId);
  }

  // ── Ruta de inicio ──────────────────────────────────────────────────────

  /**
   * Ruta "inicio" a la que volver según la sesión actual:
   * - Simulando operador → la primera sección que SÍ puede ver (para no caer en
   *   una ruta bloqueada). Si no tiene ninguna, su módulo de entrada.
   * - Admin / sin simulación → el módulo de entrada normal.
   */
  get homePathActual() {
    const op = this.operadorSimulado;
    if (op) {
      const secciones = SECCIONES[op.modulo];
      const puedeEntrar = (s: Seccion) => this.puedeVerSeccion(op.modulo, s.id);

      // Preferimos "Inicio" del módulo si puede entrar; si no, su primera
      // sección permitida (para no caer en una ruta bloqueada).
      const inicio = secciones.find((s) => s.id === "inicio");
      if (inicio && puedeEntrar(inicio)) return inicio.path;

      const primera = secciones.find(puedeEntrar);
      if (primera) return primera.path;
    }
    return this.moduloEntryPath;
  }

  // ── Reconciliación ──────────────────────────────────────────────────────

  /**
   * Reconcilia la sesión con el estado real de los operadores.
   *
   * Si el operador simulado ya no existe o dejó de estar activo, sale de la
   * simulación (y restaura la sesión previa). Evita el bug de "permisos
   * degradados a []" cuando el admin elimina o desactiva al operador que está
   * simulando, o cuando el id persistido ya no existe tras una recarga.
   */
  reconciliar() {
    if (!this.operadorSimuladoId) return;
    const op = operadoresStore.porId(this.operadorSimuladoId);
    if (!op || op.estado !== "activo") this.salirSimulacion();
  }

  // ── Mutadores ───────────────────────────────────────────────────────────

  /** Agrega o quita un módulo de la selección (toggle). */
  toggleModulo(modulo: Modulo) {
    if (this.modulos.includes(modulo)) {
      this.modulos = this.modulos.filter((m) => m !== modulo);
    } else {
      this.modulos = [...this.modulos, modulo];
    }
    this.persist();
  }

  /** Reemplaza la lista de módulos seleccionados. */
  setModulos(modulos: Modulo[]) {
    this.modulos = modulos;
    this.persist();
  }

  /** Aplica la selección completa de una sola vez. */
  configurar(modulos: Modulo[], tipoSesion: TipoSesion) {
    this.modulos = modulos;
    this.tipoSesion = tipoSesion;
    this.persist();
  }

  /**
   * Entra en modo simulación ("Viendo como") sobre el operador dado.
   *
   * Guarda un snapshot del estado previo la primera vez, para que
   * `salirSimulacion()` pueda **restaurar** en vez de resetear.
   *
   * Invariantes C7 y C8: solo acepta operadores `activo`, y nunca amplía
   * capacidades (las del operador son las que son).
   */
  simular(operadorId: string) {
    const op = operadoresStore.porId(operadorId);
    if (!op || op.estado !== "activo") return;

    if (!this.isSimulando) {
      this.preSimulacion = { modulos: [...this.modulos], tipoSesion: this.tipoSesion };
    }

    this.operadorSimuladoId = operadorId;
    this.tipoSesion = "operador";
    this.modulos = [op.modulo];
    this.persist();
  }

  /**
   * Sale de la simulación y **restaura** la sesión previa.
   *
   * Antes esto delegaba en `reset()`, que borraba módulos y rol: el round-trip
   * no era reversible y devolvía al login en vez de a la vista de admin.
   */
  salirSimulacion() {
    const snapshot = this.preSimulacion;
    this.operadorSimuladoId = null;
    this.preSimulacion = null;

    if (snapshot) {
      this.modulos = [...snapshot.modulos];
      this.tipoSesion = snapshot.tipoSesion;
      this.persist();
      return;
    }

    // Sin snapshot (p. ej. sesión antigua sin `preSimulacion`): no hay a dónde
    // volver, así que se limpia del todo.
    this.reset();
  }

  /** Limpia la sesión (ej. al cerrar sesión). */
  reset() {
    this.modulos = [];
    this.tipoSesion = null;
    this.operadorSimuladoId = null;
    this.preSimulacion = null;
    this.persist();
  }
}

export const sessionStore = new SessionStore();

// ═══════════════════════════════════════════════════════════════════════════
// RECONCILIACIÓN ENTRE STORES
// ═══════════════════════════════════════════════════════════════════════════
//
// La sesión se reconcilia cuando cambia la lista de operadores: si el admin
// desactiva o elimina al operador que está simulando, hay que salir de la
// simulación en vez de quedarse con permisos vacíos.
//
// No hay import circular: `operadores.store` no conoce a `session.store`, solo
// expone el registro del listener.

operadoresStore.onChange(() => sessionStore.reconciliar());
