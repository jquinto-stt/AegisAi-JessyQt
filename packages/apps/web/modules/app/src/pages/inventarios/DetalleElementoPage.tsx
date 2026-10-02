import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Alert } from "@/elements/ui/alert";
import { Modal } from "@/elements/ui/modal";
import {
  BoxIcon,
  PencilIcon,
} from "@/icons";
import { cn } from "@/utils";
import { inventariosStore, puedeGestionarCatalogo, type CondicionElemento } from "@/stores";
import { CabeceraPagina, ContenedorPagina, EnlaceVolver } from "./inventarios.ui";
import {
  CondicionBadge,
  DiferenciaTexto,
  EstadoElementoBadge,
  EstadoInventarioBadge,
  EstadoLineaBadge,
  SinResultados,
} from "./inventarios.widgets";
import { ModalElemento, EtiquetaUnidad } from "./ModalElemento";
import { TABS_ELEMENTO, TAB_ELEMENTO_LABEL, type TabElemento } from "./inventarios.constants";
import { antiguedad, caminoDe, formatearFechaCorta, formatearFechaHora } from "./inventarios.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// FICHA DE ELEMENTO
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Qué contesta esta pantalla ─────────────────────────────────────────────
//
// «¿Cuántas veces se ha contado esto, dónde estaba cada vez, y qué se encontró?»
// Es la ficha que se abre cuando un conteo muestra una diferencia y alguien
// necesita contexto antes de decidir qué hacer.
//
// ── Por qué hay tres pestañas y no una página larga ────────────────────────
//
// Las tres responden a preguntas de uso distinto: qué es (información), qué
// pruebas hay (evidencia) y qué ha pasado (historial). Apiladas en una sola
// página, la de historial enterraría las otras dos — y el historial es lo que
// menos se consulta en el día a día, no al revés.

export const DetalleElementoPage = observer(function DetalleElementoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabElemento>("informacion");
  const [modalEditar, setModalEditar] = useState(false);
  const [modalBaja, setModalBaja] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const elemento = inventariosStore.elementoPorId(id);
  const puedeGestionar = puedeGestionarCatalogo();
  const porId = inventariosStore.ubicacionesPorId;

  const resumen = useMemo(
    () => (elemento ? inventariosStore.resumenDeElemento(elemento.id) : null),
    [elemento?.id, inventariosStore.lineas.length, inventariosStore.inventarios.length],
  );

  // Todas las líneas del elemento, con su conteo resuelto. Es lo que alimenta
  // las tres pestañas, así que se calcula una sola vez.
  const apariciones = useMemo(() => {
    if (!elemento) return [];
    return inventariosStore.lineas
      .filter((l) => l.elementoId === elemento.id)
      .map((l) => ({ linea: l, inventario: inventariosStore.inventarioPorId(l.inventarioId) }))
      .filter((p) => p.inventario !== undefined)
      .sort((a, b) => Date.parse(b.inventario!.createdAt) - Date.parse(a.inventario!.createdAt));
  }, [elemento?.id, inventariosStore.lineas.length]);

  const evidencias = useMemo(
    () =>
      elemento
        ? inventariosStore.evidenciasDeElemento(elemento.id).map((ev) => ({
            ev,
            inventario: inventariosStore.inventarioPorId(ev.inventarioId),
          }))
        : [],
    [elemento?.id, inventariosStore.evidencias.length],
  );

  const eventos = useMemo(
    () => (elemento ? inventariosStore.eventosDeElemento(elemento.id) : []),
    [elemento?.id, inventariosStore.eventos.length],
  );

  // ── Elemento no encontrado ──────────────────────────────────────────────
  if (!elemento) {
    return (
      <>
        <PageMeta title="Elemento no encontrado · Inventarios" />
        <ContenedorPagina>
          <CabeceraPagina
            volver={<EnlaceVolver onClick={() => navigate("/inventarios/elementos")}>Volver a Elementos</EnlaceVolver>}
            titulo="Este elemento no existe"
          />
          <SinResultados
            titulo="No encontramos el elemento que buscas"
            detalle="Los elementos creados en esta demostración viven en memoria y se reinician al recargar la página."
            accion={
              <Button size="sm" onClick={() => navigate("/inventarios/elementos")}>
                Ir al catálogo
              </Button>
            }
          />
        </ContenedorPagina>
      </>
    );
  }

  const esInactivo = elemento.estado === "inactivo";

  function alternarEstado() {
    if (!elemento) return;
    const r = esInactivo ? inventariosStore.activarElemento(elemento.id) : inventariosStore.desactivarElemento(elemento.id);
    if (!r.ok) {
      setAviso(r.motivo ?? "No se pudo cambiar el estado");
      return;
    }
    setAviso(null);
    setModalBaja(false);
  }

  return (
    <>
      <PageMeta
        title={`${elemento.nombre} · Inventarios`}
        description={`${elemento.codigo} — ${elemento.categoria}. Historial de conteos, evidencias y condición observada.`}
      />

      <ContenedorPagina>
        <div className="mb-1">
          <EnlaceVolver onClick={() => navigate("/inventarios/elementos")}>Volver a productos</EnlaceVolver>
        </div>

        {/* ═══ Cabecera del Producto ═══════════════════════════════════════ */}
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
                <BoxIcon className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">{elemento.codigo}</span>
                  <EstadoElementoBadge estado={elemento.estado} />
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-title dark:text-white">{elemento.nombre}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge color="light" size="sm">
                    {elemento.categoria}
                  </Badge>
                  <EtiquetaUnidad unidad={elemento.unidad} />
                </div>
                {elemento.descripcion && (
                  <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {elemento.descripcion}
                  </p>
                )}
              </div>
            </div>

            {puedeGestionar && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" startIcon={<PencilIcon className="h-4 w-4" />} onClick={() => setModalEditar(true)}>
                  Editar producto
                </Button>
                <Button
                  variant={esInactivo ? "primary" : "outline"}
                  size="sm"
                  onClick={() => (esInactivo ? alternarEstado() : setModalBaja(true))}
                >
                  {esInactivo ? "Reactivar producto" : "Dar de baja"}
                </Button>
              </div>
            )}
          </div>

          {/* ── Métricas de uso ─────────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-1 gap-3.5 border-t border-gray-100 pt-5 sm:grid-cols-3 dark:border-gray-800">
            <Metrica valor={resumen?.vecesContado ?? 0} etiqueta="Apariciones en conteos" />
            <Metrica
              valor={resumen?.discrepancias ?? 0}
              etiqueta="Conteos con diferencia"
              tono={(resumen?.discrepancias ?? 0) > 0 ? "atencion" : "neutro"}
            />
            <Metrica
              valor={resumen?.ultimaFecha ? formatearFechaCorta(resumen.ultimaFecha) : "Sin registrar"}
              etiqueta="Último conteo realizado"
              esTexto
            />
          </div>
        </Card>

        {aviso && <Alert variant="warning" title="Atención" message={aviso} />}

        {esInactivo && (
          <Alert
            variant="warning"
            title="Producto dado de baja"
            message="Este producto no aparecerá en la creación de nuevos conteos, pero su historial y registros previos se conservan."
          />
        )}

        {/* ═══ Pestañas de detalle ════════════════════════════════════════ */}
        <div>
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
            {TABS_ELEMENTO.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  tab === t
                    ? "border-brand-500 text-brand-700 dark:text-brand-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                )}
              >
                {t === "informacion" ? "Conteos y ubicaciones" : TAB_ELEMENTO_LABEL[t]}
                {t === "evidencia" && evidencias.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {evidencias.length}
                  </span>
                )}
                {t === "historial" && eventos.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {eventos.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {/* ── Conteos y ubicaciones ─────────────────────────────────── */}
            {tab === "informacion" && (
              <Card className="p-5 sm:p-6">
                <h2 className="text-base font-semibold text-ink-title dark:text-white">Conteos donde ha participado</h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Historial de verificaciones de inventario donde se ha registrado este producto.
                </p>

                {apariciones.length === 0 ? (
                  <div className="mt-5">
                    <SinResultados
                      titulo="Este producto aún no se ha verificado en ningún conteo"
                      detalle="Aparecerá en esta lista tan pronto como se agregue y verifique en un conteo de inventario."
                    />
                  </div>
                ) : (
                  <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
                    {apariciones.map(({ linea, inventario: inv }) => (
                      <li key={linea.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/inventarios/${inv!.id}`)}
                            className="block text-left group"
                          >
                            <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                              {inv!.numero}
                            </span>
                            <span className="mt-0.5 block truncate text-sm font-semibold text-ink-title group-hover:text-brand-700 dark:text-gray-100">
                              {caminoDe(inv!.ubicacionId, porId)}
                            </span>
                          </button>
                          <span className="mt-1 block text-xs text-gray-600 dark:text-gray-400">
                            {formatearFechaHora(linea.contadaEn) !== "—"
                              ? `Contado el ${formatearFechaHora(linea.contadaEn)}`
                              : "Pendiente de conteo"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                          <span className="text-right">
                            <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                              Esperado
                            </span>
                            <span className="text-sm font-medium tabular-nums text-ink-body dark:text-gray-300">
                              {linea.cantidadEsperada === null ? "—" : linea.cantidadEsperada}
                            </span>
                          </span>
                          <span className="text-right">
                            <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                              Contado
                            </span>
                            <span className="text-sm font-semibold tabular-nums text-ink-title dark:text-gray-100">
                              {linea.cantidadObservada === null ? "—" : linea.cantidadObservada}
                            </span>
                          </span>
                          <DiferenciaTexto linea={linea} className="w-12 text-right text-sm" />
                          <EstadoLineaBadge linea={linea} />
                          <EstadoInventarioBadge estado={inv!.estado} size="xs" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {/* ── Evidencia fotográfica ─────────────────────────────────── */}
            {tab === "evidencia" && (
              <Card className="p-5 sm:p-6">
                <h2 className="text-base font-semibold text-ink-title dark:text-white">Fotografías de evidencia</h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Imágenes adjuntadas durante los conteos para registrar novedades o estado del producto.
                </p>

                {evidencias.length === 0 ? (
                  <div className="mt-5">
                    <SinResultados
                      titulo="No hay fotografías adjuntas para este producto"
                      detalle="Las fotos se adjuntan desde la mesa de trabajo de cada conteo al reportar novedades o daños."
                    />
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {evidencias.map(({ ev, inventario: inv }) => (
                      <figure
                        key={ev.id}
                        className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
                      >
                        <img src={ev.dataUrl} alt={ev.nombreArchivo} className="h-32 w-full object-cover" />
                        <figcaption className="p-2.5">
                          <span className="block truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                            {ev.nombreArchivo}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-gray-600 dark:text-gray-400">
                            {inv?.numero ?? "—"} · {formatearFechaCorta(ev.subidaEn)}
                          </span>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* ── Historial ───────────────────────────────────────────── */}
            {tab === "historial" && (
              <Card className="p-5 sm:p-6">
                <h2 className="text-base font-semibold text-ink-title dark:text-white">Historial de actividades</h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Registro de cambios, conteos y ajustes en los que ha estado involucrado este producto.
                </p>

                {eventos.length === 0 ? (
                  <div className="mt-5">
                    <SinResultados
                      titulo="Aún no hay actividad registrada"
                      detalle="Los movimientos y registros aparecerán aquí automáticamente."
                    />
                  </div>
                ) : (
                  <ul className="mt-4 space-y-3.5">
                    {eventos.map((ev) => (
                      <li key={ev.id} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-ink-body dark:text-gray-300">
                            {inventariosStore.fraseDeEventoConNombres(ev)}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                            {formatearFechaHora(ev.fecha)} · {antiguedad(ev.fecha)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>
        </div>
      </ContenedorPagina>

      {/* ═══ Modales ═════════════════════════════════════════════════════ */}
      <ModalElemento abierto={modalEditar} elemento={elemento} onCerrar={() => setModalEditar(false)} />

      <Modal isOpen={modalBaja} onClose={() => setModalBaja(false)} className="max-w-md p-6">
        <h2 className="text-lg font-semibold text-ink-title dark:text-white">Dar de baja el producto</h2>
        <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          <strong>{elemento.nombre}</strong> se ocultará del listado activo. Su historial y registros anteriores se conservarán intactos y podrás reactivarlo cuando lo necesites.
        </p>
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <Button variant="outline" onClick={() => setModalBaja(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={alternarEstado}>
            Dar de baja
          </Button>
        </div>
      </Modal>
    </>
  );
});

// ── Piezas locales ────────────────────────────────────────────────────────

function Metrica({
  valor,
  etiqueta,
  tono = "neutro",
  esTexto,
}: {
  valor: number | string;
  etiqueta: string;
  tono?: "neutro" | "atencion";
  esTexto?: boolean;
}) {
  return (
    <div>
      <p
        className={cn(
          "font-semibold",
          esTexto ? "text-sm" : "text-lg tabular-nums",
          tono === "atencion" ? "text-warning-700 dark:text-warning-400" : "text-ink-title dark:text-white",
        )}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] leading-tight text-gray-500 dark:text-gray-400">{etiqueta}</p>
    </div>
  );
}

export default DetalleElementoPage;
