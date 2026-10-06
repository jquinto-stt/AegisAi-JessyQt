import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { SearchInput } from "@/elements";
import { AlertHexaIcon, BoxCubeIcon, DownloadIcon, PlusIcon, TimeIcon } from "@/icons";
import {
  inventariosStore,
  nombreDeActor,
  puedeContarInventario,
  puedeVerInventarios,
  type EstadoInventario,
  type Inventario,
} from "@/stores";
import { descargarCsv, construirCsv, fechaLegibleCsv, nombreArchivoCsv } from "@/lib/csv";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { InventariosTabla, type FilaInventario } from "./InventariosTabla";
import { SinResultados } from "./inventarios.widgets";
import {
  FILTRO_TODOS,
  buscarCoincidencia,
  caminoDe,
  conteoPorEstado,
  formatearFechaCorta,
} from "./inventarios.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// INVENTARIOS — listado
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Qué es esta pantalla ──────────────────────────────────────────────────
//
// La puerta del módulo. Su trabajo es contestar dos preguntas antes de que el
// usuario haga clic: «¿qué conteos están abiertos?» y «¿qué necesita atención
// hoy?». Por eso las métricas van arriba y no dentro de un panel aparte.
//
// ── Lo que esta pantalla NO hace ──────────────────────────────────────────
//
// No hay un selector «todos los estados» que además filtre por ubicación: se
// puede filtrar por estado y buscar por texto, y es suficiente para un listado
// de conteos. Cada filtro adicional es una forma más de que la lista salga
// vacía y el usuario crea que el módulo está roto.

export const InventariosPage = observer(function InventariosPage() {
  const navigate = useNavigate();
  const [consulta, setConsulta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoInventario | typeof FILTRO_TODOS>(FILTRO_TODOS);

  const puedeContar = puedeContarInventario();
  const porId = inventariosStore.ubicacionesPorId;

  // ═══ Filtrado ═══════════════════════════════════════════════════════════

  const filas: FilaInventario[] = useMemo(() => {
    const todos = inventariosStore.inventariosOrdenados;

    return todos
      .filter((inv) => {
        if (filtroEstado !== FILTRO_TODOS && inv.estado !== filtroEstado) return false;
        if (!consulta.trim()) return true;
        const camino = caminoDe(inv.ubicacionId, porId);
        return buscarCoincidencia(
          consulta,
          inv.numero,
          inv.nombre,
          camino,
          nombreDeActor(inv.responsableId),
        );
      })
      .map((inv) => ({
        inventario: inv,
        camino: caminoDe(inv.ubicacionId, porId),
        responsable: nombreDeActor(inv.responsableId),
        progreso: inventariosStore.progresoDeInventario(inv.id),
        discrepancias: inventariosStore.discrepanciasDe(inv.id),
      }));
  }, [consulta, filtroEstado, porId, inventariosStore.inventarios.length, inventariosStore.lineas.length]);

  const conteos = useMemo(
    () => conteoPorEstado(inventariosStore.inventariosOrdenados),
    [inventariosStore.inventarios.length],
  );

  const metricas = inventariosStore.metricas;

  // ═══ Exportación ════════════════════════════════════════════════════════

  function exportar() {
    const csv = construirCsv(
      ["Conteo", "Nombre", "Tipo", "Ubicación", "Responsable", "Avance", "Discrepancias", "Estado", "Creado"],
      filas.map((f) => [
        f.inventario.numero,
        f.inventario.nombre,
        f.inventario.tipo,
        f.camino,
        f.responsable,
        `${f.progreso.contadas}/${f.progreso.total}`,
        f.discrepancias,
        f.inventario.estado,
        fechaLegibleCsv(f.inventario.createdAt),
      ]),
    );
    descargarCsv(csv, nombreArchivoCsv("inventarios"));
  }

  // ═══ Render ═════════════════════════════════════════════════════════════

  const hayFiltro = consulta.trim() !== "" || filtroEstado !== FILTRO_TODOS;

  return (
    <>
      <PageMeta
        title="Inventarios · Necto"
        description="Conteos de verificación de existencias por ubicación."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Inventarios"
          descripcion="Cuenta lo que hay en cada ubicación."
          acciones={
            <>
              <Button
                variant="outline"
                size="sm"
                startIcon={<DownloadIcon className="h-4 w-4" />}
                onClick={exportar}
                disabled={filas.length === 0}
              >
                Exportar lista
              </Button>
              {puedeContar && (
                <Button
                  size="sm"
                  startIcon={<PlusIcon className="h-4 w-4" />}
                  onClick={() => navigate("/inventarios/nuevo")}
                >
                  Nuevo conteo
                </Button>
              )}
            </>
          }
        />

        {/* ── Resumen de actividad ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <TarjetaMetrica
            icono={<BoxCubeIcon className="h-5 w-5" />}
            valor={metricas.inventariosActivos}
            etiqueta="Conteos en curso"
            tono={metricas.inventariosActivos > 0 ? "info" : "neutro"}
          />
          <TarjetaMetrica
            icono={<TimeIcon className="h-5 w-5" />}
            valor={metricas.lineasPendientes}
            etiqueta="Por contar"
            tono={metricas.lineasPendientes > 0 ? "atencion" : "neutro"}
          />
          <TarjetaMetrica
            icono={<AlertHexaIcon className="h-5 w-5" />}
            valor={metricas.discrepanciasAbiertas}
            etiqueta="Diferencias"
            tono={metricas.discrepanciasAbiertas > 0 ? "atencion" : "neutro"}
            onClick={metricas.discrepanciasAbiertas > 0 ? () => navigate("/inventarios/alertas") : undefined}
          />
        </div>

        {/* ── Búsqueda y Filtros de Estado ───────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              onClear={() => setConsulta("")}
              placeholder="Buscar conteo o ubicación…"
              className="sm:max-w-md sm:flex-1"
              aria-label="Buscar conteos"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 sm:ml-auto">
              Mostrando {filas.length} de {inventariosStore.inventariosOrdenados.length} conteos
            </span>
          </div>

          {/* Segmentos limpios de estado */}
          <div className="flex flex-wrap items-center gap-2">
            <SegmentoEstado
              activo={filtroEstado === FILTRO_TODOS}
              onClick={() => setFiltroEstado(FILTRO_TODOS)}
              label="Todos"
              n={inventariosStore.inventariosOrdenados.length}
            />
            {(["en_curso", "borrador", "finalizado", "anulado"] as EstadoInventario[]).map((e) => (
              <SegmentoEstado
                key={e}
                activo={filtroEstado === e}
                onClick={() => setFiltroEstado(e)}
                label={labelEstado(e)}
                n={conteos[e] ?? 0}
              />
            ))}
            {hayFiltro && (
              <button
                type="button"
                onClick={() => {
                  setConsulta("");
                  setFiltroEstado(FILTRO_TODOS);
                }}
                className="ml-2 text-xs font-medium text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── Tabla de Conteos ───────────────────────────────────────────── */}
        <InventariosTabla
          filas={filas}
          onAbrir={(id) => navigate(`/inventarios/${id}`)}
          vacio={
            hayFiltro ? (
              <SinResultados
                titulo="No se encontraron conteos con estos filtros"
                detalle="Prueba buscando con otros términos o seleccionando otra pestaña de estado."
                accion={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConsulta("");
                      setFiltroEstado(FILTRO_TODOS);
                    }}
                  >
                    Ver todos los conteos
                  </Button>
                }
              />
            ) : (
              <SinResultados
                titulo="Aún no hay conteos"
                detalle="Inicia uno para verificar lo que hay en una ubicación."
                accion={
                  puedeContar ? (
                    <Button size="sm" startIcon={<PlusIcon className="h-4 w-4" />} onClick={() => navigate("/inventarios/nuevo")}>
                      Crear primer conteo
                    </Button>
                  ) : undefined
                }
              />
            )
          }
        />
      </ContenedorPagina>
    </>
  );
});

// ── Piezas locales ────────────────────────────────────────────────────────

/**
 * Tarjeta de métrica.
 *
 * No se reusa `MetricCard` del catálogo porque esa pieza está construida para
 * series temporales (`change` + `trend` + badge de variación) y aquí no hay
 * serie: son cuatro contadores del estado actual. Meterla con los campos de
 * variación en blanco dejaría un hueco donde debería ir el porcentaje y
 * sugeriría una comparación contra el periodo anterior que no existe.
 */
function TarjetaMetrica({
  icono,
  valor,
  etiqueta,
  tono,
  onClick,
}: {
  icono: React.ReactNode;
  valor: number;
  etiqueta: string;
  tono: "neutro" | "info" | "atencion" | "error";
  onClick?: () => void;
}) {
  const clases = {
    neutro: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
    info: "bg-accent-50 text-accent-500 dark:bg-accent-500/15 dark:text-accent-400",
    atencion: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400",
    error: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
  }[tono];

  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-left shadow-sm ${
        onClick ? "transition-all duration-200 hover:border-brand-500/50 hover:shadow-md cursor-pointer" : ""
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${clases}`}>
        {icono}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold tabular-nums text-ink-title dark:text-white">
          {valor}
        </span>
        <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">{etiqueta}</span>
      </span>
    </Comp>
  );
}

/** Píldora de filtro por estado, con su cuenta. */
function SegmentoEstado({
  activo,
  onClick,
  label,
  n,
}: {
  activo: boolean;
  onClick: () => void;
  label: string;
  n: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        activo
          ? "bg-brand-500 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
      }`}
    >
      {label}
      <span className={`tabular-nums ${activo ? "text-white/70" : "text-gray-600 dark:text-gray-400"}`}>
        {n}
      </span>
    </button>
  );
}

function labelEstado(estado: Inventario["estado"]): string {
  return { borrador: "Borradores", en_curso: "En curso", finalizado: "Finalizados", anulado: "Anulados" }[estado];
}

export default InventariosPage;
