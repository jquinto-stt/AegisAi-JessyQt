import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Switch } from "@/elements/form/switch";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { pedidosStore, puedeGuardarConfig, puedeEditarPlantillas, motivoSinPermiso } from "@/stores";
import type {
  Modalidad,
  PedidosConfig,
  CatalogoItem,
  PlantillasWhatsApp,
  EstadoConfigurable,
} from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const inputBase =
  "h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:text-white/90 dark:placeholder:text-white/30";
const inputOk = "border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700";

const TODAS_MODALIDADES: Modalidad[] = ["retiro", "domicilio", "en_sitio"];

const PLANTILLA_META: { key: keyof PlantillasWhatsApp; label: string }[] = [
  { key: "recibido", label: "Pedido recibido (nuevo)" },
  { key: "confirmado", label: "Pedido confirmado" },
  { key: "enPreparacion", label: "En preparación" },
  { key: "listo", label: "Pedido listo" },
  { key: "enCamino", label: "En camino" },
  { key: "entregado", label: "Entregado" },
  { key: "cancelado", label: "Cancelado" },
];

/** Estados configurables (alias / tiempo objetivo) con su etiqueta por defecto. */
const ESTADOS_CONFIG: { id: EstadoConfigurable; label: string }[] = [
  { id: "nuevo", label: "Nuevo" },
  { id: "confirmado", label: "Confirmado" },
  { id: "en_preparacion", label: "En preparación" },
  { id: "listo", label: "Listo" },
  { id: "en_camino", label: "En camino" },
];

/** Días de la semana (JS getDay: 0=Dom … 6=Sáb) para el horario. */
const DIAS_SEMANA: { d: number; label: string }[] = [
  { d: 1, label: "Lun" },
  { d: 2, label: "Mar" },
  { d: 3, label: "Mié" },
  { d: 4, label: "Jue" },
  { d: 5, label: "Vie" },
  { d: 6, label: "Sáb" },
  { d: 0, label: "Dom" },
];

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ConfigPage — configuración del módulo Pedidos. Edita un borrador local y lo
 * guarda con pedidosStore.updateConfig (persistido en localStorage). Controla:
 * estados opcionales del pipeline (confirmado/en camino), modalidades
 * habilitadas, umbral de urgencia, plantillas de WhatsApp (solo texto) y un
 * catálogo simple opcional de items.
 *
 * **Autorización (Fase 2).** Dos capacidades distintas, con propósitos
 * distintos:
 *
 *   - `settings.read`  → entrar y VER la configuración (lo exige la ruta).
 *   - `settings.manage`→ modificarla. Sin ella la página es de **solo lectura**:
 *     se envuelve el formulario en un `<fieldset disabled>` (que deshabilita
 *     nativamente inputs y switches) y se explica por qué.
 *   - `channels.manage`→ editar las plantillas de WhatsApp, que son contenido
 *     de canal, no ajuste del módulo. Un rol puede tener `settings.manage` y no
 *     `channels.manage` (o al revés).
 *
 * Se optó por **deshabilitar con motivo** en vez de ocultar: quien llega aquí
 * tiene `settings.read`, así que ocultarle el formulario le haría creer que la
 * configuración no existe. "Ver pero no poder" es la respuesta honesta.
 */
export const ConfigPage = observer(() => {
  // Borrador local: no toca el store hasta "Guardar".
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

  // ── Autorización de la página ──
  // `puedeEditar` gobierna todo el formulario; `puedePlantillas` solo la
  // tarjeta de plantillas de WhatsApp (contenido de canal).
  const puedeEditar = puedeGuardarConfig();
  const puedePlantillas = puedeEditarPlantillas();
  const soloLectura = !puedeEditar;

  const set = <K extends keyof PedidosConfig>(k: K, v: PedidosConfig[K]) => {
    setDraft((prev) => ({ ...prev, [k]: v }));
    setGuardado(false);
  };

  const toggleModalidad = (m: Modalidad) => {
    const activa = draft.modalidades.includes(m);
    // No permitir quedarse sin modalidades.
    if (activa && draft.modalidades.length === 1) return;
    set("modalidades", activa ? draft.modalidades.filter((x) => x !== m) : [...draft.modalidades, m]);
  };

  const setPlantilla = (key: keyof PlantillasWhatsApp, value: string) => {
    setDraft((prev) => ({ ...prev, plantillas: { ...prev.plantillas, [key]: value } }));
    setGuardado(false);
  };

  // ── Alias de estados / modalidades (C) ──
  const setAliasEstado = (id: EstadoConfigurable, value: string) => {
    setDraft((prev) => ({ ...prev, aliasEstados: { ...prev.aliasEstados, [id]: value } }));
    setGuardado(false);
  };
  const setAliasModalidad = (m: Modalidad, value: string) => {
    setDraft((prev) => ({ ...prev, aliasModalidades: { ...prev.aliasModalidades, [m]: value } }));
    setGuardado(false);
  };

  // ── Horario de atención (A) ──
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

  // ── Tiempos objetivo por estado (B) ──
  const setTiempoObjetivo = (id: EstadoConfigurable, minutos: number) => {
    setDraft((prev) => {
      const t = { ...prev.tiemposObjetivo };
      if (minutos > 0) t[id] = minutos;
      else delete t[id]; // 0/vacío = usa el umbral global
      return { ...prev, tiemposObjetivo: t };
    });
    setGuardado(false);
  };

  // ── Catálogo ──
  const addItem = () =>
    set("catalogo", [...draft.catalogo, { id: crypto.randomUUID(), nombre: "", precio: 0 }]);
  const setItem = (id: string, patch: Partial<CatalogoItem>) =>
    set("catalogo", draft.catalogo.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeItem = (id: string) =>
    set("catalogo", draft.catalogo.filter((c) => c.id !== id));

  // Horario inválido bloquea el guardado (solo si el horario está activo).
  const horarioInvalido = draft.horario.activo && draft.horario.cierre <= draft.horario.apertura;

  const guardar = () => {
    // Defensa en profundidad: sin `settings.manage` no se persiste nada.
    if (!puedeEditar) return;
    if (horarioInvalido) return;
    // Limpia items de catálogo sin nombre antes de persistir.
    const catalogoLimpio = draft.catalogo
      .filter((c) => c.nombre.trim() !== "")
      .map((c) => ({ ...c, nombre: c.nombre.trim(), precio: Math.max(0, Number(c.precio) || 0) }));
    // Limpia alias vacíos para no guardar strings en blanco.
    const aliasEstados = Object.fromEntries(
      Object.entries(draft.aliasEstados).filter(([, v]) => (v ?? "").trim() !== ""),
    );
    const aliasModalidades = Object.fromEntries(
      Object.entries(draft.aliasModalidades).filter(([, v]) => (v ?? "").trim() !== ""),
    );
    pedidosStore.updateConfig({ ...draft, catalogo: catalogoLimpio, aliasEstados, aliasModalidades });
    setDraft((prev) => ({ ...prev, catalogo: catalogoLimpio.map((c) => ({ ...c })) }));
    setGuardado(true);
  };

  return (
    <>
      <PageMeta title="Configuración · Pedidos" description="Ajustes del módulo de pedidos" />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Configuración</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ajusta el pipeline, tiempos, nombres, horario, modalidades y el catálogo del módulo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {guardado && <span className="text-sm text-success-600 dark:text-success-500">Guardado ✓</span>}
          <Button size="sm" disabled={horarioInvalido || soloLectura} onClick={guardar}>
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* Solo lectura: se tiene `settings.read` pero no `settings.manage`.
          Se avisa arriba para que el formulario deshabilitado no parezca un
          error de la app. */}
      {soloLectura && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="mt-0.5 h-5 w-5 shrink-0 text-warning-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.5a4.5 4.5 0 10-9 0v3m-.75 0h10.5a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6.75A1.5 1.5 0 015.25 18v-6a1.5 1.5 0 011.5-1.5z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-warning-700 dark:text-warning-300">Configuración en solo lectura</p>
            <p className="mt-0.5 text-xs text-warning-600 dark:text-warning-400">
              Puedes consultar los ajustes, pero no modificarlos. {motivoSinPermiso("settings.manage")}
            </p>
          </div>
        </div>
      )}

      {/* El formulario entero es un <fieldset>: deshabilitarlo desactiva
          NATIVAMENTE todos los inputs y switches de dentro (incluido el
          checkbox oculto del Switch), sin tener que cablear `disabled` en cada
          control. `min-w-0` neutraliza el `min-inline-size` por defecto del
          fieldset, que rompería los grids internos. */}
      <fieldset disabled={soloLectura} className="m-0 min-w-0 space-y-6 border-0 p-0">
        {/* Estados del pipeline */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Estados del pipeline</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Activa o desactiva los estados opcionales. "En camino" solo aplica a pedidos a domicilio.
          </p>
          <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-white/5 dark:border-gray-800">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">Confirmado</p>
                <p className="text-xs text-gray-400">Paso de validación antes de preparar.</p>
              </div>
              <Switch checked={draft.usarConfirmado} onChange={(v) => set("usarConfirmado", v)} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">En camino</p>
                <p className="text-xs text-gray-400">Etapa de reparto para pedidos a domicilio.</p>
              </div>
              <Switch checked={draft.usarEnCamino} onChange={(v) => set("usarEnCamino", v)} />
            </div>
          </div>
        </Card>

        {/* Modalidades */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Modalidades habilitadas</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Las modalidades disponibles al crear un pedido. Debe quedar al menos una.
          </p>
          <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-white/5 dark:border-gray-800">
            {TODAS_MODALIDADES.map((m) => (
              <div key={m} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">{pedidosStore.modalidadLabel(m)}</span>
                <Switch checked={draft.modalidades.includes(m)} onChange={() => toggleModalidad(m)} />
              </div>
            ))}
          </div>
        </Card>

        {/* Umbral de urgencia */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Umbral de urgencia</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Minutos en un estado tras los cuales una tarjeta se marca como urgente en el tablero.
          </p>
          <div className="mt-4 max-w-[200px]">
            <Label htmlFor="umbral">Minutos</Label>
            <input
              id="umbral"
              type="number"
              min="1"
              value={draft.umbralUrgencia}
              onChange={(e) => set("umbralUrgencia", Math.max(1, Number(e.target.value) || 1))}
              className={`${inputBase} ${inputOk}`}
            />
          </div>
        </Card>

        {/* Alerta sonora de "requieren atención" */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Alerta sonora</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Suena una campanita de forma recurrente mientras haya clientes que requieren atención.
                Se puede silenciar desde el modal de Clientes en Inicio.
              </p>
            </div>
            <Switch
              checked={draft.alertaAtencion.activo}
              onChange={(v) => set("alertaAtencion", { ...draft.alertaAtencion, activo: v })}
            />
          </div>

          {draft.alertaAtencion.activo && (
            <div className="mt-4 max-w-[240px]">
              <Label htmlFor="alerta-cada">Repetir cada (segundos)</Label>
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
                className={`${inputBase} ${inputOk}`}
              />
              <p className="mt-1 text-xs text-gray-400">Mínimo 5 s. Por defecto 30 s.</p>
            </div>
          )}
        </Card>

        {/* Tiempos objetivo por estado (B) */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Tiempos objetivo por estado</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Minutos objetivo para cada estado. Si un pedido los supera, se marca urgente. Déjalo en 0
            para usar el umbral general ({draft.umbralUrgencia} min).
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ESTADOS_CONFIG.map(({ id, label }) => (
              <div key={id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-2.5 dark:border-gray-800">
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={draft.tiemposObjetivo[id] ?? 0}
                    onChange={(e) => setTiempoObjetivo(id, Math.max(0, Number(e.target.value) || 0))}
                    className="h-9 w-20 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
                    aria-label={`Minutos objetivo ${label}`}
                  />
                  <span className="text-xs text-gray-400">min</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Alias de estados y modalidades (C) */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Nombres personalizados</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Renombra cómo se muestran los estados y modalidades sin cambiar el flujo. Déjalo vacío para
            usar el nombre por defecto.
          </p>

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Estados</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ESTADOS_CONFIG.map(({ id, label }) => (
              <div key={id}>
                <Label htmlFor={`alias-e-${id}`}>{label}</Label>
                <Input
                  id={`alias-e-${id}`}
                  placeholder={label}
                  value={draft.aliasEstados[id] ?? ""}
                  onChange={(e) => setAliasEstado(id, e.target.value)}
                />
              </div>
            ))}
          </div>

          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">Modalidades</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TODAS_MODALIDADES.map((m) => {
              const def = { retiro: "Retiro", domicilio: "Domicilio", en_sitio: "En sitio" }[m];
              return (
                <div key={m}>
                  <Label htmlFor={`alias-m-${m}`}>{def}</Label>
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
        </Card>

        {/* Horario de atención (A) */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Horario de atención</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Días y horas en que el negocio recibe pedidos. Fuera de horario se puede sugerir programar el pedido.
              </p>
            </div>
            <Switch checked={draft.horario.activo} onChange={(v) => setHorario("activo", v)} />
          </div>

          {draft.horario.activo && (
            <div className="mt-4 space-y-4">
              {/* Días */}
              <div>
                <Label htmlFor="horario-dias">Días laborales</Label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map(({ d, label }) => {
                    const activo = draft.horario.dias.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDia(d)}
                        className={
                          "h-10 w-12 rounded-lg border text-sm font-medium transition-colors " +
                          (activo
                            ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                            : "border-gray-300 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400")
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horas */}
              <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
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

              {draft.horario.cierre <= draft.horario.apertura && (
                <p className="text-xs text-error-500">La hora de cierre debe ser mayor que la de apertura.</p>
              )}
            </div>
          )}
        </Card>

        {/* Plantillas de WhatsApp (solo referencia) */}
        <Card>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Plantillas de WhatsApp</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Solo referencia
            </span>
          </div>
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="mt-0.5 h-4 w-4 shrink-0 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Textos de referencia para el equipo. En este mock <strong>no se envía nada</strong>; sirven
              como guion sugerido del mensaje en cada transición.
            </p>
          </div>
          {/* Las plantillas son contenido de CANAL (`channels.manage`), no un
              ajuste del módulo (`settings.manage`). Se deshabilitan con su
              propio fieldset, independiente del resto del formulario. */}
          <fieldset disabled={!puedePlantillas} className="m-0 min-w-0 border-0 p-0">
            <div className="mt-4 space-y-4">
              {PLANTILLA_META.map(({ key, label }) => (
                <div key={key}>
                  <Label htmlFor={`pl-${key}`}>{label}</Label>
                  <textarea
                    id={`pl-${key}`}
                    rows={2}
                    value={draft.plantillas[key]}
                    onChange={(e) => setPlantilla(key, e.target.value)}
                    className={`${inputBase} h-auto ${inputOk}`}
                  />
                </div>
              ))}
            </div>
          </fieldset>
          {!puedePlantillas && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {motivoSinPermiso("channels.manage")}
            </p>
          )}
        </Card>

        {/* Catálogo simple */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Catálogo simple (opcional)</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Items con precio para autocompletar en "Crear pedido". Déjalo vacío para escribir items libres.
              </p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              + Añadir item
            </button>
          </div>

          {draft.catalogo.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400 dark:border-gray-800">
              Sin catálogo. Los items se escriben libremente al crear un pedido.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {draft.catalogo.map((c) => (
                <div key={c.id} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Nombre del item"
                      value={c.nombre}
                      onChange={(e) => setItem(c.id, { nombre: e.target.value })}
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      value={c.precio}
                      onChange={(e) => setItem(c.id, { precio: Math.max(0, Number(e.target.value) || 0) })}
                      className={`${inputBase} ${inputOk}`}
                      aria-label="Precio"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(c.id)}
                    className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                    aria-label="Quitar item"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </fieldset>

      {/* Guardar (footer) */}
      <div className="mt-6 flex items-center justify-end gap-3">
        {guardado && <span className="text-sm text-success-600 dark:text-success-500">Guardado ✓</span>}
        <Button disabled={horarioInvalido || soloLectura} onClick={guardar}>Guardar cambios</Button>
      </div>
      {soloLectura && (
        <p className="mt-2 text-right text-xs text-gray-500 dark:text-gray-400">
          {motivoSinPermiso("settings.manage")}
        </p>
      )}
    </>
  );
});

export default ConfigPage;
