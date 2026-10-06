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
  BoxCubeIcon,
  CheckCircleIcon,
  CloseIcon,
  DownloadIcon,
  PencilIcon,
  PlusIcon,
  TrashBinIcon,
} from "@/icons";
import {
  inventariosStore,
  nombreDeActor,
  puedeContarInventario,
  puedeFinalizarInventario,
  puedeGestionarCatalogo,
  type CondicionElemento,
  type LineaInventario,
} from "@/stores";
import { inventarioEditable, estadoDeLinea, motivoSoloLectura, progresoDe } from "@/domain/inventarios/inventarios.domain";
import { construirCsv, descargarCsv, fechaLegibleCsv, nombreArchivoCsv } from "@/lib/csv";
import { CabeceraPagina, ContenedorPagina, EnlaceVolver } from "./inventarios.ui";
import {
  EstadoInventarioBadge,
  ProgresoBar,
  SinResultados,
  UbicacionFija,
} from "./inventarios.widgets";
import { FiltrosLineas, LineasTabla } from "./LineasTabla";
import { ModalAgregarElemento } from "./ModalAgregarElemento";
import { TIPO_INVENTARIO_META } from "./inventarios.constants";
import {
  FILTRO_TODOS,
  caminoDe,
  estadoBotonFinalizar,
  filtrarLineas,
  formatearFechaHora,
  type FiltroEstadoLinea,
} from "./inventarios.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE DE UN CONTEO
// ═══════════════════════════════════════════════════════════════════════════
//
// Es la pantalla donde ocurre el trabajo. Todo lo demás del módulo existe para
// llegar aquí o para leer lo que quedó registrado aquí.
//
// ── El orden de la página es el orden del trabajo ──────────────────────────
//
//   1. Dónde se está contando (fijo, no un campo).
//   2. Cuánto falta (la barra y el bloqueo de «Finalizar» con su motivo).
//   3. Las líneas, filtrables.
//   4. La línea de tiempo, al final y plegada: se consulta, no se trabaja sobre
//      ella.
//
// El estado del conteo decide qué se puede hacer en cada momento, y **ese
// estado no se puede forzar desde la UI**: se pasa de borrador a en curso con
// «Iniciar», y de en curso a finalizado con «Finalizar». No hay un `<Select>`
// para cambiar el estado a mano. Un conteo cuyo estado se pudiera elegir no
// sería un acto con fecha.

export const DetalleInventarioPage = observer(function DetalleInventarioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [filtro, setFiltro] = useState<FiltroEstadoLinea>(FILTRO_TODOS);
  const [consulta, setConsulta] = useState("");
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [modalAnular, setModalAnular] = useState(false);
  const [lineaEvidencia, setLineaEvidencia] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const inventario = inventariosStore.inventarioPorId(id);
  const lineas = useMemo(
    () => (inventario ? inventariosStore.lineasDe(inventario.id) : []),
    [inventario?.id, inventariosStore.lineas.length],
  );

  const puedeContar = puedeContarInventario();
  const puedeFirmar = puedeFinalizarInventario();
  // Crear elementos es `inventory.manage`, una capacidad DISTINTA de contar.
  // Se resuelve aquí, en la capa de acceso, y baja al modal como prop: el store
  // no conoce permisos y el modal no debe inventarlos por su cuenta.
  const puedeGestionar = puedeGestionarCatalogo();
  const porId = inventariosStore.ubicacionesPorId;

  const filtradas = useMemo(
    () =>
      filtrarLineas(lineas, {
        filtroEstado: filtro,
        consulta,
        nombreDeElemento: (elementoId) => inventariosStore.nombreDeElemento(elementoId),
        codigoDeElemento: (elementoId) => inventariosStore.elementoPorId(elementoId)?.codigo ?? "",
      }),
    [lineas, filtro, consulta],
  );

  const progreso = useMemo(() => progresoDe(lineas), [lineas]);
  const conteos = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const l of lineas) {
      if (l.cantidadObservada === null) acc.pendiente = (acc.pendiente ?? 0) + 1;
    }
    // Los estados comparativos se recalculan con la función del dominio, que es
    // la definición única: reimplementar la comparación aquí volvería a crear
    // la segunda respuesta que todo el módulo evita.
    return {
      pendiente: acc.pendiente ?? 0,
      ...conteoComparativo(lineas),
    };
  }, [lineas]);

  // ── Conteo no encontrado ────────────────────────────────────────────────
  if (!inventario) {
    return (
      <>
        <PageMeta title="Conteo no encontrado · Inventarios" />
        <ContenedorPagina>
          <CabeceraPagina
            volver={<EnlaceVolver onClick={() => navigate("/inventarios")}>Volver a los conteos</EnlaceVolver>}
            titulo="Este conteo no existe"
          />
          <SinResultados
            titulo="No encontramos el conteo que buscas"
            detalle="Puede que se haya creado en una sesión anterior — los datos de esta demostración viven en memoria y se reinician al recargar."
            accion={
              <Button size="sm" onClick={() => navigate("/inventarios")}>
                Ir al listado
              </Button>
            }
          />
        </ContenedorPagina>
      </>
    );
  }

  const editable = inventarioEditable(inventario.estado);
  const camino = caminoDe(inventario.ubicacionId, porId);
  const finalizacion = estadoBotonFinalizar(inventario, lineas, puedeFirmar);
  const meta = TIPO_INVENTARIO_META[inventario.tipo];
  const eventos = inventariosStore.eventosDeInventario(inventario.id);

  // Las tres líneas siguientes existen para que TypeScript conserve el
  // estrechamiento de `inventario` dentro de las clausuras de abajo (`iniciar`,
  // `finalizar`, `exportar`). Un `if (!inventario) return …` estrecha el tipo en
  // el cuerpo del componente, pero no dentro de una función que se declara
  // después: al llamarse más tarde, el compilador ya no puede garantizar que la
  // referencia siga viva.
  const activo = inventario;
  const inventarioId = activo.id;
  const lineasDeEsteConteo = lineas;

  // ── Acciones ────────────────────────────────────────────────────────────

  function iniciar() {
    const r = inventariosStore.iniciarInventario(inventarioId, "op_inv_supervisor");
    setAviso(r.ok ? null : r.motivo ?? "No se pudo iniciar");
  }

  function guardarLinea(
    lineaId: string,
    datos: { cantidadObservada: number | null; condicion: CondicionElemento; observacion?: string },
  ): string | null {
    const r = inventariosStore.contarLinea(lineaId, datos, "op_inv_supervisor");
    return r.ok ? null : r.motivo ?? "No se pudo registrar";
  }

  function quitarLinea(lineaId: string) {
    const r = inventariosStore.quitarLinea(lineaId, "op_inv_supervisor");
    if (!r.ok) setAviso(r.motivo ?? "No se pudo quitar la línea");
  }

  function exportar() {
    const csv = construirCsv(
      ["Elemento", "Código", "Esperado", "Observado", "Diferencia", "Condición", "Observación", "Contada"],
      lineas.map((l) => {
        const e = inventariosStore.elementoDe(l);
        const dif =
          l.cantidadObservada !== null && l.cantidadEsperada !== null
            ? l.cantidadObservada - l.cantidadEsperada
            : "";
        return [
          e?.nombre ?? "",
          e?.codigo ?? "",
          l.cantidadEsperada === null ? "sin referencia" : l.cantidadEsperada,
          // El CSV también distingue los tres casos, y es donde más importa:
          // una hoja de cálculo no tiene forma de saber que «0» y vacío son
          // distintos, así que se escribe la palabra.
          l.cantidadObservada === null ? "sin contar" : l.cantidadObservada,
          dif,
          l.condicion,
          l.observacion ?? "",
          fechaLegibleCsv(l.contadaEn),
        ];
      }),
    );
    descargarCsv(csv, nombreArchivoCsv(`conteo-${activo.numero}`));
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta
        title={`${inventario.numero} · Inventarios`}
        description={`${inventario.nombre} — conteo ${meta.label.toLowerCase()} en ${camino}.`}
      />

      <ContenedorPagina>
        <CabeceraPagina
          volver={<EnlaceVolver onClick={() => navigate("/inventarios")}>Volver a los conteos</EnlaceVolver>}
          titulo={inventario.nombre}
          descripcion={`${inventario.numero} · Conteo ${meta.label.toLowerCase()} · Responsable ${nombreDeActor(inventario.responsableId)}`}
          acciones={
            <>
              <EstadoInventarioBadge estado={inventario.estado} size="md" />
              <Button
                variant="outline"
                size="sm"
                startIcon={<DownloadIcon className="h-4 w-4" />}
                onClick={exportar}
                disabled={lineas.length === 0}
              >
                Exportar
              </Button>
            </>
          }
        />

        {aviso && (
          <Alert variant="warning" title="La operación no se completó" message={aviso} />
        )}

        {inventario.estado === "finalizado" && (
          <div className="flex items-center gap-2.5 rounded-xl border border-accent-200 bg-accent-50/60 px-4 py-2.5 text-xs text-accent-800 dark:border-accent-500/20 dark:bg-accent-500/10 dark:text-accent-400">
            <CheckCircleIcon className="h-4 w-4 shrink-0 text-accent-700 dark:text-accent-400" />
            <span>
              Conteo cerrado y firmado el {formatearFechaHora(inventario.finalizadoEn)} por {nombreDeActor(inventario.finalizadoPorId)}. Solo lectura.
            </span>
          </div>
        )}
        {inventario.estado === "anulado" && (
          <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
            <span>Conteo anulado para fines operativos. Solo lectura.</span>
          </div>
        )}

        {/* ═══ Cabecera del conteo ═══════════════════════════════════════ */}
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="p-5 sm:p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <UbicacionFija camino={camino} />
              <span className="text-xs text-gray-600 dark:text-gray-400" title={meta.consecuencia}>
                {meta.label}
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Avance del conteo
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-title dark:text-white">
                    {progreso.contadas}
                    <span className="text-base font-normal text-gray-600 dark:text-gray-400">
                      {" "}
                      / {progreso.total}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {progreso.total === 0
                      ? "Todavía no hay elementos cargados"
                      : progreso.pendientes === 0
                        ? "Todos los elementos están contados"
                        : `Faltan ${progreso.pendientes} por registrar`}
                  </p>
                </div>
                <div className="w-40">
                  <ProgresoBar progreso={progreso} />
                </div>
              </div>
            </div>

            {/* ── Acciones del ciclo de vida ──────────────────────────── */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-gray-200 pt-4 dark:border-gray-800">
              {inventario.estado === "borrador" && puedeContar && (
                <>
                  <Button size="sm" startIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setModalAgregar(true)}>
                    Agregar elementos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    startIcon={<BoxCubeIcon className="h-4 w-4" />}
                    onClick={iniciar}
                    disabled={lineas.length === 0}
                  >
                    Iniciar conteo
                  </Button>
                  {lineas.length === 0 && (
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Carga al menos un elemento antes de iniciar
                    </span>
                  )}
                </>
              )}

              {inventario.estado === "en_curso" && puedeContar && editable && (
                <>
                  <Button size="sm" variant="outline" startIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setModalAgregar(true)}>
                    Agregar elemento
                  </Button>
                  <Button
                    size="sm"
                    startIcon={<CheckCircleIcon className="h-4 w-4" />}
                    onClick={() => setModalFinalizar(true)}
                    disabled={!finalizacion.habilitado}
                  >
                    Finalizar conteo
                  </Button>
                  {!finalizacion.habilitado && finalizacion.motivo && (
                    <span className="text-xs text-brand-700 dark:text-brand-400">
                      {finalizacion.motivo}
                    </span>
                  )}
                </>
              )}

              {editable && puedeFirmar && (
                <button
                  type="button"
                  onClick={() => setModalAnular(true)}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-error-700 dark:hover:text-error-400"
                >
                  <TrashBinIcon className="h-3.5 w-3.5" />
                  Anular
                </button>
              )}
            </div>

            {inventario.estado === "borrador" && lineas.length > 0 && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Al iniciar se copiará la cantidad esperada de cada elemento
                {inventario.tipo === "inicial"
                  ? ". Conteo inicial: sin referencia previa, la esperada quedará vacía y no habrá diferencias."
                  : " desde el último conteo finalizado de esta ubicación, y quedará congelada."}
              </p>
            )}
          </Card>

          {/* ── Ficha lateral ─────────────────────────────────────────── */}
          <Card className="p-5 sm:p-5">
            <h2 className="text-sm font-semibold text-ink-title dark:text-white">Ficha del conteo</h2>
            <dl className="mt-3 space-y-2.5">
              <Dato k="Tipo" v={meta.label} />
              <Dato k="Estado" v={<EstadoInventarioBadge estado={inventario.estado} size="xs" />} />
              <Dato k="Creado" v={formatearFechaHora(inventario.createdAt)} />
              <Dato k="Iniciado" v={inventario.iniciadoEn ? formatearFechaHora(inventario.iniciadoEn) : "—"} />
              <Dato k="Finalizado" v={inventario.finalizadoEn ? formatearFechaHora(inventario.finalizadoEn) : "—"} />
              <Dato k="Firmado por" v={inventario.finalizadoPorId ? nombreDeActor(inventario.finalizadoPorId) : "—"} />
              <Dato k="Elementos" v={String(lineas.length)} />
            </dl>

            {inventario.notas && (
              <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-800">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Notas
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  {inventario.notas}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* ═══ Líneas ════════════════════════════════════════════════════ */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink-title dark:text-white">
              Elementos del conteo
            </h2>
            {inventario.estado === "en_curso" && editable && !puedeContar && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Tu perfil puede ver este conteo pero no modificarlo
              </span>
            )}
          </div>

          <div className="mt-3">
            <FiltrosLineas
              consulta={consulta}
              onConsulta={setConsulta}
              filtro={filtro}
              onFiltro={setFiltro}
              conteos={conteos}
              total={lineas.length}
            />
          </div>

          <div className="mt-4">
            {lineas.length === 0 ? (
              <SinResultados
                titulo="Este conteo todavía no tiene elementos"
                detalle="Carga los elementos que deberían estar en la ubicación. Se puede hacer mientras el conteo está en borrador o ya en curso; lo que se agregue después de iniciar nacerá sin cantidad esperada, porque no estaba en la foto congelada."
                accion={
                  editable && puedeContar ? (
                    <Button size="sm" startIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setModalAgregar(true)}>
                      Agregar elementos
                    </Button>
                  ) : undefined
                }
              />
            ) : filtradas.length === 0 ? (
              <SinResultados
                titulo="Ninguna línea coincide con el filtro"
                detalle="Prueba con otro estado o borra la búsqueda."
                accion={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFiltro(FILTRO_TODOS);
                      setConsulta("");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                }
              />
            ) : (
              <LineasTabla
                lineas={filtradas}
                editable={editable && puedeContar}
                onGuardar={guardarLinea}
                onQuitar={quitarLinea}
                onAbrirEvidencia={(lineaId) => setLineaEvidencia(lineaId)}
              />
            )}
          </div>

          {filtradas.length > 0 && filtradas.length < lineas.length && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Mostrando {filtradas.length} de {lineas.length} líneas.
            </p>
          )}
        </div>

        {/* ═══ Historial del conteo ══════════════════════════════════════ */}
        {eventos.length > 0 && (
          <Card className="p-5 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-title dark:text-white">Actividad del conteo</h2>
              <button
                type="button"
                onClick={() => navigate("/inventarios/historial")}
                className="text-xs font-medium text-brand-500 hover:text-brand-500 dark:text-brand-400"
              >
                Ver todo el historial
              </button>
            </div>
            <ul className="mt-3 space-y-2.5">
              {eventos.slice(0, 8).map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-body dark:text-gray-300">
                      {inventariosStore.fraseDeEventoConNombres(ev)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                      {nombreDeActor(ev.actorId)} · {formatearFechaHora(ev.fecha)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {eventos.length > 8 && (
              <p className="mt-3 text-[11px] text-gray-600 dark:text-gray-400">
                y {eventos.length - 8} {eventos.length - 8 === 1 ? "evento más" : "eventos más"}
              </p>
            )}
          </Card>
        )}
      </ContenedorPagina>

      {/* ═══ Modales ═════════════════════════════════════════════════════ */}
      <ModalAgregarElemento
        abierto={modalAgregar}
        inventarioId={inventario.id}
        actorId="op_inv_supervisor"
        onCerrar={() => setModalAgregar(false)}
        puedeCrear={puedeGestionar}
      />

      <ModalFinalizar
        abierto={modalFinalizar}
        inventarioId={inventario.id}
        onCerrar={() => setModalFinalizar(false)}
      />

      <ModalAnular
        abierto={modalAnular}
        inventarioId={inventario.id}
        onCerrar={() => setModalAnular(false)}
      />

      <ModalVerEvidencia
        lineaId={lineaEvidencia}
        onCerrar={() => setLineaEvidencia(null)}
      />
    </>
  );
});

// ── Modal de finalización ─────────────────────────────────────────────────

/**
 * Confirmación de la firma.
 *
 * No es un «¿seguro?» decorativo: dice cuánto se está firmando, que la acción
 * es irreversible y qué pasará después. Un conteo finalizado por error solo se
 * puede anular, y anular no lo corrige — obliga a empezar de nuevo.
 */
function ModalFinalizar({
  abierto,
  inventarioId,
  onCerrar,
}: {
  abierto: boolean;
  inventarioId: string;
  onCerrar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const inventario = inventariosStore.inventarioPorId(inventarioId);
  const lineas = inventario ? inventariosStore.lineasDe(inventario.id) : [];
  const progreso = progresoDe(lineas);
  const anulados = lineas.filter((l) => l.cantidadObservada !== null && l.cantidadEsperada !== null);
  const conDiscrepancia = anulados.filter((l) => l.cantidadObservada !== l.cantidadEsperada).length;
  const dañados = lineas.filter((l) => l.condicion === "dañado").length;

  function confirmar() {
    const r = inventariosStore.finalizarInventario(inventarioId, "op_inv_admin");
    if (!r.ok) {
      setError(r.motivo ?? "No se pudo finalizar");
      return;
    }
    setError(null);
    onCerrar();
  }

  return (
    <Modal isOpen={abierto} onClose={onCerrar} className="max-w-lg p-6">
      <h2 className="text-lg font-semibold text-ink-title dark:text-white">Finalizar el conteo</h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Vas a cerrar y firmar {inventario?.numero}. A partir de este momento el conteo es de solo
        lectura y se convierte en la referencia del próximo de esta ubicación.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <ResumenCelda valor={progreso.contadas} etiqueta="Elementos contados" />
        <ResumenCelda valor={conDiscrepancia} etiqueta="Con diferencia" tono={conDiscrepancia > 0 ? "atencion" : "neutro"} />
        <ResumenCelda valor={dañados} etiqueta="Dañados" tono={dañados > 0 ? "error" : "neutro"} />
      </div>

      <div className="mt-4">
        <Alert
          variant="warning"
          title="Acción definitiva"
          message={
            conDiscrepancia > 0
              ? `El conteo se cerrará con ${conDiscrepancia} ${conDiscrepancia === 1 ? "producto con diferencia" : "productos con diferencias"}. Una vez firmado, pasará a modo solo lectura y servirá como base de auditoría.`
              : "Una vez firmado y cerrado, el conteo pasará a modo solo lectura y servirá como base de referencia para el inventario de esta ubicación."
          }
        />
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error" title="No se pudo finalizar" message={error} />
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
        <Button variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button onClick={confirmar}>Firmar y finalizar</Button>
      </div>
    </Modal>
  );
}

// ── Modal de anulación ────────────────────────────────────────────────────

function ModalAnular({
  abierto,
  inventarioId,
  onCerrar,
}: {
  abierto: boolean;
  inventarioId: string;
  onCerrar: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inventario = inventariosStore.inventarioPorId(inventarioId);

  function confirmar() {
    if (!motivo.trim()) {
      setError("Escribe el motivo de la anulación");
      return;
    }
    const r = inventariosStore.anularInventario(inventarioId, "op_inv_admin", motivo.trim());
    if (!r.ok) {
      setError(r.motivo ?? "No se pudo anular");
      return;
    }
    setMotivo("");
    setError(null);
    onCerrar();
  }

  return (
    <Modal isOpen={abierto} onClose={onCerrar} className="max-w-lg p-6">
      <h2 className="text-lg font-semibold text-ink-title dark:text-white">Anular el conteo</h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {inventario?.numero} dejará de contar para los reportes activos y no servirá como referencia de
        conteos futuros. **No se borra**: se conserva para consulta con su historial completo.
      </p>

      <div className="mt-4">
        <label htmlFor="motivo-anulacion" className="text-xs font-medium text-ink-title dark:text-gray-200">
          Motivo
        </label>
        <textarea
          id="motivo-anulacion"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          placeholder="Por ejemplo: se contó la ubicación equivocada"
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-title outline-none transition-colors focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          El motivo queda en el historial junto a tu nombre. Es la única explicación que quedará de por
          qué este conteo no cuenta.
        </p>
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error" title="No se pudo anular" message={error} />
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
        <Button variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button variant="destructive" onClick={confirmar}>
          Anular conteo
        </Button>
      </div>
    </Modal>
  );
}

// ── Modal de evidencia ────────────────────────────────────────────────────

/**
 * Visor de evidencias de una línea.
 *
 * Sirve para **adjuntar** (cuando la línea aún no tiene ninguna) y para revisar
 * las que ya hay. El `<input type="file">` con `accept="image/*"` es la única
 * validación de tipo: el cliente decide qué envía, así que comprobarlo otra vez
 * en el store daría una falsa sensación de seguridad.
 *
 * **No persiste.** La imagen vive en memoria como `dataUrl` y desaparece al
 * recargar. La UI lo dice en el propio modal en vez de dejar que el usuario
 * descubra la pérdida después.
 */
function ModalVerEvidencia({
  lineaId,
  onCerrar,
}: {
  lineaId: string | null;
  onCerrar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const linea = lineaId ? inventariosStore.lineaPorId(lineaId) : undefined;
  const evidencias = lineaId ? inventariosStore.evidenciasDeLinea(lineaId) : [];
  const elemento = linea ? inventariosStore.elementoDe(linea) : undefined;
  const editable = linea
    ? inventarioEditable(inventariosStore.inventarioPorId(linea.inventarioId)?.estado ?? "finalizado")
    : false;

  function adjuntar(archivos: FileList | null) {
    if (!linea || !archivos || archivos.length === 0) return;
    setCargando(true);
    setError(null);

    const lecturas = [...archivos].map(
      (f) =>
        new Promise<{ nombreArchivo: string; dataUrl: string }>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve({ nombreArchivo: f.name, dataUrl: String(fr.result) });
          fr.onerror = () => reject(new Error(f.name));
          fr.readAsDataURL(f);
        }),
    );

    Promise.all(lecturas)
      .then((res) => {
        const r = inventariosStore.adjuntarEvidencia(linea.id, res, "op_inv_supervisor");
        if (!r.ok) setError(r.motivo ?? "No se pudo adjuntar");
      })
      .catch(() => setError("No se pudo leer algún archivo"))
      .finally(() => setCargando(false));
  }

  function quitar(evidenciaId: string) {
    const r = inventariosStore.quitarEvidencia(evidenciaId, "op_inv_supervisor");
    if (!r.ok) setError(r.motivo ?? "No se pudo quitar");
  }

  return (
    <Modal isOpen={lineaId !== null} onClose={onCerrar} className="max-w-2xl p-6">
      <h2 className="text-lg font-semibold text-ink-title dark:text-white">
        Evidencia · {elemento?.nombre ?? "elemento"}
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        La foto describe esta línea, en esta ubicación y con esta fecha.
      </p>

      {evidencias.length === 0 ? (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Esta línea todavía no tiene evidencia adjunta.
          {linea?.condicion === "dañado" &&
            " Está marcada como dañada, así que necesitas al menos una para poder guardar."}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {evidencias.map((ev) => (
            <figure
              key={ev.id}
              className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
            >
              <img src={ev.dataUrl} alt={ev.nombreArchivo} className="h-32 w-full object-cover" />
              <figcaption className="truncate px-2 py-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                {ev.nombreArchivo}
              </figcaption>
              {editable && (
                <button
                  type="button"
                  onClick={() => quitar(ev.id)}
                  title="Quitar la evidencia"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition-opacity hover:bg-error-500 group-hover:opacity-100"
                >
                  <TrashBinIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </figure>
          ))}
        </div>
      )}

      {editable && (
        <div className="mt-4">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-6 text-xs font-medium text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400">
            <PencilIcon className="h-4 w-4" />
            {cargando ? "Adjuntando…" : "Adjuntar imágenes"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => adjuntar(e.target.files)}
            />
          </label>
          <p className="mt-1.5 text-[11px] text-gray-600 dark:text-gray-400">
            Formatos admitidos: imágenes JPG, PNG o WebP.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <Alert variant="error" title="No se pudo completar" message={error} />
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
        <Button variant="outline" onClick={onCerrar} startIcon={<CloseIcon className="h-4 w-4" />}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}

// ── Piezas locales ────────────────────────────────────────────────────────

function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] uppercase tracking-wider text-gray-600 dark:text-gray-400">{k}</dt>
      <dd className="text-right text-xs text-ink-body dark:text-gray-300">{v}</dd>
    </div>
  );
}

function ResumenCelda({
  valor,
  etiqueta,
  tono = "neutro",
}: {
  valor: number;
  etiqueta: string;
  tono?: "neutro" | "atencion" | "error";
}) {
  const color = {
    neutro: "text-ink-title dark:text-white",
    atencion: "text-brand-700 dark:text-brand-400",
    error: "text-error-700 dark:text-error-400",
  }[tono];

  return (
    <div className="rounded-xl border border-gray-200 px-3 py-2.5 text-center dark:border-gray-800">
      <p className={`text-lg font-semibold tabular-nums ${color}`}>{valor}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-gray-500 dark:text-gray-400">{etiqueta}</p>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Conteo por estado derivado, para las píldoras del filtro.
 *
 * Llama a `estadoDeLinea` del dominio y **no** a una comparación local. Es la
 * trampa concreta que el módulo entero intenta evitar: si esta función tuviera
 * su propia comparación, las píldoras de filtro podrían decir «falta 3» mientras
 * los badges de esas mismas tres filas dicen «sobra», y bastaría con que alguien
 * cambiara el desempate en un sitio para que dejaran de coincidir.
 */
function conteoComparativo(lineas: readonly LineaInventario[]): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const l of lineas) {
    const e = estadoDeLinea(l);
    if (e === "pendiente") continue; // ya contado aparte
    acc[e] = (acc[e] ?? 0) + 1;
  }
  return acc;
}

export default DetalleInventarioPage;
