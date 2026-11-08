import React, { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router';
import {
  operadoresStore,
  rolesStore,
  CAPACIDADES,
  CAPACIDAD_LABEL,
  type Operador,
  type Capacidad,
} from '@/stores';
import {
  CalendarDays,
  CheckCheck,
  Download,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// FLUJO DE ASIGNACIÓN DEL EQUIPO
// ═══════════════════════════════════════════════════════════════════════════
//
// Las tareas son FIJAS: forman el ciclo de cada orden y no se crean ni se
// arrastran. Lo que el admin decide es QUIÉN las hace y PARA CUÁNDO.
//
// La jerarquía visual sale del estado de cada fila, no de colores extra:
//   - hecha     → texto regular + doble check + botón de calendario
//   - en curso  → texto en negrita + menú «…» + fecha límite
//   - pendiente → texto atenuado + círculo «+» (aún no tiene responsable)
//
// ═══════════════════════════════════════════════════════════════════════════

type EtapaId = 'asig' | 'proc' | 'desp';
type EstadoTarea = 'hecha' | 'en_curso' | 'pendiente';

interface Tarea {
  id: string;
  etapaId: EtapaId;
  titulo: string;
  capacidad: Capacidad;
  operadorId?: string;
  fechaLimite: string; // ISO
  completada: boolean;
}

const ETAPAS: { id: EtapaId; titulo: string }[] = [
  { id: 'asig', titulo: 'Asignación' },
  { id: 'proc', titulo: 'Procesamiento' },
  { id: 'desp', titulo: 'Despacho' },
];

/** Alto fijo de fila: las líneas de conexión se calculan con él. */
const ALTO_FILA = 64;
const GAP_FILA = 4;
const PAD_TARJETA = 8;
const centroFila = (i: number) => PAD_TARJETA + i * (ALTO_FILA + GAP_FILA) + ALTO_FILA / 2;
const altoTarjeta = (n: number) => PAD_TARJETA * 2 + n * ALTO_FILA + Math.max(0, n - 1) * GAP_FILA;

const enHoras = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const estadoDe = (t: Tarea): EstadoTarea =>
  t.completada ? 'hecha' : t.operadorId ? 'en_curso' : 'pendiente';

const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

/** `datetime-local` necesita hora local sin zona. */
const isoALocal = (iso: string) => {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

const avatarDe = (op: Operador) =>
  op.avatarUrl ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(op.nombre)}&background=190088&color=fff`;

const tieneCapacidad = (op: Operador | undefined, cap: Capacidad) =>
  !!op && rolesStore.capacidadesEfectivas(op).includes(cap);

export interface OperadoresFlujoJourneyViewProps {
  operadores: Operador[];
  onGestionarRoles?: () => void;
}

export const OperadoresFlujoJourneyView: React.FC<OperadoresFlujoJourneyViewProps> = observer(
  ({ operadores, onGestionarRoles }) => {
    const navigate = useNavigate();
    const op = (i: number) => operadores[i]?.id;

    const [tareas, setTareas] = useState<Tarea[]>(() => [
      { id: 't1', etapaId: 'asig', titulo: 'Validar pago', capacidad: 'orders.confirm', operadorId: op(2), fechaLimite: enHoras(-2), completada: true },
      { id: 't2', etapaId: 'asig', titulo: 'Clasificar prioridad', capacidad: 'orders.create', operadorId: op(1), fechaLimite: enHoras(-1), completada: true },
      { id: 't3', etapaId: 'asig', titulo: 'Confirmar datos de entrega', capacidad: 'orders.edit', operadorId: op(1), fechaLimite: enHoras(1), completada: false },
      { id: 't4', etapaId: 'proc', titulo: 'Verificar inventario', capacidad: 'preparation.read', operadorId: op(3), fechaLimite: enHoras(-1), completada: true },
      { id: 't5', etapaId: 'proc', titulo: 'Alistar y empacar', capacidad: 'preparation.manage', operadorId: op(3), fechaLimite: enHoras(2), completada: false },
      { id: 't6', etapaId: 'proc', titulo: 'Control de calidad', capacidad: 'preparation.manage', operadorId: op(4), fechaLimite: enHoras(3), completada: false },
      { id: 't7', etapaId: 'proc', titulo: 'Adjuntar remisión', capacidad: 'orders.edit', fechaLimite: enHoras(3), completada: false },
      { id: 't8', etapaId: 'desp', titulo: 'Generar guía de envío', capacidad: 'orders.edit', fechaLimite: enHoras(4), completada: false },
      { id: 't9', etapaId: 'desp', titulo: 'Entregar al transportador', capacidad: 'orders.edit', operadorId: op(1), fechaLimite: enHoras(5), completada: false },
      { id: 't10', etapaId: 'desp', titulo: 'Confirmar entrega', capacidad: 'orders.confirm', fechaLimite: enHoras(6), completada: false },
    ]);

    const [filtroOp, setFiltroOp] = useState<string | null>(null);
    const [menu, setMenu] = useState<{ tareaId: string; tipo: 'acciones' | 'asignar' } | null>(null);
    const [tareaFecha, setTareaFecha] = useState<Tarea | null>(null);
    const [fechaInput, setFechaInput] = useState('');
    const [permisosOpId, setPermisosOpId] = useState<string | null>(null);
    const [vencimientosAbierto, setVencimientosAbierto] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const avisar = (msg: string) => {
      setToast(msg);
      window.setTimeout(() => setToast(null), 3000);
    };

    const carga = useMemo(() => {
      const m: Record<string, number> = {};
      for (const t of tareas) if (t.operadorId && !t.completada) m[t.operadorId] = (m[t.operadorId] ?? 0) + 1;
      return m;
    }, [tareas]);

    const actualizar = (id: string, cambios: Partial<Tarea>) =>
      setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, ...cambios } : t)));

    const asignar = (tarea: Tarea, operador: Operador) => {
      actualizar(tarea.id, { operadorId: operador.id });
      setMenu(null);
      avisar(
        tieneCapacidad(operador, tarea.capacidad)
          ? `«${tarea.titulo}» asignada a ${operador.nombre}.`
          : `${operador.nombre} no tiene el permiso «${CAPACIDAD_LABEL[tarea.capacidad]}». Otórgaselo desde el menú.`
      );
    };

    /** Elige al operador con menos carga que tenga la capacidad; si nadie la tiene, al de menos carga. */
    const mejorCandidato = (cap: Capacidad, cargaActual: Record<string, number>) => {
      const conPermiso = operadores.filter((o) => tieneCapacidad(o, cap));
      const pool = conPermiso.length ? conPermiso : operadores;
      return [...pool].sort((a, b) => (cargaActual[a.id] ?? 0) - (cargaActual[b.id] ?? 0))[0];
    };

    const asignarPendientes = () => {
      const c = { ...carga };
      let n = 0;
      setTareas((prev) =>
        prev.map((t) => {
          if (t.operadorId || t.completada) return t;
          const elegido = mejorCandidato(t.capacidad, c);
          if (!elegido) return t;
          c[elegido.id] = (c[elegido.id] ?? 0) + 1;
          n++;
          return { ...t, operadorId: elegido.id };
        })
      );
      avisar(n ? `${n} tareas sin responsable fueron asignadas.` : 'No hay tareas sin responsable.');
    };

    const balancear = () => {
      const c: Record<string, number> = {};
      setTareas((prev) =>
        prev.map((t) => {
          if (t.completada) return t;
          const elegido = mejorCandidato(t.capacidad, c);
          if (!elegido) return t;
          c[elegido.id] = (c[elegido.id] ?? 0) + 1;
          return { ...t, operadorId: elegido.id };
        })
      );
      avisar('Cargas balanceadas según permisos y disponibilidad.');
    };

    const alternarPermiso = (operador: Operador, cap: Capacidad) => {
      const enRol = rolesStore.capacidadesDe(operador.rolId).includes(cap);
      const activa = tieneCapacidad(operador, cap);
      let extra = [...(operador.capacidadesExtra ?? [])];
      let removidas = [...(operador.capacidadesRemovidas ?? [])];

      if (activa) {
        if (enRol) removidas = [...new Set([...removidas, cap])];
        extra = extra.filter((c) => c !== cap);
      } else {
        removidas = removidas.filter((c) => c !== cap);
        if (!enRol) extra = [...new Set([...extra, cap])];
      }

      operadoresStore.setCapacidadesExtra(operador.id, extra);
      operadoresStore.setCapacidadesRemovidas(operador.id, removidas);
    };

    const otorgarRequerido = (tarea: Tarea) => {
      const operador = operadoresStore.porId(tarea.operadorId);
      if (!operador) return;
      alternarPermiso(operador, tarea.capacidad);
      setMenu(null);
      avisar(`Permiso «${CAPACIDAD_LABEL[tarea.capacidad]}» otorgado a ${operador.nombre}.`);
    };

    const exportarCsv = () => {
      const filas = [['Etapa', 'Tarea', 'Responsable', 'Fecha límite', 'Estado']];
      for (const t of tareas) {
        filas.push([
          ETAPAS.find((e) => e.id === t.etapaId)?.titulo ?? t.etapaId,
          t.titulo,
          operadoresStore.porId(t.operadorId)?.nombre ?? 'Sin asignar',
          formatearFecha(t.fechaLimite),
          { hecha: 'Hecha', en_curso: 'En curso', pendiente: 'Sin responsable' }[estadoDe(t)],
        ]);
      }
      const csv = filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
      const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'asignaciones-equipo.csv';
      a.click();
      URL.revokeObjectURL(url);
    };

    const abrirFecha = (t: Tarea) => {
      setTareaFecha(t);
      setFechaInput(isoALocal(t.fechaLimite));
      setMenu(null);
    };

    const guardarFecha = () => {
      if (!tareaFecha || !fechaInput) return;
      actualizar(tareaFecha.id, { fechaLimite: new Date(fechaInput).toISOString() });
      setTareaFecha(null);
      avisar('Fecha límite actualizada.');
    };

    const sinResponsable = tareas.filter((t) => !t.operadorId && !t.completada).length;
    const vencidas = tareas.filter((t) => !t.completada && new Date(t.fechaLimite).getTime() < Date.now());

    const pasos = [
      { id: 'balancear', label: 'Balancear cargas', accion: balancear, principal: true },
      { id: 'pendientes', label: `Asignar pendientes${sinResponsable ? ` (${sinResponsable})` : ''}`, accion: asignarPendientes },
      { id: 'permisos', label: 'Permisos del equipo', accion: () => setPermisosOpId(filtroOp ?? operadores[0]?.id ?? null) },
      { id: 'roles', label: 'Gestionar roles', accion: () => onGestionarRoles?.() },
      {
        id: 'reiniciar',
        label: 'Reiniciar turno',
        accion: () => {
          setTareas((prev) => prev.map((t) => ({ ...t, completada: false })));
          avisar('Turno reiniciado: todas las tareas vuelven a quedar abiertas.');
        },
      },
      { id: 'tablero', label: 'Ver tablero de pedidos', accion: () => navigate('/pedidos/tablero') },
    ];

    const opPermisos = operadoresStore.porId(permisosOpId);
    const botonCirculo =
      'w-10 h-10 rounded-full border border-[#212121]/15 dark:border-white/15 flex items-center justify-center text-[#212121]/70 dark:text-[#ECECEC]/70 hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer';

    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="text-[#212121] dark:text-[#ECECEC]">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#190088] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#97D6DF]" />
            <span className="text-[14px] font-normal">{toast}</span>
          </div>
        )}

        {/* Cierra cualquier menú abierto al hacer clic fuera */}
        {menu && <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(null)} />}

        <section className="rounded-[32px] bg-[#ECECEC]/70 dark:bg-white/[0.03] border border-[#ECECEC] dark:border-white/10 p-5 sm:p-6">
          {/* ── Cabecera: título · equipo · acciones ── */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-6">
            <div>
              <h2 className="text-[24px] font-bold text-[#190088] dark:text-white tracking-tight">Flujo de asignación</h2>
              <p className="text-[14px] font-light text-[#212121]/70 dark:text-[#ECECEC]/70">
                Quién hace cada paso del ciclo de una orden y para cuándo.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white/70 dark:bg-white/[0.06] px-3 pt-2 pb-4 overflow-x-auto scrollbar-none">
              {operadores.map((o) => {
                const n = carga[o.id] ?? 0;
                const activo = filtroOp === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setFiltroOp(activo ? null : o.id)}
                    title={`${o.nombre} · ${n} tareas abiertas`}
                    className="relative shrink-0 cursor-pointer"
                  >
                    <img
                      src={avatarDe(o)}
                      alt={o.nombre}
                      className={`w-11 h-11 rounded-full object-cover ring-2 transition-all ${
                        activo
                          ? 'ring-[#190088] dark:ring-[#97D6DF] scale-105'
                          : filtroOp
                            ? 'ring-transparent opacity-40'
                            : 'ring-white dark:ring-white/20'
                      }`}
                    />
                    <span
                      className={`absolute -bottom-2 left-1/2 -translate-x-1/2 min-w-5 h-5 px-1 rounded-full text-[12px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#1c1c22] ${
                        n === 0
                          ? 'bg-white text-[#212121]/50 dark:bg-white/20 dark:text-[#ECECEC]'
                          : n > 2
                            ? 'bg-[#FF3F1A] text-white'
                            : 'bg-[#97D6DF] text-[#190088]'
                      }`}
                    >
                      {n === 0 ? '+' : n}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {filtroOp && (
                <button
                  type="button"
                  onClick={() => setPermisosOpId(filtroOp)}
                  className="h-10 px-4 rounded-full border border-[#212121]/15 dark:border-white/15 text-[12px] font-bold text-[#190088] dark:text-[#97D6DF] flex items-center gap-1.5 hover:bg-white dark:hover:bg-white/10 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Permisos de {operadoresStore.porId(filtroOp)?.nombre.split(' ')[0]}
                </button>
              )}
              <button type="button" onClick={asignarPendientes} className={botonCirculo} title="Asignar tareas sin responsable">
                <Plus className="w-4 h-4" />
              </button>
              <button type="button" onClick={exportarCsv} className={botonCirculo} title="Exportar asignaciones (CSV)">
                <Download className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setVencimientosAbierto(true)} className={`${botonCirculo} relative`} title="Vencimientos">
                <CalendarDays className="w-4 h-4" />
                {vencidas.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF3F1A]" />}
              </button>
            </div>
          </div>

          {/* ── Cuerpo: etapas conectadas + siguientes pasos ── */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-0">
            {ETAPAS.map((etapa, idx) => {
              const filas = tareas.filter((t) => t.etapaId === etapa.id);
              const anterior = idx > 0 ? tareas.filter((t) => t.etapaId === ETAPAS[idx - 1].id) : [];
              const hechas = filas.filter((t) => t.completada).length;

              return (
                <React.Fragment key={etapa.id}>
                  {/* Conectores con la etapa anterior */}
                  {idx > 0 && (
                    <svg
                      className="hidden lg:block shrink-0 w-10"
                      height={Math.max(altoTarjeta(filas.length), altoTarjeta(anterior.length))}
                      aria-hidden
                    >
                      {filas.map((t, j) => {
                        const i = Math.min(j, anterior.length - 1);
                        const y1 = centroFila(i);
                        const y2 = centroFila(j);
                        const hecha = t.completada;
                        return (
                          <path
                            key={t.id}
                            d={`M0 ${y1} C20 ${y1}, 20 ${y2}, 40 ${y2}`}
                            fill="none"
                            strokeWidth={1.5}
                            strokeDasharray={hecha ? undefined : '4 4'}
                            className={hecha ? 'stroke-[#190088]/40 dark:stroke-[#97D6DF]/60' : 'stroke-[#FF3F1A]/60'}
                          />
                        );
                      })}
                    </svg>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="relative rounded-[28px] bg-white dark:bg-white/[0.05] shadow-xs" style={{ padding: PAD_TARJETA }}>
                      <div className="flex flex-col" style={{ gap: GAP_FILA }}>
                        {filas.map((t) => {
                          const estado = estadoDe(t);
                          const responsable = operadoresStore.porId(t.operadorId);
                          const sinPermiso = !!responsable && !tieneCapacidad(responsable, t.capacidad);
                          const vencida = !t.completada && new Date(t.fechaLimite).getTime() < Date.now();
                          const atenuada = filtroOp !== null && t.operadorId !== filtroOp;
                          const menuAbierto = menu?.tareaId === t.id;

                          return (
                            <div
                              key={t.id}
                              className={`relative flex items-center gap-3 px-2 rounded-[20px] transition-opacity ${atenuada ? 'opacity-30' : ''} ${menuAbierto ? 'z-20' : ''}`}
                              style={{ height: ALTO_FILA }}
                            >
                              {/* Punto de conexión en los bordes */}
                              <span className="hidden lg:block absolute -left-[13px] w-2 h-2 rounded-full bg-[#ECECEC] dark:bg-white/20 ring-2 ring-white dark:ring-[#1c1c22]" />
                              <span className="hidden lg:block absolute -right-[13px] w-2 h-2 rounded-full bg-[#ECECEC] dark:bg-white/20 ring-2 ring-white dark:ring-[#1c1c22]" />

                              {/* Avatar o «+» */}
                              {responsable ? (
                                <div className="relative shrink-0">
                                  <img src={avatarDe(responsable)} alt={responsable.nombre} title={responsable.nombre} className="w-10 h-10 rounded-full object-cover" />
                                  {sinPermiso && (
                                    <span
                                      title={`Sin permiso: ${CAPACIDAD_LABEL[t.capacidad]}`}
                                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FF3F1A] ring-2 ring-white dark:ring-[#1c1c22]"
                                    />
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setMenu({ tareaId: t.id, tipo: 'asignar' })}
                                  title="Asignar responsable"
                                  className="w-10 h-10 shrink-0 rounded-full bg-[#ECECEC]/60 dark:bg-white/10 flex items-center justify-center text-[#212121]/60 dark:text-[#ECECEC]/70 hover:bg-[#97D6DF]/40 cursor-pointer"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}

                              {/* Título */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-[14px] leading-tight truncate ${
                                    estado === 'en_curso'
                                      ? 'font-bold text-[#212121] dark:text-white'
                                      : estado === 'hecha'
                                        ? 'font-normal text-[#212121]/80 dark:text-[#ECECEC]/80'
                                        : 'font-light text-[#212121]/45 dark:text-[#ECECEC]/45'
                                  }`}
                                >
                                  {t.titulo}
                                </p>
                                {estado === 'en_curso' && (
                                  <p className={`text-[12px] font-light mt-0.5 ${vencida ? 'text-[#FF3F1A]' : 'text-[#212121]/55 dark:text-[#ECECEC]/55'}`}>
                                    {vencida ? 'Vencida · ' : 'Hasta '}
                                    {formatearFecha(t.fechaLimite)}
                                  </p>
                                )}
                              </div>

                              {/* Acciones según estado */}
                              {estado === 'hecha' && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => actualizar(t.id, { completada: false })}
                                    title="Reabrir tarea"
                                    className="text-[#212121]/70 dark:text-[#ECECEC]/70 hover:text-[#FF3F1A] cursor-pointer"
                                  >
                                    <CheckCheck className="w-4 h-4" />
                                  </button>
                                  <button type="button" onClick={() => abrirFecha(t)} className={botonCirculo} title="Fecha límite">
                                    <CalendarDays className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              {estado === 'en_curso' && (
                                <button
                                  type="button"
                                  onClick={() => setMenu(menuAbierto ? null : { tareaId: t.id, tipo: 'acciones' })}
                                  title="Opciones"
                                  className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[#212121]/70 dark:text-[#ECECEC]/70 hover:bg-[#ECECEC]/60 dark:hover:bg-white/10 cursor-pointer"
                                >
                                  <MoreHorizontal className="w-5 h-5" />
                                </button>
                              )}

                              {/* Menú de acciones */}
                              {menuAbierto && menu?.tipo === 'acciones' && (
                                <div className="absolute right-2 top-14 z-30 w-60 rounded-2xl bg-white dark:bg-[#26262e] border border-[#ECECEC] dark:border-white/10 shadow-xl p-1.5">
                                  {[
                                    { label: 'Marcar como hecha', fn: () => { actualizar(t.id, { completada: true }); setMenu(null); } },
                                    { label: 'Cambiar responsable', fn: () => setMenu({ tareaId: t.id, tipo: 'asignar' }) },
                                    { label: 'Cambiar fecha límite', fn: () => abrirFecha(t) },
                                    ...(sinPermiso ? [{ label: `Otorgar «${CAPACIDAD_LABEL[t.capacidad]}»`, fn: () => otorgarRequerido(t), alerta: true }] : []),
                                    { label: 'Quitar responsable', fn: () => { actualizar(t.id, { operadorId: undefined }); setMenu(null); } },
                                  ].map((item) => (
                                    <button
                                      key={item.label}
                                      type="button"
                                      onClick={item.fn}
                                      className={`w-full text-left px-3 py-2 rounded-xl text-[14px] font-normal hover:bg-[#ECECEC]/60 dark:hover:bg-white/10 cursor-pointer ${
                                        'alerta' in item ? 'text-[#FF3F1A]' : ''
                                      }`}
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Selector de responsable */}
                              {menuAbierto && menu?.tipo === 'asignar' && (
                                <div className="absolute left-2 top-14 z-30 w-64 rounded-2xl bg-white dark:bg-[#26262e] border border-[#ECECEC] dark:border-white/10 shadow-xl p-1.5">
                                  <p className="px-3 pt-1.5 pb-2 text-[12px] font-light text-[#212121]/60 dark:text-[#ECECEC]/60">
                                    Requiere: {CAPACIDAD_LABEL[t.capacidad]}
                                  </p>
                                  {operadores.map((o) => {
                                    const puede = tieneCapacidad(o, t.capacidad);
                                    return (
                                      <button
                                        key={o.id}
                                        type="button"
                                        onClick={() => asignar(t, o)}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#ECECEC]/60 dark:hover:bg-white/10 cursor-pointer"
                                      >
                                        <img src={avatarDe(o)} alt="" className="w-7 h-7 rounded-full object-cover" />
                                        <span className="flex-1 text-left text-[14px] font-normal truncate">{o.nombre}</span>
                                        <span className="text-[12px] font-light text-[#212121]/50 dark:text-[#ECECEC]/50">{carga[o.id] ?? 0}</span>
                                        {!puede && <AlertTriangle className="w-3.5 h-3.5 text-[#FF3F1A]" aria-label="Sin permiso" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="mt-3 text-center text-[14px] font-normal text-[#212121]/80 dark:text-[#ECECEC]/80">
                      {etapa.titulo} <span className="font-light text-[#212121]/50 dark:text-[#ECECEC]/50">{hechas}/{filas.length}</span>
                    </p>
                  </div>
                </React.Fragment>
              );
            })}

            {/* ── Siguientes pasos ── */}
            <div className="lg:w-[300px] shrink-0 lg:pl-10 relative">
              <svg className="hidden lg:block absolute left-0 top-10" width="40" height="40" aria-hidden>
                <path d="M2 30 C20 30, 18 8, 36 8" fill="none" strokeWidth={1.5} className="stroke-[#212121] dark:stroke-[#ECECEC]" />
                <path d="M30 3 L37 8 L30 13" fill="none" strokeWidth={1.5} className="stroke-[#212121] dark:stroke-[#ECECEC]" />
              </svg>
              <div className="rounded-[28px] border border-[#212121]/10 dark:border-white/10 p-2 grid grid-cols-2 gap-2">
                {pasos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={p.accion}
                    className={`h-20 rounded-[20px] p-3 text-left text-[14px] leading-tight transition-transform active:scale-95 cursor-pointer ${
                      p.principal
                        ? 'bg-[#212121] text-white font-bold dark:bg-[#FF3F1A]'
                        : 'bg-white font-normal text-[#212121] hover:shadow-md dark:bg-white/[0.06] dark:text-[#ECECEC] dark:hover:bg-white/10'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-[14px] font-normal text-[#212121]/80 dark:text-[#ECECEC]/80">Siguientes pasos</p>
            </div>
          </div>
        </section>

        {/* ── Modal: fecha límite ── */}
        {tareaFecha && (
          <Modal titulo="Fecha límite" onClose={() => setTareaFecha(null)}>
            <p className="text-[14px] font-bold">{tareaFecha.titulo}</p>
            <input
              type="datetime-local"
              value={fechaInput}
              onChange={(e) => setFechaInput(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-[#ECECEC] dark:border-white/10 bg-[#ECECEC]/30 dark:bg-white/5 text-[14px] focus:outline-none focus:border-[#97D6DF] dark:[color-scheme:dark]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setTareaFecha(null)} className="px-4 h-10 rounded-full text-[14px] hover:bg-[#ECECEC]/60 dark:hover:bg-white/10 cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={guardarFecha} className="px-5 h-10 rounded-full bg-[#190088] dark:bg-[#97D6DF] text-white dark:text-[#190088] text-[14px] font-bold cursor-pointer">
                Guardar
              </button>
            </div>
          </Modal>
        )}

        {/* ── Modal: vencimientos ── */}
        {vencimientosAbierto && (
          <Modal titulo="Vencimientos" onClose={() => setVencimientosAbierto(false)}>
            <div className="space-y-1 max-h-[380px] overflow-y-auto">
              {[...tareas]
                .filter((t) => !t.completada)
                .sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite))
                .map((t) => {
                  const vencida = new Date(t.fechaLimite).getTime() < Date.now();
                  const r = operadoresStore.porId(t.operadorId);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setVencimientosAbierto(false); abrirFecha(t); }}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#ECECEC]/60 dark:hover:bg-white/10 text-left cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${vencida ? 'bg-[#FF3F1A]' : 'bg-[#97D6DF]'}`} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-bold truncate">{t.titulo}</span>
                        <span className="block text-[12px] font-light text-[#212121]/60 dark:text-[#ECECEC]/60">
                          {r?.nombre ?? 'Sin responsable'}
                        </span>
                      </span>
                      <span className={`text-[12px] ${vencida ? 'text-[#FF3F1A] font-bold' : 'font-light'}`}>{formatearFecha(t.fechaLimite)}</span>
                    </button>
                  );
                })}
            </div>
          </Modal>
        )}

        {/* ── Modal: permisos ── */}
        {opPermisos && (
          <Modal titulo="Permisos del equipo" onClose={() => setPermisosOpId(null)}>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {operadores.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setPermisosOpId(o.id)}
                  className={`flex items-center gap-2 pl-1 pr-3 h-9 rounded-full shrink-0 text-[12px] cursor-pointer border ${
                    o.id === opPermisos.id
                      ? 'border-[#190088] dark:border-[#97D6DF] font-bold'
                      : 'border-[#ECECEC] dark:border-white/10 font-normal'
                  }`}
                >
                  <img src={avatarDe(o)} alt="" className="w-7 h-7 rounded-full object-cover" />
                  {o.nombre.split(' ')[0]}
                </button>
              ))}
            </div>
            <p className="text-[12px] font-light text-[#212121]/60 dark:text-[#ECECEC]/60">
              Rol: {rolesStore.porId(opPermisos.rolId)?.nombre ?? 'Sin rol'}. Los cambios son excepciones sobre el rol.
            </p>
            <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
              {CAPACIDADES.map((cap) => {
                const activa = tieneCapacidad(opPermisos, cap);
                return (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => alternarPermiso(opPermisos, cap)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#ECECEC]/60 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <span className={`text-[14px] ${activa ? 'font-bold' : 'font-light text-[#212121]/60 dark:text-[#ECECEC]/60'}`}>
                      {CAPACIDAD_LABEL[cap]}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        activa ? 'bg-[#190088] dark:bg-[#97D6DF] text-white dark:text-[#190088]' : 'border border-[#212121]/20 dark:border-white/20'
                      }`}
                    >
                      {activa && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Modal>
        )}
      </div>
    );
  }
);

const Modal: React.FC<{ titulo: string; onClose: () => void; children: React.ReactNode }> = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-md rounded-[28px] bg-white dark:bg-[#1c1c22] border border-[#ECECEC] dark:border-white/10 shadow-2xl p-6 space-y-4 text-[#212121] dark:text-[#ECECEC]"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[#190088] dark:text-white">{titulo}</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="text-[#212121]/50 dark:text-[#ECECEC]/50 hover:text-[#FF3F1A] cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default OperadoresFlujoJourneyView;
