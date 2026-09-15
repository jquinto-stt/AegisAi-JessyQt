import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { DatePicker } from "@/elements/form/date-picker";
import { agendaStore, todayIso, type Modalidad, type Cita } from "@/stores";

const RequiredMark = () => <span className="text-error-500">*</span>;

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-brand-500">
    <path d="M12 2a10 10 0 00-8.66 15l-1.3 3.9a.75.75 0 00.95.95l3.9-1.3A10 10 0 1012 2z" />
  </svg>
);

export const CrearCitaPage = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preProf = searchParams.get("prof");

  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [profesionalId, setProfesionalId] = useState(
    (preProf && agendaStore.getProfesional(preProf) ? preProf : agendaStore.profesionales[0]?.id) ?? "",
  );
  const [servicio, setServicio] = useState("");
  const [fecha, setFecha] = useState(todayIso());
  const [hora, setHora] = useState("09:00");
  const [modalidad, setModalidad] = useState<Modalidad>("presencial");
  const [notas, setNotas] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<Cita | null>(null);

  const profOptions = agendaStore.profesionales.map((p) => ({ value: p.id, label: `${p.nombre} — ${p.especialidad}` }));
  const profSel = agendaStore.getProfesional(profesionalId);

  const resetForm = () => {
    setCliente(""); setTelefono(""); setServicio(""); setFecha(todayIso());
    setHora("09:00"); setModalidad("presencial"); setNotas(""); setErrors({});
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!cliente.trim()) e.cliente = "El nombre es obligatorio";
    const phone = telefono.replace(/[^\d+]/g, "");
    if (!telefono.trim()) e.telefono = "El teléfono es obligatorio";
    else if (phone.length < 7) e.telefono = "Teléfono no válido";
    if (!servicio.trim()) e.servicio = "El servicio es obligatorio";
    if (!fecha) e.fecha = "Elige una fecha";
    if (!hora) e.hora = "Elige una hora";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    const cita = agendaStore.crearCita({ cliente: cliente.trim(), telefono: telefono.trim(), profesionalId, servicio: servicio.trim(), fecha, hora, modalidad, notas: notas.trim() || undefined });
    setCreated(cita);
    resetForm();
  };

  // ── Confirmación ──
  if (created) {
    const prof = agendaStore.getProfesional(created.profesionalId);
    const fechaLegible = new Date(created.fecha + "T00:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
    return (
      <>
        <PageMeta title="Cita agendada" description="Cita creada" />
        <div className="mx-auto max-w-lg">
          <Card className="p-0 sm:p-0 overflow-hidden">
            <div className="flex flex-col items-center gap-3 bg-success-50 px-8 py-8 text-center dark:bg-success-500/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-500 text-white">
                <CheckIcon />
              </div>
              <p className="text-sm font-medium text-success-700 dark:text-success-300">Cita agendada con éxito</p>
            </div>
            <div className="px-8 py-8">
              <p className="text-center text-lg font-semibold capitalize text-gray-800 dark:text-white/90">{fechaLegible}</p>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">{created.hora} · {created.modalidad === "virtual" ? "Virtual" : "Presencial"}</p>
              <div className="mx-auto mt-6 max-w-xs space-y-2 text-sm">
                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2 dark:border-gray-700"><span className="text-gray-500">Cliente</span><span className="font-medium text-gray-800 dark:text-white/90">{created.cliente}</span></div>
                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2 dark:border-gray-700"><span className="text-gray-500">Profesional</span><span className="font-medium text-gray-800 dark:text-white/90">{prof?.nombre}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Servicio</span><span className="font-medium text-gray-800 dark:text-white/90">{created.servicio}</span></div>
              </div>
              <div className="mt-6 flex items-start gap-2 rounded-xl bg-brand-50 p-3 dark:bg-brand-500/10">
                <WhatsAppIcon />
                <p className="text-xs text-brand-700 dark:text-brand-300">Se le enviará la confirmación al cliente por WhatsApp.</p>
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-200 px-8 py-5 dark:border-gray-800">
              <Button className="flex-1" onClick={() => setCreated(null)}>Agendar otra</Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/agendamiento")}>Ver la agenda</Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  // ── Formulario ──
  return (
    <>
      <PageMeta title="Agendar cita" description="Crea una cita manualmente" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Agendar cita</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Registra una cita. El cliente recibirá la confirmación por WhatsApp.</p>
      </div>

      <div className="mx-auto max-w-2xl">
        <Card>
          <div className="space-y-5">
            {/* Profesional al que pertenece la cita */}
            <div>
              <Label htmlFor="prof">Profesional <RequiredMark /></Label>
              <Select defaultValue={profesionalId} onChange={setProfesionalId} options={profOptions} />
              {profSel && (
                <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${profSel.color}`}>{profSel.avatar}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profSel.nombre}</p>
                    <p className="text-xs text-gray-400">{profSel.especialidad}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="cliente">Nombre del cliente <RequiredMark /></Label>
                <Input id="cliente" placeholder="Ej: Carlos Mendoza" value={cliente} onChange={(e) => setCliente(e.target.value)} error={!!errors.cliente} hint={errors.cliente} />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono (WhatsApp) <RequiredMark /></Label>
                <Input id="telefono" placeholder="Ej: +57 300 123 4567" value={telefono} onChange={(e) => setTelefono(e.target.value)} error={!!errors.telefono} hint={errors.telefono} />
              </div>
            </div>

            <div>
              <Label htmlFor="servicio">Servicio <RequiredMark /></Label>
              <Input id="servicio" placeholder="Ej: Terapia individual" value={servicio} onChange={(e) => setServicio(e.target.value)} error={!!errors.servicio} hint={errors.servicio} />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="fecha">Fecha <RequiredMark /></Label>
                <DatePicker
                  id="fecha"
                  defaultDate={fecha}
                  placeholder="Elige una fecha"
                  error={!!errors.fecha}
                  hint={errors.fecha}
                  onChange={(_dates, dateStr) => setFecha(dateStr)}
                />
              </div>
              <div>
                <Label htmlFor="hora">Hora <RequiredMark /></Label>
                <Input id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} error={!!errors.hora} hint={errors.hora} />
              </div>
            </div>

            {/* Modalidad */}
            <div>
              <Label htmlFor="modalidad">Modalidad</Label>
              <div className="flex gap-3">
                {(["presencial", "virtual"] as Modalidad[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModalidad(m)}
                    className={
                      "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition-colors " +
                      (modalidad === m
                        ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                        : "border-gray-300 text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300")
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notas">Notas <span className="font-normal text-gray-400">(opcional)</span></Label>
              <textarea
                id="notas"
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Información adicional para el profesional..."
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" size="md" onClick={() => navigate("/agendamiento")}>Cancelar</Button>
            <Button size="md" onClick={handleCreate}>Agendar cita</Button>
          </div>
        </Card>
      </div>
    </>
  );
});

export default CrearCitaPage;
