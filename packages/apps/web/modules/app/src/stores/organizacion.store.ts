import { makeAutoObservable } from "mobx";

import { integracionesStore } from "./integraciones.store";
import { CATALOGO_MODULOS, IDS_CONECTORES } from "./plataforma.store";
import type { EstadoModuloNegocio, IdConector, IdModuloNegocio } from "./plataforma.store";

// ═══════════════════════════════════════════════════════════════════════════
// NIVEL 2 — ORGANIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════
//
// La jerarquía de Necto tiene tres niveles, y cada uno responde UNA pregunta:
//
//   Nivel 1 · PLATAFORMA    ¿qué módulos y conectores EXISTEN?   (global, constante)
//   Nivel 2 · ORGANIZACIÓN  ¿qué tiene ACTIVADO esta empresa?    ← este archivo
//   Nivel 3 · SESIÓN        ¿qué OPERA esta persona?             (session.store)
//
//   Regla de dirección: Sesión ⊆ Organización ⊆ Plataforma.
//   Cada nivel puede RESTRINGIR al de abajo. Ninguno puede AMPLIAR.
//
// ── Vocabulario ───────────────────────────────────────────────────────────
// «Organización» y «Workspace» son **la misma cosa**. Se usa «Organización», que es
// lo que dice el tipo, y se retiró «workspace» de las claves y del copy. Dos palabras
// para un concepto es cómo empieza un desdoblamiento.
//
// ── Lo que este store NO es ───────────────────────────────────────────────
// El docblock anterior decía «Multi-tenant». **No lo es y no puede serlo**: no hay
// lista de organizaciones, ninguna clave de `localStorage` lleva `orgId`, y el
// contrato de acceso declara la entidad Tienda y el multi-tenant fuera de alcance.
// Una sola organización, hoy. El día que exista la segunda, esta es la capa que
// cambia (y la clave pasa a llevar `orgId`), no la plataforma.
//
// ── Lo que este store NO hace ─────────────────────────────────────────────
// No conoce `pedidos.store` ni ningún store de dominio: el puente 2→3 vive en la
// PÁGINA. Tampoco decide autorización — eso es de `session.store` (capacidades).
//
// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DEL DOMINIO DE ORGANIZACIÓN & USUARIO
// ═══════════════════════════════════════════════════════════════════════════

/** Redes sociales del usuario, editables en `/profile`. Solo se pintan las que tengan valor. */
export interface RedesSociales {
  facebook?: string;
  /** La red antes llamada Twitter; la UI la rotula «X». */
  x?: string;
  linkedin?: string;
  instagram?: string;
}

/**
 * Dirección y datos fiscales del usuario, editables en `/profile`.
 *
 * No incluye el país: `UsuarioPerfil.pais` ya lo guarda y la tarjeta «Dirección»
 * lo lee de ahí. Duplicarlo aquí daría dos fuentes de verdad para el mismo dato.
 */
export interface DireccionPerfil {
  ciudad?: string;
  codigoPostal?: string;
  identificacionFiscal?: string;
}

export interface UsuarioPerfil {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  pais: string;
  comoNosConociste?: string;
  perfilCompletado: boolean;
  // ── Perfil extendido (editable en `/profile`) ─────────────────────────────
  // Opcionales: el onboarding no los pide y un usuario puede no tenerlos. Se
  // persisten en `localStorage` con el resto del usuario.
  telefono?: string;
  /** Cargo declarado («Gerente de tienda»). Texto libre: **no** es un permiso. */
  cargo?: string;
  /** Una línea de presentación. */
  bio?: string;
  /** Ubicación declarada («Bogotá, Colombia»). Texto libre, no se geocodifica. */
  ubicacion?: string;
  redes?: RedesSociales;
  direccion?: DireccionPerfil;
}

export interface OrganizacionWorkspace {
  id: string;
  nombre: string;
  slug: string;
  pais: string;
  moneda: string;
  zonaHoraria: string;
  tipoEmpresa?: string;
  tamanoEquipo?: string;
  logoUrl?: string;
  fechaCreacion: string;
}

export const PAISES_CONFIG: Record<
  string,
  { moneda: string; zonaHoraria: string; label: string }
> = {
  Colombia: {
    moneda: "COP",
    zonaHoraria: "America/Bogota",
    label: "Colombia",
  },
  México: {
    moneda: "MXN",
    zonaHoraria: "America/Mexico_City",
    label: "México",
  },
  Argentina: {
    moneda: "ARS",
    zonaHoraria: "America/Argentina/Buenos_Aires",
    label: "Argentina",
  },
  Chile: {
    moneda: "CLP",
    zonaHoraria: "America/Santiago",
    label: "Chile",
  },
  Perú: {
    moneda: "PEN",
    zonaHoraria: "America/Lima",
    label: "Perú",
  },
  España: {
    moneda: "EUR",
    zonaHoraria: "Europe/Madrid",
    label: "España",
  },
  "Estados Unidos": {
    moneda: "USD",
    zonaHoraria: "America/New_York",
    label: "Estados Unidos",
  },
};

/**
 * Rubros de empresa que el producto reconoce.
 *
 * Viven aquí, junto al tipo que los guarda, y no en la pantalla que los pinta:
 * el onboarding los ofrece al crear y la configuración al editar, y **es el
 * mismo dato persistido**. Cuando cada pantalla tenía su copia, el defecto ya
 * había ocurrido: el valor por defecto del store era «Retail & Comercio», que no
 * está en la lista —así que una organización creada sin elegir rubro quedaba con
 * un valor que ningún `<select>` podía volver a mostrar.
 */
export const TIPOS_EMPRESA = [
  "Gastronomía & Alimentos",
  "Moda, Calzado & Accesorios",
  "Retail & Comercio minorista",
  "Tecnología & Software",
  "Servicios Profesionales & Consultoría",
  "Salud, Estética & Bienestar",
  "Construcción & Hogar",
  "Otro rubro comercial",
] as const;

/** Rangos de tamaño de equipo. Mismo criterio que `TIPOS_EMPRESA`. */
export const TAMANOS_EQUIPO = [
  "Solo yo (1 persona)",
  "2 a 5 personas",
  "6 a 20 personas",
  "Más de 20 personas",
] as const;

/** Rubro por defecto: el que el onboarding propone y el que el store escribe. */
export const TIPO_EMPRESA_POR_DEFECTO = "Retail & Comercio minorista";

/** Tamaño de equipo por defecto. */
export const TAMANO_EQUIPO_POR_DEFECTO = "2 a 5 personas";

export type OnboardingStep = "perfil" | "organizacion" | "modulos" | "completado";

/**
 * Clave de persistencia de la capa de Organización.
 *
 * **Bump `necto_workspace_v1` → `necto.organizacion.v1`.** No es cosmético: el modelo
 * anterior sembraba una organización y un usuario completos de fábrica, y ese estado
 * contaminaba todo lo que se construyera encima. Renombrar la clave garantiza que una
 * instalación existente arranque en el estado limpio nuevo en vez de arrastrar los
 * defaults viejos. Es el único "reset" honesto en un mock sin backend: no hay datos de
 * usuario que preservar, y una regla de migración para un estado contradictorio sería
 * inventar una reconciliación para algo que nunca debió existir.
 *
 * El nombre también deja de decir «workspace»: esta capa es la **Organización**, y una
 * sola palabra para el concepto evita el próximo desdoblamiento.
 */
const STORAGE_KEY = "necto.organizacion.v1";

interface OrganizacionStorage {
  usuario: UsuarioPerfil | null;
  organizacion: OrganizacionWorkspace | null;
  /** Pertenencia de módulos de esta organización. Es nivel 2. */
  modulos: Record<IdModuloNegocio, EstadoModuloNegocio>;
}

/**
 * Estado de fábrica de la pertenencia: **ningún módulo instalado.**
 *
 * Antes `pedidos` nacía instalado y activo (en `plataformaStore`), así que toda
 * organización empezaba con Pedidos sin haberlo elegido — y «workspace sin módulos»
 * era un estado que el producto no podía alcanzar. Ahora instalar un módulo es un
 * acto explícito: la organización recién creada tiene el workspace vacío y el
 * onboarding lo llena.
 */
function modulosIniciales(): Record<IdModuloNegocio, EstadoModuloNegocio> {
  const conectoresApagados = (): Record<IdConector, boolean> =>
    IDS_CONECTORES.reduce(
      (acc, c) => ({ ...acc, [c]: false }),
      {} as Record<IdConector, boolean>,
    );

  return {
    pedidos: { instalado: false, activo: false, conectores: conectoresApagados() },
    inventario: { instalado: false, activo: false, conectores: conectoresApagados() },
  };
}

/**
 * Normaliza la pertenencia leída de `localStorage`, **fail-closed**.
 *
 * Se reconstruye el `Record` entero a partir del catálogo en vez de confiar en las
 * claves del fichero: cualquier módulo ausente, cualquier conector ausente y
 * cualquier valor que no sea exactamente `true` queda en `false`. Un dato de una
 * versión anterior o manipulado a mano no puede inventar una instalación — el
 * defecto que el propio `integracionesStore` ya previene en su `loadConectados()`.
 */
function normalizarModulos(valor: unknown): Record<IdModuloNegocio, EstadoModuloNegocio> {
  const base = modulosIniciales();
  if (typeof valor !== "object" || valor === null) return base;

  const crudo = valor as Record<string, Partial<EstadoModuloNegocio> | undefined>;

  (Object.keys(base) as IdModuloNegocio[]).forEach((id) => {
    const entrada = crudo[id];
    if (typeof entrada !== "object" || entrada === null) return;

    const conectoresLeidos = entrada.conectores;
    base[id].instalado = entrada.instalado === true;
    base[id].activo = entrada.activo === true;
    base[id].conectores = IDS_CONECTORES.reduce(
      (acc, c) => ({ ...acc, [c]: conectoresLeidos?.[c] === true }),
      {} as Record<IdConector, boolean>,
    );
  });

  return base;
}

/**
 * Lectura defensiva. **Sin defaults sembrados.**
 *
 * Antes esto devolvía `DEFAULT_USUARIO` («Carolina Zapata») y `DEFAULT_ORGANIZACION`
 * («Mi Empresa», COP, Colombia) cuando no había nada guardado. Consecuencia: en una
 * instalación limpia `tienePerfil` y `tieneOrganizacion` eran `true` de fábrica, el
 * onboarding se saltaba dos pasos, y **el estado «organización no creada» no existía**
 * — así que el flujo que debía crearlo no se podía observar ni probar.
 *
 * Los datos de demostración son legítimos, pero deben ser explícitos (una acción del
 * usuario o un modo demo), nunca el resultado de no tener datos.
 */
function loadStorage(): OrganizacionStorage {
  const vacio = (): OrganizacionStorage => ({
    usuario: null,
    organizacion: null,
    modulos: modulosIniciales(),
  });

  if (typeof localStorage === "undefined") return vacio();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return vacio();

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return vacio();

    const datos = parsed as Partial<OrganizacionStorage>;
    return {
      usuario: datos.usuario ?? null,
      organizacion: datos.organizacion ?? null,
      modulos: normalizarModulos(datos.modulos),
    };
  } catch {
    return vacio();
  }
}

function persistStorage(data: OrganizacionStorage) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Entorno sin localStorage (tests / SSR) o cuota excedida: no-op.
  }
}

/**
 * Deriva el `slug` de un nombre de organización.
 *
 * Se exporta porque lo consumen TRES sitios y todos tienen que dar el mismo
 * resultado: `crearOrganizacion` (lo guarda), `actualizarOrganizacion` (lo
 * recalcula al renombrar) y el onboarding (lo enseña como «Identificador web»
 * antes de guardarlo). El onboarding tenía su propia copia del algoritmo —con
 * un `.trim()` de más y sin fallback—, así que podía previsualizar una dirección
 * distinta de la que el store acababa guardando.
 */
export function slugDe(nombre: string): string {
  return (
    nombre
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "mi-empresa"
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ORGANIZACION STORE
// ═══════════════════════════════════════════════════════════════════════════

export class OrganizacionStore {
  usuario: UsuarioPerfil | null = null;
  organizacion: OrganizacionWorkspace | null = null;

  /**
   * Pertenencia de módulos de esta organización. **Nivel 2 — fuente de verdad.**
   *
   * Este `Record` vivía en `plataformaStore` (nivel 1), bajo el nombre engañoso de
   * «plataforma» y una clave sin `orgId`. Responde «¿qué tiene activado esta
   * empresa?», que es una pregunta de nivel 2, así que su sitio es aquí.
   *
   * Es el ÚNICO sitio donde se lee y se escribe la pertenencia. Las superficies no
   * consultan dos stores para saber si hay Pedidos.
   */
  modulos: Record<IdModuloNegocio, EstadoModuloNegocio> = modulosIniciales();

  constructor() {
    const saved = loadStorage();
    this.usuario = saved.usuario;
    this.organizacion = saved.organizacion;
    this.modulos = saved.modulos;
    makeAutoObservable(this);
  }

  private persist() {
    persistStorage({
      usuario: this.usuario,
      organizacion: this.organizacion,
      modulos: this.modulos,
    });
  }

  // ── Getters de estado del onboarding ──────────────────────────────────────

  get tienePerfil(): boolean {
    return !!this.usuario && this.usuario.perfilCompletado;
  }

  get tieneOrganizacion(): boolean {
    return !!this.organizacion && !!this.organizacion.nombre.trim();
  }

  get tieneModuloPedidos(): boolean {
    return this.esModuloInstalado("pedidos");
  }

  /**
   * Módulos activos de la organización, en orden de catálogo.
   *
   * Es la lista que una **sesión** puede como máximo recibir: la regla de
   * dirección es `Sesión ⊆ Organización`, así que quien configure una sesión debe
   * partir de aquí y no de una lista fija. Un `["pedidos"]` escrito a mano en el
   * login afirma una instalación que la organización puede no tener.
   */
  get modulosActivos(): IdModuloNegocio[] {
    return (Object.keys(this.modulos) as IdModuloNegocio[]).filter((id) =>
      this.esModuloActivo(id),
    );
  }

  get pasoActual(): OnboardingStep {
    if (!this.tienePerfil) return "perfil";
    if (!this.tieneOrganizacion) return "organizacion";
    if (!this.tieneModuloPedidos) return "modulos";
    return "completado";
  }

  get siguienteRuta(): string {
    switch (this.pasoActual) {
      case "perfil":
        return "/onboarding/perfil";
      case "organizacion":
        return "/onboarding/organizacion";
      case "modulos":
        return "/onboarding/modulos";
      case "completado":
        // Al primer módulo activo, sea cual sea. Antes estaba fijo a
        // `/pedidos/inicio`, lo que asumía que Pedidos siempre existe — y con
        // una organización sin módulos mandaba a una ruta que `ModuloGuard`
        // bloquea. Si no hay ninguno activo, a la configuración de módulos:
        // `?tab=modulos` y no `/configuracion` a secas, porque la pestaña por
        // defecto es «General» y esta ruta significa «ve a encender un módulo».
        return this.rutaPrimerModuloActivo ?? "/configuracion?tab=modulos";
    }
  }

  /**
   * Ruta de entrada del primer módulo ACTIVO, en orden de catálogo.
   *
   * `null` si la organización no tiene ninguno activo — que es un estado legítimo
   * (organización recién creada) y no un error.
   *
   * **Exige además que el módulo esté `disponible`.** Una ruta es navegable solo
   * si la pantalla existe, y `rutaPrincipal` de un módulo declarado pero no
   * implementado apunta a una ruta que no está en `App.tsx`: devolverla manda al
   * comodín, que redirige a `/login`. El estado que lo provoca es real y está
   * persistido: una organización de antes de que `inventario.disponible` pasara a
   * `false` puede tener Inventario encendido y Pedidos apagado.
   *
   * `modulosActivos` NO filtra por `disponible` a propósito: dice qué tiene
   * encendido la organización, que es un hecho de configuración. Lo que no puede
   * hacer es traducirse en una ruta a ninguna parte.
   */
  get rutaPrimerModuloActivo(): string | null {
    const activo = (Object.keys(this.modulos) as IdModuloNegocio[]).find(
      (id) => this.esModuloActivo(id) && CATALOGO_MODULOS[id].disponible,
    );
    return activo ? CATALOGO_MODULOS[activo].rutaPrincipal : null;
  }

  // ── Mutaciones ────────────────────────────────────────────────────────────

  /**
   * Actualiza el perfil del usuario.
   *
   * **Actualización parcial de verdad**: se parte del usuario existente y solo se
   * sobreescribe lo que llega. La versión anterior reconstruía el objeto campo a
   * campo, así que cualquier campo del modelo que no estuviera listado aquí se
   * perdía en cada guardado — y el tipo no avisaba.
   */
  actualizarPerfil(datos: {
    nombre?: string;
    apellido?: string;
    email?: string;
    pais?: string;
    comoNosConociste?: string;
    telefono?: string;
    cargo?: string;
    bio?: string;
    ubicacion?: string;
    redes?: RedesSociales;
    direccion?: DireccionPerfil;
  }) {
    const nombre = (datos.nombre ?? this.usuario?.nombre ?? "Usuario").trim();
    const apellido = (datos.apellido ?? this.usuario?.apellido ?? "Necto").trim();
    const email = (datos.email ?? this.usuario?.email ?? "usuario@empresa.com").trim();
    const pais = (datos.pais ?? this.usuario?.pais ?? "Colombia").trim();
    const comoNosConociste = datos.comoNosConociste
      ? datos.comoNosConociste.trim()
      : this.usuario?.comoNosConociste;

    this.usuario = {
      ...this.usuario,
      id: this.usuario?.id ?? `usr_${Date.now()}`,
      nombre,
      apellido,
      email,
      pais,
      comoNosConociste,
      perfilCompletado: true,
      // Opcionales: `undefined` significa «no tocar». Una cadena vacía sí se
      // escribe, porque vaciar el campo es una edición legítima.
      telefono: datos.telefono?.trim() ?? this.usuario?.telefono,
      cargo: datos.cargo?.trim() ?? this.usuario?.cargo,
      bio: datos.bio?.trim() ?? this.usuario?.bio,
      ubicacion: datos.ubicacion?.trim() ?? this.usuario?.ubicacion,
      redes: datos.redes ?? this.usuario?.redes,
      direccion: datos.direccion ?? this.usuario?.direccion,
    };
    this.persist();
  }

  /**
   * Actualiza los datos generales de la organización ya creada.
   *
   * **Actualización parcial de verdad**, con el mismo contrato que
   * `actualizarPerfil`: se parte de la organización existente y solo se
   * sobreescribe lo que llega. `undefined` significa «no tocar»; la cadena vacía
   * SÍ se escribe, porque vaciar un campo opcional (el logo, por ejemplo) es una
   * edición legítima. La versión «reconstruir campo a campo» es la trampa que ya
   * borró `variantesDisponibles` y los campos extendidos del perfil.
   *
   * **No crea organización.** Si no hay ninguna, no hace nada. Crear una empresa
   * es un paso del onboarding —con su país, su moneda y su paso siguiente— y una
   * segunda ruta de creación aquí tendría que reimplementar esas reglas o
   * contradecirlas. La pantalla que lo llama enseña un estado vacío en vez de
   * fingir que guardó.
   *
   * **El nombre no puede quedar en blanco.** `tieneOrganizacion` es
   * `nombre.trim() !== ""`, así que aceptar un nombre vacío dejaría la
   * organización en el estado «no creada» que el resto de la aplicación usa para
   * decidir si manda al onboarding. Un nombre en blanco conserva el anterior; el
   * formulario lo impide antes de llegar aquí, y esto es la red de seguridad.
   *
   * El `slug` se **recalcula** desde el nombre: es su proyección, no un campo
   * independiente. Dejarlo quieto al renombrar produciría dos identificadores del
   * mismo objeto que ya no dicen lo mismo.
   */
  actualizarOrganizacion(datos: {
    nombre?: string;
    pais?: string;
    moneda?: string;
    zonaHoraria?: string;
    tipoEmpresa?: string;
    tamanoEquipo?: string;
    logoUrl?: string;
  }) {
    if (!this.organizacion) return;

    const nombre = (datos.nombre ?? this.organizacion.nombre).trim() || this.organizacion.nombre;
    const pais = (datos.pais ?? this.organizacion.pais).trim() || this.organizacion.pais;
    const moneda =
      (datos.moneda ?? this.organizacion.moneda).trim().toUpperCase() || this.organizacion.moneda;
    const zonaHoraria =
      (datos.zonaHoraria ?? this.organizacion.zonaHoraria).trim() || this.organizacion.zonaHoraria;

    this.organizacion = {
      ...this.organizacion,
      nombre,
      slug: slugDe(nombre),
      pais,
      moneda,
      zonaHoraria,
      tipoEmpresa: datos.tipoEmpresa?.trim() ?? this.organizacion.tipoEmpresa,
      tamanoEquipo: datos.tamanoEquipo?.trim() ?? this.organizacion.tamanoEquipo,
      logoUrl: datos.logoUrl?.trim() ?? this.organizacion.logoUrl,
    };
    this.persist();
  }

  crearOrganizacion(datos: {
    nombre?: string;
    pais?: string;
    moneda?: string;
    zonaHoraria?: string;
    tipoEmpresa?: string;
    tamanoEquipo?: string;
    logoUrl?: string;
  }) {
    const nombre = (datos.nombre ?? "Mi Empresa").trim();
    const slug = slugDe(nombre);

    const pais = (datos.pais ?? "Colombia").trim();
    const configuracionPais = PAISES_CONFIG[pais] || PAISES_CONFIG["Colombia"];
    const moneda = (datos.moneda ?? configuracionPais.moneda).trim().toUpperCase();
    const zonaHoraria = (datos.zonaHoraria ?? configuracionPais.zonaHoraria).trim();
    // Los defaults salen de las listas compartidas, no de un literal. Antes eran
    // «Retail & Comercio», que no es ninguna de las opciones que el `<select>`
    // ofrece: una organización creada sin elegir rubro nacía con un valor que la
    // propia pantalla no podía volver a pintar.
    const tipoEmpresa =
      datos.tipoEmpresa ?? this.organizacion?.tipoEmpresa ?? TIPO_EMPRESA_POR_DEFECTO;
    const tamanoEquipo =
      datos.tamanoEquipo ?? this.organizacion?.tamanoEquipo ?? TAMANO_EQUIPO_POR_DEFECTO;
    const logoUrl = datos.logoUrl ?? this.organizacion?.logoUrl;

    this.organizacion = {
      id: this.organizacion?.id ?? `org_${Date.now()}`,
      nombre,
      slug,
      pais,
      moneda,
      zonaHoraria,
      tipoEmpresa,
      tamanoEquipo,
      logoUrl,
      // Sin `modulosInstalados`: la pertenencia vive en `this.modulos`, que es un
      // `Record` con conectores. Tenerla también aquí era la duplicación que hacía
      // que la organización y la plataforma pudieran dar respuestas distintas.
      fechaCreacion: this.organizacion?.fechaCreacion ?? new Date().toISOString(),
    };
    this.persist();
  }

  // ── Pertenencia de módulos (nivel 2) ──────────────────────────────────────
  //
  // Única autoridad sobre «¿qué tiene esta organización?». Antes esto vivía en
  // `plataformaStore` (nivel 1) y la organización guardaba una copia pobre
  // (`organizacion.modulosInstalados: string[]`, sin conectores) que se
  // desincronizaba. Análisis → `outputs/analisis-jerarquia-modulos.md`.

  /** ¿Está instalado el módulo en la organización? */
  esModuloInstalado(id: IdModuloNegocio): boolean {
    return Boolean(this.modulos[id]?.instalado);
  }

  /**
   * ¿Está habilitado el módulo? Instalado **y** activo.
   *
   * Se mantienen separados a propósito: desactivar un módulo sin desinstalarlo
   * conserva su configuración para cuando se vuelva a encender.
   */
  esModuloActivo(id: IdModuloNegocio): boolean {
    return Boolean(this.modulos[id]?.instalado && this.modulos[id]?.activo);
  }

  /** Activa o desactiva un módulo. Activarlo implica instalarlo. */
  setModuloActivo(id: IdModuloNegocio, activo: boolean): void {
    if (!this.modulos[id]) return;
    if (activo) this.modulos[id].instalado = true;
    this.modulos[id].activo = activo;
    this.sincronizarConectores(id);
    this.persist();
  }

  toggleModulo(id: IdModuloNegocio): void {
    this.setModuloActivo(id, !this.esModuloActivo(id));
  }

  /** Instala un módulo y lo deja activo. */
  instalarModulo(id: IdModuloNegocio): void {
    if (!this.modulos[id]) return;
    this.modulos[id].instalado = true;
    this.modulos[id].activo = true;
    this.sincronizarConectores(id);
    this.persist();
  }

  /**
   * Desinstala un módulo.
   *
   * Apaga también sus conectores: reinstalarlo no debe resucitar un conector que el
   * usuario había apagado, ni encender uno que nunca encendió.
   */
  desinstalarModulo(id: IdModuloNegocio): void {
    if (!this.modulos[id]) return;
    this.modulos[id].instalado = false;
    this.modulos[id].activo = false;
    IDS_CONECTORES.forEach((c) => {
      this.modulos[id].conectores[c] = false;
    });
    this.sincronizarConectores(id);
    this.persist();
  }

  /** ¿Está encendido un conector de un módulo activo? */
  esConectorActivo(moduloId: IdModuloNegocio, conectorId: IdConector): boolean {
    return Boolean(
      this.modulos[moduloId]?.instalado &&
        this.modulos[moduloId]?.activo &&
        this.modulos[moduloId]?.conectores[conectorId],
    );
  }

  setConectorActivo(moduloId: IdModuloNegocio, conectorId: IdConector, activo: boolean): void {
    if (!this.modulos[moduloId]) return;
    this.modulos[moduloId].conectores[conectorId] = activo;
    this.sincronizarConectores(moduloId);
    this.persist();
  }

  toggleConector(moduloId: IdModuloNegocio, conectorId: IdConector): void {
    this.setConectorActivo(
      moduloId,
      conectorId,
      !Boolean(this.modulos[moduloId]?.conectores[conectorId]),
    );
  }

  /**
   * ¿Hay al menos un módulo activo con este conector encendido?
   *
   * Es lo que decide si la sección transversal (Canales / Inteligencia) se pinta en
   * el sidebar: un conector sin ningún módulo activo detrás no tiene nada que
   * gobernar.
   */
  tieneConectorActivo(conectorId: IdConector): boolean {
    return (Object.keys(this.modulos) as IdModuloNegocio[]).some((mId) =>
      this.esConectorActivo(mId, conectorId),
    );
  }

  /**
   * ¿Opera la organización el módulo o el conector dado, por su nombre público?
   *
   * Adaptador para los consumidores que preguntan por `"pedidos"`, `"asistente"` o
   * `"conversaciones"`. Los dos últimos NO son módulos de negocio: son las
   * secciones transversales de los conectores.
   */
  estaActivo(id: string): boolean {
    if (id === "pedidos" || id === "inventario") return this.esModuloActivo(id);
    if (id === "asistente") return this.tieneConectorActivo("necto_ia");
    if (id === "conversaciones") return this.tieneConectorActivo("whatsapp");
    return false;
  }

  /**
   * Puente nivel 2 → asistente: mantiene `integracionesStore` en fase con el
   * conector de IA de Pedidos.
   *
   * Vivía en `plataformaStore.sincronizarConectores()`, que era el defecto original
   * con otro nombre: un store de nivel 1 mutando estado derivado del nivel 2. Se
   * mueve aquí junto con el estado que lo dispara.
   *
   * `integracionesStore` responde a OTRA pregunta —«¿qué módulos alimentan al
   * asistente?»— y por eso sigue siendo un store aparte. Lo que no puede es quedar
   * desfasado respecto de la pertenencia.
   */
  private sincronizarConectores(moduloId: IdModuloNegocio): void {
    if (moduloId !== "pedidos") return;
    if (this.esConectorActivo("pedidos", "necto_ia")) {
      integracionesStore.conectar("pedidos");
    } else {
      integracionesStore.desconectar("pedidos");
    }
  }

  /**
   * Restablece la pertenencia de módulos al estado de fábrica (ninguno instalado).
   *
   * **No toca la organización ni el usuario.** Este método existe por una razón
   * concreta: el botón «Restablecer» de la configuración de módulos llamaba a
   * `plataformaStore.reiniciar()`, que solo reseteaba módulos porque era lo único
   * que aquel store guardaba. Al mudarse el estado aquí, `reiniciar()` significa
   * «borrar la organización entera» — así que reutilizarlo habría hecho que
   * «Restablecer» borrara la empresa. Dos intenciones distintas, dos métodos.
   */
  reiniciarModulos(): void {
    this.modulos = modulosIniciales();
    this.sincronizarConectores("pedidos");
    this.persist();
  }

  /**
   * Devuelve la capa de Organización al estado limpio: sin usuario y sin organización.
   *
   * Se llamaba `reiniciarOnboardingParaTest()` y el nombre declaraba que solo existía
   * para las pruebas. **Ya no es así**: ahora que los defaults sembrados no existen,
   * este es exactamente el estado en el que arranca una instalación nueva. Es una
   * operación legítima del producto (empezar de cero) y no un atajo de tests.
   *
   * El renombrado importa: mientras se llamara «para test», borrar la organización
   * parecía una puerta trasera y nadie la usaba como el reset que es.
   */
  reiniciar() {
    this.usuario = null;
    this.organizacion = null;
    this.modulos = modulosIniciales();
    // Sin esto, el reset dejaba `integracionesStore` conectado a Pedidos: la capa
    // de Organización diría «no hay módulos» y el asistente seguiría ofreciendo
    // las herramientas de Pedidos. El puente tiene que correr también al borrar.
    this.sincronizarConectores("pedidos");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Entorno sin localStorage: no-op.
    }
  }
}

export const organizacionStore = new OrganizacionStore();
