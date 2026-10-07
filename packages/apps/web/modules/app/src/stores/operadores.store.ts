import { makeAutoObservable } from "mobx";
import type { Modulo } from "@/stores/session.store";
import type { Capacidad } from "@/stores/roles.store";
import { organizacionStore } from "@/stores/organizacion.store";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estado de un operador dentro del equipo del administrador:
 * - `pendiente`: envió solicitud desde /operador/registro, falta aprobar.
 * - `activo`: aprobado, puede operar el módulo.
 * - `inactivo`: desactivado por el admin (sin acceso, pero no eliminado).
 */
export type OperadorEstado = "activo" | "pendiente" | "inactivo";

export interface Operador {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  estado: OperadorEstado;
  /** Módulo al que pertenece — las listas son independientes por módulo. */
  modulo: Modulo;
  /** Cargo o designación del operador (ej. Head of Design, Vendedor Mostrador). */
  cargo?: string;
  /** URL de la foto de perfil del operador. */
  avatarUrl?: string;

  // ── Autorización (único modelo) ───────────────────────────────────────────
  //
  // Fuente de verdad de la autorización. Contrato:
  //   outputs/contrato-arquitectura-acceso-necto.md §4
  //
  // Aquí vivía un segundo modelo —`permisos: string[]`, una lista blanca de
  // secciones— que solo se usaba para `turnos` y `agendamiento`. Se retiró con
  // ellos. La lección que deja: el docblock lo declaraba «congelado, solo lo lee
  // `SessionStore.puedeVerSeccion`», y cuando se fue a comprobar, `puedeVerSeccion`
  // ya solo leía `SECCIONES.pedidos` y **nadie leía `permisos`**. Un campo con
  // escritor y cero lectores no está «congelado»: está muerto. La congelación se
  // había honrado sola, y el coste era un tipo que prometía dos modelos de
  // autorización donde solo hay uno.

  /** Rol asignado (ver `rolesStore`). De él se derivan las capacidades base. */
  rolId?: string;
  /** Excepciones que SUMAN capacidades sobre las del rol. */
  capacidadesExtra?: Capacidad[];
  /** Excepciones que RESTAN capacidades. La denegación gana siempre. */
  capacidadesRemovidas?: Capacidad[];
}

/** Una sección visible del módulo. */
export interface Seccion {
  id: string;
  label: string;
  /** Ruta asociada (informativa, para futura integración con el sidebar). */
  path: string;
  /**
   * Capacidad **mínima para entrar** a esta sección.
   *
   * Una sección es un destino de navegación, NO una unidad de autorización
   * (contrato §1.5). Entrar a una pantalla nunca implica poder operarla: p. ej.
   * `/pedidos/config` se entra con `settings.read` pero se guarda con
   * `settings.manage`. Invariante C5.
   *
   * Es **obligatoria**. Fue opcional mientras `turnos` y `agendamiento` —que no
   * declaraban capacidad— vivían en este catálogo. Con un solo módulo y todas
   * sus secciones migradas, un `capacidad?` opcional solo serviría para admitir
   * una sección sin gobierno de acceso, que es exactamente lo que el contrato
   * prohíbe.
   */
  capacidad: Capacidad;
}

/**
 * Catálogo de secciones por módulo. Es lo que el admin puede activar/desactivar
 * en el perfil de cada operador. Los permisos de un operador son un subconjunto
 * de las secciones de SU módulo (nunca del otro).
 */
export const SECCIONES: Record<Modulo, Seccion[]> = {
  // Pedidos: flujo de pedidos que llegan por WhatsApp hasta la entrega.
  // (La sección "Operadores" es solo-admin y no es un permiso togglable; por eso
  // no aparece en este catálogo.)
  //
  // Cada sección declara la capacidad mínima para ENTRAR. Las acciones de dentro
  // se gobiernan aparte con `hasPermission()`.
  pedidos: [
    { id: "inicio", label: "Inicio", path: "/pedidos/inicio", capacidad: "orders.read" },
    { id: "tablero", label: "Tablero", path: "/pedidos", capacidad: "orders.read" },
    { id: "catalogo", label: "Catálogo", path: "/pedidos/catalogo", capacidad: "orders.read" },
    { id: "crear", label: "Crear pedido", path: "/pedidos/crear", capacidad: "orders.create" },
    { id: "chats", label: "Chats", path: "/pedidos/chats", capacidad: "channels.read" },
    { id: "analitica", label: "Analítica", path: "/pedidos/analitica", capacidad: "orders.read" },
    { id: "configuracion", label: "Configuración", path: "/pedidos/config", capacidad: "settings.read" },
    { id: "operadores", label: "Operadores", path: "/pedidos/operadores", capacidad: "team.read" },
    { id: "asistente", label: "Asistente", path: "/asistente", capacidad: "assistant.use" },
  ],

  /**
   * Inventarios: el acto de contar, de arriba abajo.
   *
   * El orden es el de la operación, no el alfabético: primero el trabajo del día
   * (los conteos), después el catálogo que los alimenta (elementos, ubicaciones),
   * después lo que sale de ellos (historial, alertas, reportes) y por último lo
   * que se ajusta una vez (configuración).
   *
   * **Siete secciones y no nueve rutas**: `/inventarios/nuevo` y
   * `/inventarios/:id` no son secciones de navegación —son pantallas a las que
   * se llega desde un botón y desde una fila— así que no se declaran aquí. Ese
   * es el motivo de que `SECCIONES` no sea un espejo de la tabla de rutas: una
   * sección es un DESTINO, y «crear» no es un sitio al que se vaya sin más.
   *
   * Todas las secciones exigen `inventory.read`, incluida la de configuración,
   * que se entra a mirar para luego guardar con `inventory.configure`. Entrar y
   * operar se gobiernan por capacidades distintas (invariante C5).
   */
  inventarios: [
    { id: "inicio", label: "Dashboard", path: "/inventarios", capacidad: "inventory.read" },
    { id: "productos", label: "Productos", path: "/inventarios/productos", capacidad: "inventory.read" },
    { id: "ordenes", label: "Órdenes", path: "/inventarios/ordenes", capacidad: "inventory.read" },
    { id: "proveedores", label: "Proveedores", path: "/inventarios/proveedores", capacidad: "inventory.read" },
    { id: "reportes", label: "Reportes", path: "/inventarios/reportes", capacidad: "inventory.read" },
    { id: "configuracion", label: "Configuración", path: "/inventarios/config", capacidad: "inventory.read" },
    { id: "operadores", label: "Operadores", path: "/inventarios/operadores", capacidad: "team.read" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Equipo de ejemplo del módulo Pedidos.
 *
 * ── Criterio del seed (revisado el 22/09) ─────────────────────────────────
 *
 * El seed tiene que **cubrir el catálogo**: cada uno de los 6 roles aparece al
 * menos una vez asignado a alguien, para que la pantalla de Equipo enseñe de un
 * vistazo qué combinaciones existen y no una lista donde la mitad de los roles
 * nunca se ven. Un `bodega` o un `preparacion` definidos y sin nadie los hace
 * parecer código muerto cuando en realidad son roles vivos que el admin todavía
 * no ha usado. `personalizado` cuenta igual: es una plantilla, y una plantilla
 * sin nadie usándola parece un rol roto.
 *
 * Los tres estados también están representados: `activo` (la mayoría),
 * `pendiente` (una solicitud recién llegada, para poder aprobarla en la demo) e
 * `inactivo` (una baja con historial conservado). Un estado sin ningún caso de
 * ejemplo es una rama de la UI que nadie puede comprobar.
 *
 * Y las **excepciones** tienen sus dos casos: `capacidadesExtra` (Diana confirma
 * inventarios, que su rol no le da) y `capacidadesRemovidas` (Óscar no puede
 * cancelar pedidos, que es lo que su rol sí permitiría). Son las dos formas de
 * que la autorización real no sea solo «el rol y nada más».
 *
 * OJO al elegir un `capacidadesExtra`: **tiene que ser algo que el rol NO dé**.
 * El modelo tiene una regla explícita —una excepción solo existe si cambia
 * algo— y `procedenciaDe` la aplica: si el rol ya concede la capacidad, el
 * extra se ignora y la fila se lee «Viene de su rol». Diana llevaba
 * `channels.read`, que `vendedor` ya incluye, así que durante un tiempo el
 * único caso de «se le dio de más» del catálogo no existía: la pantalla no
 * pintaba ningún pie y el seed juraba que sí. Ahora es `inventory.manage`, que
 * `vendedor` no tiene a propósito («quien cuenta no firma»).
 */
const SEED: Operador[] = [
  {
    id: "d0",
    nombre: "Tailor Davis (Tú)",
    email: "tailor.davis@negocio.com",
    telefono: "+57 300 123 4567",
    cargo: "Head of Operations",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "pedidos",
    rolId: "admin_tienda",
  },
  {
    id: "d1",
    nombre: "Camila Ortiz",
    email: "camila.ortiz@negocio.com",
    telefono: "+57 320 111 2233",
    cargo: "Supervisora de Despacho",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "pedidos",
    rolId: "supervisor_pedidos",
  },
  {
    id: "d2",
    nombre: "Mateo Vargas",
    email: "mateo.vargas@negocio.com",
    telefono: "+57 321 222 3344",
    cargo: "Operador de Mostrador",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "pedidos",
    rolId: "vendedor",
  },
  {
    id: "d3",
    nombre: "Daniela Suárez",
    email: "daniela.suarez@negocio.com",
    telefono: "+57 322 333 4455",
    cargo: "Atención y Pedidos",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    estado: "pendiente",
    modulo: "pedidos",
    rolId: "vendedor",
  },
  // ── Cobertura del catálogo de roles ──────────────────────────────────────
  {
    id: "d4",
    nombre: "Andrés Molina",
    email: "andres.molina@negocio.com",
    telefono: "+57 310 444 5566",
    cargo: "Jefe de Cocina",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "pedidos",
    rolId: "preparacion",
  },
  {
    id: "d5",
    nombre: "Lucía Herrera",
    email: "lucia.herrera@negocio.com",
    telefono: "+57 312 555 6677",
    cargo: "Despacho y Empaque",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "pedidos",
    rolId: "preparacion",
  },
  {
    // `personalizado` es una PLANTILLA que empieza vacía, no un rol vacío por
    // olvido. Sin nadie asignado parecía un rol roto; con una persona se ve lo
    // que de verdad es: un punto de partida que se ajusta con excepciones.
    //
    // Se configura con `capacidadesExtra` en vez de inventar un rol nuevo
    // porque ese es el caso real: quien necesita «ver pedidos y responder
    // mensajes» no crea un rol para eso, usa la plantilla y suma lo que le
    // hace falta. Así que esta fila demuestra las DOS cosas a la vez —que la
    // plantilla sirve y que los extras son el mecanismo para usarla—.
    //
    // Los extras son los que la plantilla `personalizado` NO trae (no trae
    // ninguno: nace vacía). Antes llevaba `orders.read`, `channels.read` y
    // `channels.respond`, pero la plantilla ya no es lo que importa aquí: con
    // `orders.read` de más, Sofía quedaba idéntica a un `vendedor` cualquiera.
    id: "d9",
    nombre: "Sofía Cárdenas",
    email: "sofia.cardenas@negocio.com",
    telefono: "+57 316 999 0011",
    cargo: "Community Manager",
    avatarUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "pedidos",
    rolId: "personalizado",
    capacidadesExtra: ["orders.read", "channels.read", "channels.respond", "scheduled.read"],
  },
  // ── Excepciones: la autorización real no es solo el rol ──────────────────
  {
    // SUMA. Su rol (`vendedor`) solo le deja CONTAR inventario; Diana además lo
    // gestiona, porque es quien responde por el stock del local. El extra se
    // concede aquí, no cambiando el rol: si se editara `vendedor`, se lo
    // estaría dando a Mateo y a Daniela sin querer.
    //
    // `inventory.manage` y no `channels.read`: `vendedor` YA trae
    // `channels.read`, y un extra que el rol ya concede no es una excepción —
    // `procedenciaDe` lo descarta y la fila se lee «Viene de su rol».
    id: "d6",
    nombre: "Diana Ríos",
    email: "diana.rios@negocio.com",
    telefono: "+57 313 666 7788",
    cargo: "Atención al Cliente",
    avatarUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "pedidos",
    rolId: "vendedor",
    capacidadesExtra: ["inventory.manage"],
  },
  {
    // RESTA. Su rol (`supervisor_pedidos`) permite cancelar pedidos, pero por
    // política del negocio las cancelaciones las autoriza Camila. Es el caso que
    // demuestra que la denegación se aplica SOBRE el rol, no en su lugar.
    id: "d7",
    nombre: "Óscar Peña",
    email: "oscar.pena@negocio.com",
    telefono: "+57 314 777 8899",
    cargo: "Coordinador de Turnos",
    avatarUrl: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "pedidos",
    rolId: "supervisor_pedidos",
    capacidadesRemovidas: ["orders.cancel"],
  },
  {
    // BAJA. `inactivo` conserva la fila y su historial: no se borra a nadie,
    // porque los pedidos que atendió siguen apuntándole.
    id: "d8",
    nombre: "Rafael Guzmán",
    email: "rafael.guzman@negocio.com",
    telefono: "+57 315 888 9900",
    cargo: "Operador de Mostrador",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    estado: "inactivo",
    modulo: "pedidos",
    rolId: "vendedor",
  },
  // ── Operadores de Inventarios ───────────────────────────────────────────
  {
    id: "inv1",
    nombre: "Carlos Mendoza",
    email: "carlos.mendoza@negocio.com",
    telefono: "+57 301 234 5678",
    cargo: "Supervisor de Bodega",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "inventarios",
    rolId: "supervisor_pedidos",
  },
  {
    id: "inv2",
    nombre: "Mariana Duarte",
    email: "mariana.duarte@negocio.com",
    telefono: "+57 311 345 6789",
    cargo: "Auxiliar de Inventarios",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "inventarios",
    rolId: "vendedor",
  },
  {
    id: "inv3",
    nombre: "Jorge Rentería",
    email: "jorge.renteria@negocio.com",
    telefono: "+57 315 456 7890",
    cargo: "Analista de Stock",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "inventarios",
    rolId: "analista_inventarios",
  },
  {
    id: "inv4",
    nombre: "Felipe Restrepo",
    email: "felipe.restrepo@negocio.com",
    telefono: "+57 320 567 8901",
    cargo: "Conteo y Picking",
    avatarUrl: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&auto=format&fit=crop&q=80",
    estado: "pendiente",
    modulo: "inventarios",
    rolId: "vendedor",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// STORE (mock)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OperadoresStore — equipo de operadores del administrador (mock, sin backend).
 *
 * Cada módulo tiene su propia lista independiente. El admin puede crear
 * operadores directamente, aprobar los que llegan por solicitud (estado
 * `pendiente`, enviada desde /operador/registro), desactivarlos o eliminarlos.
 *
 * La autorización tiene **un solo** modelo: `rolId` + excepciones. El modelo
 * paralelo de `permisos[]` se retiró junto con los módulos que lo usaban.
 *
 * Este store es **memoria pura**: no persiste, así que todo se pierde al
 * recargar. Es una decisión explícita del mock, no un olvido.
 */
export class OperadoresStore {
  operadores: Operador[] = [...SEED];

  /**
   * Callback que se avisa cuando cambia la lista de operadores.
   *
   * Existe para que `SessionStore` pueda reconciliar la sesión (p. ej. salir de
   * la simulación si el operador simulado se elimina o se desactiva) **sin
   * crear un import circular** entre los dos stores: este archivo no conoce a
   * `session.store`, solo expone el registro.
   */
  private listener: (() => void) | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  /** Registra el callback de cambios (un único suscriptor: la sesión). */
  onChange(cb: () => void) {
    this.listener = cb;
  }

  /** Avisa al suscriptor registrado. */
  private emit() {
    this.listener?.();
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get operadoresConNombreSincronizado(): Operador[] {
    const usr = organizacionStore.usuario;
    const nombreAdmin = usr?.nombre
      ? `${usr.nombre} ${usr.apellido || ""}`.trim() + " (Tú)"
      : "Tailor Davis (Tú)";
    const emailAdmin = usr?.email || "tailor.davis@negocio.com";

    return this.operadores.map((op) => {
      if (op.id === "d0") {
        return {
          ...op,
          nombre: nombreAdmin,
          email: emailAdmin,
        };
      }
      return op;
    });
  }

  /** Operadores de un módulo (lista independiente). */
  porModulo(modulo: Modulo): Operador[] {
    return this.operadoresConNombreSincronizado.filter((o) => o.modulo === modulo);
  }

  /** Un operador por id, o undefined. */
  porId(id: string | null | undefined): Operador | undefined {
    if (!id) return undefined;
    return this.operadoresConNombreSincronizado.find((o) => o.id === id);
  }

  /** Cantidad de solicitudes pendientes de aprobar en un módulo. */
  pendientesCount(modulo: Modulo): number {
    return this.operadoresConNombreSincronizado.filter((o) => o.modulo === modulo && o.estado === "pendiente").length;
  }

  // ── Acciones ────────────────────────────────────────────────────────────────

  /**
   * Crea un operador nuevo (activo de inmediato) en el módulo dado.
   *
   * El rol es la fuente de verdad: si no se indica `rolId` se asigna
   * `"personalizado"` (sin capacidades), que es el valor **fail-closed**. Un
   * operador recién creado sin rol no puede entrar a ninguna sección, y eso es
   * lo correcto: la pantalla Equipo le asigna uno acto seguido.
   */
  crear(
    modulo: Modulo,
    data: {
      nombre: string;
      email: string;
      telefono: string;
      rolId?: string;
      estado?: OperadorEstado;
      cargo?: string;
      avatarUrl?: string;
    }
  ) {
    this.operadores.push({
      id: `${modulo[0]}${Date.now()}`,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      cargo: data.cargo,
      avatarUrl: data.avatarUrl,
      estado: data.estado ?? "activo",
      modulo,
      rolId: data.rolId ?? "personalizado",
    });
    this.emit();
  }

  /**
   * Registra una solicitud de acceso: crea el operador en estado `pendiente`,
   * sin rol. El admin lo aprueba y le asigna rol desde "Equipo".
   *
   * Antes de esto, `/operador/registro` solo cambiaba a un estado de éxito
   * visual y no creaba nada: los `pendiente` de la tabla venían solo del SEED.
   */
  solicitar(data: { nombre: string; email: string; telefono: string; modulo: Modulo }) {
    this.operadores.push({
      id: `${data.modulo[0]}${Date.now()}`,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      estado: "pendiente",
      modulo: data.modulo,
      rolId: undefined,
    });
    this.emit();
  }

  /**
   * Actualiza los datos de contacto de una persona del equipo.
   *
   * Es edición de **presentación**, no de autorización: no toca `rolId` ni las
   * excepciones (para eso están `setRol`, `setCapacidadesExtra`,
   * `setCapacidadesRemovidas`). Existe porque el perfil es una ruta real y
   * corregir un correo mal escrito no debería obligar a borrar y recrear a la
   * persona.
   */
  actualizarDatos(id: string, patch: { nombre?: string; email?: string; telefono?: string }) {
    const op = this.porId(id);
    if (!op) return;
    if (patch.nombre !== undefined) op.nombre = patch.nombre;
    if (patch.email !== undefined) op.email = patch.email;
    if (patch.telefono !== undefined) op.telefono = patch.telefono;
    this.emit();
  }

  /** Asigna el rol de un operador (fuente de verdad de la autorización). */
  setRol(id: string, rolId: string) {
    const op = this.porId(id);
    if (op) op.rolId = rolId;
    this.emit();
  }

  /** Reemplaza las excepciones que SUMAN capacidades sobre las del rol. */
  setCapacidadesExtra(id: string, capacidades: Capacidad[]) {
    const op = this.porId(id);
    if (op) op.capacidadesExtra = capacidades;
    this.emit();
  }

  /** Reemplaza las excepciones que RESTAN capacidades. La denegación gana. */
  setCapacidadesRemovidas(id: string, capacidades: Capacidad[]) {
    const op = this.porId(id);
    if (op) op.capacidadesRemovidas = capacidades;
    this.emit();
  }

  /** Aprueba una solicitud pendiente → pasa a activo. */
  aprobar(id: string) {
    const op = this.porId(id);
    if (op) op.estado = "activo";
    this.emit();
  }

  /** Rechaza y descarta una solicitud pendiente. */
  rechazar(id: string) {
    this.eliminar(id);
  }

  /** Desactiva un operador (sin eliminarlo). */
  desactivar(id: string) {
    const op = this.porId(id);
    if (op) op.estado = "inactivo";
    this.emit();
  }

  /** Reactiva un operador inactivo → activo. */
  activar(id: string) {
    const op = this.porId(id);
    if (op) op.estado = "activo";
    this.emit();
  }

  /** Elimina un operador de la lista. */
  eliminar(id: string) {
    this.operadores = this.operadores.filter((o) => o.id !== id);
    this.emit();
  }

  /** Vacia el equipo de operadores para "Simular inicio desde 0". */
  iniciarDesdeCero() {
    this.operadores = [];
    this.emit();
  }

  /** Restaura los operadores de ejemplo (seed) para el inicio normal. */
  restaurarSeed() {
    this.operadores = [...SEED];
    this.emit();
  }
}

export const operadoresStore = new OperadoresStore();
