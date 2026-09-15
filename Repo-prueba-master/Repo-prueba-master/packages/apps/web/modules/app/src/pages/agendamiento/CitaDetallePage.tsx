import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { agendaStore } from "@/stores";

export const CitaDetallePage = observer(() => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const cita = agendaStore.getCita(id);

  const [reagOpen, setReagOpen] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");

  if (!cita) {
    return (
      <>
        <PageMeta title="Detalle de cita" description="Detalle del agendamiento" />
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Cita no encontrada</h3>
          <Link to="/agendamiento" className="mt-4 inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Volver a la agenda</Link>
        </div>
      </>
    );
  }

  const prof = agendaStore.getProfesional(cita.profesionalId);
  const cliente = agendaStore.getCliente(cita.clienteId);
  const fechaLegible = new Date(cita.fecha + "T00:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });

  const contactar = () => {
    const msg = encodeURIComponent(`Hola ${cita.cliente}, sobre tu cita de ${cita.servicio}...`);
    window.open(`https://wa.me/${cita.telefono.replace(/[^\d]/g, "")}?text=${msg}`, "_blank");
  };

  const doReagendar = () => {
    if (!nuevaFecha || !nuevaHora) return;
    agendaStore.reagendar(cita.id, nuevaFecha, nuevaHora);
    setReagOpen(false);
  };

  return (
    <>
      <PageMeta title="Detalle de cita" description="Detalle del agendamiento" />

      <div className="mb-4">
        <Link to="/agendamiento" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Volver a la agenda
        </Link>
      </div>

      {/* Encabezado */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${agendaStore.estadoTint(cita.estado)}`}>
              {agendaStore.estadoLabel(cita.estado)}
            </span>
            <h1 className="mt-2 text-2xl font-bold capitalize text-gray-800 dark:text-white/90">{fechaLegible}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{cita.hora} · {cita.duracion} min · {cita.modalidad === "virtual" ? "Virtual" : "Presencial"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cliente + detalles */}
        <div className="space-y-6 lg:col-span-2">
          {/* Cliente */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Cliente</h3>
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{cita.cliente}</p>
            <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
              <p>{cita.telefono}</p>
              {cliente?.email && <p>{cliente.email}</p>}
            </div>
            {cliente && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/50">
                  <p className="text-xl font-bold text-gray-800 dark:text-white/90">{cliente.totalCitas}</p>
                  <p className="text-xs text-gray-400">Citas</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/50">
                  <p className="text-xl font-bold text-success-600">{cliente.completadas}</p>
                  <p className="text-xs text-gray-400">Completadas</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/50">
                  <p className="text-xl font-bold text-error-500">{cliente.noShows}</p>
                  <p className="text-xs text-gray-400">No asistió</p>
                </div>
              </div>
            )}
          </div>

          {/* Detalles de la cita */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Detalles</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Servicio</dt><dd className="font-medium text-gray-800 dark:text-white/90">{cita.servicio}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Duración</dt><dd className="font-medium text-gray-800 dark:text-white/90">{cita.duracion} min</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Modalidad</dt><dd className="font-medium capitalize text-gray-800 dark:text-white/90">{cita.modalidad}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Origen</dt><dd className="font-medium text-gray-800 dark:text-white/90">{cita.origen === "whatsapp" ? "WhatsApp" : "Operador"}</dd></div>
            </dl>

            {cita.modalidad === "virtual" && cita.enlace && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-50 p-3 dark:bg-brand-500/10">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-brand-700 dark:text-brand-300">Videollamada</p>
                  <p className="truncate text-xs text-brand-600/70 dark:text-brand-400/70">{cita.enlace}</p>
                </div>
                <a href={cita.enlace} target="_blank" rel="noreferrer" className="ml-3 shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">Unirse</a>
              </div>
            )}

            {cita.notas && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-medium text-gray-400">Notas</p>
                <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">{cita.notas}</p>
              </div>
            )}
          </div>
        </div>

        {/* Profesional + acciones */}
        <div className="space-y-6">
          {prof && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Profesional</h3>
              <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ${prof.color}`}>{prof.avatar}</span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white/90">{prof.nombre}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{prof.especialidad}</p>
                </div>
              </div>
            </div>
          )}

          {/* Acciones de admin */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Acciones</h3>
            <div className="flex flex-col gap-2">
              {cita.estado === "pendiente" && (
                <Button size="sm" onClick={() => agendaStore.confirmar(cita.id)}>Confirmar cita</Button>
              )}
              {(cita.estado === "pendiente" || cita.estado === "confirmada") && (
                <Button size="sm" variant="outline" onClick={() => agendaStore.completar(cita.id)}>Marcar completada</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => { setNuevaFecha(cita.fecha); setNuevaHora(cita.hora); setReagOpen(true); }}>Reagendar</Button>
              <Button size="sm" variant="outline" onClick={contactar}>Contactar por WhatsApp</Button>
              {cita.estado !== "cancelada" && cita.estado !== "completada" && (
                <Button size="sm" variant="destructive" onClick={() => agendaStore.cancelar(cita.id)}>Cancelar cita</Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reagendar modal */}
      <Modal isOpen={reagOpen} onClose={() => setReagOpen(false)} className="max-w-[440px] p-6">
        <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Reagendar cita</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="reag-fecha">Nueva fecha</Label>
            <Input id="reag-fecha" type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="reag-hora">Nueva hora</Label>
            <Input id="reag-hora" type="time" value={nuevaHora} onChange={(e) => setNuevaHora(e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setReagOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={doReagendar}>Reagendar</Button>
        </div>
      </Modal>
    </>
  );
});

export default CitaDetallePage;
