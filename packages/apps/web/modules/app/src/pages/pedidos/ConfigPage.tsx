import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate, useSearchParams } from "react-router";
import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Switch } from "@/elements/form/switch";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
// Los nombres del barrel son los del PROYECTO, no los de Heroicons: `TableIcon`
// es `TableCellsIcon`, `PageIcon` es `DocumentTextIcon`, `TruckDelivery` es
// `TruckIcon` y `AlertHexaIcon` es `ExclamationTriangleIcon`. Escribir el nombre
// de Heroicons no compila, y el error apunta a esta línea.
import {
  AlertHexaIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  AudioIcon,
  BoltIcon,
  BuildingOffice2Icon,
  DollarLineIcon,
  GridIcon,
  PageIcon,
  PencilIcon,
  PlugInIcon,
  PlusIcon,
  ShieldCheckIcon,
  TableIcon,
  TimeIcon,
  TrashBinIcon,
  TruckDelivery,
} from "@/icons";
import {
  Bike,
  UtensilsCrossed,
  Sparkles,
  Info,
  Lightbulb,
  GripVertical,
  Check,
  FolderPlus,
  Store,
} from "lucide-react";
import { organizacionStore, pedidosStore, puedeGuardarConfig, motivoSinPermiso } from "@/stores";
import { cn } from "@/utils";
import type {
  Modalidad,
  PedidosConfig,
  ColumnaPersonalizada,
  EstadoConfigurable,
  PedidoEstado,
} from "@/stores/pedidos.store";
import {
  catalogoDesdePreset,
  componerColumnas,
  esColumnaPropiaDe,
  estadosActivosDe,
  etiquetaDeEstado,
} from "@/stores/pedidos.store";
import {
  BUSINESS_PROFILES,
  type BusinessProfileType,
} from "@/domain/pedidos/pedidos.profiles";
import { enlaceDePago, mensajeDeCobro } from "./cobros";
import {
  BloqueConfig,
  CampoConfig,
  ChipDia,
  ConfigAcciones,
  ConfigHeader,
  ConfigHub,
  ConfigShell,
  Label2,
  ToggleRow,
  VolverAlHub,
  claseFila,
  type TarjetaHub,
} from "@/pages/config-layout";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES Y METADATA
// ═══════════════════════════════════════════════════════════════════════════

const TODAS_MODALIDADES: Modalidad[] = ["retiro", "domicilio", "en_sitio"];

const MODALIDAD_INFO: Record<Modalidad, { label: string; desc: string }> = {
  retiro: {
    label: "Retiro en tienda / local",
    desc: "El cliente retira personalmente en el mostrador o punto físico.",
  },
  domicilio: {
    label: "Envío a domicilio",
    desc: "Despacho con mensajero propio o transportadora.",
  },
  en_sitio: {
    label: "En sitio",
    desc: "Atención, consumo o entrega directa en el establecimiento.",
  },
};

/**
 * Los cinco estados cuyo nombre el negocio puede reescribir.
 *
 * La etiqueta se lee de `pedidosStore.estadoLabel()`, que ya resuelve alias y
 * columnas personalizadas. Aquí vivía una tercera copia literal de las cinco
 * etiquetas, en paralelo a `ESTADO_LABEL` del store y a las que pinta el
 * tablero: el sitio natural para desincronizarse, porque es la pantalla donde
 * el usuario ESCRIBE esos nombres.
 */
const ESTADOS_CONFIG: EstadoConfigurable[] = [
  "nuevo",
  "confirmado",
  "en_preparacion",
  "listo",
  "en_camino",
];

const DIAS_SEMANA: { d: number; label: string; largo: string }[] = [
  { d: 1, label: "Lun", largo: "Lunes" },
  { d: 2, label: "Mar", largo: "Martes" },
  { d: 3, label: "Mié", largo: "Miércoles" },
  { d: 4, label: "Jue", largo: "Jueves" },
  { d: 5, label: "Vie", largo: "Viernes" },
  { d: 6, label: "Sáb", largo: "Sábado" },
  { d: 0, label: "Dom", largo: "Domingo" },
];

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-7.998 3.999 3.999 0 010 7.998zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function FacebookIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}



type ClaveSeccion = "flujo" | "pagos" | "perfil" | "tiempos" | "sonidos" | "integraciones";

/** Orden de la columna de secciones. `flujo` primero: es la seccion por defecto. */
const ORDEN_SECCIONES: ClaveSeccion[] = [
  "flujo",
  "pagos",
  "perfil",
  "tiempos",
  "sonidos",
  "integraciones",
];

/**
 * Metadatos de cada seccion. La etiqueta y el consejo los pinta `ConfigShell`,
 * el mismo componente que usan `/configuracion`, `/conversaciones/config` y
 * `/asistente/config`.
 *
 * `React.FC<React.SVGProps<SVGSVGElement>>` es la forma que declara
 * `SeccionNav.icono` en `@/pages/config-layout` y la que ya usa
 * `/configuracion`. No se importa `React`: es una referencia de TIPO a un
 * global UMD, y TypeScript solo prohibe eso en posicion de valor.
 */
const META_SECCION: Record<
  ClaveSeccion,
  { label: string; hint: string; icono: React.FC<React.SVGProps<SVGSVGElement>> }
> = {
  flujo: {
    label: "Operación y flujo",
    hint: "Modalidades de entrega, nombres de etapas y personalización de columnas del tablero.",
    icono: BoltIcon,
  },
  pagos: {
    label: "Cuentas y cobros",
    hint: "Gestiona los métodos de pago disponibles, cuentas bancarias para transferencias, integración de pasarelas de pago digitales y el mensaje con instrucciones que recibe el cliente al confirmar su orden.",
    icono: DollarLineIcon,
  },
  perfil: {
    label: "Perfil de negocio",
    hint: "Tipo de negocio y catálogo base. Adapta campos y terminología a tu marca.",
    icono: GridIcon,
  },
  tiempos: {
    label: "Tiempos y horarios",
    hint: "Horarios de atención, SLA estimado por etapa y avisos de órdenes demoradas.",
    icono: TimeIcon,
  },
  sonidos: {
    label: "Alertas y sonidos",
    hint: "Campanas de nuevos pedidos, alertas auditivas por demoras y recordatorios de atención.",
    icono: AudioIcon,
  },
  integraciones: {
    label: "Integraciones y canales",
    hint: "Canales de mensajería y conectores externos (WhatsApp, Instagram, Webhooks).",
    icono: PlugInIcon,
  },
};

const PALABRAS_CLAVE_SECCION: Record<ClaveSeccion, string[]> = {
  flujo: ["etapas", "columnas", "tablero", "kanban", "entrega", "domicilio", "retiro", "en sitio", "pipeline", "operacion"],
  pagos: ["cuentas", "bancos", "transferencias", "nequi", "daviplata", "bancolombia", "instrucciones", "cobro", "link", "tarjeta", "pse"],
  perfil: ["perfil", "negocio", "rubro", "categoria", "terminologia", "catalogo base"],
  tiempos: ["horario", "atencion", "sla", "demoras", "urgente", "tiempo", "dias", "horas", "24/7"],
  sonidos: ["sonido", "audio", "alerta", "campana", "timbre", "notificacion", "volumen", "chime", "aviso", "demora", "escritorio"],
  integraciones: ["whatsapp", "instagram", "facebook", "telegram", "canales", "conectores", "mensajeria", "api", "webhooks"],
};

const ACCION_SECCION: Record<ClaveSeccion, string> = {
  flujo: "Configurar",
  pagos: "Configurar",
  perfil: "Configurar",
  tiempos: "Configurar",
  sonidos: "Configurar",
  integraciones: "Conectar",
};

/**
 * Clona la configuración del store para editarla sin tocarla.
 *
 * Se declara UNA vez y la usan los tres sitios que necesitan una copia —el
 * estado inicial del borrador, «Descartar cambios» y el cierre de «Guardar»—.
 * Antes era el mismo objeto literal copiado a mano en tres puntos: añadir un
 * campo a `PedidosConfig` obligaba a acordarse de los tres, y olvidar uno hacía
 * que ese campo se compartiera por referencia entre el borrador y el store (el
 * borrador «editando» la configuración confirmada sin que nadie lo pidiera).
 */
function copiaDe(cfg: PedidosConfig): PedidosConfig {
  return {
    ...cfg,
    plantillas: { ...cfg.plantillas },
    modalidades: [...cfg.modalidades],
    catalogo: cfg.catalogo.map((c) => ({ ...c })),
    aliasEstados: { ...cfg.aliasEstados },
    aliasModalidades: { ...cfg.aliasModalidades },
    horario: { ...cfg.horario, dias: [...cfg.horario.dias] },
    tiemposObjetivo: { ...cfg.tiemposObjetivo },
    alertaAtencion: { ...cfg.alertaAtencion },
    avisoFueraHorario: { ...cfg.avisoFueraHorario },
    datosBancarios: { ...cfg.datosBancarios },
    columnasPersonalizadas: cfg.columnasPersonalizadas?.map((c) => ({ ...c })),
    capacidadesActivas: cfg.capacidadesActivas ? [...cfg.capacidadesActivas] : undefined,
  };
}

/**
 * Acento visual de cada etapa del flujo.
 *
 * ── La familia de color NO se elige aquí (corregido 09/10) ────────────────
 *
 * Esta tabla pintaba las etapas con cinco familias AJENAS a la paleta NECTO
 * —ámbar, azul, púrpura, cian y esmeralda—, que son las de Tailwind por
 * defecto y no están declaradas en `css/theme.css`. El acento de cada etapa ya
 * está decidido en el producto, en un único sitio: `COLOR_ESTADO`
 * (`pages/pedidos/analitica.utils.ts`), que recorre el pipeline **como una
 * rampa** —del gris neutro al naranja profundo, pasando por el celeste y el
 * índigo— sin salir nunca de las rampas del tema. Allí hay un test que cruza
 * las dos tablas justamente para que no se separen.
 *
 * Así que aquí se copia esa rampa, no se inventa una segunda:
 *
 *   nuevo            → accent    (celeste: recién entrado)
 *   confirmado       → secondary (el azul profundo de marca)
 *   en_preparacion   → brand     (en cocina, paso claro)
 *   listo            → brand     (naranja de marca)
 *   en_camino        → secondary (índigo suave)
 *
 * Los peldaños de cada slot (700/100/300/950/400) son los que ya usaba esta
 * tabla; solo cambia la rampa.
 */
const ESTILOS_ETAPA_SLA: Record<
  string,
  {
    subtitulo: string;
    dotColor: string;
    badgeClass: string;
    hoverBorder: string;
    ringFocus: string;
    barColor: string;
  }
> = {
  nuevo: {
    subtitulo: "Espera de validación bancaria",
    dotColor: "bg-accent-500",
    badgeClass: "text-accent-700 bg-accent-100/70 dark:text-accent-300 dark:bg-accent-950/60",
    hoverBorder: "hover:border-accent-300 dark:hover:border-accent-700",
    ringFocus: "focus-within:ring-2 focus-within:ring-accent-400",
    barColor: "bg-accent-500",
  },
  confirmado: {
    subtitulo: "Ingreso listo a la cocina/almacén",
    dotColor: "bg-secondary-600",
    badgeClass: "text-secondary-700 bg-secondary-100/70 dark:text-secondary-300 dark:bg-secondary-950/60",
    hoverBorder: "hover:border-secondary-300 dark:hover:border-secondary-700",
    ringFocus: "focus-within:ring-2 focus-within:ring-secondary-400",
    barColor: "bg-secondary-600",
  },
  en_preparacion: {
    subtitulo: "Alistamiento y embalaje",
    dotColor: "bg-brand-300",
    badgeClass: "text-brand-700 bg-brand-100/70 dark:text-brand-300 dark:bg-brand-950/60",
    hoverBorder: "hover:border-brand-300 dark:hover:border-brand-700",
    ringFocus: "focus-within:ring-2 focus-within:ring-brand-400",
    barColor: "bg-brand-300",
  },
  listo: {
    subtitulo: "Esperando repartidor o pickup",
    dotColor: "bg-brand-500",
    badgeClass: "text-brand-700 bg-brand-100/70 dark:text-brand-300 dark:bg-brand-950/60",
    hoverBorder: "hover:border-brand-300 dark:hover:border-brand-700",
    ringFocus: "focus-within:ring-2 focus-within:ring-brand-400",
    barColor: "bg-brand-500",
  },
  en_camino: {
    subtitulo: "En ruta de entrega al cliente",
    dotColor: "bg-secondary-300",
    badgeClass: "text-secondary-700 bg-secondary-100/70 dark:text-secondary-300 dark:bg-secondary-950/60",
    hoverBorder: "hover:border-secondary-300 dark:hover:border-secondary-700",
    ringFocus: "focus-within:ring-2 focus-within:ring-secondary-400",
    barColor: "bg-secondary-300",
  },
};

const ESTILO_DEFAULT_SLA = {
  subtitulo: "Etapa operativa del flujo",
  dotColor: "bg-gray-500",
  badgeClass: "text-gray-700 bg-gray-100/70 dark:text-gray-300 dark:bg-gray-800",
  hoverBorder: "hover:border-gray-300 dark:hover:border-gray-700",
  ringFocus: "focus-within:ring-2 focus-within:ring-gray-400",
  barColor: "bg-gray-400",
};

const DIAS_HORARIO = [
  { d: 1, label: "Lunes" },
  { d: 2, label: "Martes" },
  { d: 3, label: "Miércoles" },
  { d: 4, label: "Jueves" },
  { d: 5, label: "Viernes" },
  { d: 6, label: "Sábado" },
  { d: 0, label: "Domingo" },
];

function calcularHorasOperativas(apertura: string, cierre: string): string {
  if (!apertura || !cierre) return "";
  const [hA, mA] = apertura.split(":").map(Number);
  const [hC, mC] = cierre.split(":").map(Number);
  if (isNaN(hA) || isNaN(mA) || isNaN(hC) || isNaN(mC)) return "";
  const min = hC * 60 + mC - (hA * 60 + mA);
  if (min <= 0) return "Cierre debe ser mayor";
  const hrs = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${hrs} hrs operativas`;
  return `${hrs}h ${m}m operativas`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA CONFIGURACIÓN DE PEDIDOS
// ═══════════════════════════════════════════════════════════════════════════
//
// Layout, tipografía y filas de control vienen de `@/pages/config-layout`, el
// mismo módulo que usan `/conversaciones/config` y `/asistente/config`. Aquí
// solo queda lo propio de Pedidos: el pipeline, las modalidades, el horario y
// el catálogo. La lógica de MobX (borrador local, `updateConfig`, permisos) no
// cambia respecto de la versión anterior.

export const ConfigPage = observer(() => {
  // ── La sección activa vive en la URL (`?seccion=`) ────────────────────────
  //
  // Antes era un `useState`. Con estado local, entrar a una sección concreta
  // —desde un enlace externo, un marcador o una incidencia— era imposible:
  // siempre se aterrizaba en la primera, y el usuario tenía que navegar a mano.
  // Con el parámetro, cada sección es direccionable y el enlace directo
  // funciona. Es el mismo criterio que ya usa `/configuracion` con `?tab=`.
  //
  // **Sin parámetro NO se elige una sección por defecto**: se pinta el hub de
  // tarjetas. Es la pantalla de entrada, y elegir una sección «por defecto»
  // escondería las demás detrás de una navegación que el usuario no ha visto.
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const seccionParam = searchParams.get("seccion");
  const seccion: ClaveSeccion | null = esClaveSeccion(seccionParam) ? seccionParam : null;

  /**
   * ¿Es `v` una sección conocida?
   *
   * El parámetro lo escribe el usuario, así que un valor inventado no puede
   * dejar la pantalla en blanco ni en una sección fantasma: cae al hub, que es
   * lo que se pinta de verdad. La URL no es una promesa de esta pantalla.
   */
  function esClaveSeccion(v: string | null): v is ClaveSeccion {
    return v !== null && (ORDEN_SECCIONES as string[]).includes(v);
  }

  const entrarASeccion = (k: string) => setSearchParams({ seccion: k });
  const volverAlHub = () => setSearchParams({});

  // Borrador local: preserva el store intacto hasta presionar "Guardar cambios".
  const [draft, setDraft] = useState<PedidosConfig>(() => copiaDe(pedidosStore.config));

  const [guardado, setGuardado] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // ── Canales e integraciones (estado sincronizado con organizacionStore) ──
  const [canalesActivos, setCanalesActivos] = useState<{
    whatsapp: boolean;
    instagram: boolean;
    facebook: boolean;
    telegram: boolean;
  }>(() => {
    const waStore = organizacionStore.esConectorActivo("pedidos", "whatsapp");
    try {
      const guardado = localStorage.getItem("pedidos_canales_integraciones");
      if (guardado) {
        const parsed = JSON.parse(guardado);
        return {
          whatsapp: parsed.whatsapp !== undefined ? Boolean(parsed.whatsapp) : waStore,
          instagram: Boolean(parsed.instagram),
          facebook: Boolean(parsed.facebook),
          telegram: parsed.telegram !== undefined ? Boolean(parsed.telegram) : true,
        };
      }
    } catch {}
    return {
      whatsapp: waStore,
      instagram: false,
      facebook: false,
      telegram: true,
    };
  });

  const toggleCanal = (
    canal: "whatsapp" | "instagram" | "facebook" | "telegram",
    nuevoEstado: boolean,
  ) => {
    setCanalesActivos((prev) => {
      const actualizado = { ...prev, [canal]: nuevoEstado };
      try {
        localStorage.setItem("pedidos_canales_integraciones", JSON.stringify(actualizado));
      } catch {}
      return actualizado;
    });

    if (canal === "whatsapp") {
      organizacionStore.setConectorActivo("pedidos", "whatsapp", nuevoEstado);
    }
  };

  // ── Permisos ──
  const puedeEditar = puedeGuardarConfig();
  const soloLectura = !puedeEditar;

  const set = <K extends keyof PedidosConfig>(k: K, v: PedidosConfig[K]) => {
    setDraft((prev) => ({ ...prev, [k]: v }));
    setGuardado(false);
  };

  const setDatoBancario = <K extends keyof NonNullable<PedidosConfig["datosBancarios"]>>(
    campo: K,
    valor: NonNullable<PedidosConfig["datosBancarios"]>[K]
  ) => {
    setDraft((prev) => ({
      ...prev,
      datosBancarios: {
        ...(prev.datosBancarios ?? {}),
        [campo]: valor,
      },
    }));
    setGuardado(false);
  };

  const toggleModalidad = (m: Modalidad) => {
    const activa = draft.modalidades.includes(m);
    if (activa && draft.modalidades.length === 1) return;
    set("modalidades", activa ? draft.modalidades.filter((x) => x !== m) : [...draft.modalidades, m]);
  };

  const setAliasEstado = (id: EstadoConfigurable, value: string) => {
    setDraft((prev) => ({ ...prev, aliasEstados: { ...prev.aliasEstados, [id]: value } }));
    setGuardado(false);
  };

  const setAliasModalidad = (m: Modalidad, value: string) => {
    setDraft((prev) => ({ ...prev, aliasModalidades: { ...prev.aliasModalidades, [m]: value } }));
    setGuardado(false);
  };

  const setHorario = <K extends keyof PedidosConfig["horario"]>(k: K, v: PedidosConfig["horario"][K]) => {
    setDraft((prev) => ({ ...prev, horario: { ...prev.horario, [k]: v } }));
    setGuardado(false);
  };

  // ── Edición en línea de chips (Etapas y Modalidades) ──────────────────────
  const [chipEditando, setChipEditando] = useState<string | null>(null);
  const [chipTempValor, setChipTempValor] = useState("");
  const [columnaArrastrada, setColumnaArrastrada] = useState<string | null>(null);

  const iniciarEdicionChip = (key: string, valorActual: string) => {
    setChipEditando(key);
    setChipTempValor(valorActual);
  };

  const guardarEdicionChip = (tipo: "estado" | "modalidad", id: string) => {
    if (tipo === "estado") {
      setAliasEstado(id as EstadoConfigurable, chipTempValor.trim());
    } else {
      setAliasModalidad(id as Modalidad, chipTempValor.trim());
    }
    setChipEditando(null);
  };

  const cancelarEdicionChip = () => {
    setChipEditando(null);
  };

  const iniciarEdicionColumna = (id: string, labelActual: string) => {
    setChipEditando(`col_${id}`);
    setChipTempValor(labelActual);
  };

  const guardarEdicionColumna = (id: string) => {
    const limpio = chipTempValor.trim();
    if (ESTADOS_CONFIG.includes(id as EstadoConfigurable)) {
      setAliasEstado(id as EstadoConfigurable, limpio);
    } else if (esColumnaPropiaDe(id)) {
      renombrarColumnaPropia(id, limpio || id);
    }
    setChipEditando(null);
  };

  const handleDragStart = (id: string) => {
    setColumnaArrastrada(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!columnaArrastrada || columnaArrastrada === targetId) return;
    const desde = columnas.findIndex((c) => c.id === columnaArrastrada);
    const hasta = columnas.findIndex((c) => c.id === targetId);
    if (desde < 0 || hasta < 0) return;
    const copia = [...columnas];
    const [removed] = copia.splice(desde, 1);
    copia.splice(hasta, 0, removed);
    set("columnasPersonalizadas", copia);
  };

  const handleDragEnd = () => {
    setColumnaArrastrada(null);
  };

  const toggleDia = (d: number) => {
    setDraft((prev) => {
      const dias = prev.horario.dias.includes(d)
        ? prev.horario.dias.filter((x) => x !== d)
        : [...prev.horario.dias, d].sort((a, b) => a - b);
      return { ...prev, horario: { ...prev.horario, dias } };
    });
    setGuardado(false);
  };

  const setTiempoObjetivo = (id: EstadoConfigurable, minutos: number) => {
    setDraft((prev) => {
      const t = { ...prev.tiemposObjetivo };
      if (minutos > 0) t[id] = minutos;
      else delete t[id];
      return { ...prev, tiemposObjetivo: t };
    });
    setGuardado(false);
  };

  const [editandoAviso, setEditandoAviso] = useState(false);
  const [horariosPorDia, setHorariosPorDia] = useState<Record<number, { apertura: string; cierre: string }>>(() => {
    const baseA = draft.horario.apertura || "08:00";
    const baseC = draft.horario.cierre || "20:00";
    return {
      1: { apertura: baseA, cierre: baseC },
      2: { apertura: baseA, cierre: baseC },
      3: { apertura: baseA, cierre: baseC },
      4: { apertura: baseA, cierre: baseC },
      5: { apertura: baseA, cierre: baseC },
      6: { apertura: "09:00", cierre: "18:00" },
      0: { apertura: "10:00", cierre: "16:00" },
    };
  });

  const handleCambioHorarioDia = (d: number, campo: "apertura" | "cierre", valor: string) => {
    setHorariosPorDia((prev) => {
      const actual = prev[d] || { apertura: draft.horario.apertura, cierre: draft.horario.cierre };
      const nuevo = { ...actual, [campo]: valor };
      return { ...prev, [d]: nuevo };
    });
    if (d === 1 || draft.horario.dias.length <= 1) {
      setHorario(campo, valor);
    }
    setGuardado(false);
  };

  const [copiadoCobro, setCopiadoCobro] = useState(false);
  const copiarMensajeCobro = () => {
    const txt = mensajeDeCobro(draft.datosBancarios, "P-001", window.location.origin);
    if (txt) {
      navigator.clipboard.writeText(txt);
      setCopiadoCobro(true);
      setTimeout(() => setCopiadoCobro(false), 2000);
    }
  };

  const setAlertaAtencion = <K extends keyof PedidosConfig["alertaAtencion"]>(
    k: K,
    v: PedidosConfig["alertaAtencion"][K],
  ) => {
    setDraft((prev) => ({
      ...prev,
      alertaAtencion: { ...prev.alertaAtencion, [k]: v },
    }));
    setGuardado(false);
  };

  const [probandoAudio, setProbandoAudio] = useState(false);

  const reproducirTono = (tono = draft.alertaAtencion?.tonoTimbre || "ding_moderno") => {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const t0 = ctx.currentTime;
      const vol = Math.max(0.05, Math.min(1, ((draft.alertaAtencion?.volumenSla ?? 75) / 100)));

      if (tono === "campana_clasica") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1046.5, t0);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.exponentialRampToValueAtTime(0.3 * vol, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.75);
      } else if (tono === "tono_digital") {
        [
          { freq: 523.25, at: 0 },
          { freq: 659.25, at: 0.1 },
        ].forEach(({ freq, at }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, t0 + at);
          gain.gain.setValueAtTime(0.001, t0 + at);
          gain.gain.exponentialRampToValueAtTime(0.2 * vol, t0 + at + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t0 + at);
          osc.stop(t0 + at + 0.35);
        });
      } else if (tono === "chime_doble") {
        [
          { freq: 587.33, at: 0 },
          { freq: 880.0, at: 0.14 },
        ].forEach(({ freq, at }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t0 + at);
          gain.gain.setValueAtTime(0.001, t0 + at);
          gain.gain.exponentialRampToValueAtTime(0.25 * vol, t0 + at + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.8);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t0 + at);
          osc.stop(t0 + at + 0.85);
        });
      } else {
        // ding_moderno (default)
        [
          { freq: 880, at: 0 },
          { freq: 1320, at: 0.16 },
        ].forEach(({ freq, at }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          const start = t0 + at;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.22 * vol, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.5);
        });
      }
    } catch {}
  };

  const probarSonido = (tono?: string) => {
    setProbandoAudio(true);
    setTimeout(() => setProbandoAudio(false), 800);
    reproducirTono(tono);
  };

  const [permisoNotificaciones, setPermisoNotificaciones] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  const solicitarPermisoNotificaciones = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const p = await Notification.requestPermission();
      setPermisoNotificaciones(p);
      if (p === "granted") {
        setAlertaAtencion("notificacionesEscritorio", true);
      }
    }
  };

  const copiarLunesATodos = () => {
    const lun = horariosPorDia[1] || { apertura: draft.horario.apertura, cierre: draft.horario.cierre };
    setHorariosPorDia({
      1: { ...lun },
      2: { ...lun },
      3: { ...lun },
      4: { ...lun },
      5: { ...lun },
      6: { ...lun },
      0: { ...lun },
    });
    setDraft((prev) => ({
      ...prev,
      horario: {
        ...prev.horario,
        dias: [1, 2, 3, 4, 5, 6],
        apertura: lun.apertura,
        cierre: lun.cierre,
      },
    }));
    setGuardado(false);
  };

  const restablecerHorarioEstandar = () => {
    const estandar = {
      1: { apertura: "08:00", cierre: "20:00" },
      2: { apertura: "08:00", cierre: "20:00" },
      3: { apertura: "08:00", cierre: "20:00" },
      4: { apertura: "08:00", cierre: "20:00" },
      5: { apertura: "08:00", cierre: "20:00" },
      6: { apertura: "09:00", cierre: "18:00" },
      0: { apertura: "10:00", cierre: "16:00" },
    };
    setHorariosPorDia(estandar);
    setDraft((prev) => ({
      ...prev,
      horario: {
        activo: true,
        dias: [1, 2, 3, 4, 5],
        apertura: "08:00",
        cierre: "20:00",
      },
    }));
    setGuardado(false);
  };

  // ── Columnas del tablero ──────────────────────────────────────────────────
  //
  // El store ya sabía hacer todo esto (`agregarColumna`, `renombrarColumna`,
  // `eliminarColumna`, `reordenarColumnas`, `columnasTablero`) y el tablero ya
  // pintaba las columnas y dejaba arrastrar pedidos dentro. Lo que NO existía era
  // ninguna pantalla que las configurara: la capacidad estaba viva y era
  // inalcanzable.
  //
  // Se edita sobre el BORRADOR —y no llamando a los métodos del store— para que
  // «Descartar cambios» siga significando algo: los métodos del store escriben
  // al instante con `updateConfig`, y usarlos aquí convertiría cada clic en un
  // guardado silencioso.
  const [nuevaColumna, setNuevaColumna] = useState("");

  /**
   * Las columnas del tablero, tal como quedarían con el borrador.
   *
   * Se resuelven con las MISMAS funciones puras que usa el store
   * (`estadosActivosDe` + `componerColumnas` + `etiquetaDeEstado`), no con una
   * copia de la regla. Es lo que hace que apagar «Confirmado» quite la columna
   * de la lista AQUÍ, antes de guardar: si la pantalla tuviera su propia
   * versión de la regla, las dos podrían discrepar y el usuario vería una lista
   * que no es la que va a guardar.
   */
  const columnas: ColumnaPersonalizada[] = componerColumnas(
    estadosActivosDe(draft),
    draft.columnasPersonalizadas,
  ).map((id) => ({ id, label: etiquetaDeEstado(id as PedidoEstado, draft) }));

  const moverColumna = (id: string, delta: -1 | 1) => {
    const desde = columnas.findIndex((c) => c.id === id);
    const hasta = desde + delta;
    if (desde < 0 || hasta < 0 || hasta >= columnas.length) return;
    const copia = [...columnas];
    [copia[desde], copia[hasta]] = [copia[hasta], copia[desde]];
    set("columnasPersonalizadas", copia);
  };

  /**
   * Quita una columna propia del tablero.
   *
   * Solo las propias: una etapa del pipeline no se quita desde aquí. Su
   * EXISTENCIA la deciden los interruptores de arriba, y si esta lista pudiera
   * borrarla habría dos controles para el mismo hecho —el que el usuario
   * acaba de apagar, y este— y ganaría el último que se toque.
   */
  const quitarColumna = (id: string) => {
    if (!esColumnaPropiaDe(id)) return;
    if (columnas.length <= 1) return;
    set(
      "columnasPersonalizadas",
      columnas.filter((c) => c.id !== id),
    );
  };

  /** Renombra una columna PROPIA. Las etapas del sistema se renombran arriba. */
  const renombrarColumnaPropia = (id: string, label: string) => {
    set(
      "columnasPersonalizadas",
      columnas.map((c) => (c.id === id ? { ...c, label } : c)),
    );
  };

  const agregarColumna = () => {
    const limpio = nuevaColumna.trim();
    if (limpio === "") return;
    set("columnasPersonalizadas", [
      ...columnas,
      { id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, label: limpio },
    ]);
    setNuevaColumna("");
  };

  const horarioInvalido = draft.horario.activo && draft.horario.cierre <= draft.horario.apertura;

  /**
   * Elige un perfil comercial en el BORRADOR.
   *
   * ── Lo que hacía antes, y por qué se retiró (07/10) ───────────────────────
   *
   * Esta tarjeta tenía un botón «Activar perfil» que llamaba a
   * `setPerfilComercial(key, true)` — el `true` es `resetPedidosDemo`, y hace
   * `this.pedidos = this.generarPedidosDemo(perfil)`. Es decir: un clic
   * SUSTITUÍA TODOS LOS PEDIDOS del negocio por cinco pedidos de ejemplo, sin
   * confirmación y sin pasar por «Guardar cambios». La única pista era la
   * etiqueta del botón («Reaplicar datos demo»), que solo aparecía DESPUÉS de
   * haberlo pulsado una vez.
   *
   * Elegir perfil es elegir terminología, capacidades y catálogo sugerido. No es
   * —y no puede ser— borrar la operación. Ahora la tarjeta escribe el perfil y
   * sus valores por defecto en el borrador, y se aplican al guardar como
   * cualquier otro ajuste de esta pantalla.
   */
  const elegirPerfil = (key: BusinessProfileType) => {
    const p = BUSINESS_PROFILES[key];
    setDraft((prev) => ({
      ...prev,
      perfilComercial: key,
      capacidadesActivas: [...p.defaultCapabilities],
      modalidades: [...p.defaultModalidades],
      aliasEstados: { ...p.defaultAliasEstados },
      plantillas: { ...p.defaultPlantillas },
      catalogo: catalogoDesdePreset(p),
    }));
    setGuardado(false);
  };

  /** Vuelve a los últimos valores CONFIRMADOS del store. No destruye nada. */
  const descartar = () => {
    setDraft(copiaDe(pedidosStore.config));
    setNuevaColumna("");
    setGuardado(false);
  };

  const guardar = () => {
    if (!puedeEditar || horarioInvalido) return;

    const aliasEstados = Object.fromEntries(
      Object.entries(draft.aliasEstados).filter(([, v]) => (v ?? "").trim() !== ""),
    );
    const aliasModalidades = Object.fromEntries(
      Object.entries(draft.aliasModalidades).filter(([, v]) => (v ?? "").trim() !== ""),
    );

    // ── Sin segunda llamada a `setPerfilComercial` ────────────────────────
    //
    // Aquí vivía `if (perfilCambio) pedidosStore.setPerfilComercial(perfil, true)`,
    // que tenía dos defectos a la vez: (1) volvía a llamar a `updateConfig` con
    // los valores del PRESET, pisando lo que el usuario acababa de editar en
    // catálogo, modalidades y alias en esta misma pantalla; y (2) regeneraba los
    // pedidos demo, borrando la operación. Los valores del preset ya están en el
    // borrador desde que se eligió la tarjeta (`elegirPerfil`), así que el
    // guardado es uno solo.
    pedidosStore.updateConfig({
      ...draft,
      aliasEstados,
      aliasModalidades,
    });

    setDraft(copiaDe(pedidosStore.config));
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  // Las tarjetas del hub salen de `ORDEN_SECCIONES` y `META_SECCION`, no de una
  // lista copiada: una sección nueva aparece aquí sola y no puede quedarse sin
  // tarjeta —ni al revés— que es como una navegación se desincroniza del
  // contenido.
  const tarjetasHub: TarjetaHub[] = ORDEN_SECCIONES.map((k) => ({
    key: k,
    label: META_SECCION[k].label,
    hint: META_SECCION[k].hint,
    icono: META_SECCION[k].icono,
    badge: k === "perfil" ? "Solo desarrollo" : undefined,
  }));

  // ═══════════════════════════════════════════════════════════════════════════
  // VISTA RAÍZ — el hub de tarjetas
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Sin `?seccion=`. Es una pantalla de entrada: cabecera y tarjetas, nada más.
  // No se pinta aquí el aviso de solo lectura ni el `<fieldset disabled>`:
  // navegar entre secciones no es editar, y desactivar la navegación dejaría al
  // usuario en modo lectura sin poder ni mirar las otras secciones.
  if (!seccion) {
    const query = busqueda.toLowerCase().trim();
    const tarjetasFiltradas = tarjetasHub.filter((t) => {
      if (!query) return true;
      const coincideTexto =
        t.label.toLowerCase().includes(query) ||
        t.hint.toLowerCase().includes(query);
      const palabrasClave = PALABRAS_CLAVE_SECCION[t.key as ClaveSeccion] || [];
      const coincidePalabrasClave = palabrasClave.some((p) => p.includes(query));
      return coincideTexto || coincidePalabrasClave;
    });

    return (
      <div className="pb-12 space-y-8">
        <PageMeta title="Configuración · Pedidos" description="Ajustes del módulo de pedidos" />

        {/* ── Encabezado con buscador interactivo ─────────────────────── */}
        <section className="space-y-6" data-purpose="page-header">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="text-[24px] sm:text-[36px] font-bold text-[#190088] leading-tight dark:text-white">
                Configuración de Pedidos
              </h1>
              <p className="text-[14px] sm:text-[16px] text-[#212121] dark:text-gray-400 max-w-2xl font-normal leading-relaxed">
                Gestiona el flujo operativo, tiempos, cuentas de cobro, integraciones de mensajería y personalización del tablero.
              </p>
            </div>

            {/* Barra de búsqueda interactiva */}
            <div className="w-full md:w-80 relative shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <input
                id="moduleSearchInput"
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar ajuste o parámetro..."
                className="w-full pl-10 pr-9 py-2.5 text-[14px] font-normal bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-[#FF3F1A]/20 focus:border-[#FF3F1A] dark:focus:border-[#FF3F1A] text-[#212121] dark:text-white shadow-theme-xs transition placeholder-gray-400 dark:placeholder-gray-500"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  aria-label="Borrar búsqueda"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="h-px bg-[#ECECEC] dark:bg-gray-800"></div>
        </section>

        {/* ── Cuadrícula de módulos ─────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-purpose="modules-grid">
          {tarjetasFiltradas.length > 0 ? (
            tarjetasFiltradas.map((t) => {
              const Icono = t.icono;
              const accionLabel = ACCION_SECCION[t.key as ClaveSeccion] || "Configurar";
              return (
                <article
                  key={t.key}
                  onClick={() => entrarASeccion(t.key)}
                  className="group relative bg-white dark:bg-gray-900 border-2 border-[#ECECEC] dark:border-gray-800 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] rounded-3xl p-6 sm:p-7 shadow-theme-xs hover:shadow-theme-md transition-all duration-200 flex flex-col justify-between cursor-pointer hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 flex items-center justify-center text-[#190088] group-hover:bg-[#FF3F1A] group-hover:text-white group-hover:border-[#FF3F1A] transition-all duration-200">
                        <Icono className="w-7 h-7 stroke-[1.75]" />
                      </div>
                      {t.badge && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold tracking-wide uppercase bg-[#97D6DF]/30 text-[#190088] border border-[#97D6DF]/50">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[20px] sm:text-[24px] font-bold text-[#190088] dark:text-white mb-2 group-hover:text-[#FF3F1A] transition-colors leading-tight">
                      {t.label}
                    </h3>
                    <p className="text-[14px] font-normal text-[#212121] dark:text-gray-400 leading-relaxed mb-6">
                      {t.hint}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-[#ECECEC] dark:border-gray-800 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#FF3F1A] group-hover:text-[#e5351a] transition-colors">
                      <span>{accionLabel}</span>
                      <svg className="w-4 h-4 text-[#FF3F1A] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-[#ECECEC] dark:border-gray-800">
              <p className="text-[14px] text-[#212121] dark:text-gray-400 font-normal">
                No se encontraron ajustes para «<span className="font-bold">{busqueda}</span>».
              </p>
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="mt-3 inline-flex items-center text-[12px] font-bold text-[#FF3F1A] hover:underline cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  const meta = META_SECCION[seccion];

  return (
    <div className="pb-12">
      <PageMeta title="Configuración · Pedidos" description="Ajustes del módulo de pedidos" />

      {/* ── CABECERA UNIFICADA ────────────────────────────────────────────── */}
      {/* Sin botón de guardado. La acción vive en el pie de la sección, igual
          que en `/conversaciones/config`: antes estaba aquí Y en el pie, así
          que la misma acción salía dos veces en pantalla. El aviso de
          «Guardado» también se pinta en el pie, junto al botón que lo produce
          — un aviso separado del control que lo causa se lee tarde. */}
      <div className="mb-5">
        <ConfigHeader
          titulo="Configuración de Pedidos"
          descripcion="Ajustes del flujo operativo, modalidades, horario y productos frecuentes."
        />
      </div>

      {/* ── AVISO DE SOLO LECTURA ──────────────────────────────────────────── */}
      {soloLectura && (
        <div className="mb-6">
          <Alert
            variant="warning"
            title="Configuración en modo solo lectura"
            message={motivoSinPermiso("settings.manage")}
          />
        </div>
      )}

      {/* ═══════════ Vuelta al hub — FUERA del fieldset ═══════════ */}
      {/* `fieldset disabled` desactiva NATIVAMENTE los `<button>` de dentro, así
          que en modo solo lectura el usuario que llega por enlace directo se
          quedaría encerrado en la sección sin forma de ver las demás: el control
          existiría y no haría nada. Volver no es editar. */}
      <div className="mb-3">
        <VolverAlHub onVolver={volverAlHub} />
      </div>

      {/* ═══════════ Panel de contenido: UNA sección montada ═══════════ */}
      {/* El `<fieldset>` envuelve SOLO el panel. `min-w-0` neutraliza el
          `min-inline-size: min-content` por defecto del fieldset. */}
      <fieldset
        disabled={soloLectura}
        className="m-0 min-w-0 border-0 p-0"
      >
        <ConfigShell
          seccionKey={seccion}
          titulo={meta.label}
          hint={meta.hint}
          footer={
            <ConfigAcciones
              fija
              mensaje={
                guardado ? (
                  <span className="text-sm text-accent-600 dark:text-accent-500">
                    Guardado ✓
                  </span>
                ) : undefined
              }
            >
              <Button variant="outline" onClick={descartar} disabled={soloLectura}>
                Descartar cambios
              </Button>
              <Button disabled={horarioInvalido || soloLectura} onClick={guardar}>
                Guardar cambios
              </Button>
            </ConfigAcciones>
          }
        >
            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN: PERFIL DE NEGOCIO (¿QUÉ VENDES?)
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "perfil" && (
              <BloqueConfig
                icono={GridIcon}
                pregunta="¿Qué vende tu negocio?"
                descripcion="Elegir un perfil adapta las capacidades, los campos de producto, el catálogo sugerido y la terminología. No toca los pedidos que ya tienes."
              >
                {/* Banner distintivo de modo desarrollo */}
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#ECECEC] bg-[#EFE6D3] p-3.5 text-[12px] text-[#212121] dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  <span className="flex h-6 w-9 shrink-0 items-center justify-center rounded-lg bg-[#190088] text-white font-bold text-[10px] tracking-wider uppercase">
                    DEV
                  </span>
                  <span>
                    <strong>Herramienta de desarrollo:</strong> Esta sección permite alternar perfiles comerciales para pruebas y ajustes del módulo de pedidos.
                  </span>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Perfil de negocio"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                  {(Object.keys(BUSINESS_PROFILES) as BusinessProfileType[])
                    .filter((key) => key !== "services")
                    .map((key) => {
                    const p = BUSINESS_PROFILES[key];
                    const seleccionado = (draft.perfilComercial ?? "food") === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={seleccionado}
                        onClick={() => elegirPerfil(key)}
                        className={`flex flex-col rounded-2xl border-2 p-5 text-left transition-all duration-200 cursor-pointer ${
                          seleccionado
                            ? "border-[#FF3F1A] bg-[#FF3F1A]/[0.04] shadow-theme-xs dark:border-[#FF3F1A] dark:bg-[#FF3F1A]/10"
                            : "border-[#ECECEC] hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                        }`}
                      >
                        <div className="flex w-full items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl" aria-hidden="true">
                              {p.icon}
                            </span>
                            <div>
                              <span className="block text-[16px] font-bold text-[#190088] dark:text-white leading-tight">
                                {p.name}
                              </span>
                              <span className="block text-[14px] font-normal text-[#212121] dark:text-gray-400 mt-0.5">
                                {p.description}
                              </span>
                            </div>
                          </div>
                          {seleccionado && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#FF3F1A] text-white">
                              Activo
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex w-full flex-wrap gap-1.5 border-t border-[#ECECEC] pt-2.5 dark:border-gray-800/60">
                          {p.defaultCapabilities.map((cap) => (
                            <span
                              key={cap}
                              className="inline-flex items-center rounded-lg bg-[#ECECEC] px-2 py-0.5 text-[12px] font-normal text-[#212121] dark:bg-gray-800 dark:text-gray-300"
                            >
                              {cap === "modifiers" && "Modificadores de platillo"}
                              {cap === "variants" && "Tallas y variantes"}
                              {cap === "preparation_time" && "Tiempo de preparación"}
                              {cap === "carrier_shipment" && "Envíos con guía"}
                              {cap === "local_delivery" && "Reparto urbano"}
                              {cap === "table_service" && "Consumo en mesa"}
                              {cap === "appointment_scheduling" && "Citas / Agendamiento"}
                              {cap === "returns_refunds" && "Devoluciones"}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-4 text-[12px] font-normal text-gray-500 dark:text-gray-400">
                  Cambiar de perfil reemplaza el catálogo sugerido y los nombres por defecto de
                  esta pantalla. Se aplica al guardar, como el resto de ajustes.
                </p>
              </BloqueConfig>
            )}

            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN: OPERACIÓN Y FLUJO
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "flujo" && (
              <>
                {/* ── 2 · Las modalidades ────────────────────────────────────── */}
                <BloqueConfig
                  icono={TruckDelivery}
                  pregunta="¿Cómo entregas?"
                  descripcion="Los servicios de despacho que aceptas al recibir un pedido. Al menos uno tiene que quedar encendido."
                >
                  {TODAS_MODALIDADES.map((m) => {
                    const activa = draft.modalidades.includes(m);
                    const info = MODALIDAD_INFO[m];

                    return (
                      <ToggleRow
                        key={m}
                        titulo={info.label}
                        descripcion={info.desc}
                        control={
                          <div className="flex items-center gap-2.5">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-bold",
                              activa ? "bg-[#FF3F1A]/10 text-[#FF3F1A]" : "bg-[#ECECEC] text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            )}>
                              {activa ? "Activa" : "Inactiva"}
                            </span>
                            <Switch
                              checked={activa}
                              disabled={activa && draft.modalidades.length === 1}
                              onChange={() => toggleModalidad(m)}
                              aria-label={`Habilitar modalidad ${info.label}`}
                            />
                          </div>
                        }
                      />
                    );
                  })}
                </BloqueConfig>

                {/* ── 3 · Sección Fusionada: ¿Cómo llamas a cada etapa y columnas del tablero? ── */}
                <section className="bg-white dark:bg-gray-900 rounded-3xl border border-[#ECECEC] dark:border-gray-800 shadow-theme-xs p-6 sm:p-8 mb-6" data-purpose="etapas-columnas-fused-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 text-[#190088] flex items-center justify-center shrink-0">
                        <TableIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-[20px] sm:text-[24px] font-bold text-[#190088] dark:text-white leading-tight">¿Cómo llamas a cada etapa y columnas del tablero?</h2>
                        <p className="text-[14px] font-normal text-[#212121] dark:text-gray-400 mt-1">
                          Haz doble clic sobre el nombre para renombrarlo, arrastra para reordenar las columnas y define su visibilidad en el tablero.
                        </p>
                      </div>
                    </div>
                    {/* Live Badge Info */}
                    <div className="inline-flex items-center gap-2 self-start sm:self-auto bg-[#ECECEC] dark:bg-gray-800 text-[#212121] dark:text-gray-200 px-3.5 py-1.5 rounded-xl text-[12px] font-bold border border-[#ECECEC] dark:border-gray-700 shrink-0">
                      <GripVertical className="w-3.5 h-3.5 text-[#FF3F1A]" />
                      <span>{columnas.length} columnas activas</span>
                    </div>
                  </div>

                  {/* SUBSECTION: Columnas / Etapas en Grid Compacto (Diseño corto) */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold tracking-wider uppercase text-gray-500">Columnas del Tablero Kanban</span>
                        <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#ECECEC] dark:bg-gray-800 text-[#212121] dark:text-gray-300">
                          {columnas.length} etapas
                        </span>
                      </div>
                      <span className="text-[12px] font-normal text-gray-400 hidden sm:flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-warning-500" />
                        Doble clic en el nombre o clic en el lápiz para renombrar
                      </span>
                    </div>

                    {/* Lista interactiva compacta (acortada horizontalmente con lápiz de edición) */}
                    <div className="space-y-3 max-w-xl">
                      {columnas.map((col, idx) => {
                        const esPropia = esColumnaPropiaDe(col.id);
                        const isDragged = columnaArrastrada === col.id;
                        const key = `col_${col.id}`;
                        const isEditing = chipEditando === key;

                        let categoriaBadge = { label: "Personalizado", cls: "bg-[#ECECEC] text-[#212121] border-[#ECECEC] dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700" };
                        if (col.id === "nuevo") {
                          categoriaBadge = { label: "Cobranza", cls: "bg-[#EFE6D3] text-[#212121] border-[#ECECEC] dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700" };
                        } else if (col.id === "confirmado") {
                          categoriaBadge = { label: "Aprobado", cls: "bg-[#97D6DF]/20 text-[#190088] border-[#97D6DF]/30 dark:bg-gray-800 dark:text-[#97D6DF]" };
                        } else if (col.id === "en_preparacion") {
                          categoriaBadge = { label: "Bodega", cls: "bg-[#97D6DF]/20 text-[#190088] border-[#97D6DF]/30 dark:bg-gray-800 dark:text-[#97D6DF]" };
                        } else if (col.id === "listo") {
                          categoriaBadge = { label: "Logística", cls: "bg-[#97D6DF]/20 text-[#190088] border-[#97D6DF]/30 dark:bg-gray-800 dark:text-[#97D6DF]" };
                        } else if (col.id === "en_camino") {
                          categoriaBadge = { label: "Entrega", cls: "bg-[#97D6DF]/20 text-[#190088] border-[#97D6DF]/30 dark:bg-gray-800 dark:text-[#97D6DF]" };
                        }

                        const toggleActive = (checked: boolean) => {
                          if (col.id === "confirmado") set("usarConfirmado", checked);
                          else if (col.id === "en_camino") set("usarEnCamino", checked);
                          else if (esPropia && !checked) quitarColumna(col.id);
                        };

                        const isChecked = col.id === "confirmado" ? draft.usarConfirmado : col.id === "en_camino" ? draft.usarEnCamino : true;
                        const canToggle = col.id === "confirmado" || col.id === "en_camino" || esPropia;

                        return (
                          <div
                            key={col.id}
                            draggable
                            onDragStart={() => handleDragStart(col.id)}
                            onDragOver={(e) => handleDragOver(e, col.id)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "group flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800/90 border border-[#ECECEC] dark:border-gray-700/80 rounded-2xl shadow-theme-xs hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] transition-all duration-150",
                              isDragged && "opacity-45 scale-[0.99] border-dashed border-[#FF3F1A] bg-gray-50 dark:bg-gray-900"
                            )}
                          >
                            {/* Lado izquierdo: Grip + Número + Nombre editable + Lápiz + Pill de categoría */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <button
                                type="button"
                                className="cursor-grab active:cursor-grabbing text-gray-300 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                                title="Arrastrar para ordenar"
                              >
                                <GripVertical className="w-4 h-4" />
                              </button>

                              <span className="w-8 h-8 rounded-xl bg-[#ECECEC] dark:bg-gray-700/80 text-[#212121] dark:text-gray-200 font-bold text-[12px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>

                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {!isEditing ? (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      onDoubleClick={() => iniciarEdicionColumna(col.id, col.label)}
                                      className="font-bold text-[#212121] dark:text-white text-[14px] tracking-tight truncate cursor-pointer hover:text-[#FF3F1A] select-none py-0.5"
                                      title="Haz doble clic para escribir y renombrar"
                                    >
                                      {col.label}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        iniciarEdicionColumna(col.id, col.label);
                                      }}
                                      className="text-gray-400 hover:text-[#FF3F1A] p-1 rounded-md transition cursor-pointer shrink-0"
                                      title="Editar nombre"
                                    >
                                      <PencilIcon className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      autoFocus
                                      className="text-[14px] font-bold py-1 px-2.5 border border-[#FF3F1A] rounded-lg outline-none bg-white dark:bg-gray-900 dark:text-white text-[#212121] ring-2 ring-[#FF3F1A]/20 w-44 sm:w-56"
                                      type="text"
                                      value={chipTempValor}
                                      onChange={(e) => setChipTempValor(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") guardarEdicionColumna(col.id);
                                        if (e.key === "Escape") cancelarEdicionChip();
                                      }}
                                      onBlur={() => guardarEdicionColumna(col.id)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => guardarEdicionColumna(col.id)}
                                      className="p-1.5 bg-[#FF3F1A] text-white rounded-lg text-xs hover:bg-[#e5351a] cursor-pointer"
                                      title="Guardar nombre"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg text-[12px] font-bold border shrink-0", categoriaBadge.cls)}>
                                  {categoriaBadge.label}
                                </span>
                              </div>
                            </div>

                            {/* Lado derecho: Switch + Papelera si es propia */}
                            <div className="flex items-center gap-2.5 shrink-0 ml-3">
                              <label
                                className={cn("flex items-center", canToggle ? "cursor-pointer" : "cursor-not-allowed opacity-60")}
                                title={canToggle ? "Mostrar en tablero" : "Etapa esencial obligatoria"}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!canToggle}
                                  onChange={(e) => toggleActive(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF3F1A]" />
                              </label>

                              {esPropia && (
                                <button
                                  type="button"
                                  onClick={() => quitarColumna(col.id)}
                                  title="Eliminar columna"
                                  className="p-1.5 text-gray-400 hover:text-[#FF3F1A] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer"
                                >
                                  <TrashBinIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Column Input Form */}
                  <div className="mt-6 pt-5 border-t border-[#ECECEC] dark:border-gray-800 flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-80">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <PlusIcon className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        placeholder="Nombre de nueva columna personalizada..."
                        value={nuevaColumna}
                        onChange={(e) => setNuevaColumna(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarColumna()}
                        className="block w-full pl-9 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-[#ECECEC] dark:border-gray-700 text-[#212121] dark:text-white text-[14px] font-normal rounded-xl focus:border-[#FF3F1A] focus:ring-2 focus:ring-[#FF3F1A]/20 transition outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={agregarColumna}
                      disabled={nuevaColumna.trim() === ""}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#ECECEC] dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#FF3F1A] hover:text-[#FF3F1A] text-[#212121] dark:text-gray-200 font-bold text-[14px] shadow-theme-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4 text-[#FF3F1A]" />
                      <span>Añadir columna</span>
                    </button>
                  </div>

                  {/* Footer Notice */}
                  <p className="mt-5 text-[12px] font-normal text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>Los nombres y el orden configurados aquí se sincronizan en vivo con tu tablero Kanban y la vista de clientes.</span>
                  </p>
                </section>
              </>
            )}

            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN: CUENTAS Y COBROS (PAGOS)
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "pagos" && (
              <div className="space-y-8 animate-aparecer">
                {/* ── BLOQUE 1: ¿A qué cuentas te transfieren? ─────────────── */}
                <section
                  className="rounded-3xl border border-[#ECECEC] bg-white p-6 shadow-theme-xs sm:p-8 dark:border-gray-800 dark:bg-gray-900"
                  data-purpose="transfer-accounts-config"
                >
                  <div className="flex items-start gap-4 border-b border-[#ECECEC] pb-6 dark:border-gray-800">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 text-[#190088] dark:bg-[#97D6DF]/15 dark:text-[#97D6DF]">
                      <BuildingOffice2Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-[20px] sm:text-[24px] font-bold text-[#190088] dark:text-white leading-tight">
                        ¿A qué cuentas te transfieren?
                      </h2>
                      <p className="mt-1 text-[14px] font-normal text-[#212121] dark:text-gray-400">
                        Datos compartidos con el cliente al pagar por transferencia. Los campos vacíos se omitirán automáticamente del mensaje final.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-6">
                    {/* Beneficiary Name Input */}
                    <div className="max-w-xl">
                      <label
                        className="block text-[12px] font-bold uppercase tracking-wider text-[#212121] dark:text-gray-300"
                        htmlFor="pago-titular"
                      >
                        Titular de la cuenta
                      </label>
                      <p className="mb-2 text-[12px] font-normal text-gray-500 dark:text-gray-400">
                        Nombre de la persona o empresa titular. Se incluye al inicio del comprobante de cobro.
                      </p>
                      <div className="relative rounded-xl shadow-theme-xs">
                        <input
                          id="pago-titular"
                          type="text"
                          value={draft.datosBancarios?.titular ?? ""}
                          onChange={(e) => setDatoBancario("titular", e.target.value)}
                          placeholder="Ej. Restaurante Sabor & Leña SAS"
                          className="block w-full rounded-xl border border-[#ECECEC] bg-white py-2.5 pl-3.5 pr-10 text-[14px] text-[#212121] placeholder:text-gray-400 focus:border-[#FF3F1A] focus:ring-2 focus:ring-[#FF3F1A]/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Bank Accounts Grid */}
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      {/* Nequi Card */}
                      <div className="rounded-2xl border border-[#ECECEC] bg-gray-50/50 p-4 transition focus-within:border-[#FF3F1A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF3F1A]/20 dark:border-gray-800 dark:bg-gray-950/40 dark:focus-within:bg-gray-900">
                        <div className="mb-2.5 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#20002c]/10 px-2.5 py-0.5 text-[12px] font-bold text-[#20002c] dark:bg-[#20002c]/20 dark:text-purple-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#20002c] dark:bg-purple-400" />
                            Nequi
                          </span>
                          <span className="text-[12px] font-normal text-gray-400">Celular</span>
                        </div>
                        <label className="sr-only" htmlFor="pago-nequi">Número Nequi</label>
                        <input
                          id="pago-nequi"
                          type="text"
                          value={draft.datosBancarios?.nequi ?? ""}
                          onChange={(e) => setDatoBancario("nequi", e.target.value)}
                          placeholder="Ej. 300 123 4567"
                          className="block w-full rounded-xl border border-[#ECECEC] bg-white px-3 py-2 text-[14px] font-medium tracking-wide text-[#212121] placeholder:text-gray-400 focus:border-[#FF3F1A] focus:ring-2 focus:ring-[#FF3F1A]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                      </div>

                      {/* Daviplata Card */}
                      <div className="rounded-2xl border border-[#ECECEC] bg-gray-50/50 p-4 transition focus-within:border-[#FF3F1A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF3F1A]/20 dark:border-gray-800 dark:bg-gray-950/40 dark:focus-within:bg-gray-900">
                        <div className="mb-2.5 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#ed1c24]/10 px-2.5 py-0.5 text-[12px] font-bold text-[#ed1c24] dark:bg-[#ed1c24]/20 dark:text-red-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#ed1c24] dark:bg-red-400" />
                            Daviplata
                          </span>
                          <span className="text-[12px] font-normal text-gray-400">Celular</span>
                        </div>
                        <label className="sr-only" htmlFor="pago-daviplata">Número Daviplata</label>
                        <input
                          id="pago-daviplata"
                          type="text"
                          value={draft.datosBancarios?.daviplata ?? ""}
                          onChange={(e) => setDatoBancario("daviplata", e.target.value)}
                          placeholder="Ej. 300 123 4567"
                          className="block w-full rounded-xl border border-[#ECECEC] bg-white px-3 py-2 text-[14px] font-medium tracking-wide text-[#212121] placeholder:text-gray-400 focus:border-[#FF3F1A] focus:ring-2 focus:ring-[#FF3F1A]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                      </div>

                      {/* Bancolombia / Otros Bancos Card */}
                      <div className="rounded-2xl border border-[#ECECEC] bg-gray-50/50 p-4 transition focus-within:border-[#FF3F1A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF3F1A]/20 dark:border-gray-800 dark:bg-gray-950/40 dark:focus-within:bg-gray-900">
                        <div className="mb-2.5 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#97D6DF]/30 px-2.5 py-0.5 text-[12px] font-bold text-[#190088] dark:bg-[#97D6DF]/20 dark:text-[#97D6DF]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#190088] dark:bg-[#97D6DF]" />
                            Bancolombia / Otros
                          </span>
                          <span className="text-[12px] font-normal text-gray-400">Cuenta</span>
                        </div>
                        <label className="sr-only" htmlFor="pago-bancolombia">Cuenta Bancolombia u otros bancos</label>
                        <input
                          id="pago-bancolombia"
                          type="text"
                          value={draft.datosBancarios?.bancolombia ?? ""}
                          onChange={(e) => setDatoBancario("bancolombia", e.target.value)}
                          placeholder="Tipo y # de cuenta"
                          className="block w-full rounded-xl border border-[#ECECEC] bg-white px-3 py-2 text-[14px] font-medium tracking-wide text-[#212121] placeholder:text-gray-400 focus:border-[#FF3F1A] focus:ring-2 focus:ring-[#FF3F1A]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── BLOQUE 2: ¿Cómo te pueden pagar? ─────────────────────── */}
                <section
                  className="rounded-3xl border border-[#ECECEC] bg-white p-6 shadow-theme-xs sm:p-8 dark:border-gray-800 dark:bg-gray-900"
                  data-purpose="supported-payment-methods"
                >
                  <div className="flex items-start gap-4 border-b border-[#ECECEC] pb-6 dark:border-gray-800">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 text-[#190088] dark:bg-[#97D6DF]/15 dark:text-[#97D6DF]">
                      <DollarLineIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-[20px] sm:text-[24px] font-bold text-[#190088] dark:text-white leading-tight">
                        ¿Cómo te pueden pagar?
                      </h2>
                      <p className="mt-1 text-[14px] font-normal text-[#212121] dark:text-gray-400">
                        Habilita o apaga los medios de pago disponibles. Los métodos inactivos se retirarán de inmediato del selector de pedidos.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 divide-y divide-[#ECECEC] dark:divide-gray-800">
                    {/* Item 1: Transferencias */}
                    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div className="pr-6">
                        <span className="text-[14px] font-bold text-[#212121] dark:text-white">
                          Transferencias (Nequi / Daviplata / Bancos)
                        </span>
                        <p className="mt-0.5 text-[12px] font-normal text-gray-500 dark:text-gray-400">
                          El cliente realiza la transferencia a tus cuentas configuradas y adjunta el comprobante.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "hidden text-[12px] font-bold sm:inline-block",
                          draft.datosBancarios?.transferenciaActivo !== false ? "text-[#FF3F1A]" : "text-gray-400 dark:text-gray-500"
                        )}>
                          {draft.datosBancarios?.transferenciaActivo !== false ? "Activo" : "Inactivo"}
                        </span>
                        <Switch
                          checked={draft.datosBancarios?.transferenciaActivo !== false}
                          color="orange"
                          onChange={(v) => setDatoBancario("transferenciaActivo", v)}
                          aria-label="Aceptar transferencias"
                        />
                      </div>
                    </div>

                    {/* Item 2: Contra Entrega */}
                    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div className="pr-6">
                        <span className="text-[14px] font-bold text-[#212121] dark:text-white">
                          Pago contra entrega (Domicilio)
                        </span>
                        <p className="mt-0.5 text-[12px] font-normal text-gray-500 dark:text-gray-400">
                          El cliente paga en efectivo o transferencia directamente al domiciliario al recibir su pedido.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "hidden text-[12px] font-bold sm:inline-block",
                          draft.datosBancarios?.contraEntregaActivo !== false ? "text-[#FF3F1A]" : "text-gray-400 dark:text-gray-500"
                        )}>
                          {draft.datosBancarios?.contraEntregaActivo !== false ? "Activo" : "Inactivo"}
                        </span>
                        <Switch
                          checked={draft.datosBancarios?.contraEntregaActivo !== false}
                          color="orange"
                          onChange={(v) => setDatoBancario("contraEntregaActivo", v)}
                          aria-label="Aceptar contra entrega"
                        />
                      </div>
                    </div>

                    {/* Item 3: Link Digital */}
                    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div className="pr-6">
                        <span className="text-[14px] font-bold text-[#212121] dark:text-white">
                          Link de pago digital (Tarjeta y PSE)
                        </span>
                        <p className="mt-0.5 text-[12px] font-normal text-gray-500 dark:text-gray-400">
                          Genera o envía un enlace digital en línea para pagar con tarjeta de crédito, débito o PSE.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "hidden text-[12px] font-bold sm:inline-block",
                          draft.datosBancarios?.linkPagoActivo !== false ? "text-[#FF3F1A]" : "text-gray-400 dark:text-gray-500"
                        )}>
                          {draft.datosBancarios?.linkPagoActivo !== false ? "Activo" : "Inactivo"}
                        </span>
                        <Switch
                          checked={draft.datosBancarios?.linkPagoActivo !== false}
                          color="orange"
                          onChange={(v) => setDatoBancario("linkPagoActivo", v)}
                          aria-label="Aceptar link de pago"
                        />
                      </div>
                    </div>

                    {/* Item 4: Efectivo en Local */}
                    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div className="pr-6">
                        <span className="text-[14px] font-bold text-[#212121] dark:text-white">
                          Efectivo en local (Retiro / En sitio)
                        </span>
                        <p className="mt-0.5 text-[12px] font-normal text-gray-500 dark:text-gray-400">
                          Cobro presencial en caja al momento de recoger la orden o consumir dentro del establecimiento.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "hidden text-[12px] font-bold sm:inline-block",
                          draft.datosBancarios?.efectivoActivo !== false ? "text-[#FF3F1A]" : "text-gray-400 dark:text-gray-500"
                        )}>
                          {draft.datosBancarios?.efectivoActivo !== false ? "Activo" : "Inactivo"}
                        </span>
                        <Switch
                          checked={draft.datosBancarios?.efectivoActivo !== false}
                          color="orange"
                          onChange={(v) => setDatoBancario("efectivoActivo", v)}
                          aria-label="Aceptar efectivo en local"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── BLOQUE 3: ¿Qué pasarela usas para el cobro en línea? ─── */}
                {draft.datosBancarios?.linkPagoActivo !== false && (
                  <section
                    className="rounded-3xl border border-[#ECECEC] bg-white p-6 shadow-theme-xs sm:p-8 dark:border-gray-800 dark:bg-gray-900"
                    data-purpose="payment-gateway-selection"
                  >
                    <div className="flex items-start gap-4 border-b border-[#ECECEC] pb-6 dark:border-gray-800">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 text-[#190088] dark:bg-[#97D6DF]/15 dark:text-[#97D6DF]">
                        <ShieldCheckIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-[20px] sm:text-[24px] font-bold text-[#190088] dark:text-white leading-tight">
                          ¿Qué pasarela usas para el cobro en línea?
                        </h2>
                        <p className="mt-1 text-[14px] font-normal text-[#212121] dark:text-gray-400">
                          Con checkout integrado procesas cobros sin salir del flujo. Con enlace externo, cada pedido dirigirá a tu link personalizado.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Option 1: GlobalPay */}
                        <button
                          type="button"
                          onClick={() => setDatoBancario("linkPagoTipo", "globalpay")}
                          className={cn(
                            "group relative flex cursor-pointer flex-col justify-between rounded-2xl border-2 p-5 text-left transition-all",
                            (draft.datosBancarios?.linkPagoTipo ?? "globalpay") === "globalpay"
                              ? "border-[#FF3F1A] bg-[#FF3F1A]/[0.04] ring-1 ring-[#FF3F1A]/20 shadow-theme-xs dark:bg-[#FF3F1A]/10"
                              : "border-[#ECECEC] bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <h3 className="text-[16px] font-bold text-[#190088] dark:text-white">
                                GlobalPay de Redeban
                              </h3>
                              <span className="rounded-full bg-[#97D6DF]/30 px-2.5 py-0.5 text-[12px] font-bold text-[#190088] border border-[#97D6DF]/50 dark:bg-[#97D6DF]/20 dark:text-[#97D6DF]">
                                Recomendado
                              </span>
                            </div>
                            <p className="mt-2 text-[12px] leading-relaxed text-[#212121] dark:text-gray-400">
                              Checkout propio y transparente dentro de la aplicación. Soporte nativo para tarjetas de crédito, débito y PSE sin redirecciones externas.
                            </p>
                          </div>
                          <div className={cn(
                            "mt-4 flex items-center gap-2 pt-3 border-t text-[12px] font-bold",
                            (draft.datosBancarios?.linkPagoTipo ?? "globalpay") === "globalpay"
                              ? "border-[#FF3F1A]/20 text-[#FF3F1A]"
                              : "border-gray-100 text-gray-400 dark:border-gray-800 dark:text-gray-500"
                          )}>
                            {(draft.datosBancarios?.linkPagoTipo ?? "globalpay") === "globalpay" ? (
                              <>
                                <svg className="h-4 w-4 text-[#FF3F1A]" fill="currentColor" viewBox="0 0 20 20">
                                  <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" fillRule="evenodd" />
                                </svg>
                                <span>Opción activa actualmente</span>
                              </>
                            ) : (
                              <>
                                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                                <span>Configuración automática</span>
                              </>
                            )}
                          </div>
                        </button>

                        {/* Option 2: Link Externo */}
                        <button
                          type="button"
                          onClick={() => setDatoBancario("linkPagoTipo", "personalizado")}
                          className={cn(
                            "group relative flex cursor-pointer flex-col justify-between rounded-2xl border-2 p-5 text-left transition-all",
                            draft.datosBancarios?.linkPagoTipo === "personalizado"
                              ? "border-[#FF3F1A] bg-[#FF3F1A]/[0.04] ring-1 ring-[#FF3F1A]/20 shadow-theme-xs dark:bg-[#FF3F1A]/10"
                              : "border-[#ECECEC] bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <h3 className="text-[16px] font-bold text-[#190088] dark:text-white">
                                Link externo (Wompi, Bold, Mercado Pago)
                              </h3>
                              <span className="rounded-full bg-[#ECECEC] px-2.5 py-0.5 text-[12px] font-bold text-[#212121] dark:bg-gray-800 dark:text-gray-300">
                                Personalizado
                              </span>
                            </div>
                            <p className="mt-2 text-[12px] leading-relaxed text-[#212121] dark:text-gray-400">
                              El cliente paga directamente en tu propia cuenta de pasarela. El sistema le envía tu link único para que complete el abono.
                            </p>
                          </div>
                          <div className={cn(
                            "mt-4 flex items-center gap-2 pt-3 border-t text-[12px] font-bold",
                            draft.datosBancarios?.linkPagoTipo === "personalizado"
                              ? "border-[#FF3F1A]/20 text-[#FF3F1A]"
                              : "border-gray-100 text-gray-400 dark:border-gray-800 dark:text-gray-500"
                          )}>
                            {draft.datosBancarios?.linkPagoTipo === "personalizado" ? (
                              <>
                                <svg className="h-4 w-4 text-[#FF3F1A]" fill="currentColor" viewBox="0 0 20 20">
                                  <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" fillRule="evenodd" />
                                </svg>
                                <span>Opción activa actualmente</span>
                              </>
                            ) : (
                              <>
                                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                                <span>Configuración manual</span>
                              </>
                            )}
                          </div>
                        </button>
                      </div>

                      {draft.datosBancarios?.linkPagoTipo === "personalizado" && (
                        <div className="rounded-2xl border border-[#ECECEC] bg-gray-50/70 p-5 dark:border-gray-800 dark:bg-gray-950/60">
                          <label
                            className="block text-[12px] font-bold uppercase tracking-wider text-[#212121] dark:text-gray-300"
                            htmlFor="external-payment-url"
                          >
                            URL o enlace de cobro externo
                          </label>
                          <p className="mt-0.5 mb-2.5 text-[12px] font-normal text-gray-500 dark:text-gray-400">
                            Pega tu enlace de cobro general. Si se deja en blanco, el sistema priorizará el checkout integrado predeterminado.
                          </p>
                          <div className="relative rounded-xl shadow-theme-xs">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                            <input
                              id="external-payment-url"
                              type="url"
                              placeholder="Ej: https://checkout.wompi.co/l/link-de-tu-negocio o https://mpago.li/..."
                              value={draft.datosBancarios?.linkPagoUrl ?? ""}
                              onChange={(e) => setDatoBancario("linkPagoUrl", e.target.value)}
                              className="block w-full rounded-xl border border-[#ECECEC] bg-white py-2.5 pl-10 pr-4 text-[14px] text-[#212121] placeholder:text-gray-400 focus:border-[#FF3F1A] focus:ring-2 focus:ring-[#FF3F1A]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Preview Callout for Client Link */}
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#ECECEC] bg-[#EFE6D3] p-3.5 text-[12px] text-[#212121] dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#212121] dark:text-gray-300">
                            Enlace generado que recibirá el cliente:
                          </span>
                          <code className="rounded bg-white/90 px-2 py-0.5 font-mono font-bold text-[#190088] select-all border border-[#ECECEC] dark:bg-gray-900 dark:text-[#97D6DF]">
                            {enlaceDePago(draft.datosBancarios, "P-001", window.location.origin)}
                          </code>
                        </div>
                        <span className="rounded bg-[#97D6DF]/30 px-2 py-0.5 text-[10px] font-bold text-[#190088] uppercase dark:bg-[#97D6DF]/20 dark:text-[#97D6DF]">
                          Ejemplo pedido #P-001
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                {/* ── BLOQUE 4: ¿Qué le dices al cliente para que pague? ───── */}
                <section
                  className="rounded-3xl border border-[#ECECEC] bg-white p-6 shadow-theme-xs sm:p-8 dark:border-gray-800 dark:bg-gray-900"
                  data-purpose="customer-message-preview"
                >
                  <div className="flex items-start gap-4 border-b border-[#ECECEC] pb-6 dark:border-gray-800">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 text-[#190088] dark:bg-[#97D6DF]/15 dark:text-[#97D6DF]">
                      <PageIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-[20px] sm:text-[24px] font-bold text-[#190088] dark:text-white leading-tight">
                        ¿Qué le dices al cliente para que pague?
                      </h2>
                      <p className="mt-1 text-[14px] font-normal text-[#212121] dark:text-gray-400">
                        Texto estructurado que el operador o bot de WhatsApp copia y envía al confirmar el pedido.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
                    {/* Instructions Form Editor */}
                    <div className="space-y-4 lg:col-span-5">
                      <div>
                        <label
                          className="block text-[12px] font-bold uppercase tracking-wider text-[#212121] dark:text-gray-300"
                          htmlFor="pago-instrucciones"
                        >
                          Instrucciones finales de cobro
                        </label>
                        <p className="mt-1 text-[12px] font-normal text-gray-500 dark:text-gray-400">
                          Este mensaje cierra la notificación, justo después del resumen de cuentas y el enlace.
                        </p>
                      </div>
                      <div className="relative">
                        <textarea
                          id="pago-instrucciones"
                          rows={5}
                          value={draft.datosBancarios?.instrucciones ?? ""}
                          onChange={(e) => setDatoBancario("instrucciones", e.target.value)}
                          placeholder="Envía el comprobante con tu nombre y número de pedido."
                          className="block w-full rounded-2xl border border-[#ECECEC] bg-white p-3 font-sans text-[14px] text-[#212121] placeholder:text-gray-400 focus:border-[#FF3F1A] focus:ring-2 focus:ring-[#FF3F1A]/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                        <div className="mt-2 flex items-center justify-between text-[12px] text-gray-400">
                          <span>Variables dinámicas aplicadas automáticamente</span>
                          <span>{(draft.datosBancarios?.instrucciones ?? "").length} caracteres</span>
                        </div>
                      </div>

                      {/* Helpful tips badge */}
                      <div className="rounded-2xl border border-[#ECECEC] bg-[#EFE6D3] p-3.5 text-[12px] text-[#212121] dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-400">
                        <div className="flex items-center gap-2 font-bold text-[#190088] dark:text-gray-200">
                          <svg className="h-4 w-4 text-[#190088] dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Consejo de formato
                        </div>
                        <p className="mt-1 text-[#212121] dark:text-gray-400">
                          Las cuentas en blanco no se listan en el mensaje, evitando líneas vacías o confusiones para el comprador.
                        </p>
                      </div>
                    </div>

                    {/* Message Live Preview */}
                    <div className="lg:col-span-7">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Vista previa interactiva del mensaje
                        </span>
                        <button
                          type="button"
                          onClick={copiarMensajeCobro}
                          className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-bold text-[#FF3F1A] hover:text-[#e5351a]"
                        >
                          {copiadoCobro ? (
                            <>
                              <svg className="h-3.5 w-3.5 text-success-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span className="font-bold text-success-600 dark:text-success-400">Copiado ✓</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span>Copiar texto</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Preview Bubble UI Container */}
                      <div className="relative overflow-hidden rounded-2xl border border-[#ECECEC] bg-[#212121] shadow-theme-inner dark:border-gray-800">
                        {/* Mock Header Bar */}
                        <div className="flex items-center justify-between border-b border-gray-800 bg-[#190088] px-4 py-2.5 text-[12px] text-white">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#97D6DF]" />
                            <span className="font-bold text-white">Mensaje generado para WhatsApp / SMS</span>
                          </div>
                          <span className="font-mono text-[10px] text-gray-200">Formato limpio</span>
                        </div>
                        {/* Bubble body */}
                        <div className="select-all bg-[#212121] p-5 font-mono text-[12px] leading-relaxed text-gray-200">
                          <div className="space-y-1.5 font-sans">
                            {draft.datosBancarios?.titular ? (
                              <>
                                <p className="text-[12px] font-bold uppercase tracking-wide text-[#97D6DF]">Titular:</p>
                                <p className="border-b border-gray-800 pb-2 text-[14px] font-bold text-white">
                                  {draft.datosBancarios.titular}
                                </p>
                              </>
                            ) : null}

                            <div className="space-y-1 py-2 font-mono text-gray-300">
                              {draft.datosBancarios?.nequi ? (
                                <p><span className="text-gray-400">Nequi:</span> <span className="font-bold text-white">{draft.datosBancarios.nequi}</span></p>
                              ) : null}
                              {draft.datosBancarios?.daviplata ? (
                                <p><span className="text-gray-400">Daviplata:</span> <span className="font-bold text-white">{draft.datosBancarios.daviplata}</span></p>
                              ) : null}
                              {draft.datosBancarios?.bancolombia ? (
                                <p><span className="text-gray-400">Banco:</span> <span className="font-bold text-white">{draft.datosBancarios.bancolombia}</span></p>
                              ) : null}
                              {draft.datosBancarios?.linkPagoActivo !== false ? (
                                <p className="pt-1.5">
                                  <span className="text-gray-400">Pago en línea:</span>{" "}
                                  <span className="break-all font-sans text-[#FF3F1A] underline font-bold">
                                    {enlaceDePago(draft.datosBancarios, "P-001", window.location.origin)}
                                  </span>
                                </p>
                              ) : null}
                            </div>

                            {draft.datosBancarios?.instrucciones ? (
                              <div className="border-t border-gray-800 pt-3 font-sans text-[12px] italic leading-normal text-gray-300">
                                &ldquo;{draft.datosBancarios.instrucciones}&rdquo;
                              </div>
                            ) : null}

                            {!draft.datosBancarios?.titular &&
                              !draft.datosBancarios?.nequi &&
                              !draft.datosBancarios?.daviplata &&
                              !draft.datosBancarios?.bancolombia &&
                              !draft.datosBancarios?.instrucciones && (
                                <p className="text-[12px] italic text-gray-500">
                                  Completa los datos de cobro arriba para previsualizar el mensaje.
                                </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN: TIEMPOS Y HORARIOS
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "tiempos" && (() => {
              const etapasActivas = estadosActivosDe(draft).filter((e) => e !== "entregado");
              const tiemposEtapas = etapasActivas.map((id) => {
                const val = draft.tiemposObjetivo[id as EstadoConfigurable] ?? 0;
                const tiempoEfectivo = val > 0 ? val : (draft.umbralUrgencia || 15);
                return { id, val, tiempoEfectivo, label: pedidosStore.estadoLabel(id) };
              });
              const totalCicloMinutos = tiemposEtapas.reduce((acc, t) => acc + t.tiempoEfectivo, 0);
              const totalParaDistribucion = totalCicloMinutos > 0 ? totalCicloMinutos : 1;
              const distribucionFlujo = tiemposEtapas.map((t) => {
                const meta = ESTILOS_ETAPA_SLA[t.id] || ESTILO_DEFAULT_SLA;
                const porcentaje = Math.max(5, Math.round((t.tiempoEfectivo / totalParaDistribucion) * 100));
                return {
                  id: t.id,
                  label: t.label,
                  minutos: t.tiempoEfectivo,
                  porcentaje,
                  barColor: meta.barColor,
                };
              });

              return (
                <div className="space-y-6">
                  {/* ── CARD 1: ¿Cuándo atiendes? ─────────────────────────── */}
                  <section
                    className="bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 rounded-3xl shadow-theme-xs p-6 sm:p-7 space-y-6"
                    data-purpose="operating-hours-section"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 flex items-center justify-center shrink-0 text-[#190088] dark:text-[#97D6DF]">
                          <TimeIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-[20px] sm:text-[24px] font-bold text-[#190088] dark:text-white leading-tight">¿Cuándo atiendes?</h3>
                          <p className="text-[14px] font-normal text-[#212121] dark:text-gray-400 mt-1 max-w-2xl">
                            La ventana en la que el negocio recibe y despacha pedidos. Con el horario comercial apagado, la operación se considera continua (24 horas) y ningún pedido cae fuera de hora.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Toggle Container */}
                    <div className="pt-4 border-t border-[#ECECEC] dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-2xl border border-[#ECECEC] dark:border-gray-700/80">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-[#212121] dark:text-white">Aplicar horario comercial</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[12px] font-bold bg-[#ECECEC] dark:bg-gray-700 text-[#212121] dark:text-gray-300">
                            Opcional
                          </span>
                        </div>
                        <p className="text-[12px] font-normal text-gray-500 dark:text-gray-400 max-w-xl">
                          Si lo apagas, se atiende siempre. El aviso de «negocio cerrado» del canal de conversaciones y el congelamiento de SLA nocturno dependen de este interruptor.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={cn(
                          "text-[12px] font-bold",
                          draft.horario.activo ? "text-[#FF3F1A]" : "text-gray-400 dark:text-gray-500"
                        )}>
                          {draft.horario.activo ? "Horario configurado" : "Operación 24/7 continua"}
                        </span>
                        <Switch
                          checked={draft.horario.activo}
                          color="orange"
                          onChange={(v) => setHorario("activo", v)}
                          aria-label="Aplicar horario comercial"
                        />
                      </div>
                    </div>

                    {/* Weekly Schedule Configuration Panel */}
                    {draft.horario.activo ? (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[12px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Franjas de atención semanal
                            </h4>
                            <span className="text-[12px] bg-[#97D6DF]/30 text-[#190088] font-bold px-2.5 py-0.5 rounded-full border border-[#97D6DF]/50 dark:bg-[#97D6DF]/20 dark:text-[#97D6DF]">
                              Zona Horaria: America/Bogota (GMT-5)
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={copiarLunesATodos}
                              className="text-[12px] font-bold text-[#FF3F1A] hover:underline cursor-pointer"
                            >
                              Copiar lunes a todos los días
                            </button>
                            <span className="text-gray-300 dark:text-gray-700">·</span>
                            <button
                              type="button"
                              onClick={restablecerHorarioEstandar}
                              className="text-[12px] font-bold text-[#212121] hover:text-[#FF3F1A] dark:text-gray-300 cursor-pointer"
                            >
                              Restablecer plantilla estándar
                            </button>
                          </div>
                        </div>

                        {/* Schedule Grid Table */}
                        <div className="border border-[#ECECEC] dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-[#ECECEC] dark:divide-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs">
                          {DIAS_HORARIO.map(({ d, label }) => {
                            const activo = draft.horario.dias.includes(d);
                            const h = horariosPorDia[d] || { apertura: draft.horario.apertura, cierre: draft.horario.cierre };
                            const horasTexto = calcularHorasOperativas(h.apertura, h.cierre);

                            return (
                              <div
                                key={d}
                                className={cn(
                                  "flex flex-col sm:flex-row sm:items-center justify-between p-3.5 transition gap-3",
                                  activo ? "hover:bg-gray-50/70 dark:hover:bg-gray-800/50" : "bg-gray-50/40 dark:bg-gray-800/20"
                                )}
                              >
                                <div className="w-32 flex items-center gap-2.5">
                                  <input
                                    id={`day-${d}`}
                                    type="checkbox"
                                    checked={activo}
                                    onChange={() => toggleDia(d)}
                                    className="rounded border-[#ECECEC] dark:border-gray-600 text-[#FF3F1A] focus:ring-[#FF3F1A] cursor-pointer"
                                  />
                                  <label
                                    htmlFor={`day-${d}`}
                                    className={cn(
                                      "text-[14px] cursor-pointer",
                                      activo ? "font-bold text-[#212121] dark:text-white" : "font-normal text-gray-500 dark:text-gray-400"
                                    )}
                                  >
                                    {label}
                                  </label>
                                </div>

                                <div className="flex items-center gap-2 flex-1">
                                  {activo ? (
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 rounded-xl border border-[#ECECEC] dark:border-gray-700 text-[12px]">
                                      <input
                                        type="time"
                                        value={h.apertura}
                                        onChange={(e) => handleCambioHorarioDia(d, "apertura", e.target.value)}
                                        className="bg-transparent border-0 p-0 text-[12px] font-bold focus:ring-0 text-[#212121] dark:text-gray-200"
                                        aria-label={`Hora apertura ${label}`}
                                      />
                                      <span className="text-gray-400">a</span>
                                      <input
                                        type="time"
                                        value={h.cierre}
                                        onChange={(e) => handleCambioHorarioDia(d, "cierre", e.target.value)}
                                        className="bg-transparent border-0 p-0 text-[12px] font-bold focus:ring-0 text-[#212121] dark:text-gray-200"
                                        aria-label={`Hora cierre ${label}`}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-[12px] text-gray-400 dark:text-gray-500 italic font-medium px-2 py-1 rounded bg-[#ECECEC] dark:bg-gray-800">
                                      No se atienden pedidos (Cerrado)
                                    </span>
                                  )}
                                </div>

                                <div className="text-[12px] font-bold shrink-0">
                                  {activo ? (
                                    <span className="text-gray-400 dark:text-gray-500">{horasTexto}</span>
                                  ) : (
                                    <span className="text-[#FF3F1A] dark:text-[#FF3F1A]">Cerrado</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Bot auto-responder notification badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] text-[#212121] dark:text-gray-300 bg-[#EFE6D3] p-3.5 rounded-2xl border border-[#ECECEC] dark:border-gray-800">
                          <div className="flex items-start gap-2.5">
                            <Sparkles className="w-4 h-4 text-[#190088] dark:text-[#97D6DF] shrink-0 mt-0.5" />
                            <div>
                              <span>Al cerrar la jornada, el chat responderá automáticamente: </span>
                              <strong className="text-[#190088] dark:text-white font-bold">
                                «{draft.avisoFueraHorario?.mensaje || "Estamos fuera de horario comercial. Tomamos tu orden para procesarla a primera hora."}»
                              </strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditandoAviso(!editandoAviso)}
                            className="text-[#FF3F1A] font-bold hover:underline shrink-0 sm:ml-2 text-left cursor-pointer"
                          >
                            {editandoAviso ? "Cerrar edición" : "Personalizar mensaje"}
                          </button>
                        </div>
                        {editandoAviso && (
                          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-[#ECECEC] dark:border-gray-700 space-y-2">
                            <Label className="text-[12px] font-bold text-[#212121]">Mensaje de respuesta automática fuera de horario</Label>
                            <Input
                              value={draft.avisoFueraHorario?.mensaje || ""}
                              onChange={(e) => {
                                setDraft((prev) => ({
                                  ...prev,
                                  avisoFueraHorario: {
                                    ...prev.avisoFueraHorario,
                                    activo: true,
                                    mensaje: e.target.value,
                                  },
                                }));
                                setGuardado(false);
                              }}
                              placeholder="Estamos fuera de horario comercial. Tomamos tu orden para procesarla a primera hora."
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-[#ECECEC] dark:border-gray-700/80 text-[12px] text-gray-500 dark:text-gray-400">
                        Operación continua 24 horas sin restricción de horario. Ningún pedido cae fuera de hora.
                      </div>
                    )}
                  </section>

                  {/* ── CARD 2: ¿Cuándo una orden está demorada? ─────────────── */}
                  <section
                    className="bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 rounded-3xl shadow-theme-xs p-6 sm:p-7 space-y-6"
                    data-purpose="sla-delay-threshold"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 flex items-center justify-center shrink-0 text-[#190088]">
                          <AlertHexaIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-[20px] sm:text-[24px] font-bold text-[#190088] dark:text-white leading-tight">¿Cuándo una orden está demorada?</h3>
                          <p className="text-[14px] font-normal text-[#212121] dark:text-gray-400 mt-1 max-w-2xl">
                            A partir de estos minutos de inactividad, la tarjeta del pedido se resalta automáticamente en color de advertencia en el tablero para que el equipo tome acción.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* General Urgency Threshold Box */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-[#ECECEC] dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-[#212121] dark:text-white">Umbral de urgencia general</span>
                          <span className="px-2.5 py-0.5 text-[12px] font-bold bg-[#97D6DF]/30 text-[#190088] rounded-full border border-[#97D6DF]/50">
                            Regla por defecto
                          </span>
                        </div>
                        <p className="text-[12px] font-normal text-gray-500 dark:text-gray-400 max-w-xl">
                          Minutos sin cambio de estado antes de marcar la orden como urgente. Se aplica de forma global a cualquier etapa que no cuente con un tiempo objetivo individual definido.
                        </p>
                      </div>

                      {/* Custom Counter Input */}
                      <div className="flex items-center gap-3 self-start md:self-center">
                        <div className="flex items-center border border-[#ECECEC] dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 shadow-theme-xs overflow-hidden focus-within:border-[#FF3F1A] focus-within:ring-2 focus-within:ring-[#FF3F1A]/20 transition">
                          <button
                            type="button"
                            onClick={() => set("umbralUrgencia", Math.max(1, (draft.umbralUrgencia || 15) - 5))}
                            className="px-3 py-2 text-gray-500 hover:text-[#FF3F1A] hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition cursor-pointer"
                            aria-label="Restar 5 minutos"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                            </svg>
                          </button>
                          <input
                            id="global-threshold-input"
                            type="number"
                            min="1"
                            max="180"
                            value={draft.umbralUrgencia}
                            onChange={(e) => set("umbralUrgencia", Math.max(1, Number(e.target.value) || 1))}
                            className="w-14 text-center font-bold text-[#212121] dark:text-white border-0 py-2 px-1 focus:ring-0 text-[16px] bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => set("umbralUrgencia", (draft.umbralUrgencia || 15) + 5)}
                            className="px-3 py-2 text-gray-500 hover:text-[#FF3F1A] hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition cursor-pointer"
                            aria-label="Sumar 5 minutos"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                            </svg>
                          </button>
                        </div>
                        <span className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">minutos</span>
                      </div>
                    </div>

                    {/* Info Notification Callout */}
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#EFE6D3] text-[#212121] text-[12px] border border-[#ECECEC] dark:border-gray-700">
                      <Info className="w-4 h-4 text-[#190088] dark:text-[#97D6DF] mt-0.5 shrink-0" />
                      <p>
                        La campana sonora se configura en{" "}
                        <a
                          href="/conversaciones/config?seccion=alertas"
                          className="font-bold text-[#FF3F1A] hover:underline"
                        >
                          Configuración del canal → Alertas
                        </a>
                        : avisa mientras haya clientes esperando en la bandeja, no solo por pedidos demorados.
                      </p>
                    </div>
                  </section>

                  {/* ── CARD 3: Tiempo objetivo por etapa (SLA Individual) ─────── */}
                  <section
                    className="bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 rounded-3xl shadow-theme-xs p-6 sm:p-7 space-y-6"
                    data-purpose="stage-specific-sla"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECECEC] dark:border-gray-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
                            Tiempo objetivo por etapa (SLA Individual)
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#97D6DF]/30 text-[#190088] border border-[#97D6DF]/50">
                            {etapasActivas.length} Etapas Activas
                          </span>
                        </div>
                        <p className="text-[16px] font-bold text-[#190088] dark:text-white mt-1">
                          Personaliza el límite máximo de espera para cada fase operativa
                        </p>
                      </div>

                      {/* Live Cycle Time Summary Widget */}
                      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#97D6DF]/20 border border-[#97D6DF]/30">
                        <div className="w-2 h-2 rounded-full bg-[#190088] animate-pulse" />
                        <span className="text-[12px] text-[#212121] dark:text-gray-300 font-normal">Tiempo total de ciclo objetivo:</span>
                        <span className="text-[12px] font-bold text-[#190088] dark:text-[#97D6DF]">
                          {totalCicloMinutos} min
                        </span>
                      </div>
                    </div>

                    {/* Stage Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" data-purpose="stage-cards-grid">
                      {etapasActivas.map((id, index) => {
                        const label = pedidosStore.estadoLabel(id);
                        const val = draft.tiemposObjetivo[id as EstadoConfigurable] ?? 0;
                        const meta = ESTILOS_ETAPA_SLA[id] || ESTILO_DEFAULT_SLA;
                        const faseNum = index + 1;

                        return (
                          <div
                            key={id}
                            className={cn(
                              "bg-white dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl p-4 border border-[#ECECEC] dark:border-gray-700 transition-all flex flex-col justify-between space-y-3 hover:border-[#FF3F1A]"
                            )}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className={cn("w-2 h-2 rounded-full", meta.dotColor)} />
                                <span className="text-[12px] font-bold px-2 py-0.5 rounded-lg bg-[#97D6DF]/30 text-[#190088] border border-[#97D6DF]/50">
                                  Fase {faseNum}
                                </span>
                              </div>
                              <h4 className="text-[14px] font-bold text-[#190088] dark:text-white leading-tight">
                                {label}
                              </h4>
                              <p className="text-[12px] text-[#212121] dark:text-gray-400 font-normal">
                                {meta.subtitulo}
                              </p>
                            </div>

                            <div className="pt-2">
                              <div
                                className={cn(
                                  "flex items-center justify-between border border-[#ECECEC] dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 overflow-hidden shadow-theme-xs transition-colors focus-within:border-[#FF3F1A] focus-within:ring-2 focus-within:ring-[#FF3F1A]/20"
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTiempoObjetivo(
                                      id as EstadoConfigurable,
                                      Math.max(0, val - 5)
                                    )
                                  }
                                  className="px-2.5 py-1.5 text-gray-500 hover:text-[#FF3F1A] hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition cursor-pointer select-none"
                                  title="Restar 5 minutos"
                                  aria-label={`Restar 5 minutos a ${label}`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                                  </svg>
                                </button>
                                <div className="flex items-center justify-center flex-1 min-w-0">
                                  <input
                                    id={`sla-${id}`}
                                    type="number"
                                    min="0"
                                    max="300"
                                    value={val}
                                    onChange={(e) =>
                                      setTiempoObjetivo(
                                        id as EstadoConfigurable,
                                        Math.max(0, Number(e.target.value) || 0)
                                      )
                                    }
                                    className="w-10 text-center font-bold text-[14px] text-[#212121] dark:text-white border-0 py-1.5 px-0 focus:ring-0 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    aria-label={`Minutos objetivo ${label}`}
                                  />
                                  <span className="text-[12px] text-gray-400 font-normal select-none mr-1">m</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTiempoObjetivo(
                                      id as EstadoConfigurable,
                                      Math.min(300, val + 5)
                                    )
                                  }
                                  className="px-2.5 py-1.5 text-gray-500 hover:text-[#FF3F1A] hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition cursor-pointer select-none"
                                  title="Sumar 5 minutos"
                                  aria-label={`Sumar 5 minutos a ${label}`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                                  </svg>
                                </button>
                              </div>
                              <span className="block mt-1.5 text-[12px] text-gray-400 dark:text-gray-500 text-center font-normal">
                                {val === 0 ? `0 = usa umbral (${draft.umbralUrgencia}m)` : `${val} min objetivo`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* SLA Progression Flow Visualizer */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[12px] text-gray-400 dark:text-gray-500 mb-1.5">
                        <span>Distribución estimada del flujo</span>
                        <span>100% del ciclo operativo estimado</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 flex overflow-hidden">
                        {distribucionFlujo.map((item) => (
                          <div
                            key={item.id}
                            className={cn("h-full transition-all duration-300", item.barColor)}
                            style={{ width: `${item.porcentaje}%` }}
                            title={`${item.label}: ${item.minutos}m (${item.porcentaje}%)`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Footer Note inside Card */}
                    <p className="text-[12px] text-gray-400 dark:text-gray-500 font-normal">
                      * Deja una etapa en <strong className="text-[#212121] dark:text-gray-300 font-bold">0</strong> para que herede automáticamente el umbral general predeterminado ({draft.umbralUrgencia} min).
                    </p>
                  </section>
                </div>
              );
            })()}



            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN: ALERTAS Y SONIDOS
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "sonidos" && (
              <div className="space-y-8 animate-aparecer">
                {/* ── CARD 1: SISTEMA PRINCIPAL DE CAMPANA Y AVISOS ─────── */}
                <section
                  className="bg-white rounded-3xl border border-[#ECECEC] shadow-sm overflow-hidden dark:bg-gray-900 dark:border-gray-800"
                  data-purpose="sound-settings-card"
                >
                  {/* Section Header */}
                  <div className="p-6 border-b border-[#ECECEC] dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 flex items-center justify-center text-[#190088] shrink-0 mt-0.5">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-[20px] sm:text-[24px] font-bold text-[#190088] leading-tight">
                          Campana y timbres operativos
                        </h2>
                        <p className="text-[14px] text-[#212121] mt-1 dark:text-gray-400">
                          Avisos sonoros en vivo para que el equipo no pierda comandas ni demore órdenes de clientes.
                        </p>
                      </div>
                    </div>

                    {/* Section Global Actions */}
                    <div className="flex items-center space-x-3 self-end sm:self-center pl-13 sm:pl-0">
                      <button
                        type="button"
                        onClick={() => probarSonido(draft.alertaAtencion?.tonoTimbre || "ding_moderno")}
                        className={cn(
                          "inline-flex items-center space-x-2 text-[12px] font-bold px-3 py-2 rounded-xl transition-all border cursor-pointer",
                          probandoAudio
                            ? "bg-[#FF3F1A]/10 border-[#FF3F1A] text-[#FF3F1A] ring-2 ring-[#FF3F1A]/20"
                            : "bg-[#ECECEC]/50 hover:bg-[#ECECEC] text-[#212121] border-[#ECECEC]"
                        )}
                        title="Emitir un sonido de prueba en tus altavoces"
                      >
                        <svg className="w-4 h-4 text-[#212121]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.08-1.64.222-2.426.234-.847 1.058-1.354 1.938-1.354h2.24z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{probandoAudio ? "Sonando..." : "Probar sonido"}</span>
                      </button>

                      <div className="h-6 w-px bg-[#ECECEC] dark:bg-gray-800" />

                      {/* Master Mute Toggle Indicator */}
                      <div className="flex items-center space-x-2 text-[12px]">
                        <span className={cn(
                          "font-bold",
                          draft.alertaAtencion?.activo ? "text-[#FF3F1A]" : "text-gray-400"
                        )}>
                          {draft.alertaAtencion?.activo ? "Sonido Activo" : "Silenciado general"}
                        </span>
                        <Switch
                          checked={draft.alertaAtencion?.activo}
                          color="orange"
                          onChange={(v) => setAlertaAtencion("activo", v)}
                          aria-label="Activar o silenciar sonidos generales"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Settings List */}
                  <div className="divide-y divide-[#ECECEC] dark:divide-gray-800">
                    {/* Setting 1: Timbre de nuevo pedido entrante */}
                    <article className="p-6 transition hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 md:max-w-xl">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-[16px] font-bold text-[#190088]">
                              Timbre de nuevo pedido entrante
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[12px] font-bold bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/30">
                              Crítico
                            </span>
                          </div>
                          <p className="text-[14px] text-[#212121] dark:text-gray-400">
                            Emite una campana inmediata cada vez que una orden entra al tablero desde WhatsApp, tienda virtual o mostrador.
                          </p>
                        </div>

                        {/* Controls: Tone selector + Play + Main Switch */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                          {/* Tone Selector Dropdown */}
                          <div className="relative">
                            <select
                              value={draft.alertaAtencion?.tonoTimbre || "ding_moderno"}
                              disabled={!draft.alertaAtencion?.activo}
                              onChange={(e) => {
                                setAlertaAtencion("tonoTimbre", e.target.value);
                                probarSonido(e.target.value);
                              }}
                              className="text-[12px] font-bold bg-[#ECECEC]/30 border border-[#ECECEC] rounded-xl pl-3 pr-8 py-2 text-[#212121] focus:ring-2 focus:ring-[#FF3F1A]/20 focus:border-[#FF3F1A] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 disabled:opacity-50"
                            >
                              <option value="ding_moderno">Ding moderno (Predeterminado)</option>
                              <option value="campana_clasica">Campana de mostrador clásica</option>
                              <option value="tono_digital">Tono suave digital</option>
                              <option value="chime_doble">Chime doble armónico</option>
                            </select>
                          </div>

                          {/* Mini Play Preview Button */}
                          <button
                            type="button"
                            aria-label="Escuchar vista previa"
                            disabled={!draft.alertaAtencion?.activo}
                            onClick={() => probarSonido(draft.alertaAtencion?.tonoTimbre || "ding_moderno")}
                            className="p-2 text-[#212121] hover:text-[#FF3F1A] hover:bg-[#FF3F1A]/10 border border-[#ECECEC] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>

                          {/* State Toggle */}
                          <div className="flex items-center space-x-2 pl-2 border-l border-[#ECECEC] dark:border-gray-700">
                            <span className={cn(
                              "text-[12px] font-bold",
                              draft.alertaAtencion?.nuevoPedidoSonido !== false && draft.alertaAtencion?.activo
                                ? "text-[#FF3F1A]"
                                : "text-gray-400"
                            )}>
                              {draft.alertaAtencion?.nuevoPedidoSonido !== false && draft.alertaAtencion?.activo ? "Activo" : "Inactivo"}
                            </span>
                            <Switch
                              checked={draft.alertaAtencion?.nuevoPedidoSonido !== false}
                              disabled={!draft.alertaAtencion?.activo}
                              color="orange"
                              onChange={(v) => setAlertaAtencion("nuevoPedidoSonido", v)}
                              aria-label="Timbre de nuevo pedido entrante"
                            />
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* Setting 2: Alerta acústica de órdenes demoradas (SLA) */}
                    <article className="p-6 transition hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 md:max-w-xl">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-[16px] font-bold text-[#190088]">
                              Alerta acústica de órdenes demoradas (SLA)
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[12px] font-bold bg-[#97D6DF]/30 text-[#190088] border border-[#97D6DF]/50">
                              Urgencia
                            </span>
                          </div>
                          <p className="text-[14px] text-[#212121] dark:text-gray-400">
                            Avisa al personal cuando una orden sobrepasa el tiempo límite estimado para su etapa de preparación o despacho.
                          </p>
                        </div>

                        {/* Controls: Volume slider + Toggle */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4">
                          {/* Intensity / Volume Mini Slider */}
                          <div className="flex items-center space-x-2 bg-[#ECECEC]/30 border border-[#ECECEC] px-3 py-1.5 rounded-xl">
                            <svg className="w-3.5 h-3.5 text-[#212121]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.08-1.64.222-2.426.234-.847 1.058-1.354 1.938-1.354h2.24z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={draft.alertaAtencion?.volumenSla ?? 75}
                              disabled={!draft.alertaAtencion?.activo}
                              onChange={(e) => setAlertaAtencion("volumenSla", Number(e.target.value))}
                              className="w-20 h-1.5 bg-[#ECECEC] rounded-lg appearance-none cursor-pointer accent-[#FF3F1A] disabled:opacity-50"
                            />
                            <span className="text-[12px] font-bold text-[#212121] min-w-[28px] text-right">
                              {draft.alertaAtencion?.volumenSla ?? 75}%
                            </span>
                          </div>

                          {/* State Toggle */}
                          <div className="flex items-center space-x-2 pl-2 border-l border-[#ECECEC] dark:border-gray-700">
                            <span className={cn(
                              "text-[12px] font-bold",
                              draft.alertaAtencion?.demorasSonido !== false && draft.alertaAtencion?.activo
                                ? "text-[#FF3F1A]"
                                : "text-gray-400"
                            )}>
                              {draft.alertaAtencion?.demorasSonido !== false && draft.alertaAtencion?.activo ? "Activo" : "Inactivo"}
                            </span>
                            <Switch
                              checked={draft.alertaAtencion?.demorasSonido !== false}
                              disabled={!draft.alertaAtencion?.activo}
                              color="orange"
                              onChange={(v) => setAlertaAtencion("demorasSonido", v)}
                              aria-label="Alerta acústica de órdenes demoradas"
                            />
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* Setting 3: Chime en Pantalla de Turnos y Sala (TV) */}
                    <article className="p-6 transition hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 md:max-w-xl">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-[16px] font-bold text-[#190088]">
                              Chime en Pantalla de Turnos y Sala (TV)
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[12px] font-bold bg-[#ECECEC] text-[#212121] border border-[#ECECEC]">
                              Clientes
                            </span>
                          </div>
                          <p className="text-[14px] text-[#212121] dark:text-gray-400">
                            Reproduce un tono sintetizado en el monitor de clientes y sala cada vez que un pedido pasa a «Listo para entrega».
                          </p>
                        </div>

                        {/* Controls: State Toggle */}
                        <div className="flex items-center space-x-2 self-start md:self-center">
                          <span className={cn(
                            "text-[12px] font-bold",
                            draft.alertaAtencion?.pantallaTurnosSonido !== false && draft.alertaAtencion?.activo
                              ? "text-[#FF3F1A]"
                              : "text-gray-400"
                          )}>
                            {draft.alertaAtencion?.pantallaTurnosSonido !== false && draft.alertaAtencion?.activo ? "Activo" : "Inactivo"}
                          </span>
                          <Switch
                            checked={draft.alertaAtencion?.pantallaTurnosSonido !== false}
                            disabled={!draft.alertaAtencion?.activo}
                            color="orange"
                            onChange={(v) => setAlertaAtencion("pantallaTurnosSonido", v)}
                            aria-label="Chime en Pantalla de Turnos y Sala"
                          />
                        </div>
                      </div>
                    </article>
                  </div>
                </section>

                {/* ── CARD 2: INTERVALO Y REPETICIÓN DE ATENCIÓN ─────────── */}
                <section
                  className="bg-white rounded-3xl border border-[#ECECEC] shadow-sm p-6 space-y-6 dark:bg-gray-900 dark:border-gray-800"
                  data-purpose="interval-reminder-card"
                >
                  {/* Section Header */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 flex items-center justify-center text-[#190088] shrink-0 mt-0.5">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-[20px] sm:text-[24px] font-bold text-[#190088] leading-tight">
                        Recordatorio e intervalo de repetición
                      </h2>
                      <p className="text-[14px] text-[#212121] mt-1 dark:text-gray-400">
                        Si hay pedidos en espera de confirmación o clientes pendientes, la campana volverá a sonar periódicamente.
                      </p>
                    </div>
                  </div>

                  {/* Frequency Selector: Segmented Radio Cards */}
                  <div className="space-y-3">
                    <label className="block text-[12px] font-bold uppercase tracking-wider text-[#190088]">
                      Frecuencia de reincidencia
                    </label>
                    <div aria-label="Frecuencia de reincidencia" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" role="radiogroup">
                      {/* Option 1: 15s */}
                      <button
                        type="button"
                        onClick={() => setAlertaAtencion("cadaSegundos", 15)}
                        disabled={!draft.alertaAtencion?.activo}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-3 text-center rounded-2xl cursor-pointer transition-all",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 15
                            ? "bg-[#FF3F1A]/[0.04] border-2 border-[#FF3F1A] shadow-sm"
                            : "bg-white border border-[#ECECEC] hover:border-gray-300 hover:bg-gray-50/70",
                          !draft.alertaAtencion?.activo && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {(draft.alertaAtencion?.cadaSegundos || 30) === 15 && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF3F1A]" />
                        )}
                        <span className={cn(
                          "text-[14px]",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 15 ? "text-[#190088] font-bold" : "text-[#212121] font-normal"
                        )}>
                          Cada 15 segundos
                        </span>
                        <span className={cn(
                          "text-[12px] mt-0.5",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 15 ? "text-[#FF3F1A] font-bold" : "text-gray-500 font-normal"
                        )}>
                          Alta frecuencia
                        </span>
                      </button>

                      {/* Option 2: 30s (Recomendado) */}
                      <button
                        type="button"
                        onClick={() => setAlertaAtencion("cadaSegundos", 30)}
                        disabled={!draft.alertaAtencion?.activo}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-3 text-center rounded-2xl cursor-pointer transition-all",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 30
                            ? "bg-[#FF3F1A]/[0.04] border-2 border-[#FF3F1A] shadow-sm"
                            : "bg-white border border-[#ECECEC] hover:border-gray-300 hover:bg-gray-50/70",
                          !draft.alertaAtencion?.activo && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {(draft.alertaAtencion?.cadaSegundos || 30) === 30 && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF3F1A]" />
                        )}
                        <span className={cn(
                          "text-[14px]",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 30 ? "text-[#190088] font-bold" : "text-[#212121] font-normal"
                        )}>
                          Cada 30 segundos
                        </span>
                        <span className={cn(
                          "text-[12px] mt-0.5",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 30 ? "text-[#FF3F1A] font-bold" : "text-gray-500 font-normal"
                        )}>
                          Recomendado
                        </span>
                      </button>

                      {/* Option 3: 45s */}
                      <button
                        type="button"
                        onClick={() => setAlertaAtencion("cadaSegundos", 45)}
                        disabled={!draft.alertaAtencion?.activo}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-3 text-center rounded-2xl cursor-pointer transition-all",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 45
                            ? "bg-[#FF3F1A]/[0.04] border-2 border-[#FF3F1A] shadow-sm"
                            : "bg-white border border-[#ECECEC] hover:border-gray-300 hover:bg-gray-50/70",
                          !draft.alertaAtencion?.activo && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {(draft.alertaAtencion?.cadaSegundos || 30) === 45 && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF3F1A]" />
                        )}
                        <span className={cn(
                          "text-[14px]",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 45 ? "text-[#190088] font-bold" : "text-[#212121] font-normal"
                        )}>
                          Cada 45 segundos
                        </span>
                        <span className={cn(
                          "text-[12px] mt-0.5",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 45 ? "text-[#FF3F1A] font-bold" : "text-gray-500 font-normal"
                        )}>
                          Estándar
                        </span>
                      </button>

                      {/* Option 4: 60s */}
                      <button
                        type="button"
                        onClick={() => setAlertaAtencion("cadaSegundos", 60)}
                        disabled={!draft.alertaAtencion?.activo}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-3 text-center rounded-2xl cursor-pointer transition-all",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 60
                            ? "bg-[#FF3F1A]/[0.04] border-2 border-[#FF3F1A] shadow-sm"
                            : "bg-white border border-[#ECECEC] hover:border-gray-300 hover:bg-gray-50/70",
                          !draft.alertaAtencion?.activo && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {(draft.alertaAtencion?.cadaSegundos || 30) === 60 && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF3F1A]" />
                        )}
                        <span className={cn(
                          "text-[14px]",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 60 ? "text-[#190088] font-bold" : "text-[#212121] font-normal"
                        )}>
                          Cada 60 segundos
                        </span>
                        <span className={cn(
                          "text-[12px] mt-0.5",
                          (draft.alertaAtencion?.cadaSegundos || 30) === 60 ? "text-[#FF3F1A] font-bold" : "text-gray-500 font-normal"
                        )}>
                          Baja urgencia
                        </span>
                      </button>

                      {/* Option 5: Custom */}
                      <div
                        className={cn(
                          "relative flex flex-col items-center justify-center p-3 text-center rounded-2xl transition-all col-span-2 sm:col-span-1",
                          ![15, 30, 45, 60].includes(draft.alertaAtencion?.cadaSegundos || 30)
                            ? "bg-[#FF3F1A]/[0.04] border-2 border-[#FF3F1A] shadow-sm"
                            : "bg-white border border-dashed border-[#ECECEC] hover:border-[#FF3F1A] hover:bg-gray-50/70",
                          !draft.alertaAtencion?.activo && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {![15, 30, 45, 60].includes(draft.alertaAtencion?.cadaSegundos || 30) ? (
                          <div className="flex flex-col items-center space-y-1">
                            <span className="text-[12px] font-bold text-[#190088]">Personalizado</span>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min={5}
                                max={300}
                                value={draft.alertaAtencion?.cadaSegundos || 30}
                                disabled={!draft.alertaAtencion?.activo}
                                onChange={(e) => {
                                  const val = Math.max(5, Math.min(600, Number(e.target.value) || 30));
                                  setAlertaAtencion("cadaSegundos", val);
                                }}
                                className="w-14 text-center text-[12px] py-0.5 px-1 bg-white border border-[#ECECEC] rounded-lg font-bold text-[#190088] focus:border-[#FF3F1A]"
                              />
                              <span className="text-[12px] text-[#212121] font-bold">seg</span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!draft.alertaAtencion?.activo}
                            onClick={() => setAlertaAtencion("cadaSegundos", 20)}
                            className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                          >
                            <span className="text-[12px] font-bold text-[#212121]">Personalizado</span>
                            <span className="text-[12px] text-gray-500 mt-0.5 font-normal">Definir valor</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Info / Pro-tip Callout */}
                  <aside className="rounded-2xl bg-[#EFE6D3] border border-[#ECECEC] p-4" data-purpose="quick-mute-callout">
                    <div className="flex items-start space-x-3">
                      <div className="p-1.5 rounded-lg bg-[#190088] text-white shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M12 18v-5.25m0 0a6.002 6.002 0 00-4-5.659V7a4 4 0 118 0v.091a6.002 6.002 0 00-4 5.659zM12 18h.01M9 21h6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="text-[12px] sm:text-[14px] text-[#212121] leading-relaxed">
                        <strong className="font-bold text-[#190088]">Control rápido de silencio: </strong>
                        El operador puede silenciar o reactivar el sonido en cualquier instante con un solo clic en la campanita de la barra superior en Inicio, sin tener que entrar a esta configuración.
                      </div>
                    </div>
                  </aside>
                </section>

                {/* ── CARD 3: NOTIFICACIONES VISUALES DE ESCRITORIO ──────── */}
                <section
                  className="bg-white rounded-3xl border border-[#ECECEC] shadow-sm overflow-hidden dark:bg-gray-900 dark:border-gray-800"
                  data-purpose="desktop-push-card"
                >
                  {/* Section Header */}
                  <div className="p-6 border-b border-[#ECECEC] dark:border-gray-800">
                    <div className="flex items-start space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 flex items-center justify-center text-[#190088] shrink-0 mt-0.5">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-[20px] sm:text-[24px] font-bold text-[#190088] leading-tight">
                          Notificaciones visuales de escritorio
                        </h2>
                        <p className="text-[14px] text-[#212121] mt-1 dark:text-gray-400">
                          Avisos emergentes en tu pantalla si la ventana de StockFlow está minimizada o en segundo plano.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Push Permission Items */}
                  <div className="divide-y divide-[#ECECEC] dark:divide-gray-800">
                    {/* Push Local System Notification */}
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 md:max-w-xl">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-[16px] font-bold text-[#190088]">
                            Avisos del sistema operativo (Push local)
                          </h3>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-lg text-[12px] font-bold border",
                            permisoNotificaciones === "granted"
                              ? "bg-[#97D6DF]/30 text-[#190088] border-[#97D6DF]/50"
                              : permisoNotificaciones === "denied"
                              ? "bg-[#ECECEC] text-[#212121] border-[#ECECEC]"
                              : "bg-[#EFE6D3] text-[#212121] border-[#ECECEC]"
                          )}>
                            {permisoNotificaciones === "granted" ? "Permiso concedido" : permisoNotificaciones === "denied" ? "Permiso bloqueado" : "Pendiente de permiso"}
                          </span>
                        </div>
                        <p className="text-[14px] text-[#212121] dark:text-gray-400">
                          Muestra un globo emergente nativo con el código del pedido y nombre del cliente al recibir nuevas órdenes.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                        {permisoNotificaciones !== "granted" ? (
                          <button
                            type="button"
                            onClick={solicitarPermisoNotificaciones}
                            className="inline-flex items-center justify-center px-4 py-2 text-[12px] font-bold text-white bg-[#FF3F1A] hover:bg-[#e5351a] rounded-xl shadow-sm transition-all whitespace-nowrap cursor-pointer"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Permitir notificaciones
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className={cn(
                              "text-[12px] font-bold",
                              draft.alertaAtencion?.notificacionesEscritorio !== false ? "text-[#FF3F1A]" : "text-gray-400"
                            )}>
                              {draft.alertaAtencion?.notificacionesEscritorio !== false ? "Activo" : "Inactivo"}
                            </span>
                            <Switch
                              checked={draft.alertaAtencion?.notificacionesEscritorio !== false}
                              color="orange"
                              onChange={(v) => setAlertaAtencion("notificacionesEscritorio", v)}
                              aria-label="Activar notificaciones de escritorio"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inactive Tab Badge Option */}
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 md:max-w-xl">
                        <h3 className="text-[16px] font-bold text-[#190088]">
                          Alerta visual en pestaña de navegador inactiva
                        </h3>
                        <p className="text-[14px] text-[#212121] dark:text-gray-400">
                          Hace parpadear el título y muestra un contador dinámico en el icono de pestaña (Favicon) cuando hay pedidos sin atender.
                        </p>
                      </div>

                      {/* State Toggle */}
                      <div className="flex items-center space-x-2 self-start md:self-center">
                        <span className={cn(
                          "text-[12px] font-bold",
                          draft.alertaAtencion?.alertaPestanaInactiva !== false ? "text-[#FF3F1A]" : "text-gray-400"
                        )}>
                          {draft.alertaAtencion?.alertaPestanaInactiva !== false ? "Activo" : "Inactivo"}
                        </span>
                        <Switch
                          checked={draft.alertaAtencion?.alertaPestanaInactiva !== false}
                          color="orange"
                          onChange={(v) => setAlertaAtencion("alertaPestanaInactiva", v)}
                          aria-label="Alerta visual en pestaña inactiva"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN: INTEGRACIONES Y CANALES DE VENTA
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "integraciones" && (
              <BloqueConfig
                icono={PlugInIcon}
                pregunta="Conecta tus canales de venta y mensajería"
                descripcion="Centraliza la recepción de pedidos, notificaciones de despacho y atención omnicanal en un solo lugar."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* WhatsApp Business */}
                  <div
                    className={cn(
                      "relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all dark:bg-gray-900/60",
                      canalesActivos.whatsapp
                        ? "border-2 border-[#ECECEC] hover:border-[#FF3F1A]"
                        : "border border-[#ECECEC] opacity-75 dark:border-gray-800/60",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-2xl",
                              canalesActivos.whatsapp
                                ? "bg-[#97D6DF]/20 border border-[#97D6DF]/30 text-[#190088]"
                                : "bg-[#ECECEC] text-[#212121]",
                            )}
                          >
                            <WhatsAppIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-[16px] font-bold text-[#190088]">
                              WhatsApp Business
                            </h4>
                            <span className="text-[12px] font-normal text-[#212121]">
                              Bandeja omnicanal
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-lg text-[12px] font-bold",
                              canalesActivos.whatsapp
                                ? "bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20"
                                : "bg-[#ECECEC] text-[#212121]"
                            )}
                          >
                            {canalesActivos.whatsapp ? "Activo" : "Inactivo"}
                          </span>
                          <Switch
                            checked={canalesActivos.whatsapp}
                            color="orange"
                            onChange={(val) => toggleCanal("whatsapp", val)}
                            label=""
                          />
                        </div>
                      </div>

                      <p className="mt-3.5 text-[14px] leading-relaxed text-[#212121]">
                        Bandeja omnicanal y notificaciones automáticas de pedidos a clientes.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[#ECECEC] pt-4">
                      <span className="text-[12px] text-gray-500 font-normal">
                        {canalesActivos.whatsapp ? "Sincronización en tiempo real" : "Canal desactivado"}
                      </span>
                      <button
                        type="button"
                        disabled={!canalesActivos.whatsapp}
                        onClick={() =>
                          navigate(
                            "/conversaciones/config?canal=whatsapp&from=/pedidos/config?seccion=integraciones",
                          )
                        }
                        className="px-3.5 py-1.5 rounded-xl border border-[#ECECEC] hover:border-[#FF3F1A] text-[#212121] hover:text-[#FF3F1A] font-bold text-[12px] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Configurar bot
                      </button>
                    </div>
                  </div>

                  {/* Instagram */}
                  <div
                    className={cn(
                      "relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all dark:bg-gray-900/60",
                      canalesActivos.instagram
                        ? "border-2 border-[#ECECEC] hover:border-[#FF3F1A]"
                        : "border border-[#ECECEC] opacity-75 dark:border-gray-800/60",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-2xl",
                              canalesActivos.instagram
                                ? "bg-[#97D6DF]/20 border border-[#97D6DF]/30 text-[#190088]"
                                : "bg-[#ECECEC] text-[#212121]",
                            )}
                          >
                            <InstagramIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-[16px] font-bold text-[#190088]">
                              Instagram
                            </h4>
                            <span className="text-[12px] font-normal text-[#212121]">
                              Direct Messages
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-lg text-[12px] font-bold",
                              canalesActivos.instagram
                                ? "bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20"
                                : "bg-[#ECECEC] text-[#212121]"
                            )}
                          >
                            {canalesActivos.instagram ? "Activo" : "Inactivo"}
                          </span>
                          <Switch
                            checked={canalesActivos.instagram}
                            color="orange"
                            onChange={(val) => toggleCanal("instagram", val)}
                            label=""
                          />
                        </div>
                      </div>

                      <p className="mt-3.5 text-[14px] leading-relaxed text-[#212121]">
                        Recepción de pedidos por mensajes directos (DM) y catálogo interactivo en historias y chat.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[#ECECEC] pt-4">
                      <span className="text-[12px] text-gray-500 font-normal">
                        Meta Graph API
                      </span>
                      <button
                        type="button"
                        disabled={!canalesActivos.instagram}
                        className="px-3.5 py-1.5 rounded-xl border border-[#ECECEC] hover:border-[#FF3F1A] text-[#212121] hover:text-[#FF3F1A] font-bold text-[12px] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Conectar cuenta
                      </button>
                    </div>
                  </div>

                  {/* Facebook */}
                  <div
                    className={cn(
                      "relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all dark:bg-gray-900/60",
                      canalesActivos.facebook
                        ? "border-2 border-[#ECECEC] hover:border-[#FF3F1A]"
                        : "border border-[#ECECEC] opacity-75 dark:border-gray-800/60",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-2xl",
                              canalesActivos.facebook
                                ? "bg-[#97D6DF]/20 border border-[#97D6DF]/30 text-[#190088]"
                                : "bg-[#ECECEC] text-[#212121]",
                            )}
                          >
                            <FacebookIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-[16px] font-bold text-[#190088]">
                              Facebook
                            </h4>
                            <span className="text-[12px] font-normal text-[#212121]">
                              Messenger & Fan Page
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-lg text-[12px] font-bold",
                              canalesActivos.facebook
                                ? "bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20"
                                : "bg-[#ECECEC] text-[#212121]"
                            )}
                          >
                            {canalesActivos.facebook ? "Activo" : "Inactivo"}
                          </span>
                          <Switch
                            checked={canalesActivos.facebook}
                            color="orange"
                            onChange={(val) => toggleCanal("facebook", val)}
                            label=""
                          />
                        </div>
                      </div>

                      <p className="mt-3.5 text-[14px] leading-relaxed text-[#212121]">
                        Gestión de ventas, respuestas a comentarios de publicaciones y sincronización con Messenger.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[#ECECEC] pt-4">
                      <span className="text-[12px] text-gray-500 font-normal">
                        Facebook Business
                      </span>
                      <button
                        type="button"
                        disabled={!canalesActivos.facebook}
                        className="px-3.5 py-1.5 rounded-xl border border-[#ECECEC] hover:border-[#FF3F1A] text-[#212121] hover:text-[#FF3F1A] font-bold text-[12px] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Conectar página
                      </button>
                    </div>
                  </div>
                </div>
              </BloqueConfig>
            )}
          </ConfigShell>
        </fieldset>
    </div>
  );
});

export default ConfigPage;
