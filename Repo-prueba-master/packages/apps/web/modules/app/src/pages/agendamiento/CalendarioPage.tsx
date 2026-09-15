import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { agendaStore, sessionStore, todayIso, type Modalidad } from "@/stores";

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const RequiredMark = () => <span className="text-error-500">*</span>;

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const DIA_OPTS = [
  { d: 1, label: "Lun" }, { d: 2, label: "Mar" }, { d: 3, label: "Mié" },
  { d: 4, label: "Jue" }, { d: 5, label: "Vie" }, { d: 6, label: "Sáb" }, { d: 0, label: "Dom" },
];
const HORA_OPTS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }));

export const CalendarioPage = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string>(todayIso());

  // Profesionales visibles (en simulación de operador, solo los suyos).
  const profesionalesVisibles = agendaStore.profesionales.filter((p) => sessionStore.puedeVerProfesional(p.id));
  // Profesional actual: del ?prof= si es visible, si no el primero visible.
  const profParam = searchParams.get("prof");
  const profId =
    (profParam && sessionStore.puedeVerProfesional(profParam) ? profParam : "") ||
    profesionalesVisibles[0]?.id ||
    "";
  const prof = agendaStore.getProfesional(profId);

  // Nueva cita (desde un slot libre) — el profesional lo fija el calendario actual
  const [crearOpen, setCrearOpen] = useState(false);
  const [slotHora, setSlotHora] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [servicio, setServicio] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("presencial");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Config del calendario
  const [configOpen, setConfigOpen] = useState(false);
  const [cfgDias, setCfgDias] = useState<number[]>(agendaStore.calendarConfig.diasLaborales);
  const [cfgInicio, setCfgInicio] = useState(String(agendaStore.calendarConfig.horaInicio));
  const [cfgFin, setCfgFin] = useState(String(agendaStore.calendarConfig.horaFin));
  const [cfgSlot, setCfgSlot] = useState(String(agendaStore.calendarConfig.duracionSlot));

  const openConfig = () => {
    setCfgDias([...agendaStore.calendarConfig.diasLaborales]);
    setCfgInicio(String(agendaStore.calendarConfig.horaInicio));
    setCfgFin(String(agendaStore.calendarConfig.horaFin));
    setCfgSlot(String(agendaStore.calendarConfig.duracionSlot));
    setConfigOpen(true);
  };
  const toggleDia = (d: number) => setCfgDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  const guardarConfig = () => {
    agendaStore.updateCalendarConfig({
      diasLaborales: cfgDias,
      horaInicio: Number(cfgInicio),
      horaFin: Number(cfgFin),
      duracionSlot: Number(cfgSlot),
    });
    setConfigOpen(false);
  };

  // ── Month grid (Mon-first) ──
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(todayIso()); };

  const citasDia = agendaStore.citasDelDia(selected, profId);
  const slots = agendaStore.horariosDisponibles(selected, profId);
  const selectedLegible = new Date(selected + "T00:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });

  const openCrear = (hora: string) => {
    setSlotHora(hora);
    setCliente(""); setTelefono(""); setServicio(""); setModalidad("presencial");
    setErrors({});
    setCrearOpen(true);
  };

  const guardarCita = () => {
    const e: Record<string, string> = {};
    if (!cliente.trim()) e.cliente = "Nombre obligatorio";
    if (telefono.replace(/[^\d+]/g, "").length < 7) e.telefono = "Teléfono obligatorio";
    if (!servicio.trim()) e.servicio = "Servicio obligatorio";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    agendaStore.crearCita({ cliente: cliente.trim(), telefono: telefono.trim(), profesionalId: profId, servicio: servicio.trim(), fecha: selected, hora: slotHora, modalidad });
    setCrearOpen(false);
  };

  if (!prof) {
    return (
      <>
        <PageMeta title="Calendario" description="Vista mensual de citas" />
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">No hay profesionales</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Crea un profesional para ver su calendario de citas.</p>
          <Button size="sm" className="mt-5" onClick={() => navigate("/agendamiento/profesionales")}>Ir a Profesionales</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title={`Calendario de ${prof.nombre}`} description="Vista mensual de citas del profesional" />

      {/* Volver a profesionales */}
      <div className="mb-4">
        <Link to="/agendamiento/profesionales" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Todos los profesionales
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${prof.color}`}>{prof.avatar}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Calendario</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{prof.nombre} · {prof.especialidad}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:w-56">
            <Select defaultValue={profId} onChange={(v) => navigate(`/agendamiento/calendario?prof=${v}`)} options={profesionalesVisibles.map((p) => ({ value: p.id, label: p.nombre }))} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={goToday}>Hoy</Button>
            <Button size="sm" variant="outline" startIcon={<GearIcon />} onClick={openConfig}>Configurar</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendario */}
        <div className="lg:col-span-2">
          <Card>
            {/* Nav de mes */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{MESES[month]} {year}</h2>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" aria-label="Mes anterior" onClick={prevMonth}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </Button>
                <Button size="icon" variant="outline" aria-label="Mes siguiente" onClick={nextMonth}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </Button>
              </div>
            </div>

            {/* Encabezados de día */}
            <div className="grid grid-cols-7 gap-1">
              {DIAS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-semibold uppercase text-gray-400">{d}</div>
              ))}
            </div>

            {/* Celdas */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const iso = isoOf(year, month, d);
                const count = agendaStore.countByDay(iso, profId);
                const isToday = iso === todayIso();
                const isSelected = iso === selected;
                const laboral = agendaStore.esDiaLaboral(iso);
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(iso)}
                    className={
                      "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-sm transition-colors " +
                      (isSelected
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                        : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50") +
                      (!laboral ? " opacity-40" : "")
                    }
                  >
                    <span className={
                      "flex h-7 w-7 items-center justify-center rounded-full " +
                      (isToday ? "bg-brand-500 font-semibold text-white" : "text-gray-700 dark:text-gray-200")
                    }>
                      {d}
                    </span>
                    {count > 0 && (
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: Math.min(count, 3) }).map((_, k) => (
                          <span key={k} className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Panel del día */}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="text-sm font-semibold capitalize text-gray-800 dark:text-white/90">{selectedLegible}</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              {citasDia.length} {citasDia.length === 1 ? "cita" : "citas"} · {slots.length} horarios libres
            </p>

            {/* Citas del día */}
            <div className="mt-4 space-y-2">
              {citasDia.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400 dark:border-gray-700">
                  Sin citas este día
                </p>
              ) : (
                citasDia.map((c) => {
                  const prof = agendaStore.getProfesional(c.profesionalId);
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/agendamiento/detalles?id=${c.id}`)}
                      className="cursor-pointer rounded-xl border border-gray-200 p-3 transition-colors hover:border-brand-300 dark:border-gray-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{c.hora}</span>
                        <Badge size="xs" color={agendaStore.estadoBadgeColor(c.estado)}>{agendaStore.estadoLabel(c.estado)}</Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-gray-700 dark:text-gray-200">{c.cliente}</p>
                      <p className="truncate text-xs text-gray-400">{c.servicio}{prof ? ` · ${prof.nombre}` : ""}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Horarios disponibles */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Horarios disponibles</p>
              {slots.length === 0 ? (
                <p className="text-xs text-gray-400">No quedan horarios libres.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((h) => (
                    <button
                      key={h}
                      onClick={() => openCrear(h)}
                      className="rounded-lg border border-gray-200 py-2 text-sm text-gray-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-brand-500/10"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal crear cita en el slot */}
      <Modal isOpen={crearOpen} onClose={() => setCrearOpen(false)} className="max-w-[480px] p-6">
        <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Agendar cita</h4>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400 capitalize">{selectedLegible} · {slotHora}</p>

        {/* Profesional del calendario (fijo) */}
        <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${prof.color}`}>{prof.avatar}</span>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{prof.nombre}</p>
            <p className="text-xs text-gray-400">{prof.especialidad}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="cal-cliente">Cliente <RequiredMark /></Label>
            <Input id="cal-cliente" placeholder="Nombre del cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} error={!!errors.cliente} hint={errors.cliente} />
          </div>
          <div>
            <Label htmlFor="cal-tel">Teléfono (WhatsApp) <RequiredMark /></Label>
            <Input id="cal-tel" placeholder="+57 300 123 4567" value={telefono} onChange={(e) => setTelefono(e.target.value)} error={!!errors.telefono} hint={errors.telefono} />
          </div>
          <div>
            <Label htmlFor="cal-serv">Servicio <RequiredMark /></Label>
            <Input id="cal-serv" placeholder="Ej: Terapia individual" value={servicio} onChange={(e) => setServicio(e.target.value)} error={!!errors.servicio} hint={errors.servicio} />
          </div>
          <div>
            <Label htmlFor="cal-mod">Modalidad</Label>
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
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setCrearOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={guardarCita}>Agendar</Button>
        </div>
      </Modal>

      {/* Modal configuración del calendario */}
      <Modal isOpen={configOpen} onClose={() => setConfigOpen(false)} className="max-w-[480px] p-6">
        <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Configurar calendario</h4>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">Define tus días laborales y tu horario disponible.</p>
        <div className="space-y-5">
          {/* Días laborales */}
          <div>
            <Label htmlFor="cfg-dias">Días que trabajas</Label>
            <div className="flex flex-wrap gap-2">
              {DIA_OPTS.map(({ d, label }) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDia(d)}
                  className={
                    "h-10 w-12 rounded-lg border text-sm font-medium transition-colors " +
                    (cfgDias.includes(d)
                      ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                      : "border-gray-300 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Horario */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cfg-inicio">Hora de inicio</Label>
              <Select defaultValue={cfgInicio} onChange={setCfgInicio} options={HORA_OPTS} />
            </div>
            <div>
              <Label htmlFor="cfg-fin">Hora de fin</Label>
              <Select defaultValue={cfgFin} onChange={setCfgFin} options={HORA_OPTS} />
            </div>
          </div>

          {/* Duración de cada turno */}
          <div>
            <Label htmlFor="cfg-slot">Duración de cada espacio</Label>
            <Select
              defaultValue={cfgSlot}
              onChange={setCfgSlot}
              options={[{ value: "30", label: "30 minutos" }, { value: "60", label: "1 hora" }]}
            />
          </div>

          {Number(cfgFin) <= Number(cfgInicio) && (
            <p className="text-xs text-error-500">La hora de fin debe ser mayor que la de inicio.</p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
          <Button size="sm" disabled={Number(cfgFin) <= Number(cfgInicio) || cfgDias.length === 0} onClick={guardarConfig}>Guardar</Button>
        </div>
      </Modal>
    </>
  );
});

export default CalendarioPage;
