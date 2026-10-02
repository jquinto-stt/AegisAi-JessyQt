import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { SearchInput } from "@/elements";
import { Select } from "@/elements/form/select";
import { Badge } from "@/elements/ui/badge";
import { DownloadIcon } from "@/icons";
import { inventariosStore, nombreDeActor, type TipoEvento } from "@/stores";
import { construirCsv, descargarCsv, fechaLegibleCsv, nombreArchivoCsv } from "@/lib/csv";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { SinResultados } from "./inventarios.widgets";
import { FILAS_POR_PAGINA } from "./inventarios.constants";
import { antiguedad, buscarCoincidencia, formatearFechaHora } from "./inventarios.presentacion";

const ETIQUETA_TIPO: Record<TipoEvento, string> = {
  inventario_creado: "Conteo creado",
  inventario_iniciado: "Conteo iniciado",
  linea_agregada: "Producto agregado",
  linea_contada: "Producto contado",
  linea_editada: "Conteo editado",
  linea_eliminada: "Producto quitado",
  evidencia_adjuntada: "Foto adjuntada",
  inventario_finalizado: "Conteo cerrado",
  inventario_anulado: "Conteo anulado",
};

export const HistorialPage = observer(function HistorialPage() {
  const navigate = useNavigate();
  const [consulta, setConsulta] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("__todos__");
  const [pagina, setPagina] = useState(0);

  const opcionesTipo = useMemo(
    () => [
      { value: "__todos__", label: "Todos los eventos" },
      ...Object.entries(ETIQUETA_TIPO).map(([value, label]) => ({ value, label })),
    ],
    [],
  );

  // La frase se resuelve una sola vez por evento: es lo que alimenta la
  // búsqueda y el render, y resolverla dos veces por fila en una lista de cien
  // es trabajo repetido sin motivo.
  const eventos = useMemo(
    () =>
      inventariosStore.eventosOrdenados.map((ev) => ({
        ev,
        frase: inventariosStore.fraseDeEventoConNombres(ev),
        actor: nombreDeActor(ev.actorId),
        conteo: inventariosStore.inventarioPorId(ev.inventarioId),
      })),
    [inventariosStore.eventos.length, inventariosStore.inventarios.length, inventariosStore.elementos.length],
  );

  const filtrados = useMemo(
    () =>
      eventos.filter(({ ev, frase, actor, conteo }) => {
        if (filtroTipo !== "__todos__" && ev.tipo !== filtroTipo) return false;
        return buscarCoincidencia(consulta, frase, actor, conteo?.numero, conteo?.nombre);
      }),
    [eventos, filtroTipo, consulta],
  );

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / FILAS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const visibles = filtrados.slice(paginaActual * FILAS_POR_PAGINA, (paginaActual + 1) * FILAS_POR_PAGINA);

  function exportar() {
    const csv = construirCsv(
      ["Fecha", "Evento", "Descripción", "Actor", "Conteo", "Elemento"],
      filtrados.map(({ ev, frase, actor, conteo }) => [
        fechaLegibleCsv(ev.fecha),
        ETIQUETA_TIPO[ev.tipo],
        frase,
        actor,
        conteo?.numero ?? "",
        ev.elementoId ? inventariosStore.nombreDeElemento(ev.elementoId) : "",
      ]),
    );
    descargarCsv(csv, nombreArchivoCsv("historial-inventarios"));
  }

  const hayFiltro = consulta.trim() !== "" || filtroTipo !== "__todos__";

  return (
    <>
      <PageMeta
        title="Historial · Inventarios"
        description="Todo lo que ha pasado en el módulo, con autor y fecha. Orden cronológico inverso."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Historial"
          descripcion="Cada cambio que alguien hizo, con su autor y su fecha. Es el registro que permite reconstruir cómo se llegó al estado actual."
          acciones={
            <Button
              variant="outline"
              size="sm"
              startIcon={<DownloadIcon className="h-4 w-4" />}
              onClick={exportar}
              disabled={filtrados.length === 0}
            >
              Exportar
            </Button>
          }
        />

        {/* ── Filtros ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value);
              setPagina(0);
            }}
            onClear={() => setConsulta("")}
            placeholder="Buscar por descripción, autor o conteo…"
            className="sm:max-w-md sm:flex-1"
            aria-label="Buscar en el historial"
          />
          <div className="w-full sm:w-56">
            <Select
              options={opcionesTipo}
              defaultValue={filtroTipo}
              onChange={(v) => {
                setFiltroTipo(v);
                setPagina(0);
              }}
              aria-label="Filtrar por tipo de evento"
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 sm:ml-auto">
            {filtrados.length} de {eventos.length} eventos
          </span>
        </div>

        {/* ── Lista ─────────────────────────────────────────────────────── */}
        {visibles.length === 0 ? (
          <SinResultados
            titulo={hayFiltro ? "Ningún evento coincide con el filtro" : "Todavía no hay actividad"}
            detalle={
              hayFiltro
                ? "Prueba con otro tipo de evento o borra la búsqueda."
                : "Aquí aparecerá cada creación, conteo, evidencia y firma en cuanto ocurran."
            }
            accion={
              hayFiltro ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConsulta("");
                    setFiltroTipo("__todos__");
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Card className="p-5 sm:p-5">
            <ol className="relative space-y-4">
              {/* La línea vertical que da continuidad a la lista. Es decorativa
                  —el orden lo da el `<ol>`— así que se oculta a lectores. */}
              <span
                aria-hidden
                className="absolute bottom-2 left-[3px] top-2 w-px bg-gray-200 dark:bg-gray-800"
              />
              {visibles.map(({ ev, frase, actor, conteo }) => (
                <li key={ev.id} className="relative flex gap-4 pl-6">
                  <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color="light" size="xs">
                        {ETIQUETA_TIPO[ev.tipo]}
                      </Badge>
                      {conteo && (
                        <button
                          type="button"
                          onClick={() => navigate(`/inventarios/${conteo.id}`)}
                          className="font-mono text-[11px] text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                        >
                          {conteo.numero}
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-body dark:text-gray-300">{frase}</p>
                    <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
                      {actor} · {formatearFechaHora(ev.fecha)} · {antiguedad(ev.fecha)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* ── Paginación ────────────────────────────────────────────────── */}
        {filtrados.length > FILAS_POR_PAGINA && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Mostrando {paginaActual * FILAS_POR_PAGINA + 1}–
              {Math.min((paginaActual + 1) * FILAS_POR_PAGINA, filtrados.length)} de {filtrados.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={paginaActual === 0}
              >
                Anterior
              </Button>
              <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {paginaActual + 1} / {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                disabled={paginaActual >= totalPaginas - 1}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </ContenedorPagina>
    </>
  );
});

export default HistorialPage;
