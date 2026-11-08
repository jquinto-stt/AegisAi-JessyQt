import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router';
import {
  CAPACIDAD_GRUPOS,
  CAPACIDAD_LABEL,
  operadoresStore,
  rolesStore,
  sessionStore,
  type Capacidad,
  type Operador,
} from '@/stores';
import { ROL_ADMIN } from '@/stores/roles.store';
import { puede } from '@/stores/acceso.utils';
import { Check, CheckCheck, Plus, X } from 'lucide-react';
import { aplicarPreset, aplicarToggle, normalizar, procedenciaDe, type Procedencia } from './excepciones';
import { CAPACIDADES_GESTION } from './equipo.presentacion';

// ═══════════════════════════════════════════════════════════════════════════
// MAPA DE ACCESOS — vista alterna de /pedidos/operadores
// ═══════════════════════════════════════════════════════════════════════════
//
// Responde de un vistazo «¿qué puede hacer esta persona y por qué?» siguiendo
// el mismo modelo que el perfil (`/equipo/:id`):
//
//     Persona → Rol → Áreas → Capacidades
//     capacidadesEfectivas = capacidades(rol) ∪ extras \ removidas
//
// Las tres columnas se leen de izquierda a derecha y las líneas muestran de
// dónde sale cada acceso. La jerarquía la da el estado de cada fila:
//   - concedido   → texto normal + check
//   - excepción   → texto en NEGRITA (se aparta del rol, es lo que hay que mirar)
//   - sin acceso  → texto atenuado + «+»
//
// Toda la escritura pasa por `excepciones.ts` (aplicarToggle / aplicarPreset /
// normalizar), así esta vista no puede dejar excepciones zombis que el perfil
// no crearía. Las mismas guardas: `team.manage` para editar y nada de quitarse
// la gestión de equipo a uno mismo.
//
// ═══════════════════════════════════════════════════════════════════════════

const ALTO_FILA = 56;
const GAP = 4;
const PAD = 8;
const centro = (i: number) => PAD + i * (ALTO_FILA + GAP) + ALTO_FILA / 2;
const alto = (n: number) => PAD * 2 + n * ALTO_FILA + Math.max(0, n - 1) * GAP;

const avatarDe = (op: Operador) =>
  op.avatarUrl ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(op.nombre)}&background=190088&color=fff`;

const ESTADO_TEXTO: Record<Operador['estado'], string> = {
  activo: 'Activo',
  pendiente: 'Solicitud pendiente',
  inactivo: 'Inactivo',
};

const numExcepciones = (op: Operador) =>
  (op.capacidadesExtra?.length ?? 0) + (op.capacidadesRemovidas?.length ?? 0);

export type EstiloLinea = 'concedido' | 'excepcion_alta' | 'excepcion_baja' | 'sin_acceso';

export interface DestinoLinea {
  indice: number;
  tipo: EstiloLinea;
}

const CONFIG_LINEA: Record<
  EstiloLinea,
  {
    stroke: string;
    darkStroke: string;
    strokeWidth: number;
    dash?: string;
    puntoInicio: string;
    darkPuntoInicio: string;
    puntoFin: string;
    darkPuntoFin: string;
    opacidad: number;
  }
> = {
  concedido: {
    stroke: '#190088',
    darkStroke: '#97D6DF',
    strokeWidth: 2,
    puntoInicio: '#190088',
    darkPuntoInicio: '#97D6DF',
    puntoFin: '#190088',
    darkPuntoFin: '#97D6DF',
    opacidad: 0.95,
  },
  excepcion_alta: {
    stroke: '#190088',
    darkStroke: '#97D6DF',
    strokeWidth: 2,
    dash: '5 3',
    puntoInicio: '#190088',
    darkPuntoInicio: '#97D6DF',
    puntoFin: '#190088',
    darkPuntoFin: '#97D6DF',
    opacidad: 1,
  },
  excepcion_baja: {
    stroke: '#FF3F1A',
    darkStroke: '#FF3F1A',
    strokeWidth: 1.75,
    dash: '4 4',
    puntoInicio: '#FF3F1A',
    darkPuntoInicio: '#FF3F1A',
    puntoFin: '#FF3F1A',
    darkPuntoFin: '#FF3F1A',
    opacidad: 0.85,
  },
  sin_acceso: {
    stroke: '#ECECEC',
    darkStroke: 'rgba(255,255,255,0.18)',
    strokeWidth: 1.25,
    dash: '3 4',
    puntoInicio: '#ECECEC',
    darkPuntoInicio: 'rgba(255,255,255,0.25)',
    puntoFin: '#ECECEC',
    darkPuntoFin: 'rgba(255,255,255,0.25)',
    opacidad: 0.6,
  },
};

const Conector: React.FC<{
  desde: number;
  hacia: DestinoLinea[];
  altoMax: number;
  totalOrigen?: number;
  hoverIdx?: number | null;
  onHoverDest?: (idx: number | null) => void;
}> = ({ desde, hacia, altoMax, totalOrigen, hoverIdx, onHoverDest }) => {
  const y1 = centro(Math.max(0, desde));
  const numOrigen = totalOrigen ?? hacia.length;
  // Ancho exacto del SVG conector (48px)
  const ancho = 48;

  return (
    <svg
      className="hidden lg:block shrink-0 w-12 overflow-visible z-10 -mx-1"
      height={altoMax}
      aria-hidden
    >
      {/* 1. Nodos terminales sobre el borde derecho de la columna origen */}
      {Array.from({ length: numOrigen }).map((_, i) => {
        const py = centro(i);
        const isActiveOrigin = i === desde;
        return (
          <g key={`nodo-izq-${i}`}>
            {isActiveOrigin && (
              <>
                <circle
                  cx={0}
                  cy={py}
                  r={5}
                  className="fill-[#FF3F1A] stroke-white dark:stroke-[#101828] stroke-[2]"
                />
                <circle
                  cx={0}
                  cy={py}
                  r={2}
                  className="fill-white"
                />
              </>
            )}
          </g>
        );
      })}

      {/* 2. Trayectorias curvas Bézier limpias y fluidas entre tarjetas */}
      {hacia.map((dest) => {
        const y2 = centro(dest.indice);
        const cfg = CONFIG_LINEA[dest.tipo];
        const isHovered = hoverIdx === dest.indice;
        return (
          <path
            key={`linea-${dest.indice}`}
            d={`M 0 ${y1} C ${ancho * 0.5} ${y1}, ${ancho * 0.5} ${y2}, ${ancho} ${y2}`}
            fill="none"
            strokeWidth={isHovered ? cfg.strokeWidth + 1.5 : cfg.strokeWidth}
            strokeDasharray={cfg.dash}
            opacity={hoverIdx != null ? (isHovered ? 1 : 0.2) : cfg.opacidad}
            className="transition-all duration-200 cursor-pointer"
            style={{
              stroke: cfg.stroke,
            }}
            onMouseEnter={() => onHoverDest?.(dest.indice)}
            onMouseLeave={() => onHoverDest?.(null)}
          />
        );
      })}

      {/* 3. Nodos terminales sobre el borde izquierdo de la columna destino */}
      {hacia.map((dest) => {
        const py = centro(dest.indice);
        const cfg = CONFIG_LINEA[dest.tipo];
        const activo = dest.tipo === 'concedido' || dest.tipo === 'excepcion_alta' || dest.tipo === 'excepcion_baja';
        const color = cfg.stroke;
        return (
          <g key={`nodo-der-${dest.indice}`}>
            <circle
              cx={ancho}
              cy={py}
              r={activo ? 4.5 : 3}
              fill={color}
              stroke="white"
              strokeWidth={1.5}
              className="dark:stroke-[#101828]"
            />
          </g>
        );
      })}
    </svg>
  );
};

export interface OperadoresFlujoJourneyViewProps {
  operadores: Operador[];
  onGestionarRoles?: () => void;
  onInvitar?: () => void;
}

export const OperadoresFlujoJourneyView: React.FC<OperadoresFlujoJourneyViewProps> = observer(
  ({ operadores, onGestionarRoles, onInvitar }) => {
    const navigate = useNavigate();
    const [seleccionId, setSeleccionId] = useState<string | null>(
      () =>
        operadores.find((o) => o.estado === 'pendiente')?.id ??
        operadores.find((o) => o.rolId !== ROL_ADMIN)?.id ??
        operadores[0]?.id ??
        null
    );
    const [grupoId, setGrupoId] = useState(CAPACIDAD_GRUPOS[0].id);
    const [hoverAreaIdx, setHoverAreaIdx] = useState<number | null>(null);
    const [hoverPermisoIdx, setHoverPermisoIdx] = useState<number | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const avisar = (msg: string) => {
      setToast(msg);
      window.setTimeout(() => setToast(null), 3000);
    };

    // Leemos siempre la versión viva desde operadoresStore para que cualquier
    // cambio de rol o permiso se refleje en tiempo real sin cambiar de vista.
    const listaViva = operadores.map((o) => operadoresStore.porId(o.id) ?? o);
    const op = listaViva.find((o) => o.id === seleccionId) ?? listaViva[0];

    if (!op) {
      return (
        <div
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          className="rounded-[32px] border border-dashed border-[#212121]/20 dark:border-white/20 py-16 text-center bg-[#ECECEC]/30 dark:bg-white/[0.02]"
        >
          <p className="text-[14px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70">
            No hay personas que coincidan con el filtro.
          </p>
        </div>
      );
    }

    const puedeGestionar = puede('team.manage');
    const esUnoMismo = sessionStore.operadorSimuladoId !== null && sessionStore.operadorSimuladoId === op.id;
    const esAdminPrincipal = op.rolId === ROL_ADMIN;
    const rolActual = rolesStore.porId(op.rolId);
    const capsRol = rolActual?.capacidades ?? [];
    const efectivas = new Set(rolesStore.capacidadesEfectivas(op));
    const excepciones = numExcepciones(op);
    const grupo = CAPACIDAD_GRUPOS.find((g) => g.id === grupoId) ?? CAPACIDAD_GRUPOS[0];
    const idxGrupo = CAPACIDAD_GRUPOS.indexOf(grupo);

    const roles = rolesStore.roles.filter((r) => r.id !== ROL_ADMIN || r.id === op.rolId);
    const idxRol = roles.findIndex((r) => r.id === op.rolId);
    const personasPorRol = (rolId: string) => listaViva.filter((o) => o.rolId === rolId).length;

    const bloqueada = (cap: Capacidad) => esUnoMismo && CAPACIDADES_GESTION.includes(cap);

    const escribir = (sig: { capacidadesExtra: Capacidad[]; capacidadesRemovidas: Capacidad[] }) => {
      operadoresStore.setCapacidadesExtra(op.id, sig.capacidadesExtra);
      operadoresStore.setCapacidadesRemovidas(op.id, sig.capacidadesRemovidas);
    };

    // ── Acciones ─────────────────────────────────────────────────────────────
    const cambiarRol = (rolId: string) => {
      const nuevo = rolesStore.porId(rolId);
      if (!nuevo || !puedeGestionar || esAdminPrincipal) return;
      if (esUnoMismo && !nuevo.capacidades.includes('team.manage')) {
        avisar('No puedes cambiarte a un rol sin gestión de equipo: perderías el acceso a esta pantalla.');
        return;
      }
      escribir(normalizar(op, nuevo.capacidades));
      operadoresStore.setRol(op.id, rolId);
      avisar(`${op.nombre} ahora tiene el rol «${nuevo.nombre}».`);
    };

    const toggleCap = (cap: Capacidad) => {
      if (!puedeGestionar || bloqueada(cap)) return;
      escribir(aplicarToggle(op, cap, capsRol, !efectivas.has(cap)));
    };

    const alternarGrupo = () => {
      if (!puedeGestionar) return;
      const completo = grupo.capacidades.every((c) => efectivas.has(c));
      let objetivo = completo
        ? [...efectivas].filter((c) => !grupo.capacidades.includes(c))
        : [...new Set([...efectivas, ...grupo.capacidades])];
      if (esUnoMismo) objetivo = [...new Set([...objetivo, ...[...efectivas].filter((c) => CAPACIDADES_GESTION.includes(c))])];
      escribir(aplicarPreset(op, objetivo, capsRol));
    };

    const restablecer = () => {
      escribir({ capacidadesExtra: [], capacidadesRemovidas: [] });
      avisar(`Permisos de ${op.nombre} restablecidos a su rol.`);
    };

    const aprobar = () => {
      if (!op.rolId) {
        avisar('Asígnale un rol antes de aprobar: sin rol no podría entrar a ninguna sección.');
        return;
      }
      operadoresStore.aprobar(op.id);
      avisar(`${op.nombre} ya puede entrar al módulo.`);
    };

    const rechazar = () => {
      if (!window.confirm(`¿Rechazar la solicitud de ${op.nombre}? Se descartará.`)) return;
      operadoresStore.rechazar(op.id);
      setSeleccionId(null);
    };

    const verComo = () => {
      sessionStore.simular(op.id);
      navigate(sessionStore.homePathActual);
    };

    // ── Siguientes pasos: el primero es el más urgente para esta persona ────
    type Paso = { id: string; label: string; accion: () => void; deshabilitado?: string };
    const pasos: Paso[] = [];
    const sinGestion = puedeGestionar ? undefined : 'Necesitas el permiso «Gestionar equipo».';
    if (op.estado === 'pendiente') {
      pasos.push(
        { id: 'aprobar', label: op.rolId ? 'Aprobar solicitud' : 'Elige un rol para aprobar', accion: aprobar, deshabilitado: sinGestion },
        { id: 'rechazar', label: 'Rechazar solicitud', accion: rechazar, deshabilitado: sinGestion }
      );
    } else {
      if (excepciones > 0) pasos.push({ id: 'reset', label: `Restablecer al rol (${excepciones})`, accion: restablecer, deshabilitado: sinGestion });
      if (op.estado === 'activo') pasos.push({ id: 'vercomo', label: `Ver como ${op.nombre.split(' ')[0]}`, accion: verComo });
      if (!esUnoMismo && !esAdminPrincipal) {
        pasos.push(
          op.estado === 'activo'
            ? { id: 'desactivar', label: 'Desactivar acceso', accion: () => { operadoresStore.desactivar(op.id); avisar(`${op.nombre} quedó sin acceso.`); }, deshabilitado: sinGestion }
            : { id: 'activar', label: 'Reactivar acceso', accion: () => { operadoresStore.activar(op.id); avisar(`${op.nombre} vuelve a tener acceso.`); }, deshabilitado: sinGestion }
        );
      }
    }
    pasos.push(
      { id: 'perfil', label: 'Ver perfil completo', accion: () => navigate(`/equipo/${op.id}`) },
      { id: 'roles', label: 'Gestionar roles', accion: () => onGestionarRoles?.() },
      { id: 'invitar', label: 'Invitar miembro', accion: () => onInvitar?.(), deshabilitado: sinGestion }
    );
    const pasosVisibles = pasos.slice(0, 6);

    // ── Clasificación de líneas según el estado real del permiso ─────────────
    const destinosRolAAreas: DestinoLinea[] = CAPACIDAD_GRUPOS.map((g, i) => {
      const tiene = g.capacidades.filter((c) => efectivas.has(c)).length;
      const total = g.capacidades.length;
      const tieneConcedida = g.capacidades.some((c) => procedenciaDe(op, c, capsRol) === 'concedida');
      const tieneRemovida = g.capacidades.some((c) => procedenciaDe(op, c, capsRol) === 'removida');

      let tipo: EstiloLinea = 'sin_acceso';
      if (tieneRemovida) {
        tipo = 'excepcion_baja'; // Línea roja segmentada
      } else if (tieneConcedida) {
        tipo = 'excepcion_alta'; // Línea azul/cyan punteada
      } else if (tiene === total || (tiene > 0 && g.capacidades.some((c) => capsRol.includes(c)))) {
        tipo = 'concedido'; // Línea cyan sólida
      }
      return { indice: i, tipo };
    });

    const destinosAreasAPermisos: DestinoLinea[] = grupo.capacidades.map((cap, i) => {
      const proc = procedenciaDe(op, cap, capsRol);
      let tipo: EstiloLinea = 'sin_acceso';
      if (proc === 'concedida') {
        tipo = 'excepcion_alta'; // Azul/cyan
      } else if (proc === 'removida') {
        tipo = 'excepcion_baja'; // Naranja/rojo
      } else if (proc === 'rol') {
        tipo = 'concedido'; // Cyan
      }
      return { indice: i, tipo };
    });

    const tarjeta = 'relative rounded-[28px] bg-[#ECECEC]/30 dark:bg-white/[0.05] border border-[#ECECEC] dark:border-white/10 shadow-xs';
    const etiqueta = 'mt-3 text-center text-[14px] font-normal text-[#190088] dark:text-[#97D6DF]';
    const punto = 'hidden lg:block absolute w-2.5 h-2.5 rounded-full bg-[#FF3F1A] dark:bg-[#FF3F1A] ring-2 ring-white dark:ring-[#101828]';
    const circuloLleno = 'bg-[#FF3F1A] text-white dark:bg-[#FF3F1A] dark:text-white';
    const circuloVacio = 'bg-[#ECECEC] text-[#212121]/60 dark:bg-white/10 dark:text-[#ECECEC]/70';

    const textoFila = (nivel: 'fuerte' | 'normal' | 'debil') =>
      nivel === 'fuerte'
        ? 'font-bold text-[#212121] dark:text-white'
        : nivel === 'normal'
          ? 'font-normal text-[#212121] dark:text-[#ECECEC]'
          : 'font-light text-[#212121]/60 dark:text-[#ECECEC]/60';

    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="text-[#212121] dark:text-[#ECECEC]">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#190088] text-white px-5 py-3 rounded-2xl shadow-xl text-[14px] font-normal border border-[#97D6DF]/30">
            {toast}
          </div>
        )}

        {/* Marco principal contenedor con fondo blanco */}
        <section className="rounded-[32px] bg-white dark:bg-white/[0.03] border border-[#ECECEC] dark:border-white/10 p-5 sm:p-6 shadow-sm">
          {/* ── Barra Superior Unificada: Perfil Seleccionado + Barra de Avatares Centrada ── */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-[28px] bg-[#ECECEC]/30 dark:bg-white/[0.04] border border-[#ECECEC] dark:border-white/10 px-5 py-3 mb-6 shadow-xs">
            {/* 1. Datos del Operador Seleccionado (izquierda) */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <img
                src={avatarDe(op)}
                alt=""
                className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-white/20 shadow-xs"
              />
              <div>
                <p className="text-[16px] font-bold text-[#190088] dark:text-white leading-tight">{op.nombre}</p>
                <p className="text-[12px] font-light text-[#212121]/70 dark:text-[#ECECEC]/70">
                  {op.cargo || 'Sin cargo'} · {op.email}
                </p>
              </div>
            </div>

            {/* 2. Barra de Avatares del Equipo (Centrada) */}
            <div className="flex items-center gap-2 rounded-full bg-white dark:bg-white/[0.08] border border-[#ECECEC] dark:border-white/10 px-3.5 py-1.5 overflow-x-auto scrollbar-none shadow-xs">
              {listaViva.map((o) => {
                const activo = o.id === op.id;
                const n = numExcepciones(o);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSeleccionId(o.id)}
                    title={`${o.nombre} · ${ESTADO_TEXTO[o.estado]}${n ? ` · ${n} excepciones` : ''}`}
                    className="relative shrink-0 cursor-pointer transition-transform hover:scale-105 my-0.5"
                  >
                    <img
                      src={avatarDe(o)}
                      alt={o.nombre}
                      className={`w-10 h-10 rounded-full object-cover ring-2 transition-all ${
                        activo ? 'ring-[#FF3F1A] dark:ring-[#FF3F1A] scale-105 shadow-sm' : 'ring-transparent dark:ring-white/10'
                      } ${o.estado === 'inactivo' ? 'grayscale opacity-50' : ''}`}
                    />
                    {(o.estado === 'pendiente' || n > 0) && (
                      <span
                        className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#101828] ${
                          o.estado === 'pendiente' ? 'bg-[#FF3F1A] text-white' : 'bg-[#97D6DF] text-[#190088]'
                        }`}
                      >
                        {o.estado === 'pendiente' ? '!' : n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 3. Badges de Estado y Permisos (derecha) */}
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`px-3 h-7 inline-flex items-center rounded-full text-[12px] font-bold ${
                  op.estado === 'activo'
                    ? 'bg-[#97D6DF]/35 text-[#190088] dark:bg-[#97D6DF]/20 dark:text-[#97D6DF]'
                    : op.estado === 'pendiente'
                      ? 'bg-[#FF3F1A]/15 text-[#FF3F1A]'
                      : 'bg-[#ECECEC] text-[#212121]/70 dark:bg-white/10 dark:text-[#ECECEC]/70'
                }`}
              >
                {ESTADO_TEXTO[op.estado]}
              </span>
              <span className="text-[12px] font-light text-[#212121]/80 dark:text-[#ECECEC]/80">
                <strong className="font-bold text-[#212121] dark:text-white">{efectivas.size}</strong> permisos ·{' '}
                {excepciones ? (
                  <span className="font-bold text-[#FF3F1A]">{excepciones} excepciones</span>
                ) : (
                  'igual a su rol'
                )}
              </span>
              {!puedeGestionar && (
                <span className="text-[12px] font-bold text-[#FF3F1A]">Solo lectura</span>
              )}
            </div>
          </div>

          {/* ── Rol → Áreas → Permisos → Siguientes pasos ── */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-0">
            {/* Columna 1: Rol */}
            <div className="flex-1 min-w-0">
              <div className={tarjeta} style={{ padding: PAD }}>
                <div className="flex flex-col" style={{ gap: GAP }}>
                  {roles.map((r) => {
                    const actual = r.id === op.rolId;
                    const bloqueadoRol =
                      !puedeGestionar ||
                      esAdminPrincipal ||
                      (esUnoMismo && !r.capacidades.includes('team.manage'));
                    return (
                      <button
                        key={r.id}
                        type="button"
                        disabled={actual || bloqueadoRol}
                        onClick={() => cambiarRol(r.id)}
                        title={
                          esAdminPrincipal
                            ? 'El administrador principal no cambia de rol desde aquí.'
                            : actual
                              ? 'Rol actual'
                              : `Asignar «${r.nombre}»`
                        }
                        className={`relative flex items-center gap-3 px-2 rounded-[20px] text-left transition-colors ${
                          actual
                            ? 'bg-[#EFE6D3]/60 dark:bg-white/[0.08] ring-2 ring-[#FF3F1A] dark:ring-[#FF3F1A]'
                            : 'enabled:hover:bg-[#ECECEC]/60 dark:enabled:hover:bg-white/[0.04] enabled:cursor-pointer disabled:cursor-not-allowed'
                        }`}
                        style={{ height: ALTO_FILA }}
                      >
                        <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${actual ? circuloLleno : circuloVacio}`}>
                          {actual ? <Check className="w-4 h-4" strokeWidth={3} /> : <Plus className="w-4 h-4" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-[14px] leading-tight truncate ${textoFila(actual ? 'fuerte' : 'debil')}`}>{r.nombre}</span>
                          <span className="block text-[12px] font-light text-[#212121]/60 dark:text-[#ECECEC]/60 truncate">
                            {r.capacidades.length} permisos · {personasPorRol(r.id)} personas
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className={etiqueta}>Rol</p>
            </div>

            <Conector
              desde={idxRol}
              hacia={destinosRolAAreas}
              altoMax={Math.max(alto(roles.length), alto(CAPACIDAD_GRUPOS.length))}
              totalOrigen={roles.length}
              hoverIdx={hoverAreaIdx}
              onHoverDest={setHoverAreaIdx}
            />

            {/* Columna 2: Áreas */}
            <div className="flex-1 min-w-0">
              <div className={tarjeta} style={{ padding: PAD }}>
                <div className="flex flex-col" style={{ gap: GAP }}>
                  {CAPACIDAD_GRUPOS.map((g, i) => {
                    const tiene = g.capacidades.filter((c) => efectivas.has(c)).length;
                    const total = g.capacidades.length;
                    const conExcepcion = g.capacidades.some((c) => {
                      const p = procedenciaDe(op, c, capsRol);
                      return p === 'concedida' || p === 'removida';
                    });
                    const activa = g.id === grupo.id;
                    const isHovered = hoverAreaIdx === i;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGrupoId(g.id)}
                        onMouseEnter={() => setHoverAreaIdx(i)}
                        onMouseLeave={() => setHoverAreaIdx(null)}
                        className={`relative flex items-center gap-3 px-2 rounded-[20px] text-left cursor-pointer transition-all duration-200 ${
                          activa
                            ? 'bg-[#EFE6D3]/70 dark:bg-white/[0.08] ring-2 ring-[#FF3F1A] dark:ring-[#FF3F1A] scale-[1.01]'
                            : isHovered
                              ? 'bg-[#ECECEC]/70 dark:bg-white/[0.06] scale-[1.005]'
                              : 'hover:bg-[#ECECEC]/60 dark:hover:bg-white/[0.04]'
                        }`}
                        style={{ height: ALTO_FILA }}
                      >
                        <span
                          className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[12px] font-bold transition-transform duration-200 ${
                            isHovered || activa ? 'scale-105' : ''
                          } ${
                            tiene === total
                              ? circuloLleno
                              : tiene > 0
                                ? 'border-2 border-[#FF3F1A] text-[#FF3F1A] dark:border-[#FF3F1A] dark:text-[#FF3F1A]'
                                : circuloVacio
                          }`}
                        >
                          {tiene === 0 ? <Plus className="w-4 h-4" /> : `${tiene}/${total}`}
                        </span>
                        <span className={`flex-1 text-[14px] truncate ${textoFila(conExcepcion ? 'fuerte' : tiene > 0 ? 'normal' : 'debil')}`}>
                          {g.label}
                        </span>
                        {conExcepcion && (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-[#FF3F1A] shrink-0 ring-2 ring-white dark:ring-[#101828]"
                            title="Tiene excepciones sobre el rol"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className={etiqueta}>Áreas</p>
            </div>

            <Conector
              desde={idxGrupo}
              hacia={destinosAreasAPermisos}
              altoMax={Math.max(alto(CAPACIDAD_GRUPOS.length), alto(grupo.capacidades.length))}
              totalOrigen={CAPACIDAD_GRUPOS.length}
              hoverIdx={hoverPermisoIdx}
              onHoverDest={setHoverPermisoIdx}
            />

            {/* Columna 3: Permisos del área */}
            <div className="flex-1 min-w-0">
              <div className={tarjeta} style={{ padding: PAD }}>
                <div className="flex flex-col" style={{ gap: GAP }}>
                  {grupo.capacidades.map((cap, i) => {
                    const proc: Procedencia = procedenciaDe(op, cap, capsRol);
                    const lock = bloqueada(cap);
                    const efectiva = efectivas.has(cap);
                    const isHovered = hoverPermisoIdx === i;
                    return (
                      <button
                        key={cap}
                        type="button"
                        disabled={!puedeGestionar || lock}
                        onClick={() => toggleCap(cap)}
                        onMouseEnter={() => setHoverPermisoIdx(i)}
                        onMouseLeave={() => setHoverPermisoIdx(null)}
                        title={
                          lock
                            ? 'No puedes quitarte la gestión de equipo a ti mismo.'
                            : efectiva
                              ? 'Clic para revocar'
                              : 'Clic para conceder'
                        }
                        className={`relative flex items-center gap-3 px-2 rounded-[20px] text-left transition-all duration-200 enabled:cursor-pointer disabled:cursor-not-allowed ${
                          isHovered
                            ? 'bg-[#EFE6D3]/50 dark:bg-white/[0.08] ring-1 ring-[#190088]/20 dark:ring-[#97D6DF]/30 scale-[1.005]'
                            : 'enabled:hover:bg-[#ECECEC]/60 dark:enabled:hover:bg-white/[0.04]'
                        }`}
                        style={{ height: ALTO_FILA }}
                      >
                        <span
                          className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-transform duration-200 ${
                            isHovered ? 'scale-105' : ''
                          } ${
                            efectiva
                              ? circuloLleno
                              : proc === 'removida'
                                ? 'border-2 border-[#FF3F1A] text-[#FF3F1A]'
                                : circuloVacio
                          }`}
                        >
                          {efectiva ? (
                            <Check className="w-4 h-4" strokeWidth={3} />
                          ) : proc === 'removida' ? (
                            <X className="w-4 h-4" strokeWidth={3} />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </span>
                        <span
                          className={`flex-1 text-[14px] truncate ${textoFila(
                            proc === 'concedida' || proc === 'removida' ? 'fuerte' : efectiva ? 'normal' : 'debil'
                          )} ${proc === 'removida' ? 'line-through opacity-70' : ''}`}
                        >
                          {CAPACIDAD_LABEL[cap]}
                        </span>
                        {proc === 'rol' && (
                          <span className="flex items-center gap-1 text-[12px] font-light text-[#212121]/60 dark:text-[#ECECEC]/60 shrink-0">
                            <CheckCheck className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" /> Rol
                          </span>
                        )}
                        {proc === 'concedida' && (
                          <span className="px-2 h-6 inline-flex items-center rounded-full text-[12px] font-bold bg-[#97D6DF]/35 text-[#190088] dark:text-[#97D6DF] shrink-0">
                            Excepción
                          </span>
                        )}
                        {proc === 'removida' && (
                          <span className="px-2 h-6 inline-flex items-center rounded-full text-[12px] font-bold bg-[#FF3F1A]/15 text-[#FF3F1A] shrink-0">
                            Revocada
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className={etiqueta}>
                Permisos · {grupo.label}
                {puedeGestionar && (
                  <button
                    type="button"
                    onClick={alternarGrupo}
                    className="ml-2 text-[12px] font-bold text-[#FF3F1A] hover:underline cursor-pointer"
                  >
                    {grupo.capacidades.every((c) => efectivas.has(c)) ? 'Quitar todos' : 'Conceder todos'}
                  </button>
                )}
              </p>
            </div>

            {/* Columna 4: Siguientes pasos */}
            <div className="lg:w-[300px] shrink-0 lg:pl-10 relative">
              <svg className="hidden lg:block absolute left-0 top-10" width="40" height="40" aria-hidden>
                <path d="M2 30 C20 30, 18 8, 36 8" fill="none" strokeWidth={1.5} className="stroke-[#190088] dark:stroke-[#97D6DF]" />
                <path d="M30 3 L37 8 L30 13" fill="none" strokeWidth={1.5} className="stroke-[#190088] dark:stroke-[#97D6DF]" />
              </svg>
              <div className="rounded-[28px] border border-[#ECECEC] dark:border-white/10 bg-white dark:bg-white/[0.04] p-2 grid grid-cols-2 gap-2 shadow-xs">
                {pasosVisibles.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={p.accion}
                    disabled={!!p.deshabilitado}
                    title={p.deshabilitado}
                    className={`h-20 rounded-[20px] p-3 text-left text-[14px] leading-tight transition-transform enabled:active:scale-95 enabled:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      i === 0
                        ? 'bg-[#190088] text-white font-bold hover:bg-[#190088]/90 dark:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A]/90'
                        : 'bg-[#ECECEC]/40 font-normal text-[#212121] border border-[#ECECEC] enabled:hover:bg-[#EFE6D3] dark:bg-white/[0.06] dark:text-[#ECECEC] dark:border-white/10'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className={etiqueta}>Siguientes pasos</p>
            </div>
          </div>

          {/* ── Leyenda NECTO ── */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-light text-[#212121]/70 dark:text-[#ECECEC]/70 border-t border-[#ECECEC] dark:border-white/10 pt-4">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-[#190088] inline-block rounded-full" /> Concedido por rol
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 border-b-2 border-dashed border-[#190088] inline-block" /> Excepción adicional
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 border-b-2 border-dashed border-[#FF3F1A] inline-block" /> Excepción revocada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 border-b border-dotted border-[#ECECEC] dark:border-white/30 inline-block" /> Sin acceso
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#EFE6D3] border border-[#FF3F1A]" /> Selección activa
            </span>
          </div>
        </section>
      </div>
    );
  }
);

export default OperadoresFlujoJourneyView;
