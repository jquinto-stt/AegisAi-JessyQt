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
  BoltIcon,
  BuildingOffice2Icon,
  CartIcon,
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
import { organizacionStore, pedidosStore, puedeGuardarConfig, motivoSinPermiso } from "@/stores";
import { cn } from "@/utils";
import type {
  Modalidad,
  PedidosConfig,
  CatalogoItem,
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
    label: "Retiro en local",
    desc: "El cliente retira personalmente en mostrador.",
  },
  domicilio: {
    label: "Envío a domicilio",
    desc: "Despacho con mensajero propio o externo.",
  },
  en_sitio: {
    label: "Consumo en salón",
    desc: "Servicio para mesas y consumo directo en el local.",
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



type ClaveSeccion = "flujo" | "pagos" | "perfil" | "tiempos" | "catalogo" | "integraciones";

/** Orden de la columna de secciones. `flujo` primero: es la seccion por defecto. */
const ORDEN_SECCIONES: ClaveSeccion[] = [
  "flujo",
  "pagos",
  "perfil",
  "tiempos",
  "catalogo",
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
    hint: "Estados del pipeline, modalidades de entrega y nombres de columna.",
    icono: BoltIcon,
  },
  pagos: {
    label: "Cuentas y cobros",
    hint: "Cuentas para transferencias (Nequi, Daviplata, Bancos) e instrucciones.",
    icono: DollarLineIcon,
  },
  perfil: {
    label: "Perfil de negocio",
    hint: "Qué vendes. Adapta capacidades, campos y terminología.",
    icono: GridIcon,
  },
  tiempos: {
    label: "Tiempos y horarios",
    hint: "Horario de atención, duración por etapa y avisos de demora.",
    icono: TimeIcon,
  },
  catalogo: {
    label: "Productos frecuentes",
    hint: "Ítems sugeridos con precio para cargar pedidos sin teclear.",
    icono: CartIcon,
  },
  integraciones: {
    label: "Integraciones",
    hint: "Canales de venta y mensajería (WhatsApp, Instagram y Facebook).",
    icono: PlugInIcon,
  },
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

  const addItem = () =>
    set("catalogo", [...draft.catalogo, { id: crypto.randomUUID(), nombre: "", precio: 0 }]);

  const setItem = (id: string, patch: Partial<CatalogoItem>) =>
    set("catalogo", draft.catalogo.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const removeItem = (id: string) =>
    set("catalogo", draft.catalogo.filter((c) => c.id !== id));

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

    const catalogoLimpio = draft.catalogo
      .filter((c) => c.nombre.trim() !== "")
      .map((c) => ({ ...c, nombre: c.nombre.trim(), precio: Math.max(0, Number(c.precio) || 0) }));

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
      catalogo: catalogoLimpio,
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
    return (
      <div className="pb-12">
        <PageMeta title="Configuración · Pedidos" description="Ajustes del módulo de pedidos" />

        <div className="mb-7">
          <ConfigHeader
            titulo="Configuración de Pedidos"
            descripcion="Elige qué quieres ajustar. Cada opción abre su propia pantalla."
          />
        </div>

        <ConfigHub tarjetas={tarjetasHub} onEntrar={entrarASeccion} />
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
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-[10px] tracking-wider uppercase">
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
                        className={`flex flex-col rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                          seleccionado
                            ? "border-brand-500 bg-brand-500/[0.04] dark:border-brand-500 dark:bg-brand-500/10"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                        }`}
                      >
                        <div className="flex w-full items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl" aria-hidden="true">
                              {p.icon}
                            </span>
                            <div>
                              <span className="block text-sm font-semibold text-ink-title dark:text-white">
                                {p.name}
                              </span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400">
                                {p.description}
                              </span>
                            </div>
                          </div>
                          {seleccionado && (
                            <Badge color="success" size="sm">
                              Activo
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3 flex w-full flex-wrap gap-1.5 border-t border-gray-100 pt-2 dark:border-gray-800/60">
                          {p.defaultCapabilities.map((cap) => (
                            <span
                              key={cap}
                              className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
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

                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
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
                {/* ── 1 · Los pasos del pipeline ─────────────────────────────── */}
                <BloqueConfig
                  icono={BoltIcon}
                  pregunta="¿Qué pasos tiene tu operación?"
                  descripcion="Estos dos pasos son opcionales. Apagarlos los quita del tablero y del flujo: no hace falta borrar nada."
                >
                  <ToggleRow
                    titulo="Confirmado"
                    descripcion={
                      draft.perfilComercial === "fashion"
                        ? "Paso previo de aceptación antes de empaque y rotulado."
                        : "Paso previo de aceptación antes de preparación."
                    }
                    control={
                      <div className="flex items-center gap-2.5">
                        <Badge color={draft.usarConfirmado ? "success" : "light"} size="sm">
                          {draft.usarConfirmado ? "Activo" : "Omitido"}
                        </Badge>
                        <Switch
                          checked={draft.usarConfirmado}
                          onChange={(v) => set("usarConfirmado", v)}
                          aria-label="Usar estado Confirmado"
                        />
                      </div>
                    }
                  />

                  <ToggleRow
                    titulo="En camino"
                    descripcion="Etapa de despacho y reparto a domicilio."
                    control={
                      <div className="flex items-center gap-2.5">
                        <Badge color={draft.usarEnCamino ? "success" : "light"} size="sm">
                          {draft.usarEnCamino ? "Activo" : "Omitido"}
                        </Badge>
                        <Switch
                          checked={draft.usarEnCamino}
                          onChange={(v) => set("usarEnCamino", v)}
                          aria-label="Usar estado En camino"
                        />
                      </div>
                    }
                  />
                </BloqueConfig>

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
                            <Badge color={activa ? "primary" : "light"} size="sm">
                              {activa ? "Activa" : "Inactiva"}
                            </Badge>
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

                {/* ── 3 · Los nombres ────────────────────────────────────────── */}
                <BloqueConfig
                  icono={PencilIcon}
                  pregunta="¿Cómo llamas a cada etapa?"
                  descripcion="Renombra las etapas y las modalidades. El nombre se pinta en el tablero, en el historial y en los mensajes al cliente. Deja el campo vacío para usar el de fábrica."
                >
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Etapas del pedido
                      </h3>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {ESTADOS_CONFIG.map((id) => {
                          // La etiqueta de referencia es la del store: si el
                          // negocio ya renombró una etapa, el campo muestra SU
                          // nombre como referencia y no el del sistema.
                          const label = pedidosStore.estadoLabel(id);
                          return (
                            <CampoConfig key={id} etiqueta={label} htmlFor={`alias-e-${id}`} ancho="max-w-none">
                              <Input
                                id={`alias-e-${id}`}
                                placeholder={label}
                                value={draft.aliasEstados[id] ?? ""}
                                onChange={(e) => setAliasEstado(id, e.target.value)}
                              />
                            </CampoConfig>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-5 dark:border-gray-800/80">
                      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Modalidades de entrega
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {TODAS_MODALIDADES.map((m) => {
                          const def = { retiro: "Retiro", domicilio: "Domicilio", en_sitio: "En sitio" }[m];
                          return (
                            <CampoConfig key={m} etiqueta={def} htmlFor={`alias-m-${m}`} ancho="max-w-none">
                              <Input
                                id={`alias-m-${m}`}
                                placeholder={def}
                                value={draft.aliasModalidades[m] ?? ""}
                                onChange={(e) => setAliasModalidad(m, e.target.value)}
                              />
                            </CampoConfig>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </BloqueConfig>

                {/* ── 4 · Las columnas del tablero ───────────────────────────── */}
                {/*
                  Esta tarjeta es la superficie que le faltaba a una capacidad que
                  ya existía entera en el store —crear, renombrar, reordenar,
                  eliminar— y que el tablero ya sabía pintar y aceptar por
                  arrastre. Sin ella, `columnasPersonalizadas` era una función
                  viva e inalcanzable.

                  El rótulo de una etapa del sistema NO se edita aquí: se edita
                  arriba, en «¿Cómo llamas a cada etapa?». Dos campos para el mismo
                  nombre serían dos superficies para un valor, y la de abajo
                  ganaría sin que nadie lo supiera.
                */}
                <BloqueConfig
                  icono={TableIcon}
                  pregunta="¿Qué columnas tiene tu tablero?"
                  descripcion="El orden en que ves las etapas al despachar. Sube y baja las que quieras; añade las que necesite tu operación y arrastra pedidos dentro de ellas."
                >
                  <div className="space-y-2">
                    {columnas.map((col, i) => {
                      const esPropia = esColumnaPropiaDe(col.id);
                      const nombre = col.label;
                      return (
                        <div
                          key={col.id}
                          className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[11px] font-semibold text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                            {i + 1}
                          </span>

                          {esPropia ? (
                            // Una columna propia no tiene otro sitio donde vivir:
                            // su nombre se edita AQUÍ.
                            <Input
                              value={col.label}
                              onChange={(e) => renombrarColumnaPropia(col.id, e.target.value)}
                              aria-label={`Nombre de la columna ${i + 1}`}
                              className="min-w-0 flex-1"
                            />
                          ) : (
                            <span className="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-white/90">
                              {nombre}
                            </span>
                          )}

                          {esPropia && (
                            <Badge color="light" size="xs">
                              Propia
                            </Badge>
                          )}

                          <button
                            type="button"
                            onClick={() => moverColumna(col.id, -1)}
                            disabled={i === 0}
                            aria-label={`Subir la columna ${nombre}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5 dark:hover:text-gray-200"
                          >
                            <ArrowUpIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moverColumna(col.id, 1)}
                            disabled={i === columnas.length - 1}
                            aria-label={`Bajar la columna ${nombre}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5 dark:hover:text-gray-200"
                          >
                            <ArrowDownIcon className="h-4 w-4" />
                          </button>

                          {/*
                            El botón de eliminar SOLO existe en una columna propia.
                            Una etapa del sistema no se quita desde aquí: apagarla
                            es cosa de los interruptores de «¿Qué pasos tiene tu
                            operación?». Un segundo control para el mismo hecho
                            acabaría contradiciendo al primero.
                          */}
                          {esPropia ? (
                            <button
                              type="button"
                              onClick={() => quitarColumna(col.id)}
                              disabled={columnas.length <= 1}
                              aria-label={`Eliminar la columna ${nombre}`}
                              title={
                                columnas.length <= 1
                                  ? "El tablero necesita al menos una columna"
                                  : `Eliminar «${nombre}»`
                              }
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-error-500/10"
                            >
                              <TrashBinIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="w-7 shrink-0" aria-hidden="true" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="nueva-columna"
                      placeholder="Nombre de la columna nueva"
                      value={nuevaColumna}
                      onChange={(e) => setNuevaColumna(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={agregarColumna}
                      disabled={nuevaColumna.trim() === ""}
                    >
                      <PlusIcon className="h-4 w-4" />
                      Añadir columna
                    </Button>
                  </div>

                  <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    Una columna propia no cambia el pipeline: es un cajón extra del
                    tablero. Los pedidos entran en ella arrastrándolos desde otra
                    columna. Para quitar una etapa del sistema, apaga su interruptor
                    arriba.
                  </p>
                </BloqueConfig>
              </>
            )}

            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN: CUENTAS Y COBROS (PAGOS)
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "pagos" && (
              <>
                <BloqueConfig
                  icono={BuildingOffice2Icon}
                  pregunta="¿A qué cuentas te transfieren?"
                  descripcion="Los datos que el operador le da al cliente que va a pagar por transferencia. Una cuenta en blanco no se muestra: no se inventa una línea vacía."
                >
                  <div className="space-y-5">
                    <CampoConfig
                      etiqueta="Titular de la cuenta"
                      ayuda="A nombre de quién está la cuenta. Va en el mensaje de cobro para que el cliente confirme antes de transferir."
                      htmlFor="pago-titular"
                      ancho="max-w-md"
                    >
                      <Input
                        id="pago-titular"
                        placeholder="Ej. Mi Empresa SAS o Nombre del titular"
                        value={draft.datosBancarios?.titular ?? ""}
                        onChange={(e) => setDatoBancario("titular", e.target.value)}
                      />
                    </CampoConfig>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <CampoConfig etiqueta="Número Nequi" htmlFor="pago-nequi" ancho="max-w-none">
                        <Input
                          id="pago-nequi"
                          placeholder="Ej. 300 123 4567"
                          value={draft.datosBancarios?.nequi ?? ""}
                          onChange={(e) => setDatoBancario("nequi", e.target.value)}
                        />
                      </CampoConfig>

                      <CampoConfig etiqueta="Número Daviplata" htmlFor="pago-daviplata" ancho="max-w-none">
                        <Input
                          id="pago-daviplata"
                          placeholder="Ej. 300 123 4567"
                          value={draft.datosBancarios?.daviplata ?? ""}
                          onChange={(e) => setDatoBancario("daviplata", e.target.value)}
                        />
                      </CampoConfig>

                      <CampoConfig
                        etiqueta="Cuenta Bancolombia / Otros bancos"
                        htmlFor="pago-bancolombia"
                        ancho="max-w-none"
                      >
                        <Input
                          id="pago-bancolombia"
                          placeholder="Ej. Ahorros # 123-456789-01"
                          value={draft.datosBancarios?.bancolombia ?? ""}
                          onChange={(e) => setDatoBancario("bancolombia", e.target.value)}
                        />
                      </CampoConfig>
                    </div>
                  </div>
                </BloqueConfig>

                <BloqueConfig
                  icono={DollarLineIcon}
                  pregunta="¿Cómo te pueden pagar?"
                  descripcion="Lo que se ofrece al registrar un pedido. Apagar un medio lo quita del selector del operador: no queda como opción inerte."
                >
                  <ToggleRow
                    titulo="Transferencias (Nequi / Daviplata / Bancos)"
                    descripcion="El cliente transfiere a tus cuentas y adjunta el comprobante."
                    control={
                      <div className="flex items-center gap-2.5">
                        <Badge color={draft.datosBancarios?.transferenciaActivo !== false ? "success" : "light"} size="sm">
                          {draft.datosBancarios?.transferenciaActivo !== false ? "Activo" : "Inactivo"}
                        </Badge>
                        <Switch
                          checked={draft.datosBancarios?.transferenciaActivo !== false}
                          onChange={(v) => setDatoBancario("transferenciaActivo", v)}
                          aria-label="Aceptar transferencias"
                        />
                      </div>
                    }
                  />

                  <ToggleRow
                    titulo="Pago contra entrega (Domicilio)"
                    descripcion="El cliente paga en efectivo o transferencia al recibir su pedido."
                    control={
                      <div className="flex items-center gap-2.5">
                        <Badge color={draft.datosBancarios?.contraEntregaActivo !== false ? "success" : "light"} size="sm">
                          {draft.datosBancarios?.contraEntregaActivo !== false ? "Activo" : "Inactivo"}
                        </Badge>
                        <Switch
                          checked={draft.datosBancarios?.contraEntregaActivo !== false}
                          onChange={(v) => setDatoBancario("contraEntregaActivo", v)}
                          aria-label="Aceptar contra entrega"
                        />
                      </div>
                    }
                  />

                  <ToggleRow
                    titulo="Link de pago digital (Tarjeta y PSE)"
                    descripcion="Genera un enlace de pago en línea para cobrar con tarjeta o PSE."
                    control={
                      <div className="flex items-center gap-2.5">
                        <Badge color={draft.datosBancarios?.linkPagoActivo !== false ? "success" : "light"} size="sm">
                          {draft.datosBancarios?.linkPagoActivo !== false ? "Activo" : "Inactivo"}
                        </Badge>
                        <Switch
                          checked={draft.datosBancarios?.linkPagoActivo !== false}
                          onChange={(v) => setDatoBancario("linkPagoActivo", v)}
                          aria-label="Aceptar link de pago"
                        />
                      </div>
                    }
                  />

                  <ToggleRow
                    titulo="Efectivo en local (Retiro / En sitio)"
                    descripcion="Cobro en caja al momento de retirar o consumir en el local."
                    control={
                      <div className="flex items-center gap-2.5">
                        <Badge color={draft.datosBancarios?.efectivoActivo !== false ? "success" : "light"} size="sm">
                          {draft.datosBancarios?.efectivoActivo !== false ? "Activo" : "Inactivo"}
                        </Badge>
                        <Switch
                          checked={draft.datosBancarios?.efectivoActivo !== false}
                          onChange={(v) => setDatoBancario("efectivoActivo", v)}
                          aria-label="Aceptar efectivo en local"
                        />
                      </div>
                    }
                  />
                </BloqueConfig>

                {/* ── La pasarela del cobro en línea ─────────────────────────
                    Va DESPUÉS de los medios y solo cuando el link está encendido:
                    es el detalle de un medio, no un ajuste suelto. El mensaje de
                    cobro de abajo va fuera, porque las cuentas de transferencia se
                    le comunican al cliente tenga o no link. */}
                {draft.datosBancarios?.linkPagoActivo !== false && (
                  <BloqueConfig
                    icono={ShieldCheckIcon}
                    pregunta="¿Qué pasarela usas para el cobro en línea?"
                    descripcion="Con el checkout integrado no configuras nada más. Con un enlace externo, cada pedido cobrado en línea apunta a tu URL."
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setDatoBancario("linkPagoTipo", "globalpay")}
                        aria-pressed={(draft.datosBancarios?.linkPagoTipo ?? "globalpay") === "globalpay"}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          (draft.datosBancarios?.linkPagoTipo ?? "globalpay") === "globalpay"
                            ? "border-brand-500 bg-brand-500/[0.04] dark:border-brand-500 dark:bg-brand-500/10"
                            : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink-title dark:text-white">
                            GlobalPay de Redeban (integrado)
                          </span>
                          <Badge color="success" size="xs">Recomendado</Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Checkout propio de la aplicación, con tarjetas de crédito, débito y PSE.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDatoBancario("linkPagoTipo", "personalizado")}
                        aria-pressed={draft.datosBancarios?.linkPagoTipo === "personalizado"}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          draft.datosBancarios?.linkPagoTipo === "personalizado"
                            ? "border-brand-500 bg-brand-500/[0.04] dark:border-brand-500 dark:bg-brand-500/10"
                            : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink-title dark:text-white">
                            Link externo (Wompi, Bold, Mercado Pago)
                          </span>
                          <Badge color="light" size="xs">Personalizado</Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          El cliente paga en tu propia pasarela. Se le envía tu enlace tal cual.
                        </p>
                      </button>
                    </div>

                    {draft.datosBancarios?.linkPagoTipo === "personalizado" && (
                      <div className="mt-5">
                        <CampoConfig
                          etiqueta="URL o enlace de cobro externo"
                          ayuda="Sin ella se usa el checkout propio de la aplicación, aunque hayas elegido la pasarela externa."
                          htmlFor="link-pago-url"
                          ancho="max-w-2xl"
                        >
                          <Input
                            id="link-pago-url"
                            placeholder="Ej. https://checkout.wompi.co/l/link-de-tu-negocio o https://mpago.li/..."
                            value={draft.datosBancarios?.linkPagoUrl ?? ""}
                            onChange={(e) => setDatoBancario("linkPagoUrl", e.target.value)}
                          />
                        </CampoConfig>
                      </div>
                    )}

                    {/* Vista previa del enlace, derivada con la MISMA función que
                        usa la pantalla de crear pedido. Antes este bloque
                        construía la URL a mano, así que podía enseñar una cosa
                        y el pedido usar otra. */}
                    <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          Enlace que recibirá el cliente:
                        </span>
                        <Badge color="light" size="xs">Ejemplo pedido #P-001</Badge>
                      </div>
                      <p className="mt-1.5 break-all font-mono text-xs text-brand-700 select-all dark:text-brand-400">
                        {enlaceDePago(draft.datosBancarios, "P-001", window.location.origin)}
                      </p>
                    </div>
                  </BloqueConfig>
                )}

                {/* ── El mensaje de cobro, ya compuesto ──────────────────────
                    Es la prueba de que los controles de esta sección producen
                    algo: se compone con la MISMA función que usa la confirmación
                    de «Crear pedido», y solo con lo configurado.

                    Va FUERA de la tarjeta de pasarela —y no dentro— porque esa
                    tarjeta solo se pinta si el link de pago está encendido: las
                    cuentas de transferencia se le comunican al cliente igual,
                    tenga o no link. */}
                {mensajeDeCobro(draft.datosBancarios, "P-001", window.location.origin) !== "" && (
                  <BloqueConfig
                    icono={PageIcon}
                    pregunta="¿Qué le dices al cliente para que pague?"
                    descripcion="Esto es lo que el operador copia al confirmar un pedido. Se compone solo con lo que esté configurado aquí arriba."
                  >
                    <CampoConfig
                      etiqueta="Instrucciones de cobro"
                      ayuda="Cierran el mensaje, después de las cuentas y del enlace. Si se dejan vacías, el mensaje termina en las cuentas."
                      htmlFor="pago-instrucciones"
                      ancho="max-w-2xl"
                    >
                      <textarea
                        id="pago-instrucciones"
                        rows={3}
                        value={draft.datosBancarios?.instrucciones ?? ""}
                        onChange={(e) => setDatoBancario("instrucciones", e.target.value)}
                        placeholder="Ej. Por favor realiza tu transferencia y envía el comprobante indicando tu número de pedido para iniciar la preparación de tu orden."
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                      />
                    </CampoConfig>

                    <div className="mt-5">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Mensaje tal como lo recibe el cliente
                      </p>
                      <pre className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-3.5 font-sans text-xs leading-relaxed text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
                        {mensajeDeCobro(draft.datosBancarios, "P-001", window.location.origin)}
                      </pre>
                    </div>
                  </BloqueConfig>
                )}
              </>
            )}

            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN: TIEMPOS Y HORARIOS
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "tiempos" && (
              <>
                <BloqueConfig
                  icono={TimeIcon}
                  pregunta="¿Cuándo atiendes?"
                  descripcion="La ventana en la que el negocio recibe y despacha. Con el horario apagado, la operación se considera continua y ningún pedido cae fuera de hora."
                >
                  <ToggleRow
                    titulo="Aplicar horario comercial"
                    descripcion="Si lo apagas, se atiende siempre. El aviso de «cerrado» del canal de conversaciones depende de este ajuste."
                    control={
                      <Switch
                        checked={draft.horario.activo}
                        onChange={(v) => setHorario("activo", v)}
                        aria-label="Aplicar horario comercial"
                      />
                    }
                  />

                  {draft.horario.activo ? (
                    <div className="mt-5 space-y-5 border-t border-gray-100 pt-5 dark:border-gray-800/80">
                      <div>
                        <Label className="text-xs">Días laborales</Label>
                        <div className="flex flex-wrap gap-2">
                          {DIAS_SEMANA.map(({ d, label, largo }) => (
                            <ChipDia
                              key={d}
                              activo={draft.horario.dias.includes(d)}
                              label={label}
                              titulo={largo}
                              onClick={() => toggleDia(d)}
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {draft.horario.dias.length === 0
                            ? "Sin días seleccionados: el horario no aplica ningún día."
                            : `${draft.horario.dias.length} de 7 días seleccionados.`}
                        </p>
                      </div>

                      <div className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
                        <CampoConfig etiqueta="Apertura" htmlFor="horario-apertura" ancho="max-w-none">
                          <Input
                            id="horario-apertura"
                            type="time"
                            value={draft.horario.apertura}
                            onChange={(e) => setHorario("apertura", e.target.value)}
                          />
                        </CampoConfig>
                        <CampoConfig etiqueta="Cierre" htmlFor="horario-cierre" ancho="max-w-none">
                          <Input
                            id="horario-cierre"
                            type="time"
                            value={draft.horario.cierre}
                            onChange={(e) => setHorario("cierre", e.target.value)}
                            error={horarioInvalido}
                          />
                        </CampoConfig>
                      </div>

                      {horarioInvalido && (
                        <p className="text-xs text-error-500">
                          La hora de cierre debe ser posterior a la de apertura.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-5 border-t border-gray-100 pt-5 text-xs text-gray-500 dark:border-gray-800/80 dark:text-gray-400">
                      Operación continua 24 horas sin restricción de horario.
                    </p>
                  )}
                </BloqueConfig>

                <BloqueConfig
                  icono={AlertHexaIcon}
                  pregunta="¿Cuándo una orden está demorada?"
                  descripcion="A partir de estos minutos, la tarjeta del pedido se resalta en el tablero para que alguien la mire."
                >
                  <div className={claseFila}>
                    <Label2
                      titulo="Umbral de urgencia general"
                      descripcion="Minutos sin cambio antes de resaltar la orden como urgente. Es el valor que se usa cuando una etapa no tiene su propio tiempo objetivo."
                      htmlFor="umbral"
                    />
                    <div className="flex w-32 shrink-0 items-center gap-2">
                      <Input
                        id="umbral"
                        type="number"
                        min="1"
                        value={draft.umbralUrgencia}
                        onChange={(e) =>
                          set("umbralUrgencia", Math.max(1, Number(e.target.value) || 1))
                        }
                        className="text-right font-semibold"
                      />
                      <span className="text-xs text-gray-400">min</span>
                    </div>
                  </div>

                  {/*
                    La «Campana sonora» se retiró de aquí el 07/10.

                    Se editaba en DOS sitios —esta tarjeta y la sección
                    «Alertas» de la configuración del canal— sobre el mismo
                    campo (`alertaAtencion`), y su lector está en
                    `/pedidos/inicio`. Es una alerta de la BANDEJA: suena
                    mientras haya clientes esperando en conversaciones, no
                    solo por pedidos demorados. Su dueño es el canal, así que
                    aquí se deja constancia en vez de un segundo control.
                  */}
                  <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800/80 dark:text-gray-400">
                    La campana sonora se configura en{" "}
                    <strong>Configuración del canal → Alertas</strong>: avisa mientras haya
                    clientes esperando en la bandeja, no solo por pedidos demorados.
                  </p>

                  {/* ── Los tiempos objetivo ──────────────────────────────────
                      Solo se ofrecen las etapas ACTIVAS: un objetivo para una
                      etapa que el negocio apagó sería un ajuste sobre algo que no
                      existe, y no habría forma de comprobar que hace algo. */}
                  <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800/80">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Tiempo objetivo por etapa
                    </p>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                      {estadosActivosDe(draft)
                        .filter((e) => e !== "entregado")
                        .map((id) => {
                          const label = pedidosStore.estadoLabel(id);
                          return (
                            <CampoConfig key={id} etiqueta={label} htmlFor={`sla-${id}`} ancho="max-w-none">
                              <div className="flex items-center gap-2">
                                <Input
                                  id={`sla-${id}`}
                                  type="number"
                                  min="0"
                                  value={draft.tiemposObjetivo[id as EstadoConfigurable] ?? 0}
                                  onChange={(e) =>
                                    setTiempoObjetivo(id as EstadoConfigurable, Math.max(0, Number(e.target.value) || 0))
                                  }
                                  className="text-right font-semibold"
                                  aria-label={`Minutos objetivo ${label}`}
                                />
                                <span className="text-xs font-medium text-gray-400">min</span>
                              </div>
                            </CampoConfig>
                          );
                        })}
                    </div>
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Deja una etapa en 0 para que use el umbral general ({draft.umbralUrgencia} min).
                    </p>
                  </div>
                </BloqueConfig>
              </>
            )}

            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN: PRODUCTOS FRECUENTES

                No es el Catálogo (`/pedidos/catalogo`): aquel es la mercancía real
                —categoría, foto, descripción, disponibilidad— y lo que ve el
                cliente en `/catalogo-clientes`. Esta lista es un atajo de nombre+precio para
                autocompletar el formulario de Crear pedido. Se llamaba «Catálogo
                rápido» y el nombre hacía creer que duplicaba el Catálogo.
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "catalogo" && (
              <BloqueConfig
                icono={CartIcon}
                pregunta="¿Qué vendes siempre?"
                descripcion="Atajos de nombre y precio para cargar pedidos sin teclear. No es el Catálogo: esto no se publica ni lleva foto."
              >
                {draft.catalogo.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Sin productos frecuentes. Los ítems se ingresan libremente en Crear Pedido.
                    </p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={addItem}>
                      <PlusIcon className="mr-1 h-3.5 w-3.5" />
                      Añadir el primero
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
                      <div className="grid grid-cols-[1fr_130px_40px] gap-2 px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <span>Producto</span>
                        <span>Precio ($)</span>
                        <span className="text-right"></span>
                      </div>

                      {draft.catalogo.map((c) => (
                        <div
                          key={c.id}
                          className="grid grid-cols-[1fr_130px_40px] items-center gap-2 px-1 py-2"
                        >
                          <Input
                            placeholder="Nombre del producto"
                            value={c.nombre}
                            onChange={(e) => setItem(c.id, { nombre: e.target.value })}
                            aria-label="Nombre del producto"
                          />
                          <Input
                            type="number"
                            min="0"
                            value={c.precio}
                            placeholder="0"
                            onChange={(e) =>
                              setItem(c.id, { precio: Math.max(0, Number(e.target.value) || 0) })
                            }
                            className="text-right font-semibold"
                            aria-label="Precio"
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeItem(c.id)}
                              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-950/30 dark:hover:text-error-400"
                              title="Eliminar"
                              aria-label="Eliminar producto"
                            >
                              <TrashBinIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <Button size="sm" variant="outline" onClick={addItem}>
                        <PlusIcon className="mr-1 h-3.5 w-3.5" />
                        Añadir item
                      </Button>
                    </div>
                  </>
                )}
              </BloqueConfig>
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
                      "relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-gray-900/60",
                      canalesActivos.whatsapp
                        ? "border-gray-200/80 hover:border-emerald-500/40 hover:shadow-md dark:border-gray-800"
                        : "border-gray-200/50 opacity-80 dark:border-gray-800/60",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-xl",
                              canalesActivos.whatsapp
                                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
                            )}
                          >
                            <WhatsAppIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                              WhatsApp Business
                            </h4>
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              Bandeja omnicanal
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Badge color={canalesActivos.whatsapp ? "success" : "light"}>
                            {canalesActivos.whatsapp ? "Activo" : "Inactivo"}
                          </Badge>
                          <Switch
                            checked={canalesActivos.whatsapp}
                            onChange={(val) => toggleCanal("whatsapp", val)}
                            label=""
                          />
                        </div>
                      </div>

                      <p className="mt-3.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Bandeja omnicanal y notificaciones automáticas de pedidos a clientes.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800/80">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {canalesActivos.whatsapp ? "Sincronización en tiempo real" : "Canal desactivado"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canalesActivos.whatsapp}
                        onClick={() =>
                          navigate(
                            "/conversaciones/config?canal=whatsapp&from=/pedidos/config?seccion=integraciones",
                          )
                        }
                      >
                        Configurar bot
                      </Button>
                    </div>
                  </div>

                  {/* Instagram */}
                  <div
                    className={cn(
                      "relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-gray-900/60",
                      canalesActivos.instagram
                        ? "border-gray-200/80 hover:border-pink-500/40 hover:shadow-md dark:border-gray-800"
                        : "border-gray-200/50 opacity-80 dark:border-gray-800/60",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-xl",
                              canalesActivos.instagram
                                ? "bg-gradient-to-tr from-amber-500/20 via-pink-500/20 to-purple-500/20 text-pink-600 dark:text-pink-400"
                                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
                            )}
                          >
                            <InstagramIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                              Instagram
                            </h4>
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                              Direct Messages
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Badge color={canalesActivos.instagram ? "success" : "light"}>
                            {canalesActivos.instagram ? "Activo" : "Inactivo"}
                          </Badge>
                          <Switch
                            checked={canalesActivos.instagram}
                            onChange={(val) => toggleCanal("instagram", val)}
                            label=""
                          />
                        </div>
                      </div>

                      <p className="mt-3.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Recepción de pedidos por mensajes directos (DM) y catálogo interactivo en historias y chat.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800/80">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        Meta Graph API
                      </span>
                      <Button size="sm" variant="outline" disabled={!canalesActivos.instagram}>
                        Conectar cuenta
                      </Button>
                    </div>
                  </div>

                  {/* Facebook */}
                  <div
                    className={cn(
                      "relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-gray-900/60",
                      canalesActivos.facebook
                        ? "border-gray-200/80 hover:border-blue-500/40 hover:shadow-md dark:border-gray-800"
                        : "border-gray-200/50 opacity-80 dark:border-gray-800/60",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-xl",
                              canalesActivos.facebook
                                ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
                            )}
                          >
                            <FacebookIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                              Facebook
                            </h4>
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                              Messenger & Fan Page
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Badge color={canalesActivos.facebook ? "success" : "light"}>
                            {canalesActivos.facebook ? "Activo" : "Inactivo"}
                          </Badge>
                          <Switch
                            checked={canalesActivos.facebook}
                            onChange={(val) => toggleCanal("facebook", val)}
                            label=""
                          />
                        </div>
                      </div>

                      <p className="mt-3.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Gestión de ventas, respuestas a comentarios de publicaciones y sincronización con Messenger.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800/80">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        Facebook Business
                      </span>
                      <Button size="sm" variant="outline" disabled={!canalesActivos.facebook}>
                        Conectar página
                      </Button>
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
