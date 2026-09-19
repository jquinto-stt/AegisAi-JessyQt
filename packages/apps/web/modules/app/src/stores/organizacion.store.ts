import { makeAutoObservable } from "mobx";

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DEL DOMINIO DE ORGANIZACIÓN & USUARIO (Multi-tenant)
// ═══════════════════════════════════════════════════════════════════════════

export interface UsuarioPerfil {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  pais: string;
  comoNosConociste?: string;
  perfilCompletado: boolean;
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
  modulosInstalados: string[];
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

export type OnboardingStep = "perfil" | "organizacion" | "modulos" | "completado";

const STORAGE_KEY = "necto_workspace_v1";

interface WorkspaceStorage {
  usuario: UsuarioPerfil | null;
  organizacion: OrganizacionWorkspace | null;
}

const DEFAULT_USUARIO: UsuarioPerfil = {
  id: "usr_admin_default",
  nombre: "Carolina",
  apellido: "Zapata",
  email: "carolina@necto.app",
  pais: "Colombia",
  comoNosConociste: "Recomendación de un colega",
  perfilCompletado: true,
};

const DEFAULT_ORGANIZACION: OrganizacionWorkspace = {
  id: "org_default_1",
  nombre: "Mi Empresa",
  slug: "mi-empresa",
  pais: "Colombia",
  moneda: "COP",
  zonaHoraria: "America/Bogota",
  tipoEmpresa: "Retail & Comercio",
  tamanoEquipo: "2 a 5 personas",
  modulosInstalados: [],
  fechaCreacion: new Date().toISOString(),
};

function loadStorage(): WorkspaceStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Para entornos iniciales o desarrollo, cargar valores por defecto
      return {
        usuario: DEFAULT_USUARIO,
        organizacion: DEFAULT_ORGANIZACION,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      usuario: parsed.usuario ?? DEFAULT_USUARIO,
      organizacion: parsed.organizacion ?? DEFAULT_ORGANIZACION,
    };
  } catch {
    return {
      usuario: DEFAULT_USUARIO,
      organizacion: DEFAULT_ORGANIZACION,
    };
  }
}

function persistStorage(data: WorkspaceStorage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Entorno sin localStorage (tests / SSR)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ORGANIZACION STORE
// ═══════════════════════════════════════════════════════════════════════════

export class OrganizacionStore {
  usuario: UsuarioPerfil | null = null;
  organizacion: OrganizacionWorkspace | null = null;

  constructor() {
    const saved = loadStorage();
    this.usuario = saved.usuario;
    this.organizacion = saved.organizacion;
    makeAutoObservable(this);
  }

  private persist() {
    persistStorage({
      usuario: this.usuario,
      organizacion: this.organizacion,
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
    return this.organizacion?.modulosInstalados.includes("pedidos") ?? false;
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
        return "/pedidos/inicio";
    }
  }

  // ── Mutaciones ────────────────────────────────────────────────────────────

  actualizarPerfil(datos: {
    nombre?: string;
    apellido?: string;
    email?: string;
    pais?: string;
    comoNosConociste?: string;
  }) {
    const nombre = (datos.nombre ?? this.usuario?.nombre ?? "Usuario").trim();
    const apellido = (datos.apellido ?? this.usuario?.apellido ?? "Necto").trim();
    const email = (datos.email ?? this.usuario?.email ?? "usuario@empresa.com").trim();
    const pais = (datos.pais ?? this.usuario?.pais ?? "Colombia").trim();
    const comoNosConociste = datos.comoNosConociste ? datos.comoNosConociste.trim() : this.usuario?.comoNosConociste;

    this.usuario = {
      id: this.usuario?.id ?? `usr_${Date.now()}`,
      nombre,
      apellido,
      email,
      pais,
      comoNosConociste,
      perfilCompletado: true,
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
    const slug =
      nombre
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "mi-empresa";

    const pais = (datos.pais ?? "Colombia").trim();
    const configuracionPais = PAISES_CONFIG[pais] || PAISES_CONFIG["Colombia"];
    const moneda = (datos.moneda ?? configuracionPais.moneda).trim().toUpperCase();
    const zonaHoraria = (datos.zonaHoraria ?? configuracionPais.zonaHoraria).trim();
    const tipoEmpresa = datos.tipoEmpresa ?? this.organizacion?.tipoEmpresa ?? "Retail & Comercio";
    const tamanoEquipo = datos.tamanoEquipo ?? this.organizacion?.tamanoEquipo ?? "2 a 5 personas";
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
      modulosInstalados: this.organizacion?.modulosInstalados ?? [],
      fechaCreacion: this.organizacion?.fechaCreacion ?? new Date().toISOString(),
    };
    this.persist();
  }

  instalarModulo(moduloId: string) {
    if (!this.organizacion) return;
    if (!this.organizacion.modulosInstalados.includes(moduloId)) {
      this.organizacion.modulosInstalados.push(moduloId);
      this.persist();
    }
  }

  desinstalarModulo(moduloId: string) {
    if (!this.organizacion) return;
    this.organizacion.modulosInstalados = this.organizacion.modulosInstalados.filter(
      (m) => m !== moduloId
    );
    this.persist();
  }

  reiniciarOnboardingParaTest() {
    this.usuario = null;
    this.organizacion = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorar
    }
  }
}

export const organizacionStore = new OrganizacionStore();
