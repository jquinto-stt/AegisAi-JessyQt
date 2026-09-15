import type { ApexOptions } from "apexcharts";
import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card, CardTitle } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Alert } from "@/elements/ui/alert";
import { Modal } from "@/elements/ui/modal";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { LineChart } from "@/elements/ui/line-chart";
import { PieChart } from "@/elements/ui/pie-chart";
import { MetricCard } from "@/compositions/metric-card";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { GroupIcon, UserCircleIcon, TimeIcon, CalenderIcon } from "@/icons";
import { agendaStore, type ClienteFidelidad, type Tier, type LoyaltyConfig } from "@/stores";

const ORANGE = "#FF3F1A";
const INDIGO = "#190088";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M12 2a10 10 0 00-8.66 15l-1.3 3.9a.75.75 0 00.95.95l3.9-1.3A10 10 0 1012 2z" />
  </svg>
);
const GiftIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18.75a.75.75 0 00.75-.75V9a.75.75 0 00-.75-.75H3.375A.75.75 0 002.625 9v1.5c0 .414.336.75.75.75z" />
  </svg>
);

const contactar = (cf: ClienteFidelidad, texto: string) => {
  window.open(`https://wa.me/${cf.cliente.telefono.replace(/[^\d]/g, "")}?text=${encodeURIComponent(texto)}`, "_blank");
};

const TierPill = ({ tier }: { tier: Tier }) => (
  <Badge size="sm" color={agendaStore.tierBadgeColor(tier)}>{agendaStore.tierLabel(tier)}</Badge>
);

export const AnaliticaPage = observer(() => {
  const tendencia = agendaStore.tendenciaSemanal;
  const modalidad = agendaStore.modalidadSplit;
  const ocupacion = agendaStore.ocupacionPorProfesional;
  const topServicios = agendaStore.topServicios;
  const maxOcup = Math.max(1, ...ocupacion.map((o) => o.citas));

  const tiers = agendaStore.conteoPorTier;
  const recompensas = agendaStore.clientesConRecompensa;
  const enRiesgo = agendaStore.clientesEnRiesgo;
  const fidelidad = [...agendaStore.fidelidad].sort((a, b) => b.cliente.completadas - a.cliente.completadas);
  const cfg = agendaStore.loyaltyConfig;

  // ── Configuración del programa de fidelidad ──
  const [configOpen, setConfigOpen] = useState(false);
  const [form, setForm] = useState<LoyaltyConfig>(cfg);
  const openConfig = () => { setForm({ ...agendaStore.loyaltyConfig }); setConfigOpen(true); };
  const setField = <K extends keyof LoyaltyConfig>(k: K, v: LoyaltyConfig[K]) => setForm((f) => ({ ...f, [k]: v }));
  const guardarConfig = () => { agendaStore.updateLoyaltyConfig(form); setConfigOpen(false); };
  const formValido = form.oroMin > form.plataMin && form.plataMin >= 1;

  // ── Citas por semana (área con degradado) ──
  const tendenciaOptions: ApexOptions = {
    colors: [ORANGE],
    chart: { fontFamily: "DM Sans, sans-serif", toolbar: { show: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    dataLabels: { enabled: false },
    markers: { size: 4, colors: ["#fff"], strokeColors: ORANGE, strokeWidth: 2 },
    xaxis: { categories: tendencia.map((t) => t.semana), axisBorder: { show: false }, axisTicks: { show: false } },
    grid: { yaxis: { lines: { show: true } } },
    legend: { show: false },
  };
  const tendenciaSeries = [{ name: "Citas", data: tendencia.map((t) => t.citas) }];

  // ── Modalidad (donut) ──
  const modalidadOptions: ApexOptions = {
    colors: [ORANGE, INDIGO],
    chart: { fontFamily: "DM Sans, sans-serif" },
    labels: ["Presencial", "Virtual"],
    legend: { position: "bottom" },
    dataLabels: { enabled: true },
    stroke: { width: 0 },
    plotOptions: { pie: { donut: { size: "65%" } } },
  };
  const modalidadSeries = [modalidad.presencial, modalidad.virtual];

  const tierCard = (t: Tier, help: string) => (
    <Card className="rounded-2xl">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${agendaStore.tierDotClass(t)}`} />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{agendaStore.tierLabel(t)}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">{tiers[t]}</p>
      <p className="mt-0.5 text-xs text-gray-400">{help}</p>
    </Card>
  );

  return (
    <>
      <PageMeta title="Analítica" description="Datos de tus clientes, regularidad y fidelidad" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Analítica de clientes</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Mide la regularidad, detecta clientes fieles y decide a quién premiar o reactivar</p>
        </div>
        <Button size="sm" variant="outline" startIcon={<GiftIcon className="h-4 w-4" />} onClick={openConfig}>
          Configurar fidelidad
        </Button>
      </div>

      {/* KPIs — HorizontalMetricCard de Elements */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard layout="horizontal" iconSize="w-14 h-14" icon={<GroupIcon className="size-6" />} title="Total de clientes" value={String(agendaStore.totalClientes)} />
        <MetricCard layout="horizontal" iconSize="w-14 h-14" icon={<UserCircleIcon className="size-6" />} title="Nuevos (30 días)" value={String(agendaStore.clientesNuevos)} iconBgClass="bg-brand-50 text-brand-600 dark:bg-brand-500/15" />
        <MetricCard layout="horizontal" iconSize="w-14 h-14" icon={<CalenderIcon className="size-6" />} title="Tasa de retorno" value={`${agendaStore.tasaRetorno}%`} iconBgClass="bg-success-50 text-success-600 dark:bg-success-500/15" />
        <MetricCard layout="horizontal" iconSize="w-14 h-14" icon={<TimeIcon className="size-6" />} title="Frecuencia media" value={`${agendaStore.frecuenciaPromedioDias} d`} />
      </div>

      {/* ── GRÁFICOS (arriba) ── */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Citas por semana</CardTitle>
          <div className="mt-4"><LineChart series={tendenciaSeries} options={tendenciaOptions} height={260} /></div>
        </Card>
        <Card>
          <CardTitle>Modalidad</CardTitle>
          <div className="mt-4"><PieChart series={modalidadSeries} options={modalidadOptions} height={260} /></div>
        </Card>
      </div>

      {/* ── PROGRAMA DE FIDELIDAD ── */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-brand-500"><GiftIcon /></span>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Programa de fidelidad</h2>
        </div>

        {/* Conteo por nivel */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tierCard("oro", `${cfg.oroMin}+ citas completadas`)}
          {tierCard("plata", `${cfg.plataMin}–${cfg.oroMin - 1} completadas`)}
          {tierCard("bronce", "Recién llegan")}
          {tierCard("riesgo", `${cfg.riesgoNoShows}+ inasistencias o inactivos`)}
        </div>

        {/* Listos para recompensa — ButtonCard pattern */}
        <div className="mt-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Listos para recompensa</h3>
          {recompensas.length === 0 ? (
            <Card className="py-8 text-center"><p className="text-sm text-gray-400">Aún no hay clientes con recompensa disponible.</p></Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recompensas.map((cf) => (
                <Card key={cf.cliente.id} className="rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-gray-800 dark:text-white/90">{cf.cliente.nombre}</span>
                    <TierPill tier={cf.tier} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">{cf.cliente.completadas} citas completadas · {cf.cumplimiento}% cumplimiento</p>
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-warning-50 p-3 dark:bg-warning-500/10">
                    <span className="mt-0.5 text-warning-500"><GiftIcon /></span>
                    <p className="text-xs font-medium text-warning-700 dark:text-warning-400">{cf.recompensa}</p>
                  </div>
                  <Button size="sm" variant="outline" className="mt-4 w-full" startIcon={<span className="text-success-600"><WhatsAppIcon /></span>} onClick={() => contactar(cf, `Hola ${cf.cliente.nombre}, gracias por tu fidelidad. Tenemos un beneficio para ti: ${cf.recompensa}.`)}>
                    Ofrecer por WhatsApp
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CLIENTES EN RIESGO — Alert de Elements ── */}
      {enRiesgo.length > 0 && (
        <div className="mt-6">
          <Alert
            variant="error"
            title={`${enRiesgo.length} ${enRiesgo.length === 1 ? "cliente en riesgo" : "clientes en riesgo"} de perderse`}
            message="Contáctalos para reactivar su próxima cita."
          />
          <div className="mt-3 space-y-2">
            {enRiesgo.map((cf) => (
              <div key={cf.cliente.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">{cf.cliente.nombre}</p>
                  <p className="text-xs text-error-500">{cf.motivoRiesgo}</p>
                </div>
                <Button size="sm" variant="outline" startIcon={<span className="text-success-600"><WhatsAppIcon /></span>} onClick={() => contactar(cf, `Hola ${cf.cliente.nombre}, te extrañamos. ¿Agendamos tu próxima cita?`)}>
                  Reactivar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TABLA DE REGULARIDAD — BadgeTable pattern ── */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">Regularidad de clientes</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell header className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Cliente</TableCell>
                  <TableCell header className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nivel</TableCell>
                  <TableCell header className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Citas</TableCell>
                  <TableCell header className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Cumplimiento</TableCell>
                  <TableCell header className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Cliente desde</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {fidelidad.map((cf) => (
                  <TableRow key={cf.cliente.id}>
                    <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${agendaStore.tierDotClass(cf.tier)}`} />
                        <span className="font-medium">{cf.cliente.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4"><TierPill tier={cf.tier} /></TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400">{cf.cliente.completadas}/{cf.cliente.totalCitas}</TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm">
                      <span className={cf.cumplimiento >= 80 ? "text-success-600" : cf.cumplimiento >= 50 ? "text-warning-600" : "text-error-500"}>{cf.cumplimiento}%</span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400">{cf.antiguedadDias} días</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Ocupación por profesional + servicios */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Ocupación por profesional</CardTitle>
          <div className="mt-4 space-y-4">
            {ocupacion.map((o) => (
              <div key={o.profesional.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${o.profesional.color}`}>{o.profesional.avatar}</span>
                    {o.profesional.especialidad}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-white/90">{o.citas}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className={`h-full rounded-full ${o.profesional.color}`} style={{ width: `${(o.citas / maxOcup) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Servicios más solicitados</CardTitle>
          <div className="mt-4 flex flex-wrap gap-2">
            {topServicios.map((s) => (
              <span key={s.servicio} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {s.servicio}
                <span className="rounded-full bg-white/70 px-1.5 text-xs dark:bg-black/20">{s.count}</span>
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* ── MODAL: Configurar programa de fidelidad ── */}
      <Modal isOpen={configOpen} onClose={() => setConfigOpen(false)} className="max-w-[560px] p-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-brand-500"><GiftIcon /></span>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">Programa de fidelidad</h4>
        </div>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Ajusta a tu gusto los niveles, los criterios y los cupones/recompensas de cada nivel.
        </p>

        <div className="space-y-5">
          {/* Umbrales */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Niveles por citas completadas</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="oroMin"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning-400" />Oro desde</span></Label>
                <Input id="oroMin" type="number" min="2" value={String(form.oroMin)} onChange={(e) => setField("oroMin", Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label htmlFor="plataMin"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400" />Plata desde</span></Label>
                <Input id="plataMin" type="number" min="1" value={String(form.plataMin)} onChange={(e) => setField("plataMin", Number(e.target.value) || 0)} />
              </div>
            </div>
            {!formValido && (
              <p className="mt-1.5 text-xs text-error-500">El mínimo de Oro debe ser mayor que el de Plata, y Plata al menos 1.</p>
            )}
            <p className="mt-1.5 text-xs text-gray-400">Bronce es todo lo que esté por debajo del mínimo de Plata.</p>
          </div>

          {/* Riesgo */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Cuándo marcar “En riesgo”</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="riesgoNoShows">Inasistencias</Label>
                <Input id="riesgoNoShows" type="number" min="1" value={String(form.riesgoNoShows)} onChange={(e) => setField("riesgoNoShows", Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label htmlFor="riesgoInactivoDias">Días sin volver</Label>
                <Input id="riesgoInactivoDias" type="number" min="1" value={String(form.riesgoInactivoDias)} onChange={(e) => setField("riesgoInactivoDias", Number(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Cupones / recompensas */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Cupones / recompensas por nivel</p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="recompensaOro"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning-400" />Oro</span></Label>
                <Input id="recompensaOro" value={form.recompensaOro} onChange={(e) => setField("recompensaOro", e.target.value)} placeholder="Ej: Sesión de cortesía o 20% de descuento" />
              </div>
              <div>
                <Label htmlFor="recompensaPlata"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400" />Plata</span></Label>
                <Input id="recompensaPlata" value={form.recompensaPlata} onChange={(e) => setField("recompensaPlata", e.target.value)} placeholder="Ej: 10% de descuento" />
              </div>
              <div>
                <Label htmlFor="recompensaBronce"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-light-400" />Bronce</span></Label>
                <Input id="recompensaBronce" value={form.recompensaBronce} onChange={(e) => setField("recompensaBronce", e.target.value)} placeholder="Ej: Bienvenida 5%" />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">Deja un cupón vacío si ese nivel no recibe recompensa.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
          <Button size="sm" disabled={!formValido} onClick={guardarConfig}>Guardar</Button>
        </div>
      </Modal>
    </>
  );
});

export default AnaliticaPage;
