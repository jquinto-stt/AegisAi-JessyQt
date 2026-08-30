import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import {
  Sparkles,
  Zap,
  Repeat,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Layers,
  Activity,
  History,
  Building2,
  Calendar,
  CheckCircle2,
  X,
  Play,
  FileCheck,
  TrendingUp,
} from "lucide-react";
import { NectoBanner } from "../shared/NectoBanner";

export const AutomatizacionesView: React.FC = () => {
  const { automations, toggleAutomationRule, recurrences, toggleRecurrence, createManualOrder } =
    usePedidos();

  const [activeSubTab, setActiveSubTab] = useState<"reglas" | "recurrencias" | "historial">("reglas");
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleDesc, setNewRuleDesc] = useState("");
  const [emitSuccessMsg, setEmitSuccessMsg] = useState<string | null>(null);

  // Mock execution audit log
  const executionLogs = [
    {
      id: "LOG-108",
      time: "Hace 6 min",
      ruleId: "AUT-01",
      ruleName: "Confirmación Automática de Pedidos Elegibles",
      orderId: "PED-1024",
      channel: "whatsapp",
      status: "Ejecutado",
      detail: "Stock verificado (100%), capacidad óptima (85%), comanda auto-confirmada.",
    },
    {
      id: "LOG-107",
      time: "Hace 24 min",
      ruleId: "AUT-01",
      ruleName: "Confirmación Automática de Pedidos Elegibles",
      orderId: "PED-1022",
      channel: "web",
      status: "Ejecutado",
      detail: "Pedido Web pagado, 2 combos mixtos enviados automáticamente a KDS cocina.",
    },
    {
      id: "LOG-106",
      time: "Hace 42 min",
      ruleId: "AUT-02",
      ruleName: "Alerta Temprana de Demora Operativa (+15 min)",
      orderId: "PED-1020",
      channel: "whatsapp",
      status: "Alerta Emitida",
      detail: "Tiempo transcurrido superó 40 min pactados. Incidencia de Severidad Alta generada.",
    },
    {
      id: "LOG-105",
      time: "Ayer 19:40",
      ruleId: "AUT-01",
      ruleName: "Confirmación Automática de Pedidos Elegibles",
      orderId: "PED-1018",
      channel: "whatsapp",
      status: "Omitido",
      detail: "Capacidad de cocina reducida (45%). Se requirió confirmación manual del operador.",
    },
  ];

  const handleEmitRecurrenceNow = (rec: typeof recurrences[0]) => {
    createManualOrder({
      customerName: `${rec.customerName} (Recurrencia)`,
      customerPhone: rec.phone,
      channel: "whatsapp",
      type: "recurrente",
      items: rec.items,
      total: rec.total,
    });
    setEmitSuccessMsg(`¡Comanda emitida con éxito para ${rec.customerName}! Aparecerá en Pedidos Activos.`);
    setTimeout(() => setEmitSuccessMsg(null), 4000);
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;
    setShowNewRuleModal(false);
    setNewRuleName("");
    setNewRuleDesc("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <NectoBanner
        icon={<Zap className="w-6 h-6 text-[#FF3F1A]" />}
        title="Automatizaciones & Pedidos Recurrentes"
        description="Reglas de negocio inteligentes en segundo plano, auditoría de ejecuciones y suscripciones corporativas B2B."
      />

      {/* Subtab Switcher Toolbar */}
      <div className="flex bg-slate-100 dark:bg-gray-800 rounded-xl p-1 border border-slate-200 dark:border-gray-700 w-fit shadow-xs">
        <button
          onClick={() => setActiveSubTab("reglas")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "reglas"
              ? "bg-[#FF3F1A] text-white shadow-xs"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
          }`}
        >
          Reglas ({automations.filter(a => a.isActive).length})
        </button>
        <button
          onClick={() => setActiveSubTab("recurrencias")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "recurrencias"
              ? "bg-[#FF3F1A] text-white shadow-xs"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
          }`}
        >
          Recurrentes B2B ({recurrences.length})
        </button>
        <button
          onClick={() => setActiveSubTab("historial")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "historial"
              ? "bg-[#FF3F1A] text-white shadow-xs"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
          }`}
        >
          Historial de Disparos
        </button>
      </div>

      {/* Top Automation Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Auto-Confirmaciones */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-[#190088] border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
              Auto-Confirmadas Hoy
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#190088] dark:text-indigo-300 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
              34 <span className="text-xs font-normal text-gray-400">comandas</span>
            </p>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
              68% del total
            </span>
          </div>
          <p className="text-[11px] text-gray-400">0 intervenciones requeridas en caja</p>
        </div>

        {/* KPI 2: Tiempo Ahorrado */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-[#FF3F1A] border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
              Tiempo Ahorrado
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-[#FF3F1A] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-[#FF3F1A] dark:text-orange-400">
              4.2 <span className="text-xs font-normal text-gray-400">hrs/sem</span>
            </p>
            <span className="text-xs font-bold text-gray-500">
              ~2.5 min / pedido
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Menor fricción en toma de pedidos</p>
        </div>

        {/* KPI 3: Reglas Activas */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-emerald-500 border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
              Reglas en Memoria
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
              {automations.filter(a => a.isActive).length} / {automations.length}
            </p>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
              Activas
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Validando stock y turnos en vivo</p>
        </div>

        {/* KPI 4: Volumen B2B Proyectado */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-purple-500 border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
              Ingresos Recurrentes B2B
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-purple-600 dark:text-purple-400">
              ${(recurrences.reduce((s, r) => s + r.total, 0) / 1000).toFixed(0)}k
            </p>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full">
              {recurrences.length} contratos
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Emisiones programadas automáticas</p>
        </div>
      </div>

      {/* Success Notification if emitted */}
      {emitSuccessMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{emitSuccessMsg}</span>
          </div>
          <button onClick={() => setEmitSuccessMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUBTAB 1: Reglas de Automatización */}
      {activeSubTab === "reglas" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#2C2D31] rounded-3xl p-5 border border-slate-200/90 dark:border-[#374151] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-[#FF3F1A] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                  Motor de Reglas de Negocio en Segundo Plano
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Evalúa instantáneamente cada pedido entrante antes de pasarlo a cocina.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowNewRuleModal(true)}
              className="py-2.5 px-4 rounded-2xl bg-[#FF3F1A] hover:bg-orange-600 text-white font-black text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> Nueva Regla
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {automations.map(rule => (
              <div
                key={rule.id}
                className={`bg-white dark:bg-[#2C2D31] rounded-3xl border-2 p-6 shadow-xs flex flex-col justify-between gap-5 transition-all ${
                  rule.isActive
                    ? "border-slate-200/90 dark:border-[#374151] hover:border-[#190088]"
                    : "border-slate-200 dark:border-gray-800 opacity-60"
                }`}
              >
                <div className="space-y-4">
                  {/* Top Meta */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#374151] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-[#190088] dark:text-blue-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        {rule.id}
                      </span>
                      <span className="text-[10px] font-black uppercase text-gray-400">
                        Trigger: {rule.triggerType === "order_created" ? "Al Crear Pedido" : "Superar Demora"}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleAutomationRule(rule.id)}
                      className={`flex items-center gap-1.5 font-black text-xs px-3 py-1 rounded-full border transition-all cursor-pointer ${
                        rule.isActive
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                          : "bg-slate-100 dark:bg-gray-800 text-gray-500 border-slate-300 dark:border-gray-700"
                      }`}
                    >
                      {rule.isActive ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
                      <span>{rule.isActive ? "Regla Activa" : "Pausada"}</span>
                    </button>
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                      {rule.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>

                  {/* Conditions Box */}
                  <div className="bg-slate-50 dark:bg-gray-800/90 rounded-2xl p-4 text-xs space-y-2 border border-slate-100 dark:border-gray-700">
                    <p className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">
                      Condiciones Requeridas para Disparo:
                    </p>
                    <div className="space-y-1.5 text-gray-700 dark:text-gray-300 font-medium">
                      {rule.conditions.checkProductsAvailable && (
                        <p className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-none" />
                          <span>Todos los productos deben estar disponibles en catálogo</span>
                        </p>
                      )}
                      {rule.conditions.checkBusinessHours && (
                        <p className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-none" />
                          <span>Local abierto y dentro del turno operativo</span>
                        </p>
                      )}
                      {rule.conditions.checkKitchenCapacity && (
                        <p className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-none" />
                          <span>Capacidad de cocina en nivel Óptimo o Moderado</span>
                        </p>
                      )}
                      {rule.conditions.maxElapsedMinutes && (
                        <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-3.5 h-3.5 flex-none" />
                          <span>Tiempo en preparación supera los {rule.conditions.maxElapsedMinutes} min</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-[#374151] flex items-center justify-between text-xs text-gray-400">
                  <span>
                    Ejecutada: <strong className="text-gray-800 dark:text-gray-200 font-mono">{rule.executionCount} veces</strong>
                  </span>
                  <span className="font-mono text-[11px]">{rule.lastExecuted || "Sin ejecuciones hoy"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Recurrencias Corporativas B2B */}
      {activeSubTab === "recurrencias" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#2C2D31] rounded-3xl p-5 border border-slate-200/90 dark:border-[#374151] shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                <Repeat className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                  Suscripciones y Comandas Periódicas (B2B)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Contratos corporativos de entrega automática para empresas, eventos o reuniones periódicas.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleEmitRecurrenceNow(recurrences[0])}
              className="py-2.5 px-4 rounded-2xl bg-[#190088] hover:bg-[#140070] text-white font-black text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4" /> Emitir Prueba Inmediata
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {recurrences.map(rec => (
              <div
                key={rec.id}
                className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-slate-200/90 dark:border-[#374151] p-6 shadow-xs space-y-4 hover:border-[#190088] transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#374151] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-mono font-black text-xs text-purple-700 dark:text-purple-300">
                          {rec.id} · {rec.frequency}
                        </span>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          Hora pactada: {rec.scheduledTime}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleRecurrence(rec.id)}
                      className={`font-black text-xs px-3 py-1 rounded-full border cursor-pointer transition-all ${
                        rec.isActive
                          ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {rec.isActive ? "Activa" : "Pausada"}
                    </button>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h4 className="font-black text-base text-gray-900 dark:text-gray-100">
                      {rec.customerName}
                    </h4>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{rec.phone}</p>
                  </div>

                  {/* Items Box */}
                  <div className="bg-slate-50 dark:bg-gray-800/90 rounded-2xl p-4 text-xs space-y-2 border border-slate-100 dark:border-gray-700">
                    <p className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">
                      Productos en esta suscripción:
                    </p>
                    <div className="space-y-1">
                      {rec.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between font-semibold text-gray-800 dark:text-gray-200">
                          <span>
                            <strong className="text-[#FF3F1A]">×{it.quantity}</strong> {it.name}
                          </span>
                          <span className="font-mono font-bold">${(it.unitPrice * it.quantity).toLocaleString("es-CO")}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-gray-700 flex justify-between font-black text-sm text-[#190088] dark:text-blue-400">
                      <span>Total de la Comanda:</span>
                      <span className="font-mono">${rec.total.toLocaleString("es-CO")}</span>
                    </div>
                  </div>
                </div>

                {/* Footer with Emit Action */}
                <div className="pt-3 border-t border-gray-100 dark:border-[#374151] flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-500">
                    <p className="text-[11px]">Próxima emisión:</p>
                    <strong className="text-gray-900 dark:text-gray-100 font-mono">{rec.nextExecution}</strong>
                  </div>

                  <button
                    onClick={() => handleEmitRecurrenceNow(rec)}
                    className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-gray-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" /> Emitir Ahora
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Historial de Disparos */}
      {activeSubTab === "historial" && (
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border border-slate-200/90 dark:border-[#374151] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#374151] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-[#190088] dark:text-indigo-400 flex items-center justify-center">
                <History className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                  Registro de Ejecuciones en Vivo (Audit Trail)
                </h4>
                <p className="text-xs text-gray-400">
                  Trazabilidad de cada disparo automático sobre pedidos en tiempo real.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {executionLogs.map(log => (
              <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-[#190088] dark:text-blue-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      {log.orderId}
                    </span>
                    <span className="font-extrabold text-gray-900 dark:text-gray-100">
                      {log.ruleName}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        log.status === "Ejecutado"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : log.status === "Alerta Emitida"
                          ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">{log.detail}</p>
                </div>

                <span className="font-mono text-[11px] text-gray-400 flex-none bg-slate-50 dark:bg-gray-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-gray-700">
                  {log.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Crear Nueva Regla */}
      {showNewRuleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#2C2D31] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#374151] w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#374151] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF3F1A] flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                    Nueva Regla de Automatización
                  </h3>
                  <p className="text-xs text-gray-400">Define disparadores y condiciones de seguridad</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewRuleModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Nombre de la Regla *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Auto-despacho para clientes VIP"
                  value={newRuleName}
                  onChange={e => setNewRuleName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-[#374151] rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Descripción Operativa
                </label>
                <textarea
                  rows={2}
                  placeholder="Explica qué acción se ejecuta cuando se cumplan las condiciones..."
                  value={newRuleDesc}
                  onChange={e => setNewRuleDesc(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-[#374151] rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Condiciones de Seguridad Activas:
                </label>
                <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#FF3F1A] rounded" />
                    <span>Validar stock en catálogo antes de confirmar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#FF3F1A] rounded" />
                    <span>Validar que la cocina no esté en capacidad reducida</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#FF3F1A] rounded" />
                    <span>Verificar horario comercial de atención</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#374151]">
                <button
                  type="button"
                  onClick={() => setShowNewRuleModal(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-gray-700 text-xs font-extrabold text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-[#FF3F1A] hover:bg-orange-600 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                >
                  Guardar y Activar Regla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
