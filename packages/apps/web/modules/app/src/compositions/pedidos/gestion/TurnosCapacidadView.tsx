import React from "react";
import { usePedidos } from "../context/PedidosContext";
import {
  Users,
  CheckCircle2,
  ChefHat,
  UserCheck,
  Flame,
  Package,
  Store,
  Zap,
  Calendar,
} from "lucide-react";
import { NectoBanner } from "../shared/NectoBanner";
import { Badge, Button } from "@/elements";

export const TurnosCapacidadView: React.FC = () => {
  const {
    shiftInfo,
    updateStaffStatus,
    assignStaffStation,
    switchShift,
    orders,
    storePace,
    setStorePace,
  } = usePedidos();

  const activeStaffMembers = shiftInfo.activeStaff.filter(s => s.status === "Activo");
  const onBreakStaffMembers = shiftInfo.activeStaff.filter(s => s.status === "Descanso");
  const inactiveStaffMembers = shiftInfo.activeStaff.filter(s => s.status === "Inactivo");

  const activeOrders = orders.filter(o =>
    ["NUEVO", "CONFIRMADO", "EN_PREPARACION", "LISTO"].includes(o.status)
  ).length;

  // Station coverage check
  const stations: Array<{ id: "Horno" | "Armado" | "Empaque" | "Caja"; name: string; icon: any }> = [
    { id: "Horno", name: "Horno & Cocción", icon: Flame },
    { id: "Armado", name: "Armado & Rellenos", icon: ChefHat },
    { id: "Empaque", name: "Empaque & Despacho", icon: Package },
    { id: "Caja", name: "Caja & Mostrador", icon: Store },
  ];

  const shiftOptions = [
    { id: "Turno Mañana · 08:00 - 16:00", label: "Mañana", hours: "08:00 - 16:00", max: 8 },
    { id: "Turno Noche · 16:00 - 00:00", label: "Noche (Pico)", hours: "16:00 - 00:00", max: 12 },
    { id: "Turno Trasnoche · 00:00 - 04:00", label: "Trasnoche", hours: "00:00 - 04:00", max: 4 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <NectoBanner
        icon={<Users className="w-6 h-6 text-[#FF3F1A]" />}
        title="Turnos y Capacidad Operativa de Cocina"
        description="Gestión del personal de cocina, modulación del ritmo operativo de despacho y control de estaciones."
      />

      {/* Ritmo Operativo de Cocina (Modulador de Tiempos & Sobrecarga) */}
      <div className="bg-white dark:bg-[#121316] rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] flex items-center justify-center shadow-2xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-950 dark:text-white">
                Ritmo Operativo & Modulador de Cocina
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5">
                Ajusta el colchón de tiempo que el bot de WhatsApp y la tienda web prometen al cliente según la carga real:
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 self-start sm:self-auto border border-zinc-200/80 dark:border-zinc-700">
            Estado: <span className="text-[#FF3F1A] uppercase">{storePace === "rapida" ? "Rápido (-5m)" : storePace === "demorada" ? "Demorado (+10m)" : "Habitual (Estándar)"}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            onClick={() => setStorePace("rapida")}
            className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
              storePace === "rapida"
                ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700 shadow-xs"
                : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Rápida / Fluida
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                -5 min
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
              Para cocina con baja demanda. Reduce el tiempo estimado de entrega al cliente.
            </p>
          </button>

          <button
            onClick={() => setStorePace("habitual")}
            className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
              storePace === "habitual"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs"
                : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${storePace === "habitual" ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-white"}`}>
                <CheckCircle2 className="w-4 h-4 text-[#FF3F1A]" /> Habitual (Estándar)
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${storePace === "habitual" ? "bg-white/20 text-white dark:bg-black/10 dark:text-zinc-900" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600"}`}>
                Normal
              </span>
            </div>
            <p className={`text-[11px] mt-2 ${storePace === "habitual" ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"}`}>
              Ritmo de operación estándar según las recetas y mise en place configurado.
            </p>
          </button>

          <button
            onClick={() => setStorePace("demorada")}
            className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
              storePace === "demorada"
                ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700 shadow-xs"
                : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4" /> Demorada / Pico
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300">
                +10 min
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
              Protección ante alta congestión o pedidos acumulados. Agrega colchón automático.
            </p>
          </button>
        </div>
      </div>

      {/* Selector de Turno Activo */}
      <div className="bg-white dark:bg-[#121316] rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-[#FF3F1A] flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm text-zinc-900 dark:text-zinc-100">
              Programación de Turno en Curso
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Selecciona el horario del servicio para recalcular la dotación y capacidad base:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none max-w-full flex-nowrap sm:flex-wrap py-1">
          {shiftOptions.map(opt => {
            const isSelected = shiftInfo.currentShift.includes(opt.label);
            return (
              <Button
                key={opt.id}
                variant="ghost"
                intent="turnos.shift.switch"
                onClick={() => switchShift(opt.id)}
                className={`p-0 py-2 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border shadow-xs flex-none ${
                  isSelected
                    ? "bg-[#190088] text-white border-[#190088] ring-2 ring-indigo-500/20"
                    : "bg-slate-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-indigo-300"
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-gray-700 text-gray-500"
                  }`}
                >
                  {opt.hours}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Capacity Meter */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-[#FF3F1A] border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Nivel de Capacidad Operativa
            </span>
            <Badge
              variant={
                shiftInfo.capacityStatus === "Optima"
                  ? "success"
                  : shiftInfo.capacityStatus === "Moderada"
                  ? "warning"
                  : "danger"
              }
              intent="turnos.capacity.level"
              className="normal-case"
            >
              Nivel {shiftInfo.capacityStatus}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-black font-mono text-gray-900 dark:text-gray-100">
                {shiftInfo.capacityPercent}%
              </span>
              <span className="text-xs font-extrabold text-gray-500">
                {activeStaffMembers.length} de {shiftInfo.activeStaff.length} en piso
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  shiftInfo.capacityStatus === "Optima"
                    ? "bg-emerald-500"
                    : shiftInfo.capacityStatus === "Moderada"
                    ? "bg-amber-500"
                    : "bg-[#FF3F1A]"
                }`}
                style={{ width: `${shiftInfo.capacityPercent}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-gray-800/80 rounded-2xl p-3.5 text-xs space-y-1.5 border border-slate-100 dark:border-gray-700">
            <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
              <span>Carga actual en cocina:</span>
              <strong className="font-mono text-gray-900 dark:text-gray-100">
                {activeOrders} de {shiftInfo.maxRecommendedOrders} máx.
              </strong>
            </div>
            <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
              <span>Buffer de tiempo inyectado:</span>
              <strong className="font-mono text-[#FF3F1A] dark:text-orange-400">
                +{shiftInfo.suggestedPrepBufferMinutes} min por comanda
              </strong>
            </div>
          </div>
        </div>

        {/* Cobertura de Estaciones de Cocina */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-[#190088] border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Cobertura por Estaciones
            </span>
            <span className="text-[10px] font-extrabold text-[#190088] dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
              4 Estaciones
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {stations.map(st => {
              const assigned = activeStaffMembers.filter(m => m.station === st.id);
              const isCovered = assigned.length > 0;
              const Icon = st.icon;

              return (
                <div
                  key={st.id}
                  className={`p-3 rounded-2xl border transition-all space-y-1.5 ${
                    isCovered
                      ? "bg-slate-50 dark:bg-gray-800/80 border-slate-200 dark:border-gray-700"
                      : "bg-red-50/70 dark:bg-red-950/40 border-red-300 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon
                      className={`w-4 h-4 ${
                        isCovered ? "text-[#190088] dark:text-indigo-400" : "text-red-500"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                        isCovered
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                          : "bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200"
                      }`}
                    >
                      {isCovered ? `${assigned.length} activo` : "Desierta"}
                    </span>
                  </div>
                  <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100 truncate">
                    {st.name}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-400 leading-tight">
            Asigna personal a cada estación para balancear el flujo de comandas y evitar cuellos de botella.
          </p>
        </div>

        {/* Operational Synergy Explain Box */}
        <div className="bg-gradient-to-br from-indigo-50/80 via-slate-50 to-orange-50/60 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-indigo-200/80 dark:border-gray-700 p-5 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="font-black text-sm text-[#190088] dark:text-blue-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FF3F1A]" /> Sinergia Automática Pedidos ↔ Turnos
            </h4>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              Al cambiar el estado de un cocinero a <em>"Descanso"</em> o <em>"Inactivo"</em>, Necto inyecta automáticamente el buffer de tiempo al menú digital y al asistente de WhatsApp IA en tiempo real.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-none" />
              <span>Protección contra saturación en KDS</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-none" />
              <span>Promesa de entrega exacta para el cliente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Roster Management */}
      <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border border-slate-200/90 dark:border-[#374151] p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-[#374151] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                Dotación de Personal en Turno Activo
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cambia el estado o la estación asignada de cada colaborador con recálculo en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <Badge variant="success" intent="turnos.staff.active" className="rounded-xl normal-case">
              {activeStaffMembers.length} Activos
            </Badge>
            <Badge variant="warning" intent="turnos.staff.break" className="rounded-xl normal-case">
              {onBreakStaffMembers.length} En Descanso
            </Badge>
            <Badge variant="neutral" intent="turnos.staff.inactive" className="rounded-xl normal-case">
              {inactiveStaffMembers.length} Inactivos
            </Badge>
          </div>
        </div>

        {/* Staff Members Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shiftInfo.activeStaff.map(member => (
            <div
              key={member.id}
              className={`rounded-3xl border-2 transition-all p-5 space-y-4 shadow-xs ${
                member.status === "Activo"
                  ? "bg-white dark:bg-[#2C2D31] border-slate-200/90 dark:border-gray-700 hover:border-[#190088]"
                  : member.status === "Descanso"
                  ? "bg-amber-50/20 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                  : "bg-slate-50 dark:bg-gray-800/40 border-slate-200 dark:border-gray-800 opacity-60"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#190088] text-white flex items-center justify-center font-black text-sm shadow-xs">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                      {member.name}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.role}</p>
                  </div>
                </div>

                <span className="font-mono text-xs text-gray-400 font-bold">
                  {member.assignedOrdersCount} cmds
                </span>
              </div>

              {/* Station Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  Estación Asignada:
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(["Horno", "Armado", "Empaque", "Caja"] as const).map(st => {
                    const isCurrentStation = (member.station || "Horno") === st;
                    return (
                      <Button
                        key={st}
                        variant="ghost"
                        intent="turnos.staff.station.assign"
                        onClick={() => assignStaffStation(member.id, st)}
                        className={`p-0 py-1.5 px-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                          isCurrentStation
                            ? "bg-[#190088] text-white shadow-xs"
                            : "bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-slate-200"
                        }`}
                      >
                        {st}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Status Switcher Buttons */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
                {(["Activo", "Descanso", "Inactivo"] as const).map(st => {
                  const isCurrent = member.status === st;
                  return (
                    <Button
                      key={st}
                      variant="ghost"
                      intent="turnos.staff.status.update"
                      onClick={() => updateStaffStatus(member.id, st)}
                      className={`p-0 flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                        isCurrent
                          ? st === "Activo"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : st === "Descanso"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-slate-700 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {st}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
