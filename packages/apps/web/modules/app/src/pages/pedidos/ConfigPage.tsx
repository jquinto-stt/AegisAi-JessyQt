import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Tab, type TabItem } from "@/elements/ui/tabs";
import { Switch } from "@/elements/form/switch";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { CheckCircleIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { pedidosStore, puedeGuardarConfig, motivoSinPermiso } from "@/stores";
import type {
  Modalidad,
  PedidosConfig,
  CatalogoItem,
  EstadoConfigurable,
} from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES Y METADATA
// ═══════════════════════════════════════════════════════════════════════════

const inputBase =
  "h-10 w-full rounded-lg border bg-transparent px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 dark:text-white/90 dark:placeholder:text-white/30";
const inputOk = "border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700";

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

const ESTADOS_CONFIG: { id: EstadoConfigurable; label: string }[] = [
  { id: "nuevo", label: "Nuevo" },
  { id: "confirmado", label: "Confirmado" },
  { id: "en_preparacion", label: "En preparación" },
  { id: "listo", label: "Listo" },
  { id: "en_camino", label: "En camino" },
];

const DIAS_SEMANA: { d: number; label: string }[] = [
  { d: 1, label: "Lun" },
  { d: 2, label: "Mar" },
  { d: 3, label: "Mié" },
  { d: 4, label: "Jue" },
  { d: 5, label: "Vie" },
  { d: 6, label: "Sáb" },
  { d: 0, label: "Dom" },
];

type TabConfig = "flujo" | "tiempos" | "catalogo";

const TABS_CONFIG: TabItem[] = [
  { key: "flujo", label: "Operación y Flujo" },
  { key: "tiempos", label: "Tiempos y Horarios" },
  { key: "catalogo", label: "Catálogo Rápido" },
];

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA CONFIGURACIÓN DE PEDIDOS (DISEÑO COMPACTO Y JERÁRQUICO)
// ═══════════════════════════════════════════════════════════════════════════

export const ConfigPage = observer(() => {
  const [activeTab, setActiveTab] = useState<TabConfig>("flujo");

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
        : [...prev.horario.dias, d].sort();
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

    pedidosStore.updateConfig({
      ...draft,
      catalogo: catalogoLimpio,
      aliasEstados,
      aliasModalidades,
    });

    setDraft((prev) => ({ ...prev, catalogo: catalogoLimpio.map((c) => ({ ...c })) }));
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  return (
    <div className="max-w-5xl space-y-5 pb-12">
      <PageMeta title="Configuración · Pedidos" description="Ajustes del módulo de pedidos" />

      {/* ── CABECERA COMPACTA ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Configuración de Pedidos
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Ajustes del flujo operativo, modalidades, horario y catálogo rápido.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {guardado && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Guardado
            </span>
          )}
          <Button
            size="sm"
            disabled={horarioInvalido || soloLectura}
            onClick={guardar}
          >
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* ── AVISO DE SOLO LECTURA ──────────────────────────────────────────── */}
      {soloLectura && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.5a4.5 4.5 0 10-9 0v3m-.75 0h10.5a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6.75A1.5 1.5 0 015.25 18v-6a1.5 1.5 0 011.5-1.5z" />
          </svg>
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
              Configuración en modo solo lectura
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
              {motivoSinPermiso("settings.manage")}
            </p>
          </div>
        </div>
      )}

      {/* ── TABS BAR ───────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 dark:border-gray-800">
        <Tab
          items={TABS_CONFIG}
          activeTab={activeTab}
          onTabChange={(k) => setActiveTab(k as TabConfig)}
          variant="underline"
        />
      </div>

      {/* ── FORMULARIO PRINCIPAL ───────────────────────────────────────────── */}
      <fieldset disabled={soloLectura} className="m-0 min-w-0 space-y-5 border-0 p-0">
        {/* ═════════════════════════════════════════════════════════════════════
            PESTAÑA 1: OPERACIÓN Y FLUJO (DISEÑO COMPACTO 2 COLUMNAS)
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === "flujo" && (
          <div className="space-y-5 animate-entrada-suave">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Estados del pipeline */}
              <Card className="p-4 flex flex-col justify-between">
                <div>
                  <div className="mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Estados Opcionales del Pipeline
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Activa pasos adicionales en el tablero Kanban.
                    </p>
                  </div>

                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between p-3">
                      <div className="pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            Confirmado
                          </span>
                          <Badge color={draft.usarConfirmado ? "success" : "light"} size="xs">
                            {draft.usarConfirmado ? "Activo" : "Omitido"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          Paso previo de aceptación antes de cocina.
                        </p>
                      </div>
                      <Switch
                        checked={draft.usarConfirmado}
                        onChange={(v) => set("usarConfirmado", v)}
                        label=""
                      />
                    </div>

                    <div className="flex items-center justify-between p-3">
                      <div className="pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            En camino
                          </span>
                          <Badge color={draft.usarEnCamino ? "success" : "light"} size="xs">
                            {draft.usarEnCamino ? "Activo" : "Omitido"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          Etapa de despacho y reparto a domicilio.
                        </p>
                      </div>
                      <Switch
                        checked={draft.usarEnCamino}
                        onChange={(v) => set("usarEnCamino", v)}
                        label=""
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Modalidades habilitadas */}
              <Card className="p-4 flex flex-col justify-between">
                <div>
                  <div className="mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Modalidades de Entrega
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Servicios de despacho activos para recepción de pedidos.
                    </p>
                  </div>

                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                    {TODAS_MODALIDADES.map((m) => {
                      const activa = draft.modalidades.includes(m);
                      const info = MODALIDAD_INFO[m];

                      return (
                        <div key={m} className="flex items-center justify-between p-3">
                          <div className="pr-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                {info.label}
                              </span>
                              <Badge color={activa ? "primary" : "light"} size="xs">
                                {activa ? "Activa" : "Inactiva"}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                              {info.desc}
                            </p>
                          </div>
                          <Switch
                            checked={activa}
                            disabled={activa && draft.modalidades.length === 1}
                            onChange={() => toggleModalidad(m)}
                            label=""
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>

            {/* Nombres personalizados (Alias) */}
            <Card className="p-4">
              <div className="mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Nombres Personalizados (Alias)
                </h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Renombra los títulos de columnas y modalidades. Deja vacío para usar los estándar.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                    Estados en Tablero
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {ESTADOS_CONFIG.map(({ id, label }) => (
                      <div key={id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
                        <Label htmlFor={`alias-e-${id}`} className="mb-1 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                          {label}
                        </Label>
                        <Input
                          id={`alias-e-${id}`}
                          placeholder={label}
                          value={draft.aliasEstados[id] ?? ""}
                          onChange={(e) => setAliasEstado(id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                  <h3 className="mb-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                    Modalidades de Entrega
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {TODAS_MODALIDADES.map((m) => {
                      const def = { retiro: "Retiro", domicilio: "Domicilio", en_sitio: "En sitio" }[m];
                      return (
                        <div key={m} className="rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
                          <Label htmlFor={`alias-m-${m}`} className="mb-1 text-[11px] font-medium text-gray-700 dark:text-gray-300">
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
            PESTAÑA 2: TIEMPOS Y HORARIOS (DISEÑO COMPACTO 2 COLUMNAS)
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === "tiempos" && (
          <div className="space-y-5 animate-entrada-suave">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Horario Comercial */}
              <Card className="p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Horario Comercial
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Ventana de atención a clientes.
                      </p>
                    </div>
                    <Switch
                      checked={draft.horario.activo}
                      onChange={(v) => setHorario("activo", v)}
                      label=""
                    />
                  </div>

                  {draft.horario.activo ? (
                    <div className="mt-3 space-y-3.5">
                      <div>
                        <Label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Días laborales
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {DIAS_SEMANA.map(({ d, label }) => {
                            const activo = draft.horario.dias.includes(d);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => toggleDia(d)}
                                className={
                                  "h-7 w-9 rounded-lg border text-xs font-semibold transition-colors cursor-pointer " +
                                  (activo
                                    ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
                                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400")
                                }
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="horario-apertura">Apertura</Label>
                          <input
                            id="horario-apertura"
                            type="time"
                            value={draft.horario.apertura}
                            onChange={(e) => setHorario("apertura", e.target.value)}
                            className={`${inputBase} ${inputOk}`}
                          />
                        </div>
                        <div>
                          <Label htmlFor="horario-cierre">Cierre</Label>
                          <input
                            id="horario-cierre"
                            type="time"
                            value={draft.horario.cierre}
                            onChange={(e) => setHorario("cierre", e.target.value)}
                            className={`${inputBase} ${inputOk}`}
                          />
                        </div>
                      </div>

                      {horarioInvalido && (
                        <p className="text-xs text-red-500">
                          La hora de cierre debe ser posterior a la de apertura.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-gray-400">
                      Operación continua 24 horas sin restricción de horario.
                    </p>
                  )}
                </div>
              </Card>

              {/* Alertas Operativas */}
              <Card className="p-4 flex flex-col justify-between">
                <div>
                  <div className="mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Alertas y Notificación
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Sensibilidad ante pedidos demorados o sin atender.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Umbral general */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
                      <Label htmlFor="umbral" className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        Umbral de urgencia general
                      </Label>
                      <p className="mt-0.5 mb-2 text-[11px] text-gray-500 dark:text-gray-400">
                        Minutos sin cambio antes de resaltar la orden como urgente.
                      </p>
                      <div className="flex items-center gap-2 max-w-[150px]">
                        <input
                          id="umbral"
                          type="number"
                          min="1"
                          value={draft.umbralUrgencia}
                          onChange={(e) => set("umbralUrgencia", Math.max(1, Number(e.target.value) || 1))}
                          className={`${inputBase} ${inputOk} text-right font-semibold`}
                        />
                        <span className="text-xs text-gray-400">min</span>
                      </div>
                    </div>

                    {/* Alerta sonora */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <Label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            Campana sonora
                          </Label>
                          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                            Aviso mientras existan pedidos pendientes de atención.
                          </p>
                        </div>
                        <Switch
                          checked={draft.alertaAtencion.activo}
                          onChange={(v) => set("alertaAtencion", { ...draft.alertaAtencion, activo: v })}
                          label=""
                        />
                      </div>

                      {draft.alertaAtencion.activo && (
                        <div className="mt-2.5 pt-2.5 border-t border-gray-200/60 dark:border-gray-800 flex items-center justify-between gap-2">
                          <Label htmlFor="alerta-cada" className="text-xs text-gray-600 dark:text-gray-400">
                            Repetir cada
                          </Label>
                          <div className="flex items-center gap-1.5 max-w-[110px]">
                            <input
                              id="alerta-cada"
                              type="number"
                              min="5"
                              step="5"
                              value={draft.alertaAtencion.cadaSegundos}
                              onChange={(e) =>
                                set("alertaAtencion", {
                                  ...draft.alertaAtencion,
                                  cadaSegundos: Math.max(5, Number(e.target.value) || 30),
                                })
                              }
                              className={`${inputBase} ${inputOk} text-right font-semibold`}
                            />
                            <span className="text-xs text-gray-400">seg</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Tiempos objetivo por estado */}
            <Card className="p-4">
              <div className="mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Tiempos Objetivo por Estado (SLA)
                </h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Minutos esperados por etapa. Si se supera, la orden se resalta. Deja en 0 para usar el umbral general ({draft.umbralUrgencia} min).
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {ESTADOS_CONFIG.map(({ id, label }) => (
                  <div
                    key={id}
                    className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      {label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        value={draft.tiemposObjetivo[id] ?? 0}
                        onChange={(e) => setTiempoObjetivo(id, Math.max(0, Number(e.target.value) || 0))}
                        className="h-8 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-right text-xs font-semibold text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
                        aria-label={`Minutos objetivo ${label}`}
                      />
                      <span className="text-xs font-medium text-gray-400">min</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            PESTAÑA 3: CATÁLOGO RÁPIDO (CARD COMPACTO)
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === "catalogo" && (
          <div className="space-y-5 animate-entrada-suave max-w-3xl">
            <Card className="p-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Catálogo de Productos Rápidos
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Items sugeridos con precio para carga ágil de pedidos.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <PlusIcon className="mr-1 h-3.5 w-3.5" />
                  Añadir item
                </Button>
              </div>

              {draft.catalogo.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-gray-400">
                    Sin productos configurados. Los ítems se ingresan libremente en Crear Pedido.
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={addItem}>
                    Crear primer producto
                  </Button>
                </div>
              ) : (
                <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
                  <div className="grid grid-cols-[1fr_130px_40px] gap-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                    <span>Producto</span>
                    <span>Precio ($)</span>
                    <span className="text-right"></span>
                  </div>

                  {draft.catalogo.map((c) => (
                    <div
                      key={c.id}
                      className="grid grid-cols-[1fr_130px_40px] gap-2 py-1.5 items-center px-1"
                    >
                      <Input
                        placeholder="Nombre del producto"
                        value={c.nombre}
                        onChange={(e) => setItem(c.id, { nombre: e.target.value })}
                      />
                      <input
                        type="number"
                        min="0"
                        value={c.precio}
                        placeholder="0"
                        onChange={(e) =>
                          setItem(c.id, { precio: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className={`${inputBase} ${inputOk} font-semibold text-right`}
                        aria-label="Precio"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeItem(c.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors cursor-pointer"
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
      </fieldset>

      {/* ── FOOTER DE GUARDADO ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
        <span className="text-xs text-gray-400">
          Los cambios se aplican inmediatamente a la operativa.
        </span>

        <div className="flex items-center gap-3">
          {guardado && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Cambios guardados con éxito
            </span>
          )}
          <Button
            disabled={horarioInvalido || soloLectura}
            onClick={guardar}
          >
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
});

export default ConfigPage;
