import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { Card } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Switch } from "@/elements/form/switch";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { BoltIcon, CartIcon, GridIcon, PlusIcon, TimeIcon, TrashBinIcon } from "@/icons";
import { pedidosStore, puedeGuardarConfig, motivoSinPermiso } from "@/stores";
import type {
  Modalidad,
  PedidosConfig,
  CatalogoItem,
  EstadoConfigurable,
} from "@/stores/pedidos.store";
import { catalogoDesdePreset } from "@/stores/pedidos.store";
import {
  BUSINESS_PROFILES,
  type BusinessProfileType,
} from "@/domain/pedidos/pedidos.profiles";
import {
  CardHead,
  ChipDia,
  ConfigAcciones,
  ConfigHeader,
  ConfigSectionNav,
  ConfigShell,
  Label2,
  ToggleRow,
  claseFila,
  type GrupoNav,
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

type ClaveSeccion = "perfil" | "flujo" | "tiempos" | "catalogo";

/** Orden de la columna de secciones. `flujo` primero: es la seccion por defecto. */
const ORDEN_SECCIONES: ClaveSeccion[] = ["flujo", "perfil", "tiempos", "catalogo"];

/**
 * Metadatos de cada seccion. La etiqueta y el consejo los pinta `ConfigShell`,
 * el mismo componente que usan `/configuracion`, `/conversaciones/config` y
 * `/asistente/config`.
 *
 * Antes esto era `TABS_CONFIG: TabItem[]` —una barra horizontal con cuatro
 * etiquetas y ningun consejo— y esta era la unica de las cuatro pantallas de
 * configuracion sin columna de secciones: el mismo producto con dos
 * navegaciones distintas.
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
    label: "Catálogo rápido",
    hint: "Ítems sugeridos con precio para cargar pedidos sin teclear.",
    icono: CartIcon,
  },
};

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
  const [seccion, setSeccion] = useState<ClaveSeccion>("flujo");

  // Borrador local: preserva el store intacto hasta presionar "Guardar cambios".
  const [draft, setDraft] = useState<PedidosConfig>(() => ({
    ...pedidosStore.config,
    plantillas: { ...pedidosStore.config.plantillas },
    modalidades: [...pedidosStore.config.modalidades],
    catalogo: pedidosStore.config.catalogo.map((c) => ({ ...c })),
    aliasEstados: { ...pedidosStore.config.aliasEstados },
    aliasModalidades: { ...pedidosStore.config.aliasModalidades },
    horario: { ...pedidosStore.config.horario, dias: [...pedidosStore.config.horario.dias] },
    tiemposObjetivo: { ...pedidosStore.config.tiemposObjetivo },
    alertaAtencion: { ...pedidosStore.config.alertaAtencion },
  }));

  const [guardado, setGuardado] = useState(false);

  // ── Permisos ──
  const puedeEditar = puedeGuardarConfig();
  const soloLectura = !puedeEditar;

  const set = <K extends keyof PedidosConfig>(k: K, v: PedidosConfig[K]) => {
    setDraft((prev) => ({ ...prev, [k]: v }));
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

  const addItem = () =>
    set("catalogo", [...draft.catalogo, { id: crypto.randomUUID(), nombre: "", precio: 0 }]);

  const setItem = (id: string, patch: Partial<CatalogoItem>) =>
    set("catalogo", draft.catalogo.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const removeItem = (id: string) =>
    set("catalogo", draft.catalogo.filter((c) => c.id !== id));

  const horarioInvalido = draft.horario.activo && draft.horario.cierre <= draft.horario.apertura;

  const aplicarPerfilInmediato = (key: BusinessProfileType) => {
    pedidosStore.setPerfilComercial(key, true);
    setDraft(() => ({
      ...pedidosStore.config,
      plantillas: { ...pedidosStore.config.plantillas },
      modalidades: [...pedidosStore.config.modalidades],
      catalogo: pedidosStore.config.catalogo.map((c) => ({ ...c })),
      aliasEstados: { ...pedidosStore.config.aliasEstados },
      aliasModalidades: { ...pedidosStore.config.aliasModalidades },
      horario: { ...pedidosStore.config.horario, dias: [...pedidosStore.config.horario.dias] },
      tiemposObjetivo: { ...pedidosStore.config.tiemposObjetivo },
      alertaAtencion: { ...pedidosStore.config.alertaAtencion },
      perfilComercial: pedidosStore.config.perfilComercial,
      capacidadesActivas: pedidosStore.config.capacidadesActivas ? [...pedidosStore.config.capacidadesActivas] : undefined,
    }));
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const guardar = () => {
    if (!puedeEditar || horarioInvalido) return;

    const perfilCambio = draft.perfilComercial && draft.perfilComercial !== pedidosStore.config.perfilComercial;

    const catalogoLimpio = draft.catalogo
      .filter((c) => c.nombre.trim() !== "")
      .map((c) => ({ ...c, nombre: c.nombre.trim(), precio: Math.max(0, Number(c.precio) || 0) }));

    const aliasEstados = Object.fromEntries(
      Object.entries(draft.aliasEstados).filter(([, v]) => (v ?? "").trim() !== ""),
    );
    const aliasModalidades = Object.fromEntries(
      Object.entries(draft.aliasModalidades).filter(([, v]) => (v ?? "").trim() !== ""),
    );

    pedidosStore.updateConfig({
      ...draft,
      catalogo: catalogoLimpio,
      aliasEstados,
      aliasModalidades,
    });

    if (perfilCambio && draft.perfilComercial) {
      pedidosStore.setPerfilComercial(draft.perfilComercial, true);
    }

    setDraft((prev) => ({
      ...prev,
      ...pedidosStore.config,
      catalogo: pedidosStore.config.catalogo.map((c) => ({ ...c })),
    }));
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const meta = META_SECCION[seccion];

  const grupos: GrupoNav[] = [
    {
      grupo: "pedidos",
      label: "Pedidos",
      secciones: ORDEN_SECCIONES.map((k) => ({
        key: k,
        label: META_SECCION[k].label,
        hint: META_SECCION[k].hint,
        icono: META_SECCION[k].icono,
      })),
    },
  ];

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
          descripcion="Ajustes del flujo operativo, modalidades, horario y catálogo rápido."
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

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* ═══════════ Navegación vertical de secciones ═══════════ */}
        {/* Va FUERA del `<fieldset>` a propósito: navegar entre secciones no es
            editar. Metida dentro, `fieldset disabled` desactiva sus botones y
            en modo solo lectura el usuario no podría ni cambiar de sección. */}
        <ConfigSectionNav
          grupos={grupos}
          activa={seccion}
          onSeleccionar={(k) => setSeccion(k as ClaveSeccion)}
          ariaLabel="Secciones de configuración de Pedidos"
        />

        {/* ═══════════ Panel de contenido: UNA sección montada ═══════════ */}
        {/* El `<fieldset>` envuelve SOLO el panel, no la navegación. `min-w-0`
            neutraliza el `min-inline-size: min-content` por defecto del
            fieldset, que rompería el layout de dos columnas. */}
        <fieldset
          disabled={soloLectura}
          className="m-0 min-w-0 flex-1 border-0 p-0"
        >
          <ConfigShell
            seccionKey={seccion}
            titulo={meta.label}
            hint={meta.hint}
            footer={
              <ConfigAcciones
                mensaje={
                  guardado ? (
                    <span className="text-sm text-success-600 dark:text-success-500">
                      Guardado ✓
                    </span>
                  ) : undefined
                }
              >
                <Button disabled={horarioInvalido || soloLectura} onClick={guardar}>
                  Guardar cambios
                </Button>
              </ConfigAcciones>
            }
          >
            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN 0: PERFIL DE NEGOCIO (¿QUÉ VENDES?)
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "perfil" && (
              <div className="space-y-5">
                <Card>
                  <CardHead>¿Qué vende tu negocio?</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Selecciona tu perfil comercial. Esto adapta las capacidades, campos de producto y terminología sin cambiar el núcleo de tus pedidos.
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {(Object.keys(BUSINESS_PROFILES) as BusinessProfileType[]).map((key) => {
                      const p = BUSINESS_PROFILES[key];
                      const seleccionado = (draft.perfilComercial ?? "food") === key;

                      return (
                        <div
                          key={key}
                          onClick={() => {
                            setDraft((prev) => ({
                              ...prev,
                              perfilComercial: key,
                              capacidadesActivas: [...p.defaultCapabilities],
                              modalidades: [...p.defaultModalidades],
                              aliasEstados: { ...p.defaultAliasEstados },
                              plantillas: { ...p.defaultPlantillas },
                              catalogo: catalogoDesdePreset(p),
                            }));
                          }}
                          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                            seleccionado
                              ? "border-brand-500 bg-brand-50/50 shadow-theme-sm ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-950/20"
                              : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">{p.icon}</span>
                              <div>
                                <h4 className="text-sm font-semibold text-ink-title dark:text-white">
                                  {p.name}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {p.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={seleccionado ? "outline" : "primary"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  aplicarPerfilInmediato(key);
                                }}
                              >
                                {seleccionado ? "Reaplicar datos demo" : "Activar perfil"}
                              </Button>
                              {seleccionado && (
                                <Badge color="success" size="sm">
                                  Activo
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-800/60">
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
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN 1: OPERACIÓN Y FLUJO
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "flujo" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {/* Estados del pipeline */}
                  <Card>
                    <CardHead>Estados opcionales del pipeline</CardHead>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Activa pasos adicionales en el tablero Kanban.
                    </p>

                    <div className="mt-4">
                      <ToggleRow
                        titulo="Confirmado"
                        descripcion={
                          draft.perfilComercial === "fashion"
                            ? "Paso previo de aceptación antes de empaque y rotulado."
                            : draft.perfilComercial === "services"
                            ? "Paso previo de confirmación de cita en la agenda."
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
                    </div>
                  </Card>

                  {/* Modalidades habilitadas */}
                  <Card>
                    <CardHead>Modalidades de entrega</CardHead>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Servicios de despacho activos para recepción de pedidos.
                    </p>

                    <div className="mt-4">
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
                    </div>
                  </Card>
                </div>

                {/* Nombres personalizados (Alias) */}
                <Card>
                  <CardHead>Nombres personalizados (alias)</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Renombra los títulos de columnas y modalidades. Deja vacío para usar los estándar.
                  </p>

                  <div className="mt-4 space-y-5">
                    <div>
                      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Estados en tablero
                      </h3>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {ESTADOS_CONFIG.map((id) => {
                          // La etiqueta de referencia es la del store: si el
                          // negocio ya renombró un estado, el campo muestra SU
                          // nombre como referencia y no el del sistema.
                          const label = pedidosStore.estadoLabel(id);
                          return (
                            <div key={id}>
                              <Label htmlFor={`alias-e-${id}`} className="text-xs">
                                {label}
                              </Label>
                              <Input
                                id={`alias-e-${id}`}
                                placeholder={label}
                                value={draft.aliasEstados[id] ?? ""}
                                onChange={(e) => setAliasEstado(id, e.target.value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 dark:border-gray-800/80">
                      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Modalidades de entrega
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {TODAS_MODALIDADES.map((m) => {
                          const def = { retiro: "Retiro", domicilio: "Domicilio", en_sitio: "En sitio" }[m];
                          return (
                            <div key={m}>
                              <Label htmlFor={`alias-m-${m}`} className="text-xs">
                                {def}
                              </Label>
                              <Input
                                id={`alias-m-${m}`}
                                placeholder={def}
                                value={draft.aliasModalidades[m] ?? ""}
                                onChange={(e) => setAliasModalidad(m, e.target.value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN 2: TIEMPOS Y HORARIOS
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "tiempos" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {/* Horario Comercial */}
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardHead>Horario comercial</CardHead>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Ventana de atención a clientes.
                        </p>
                      </div>
                      <Switch
                        checked={draft.horario.activo}
                        onChange={(v) => setHorario("activo", v)}
                        aria-label="Aplicar horario comercial"
                      />
                    </div>

                    {draft.horario.activo ? (
                      <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800/80">
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
                          <p className="mt-2 text-xs text-gray-400">
                            {draft.horario.dias.length === 0
                              ? "Sin días seleccionados: el horario no aplica ningún día."
                              : `${draft.horario.dias.length} de 7 días seleccionados.`}
                          </p>
                        </div>

                        <div className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="horario-apertura">Apertura</Label>
                            <Input
                              id="horario-apertura"
                              type="time"
                              value={draft.horario.apertura}
                              onChange={(e) => setHorario("apertura", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="horario-cierre">Cierre</Label>
                            <Input
                              id="horario-cierre"
                              type="time"
                              value={draft.horario.cierre}
                              onChange={(e) => setHorario("cierre", e.target.value)}
                              error={horarioInvalido}
                            />
                          </div>
                        </div>

                        {horarioInvalido && (
                          <p className="text-xs text-error-500">
                            La hora de cierre debe ser posterior a la de apertura.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-800/80">
                        Operación continua 24 horas sin restricción de horario.
                      </p>
                    )}
                  </Card>

                  {/* Alertas Operativas */}
                  <Card>
                    <CardHead>Alertas y notificación</CardHead>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Sensibilidad ante pedidos demorados o sin atender.
                    </p>

                    <div className="mt-4">
                      <div className={claseFila}>
                        <Label2
                          titulo="Umbral de urgencia general"
                          descripcion="Minutos sin cambio antes de resaltar la orden como urgente."
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

                      <ToggleRow
                        titulo="Campana sonora"
                        descripcion="Aviso mientras existan pedidos pendientes de atención."
                        control={
                          <Switch
                            checked={draft.alertaAtencion.activo}
                            onChange={(v) => set("alertaAtencion", { ...draft.alertaAtencion, activo: v })}
                            aria-label="Campana sonora de pedidos pendientes"
                          />
                        }
                      />

                      {draft.alertaAtencion.activo && (
                        <div className={claseFila}>
                          <Label2
                            titulo="Repetir cada"
                            descripcion="Frecuencia del aviso sonoro mientras haya pedidos sin atender."
                            htmlFor="alerta-cada"
                          />
                          <div className="flex w-28 shrink-0 items-center gap-2">
                            <Input
                              id="alerta-cada"
                              type="number"
                              min="5"
                              step={5}
                              value={draft.alertaAtencion.cadaSegundos}
                              onChange={(e) =>
                                set("alertaAtencion", {
                                  ...draft.alertaAtencion,
                                  cadaSegundos: Math.max(5, Number(e.target.value) || 30),
                                })
                              }
                              className="text-right font-semibold"
                            />
                            <span className="text-xs text-gray-400">seg</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Tiempos objetivo por estado */}
                <Card>
                  <CardHead>Tiempos objetivo por estado (SLA)</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Minutos esperados por etapa. Si se supera, la orden se resalta. Deja en 0 para usar
                    el umbral general ({draft.umbralUrgencia} min).
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {ESTADOS_CONFIG.map((id) => {
                      const label = pedidosStore.estadoLabel(id);
                      return (
                        <div key={id}>
                          <Label htmlFor={`sla-${id}`} className="text-xs">
                            {label}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`sla-${id}`}
                              type="number"
                              min="0"
                              value={draft.tiemposObjetivo[id] ?? 0}
                              onChange={(e) => setTiempoObjetivo(id, Math.max(0, Number(e.target.value) || 0))}
                              className="text-right font-semibold"
                              aria-label={`Minutos objetivo ${label}`}
                            />
                            <span className="text-xs font-medium text-gray-400">min</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════
                SECCIÓN 3: CATÁLOGO RÁPIDO
               ═════════════════════════════════════════════════════════════════════ */}
            {seccion === "catalogo" && (
              <div className="space-y-5">
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardHead>Catálogo de productos rápidos</CardHead>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Items sugeridos con precio para carga ágil de pedidos.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={addItem}>
                      <PlusIcon className="mr-1 h-3.5 w-3.5" />
                      Añadir item
                    </Button>
                  </div>

                  {draft.catalogo.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-xs text-gray-400">
                        Sin productos configurados. Los ítems se ingresan libremente en Crear Pedido.
                      </p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={addItem}>
                        Crear primer producto
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800/80">
                      <div className="grid grid-cols-[1fr_130px_40px] gap-2 px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
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
                  )}
                </Card>
              </div>
            )}
          </ConfigShell>
        </fieldset>
      </div>
    </div>
  );
});

export default ConfigPage;
