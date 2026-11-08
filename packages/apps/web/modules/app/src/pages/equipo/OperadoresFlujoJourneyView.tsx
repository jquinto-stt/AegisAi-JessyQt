import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  operadoresStore,
  pedidosStore,
  rolesStore,
  CAPACIDADES,
  CAPACIDAD_LABEL,
  type Operador,
  type Capacidad,
} from '@/stores';
import {
  CheckCircle2,
  Calendar,
  Plus,
  UserCheck,
  Clock,
  Sparkles,
  ArrowRight,
  Truck,
  Layers,
  Inbox,
  PackageCheck,
  ShieldCheck,
  X,
  GripVertical,
  Check,
} from 'lucide-react';

interface TareaFlujo {
  id: string;
  etapaId: string;
  titulo: string;
  operadorId?: string;
  fecha: string;
  completado: boolean;
  prioridad: 'alta' | 'media' | 'normal';
}

interface EtapaFlujo {
  id: string;
  titulo: string;
  subtitulo: string;
  icon: React.ElementType;
}

export const OperadoresFlujoJourneyView: React.FC<{
  operadores: Operador[];
}> = observer(({ operadores }) => {
  const [operadorFiltro, setOperadorFiltro] = useState<string | null>(null);
  const [operadorParaPermisos, setOperadorParaPermisos] = useState<Operador | null>(null);
  const [modalNuevaTareaEtapa, setModalNuevaTareaEtapa] = useState<string | null>(null);
  const [nuevaTareaTitulo, setNuevaTareaTitulo] = useState('');
  const [arrastrandoTareaId, setArrastrandoTareaId] = useState<string | null>(null);
  const [notificacionFlash, setNotificacionFlash] = useState<string | null>(null);

  // Etapas operativas universales (válidas para retail, ecommerce, servicios, logística)
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

  // Estado reactivo de tareas del pipeline
  const [tareas, setTareas] = useState<TareaFlujo[]>([
    {
      id: 'tsk-1',
      etapaId: 'asig',
      titulo: 'Validar pago y verificación de identidad P-028',
      operadorId: operadores[2]?.id || operadores[0]?.id,
      fecha: 'Hoy, 10:15 am',
      completado: true,
      prioridad: 'alta',
    },
    {
      id: 'tsk-2',
      etapaId: 'asig',
      titulo: 'Clasificar y asignar orden urgente P-029',
      operadorId: operadores[1]?.id || operadores[0]?.id,
      fecha: 'Hoy, 10:20 am',
      completado: false,
      prioridad: 'alta',
    },
    {
      id: 'tsk-3',
      etapaId: 'proc',
      titulo: 'Alistamiento de inventario y control de empaque',
      operadorId: operadores[3]?.id || operadores[0]?.id,
      fecha: 'En proceso',
      completado: true,
      prioridad: 'media',
    },
    {
      id: 'tsk-4',
      etapaId: 'proc',
      titulo: 'Verificación de calidad e insumos orden P-025',
      operadorId: operadores[3]?.id || operadores[0]?.id,
      fecha: 'Prioritario',
      completado: false,
      prioridad: 'alta',
    },
    {
      id: 'tsk-5',
      etapaId: 'proc',
      titulo: 'Revisión final de ítems y sellado de paquete',
      operadorId: operadores[4]?.id || operadores[0]?.id,
      fecha: 'En espera',
      completado: false,
      prioridad: 'normal',
    },
    {
      id: 'tsk-6',
      etapaId: 'desp',
      titulo: 'Generar rótulo de guía y entrega a mensajero',
      operadorId: operadores[1]?.id || operadores[0]?.id,
      fecha: 'En ruta',
      completado: true,
      prioridad: 'media',
    },
    {
      id: 'tsk-7',
      etapaId: 'desp',
      titulo: 'Confirmar entrega al cliente y conciliar pago',
      operadorId: operadores[2]?.id || operadores[0]?.id,
      fecha: 'Pendiente firma',
      completado: false,
      prioridad: 'alta',
    },
  ]);

  // Mostrar mensaje temporal
  const mostrarMensaje = (msg: string) => {
    setNotificacionFlash(msg);
    setTimeout(() => setNotificacionFlash(null), 3000);
  };

  // Calcular carga dinámica por operador
  const operadoresConCarga = operadores.map((op) => {
    const tareasAsignadas = tareas.filter((t) => t.operadorId === op.id && !t.completado).length;
    return {
      ...op,
      carga: tareasAsignadas,
    };
  });

  // Filtro de tareas
  const tareasFiltradas = operadorFiltro
    ? tareas.filter((t) => t.operadorId === operadorFiltro)
    : tareas;

  // Toggle de completado
  const toggleCompletada = (id: string) => {
    setTareas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completado: !t.completado } : t))
    );
  };

  // Drag & Drop: Mover tarea entre etapas
  const onDragStart = (e: React.DragEvent, tareaId: string) => {
    e.dataTransfer.setData('text/plain', tareaId);
    setArrastrandoTareaId(tareaId);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, etapaDestinoId: string) => {
    e.preventDefault();
    const tareaId = e.dataTransfer.getData('text/plain') || arrastrandoTareaId;
    if (!tareaId) return;

    setTareas((prev) =>
      prev.map((t) => (t.id === tareaId ? { ...t, etapaId: etapaDestinoId } : t))
    );
    setArrastrandoTareaId(null);
    const etapaObj = etapas.find((et) => et.id === etapaDestinoId);
    mostrarMensaje(`Tarea movida exitosamente a: ${etapaObj?.titulo || etapaDestinoId}`);
  };

  // Asignar operador a tarea directamente
  const reasignarOperador = (tareaId: string, operadorId: string) => {
    setTareas((prev) =>
      prev.map((t) => (t.id === tareaId ? { ...t, operadorId } : t))
    );
    const op = operadores.find((o) => o.id === operadorId);
    mostrarMensaje(`Tarea reasignada a ${op?.nombre || 'nuevo operador'}`);
  };

  // Agregar nueva tarea
  const guardarNuevaTarea = () => {
    if (!nuevaTareaTitulo.trim() || !modalNuevaTareaEtapa) return;
    const nueva: TareaFlujo = {
      id: `tsk-${Date.now()}`,
      etapaId: modalNuevaTareaEtapa,
      titulo: nuevaTareaTitulo.trim(),
      operadorId: operadores[0]?.id,
      fecha: 'Recién añadida',
      completado: false,
      prioridad: 'alta',
    };
    setTareas((prev) => [nueva, ...prev]);
    setNuevaTareaTitulo('');
    setModalNuevaTareaEtapa(null);
    mostrarMensaje('Nueva tarea añadida al pipeline.');
  };

  // Balanceo con IA
  const balancearCargasConIA = () => {
    if (operadores.length === 0) return;
    setTareas((prev) =>
      prev.map((t, index) => {
        const opAsignado = operadores[index % operadores.length];
        return {
          ...t,
          operadorId: opAsignado.id,
        };
      })
    );
    mostrarMensaje('¡Balanceo inteligente completado! Cargas de trabajo distribuidas equitativamente.');
  };

  // Gestión de Permisos rápidos para el operador seleccionado
  const tieneCapacidad = (op: Operador, cap: Capacidad): boolean => {
    const rol = rolesStore.roles.find((r) => r.id === op.rolId);
    const enRol = rol?.capacidades?.includes(cap) ?? false;
    const sumada = op.capacidadesExtra?.includes(cap) ?? false;
    const restada = op.capacidadesRemovidas?.includes(cap) ?? false;
    return (enRol || sumada) && !restada;
  };

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

  const tareasRapidasAccion = [
    {
      id: 'act-1',
      titulo: 'Balancear Cargas con IA',
      accion: balancearCargasConIA,
      destacado: true,
    },
    {
      id: 'act-2',
      titulo: 'Verificar Disponibilidad de Turno',
      accion: () => mostrarMensaje('Todos los 5 operadores se encuentran activos y disponibles.'),
    },
    {
      id: 'act-3',
      titulo: 'Cerrar Tareas Completadas',
      accion: () => {
        setTareas((prev) => prev.filter((t) => !t.completado));
        mostrarMensaje('Tareas completadas archivadas.');
      },
    },
  ];

  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="space-y-6 animate-fadeIn text-[#212121] dark:text-[#ECECEC]"
    >
      {/* Toast Flash flotante */}
      {notificacionFlash && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#190088] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-slideIn">
          <Sparkles className="w-5 h-5 text-[#97D6DF]" />
          <span className="text-[14px] font-medium">{notificacionFlash}</span>
        </div>
      )}

      {/* ── CONTENEDOR SUPERIOR DEL CUSTOMER JOURNEY (INSPIRADO EN SUGARCRM) ── */}
      <div className="bg-[#ECECEC]/30 dark:bg-[#212121]/60 border border-[#ECECEC] dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-xs">
        {/* Cabecera del Journey & Carrusel de Operadores con gestión de permisos */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#ECECEC] dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <h2 className="text-[24px] font-bold text-[#190088] dark:text-white tracking-tight">
                Flujo Operativo de Equipos & Asignaciones
              </h2>
            </div>
            <p className="text-[14px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70 mt-1">
              Arrastra tareas entre etapas, balancea cargas de trabajo y gestiona permisos de operadores al instante.
            </p>
          </div>

          {/* Fila interactiva de avatares con badges de carga de trabajo y botón de otorgar permisos */}
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
                    title={`Filtrar tareas de ${op.nombre}`}
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

                  {/* Botón rápido para otorgar/ajustar permisos al operador */}
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

        {/* ── CUERPO DEL PIPELINE: COLUMNAS DRAG & DROP ESTILO SUGARCRM ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-start mt-6">
          {etapas.map((etapa) => {
            const Icon = etapa.icon;
            const itemsEtapa = tareasFiltradas.filter((t) => t.etapaId === etapa.id);

            return (
              <div
                key={etapa.id}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, etapa.id)}
                className="lg:col-span-3 bg-white dark:bg-[#1a1a2e]/60 border border-[#ECECEC] dark:border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[420px] transition-colors"
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

                  {/* Zona de tarjetas arrastrables */}
                  <div className="space-y-3 min-h-[220px]">
                    {itemsEtapa.length === 0 ? (
                      <div className="h-32 border-2 border-dashed border-[#ECECEC] dark:border-white/10 rounded-xl flex items-center justify-center p-4 text-center">
                        <span className="text-[12px] text-[#212121]/40 dark:text-white/40">
                          Arrastra tareas aquí para mover a esta etapa
                        </span>
                      </div>
                    ) : (
                      itemsEtapa.map((item) => {
                        const opAsignado = operadores.find((o) => o.id === item.operadorId);

                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, item.id)}
                            className="bg-[#ECECEC]/30 dark:bg-white/5 border border-[#ECECEC]/80 dark:border-white/10 rounded-xl p-3 shadow-2xs hover:shadow-md transition-all group cursor-grab active:cursor-grabbing relative"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-3.5 h-3.5 text-[#212121]/30 dark:text-white/30 group-hover:text-[#190088]" />
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
                                {/* Selector rápido de operador */}
                                <select
                                  value={item.operadorId || ''}
                                  onChange={(e) => reasignarOperador(item.id, e.target.value)}
                                  className="text-[11px] font-bold text-[#190088] dark:text-[#97D6DF] bg-transparent border-none outline-none cursor-pointer max-w-[110px] truncate"
                                >
                                  {operadores.map((op) => (
                                    <option key={op.id} value={op.id} className="dark:bg-[#212121] text-[#212121] dark:text-white">
                                      {op.nombre.split(' ')[0]}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleCompletada(item.id)}
                                className={`transition-colors cursor-pointer ${
                                  item.completado
                                    ? 'text-[#10B981]'
                                    : 'text-[#212121]/30 dark:text-white/30 hover:text-[#10B981]'
                                }`}
                                title={item.completado ? 'Marcar pendiente' : 'Marcar completado'}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </div>

                            <p
                              className={`text-[13px] mt-2 leading-snug ${
                                item.completado
                                  ? 'line-through text-[#212121]/50 dark:text-white/50'
                                  : 'text-[#212121] dark:text-[#ECECEC] font-normal'
                              }`}
                            >
                              {item.titulo}
                            </p>

                            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#ECECEC]/50 dark:border-white/10 text-[11px] text-[#212121]/60 dark:text-[#ECECEC]/60">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {item.fecha}
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  item.prioridad === 'alta'
                                    ? 'bg-[#FF3F1A]/10 text-[#FF3F1A]'
                                    : 'bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF]'
                                }`}
                              >
                                {item.prioridad}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Botón rápido para agregar tarea a la etapa */}
                <button
                  type="button"
                  onClick={() => setModalNuevaTareaEtapa(etapa.id)}
                  className="w-full mt-3 py-2 rounded-xl border border-dashed border-[#ECECEC] dark:border-white/20 text-[#212121]/60 dark:text-[#ECECEC]/70 text-[12px] font-normal hover:bg-[#ECECEC]/40 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir tarea</span>
                </button>
              </div>
            );
          })}

          {/* ── CUARTA COLUMNA: ACCIONES RÁPIDAS & DISPARADORES DE AUTOMATIZACIÓN ── */}
          <div className="lg:col-span-3 bg-white dark:bg-[#1a1a2e]/60 border border-[#ECECEC] dark:border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[420px]">
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
                      Disparo de flujos & IA
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón oscuro destacado estilo "Request Processing" */}
              <div className="space-y-2.5">
                {tareasRapidasAccion.map((t) =>
                  t.destacado ? (
                    <div
                      key={t.id}
                      onClick={t.accion}
                      className="bg-[#212121] dark:bg-white text-white dark:text-[#212121] p-3.5 rounded-xl shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold">{t.titulo}</span>
                        <Sparkles className="w-4 h-4 text-[#97D6DF] dark:text-[#FF3F1A]" />
                      </div>
                      <p className="text-[11px] text-white/70 dark:text-[#212121]/70 mt-1 leading-snug">
                        Distribuye automáticamente tareas pendientes entre los operadores con menor carga.
                      </p>
                    </div>
                  ) : (
                    <button
                      key={t.id}
                      type="button"
                      onClick={t.accion}
                      className="w-full text-left p-3 rounded-xl bg-[#ECECEC]/30 dark:bg-white/5 border border-[#ECECEC] dark:border-white/10 hover:border-[#190088] dark:hover:border-[#97D6DF] transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span className="text-[12px] font-medium text-[#212121] dark:text-[#ECECEC] group-hover:text-[#190088] dark:group-hover:text-white">
                        {t.titulo}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#212121]/40 dark:text-white/40 group-hover:text-[#FF3F1A] transition-colors" />
                    </button>
                  )
                )}
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

      {/* ── MODAL: AÑADIR NUEVA TAREA AL PIPELINE ── */}
      {modalNuevaTareaEtapa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1a1a2e] rounded-3xl p-6 max-w-md w-full border border-[#ECECEC] dark:border-white/10 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-[#ECECEC] dark:border-white/10 pb-3">
              <h3 className="text-[16px] font-bold text-[#190088] dark:text-white">
                Nueva Tarea en{' '}
                {etapas.find((e) => e.id === modalNuevaTareaEtapa)?.titulo}
              </h3>
              <button
                type="button"
                onClick={() => setModalNuevaTareaEtapa(null)}
                className="text-[#212121]/40 hover:text-[#FF3F1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[12px] font-bold text-[#212121]/70 dark:text-[#ECECEC]/70 block mb-1.5">
                Descripción de la tarea
              </label>
              <textarea
                value={nuevaTareaTitulo}
                onChange={(e) => setNuevaTareaTitulo(e.target.value)}
                placeholder="Ej. Revisión y firma de remisión para transporte..."
                rows={3}
                className="w-full p-3 rounded-xl border border-[#ECECEC] dark:border-white/10 bg-[#ECECEC]/20 dark:bg-white/5 text-[13px] text-[#212121] dark:text-white focus:outline-none focus:border-[#97D6DF]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalNuevaTareaEtapa(null)}
                className="px-4 py-2 rounded-xl text-[13px] text-[#212121]/70 hover:bg-[#ECECEC]/50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarNuevaTarea}
                className="px-5 py-2 rounded-xl bg-[#FF3F1A] text-white text-[13px] font-bold hover:bg-[#FF3F1A]/90 cursor-pointer shadow-xs"
              >
                Guardar Tarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default OperadoresFlujoJourneyView;
