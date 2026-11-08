import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  operadoresStore,
  rolesStore,
  CAPACIDADES,
  CAPACIDAD_LABEL,
  type Operador,
  type Capacidad,
} from '@/stores';
import {
  CheckCircle2,
  Calendar,
  UserCheck,
  Sparkles,
  ArrowRight,
  Truck,
  Layers,
  Inbox,
  PackageCheck,
  ShieldCheck,
  X,
  Check,
  CalendarDays,
  Plus,
} from 'lucide-react';

interface TareaFlujoEstandar {
  id: string;
  etapaId: 'asig' | 'proc' | 'desp';
  titulo: string;
  descripcion: string;
  capacidadRequerida: Capacidad;
  operadorAsignadoId?: string;
  fechaCompromiso: string;
  completada: boolean;
}

interface EtapaFlujo {
  id: 'asig' | 'proc' | 'desp';
  titulo: string;
  subtitulo: string;
  icon: React.ElementType;
}

export const OperadoresFlujoJourneyView: React.FC<{
  operadores: Operador[];
}> = observer(({ operadores }) => {
  const [operadorFiltro, setOperadorFiltro] = useState<string | null>(null);
  const [operadorParaPermisos, setOperadorParaPermisos] = useState<Operador | null>(null);
  const [modalFechaTarea, setModalFechaTarea] = useState<TareaFlujoEstandar | null>(null);
  const [nuevaFechaInput, setNuevaFechaInput] = useState('');
  const [notificacionFlash, setNotificacionFlash] = useState<string | null>(null);

  // Etapas del flujo de trabajo operativo
  const etapas: EtapaFlujo[] = [
    {
      id: 'asig',
      titulo: 'Asignación & Triage',
      subtitulo: 'Recepción, validación y asignación inicial',
      icon: Inbox,
    },
    {
      id: 'proc',
      titulo: 'Procesamiento & Armado',
      subtitulo: 'Alistamiento de orden y empaque',
      icon: PackageCheck,
    },
    {
      id: 'desp',
      titulo: 'Despacho & Distribución',
      subtitulo: 'Entrega en mostrador o ruta de transporte',
      icon: Truck,
    },
  ];

  // Matriz de tareas estándar predeterminadas del flujo de pedidos de Necto
  const [tareas, setTareas] = useState<TareaFlujoEstandar[]>([
    // Etapa 1: Asignación & Triage
    {
      id: 'tsk-std-1',
      etapaId: 'asig',
      titulo: 'Validar comprobantes de pago y transferencias',
      descripcion: 'Verificar conciliación bancaria o pasarela antes de procesar.',
      capacidadRequerida: 'orders.confirm',
      operadorAsignadoId: operadores[2]?.id || operadores[0]?.id,
      fechaCompromiso: 'Hoy, 11:00 am',
      completada: true,
    },
    {
      id: 'tsk-std-2',
      etapaId: 'asig',
      titulo: 'Triage y clasificación de prioridad de pedidos',
      descripcion: 'Determinar si la orden es urgente, express o programada.',
      capacidadRequerida: 'orders.create',
      operadorAsignadoId: operadores[1]?.id || operadores[0]?.id,
      fechaCompromiso: 'Hoy, 11:30 am',
      completada: false,
    },

    // Etapa 2: Procesamiento & Armado
    {
      id: 'tsk-std-3',
      etapaId: 'proc',
      titulo: 'Alistamiento de inventario y verificación de stock',
      descripcion: 'Confirmar existencia física en bodega/anaquel y reservar ítems.',
      capacidadRequerida: 'preparation.read',
      operadorAsignadoId: operadores[3]?.id || operadores[0]?.id,
      fechaCompromiso: 'Hoy, 12:00 pm',
      completada: true,
    },
    {
      id: 'tsk-std-4',
      etapaId: 'proc',
      titulo: 'Control de calidad, empaque y sellado de paquete',
      descripcion: 'Empaque seguro con estándares de marca y lista de remisión.',
      capacidadRequerida: 'preparation.manage',
      operadorAsignadoId: operadores[3]?.id || operadores[0]?.id,
      fechaCompromiso: 'Hoy, 12:45 pm',
      completada: false,
    },

    // Etapa 3: Despacho & Distribución
    {
      id: 'tsk-std-5',
      etapaId: 'desp',
      titulo: 'Generación de guía de transporte y despacho',
      descripcion: 'Crear rótulo de guía y entregar a mensajero o mostrador.',
      capacidadRequerida: 'orders.edit',
      operadorAsignadoId: operadores[1]?.id || operadores[0]?.id,
      fechaCompromiso: 'Hoy, 01:15 pm',
      completada: false,
    },
    {
      id: 'tsk-std-6',
      etapaId: 'desp',
      titulo: 'Confirmación de entrega y cierre de ciclo de orden',
      descripcion: 'Registrar entrega efectiva con firma o soporte del cliente.',
      capacidadRequerida: 'orders.confirm',
      operadorAsignadoId: operadores[2]?.id || operadores[0]?.id,
      fechaCompromiso: 'Hoy, 02:00 pm',
      completada: false,
    },
  ]);

  const mostrarMensaje = (msg: string) => {
    setNotificacionFlash(msg);
    setTimeout(() => setNotificacionFlash(null), 3000);
  };

  // Carga de trabajo dinámica por operador
  const operadoresConCarga = operadores.map((op) => {
    const tareasAsignadas = tareas.filter(
      (t) => t.operadorAsignadoId === op.id && !t.completada
    ).length;
    return {
      ...op,
      carga: tareasAsignadas,
    };
  });

  // Filtro por operador seleccionado
  const tareasFiltradas = operadorFiltro
    ? tareas.filter((t) => t.operadorAsignadoId === operadorFiltro)
    : tareas;

  // Toggle de completado
  const toggleCompletada = (id: string) => {
    setTareas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completada: !t.completada } : t))
    );
  };

  // Reasignar operador
  const reasignarOperador = (tareaId: string, nuevoOpId: string) => {
    setTareas((prev) =>
      prev.map((t) => (t.id === tareaId ? { ...t, operadorAsignadoId: nuevoOpId } : t))
    );
    const op = operadores.find((o) => o.id === nuevoOpId);
    mostrarMensaje(`Responsable actualizado: ${op?.nombre || 'Nuevo operador'}`);
  };

  // Balanceo con IA
  const balancearCargasConIA = () => {
    if (operadores.length === 0) return;
    setTareas((prev) =>
      prev.map((t, idx) => ({
        ...t,
        operadorAsignadoId: operadores[idx % operadores.length].id,
      }))
    );
    mostrarMensaje('¡Balanceo inteligente completado! Tareas distribuidas equitativamente.');
  };

  // Verificar si operador tiene la capacidad requerida
  const tieneCapacidad = (op: Operador, cap: Capacidad): boolean => {
    const rol = rolesStore.roles.find((r) => r.id === op.rolId);
    const enRol = rol?.capacidades?.includes(cap) ?? false;
    const sumada = op.capacidadesExtra?.includes(cap) ?? false;
    const restada = op.capacidadesRemovidas?.includes(cap) ?? false;
    return (enRol || sumada) && !restada;
  };

  // Alternar permisos de un operador
  const alternarPermiso = (op: Operador, cap: Capacidad) => {
    const activa = tieneCapacidad(op, cap);
    const rol = rolesStore.roles.find((r) => r.id === op.rolId);
    const enRol = rol?.capacidades?.includes(cap) ?? false;

    let extra = [...(op.capacidadesExtra || [])];
    let removidas = [...(op.capacidadesRemovidas || [])];

    if (activa) {
      if (enRol) {
        if (!removidas.includes(cap)) removidas.push(cap);
      } else {
        extra = extra.filter((c) => c !== cap);
      }
    } else {
      if (enRol) {
        removidas = removidas.filter((c) => c !== cap);
      } else {
        if (!extra.includes(cap)) extra.push(cap);
      }
    }

    operadoresStore.actualizarPermisos(op.id, extra, removidas);
    setOperadorParaPermisos({ ...op, capacidadesExtra: extra, capacidadesRemovidas: removidas });
    mostrarMensaje(`Permiso '${CAPACIDAD_LABEL[cap] || cap}' actualizado para ${op.nombre}.`);
  };

  // Actualizar fecha límite de la tarea
  const guardarNuevaFecha = () => {
    if (!modalFechaTarea || !nuevaFechaInput.trim()) return;
    setTareas((prev) =>
      prev.map((t) =>
        t.id === modalFechaTarea.id ? { ...t, fechaCompromiso: nuevaFechaInput.trim() } : t
      )
    );
    setModalFechaTarea(null);
    setNuevaFechaInput('');
    mostrarMensaje('Fecha límite actualizada con éxito.');
  };

  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="space-y-6 animate-fadeIn text-[#212121] dark:text-[#ECECEC]"
    >
      {/* Toast Flash Flotante */}
      {notificacionFlash && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#190088] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-slideIn">
          <Sparkles className="w-5 h-5 text-[#97D6DF]" />
          <span className="text-[14px] font-medium">{notificacionFlash}</span>
        </div>
      )}

      {/* ── CONTENEDOR SUPERIOR DEL CUSTOMER JOURNEY ── */}
      <div className="bg-[#ECECEC]/30 dark:bg-[#212121]/60 border border-[#ECECEC] dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-xs">
        {/* Cabecera del Journey & Carrusel de Operadores con Cargas y Permisos */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#ECECEC] dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <h2 className="text-[24px] font-bold text-[#190088] dark:text-white tracking-tight">
                Flujo Operativo de Equipos & Asignaciones
              </h2>
            </div>
            <p className="text-[14px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70 mt-1">
              Supervisión de responsabilidades fijas por etapa, fechas límite y asignación de operadores.
            </p>
          </div>

          {/* Carrusel de Operadores con Badges de Carga y Acceso a Permisos */}
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
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl transition-all shrink-0 border group relative ${
                    seleccionado
                      ? 'bg-white dark:bg-white/15 border-[#190088] dark:border-[#97D6DF] shadow-sm scale-105'
                      : 'bg-white/70 dark:bg-white/5 border-transparent hover:border-[#ECECEC] dark:hover:border-white/20'
                  }`}
                >
                  <div
                    onClick={() => setOperadorFiltro(seleccionado ? null : op.id)}
                    className="relative cursor-pointer"
                    title={`Ver tareas de ${op.nombre}`}
                  >
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
                    <span
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-xs ${
                        op.carga > 2 ? 'bg-[#FF3F1A]' : 'bg-[#10B981]'
                      }`}
                    >
                      {op.carga}
                    </span>
                  </div>

                  <div
                    onClick={() => setOperadorFiltro(seleccionado ? null : op.id)}
                    className="hidden sm:block text-left pr-1 cursor-pointer"
                  >
                    <p className="text-[12px] font-bold text-[#190088] dark:text-white leading-tight truncate max-w-[90px]">
                      {op.nombre.split(' ')[0]}
                    </p>
                    <p className="text-[10px] font-normal text-[#212121]/60 dark:text-[#ECECEC]/60 leading-none truncate max-w-[90px]">
                      {op.cargo ? op.cargo.split('/')[0] : 'Operador'}
                    </p>
                  </div>

                  {/* Botón de Otorgar Permisos */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOperadorParaPermisos(op);
                    }}
                    className="w-6 h-6 rounded-lg bg-[#ECECEC]/60 dark:bg-white/10 hover:bg-[#190088] hover:text-white dark:hover:bg-[#97D6DF] dark:hover:text-[#190088] text-[#212121]/70 dark:text-white/70 flex items-center justify-center transition-all cursor-pointer"
                    title={`Otorgar permisos a ${op.nombre}`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CUERPO DEL PIPELINE: 3 ETAPAS PREDETERMINADAS DEL NEGOCIO ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-start mt-6">
          {etapas.map((etapa) => {
            const Icon = etapa.icon;
            const itemsEtapa = tareasFiltradas.filter((t) => t.etapaId === etapa.id);

            return (
              <div
                key={etapa.id}
                className="lg:col-span-3 bg-white dark:bg-[#1a1a2e]/60 border border-[#ECECEC] dark:border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[440px]"
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
                      {itemsEtapa.length}
                    </span>
                  </div>

                  {/* Lista de tareas fijas predeterminadas */}
                  <div className="space-y-3">
                    {itemsEtapa.map((item) => {
                      const opAsignado = operadores.find((o) => o.id === item.operadorAsignadoId);
                      const tienePermiso = opAsignado
                        ? tieneCapacidad(opAsignado, item.capacidadRequerida)
                        : false;

                      return (
                        <div
                          key={item.id}
                          className="bg-[#ECECEC]/30 dark:bg-white/5 border border-[#ECECEC]/80 dark:border-white/10 rounded-xl p-3 shadow-2xs hover:shadow-xs transition-all group relative"
                        >
                          {/* Fila superior: Responsable asignado y estado */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {opAsignado && (
                                <img
                                  src={
                                    opAsignado.avatarUrl ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      opAsignado.nombre
                                    )}&background=190088&color=fff`
                                  }
                                  alt={opAsignado.nombre}
                                  className="w-6 h-6 rounded-full object-cover shrink-0"
                                />
                              )}
                              {/* Selector desplegable de responsable */}
                              <select
                                value={item.operadorAsignadoId || ''}
                                onChange={(e) => reasignarOperador(item.id, e.target.value)}
                                className="text-[11px] font-bold text-[#190088] dark:text-[#97D6DF] bg-transparent border-none outline-none cursor-pointer max-w-[120px] truncate"
                              >
                                {operadores.map((op) => (
                                  <option
                                    key={op.id}
                                    value={op.id}
                                    className="dark:bg-[#212121] text-[#212121] dark:text-white"
                                  >
                                    {op.nombre}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleCompletada(item.id)}
                              className={`transition-colors cursor-pointer shrink-0 ${
                                item.completada
                                  ? 'text-[#10B981]'
                                  : 'text-[#212121]/30 dark:text-white/30 hover:text-[#10B981]'
                              }`}
                              title={item.completada ? 'Marcar pendiente' : 'Marcar completado'}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Título y descripción de la tarea */}
                          <p
                            className={`text-[13px] font-bold mt-2 leading-tight ${
                              item.completada
                                ? 'line-through text-[#212121]/50 dark:text-white/50'
                                : 'text-[#212121] dark:text-white'
                            }`}
                          >
                            {item.titulo}
                          </p>

                          <p className="text-[11px] font-light text-[#212121]/70 dark:text-[#ECECEC]/70 mt-1 leading-snug">
                            {item.descripcion}
                          </p>

                          {/* Insignia de permiso requerido */}
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 ${
                                tienePermiso
                                  ? 'bg-[#10B981]/10 text-[#10B981]'
                                  : 'bg-[#FF3F1A]/10 text-[#FF3F1A]'
                              }`}
                              title={
                                tienePermiso
                                  ? 'El operador cuenta con este permiso'
                                  : 'El operador no cuenta con este permiso en su rol'
                              }
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {CAPACIDAD_LABEL[item.capacidadRequerida] || item.capacidadRequerida}
                            </span>
                          </div>

                          {/* Pie: Fecha límite y botón para editar calendario */}
                          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#ECECEC]/50 dark:border-white/10 text-[11px] text-[#212121]/60 dark:text-[#ECECEC]/60">
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3" />
                              {item.fechaCompromiso}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setModalFechaTarea(item);
                                setNuevaFechaInput(item.fechaCompromiso);
                              }}
                              className="text-[#190088] dark:text-[#97D6DF] hover:underline font-bold cursor-pointer"
                            >
                              Cambiar fecha
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#ECECEC]/40 dark:border-white/10 mt-3 text-center">
                  <span className="text-[11px] text-[#212121]/50 dark:text-white/50">
                    Etapa activa y sincronizada
                  </span>
                </div>
              </div>
            );
          })}

          {/* ── CUARTA COLUMNA: ACCIONES OPERATIVAS & BALANCEO INTELIGENTE ── */}
          <div className="lg:col-span-3 bg-white dark:bg-[#1a1a2e]/60 border border-[#ECECEC] dark:border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[440px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#ECECEC] dark:border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#212121] dark:bg-white text-white dark:text-[#212121] flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#190088] dark:text-white leading-tight">
                      Acciones Operativas
                    </h4>
                    <p className="text-[11px] font-light text-[#212121]/60 dark:text-[#ECECEC]/60">
                      Balanceo & Automatización
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón destacado de Balanceo con IA */}
              <div className="space-y-2.5">
                <div
                  onClick={balancearCargasConIA}
                  className="bg-[#212121] dark:bg-white text-white dark:text-[#212121] p-3.5 rounded-xl shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold">Balancear Cargas con IA</span>
                    <Sparkles className="w-4 h-4 text-[#97D6DF] dark:text-[#FF3F1A]" />
                  </div>
                  <p className="text-[11px] text-white/70 dark:text-[#212121]/70 mt-1 leading-snug">
                    Distribuye las tareas fijas entre los operadores activos según sus capacidades y disponibilidad.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTareas((prev) => prev.map((t) => ({ ...t, completada: false })));
                    mostrarMensaje('Ciclo operativo reiniciado para el turno.');
                  }}
                  className="w-full text-left p-3 rounded-xl bg-[#ECECEC]/30 dark:bg-white/5 border border-[#ECECEC] dark:border-white/10 hover:border-[#190088] dark:hover:border-[#97D6DF] transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="text-[12px] font-medium text-[#212121] dark:text-[#ECECEC] group-hover:text-[#190088] dark:group-hover:text-white">
                    Reiniciar Ciclo del Turno
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#212121]/40 dark:text-white/40 group-hover:text-[#FF3F1A] transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTareas((prev) => prev.map((t) => ({ ...t, completada: true })));
                    mostrarMensaje('Todas las tareas del flujo marcadas como completadas.');
                  }}
                  className="w-full text-left p-3 rounded-xl bg-[#ECECEC]/30 dark:bg-white/5 border border-[#ECECEC] dark:border-white/10 hover:border-[#190088] dark:hover:border-[#97D6DF] transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="text-[12px] font-medium text-[#212121] dark:text-[#ECECEC] group-hover:text-[#190088] dark:group-hover:text-white">
                    Marcar Todas Completadas
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#212121]/40 dark:text-white/40 group-hover:text-[#FF3F1A] transition-colors" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#97D6DF]/20 dark:bg-[#97D6DF]/10 rounded-xl border border-[#97D6DF]/40 mt-4">
              <div className="flex items-center gap-2 text-[#190088] dark:text-[#97D6DF] text-[12px] font-bold">
                <UserCheck className="w-4 h-4" />
                <span>Capacidad del Turno</span>
              </div>
              <p className="text-[11px] text-[#212121]/80 dark:text-[#ECECEC]/80 mt-1">
                {operadoresConCarga.filter((o) => o.carga > 0).length} de {operadores.length} operadores con asignaciones activas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: OTORGAR / AJUSTAR PERMISOS RÁPIDOS A UN OPERADOR ── */}
      {operadorParaPermisos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1a1a2e] rounded-3xl p-6 max-w-lg w-full border border-[#ECECEC] dark:border-white/10 shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-[#ECECEC] dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={
                    operadorParaPermisos.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      operadorParaPermisos.nombre
                    )}&background=190088&color=fff`
                  }
                  alt={operadorParaPermisos.nombre}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-[16px] font-bold text-[#190088] dark:text-white">
                    Permisos de {operadorParaPermisos.nombre}
                  </h3>
                  <p className="text-[12px] text-[#212121]/60 dark:text-[#ECECEC]/60">
                    Rol: {operadorParaPermisos.cargo || 'Operador de Pedidos'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOperadorParaPermisos(null)}
                className="text-[#212121]/40 hover:text-[#FF3F1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              <p className="text-[12px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70">
                Haz clic en una capacidad para otorgarla o revocarla de inmediato para este operador:
              </p>
              {CAPACIDADES.map((cap) => {
                const activo = tieneCapacidad(operadorParaPermisos, cap);
                return (
                  <div
                    key={cap}
                    onClick={() => alternarPermiso(operadorParaPermisos, cap)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      activo
                        ? 'bg-[#190088]/5 dark:bg-[#97D6DF]/10 border-[#190088] dark:border-[#97D6DF]'
                        : 'bg-[#ECECEC]/20 dark:bg-white/5 border-transparent hover:border-[#ECECEC]'
                    }`}
                  >
                    <div>
                      <p className="text-[13px] font-bold text-[#212121] dark:text-white leading-tight">
                        {CAPACIDAD_LABEL[cap] || cap}
                      </p>
                      <p className="text-[10px] text-[#212121]/50 dark:text-[#ECECEC]/50 font-mono">
                        {cap}
                      </p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                        activo
                          ? 'bg-[#10B981] text-white'
                          : 'border border-[#ECECEC] dark:border-white/20'
                      }`}
                    >
                      {activo && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setOperadorParaPermisos(null)}
                className="px-5 py-2.5 rounded-xl bg-[#190088] text-white text-[13px] font-bold hover:bg-[#190088]/90 cursor-pointer shadow-xs"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CAMBIAR FECHA COMPROMISO / LÍMITE ── */}
      {modalFechaTarea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1a1a2e] rounded-3xl p-6 max-w-md w-full border border-[#ECECEC] dark:border-white/10 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-[#ECECEC] dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#190088] dark:text-[#97D6DF]" />
                <h3 className="text-[16px] font-bold text-[#190088] dark:text-white">
                  Fecha Límite
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalFechaTarea(null)}
                className="text-[#212121]/40 hover:text-[#FF3F1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[13px] font-medium text-[#212121] dark:text-white">
              {modalFechaTarea.titulo}
            </p>

            <div>
              <label className="text-[12px] font-bold text-[#212121]/70 dark:text-[#ECECEC]/70 block mb-1.5">
                Fecha o plazo límite del compromiso
              </label>
              <input
                type="text"
                value={nuevaFechaInput}
                onChange={(e) => setNuevaFechaInput(e.target.value)}
                placeholder="Ej. Hoy, 03:30 pm o 10 Noviembre"
                className="w-full h-11 px-3.5 rounded-xl border border-[#ECECEC] dark:border-white/10 bg-[#ECECEC]/20 dark:bg-white/5 text-[13px] text-[#212121] dark:text-white focus:outline-none focus:border-[#97D6DF]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalFechaTarea(null)}
                className="px-4 py-2 rounded-xl text-[13px] text-[#212121]/70 hover:bg-[#ECECEC]/50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarNuevaFecha}
                className="px-5 py-2 rounded-xl bg-[#190088] text-white text-[13px] font-bold hover:bg-[#190088]/90 cursor-pointer shadow-xs"
              >
                Actualizar Fecha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default OperadoresFlujoJourneyView;
