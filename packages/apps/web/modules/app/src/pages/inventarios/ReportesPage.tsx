import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { SearchInput } from "@/elements";
import { Select } from "@/elements/form/select";
import { Badge } from "@/elements/ui/badge";
import { DownloadIcon } from "@/icons";
import { inventariosStore, type Inventario } from "@/stores";
import { estadoDeLinea, progresoDe } from "@/domain/inventarios/inventarios.domain";
import { construirCsv, descargarCsv, fechaLegibleCsv, nombreArchivoCsv } from "@/lib/csv";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { SinResultados, EstadoInventarioBadge } from "./inventarios.widgets";
import { TIPO_INVENTARIO_META, FILTRO_TODOS } from "./inventarios.constants";
import { buscarCoincidencia, caminoDe, formatearFechaCorta } from "./inventarios.presentacion";
import { cn } from "@/utils";

// ═══════════════════════════════════════════════════════════════════════════
// REPORTES — el resultado agregado de los conteos
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Qué se puede reportar honestamente y qué no ────────────────────────────
//
// **Sí**: cuántos conteos se hicieron, cuánto cuadró, cuánto no, qué elementos
// aparecen con más frecuencia en las diferencias y qué se reportó dañado. Todo
// eso sale de datos que existen.
//
// **No**: valorización del inventario (necesita precios de compra, que son otro
// dominio), rotación (necesita ventas), variación porcentual contra el periodo
// anterior (necesita una serie histórica real, y en un mock no la hay). Una
// gráfica de tendencia sobre datos inventados es decoración que miente, y por eso
// no hay ninguna: en su lugar está la tabla de conteos con sus números reales.
//
// ── Por qué solo cuentan los conteos FINALIZADOS ──────────────────────────
//
// Un conteo en curso está a medias: sus líneas sin contar no son «cero», son
// «todavía no». Incluirlo en un agregado haría que un elemento a medio contar
// apareciera como faltante. Los borradores y anulados tampoco: no describen
// ningún estado real de la ubicación.

export const ReportesPage = observer(function ReportesPage() {
  const navigate = useNavigate();
  const [consulta, setConsulta] = useState("");
  const [filtroUbicacion, setFiltroUbicacion] = useState(FILTRO_TODOS);

  const porId = inventariosStore.ubicacionesPorId;

  const opcionesUbicacion = useMemo(
    () => [
      { value: FILTRO_TODOS, label: "Todas las ubicaciones" },
      ...inventariosStore.ubicacionesContables.map((u) => ({ value: u.id, label: caminoDe(u.id, porId) })),
    ],
    [porId, inventariosStore.ubicaciones.length],
  );

  // Solo finalizados, y solo los que pasan los filtros.
  const cerrados = useMemo(
    () =>
      inventariosStore.inventariosOrdenados
        .filter((i) => i.estado === "finalizado")
        .filter((i) => filtroUbicacion === FILTRO_TODOS || i.ubicacionId === filtroUbicacion)
        .filter((i) => {
          if (!consulta.trim()) return true;
          return buscarCoincidencia(consulta, i.numero, i.nombre, caminoDe(i.ubicacionId, porId));
        }),
    [consulta, filtroUbicacion, porId, inventariosStore.inventarios.length],
  );

  // ── Agregados ──────────────────────────────────────────────────────────

  const agregado = useMemo(() => {
    let lineasTotales = 0;
    let contadas = 0;
    let coinciden = 0;
    let sobra = 0;
    let falta = 0;
    let sinRef = 0;
    let danados = 0;
    const difPorElemento = new Map<string, { sobra: number; falta: number; dañado: number }>();

    for (const inv of cerrados) {
      const lineas = inventariosStore.lineasDe(inv.id);
      lineasTotales += lineas.length;

      for (const l of lineas) {
        if (l.cantidadObservada === null) continue; // no debería pasar en un finalizado, pero no se asume
        contadas += 1;
        const e = estadoDeLinea(l);
        if (e === "coincide") coinciden += 1;
        else if (e === "sobra") sobra += 1;
        else if (e === "falta") falta += 1;
        else if (e === "sin_esperado") sinRef += 1;

        if (l.condicion === "dañado") danados += 1;

        if (e === "sobra" || e === "falta" || l.condicion === "dañado") {
          const acc = difPorElemento.get(l.elementoId) ?? { sobra: 0, falta: 0, dañado: 0 };
          if (e === "sobra") acc.sobra += 1;
          if (e === "falta") acc.falta += 1;
          if (l.condicion === "dañado") acc.dañado += 1;
          difPorElemento.set(l.elementoId, acc);
        }
      }
    }

    const conDiferencia = sobra + falta;
    // El denominador del cuadre son las líneas que **se pudieron comparar**, no
    // las contadas. Una línea `sin_esperado` no tenía cantidad esperada contra
    // la que medirse: meterla abajo convierte «no se pudo comprobar» en «no
    // cuadró», que es lo contrario de lo que pasó. Con 20 contadas y 10 sin
    // referencia el módulo anunciaba 35 % (7/20) cuando el cuadre real de lo
    // comparable era 7 de 10. Se expone aparte `comparables` para que la UI
    // pueda decir sobre cuántas se está midiendo en vez de insinuarlo.
    const comparables = coinciden + sobra + falta;
    const elementosConProblema = [...difPorElemento.entries()]
      .map(([elementoId, c]) => ({
        elementoId,
        nombre: inventariosStore.nombreDeElemento(elementoId),
        ...c,
        total: c.sobra + c.falta + c.dañado,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      conteos: cerrados.length,
      lineasTotales,
      contadas,
      coinciden,
      sobra,
      falta,
      sinRef,
      danados,
      conDiferencia,
      comparables,
      cuadre: comparables === 0 ? null : Math.round((coinciden / comparables) * 100),
      elementosConProblema,
    };
  }, [cerrados, inventariosStore.lineas.length, inventariosStore.elementos.length]);

  function exportarConteos() {
    const csv = construirCsv(
      ["Conteo", "Nombre", "Tipo", "Ubicación", "Elementos", "Contados", "Coinciden", "Diferencias", "Dañados", "Finalizado"],
      cerrados.map((inv) => {
        const lineas = inventariosStore.lineasDe(inv.id);
        let coin = 0;
        let dif = 0;
        let dan = 0;
        for (const l of lineas) {
          if (l.cantidadObservada === null) continue;
          const e = estadoDeLinea(l);
          if (e === "coincide") coin += 1;
          if (e === "sobra" || e === "falta") dif += 1;
          if (l.condicion === "dañado") dan += 1;
        }
        return [
          inv.numero,
          inv.nombre,
          TIPO_INVENTARIO_META[inv.tipo].label,
          caminoDe(inv.ubicacionId, porId),
          lineas.length,
          progresoDe(lineas).contadas,
          coin,
          dif,
          dan,
          fechaLegibleCsv(inv.finalizadoEn),
        ];
      }),
    );
    descargarCsv(csv, nombreArchivoCsv("reporte-conteos"));
  }

  function exportarElementos() {
    const csv = construirCsv(
      ["Elemento", "Faltantes", "Sobrantes", "Dañados", "Total"],
      agregado.elementosConProblema.map((e) => [e.nombre, e.falta, e.sobra, e.dañado, e.total]),
    );
    descargarCsv(csv, nombreArchivoCsv("reporte-elementos"));
  }

  const hayFiltro = consulta.trim() !== "" || filtroUbicacion !== FILTRO_TODOS;

  return (
    <>
      <PageMeta
        title="Reportes · Inventarios"
        description="Resultado agregado de los conteos finalizados. Cuánto cuadró, cuánto no y qué elementos concentran las diferencias."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Reportes"
          descripcion="Solo cuentan los conteos finalizados: un conteo a medias no describe el estado de ninguna ubicación."
          acciones={
            <Button
              variant="outline"
              size="sm"
              startIcon={<DownloadIcon className="h-4 w-4" />}
              onClick={exportarConteos}
              disabled={cerrados.length === 0}
            >
              Exportar
            </Button>
          }
        />

        {/* ── Filtros ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onClear={() => setConsulta("")}
            placeholder="Buscar por número, nombre o ubicación…"
            className="sm:max-w-md sm:flex-1"
            aria-label="Buscar conteos cerrados"
          />
          <div className="w-full sm:w-64">
            <Select
              options={opcionesUbicacion}
              defaultValue={filtroUbicacion}
              onChange={setFiltroUbicacion}
              aria-label="Filtrar por ubicación"
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 sm:ml-auto">
            {cerrados.length} {cerrados.length === 1 ? "conteo cerrado" : "conteos cerrados"}
          </span>
        </div>

        {/* ── Cifras principales ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Cifra valor={String(agregado.conteos)} etiqueta="Conteos cerrados" />
          <Cifra valor={String(agregado.lineasTotales)} etiqueta="Líneas verificadas" />
          <Cifra
            valor={agregado.cuadre === null ? "—" : `${agregado.cuadre}%`}
            etiqueta="Líneas que cuadraron"
            detalle={
              agregado.cuadre === null
                ? "Sin líneas que comparar"
                : `${agregado.coinciden} de ${agregado.comparables} comparables`
            }
          />
          <Cifra
            valor={String(agregado.conDiferencia)}
            etiqueta="Líneas con diferencia"
            tono={agregado.conDiferencia > 0 ? "atencion" : "neutro"}
            detalle={`${agregado.falta} faltan · ${agregado.sobra} sobran`}
          />
        </div>

        {/* ── Desglose por resultado ────────────────────────────────────── */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-ink-title dark:text-white">Desglose de resultados</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Sobre las {agregado.contadas} líneas verificadas en los conteos cerrados
            {agregado.sinRef > 0 && (
              <> · {agregado.sinRef} sin referencia no entran en el cuadre</>
            )}
            .
          </p>

          {agregado.contadas === 0 ? (
            <div className="mt-4 py-6 text-center text-xs text-gray-600 dark:text-gray-400">
              No hay líneas contadas con los filtros actuales.
            </div>
          ) : (
            <>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                {agregado.coinciden > 0 && (
                  <span
                    className="bg-success-500"
                    style={{ width: `${(agregado.coinciden / agregado.contadas) * 100}%` }}
                    title={`${agregado.coinciden} coinciden`}
                  />
                )}
                {agregado.falta > 0 && (
                  <span
                    className="bg-warning-500"
                    style={{ width: `${(agregado.falta / agregado.contadas) * 100}%` }}
                    title={`${agregado.falta} faltan`}
                  />
                )}
                {agregado.sobra > 0 && (
                  <span
                    className="bg-warning-300 dark:bg-warning-600"
                    style={{ width: `${(agregado.sobra / agregado.contadas) * 100}%` }}
                    title={`${agregado.sobra} sobran`}
                  />
                )}
                {agregado.sinRef > 0 && (
                  <span
                    className="bg-gray-300 dark:bg-gray-600"
                    style={{ width: `${(agregado.sinRef / agregado.contadas) * 100}%` }}
                    title={`${agregado.sinRef} sin referencia`}
                  />
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                <Leyenda color="success" label="Coinciden" n={agregado.coinciden} />
                <Leyenda color="warning" label="Faltan" n={agregado.falta} />
                <Leyenda color="warning-suave" label="Sobran" n={agregado.sobra} />
                <Leyenda color="gray" label="Sin referencia" n={agregado.sinRef} />
                <Leyenda color="error" label="Reportados dañados" n={agregado.danados} />
              </div>
            </>
          )}
        </Card>

        {/* ── Elementos con más incidencias ─────────────────────────────── */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-title dark:text-white">
                Productos con diferencias
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Productos que presentaron faltantes, sobrantes o daños reportados.
              </p>
            </div>
            {agregado.elementosConProblema.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportarElementos}>
                Exportar lista
              </Button>
            )}
          </div>

          {agregado.elementosConProblema.length === 0 ? (
            <div className="mt-4 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
              {agregado.contadas === 0
                ? "No hay productos registrados con los filtros actuales."
                : "¡Todo cuadró perfectamente! No se encontraron diferencias ni productos dañados."}
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell header>Elemento</TableCell>
                    <TableCell header className="w-[7rem] text-right">Faltantes</TableCell>
                    <TableCell header className="w-[7rem] text-right">Sobrantes</TableCell>
                    <TableCell header className="w-[7rem] text-right">Dañados</TableCell>
                    <TableCell header className="w-[6rem] text-right">Total</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agregado.elementosConProblema.slice(0, 20).map((e) => (
                    <TableRow
                      key={e.elementoId}
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => navigate(`/inventarios/elementos/${e.elementoId}`)}
                          className="text-left text-sm text-ink-title dark:text-gray-100"
                        >
                          {e.nombre}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Numero n={e.falta} tono="atencion" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Numero n={e.sobra} tono="atencion" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Numero n={e.dañado} tono="error" />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium tabular-nums text-ink-title dark:text-white">
                          {e.total}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {agregado.elementosConProblema.length > 20 && (
                <p className="border-t border-gray-200 px-4 py-2 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Mostrando los 20 con más incidencias de {agregado.elementosConProblema.length}. Exporta la
                  lista para verla completa.
                </p>
              )}
            </div>
          )}
        </Card>

        {/* ── Conteos incluidos ─────────────────────────────────────────── */}
        <Card className="p-5 sm:p-5">
          <h2 className="text-sm font-semibold text-ink-title dark:text-white">Conteos cerrados</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            El detalle de cada conteo que entra en las cifras de arriba.
          </p>

          {cerrados.length === 0 ? (
            <div className="mt-4">
              <SinResultados
                titulo={hayFiltro ? "Ningún conteo cerrado coincide" : "Todavía no hay conteos cerrados"}
                detalle={
                  hayFiltro
                    ? "Prueba con otra ubicación o borra la búsqueda."
                    : "Los reportes se calculan sobre conteos finalizados. Finaliza el primero y aparecerá aquí."
                }
                accion={
                  <Button size="sm" onClick={() => navigate("/inventarios")}>
                    Ir a los conteos
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell header>Conteo</TableCell>
                    <TableCell header>Ubicación</TableCell>
                    <TableCell header className="w-[8rem]">Finalizado</TableCell>
                    <TableCell header className="w-[7rem] text-right">Líneas</TableCell>
                    <TableCell header className="w-[7rem] text-right">Cuadraron</TableCell>
                    <TableCell header className="w-[7rem] text-right">Diferencias</TableCell>
                    <TableCell header className="w-[6rem]">Estado</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cerrados.map((inv) => (
                    <FilaConteo key={inv.id} inventario={inv} camino={caminoDe(inv.ubicacionId, porId)} onAbrir={() => navigate(`/inventarios/${inv.id}`)} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </ContenedorPagina>
    </>
  );
});

// ── Piezas locales ────────────────────────────────────────────────────────

function Cifra({
  valor,
  etiqueta,
  detalle,
  tono = "neutro",
}: {
  valor: string;
  etiqueta: string;
  detalle?: string;
  tono?: "neutro" | "atencion";
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tono === "atencion" ? "text-warning-700 dark:text-warning-400" : "text-ink-title dark:text-white",
        )}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{etiqueta}</p>
      {detalle && <p className="mt-1 text-[10px] text-gray-600 dark:text-gray-400">{detalle}</p>}
    </div>
  );
}

function Leyenda({
  color,
  label,
  n,
}: {
  color: "success" | "warning" | "warning-suave" | "gray" | "error";
  label: string;
  n: number;
}) {
  const clase = {
    success: "bg-success-500",
    warning: "bg-warning-500",
    "warning-suave": "bg-warning-300 dark:bg-warning-600",
    gray: "bg-gray-300 dark:bg-gray-600",
    error: "bg-error-500",
  }[color];

  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-sm", clase)} />
      <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
      <span className="text-xs font-medium tabular-nums text-ink-title dark:text-white">{n}</span>
    </span>
  );
}

function Numero({ n, tono }: { n: number; tono: "atencion" | "error" }) {
  if (n === 0) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>;
  return (
    <span
      className={cn(
        "text-sm font-medium tabular-nums",
        tono === "atencion" ? "text-warning-700 dark:text-warning-400" : "text-error-700 dark:text-error-400",
      )}
    >
      {n}
    </span>
  );
}

const FilaConteo = observer(function FilaConteo({
  inventario,
  camino,
  onAbrir,
}: {
  inventario: Inventario;
  camino: string;
  onAbrir: () => void;
}) {
  const lineas = inventariosStore.lineasDe(inventario.id);
  const progreso = progresoDe(lineas);
  let coin = 0;
  let dif = 0;
  for (const l of lineas) {
    if (l.cantidadObservada === null) continue;
    const e = estadoDeLinea(l);
    if (e === "coincide") coin += 1;
    if (e === "sobra" || e === "falta") dif += 1;
  }

  return (
    <TableRow className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
      <TableCell>
        <button type="button" onClick={onAbrir} className="block w-full text-left">
          <span className="block font-mono text-[11px] text-gray-600 dark:text-gray-400">{inventario.numero}</span>
          <span className="mt-0.5 block truncate text-sm text-ink-title dark:text-gray-100">{inventario.nombre}</span>
        </button>
      </TableCell>
      <TableCell>
        <span className="block truncate text-xs text-ink-body dark:text-gray-300">{camino}</span>
      </TableCell>
      <TableCell>
        <span className="text-xs text-ink-body dark:text-gray-300">{formatearFechaCorta(inventario.finalizadoEn)}</span>
      </TableCell>
      <TableCell className="text-right">
        <span className="text-sm tabular-nums text-ink-body dark:text-gray-300">{progreso.total}</span>
      </TableCell>
      <TableCell className="text-right">
        <span className="text-sm tabular-nums text-ink-body dark:text-gray-300">{coin}</span>
      </TableCell>
      <TableCell className="text-right">
        <Numero n={dif} tono="atencion" />
      </TableCell>
      <TableCell>
        <EstadoInventarioBadge estado={inventario.estado} size="xs" />
      </TableCell>
    </TableRow>
  );
});

export default ReportesPage;
