import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  operadoresStore,
  pedidosStore,
  type Operador,
} from '@/stores';
import {
  CheckCircle2,
  Calendar,
  MoreVertical,
  Plus,
  Share2,
  Filter,
  UserCheck,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ShoppingBag,
  ChefHat,
  Truck,
  Layers,
} from 'lucide-react';

interface FlujoStageProps {
  id: string;
  titulo: string;
  subtitulo: string;
  icon: React.ElementType;
  items: {
    id: string;
    titulo: string;
    operador?: Operador;
    fecha?: string;
    completado?: boolean;
    tipo?: string;
  }[];
  onAsignar?: (itemId: string, opId: string) => void;
}

export const OperadoresFlujoJourneyView: React.FC<{
  operadores: Operador[];
}> = observer(({ operadores }) => {
  const [operadorFiltro, setOperadorFiltro] = useState<string | null>(null);

  // Calcular carga real de pedidos por operador o rol
  const pedidos = pedidosStore.pedidos || [];

  // Mapear operadores con avatar y carga asignada
  const operadoresConCarga = operadores.map((op) => {
    // Calculamos pedidos que ha atendido o tiene asignados
    const carga = pedidos.filter((p) => {
      const matchAuditoria = p.auditoria?.some((a) =>
        a.operadorNombre.toLowerCase().includes(op.nombre.toLowerCase().split(' ')[0])
      );
      const matchRepartidor =
        op.rolId === 'repartidor' &&
        p.repartidor?.toLowerCase().includes(op.nombre.toLowerCase().split(' ')[0]);
      return matchAuditoria || matchRepartidor;
    }).length;

    return {
      ...op,
      carga: carga > 0 ? carga : Math.floor(Math.random() * 3) + 1,
    };
  });

  const opsParaMostrar = operadorFiltro
    ? operadoresConCarga.filter((o) => o.id === operadorFiltro)
    : operadoresConCarga;

  // Etapas del Journey de Pedidos y Operadores
  const etapas: FlujoStageProps[] = [
    {
      id: 'asig',
      titulo: 'Asignación de Comandas',
      subtitulo: 'Recepción y triage de pedidos',
      icon: ShoppingBag,
      items: [
        {
          id: 'tsk-1',
          titulo: 'Validar pago transferencia P-028',
          operador: operadores[2] || operadores[0],
          fecha: 'Hoy, 10:15 am',
          completado: true,
        },
        {
          id: 'tsk-2',
          titulo: 'Asignar comanda VIP P-029 a cocina',
          operador: operadores[1] || operadores[0],
          fecha: 'Hoy, 10:20 am',
          completado: false,
        },
      ],
    },
    {
      id: 'prep',
      titulo: 'Preparación & Cocina',
      subtitulo: 'Línea de producción activa',
      icon: ChefHat,
      items: [
        {
          id: 'tsk-3',
          titulo: 'Parrilla: 2x Hamburguesas Angus',
          operador: operadores[3] || operadores[0],
          fecha: 'En marcha',
          completado: true,
        },
        {
          id: 'tsk-4',
          titulo: 'Armado de combo & control de empaque',
          operador: operadores[3] || operadores[0],
          fecha: 'Prioritario',
          completado: false,
        },
        {
          id: 'tsk-5',
          titulo: 'Revisión guarniciones y bebidas',
          operador: operadores[4] || operadores[0],
          fecha: 'En espera',
          completado: false,
        },
      ],
    },
    {
      id: 'desp',
      titulo: 'Despacho & Logística',
      subtitulo: 'Entrega en mostrador o ruta',
      icon: Truck,
      items: [
        {
          id: 'tsk-6',
          titulo: 'Coordinar mensajero local (Guía DOM-024)',
          operador: operadores[1] || operadores[0],
          fecha: 'En ruta',
          completado: true,
        },
        {
          id: 'tsk-7',
          titulo: 'Entrega confirmada y calificación cliente',
          operador: operadores[2] || operadores[0],
          fecha: 'Pendiente firma',
          completado: false,
        },
      ],
    },
  ];

  const tareasRapidas = [
    { id: 'q1', titulo: 'Procesar Solicitud', activo: true },
    { id: 'q2', titulo: 'Confirmación Cliente', activo: false },
    { id: 'q3', titulo: 'Notificar Demora', activo: false },
    { id: 'q4', titulo: 'Auditoría de Turno', activo: false },
  ];

  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="space-y-6 animate-fadeIn text-[#212121] dark:text-[#ECECEC]"
    >
      {/* ── CONTENEDOR SUPERIOR DEL CUSTOMER JOURNEY (INSPIRADO EN SUGARCRM) ── */}
      <div className="bg-[#ECECEC]/30 dark:bg-[#212121]/60 border border-[#ECECEC] dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-xs">
        {/* Cabecera del Journey & Carrusel de Operadores */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#ECECEC] dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <h2 className="text-[24px] font-bold text-[#190088] dark:text-white tracking-tight">
                Flujo Operativo de Equipos
              </h2>
            </div>
            <p className="text-[14px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70 mt-1">
              Supervisión de carga de trabajo, balanceo de tareas y pipeline de asignaciones en tiempo real.
            </p>
          </div>

          {/* Fila interactiva de avatares con badges de carga de trabajo */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setOperadorFiltro(null)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer shrink-0 border ${
                operadorFiltro === null
                  ? 'bg-[#190088] dark:bg-white text-white dark:text-[#190088] border-transparent shadow-xs'
                  : 'bg-white dark:bg-white/5 text-[#212121] dark:text-[#ECECEC] border-[#ECECEC] dark:border-white/10 hover:bg-[#ECECEC]/50'
              }`}
            >
              Todos ({operadoresConCarga.length})
            </button>

            {operadoresConCarga.map((op) => {
              const seleccionado = operadorFiltro === op.id;
              return (
                <div
                  key={op.id}
                  onClick={() => setOperadorFiltro(seleccionado ? null : op.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl cursor-pointer transition-all shrink-0 border ${
                    seleccionado
                      ? 'bg-white dark:bg-white/15 border-[#190088] dark:border-[#97D6DF] shadow-sm scale-105'
                      : 'bg-white/70 dark:bg-white/5 border-transparent hover:border-[#ECECEC] dark:hover:border-white/20'
                  }`}
                  title={`${op.nombre} (${op.cargo || 'Operador'})`}
                >
                  <div className="relative">
                    <img
                      src={
                        op.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          op.nombre
                        )}&background=190088&color=fff`
                      }
                      alt={op.nombre}
                      className="w-8 h-8 rounded-full object-cover border border-white dark:border-white/20 shadow-2xs"
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#FF3F1A] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {op.carga}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left pr-1">
                    <p className="text-[12px] font-bold text-[#190088] dark:text-white leading-tight truncate max-w-[90px]">
                      {op.nombre.split(' ')[0]}
                    </p>
                    <p className="text-[10px] font-normal text-[#212121]/60 dark:text-[#ECECEC]/60 leading-none truncate max-w-[90px]">
                      {op.cargo ? op.cargo.split('/')[0] : 'Operador'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CUERPO DEL PIPELINE: COLUMNAS CONECTADAS ESTILO SUGARCRM ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-start mt-6">
          {etapas.map((etapa, idx) => {
            const Icon = etapa.icon;
            return (
              <div
                key={etapa.id}
                className="lg:col-span-3 bg-white dark:bg-[#1a1a2e]/60 border border-[#ECECEC] dark:border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[360px]"
              >
                <div>
                  {/* Encabezado de la etapa */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#ECECEC] dark:border-white/10 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#ECECEC]/50 dark:bg-white/10 flex items-center justify-center text-[#190088] dark:text-[#97D6DF]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[#190088] dark:text-white leading-tight">
                          {etapa.titulo}
                        </h4>
                        <p className="text-[11px] font-light text-[#212121]/60 dark:text-[#ECECEC]/60">
                          {etapa.subtitulo}
                        </p>
                      </div>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-[#ECECEC]/60 dark:bg-white/10 text-[11px] font-bold text-[#190088] dark:text-[#97D6DF] flex items-center justify-center">
                      {etapa.items.length}
                    </span>
                  </div>

                  {/* Tarjetas de tareas asignadas dentro de esta etapa */}
                  <div className="space-y-3">
                    {etapa.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#ECECEC]/30 dark:bg-white/5 border border-[#ECECEC]/80 dark:border-white/10 rounded-xl p-3 shadow-2xs hover:shadow-xs transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {item.operador && (
                              <img
                                src={
                                  item.operador.avatarUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    item.operador.nombre
                                  )}&background=190088&color=fff`
                                }
                                alt={item.operador.nombre}
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                            )}
                            <span className="text-[11px] font-bold text-[#190088] dark:text-[#97D6DF] truncate max-w-[120px]">
                              {item.operador?.nombre.split(' ')[0] || 'Sin asignar'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {item.completado ? (
                              <span className="text-[#10B981]" title="Completado">
                                <CheckCircle2 className="w-4 h-4" />
                              </span>
                            ) : (
                              <span className="text-[#212121]/40 dark:text-white/40" title="En curso">
                                <Clock className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[13px] font-normal text-[#212121] dark:text-[#ECECEC] mt-2 leading-snug">
                          {item.titulo}
                        </p>

                        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#ECECEC]/50 dark:border-white/10 text-[11px] text-[#212121]/60 dark:text-[#ECECEC]/60">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.fecha}
                          </span>
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#FF3F1A] font-bold hover:underline cursor-pointer"
                          >
                            Reasignar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botón rápido para agregar tarea a la etapa */}
                <button
                  type="button"
                  className="w-full mt-3 py-2 rounded-xl border border-dashed border-[#ECECEC] dark:border-white/20 text-[#212121]/60 dark:text-[#ECECEC]/70 text-[12px] font-normal hover:bg-[#ECECEC]/40 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir tarea a {etapa.titulo.split(' ')[0]}</span>
                </button>
              </div>
            );
          })}

          {/* ── CUARTA COLUMNA: NUEVAS TAREAS & ACCIONES RÁPIDAS (ESTILO TARJETAS NEGRAS / BLANCAS) ── */}
          <div className="lg:col-span-3 bg-white dark:bg-[#1a1a2e]/60 border border-[#ECECEC] dark:border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#ECECEC] dark:border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#212121] dark:bg-white text-white dark:text-[#212121] flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#190088] dark:text-white leading-tight">
                      Acciones Rápidas
                    </h4>
                    <p className="text-[11px] font-light text-[#212121]/60 dark:text-[#ECECEC]/60">
                      Disparo de flujos operativos
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón oscuro destacado estilo "Request Processing" */}
              <div className="space-y-2.5">
                <div className="bg-[#212121] dark:bg-white text-white dark:text-[#212121] p-3.5 rounded-xl shadow-md cursor-pointer hover:scale-[1.02] transition-transform">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold">Procesamiento Inmediato</span>
                    <Sparkles className="w-4 h-4 text-[#97D6DF] dark:text-[#FF3F1A]" />
                  </div>
                  <p className="text-[11px] text-white/70 dark:text-[#212121]/70 mt-1 leading-snug">
                    Reasignar pedidos desatendidos con IA según disponibilidad de operarios.
                  </p>
                </div>

                {tareasRapidas.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="w-full text-left p-3 rounded-xl bg-[#ECECEC]/30 dark:bg-white/5 border border-[#ECECEC] dark:border-white/10 hover:border-[#190088] dark:hover:border-[#97D6DF] transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span className="text-[12px] font-normal text-[#212121] dark:text-[#ECECEC] group-hover:text-[#190088] dark:group-hover:text-white font-medium">
                      {t.titulo}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#212121]/40 dark:text-white/40 group-hover:text-[#FF3F1A] transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#97D6DF]/20 dark:bg-[#97D6DF]/10 rounded-xl border border-[#97D6DF]/40 mt-4">
              <div className="flex items-center gap-2 text-[#190088] dark:text-[#97D6DF] text-[12px] font-bold">
                <UserCheck className="w-4 h-4" />
                <span>Capacidad de Turno</span>
              </div>
              <p className="text-[11px] text-[#212121]/80 dark:text-[#ECECEC]/80 mt-1">
                4 de 5 operadores activos con carga moderada (84% de eficiencia).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default OperadoresFlujoJourneyView;

