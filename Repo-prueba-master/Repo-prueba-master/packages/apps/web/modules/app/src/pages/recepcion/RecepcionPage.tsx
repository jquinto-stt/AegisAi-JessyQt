import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { Button } from "@/elements/ui/button";
import { queuesStore, type CustomField } from "@/stores";

interface CreatedInfo {
  numero: string;
  cliente: string;
  colaNombre: string;
}

const inputBase =
  "h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:text-white/90 dark:placeholder:text-white/30";
const inputOk = "border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700";
const inputErr = "border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:border-error-500";

const RequiredMark = () => <span className="text-error-500">*</span>;

export const RecepcionPage = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queues = queuesStore.queues.filter((q) => q.activa);
  const initialCola = searchParams.get("cola") || queues[0]?.id || "";

  const [colaId, setColaId] = useState<string>(initialCola);
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [datos, setDatos] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<CreatedInfo | null>(null);

  const queue = queuesStore.getQueue(colaId);
  const campos: CustomField[] = queue?.campos ?? [];

  const contexto = useMemo(() => {
    if (!queue) return null;
    return {
      esperando: queue.waiting.length,
      estimado: queue.waiting.length * queue.tiempoProm,
      tiempoProm: queue.tiempoProm,
    };
  }, [queue]);

  const resetForm = () => {
    setCliente("");
    setTelefono("");
    setDatos({});
    setErrors({});
  };

  const setDato = (id: string, value: string) => setDatos((d) => ({ ...d, [id]: value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!colaId) e.cola = "Elige una cola";
    if (!cliente.trim()) e.cliente = "El nombre es obligatorio";
    const phone = telefono.replace(/[^\d+]/g, "");
    if (!telefono.trim()) e.telefono = "El teléfono es obligatorio";
    else if (phone.length < 7) e.telefono = "Teléfono no válido";
    for (const f of campos) {
      if (f.required && !String(datos[f.id] ?? "").trim()) {
        e[`campo_${f.id}`] = `"${f.label}" es obligatorio`;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!queue || !validate()) return;
    // Provisional number for the confirmation (backend assigns the real one on refresh).
    const provisional = `${queue.nombre.charAt(0).toUpperCase()}-${String(
      queue.waiting.length + queue.serving.length + queue.done.length + 1,
    ).padStart(3, "0")}`;
    queuesStore.createTicket(queue.id, {
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      datos: campos.length ? datos : undefined,
    });
    setCreated({ numero: provisional, cliente: cliente.trim(), colaNombre: queue.nombre });
    resetForm();
  };

  // ── Confirmation state (replaces the form) ──
  if (created) {
    return (
      <>
        <PageMeta title="Turno creado" description="Turno creado con éxito" />
        <div className="mx-auto max-w-lg">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            {/* success header */}
            <div className="flex flex-col items-center gap-3 bg-success-50 px-8 py-8 text-center dark:bg-success-500/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-500 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-success-700 dark:text-success-300">Turno creado con éxito</p>
            </div>

            {/* ticket body */}
            <div className="px-8 py-8 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-400">Número de turno</p>
              <p className="mt-1 text-5xl font-bold text-gray-800 dark:text-white/90">{created.numero}</p>

              <div className="mx-auto mt-6 max-w-xs space-y-2 text-sm">
                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2 dark:border-gray-700">
                  <span className="text-gray-500">Cliente</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{created.cliente}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cola</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{created.colaNombre}</span>
                </div>
              </div>

              <div className="mt-6 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-left dark:bg-brand-500/10">
                <svg viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-brand-500">
                  <path d="M12 2a10 10 0 00-8.66 15l-1.3 3.9a.75.75 0 00.95.95l3.9-1.3A10 10 0 1012 2z" />
                </svg>
                <p className="text-xs text-brand-700 dark:text-brand-300">
                  Le avisaremos por WhatsApp cuando sea su turno.
                </p>
              </div>
            </div>

            {/* actions */}
            <div className="flex gap-3 border-t border-gray-200 px-8 py-5 dark:border-gray-800">
              <Button className="flex-1" onClick={() => setCreated(null)}>Crear otro turno</Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate(`/turnos?cola=${colaId}`)}>
                Ver la cola
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Form state ──
  return (
    <>
      <PageMeta title="Crear turno" description="Registra un turno para un cliente" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Crear turno</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Registra un turno manualmente. El cliente recibirá los avisos por WhatsApp.
        </p>
      </div>

      {queues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">No hay colas activas</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Crea o activa una cola para poder registrar turnos.</p>
          <Button size="sm" className="mt-5" onClick={() => navigate("/colas")}>Ir a Colas</Button>
        </div>
      ) : (
        <>
        {/* Dashboard de colas — elegir dónde crear el turno */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              ¿En qué cola creas el turno? <RequiredMark />
            </p>
            {errors.cola && <p className="text-xs text-error-500">{errors.cola}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {queues.map((q) => {
              const active = q.id === colaId;
              const sat = queuesStore.saturationOf(q);
              const satColor = sat === "full" ? "text-error-500" : sat === "busy" ? "text-warning-500" : "text-success-600";
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => { setColaId(q.id); setDatos({}); setErrors({}); }}
                  className={
                    "flex flex-col gap-2 rounded-2xl border p-4 text-left transition-all " +
                    (active
                      ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-500/10"
                      : "border-gray-200 bg-white hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-800 dark:bg-gray-900")
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${q.color}`} />
                    <span className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">{q.nombre}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${satColor}`}>
                      {q.waiting.length} en espera
                    </span>
                    {active && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3 w-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="space-y-5">
                {/* Cliente */}
                <div>
                  <Label htmlFor="cliente">Nombre del cliente <RequiredMark /></Label>
                  <Input
                    id="cliente"
                    placeholder="Ej: Juan Carlos"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    error={!!errors.cliente}
                    hint={errors.cliente}
                  />
                </div>

                {/* Teléfono (obligatorio) */}
                <div>
                  <Label htmlFor="telefono">Teléfono (WhatsApp) <RequiredMark /></Label>
                  <Input
                    id="telefono"
                    type="text"
                    placeholder="Ej: +57 300 123 4567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    error={!!errors.telefono}
                    hint={errors.telefono}
                  />
                </div>

                {/* Campos dinámicos de la cola */}
                <div className="border-t border-gray-100 pt-5 dark:border-gray-800">
                  {!queue ? (
                    <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400 dark:border-gray-700">
                      Elige una cola para ver sus campos.
                    </p>
                  ) : campos.length === 0 ? (
                    <p className="text-xs text-gray-400">Esta cola no pide datos adicionales.</p>
                  ) : (
                    <div className="space-y-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Datos para {queue.nombre}
                      </p>
                      {campos.map((f) => {
                        const err = errors[`campo_${f.id}`];
                        const val = datos[f.id] ?? "";
                        return (
                          <div key={f.id}>
                            <Label htmlFor={`campo_${f.id}`}>
                              {f.label} {f.required && <RequiredMark />}
                            </Label>
                            {f.type === "textarea" ? (
                              <textarea
                                id={`campo_${f.id}`}
                                rows={3}
                                value={val}
                                onChange={(e) => setDato(f.id, e.target.value)}
                                className={`${inputBase} h-auto ${err ? inputErr : inputOk}`}
                              />
                            ) : f.type === "select" ? (
                              <Select
                                options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
                                defaultValue={val}
                                placeholder="Elige una opción"
                                onChange={(v) => setDato(f.id, v)}
                              />
                            ) : (
                              <Input
                                id={`campo_${f.id}`}
                                type={f.type === "number" ? "number" : "text"}
                                value={val}
                                onChange={(e) => setDato(f.id, e.target.value)}
                                error={!!err}
                                hint={err}
                              />
                            )}
                            {err && f.type !== "text" && f.type !== "number" && (
                              <p className="mt-1.5 text-xs text-error-500">{err}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button size="md" onClick={handleCreate}>Crear turno</Button>
              </div>
            </div>
          </div>

          {/* Contexto de la cola */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className={`h-3 w-3 rounded-full ${queue?.color ?? "bg-gray-300"}`} />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {queue ? queue.nombre : "Sin cola"}
                </h3>
              </div>
              {contexto ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-400">Personas en espera</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{contexto.esperando}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-400">Espera estimada</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                      ~{contexto.estimado} <span className="text-sm font-normal text-gray-500">min</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{contexto.tiempoProm} min por turno</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Elige una cola para ver su estado.</p>
              )}
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
});

export default RecepcionPage;
