import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { PageMeta } from "@/shell/meta";
import { novedadesStore } from "@/stores";
import {
  ESTADOS_NOVEDAD,
  ETIQUETA_ESTADO_NOVEDAD,
  claseEstadoNovedad,
  diasEnNovedad,
  fechaCorta,
  filtrarNovedades,
  horaDe,
  puedeGestionar,
  solucionPorId,
  type EstadoNovedad,
  type Novedad,
} from "@/domain/pedidos/novedades.domain";
import { GestionarNovedadModal } from "./GestionarNovedadModal";
import { LogoTransportadora } from "./LogoTransportadora";
import { transportadoraPorNombre } from "@/domain/pedidos/transportadoras.catalogo";

// ═══════════════════════════════════════════════════════════════════════════
// GESTIÓN DE NOVEDADES
// ═══════════════════════════════════════════════════════════════════════════
//
// La pantalla responde una sola pregunta: «¿qué pedidos no se entregaron y qué
// hago con ellos?». Todo lo demás —filtros, buscador, columnas— existe para
// llegar a esa fila.
//
// ── Por qué el buscador es por ID de pedido y no por texto libre ──────────
//
// El caso real es el operador al teléfono con el cliente, que dicta su número
// de orden. Se escribe el ID, se pulsa «Buscar» y la tabla se queda con esa
// fila. La búsqueda se aplica al pulsar y no mientras se teclea: con seis
// caracteres el filtro en vivo deja la tabla parpadeando entre resultados que
// nadie pidió.
//
// ── Por qué «Gestionar» no es un icono ────────────────────────────────────
//
// Es la acción que define la pantalla y tiene consecuencias fuera de ella (la
// transportadora reprograma una guía). Va escrita, con su nombre.
// ═══════════════════════════════════════════════════════════════════════════


export const GestionNovedadesPage = observer(() => {
  const navigate = useNavigate();
  const [estados, setEstados] = useState<EstadoNovedad[]>([]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [gestionandoId, setGestionandoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const novedades = filtrarNovedades(novedadesStore.novedades, { estados, busqueda });
  const gestionando = gestionandoId ? (novedadesStore.porId(gestionandoId) ?? null) : null;

  const hayFiltros = estados.length > 0 || busqueda.trim().length > 0;

  const alternarEstado = (estado: EstadoNovedad) => {
    setEstados((prev) =>
      prev.includes(estado) ? prev.filter((e) => e !== estado) : [...prev, estado],
    );
  };

  const limpiar = () => {
    setEstados([]);
    setTexto("");
    setBusqueda("");
    setMenuAbierto(false);
  };

  const abrir = (n: Novedad) => {
    // Abrir deja la novedad en `por_gestionar`: distingue «nadie la miró» de
    // «alguien la está resolviendo».
    novedadesStore.abrir(n.id);
    setGestionandoId(n.id);
  };

  const solucionar = (id: string, datos: Parameters<typeof novedadesStore.gestionar>[1]) => {
    const res = novedadesStore.gestionar(id, datos);
    if (!res.ok) return res.error;

    setGestionandoId(null);
    setAviso(`Novedad solucionada · ${solucionPorId(res.valor.solucion!)?.label ?? ""}`);
    window.setTimeout(() => setAviso(null), 4200);
    return null;
  };

  /**
   * Cuántas novedades hay en cada estado, para el menú de filtros.
   *
   * Se recalcula en cada render y no se memoiza: el store muta las novedades en
   * sitio (la solución se escribe sobre el mismo objeto), así que memoizar por
   * identidad dejaría el contador congelado en el número de la primera pintada.
   */
  const conteo: Record<string, number> = {};
  for (const n of novedadesStore.novedades) conteo[n.estado] = (conteo[n.estado] ?? 0) + 1;

  return (
    <>
      <PageMeta
        title="Gestión de novedades"
        description="Da solución a las novedades presentadas con tus pedidos"
      />

      <div className="flex flex-col gap-4 font-sans">
        {/* ── Cabecera ── */}
        <header>
          <h1 className="text-theme-2xl font-bold tracking-tight text-ink-title dark:text-white">
            Gestión de novedades
          </h1>
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            En este panel puedes dar solución a las novedades presentadas con tus pedidos.
          </p>
        </header>

        {/* ── Filtros ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Menú de estados: casillas, porque una novedad puede estar en dos
              estados a la vez en la cabeza de quien filtra. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
              aria-haspopup="menu"
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-theme-xs font-medium shadow-theme-xs transition-colors cursor-pointer select-none ${
                estados.length > 0
                  ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200/90 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700/80 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              <FunnelIcon className="size-3.5" />
              Estados
              {estados.length > 0 && (
                <span className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full bg-brand-500 text-[9.5px] font-bold text-white">
                  {estados.length}
                </span>
              )}
            </button>

            {menuAbierto && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuAbierto(false)} />
                <div
                  role="menu"
                  className="absolute left-0 top-full z-40 mt-1.5 w-60 overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 shadow-theme-lg animate-entrada-menu dark:border-gray-800 dark:bg-gray-900"
                >
                  {ESTADOS_NOVEDAD.map((estado) => (
                    <button
                      key={estado}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={estados.includes(estado)}
                      onClick={() => alternarEstado(estado)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-theme-xs text-ink-body transition-colors hover:bg-gray-50 cursor-pointer dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                          estados.includes(estado)
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {estados.includes(estado) && <CheckCircleIcon className="size-3" />}
                      </span>
                      <span className="flex-1">{ETIQUETA_ESTADO_NOVEDAD[estado]}</span>
                      <span className="font-mono text-[10px] text-gray-400">
                        {conteo[estado] ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Chips de lo que está puesto: el filtro activo se ve, no se adivina. */}
          {estados.map((estado) => (
            <span
              key={estado}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200/90 bg-white px-3 text-theme-xs font-medium text-gray-800 shadow-theme-xs dark:border-gray-700/80 dark:bg-gray-900/80 dark:text-gray-200"
            >
              Estado: {ETIQUETA_ESTADO_NOVEDAD[estado]}
              <button
                type="button"
                onClick={() => alternarEstado(estado)}
                aria-label={`Quitar el filtro ${ETIQUETA_ESTADO_NOVEDAD[estado]}`}
                className="rounded p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer dark:hover:text-white"
              >
                <XMarkIcon className="size-3.5 stroke-[2.5]" />
              </button>
            </span>
          ))}

          {busqueda.trim() && (
            <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200/90 bg-white px-3 text-theme-xs font-medium text-gray-800 shadow-theme-xs dark:border-gray-700/80 dark:bg-gray-900/80 dark:text-gray-200">
              Orden: {busqueda}
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setTexto("");
                }}
                aria-label="Quitar el filtro por orden"
                className="rounded p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer dark:hover:text-white"
              >
                <XMarkIcon className="size-3.5 stroke-[2.5]" />
              </button>
            </span>
          )}

          {hayFiltros && (
            <button
              type="button"
              onClick={limpiar}
              className="h-10 rounded-xl px-2 text-theme-xs font-medium text-gray-500 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-ink-body cursor-pointer dark:text-gray-400 dark:hover:text-white"
            >
              Limpiar filtros
            </button>
          )}

          {/* Buscador por ID de pedido + Buscar */}
          <form
            className="ml-auto flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setBusqueda(texto.trim());
            }}
          >
            <div className="relative flex items-center">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 size-4 text-gray-400" />
              <input
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Búsqueda por N.º de la orden"
                aria-label="Buscar por número de la orden"
                className="h-10 w-56 rounded-xl border border-gray-200/90 bg-white pl-9 pr-3 text-theme-xs text-ink-body outline-none transition-colors placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20 sm:w-64 dark:border-gray-700/80 dark:bg-gray-900/80 dark:text-gray-100"
              />
            </div>
            <button
              type="submit"
              className="h-10 rounded-xl bg-brand-500 px-4 text-theme-xs font-bold text-white shadow-theme-xs transition-colors hover:bg-brand-600 cursor-pointer"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={() => novedadesStore.reiniciar()}
              aria-label="Recargar la lista"
              title="Recargar la lista"
              className="flex size-10 items-center justify-center rounded-xl border border-gray-200/90 bg-white text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 cursor-pointer dark:border-gray-700/80 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <ArrowPathIcon className="size-4" />
            </button>
          </form>
        </div>

        {/* ── Tabla ── */}
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full min-w-[1080px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 dark:border-gray-800 dark:bg-white/[0.02]">
                {[
                  "Transportadora",
                  "Cliente",
                  "Fecha de creación",
                  "Orden",
                  "Estado",
                  "Causal de novedad",
                  "Días en novedad",
                  "Solución",
                  "",
                ].map((c, i) => (
                  <th
                    key={c + i}
                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {novedades.map((n) => (
                <tr
                  key={n.id}
                  // La fila entera lleva al detalle de la guía: es lo que el
                  // operador viene a mirar. «Gestionar» se queda como botón y
                  // corta la propagación para no abrir las dos cosas a la vez.
                  onClick={() => navigate(`/pedidos/novedades/${n.guia}`)}
                  className="cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/40"
                >
                  {/* Transportadora + guía */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <LogoTransportadora
                        transportadora={transportadoraPorNombre(n.transportadora)}
                        nombre={n.transportadora}
                        tamano="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-theme-xs font-bold text-ink-body dark:text-gray-100">
                          {n.transportadora}
                        </div>
                        <div className="font-mono text-[10.5px] text-gray-400">Guía {n.guia}</div>
                      </div>
                    </div>
                  </td>

                  {/* Cliente */}
                  <td className="px-4 py-3">
                    <div className="text-theme-xs font-medium text-ink-body dark:text-gray-200">
                      {n.cliente}
                    </div>
                    <div className="text-[10.5px] text-gray-400">{n.telefono}</div>
                  </td>

                  {/* Fecha */}
                  <td className="px-4 py-3">
                    <div className="text-theme-xs text-ink-body dark:text-gray-200">
                      {fechaCorta(n.creadaEn)}
                    </div>
                    <div className="font-mono text-[10.5px] text-gray-400">
                      {horaDe(n.creadaEn)}
                    </div>
                  </td>

                  {/* Orden */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11.5px] text-ink-body dark:text-gray-200">
                      {n.ordenNumero}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${
                        claseEstadoNovedad(n.estado)
                      }`}
                    >
                      {ETIQUETA_ESTADO_NOVEDAD[n.estado]}
                    </span>
                  </td>

                  {/* Causal */}
                  <td className="max-w-[240px] px-4 py-3">
                    <span className="text-[11.5px] leading-snug text-gray-600 dark:text-gray-300">
                      {n.causal}
                    </span>
                  </td>

                  {/* Días */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono text-[11px] tabular-nums text-gray-600 dark:text-gray-300">
                      {diasEnNovedad(n.creadaEn)}
                    </span>
                  </td>

                  {/* Solución */}
                  <td className="px-4 py-3">
                    {n.solucion ? (
                      <span className="text-[11.5px] font-medium text-ink-body dark:text-gray-200">
                        {solucionPorId(n.solucion)?.label ?? "—"}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>

                  {/* Acción */}
                  <td className="px-4 py-3 text-right">
                    {puedeGestionar(n) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrir(n);
                        }}
                        className="inline-flex h-8 items-center rounded-lg border border-brand-500 px-3 text-[11.5px] font-bold text-brand-500 transition-colors hover:bg-brand-500 hover:text-white cursor-pointer"
                      >
                        Gestionar
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {novedades.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
              <ExclamationTriangleIcon className="size-6 text-gray-300 dark:text-gray-600" />
              <p className="text-theme-sm font-bold text-ink-title dark:text-white">
                No hay novedades con estos filtros
              </p>
              <p className="max-w-sm text-theme-xs text-gray-500 dark:text-gray-400">
                {busqueda
                  ? `Ninguna novedad coincide con «${busqueda}». Revisa el número de la orden.`
                  : "Ninguna novedad está en los estados seleccionados."}
              </p>
              {hayFiltros && (
                <button
                  type="button"
                  onClick={limpiar}
                  className="mt-1 h-9 rounded-xl border border-gray-200 px-3 text-theme-xs font-bold text-ink-body transition-colors hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {novedades.length} de {novedadesStore.novedades.length} novedades ·{" "}
          {novedadesStore.pendientes} esperando decisión
        </p>
      </div>

      <GestionarNovedadModal
        novedad={gestionando}
        onCerrar={() => setGestionandoId(null)}
        onSolucionar={solucionar}
      />

      {/* Aviso de lo que acaba de pasar. No se va solo si es un error; este es un
          éxito y desaparece a los 4 s. */}
      {aviso && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3.5 py-2.5 text-theme-xs text-ink-body shadow-theme-lg animate-entrada-aviso dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
            <CheckCircleIcon className="size-4 text-success-500" />
            {aviso}
          </div>
        </div>
      )}
    </>
  );
});

export default GestionNovedadesPage;
