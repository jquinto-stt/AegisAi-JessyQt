/**
 * Toma de inventario (conteo físico por ubicación).
 *
 * Pregunta de la pantalla: «¿qué ubicación toca contar y qué diferencias hay
 * que resolver?». La lista de conteos va junto a las ubicaciones con la fecha de
 * su último conteo, para que lo pendiente se vea sin buscarlo.
 */
import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useSearchParams } from "react-router";
import { ArrowLeft, Check, Plus } from "lucide-react";
import {
  inventarioStore,
  ETIQUETA_TIPO_UBICACION,
  diferenciaLinea,
  fechaRelativa,
  formatearDelta,
  formatearEntero,
  formatearMoneda,
  lineasConDiferencia,
  progresoConteo,
  type Conteo,
  type LineaConteo,
} from "@/stores";
import {
  Aviso,
  BarraAvance,
  Boton,
  Campo,
  CeldaDoble,
  Confirmar,
  CONTROL,
  cx,
  DistintivoConteo,
  Falta,
  FilaMovil,
  MensajeError,
  OpcionesTarjeta,
  PaginaInventario,
  PanelLateral,
  Pestanas,
  TABLA,
  useAviso,
  Vacio,
} from "./inventario.ui";

const abierto = (c: Conteo) =>
  c.estado === "en_progreso" || c.estado === "en_revision";

/** Valor con signo de las diferencias: «−$45.800». */
function monedaConSigno(v: number): string {
  if (v === 0) return formatearMoneda(0);
  return `${v > 0 ? "+" : "−"}${formatearMoneda(Math.abs(v))}`;
}

/** «Sin diferencias» o «3 ajustes»: lo que dejó una toma cerrada. */
function resultadoToma(c: Conteo): string {
  if (c.estado === "anulado") return "Anulada, sin ajustes";
  const n = lineasConDiferencia(c).length;
  return n === 0 ? "Sin diferencias" : `${n} ${n === 1 ? "ajuste" : "ajustes"}`;
}

function valorDiferencias(c: Conteo): number {
  return c.lineas.reduce(
    (t, l) =>
      t +
      diferenciaLinea(l) *
        (inventarioStore.articulo(l.articuloId)?.costoUnitario ?? 0),
    0,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NUEVO CONTEO
// ═══════════════════════════════════════════════════════════════════════════

const PanelNuevoConteo = observer(function PanelNuevoConteo({
  abierto: estaAbierto,
  ubicacionInicial,
  onCerrar,
  onCreado,
}: {
  abierto: boolean;
  ubicacionInicial: string;
  onCerrar: () => void;
  onCreado: (c: Conteo) => void;
}) {
  const s = inventarioStore;
  const [ubicacionId, setUbicacionId] = useState(ubicacionInicial);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (estaAbierto) {
      setUbicacionId(ubicacionInicial || s.ubicacionesActivas[0]?.id || "");
      setNotas("");
      setError(null);
    }
  }, [estaAbierto, ubicacionInicial, s]);

  const nArticulos = s.articulosActivos.filter(
    (a) => ubicacionId in a.existencias,
  ).length;
  const nombre = s.nombreUbicacion(ubicacionId);

  const crear = () => {
    const r = s.crearConteo(ubicacionId, notas);
    if (!r.ok) return setError(r.error);
    onCreado(r.valor);
  };

  return (
    <PanelLateral
      abierto={estaAbierto}
      onCerrar={onCerrar}
      titulo="Nueva toma de inventario"
      subtitulo="Cuenta lo que hay en una ubicación para compararlo con lo que dice el sistema."
      pie={
        <>
          <Boton variante="texto" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="principal" onClick={crear} disabled={!ubicacionId}>
            Empezar toma
          </Boton>
        </>
      }
    >
      <div>
        <p className="mb-2 text-theme-sm font-bold text-ink-body dark:text-gray-200">
          Qué ubicación vas a contar
        </p>
        <OpcionesTarjeta
          valor={ubicacionId}
          onCambio={(v) => {
            setUbicacionId(v);
            setError(null);
          }}
          opciones={s.ultimoConteoPorUbicacion.map(
            ({ ubicacion, ultimo, abierto: enCurso }) => ({
              valor: ubicacion.id,
              etiqueta: ubicacion.nombre,
              descripcion: enCurso
                ? "Ya tiene una toma en curso"
                : ultimo
                  ? `Contada ${fechaRelativa(ultimo.fecha)}`
                  : "Nunca contada",
            }),
          )}
        />
      </div>
      {ubicacionId && (
        <p className="rounded-xl bg-gray-50 px-3.5 py-3 text-theme-sm text-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
          Se listan los {formatearEntero(nArticulos)} artículos de {nombre}.
          Cuentas cada uno y, al final, decides si aplicas las diferencias como
          ajustes.
        </p>
      )}
      <Campo
        etiqueta="Notas"
        ayuda="Opcional. Por ejemplo: «Cierre de mes» o «Revisión tras la mudanza»."
      >
        <textarea
          className={cx(CONTROL, "h-24 py-2")}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </Campo>
      <MensajeError>{error}</MensajeError>
    </PanelLateral>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE DE UN CONTEO
// ═══════════════════════════════════════════════════════════════════════════

type PestanaLineas = "pendientes" | "diferencias" | "todas";

/** Enter en un campo de conteo salta al siguiente, como en una planilla. */
function saltarAlSiguiente(actual: HTMLInputElement) {
  const campos = Array.from(
    document.querySelectorAll<HTMLInputElement>("input[data-campo-conteo]"),
  );
  const i = campos.indexOf(actual);
  const sig = campos[i + 1];
  if (sig) {
    sig.focus();
    sig.select();
  } else actual.blur();
}

const CampoContado = observer(function CampoContado({
  conteo,
  linea,
  onError,
  mostrarCoincide = false,
}: {
  conteo: Conteo;
  linea: LineaConteo;
  onError: (m: string) => void;
  /** Botón para anotar lo esperado de un toque. Nunca en conteo ciego. */
  mostrarCoincide?: boolean;
}) {
  const nombre =
    inventarioStore.articulo(linea.articuloId)?.nombre ?? "artículo";
  const coincide = () => {
    const r = inventarioStore.registrarConteoLinea(conteo.id, linea.articuloId, linea.esperado);
    if (!r.ok) onError(r.error);
  };
  // `CONTROL` trae `w-full`; el ancho fijo de 96px lo pone el contenedor.
  return (
    <span className="flex shrink-0 items-center gap-2">
      {mostrarCoincide && (
        <button
          type="button"
          onClick={coincide}
          disabled={linea.contado === linea.esperado}
          aria-label={`${nombre}: coincide con lo esperado (${linea.esperado})`}
          title="Coincide con lo esperado"
          className="inline-flex h-9 items-center gap-1 rounded-[10px] px-2.5 text-theme-xs text-gray-600 transition-colors hover:bg-gray-100 hover:text-ink-title focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:text-gray-400 disabled:hover:bg-transparent dark:text-white dark:hover:bg-white/5"
        >
          <Check className="h-4 w-4" aria-hidden />
          Coincide
        </button>
      )}
    <span className="block w-24 shrink-0">
      <input
        data-campo-conteo
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        aria-label={`Cantidad contada de ${nombre}`}
        value={linea.contado ?? ""}
        placeholder="Contar"
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") {
            inventarioStore.registrarConteoLinea(
              conteo.id,
              linea.articuloId,
              null,
            );
            return;
          }
          const n = Number(v);
          if (!Number.isInteger(n) || n < 0) return;
          const r = inventarioStore.registrarConteoLinea(
            conteo.id,
            linea.articuloId,
            n,
          );
          if (!r.ok) onError(r.error);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            saltarAlSiguiente(e.currentTarget);
          }
        }}
        className={cx(CONTROL, "text-right tabular-nums")}
      />
    </span>
    </span>
  );
});

const VistaConteo = observer(function VistaConteo({
  conteo,
  onVolver,
}: {
  conteo: Conteo;
  onVolver: () => void;
}) {
  const s = inventarioStore;
  const { aviso, mostrar } = useAviso();
  const [pestana, setPestana] = useState<PestanaLineas>(
    conteo.estado === "en_progreso" ? "pendientes" : "diferencias",
  );
  const [confirmar, setConfirmar] = useState<"aplicar" | "anular" | null>(null);
  // Lo que estaba por contar al abrir la pestaña. Una fila que se cuenta ahí
  // sigue a la vista (con su cifra) hasta cambiar de pestaña: si desapareciera
  // al teclear el primer dígito, el foco se perdería a mitad de la cifra.
  const [enVista, setEnVista] = useState<Set<string>>(
    () => new Set(conteo.lineas.filter((l) => l.contado === null).map((l) => l.articuloId)),
  );
  useEffect(() => {
    if (pestana === "pendientes") {
      setEnVista(new Set(conteo.lineas.filter((l) => l.contado === null).map((l) => l.articuloId)));
    }
    // Solo al entrar a la pestaña; no en cada cifra registrada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestana, conteo.id]);
  const [error, setError] = useState<string | null>(null);

  const c = conteo;
  const enProgreso = c.estado === "en_progreso";
  const ciego = s.config.conteoCiego && enProgreso;
  const { contadas, total } = progresoConteo(c);
  const pendientes = total - contadas;
  const conDiferencia = lineasConDiferencia(c);
  const nombreUbicacion = s.nombreUbicacion(c.ubicacionId);

  const lineas = (
    pestana === "pendientes"
      ? c.lineas.filter((l) => l.contado === null || enVista.has(l.articuloId))
      : pestana === "diferencias"
        ? conDiferencia
        : c.lineas
  )
    .slice()
    .sort((x, y) =>
      (s.articulo(x.articuloId)?.nombre ?? "").localeCompare(
        s.articulo(y.articuloId)?.nombre ?? "",
      ),
    );

  const superaUmbral = (l: LineaConteo) => {
    const d = Math.abs(diferenciaLinea(l));
    return (
      d > 0 &&
      (d / Math.max(l.esperado, 1)) * 100 > s.config.umbralDiferenciaPct
    );
  };

  // Lo que se registrará al aplicar: contra el stock ACTUAL, igual que el store.
  const ajustes = c.lineas
    .map((l) => {
      const a = s.articulo(l.articuloId);
      if (!a || l.contado === null) return null;
      const delta = l.contado - (a.existencias[c.ubicacionId] ?? 0);
      return delta === 0
        ? null
        : { nombre: a.nombre, delta, valor: delta * a.costoUnitario };
    })
    .filter(
      (x): x is { nombre: string; delta: number; valor: number } => x !== null,
    );
  const valorAjustes = ajustes.reduce((t, a) => t + a.valor, 0);

  const ejecutar = (
    r: { ok: true } | { ok: false; error: string },
    exito: string,
  ) => {
    if (!r.ok) return setError(r.error);
    setError(null);
    mostrar(exito);
  };

  const enviar = () =>
    ejecutar(s.enviarConteoARevision(c.id), `${c.numero} enviado a revisión`);
  const aplicar = () => {
    setConfirmar(null);
    const r = s.aplicarConteo(c.id);
    if (!r.ok) return setError(r.error);
    setError(null);
    mostrar(
      r.valor.ajustes === 0
        ? "Conteo aplicado sin diferencias"
        : `${r.valor.ajustes} ${r.valor.ajustes === 1 ? "ajuste registrado" : "ajustes registrados"}`,
    );
  };
  const anular = () => {
    setConfirmar(null);
    ejecutar(s.anularConteo(c.id), `${c.numero} anulado`);
  };

  const cerrado = c.estado === "aplicado" || c.estado === "anulado";
  const puedeAplicarDirecto = enProgreso && !s.config.requiereRevisionConteos;

  return (
    <PaginaInventario
      titulo={`Toma de inventario · ${nombreUbicacion}`}
      resumen={
        <>
          {c.numero} · {formatearEntero(contadas)} de {formatearEntero(total)} contados
          {!ciego &&
            conDiferencia.length > 0 &&
            ` · ${conDiferencia.length} con diferencia (${monedaConSigno(valorDiferencias(c))})`}
          {` · ${c.responsable} · ${fechaRelativa(c.fecha)}`}
        </>
      }
      acciones={
        <>
          <DistintivoConteo estado={c.estado} />
          <Boton
            variante="texto"
            icono={<ArrowLeft className="h-4 w-4" />}
            onClick={onVolver}
          >
            Todas las tomas
          </Boton>
        </>
      }
      pestanas={
        <Pestanas<PestanaLineas>
          valor={pestana}
          onCambio={setPestana}
          opciones={[
            { valor: "pendientes", etiqueta: "Por contar", cuenta: pendientes },
            ...(ciego
              ? []
              : [
                  {
                    valor: "diferencias" as const,
                    etiqueta: "Con diferencia",
                    cuenta: conDiferencia.length,
                  },
                ]),
            { valor: "todas", etiqueta: "Todos", cuenta: total },
          ]}
        />
      }
    >
      {c.notas && (
        <p className="text-theme-sm text-gray-600 dark:text-gray-400">
          {c.notas}
        </p>
      )}
      {ciego && (
        <p className="rounded-xl bg-gray-50 px-3.5 py-3 text-theme-sm text-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
          Conteo ciego: la cantidad esperada se oculta mientras cuentas para que
          nadie la copie. Aparece al enviar a revisión.
        </p>
      )}

      {lineas.length === 0 ? (
        <Vacio>
          {pestana === "pendientes"
            ? "Ya contaste todos los artículos de esta ubicación."
            : pestana === "diferencias"
              ? "Sin diferencias: lo contado coincide con el sistema."
              : "Este conteo no tiene artículos."}
        </Vacio>
      ) : (
        <>
          <table className={cx(TABLA.tabla, "hidden sm:table")}>
            <thead>
              <tr>
                <th className={TABLA.th}>Artículo</th>
                {!ciego && <th className={TABLA.thNum}>Esperado</th>}
                <th className={TABLA.thNum}>Contado</th>
                {!ciego && <th className={TABLA.thNum}>Diferencia</th>}
                {!ciego && (
                  <th className={cx(TABLA.thNum, "hidden md:table-cell")}>
                    Valor
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => {
                const a = s.articulo(l.articuloId);
                const d = diferenciaLinea(l);
                return (
                  <tr
                    key={l.articuloId}
                    className={cx(
                      TABLA.fila,
                      !ciego &&
                        superaUmbral(l) &&
                        "bg-warning-50 dark:bg-warning-500/10",
                    )}
                  >
                    <td className={cx(TABLA.td, "max-w-[320px]")}>
                      <CeldaDoble
                        principal={a?.nombre ?? "Artículo eliminado"}
                        secundaria={a?.sku}
                      />
                    </td>
                    {!ciego && (
                      <td
                        className={cx(
                          TABLA.tdNum,
                          "text-gray-600 dark:text-gray-400",
                        )}
                      >
                        {formatearEntero(l.esperado)}
                      </td>
                    )}
                    <td className={TABLA.tdNum}>
                      {enProgreso ? (
                        <div className="flex justify-end">
                          <CampoContado
                            conteo={c}
                            linea={l}
                            onError={mostrar}
                            mostrarCoincide={!ciego}
                          />
                        </div>
                      ) : (
                        <span className="font-bold">
                          {l.contado === null
                            ? "—"
                            : formatearEntero(l.contado)}
                        </span>
                      )}
                    </td>
                    {!ciego && (
                      <td
                        className={cx(
                          TABLA.tdNum,
                          "font-bold",
                          l.contado === null
                            ? "text-gray-400"
                            : d < 0
                              ? "text-error-700 dark:text-error-400"
                              : d > 0
                                ? "text-ink-title dark:text-accent-300"
                                : "text-gray-600",
                        )}
                      >
                        {l.contado === null ? "—" : formatearDelta(d)}
                      </td>
                    )}
                    {!ciego && (
                      <td
                        className={cx(
                          TABLA.tdNum,
                          "hidden text-gray-600 md:table-cell dark:text-gray-400",
                        )}
                      >
                        {l.contado === null || d === 0
                          ? "—"
                          : monedaConSigno(d * (a?.costoUnitario ?? 0))}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="sm:hidden">
            {lineas.map((l) => {
              const a = s.articulo(l.articuloId);
              const d = diferenciaLinea(l);
              return (
                <div
                  key={l.articuloId}
                  className={cx(
                    "flex items-center justify-between gap-3 border-t border-gray-100 py-3 first:border-t-0 dark:border-white/5",
                    !ciego &&
                      superaUmbral(l) &&
                      "bg-warning-50 dark:bg-warning-500/10",
                  )}
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-bold text-ink-body dark:text-white">
                      {a?.nombre}
                    </p>
                    <p className="mt-0.5 text-theme-xs text-gray-600 dark:text-gray-400">
                      {a?.sku}
                      {!ciego && ` · esperado ${formatearEntero(l.esperado)}`}
                      {!ciego &&
                        l.contado !== null &&
                        d !== 0 &&
                        ` · ${formatearDelta(d)}`}
                    </p>
                  </div>
                  {enProgreso ? (
                    <CampoContado conteo={c} linea={l} onError={mostrar} mostrarCoincide={!ciego} />
                  ) : (
                    <span className="font-bold tabular-nums">
                      {l.contado === null ? "—" : formatearEntero(l.contado)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <MensajeError>{error}</MensajeError>

      {!cerrado && (
        // Pegajosa al fondo de la ventana, dentro del contenido: sigue visible al
        // recorrer una lista larga sin tapar la última fila al llegar al final.
        <div className="sticky bottom-0 -mx-6 flex flex-col gap-3 border-t border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <BarraAvance valor={contadas} total={total} ancho="w-32" />
            <span className="text-theme-sm text-gray-600 dark:text-gray-400">
              {pendientes > 0
                ? `Faltan ${formatearEntero(pendientes)} por contar`
                : "Todo contado"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendientes > 0 && (enProgreso || c.estado === "en_revision") && (
              <span className="text-theme-xs text-gray-600 dark:text-gray-400">
                Cuenta {pendientes === 1 ? "el que falta" : `los ${formatearEntero(pendientes)} que faltan`} para{" "}
                {enProgreso && !puedeAplicarDirecto ? "enviarlo a revisión" : "aplicar los ajustes"}
              </span>
            )}
            <Boton variante="texto" onClick={() => setConfirmar("anular")}>
              Anular toma
            </Boton>
            {enProgreso && !puedeAplicarDirecto && (
              <Boton
                variante="principal"
                onClick={enviar}
                disabled={pendientes > 0}
              >
                Enviar a revisión
              </Boton>
            )}
            {(c.estado === "en_revision" || puedeAplicarDirecto) && (
              <Boton
                variante="principal"
                onClick={() => setConfirmar("aplicar")}
                disabled={pendientes > 0}
              >
                Aplicar ajustes
              </Boton>
            )}
          </div>
        </div>
      )}

      <Confirmar
        abierto={confirmar === "aplicar"}
        titulo={`¿Aplicar los ajustes de ${c.numero}?`}
        textoConfirmar={
          ajustes.length === 0 ? "Cerrar toma" : "Aplicar ajustes"
        }
        onConfirmar={aplicar}
        onCancelar={() => setConfirmar(null)}
      >
        {ajustes.length === 0 ? (
          "No hay diferencias con la existencia actual; la toma se cerrará sin registrar ajustes."
        ) : (
          <>
            <p>
              Se registrarán {ajustes.length}{" "}
              {ajustes.length === 1 ? "ajuste" : "ajustes"} en {nombreUbicacion}{" "}
              ({monedaConSigno(valorAjustes)}):
            </p>
            <ul className="mt-2 space-y-1">
              {ajustes.slice(0, 6).map((a) => (
                <li
                  key={a.nombre}
                  className="flex justify-between gap-3 tabular-nums"
                >
                  <span className="truncate">{a.nombre}</span>
                  <span className="font-bold text-ink-body dark:text-white">
                    {formatearDelta(a.delta)}
                  </span>
                </li>
              ))}
              {ajustes.length > 6 && <li>y {ajustes.length - 6} más</li>}
            </ul>
          </>
        )}
      </Confirmar>

      <Confirmar
        abierto={confirmar === "anular"}
        titulo={`¿Anular ${c.numero}?`}
        textoConfirmar="Anular toma"
        peligro
        onConfirmar={anular}
        onCancelar={() => setConfirmar(null)}
      >
        Se descarta lo contado y no se registra ningún ajuste. {nombreUbicacion}{" "}
        quedará libre para una toma nueva.
      </Confirmar>

      <Aviso texto={aviso} />
    </PaginaInventario>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// LISTA
// ═══════════════════════════════════════════════════════════════════════════

export const ConteosPage = observer(function ConteosPage() {
  const s = inventarioStore;
  const [params, setParams] = useSearchParams();
  const { aviso, mostrar } = useAviso();
  const [nuevo, setNuevo] = useState<{ abierto: boolean; ubicacionId: string }>(
    { abierto: false, ubicacionId: "" },
  );

  const conteoId = params.get("conteo");
  const conteo = conteoId ? s.conteo(conteoId) : undefined;

  const irA = (id: string | null) => {
    const p = new URLSearchParams(params);
    p.delete("nuevo");
    if (id) p.set("conteo", id);
    else p.delete("conteo");
    setParams(p);
  };

  // `?nuevo=1` (desde el dashboard) abre el panel y se limpia de la URL;
  // `&ubicacion=<id>` la deja elegida.
  useEffect(() => {
    if (params.get("nuevo") === "1") {
      setNuevo({ abierto: true, ubicacionId: params.get("ubicacion") ?? "" });
      const p = new URLSearchParams(params);
      p.delete("nuevo");
      p.delete("ubicacion");
      setParams(p, { replace: true });
    }
  }, [params, setParams]);

  if (conteo)
    return (
      <VistaConteo key={conteo.id} conteo={conteo} onVolver={() => irA(null)} />
    );

  // Sin `useMemo`: `s.conteos` conserva su referencia al hacer `push`.
  const ordenados = [...s.conteos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const abiertos = ordenados.filter(abierto);
  const cerrados = ordenados.filter((c) => !abierto(c));

  // Una tarjeta por ubicación, de lo más urgente a lo menos: lo que espera
  // revisión, lo que está en curso, lo que nunca se ha contado y, al final, lo
  // contado hace más tiempo primero.
  const stockDe = new Map(s.stockPorUbicacion.map((x) => [x.ubicacion.id, x]));
  const prioridad = (u: (typeof s.ultimoConteoPorUbicacion)[number]) =>
    u.abierto?.estado === "en_revision" ? 0 : u.abierto ? 1 : !u.ultimo ? 2 : 3;
  const ubicaciones = [...s.ultimoConteoPorUbicacion].sort(
    (x, y) =>
      prioridad(x) - prioridad(y) ||
      (x.ultimo?.fecha ?? "").localeCompare(y.ultimo?.fecha ?? ""),
  );

  const enCurso = abiertos.filter((c) => c.estado === "en_progreso").length;
  const enRevision = abiertos.filter((c) => c.estado === "en_revision").length;
  const nunca = ubicaciones.filter((u) => !u.ultimo && !u.abierto).length;
  const partes = [
    enRevision > 0 && `${enRevision} esperando revisión`,
    enCurso > 0 && `${enCurso} en curso`,
    nunca > 0 && `${nunca} ${nunca === 1 ? "ubicación nunca contada" : "ubicaciones nunca contadas"}`,
  ].filter(Boolean);

  const iniciar = (ubicacionId: string) => setNuevo({ abierto: true, ubicacionId });

  return (
    <PaginaInventario
      titulo="Toma de inventario"
      resumen={partes.length ? partes.join(" · ") : "Todo al día: no hay tomas abiertas."}
      acciones={
        <Boton variante="principal" icono={<Plus className="h-4 w-4" />} onClick={() => iniciar("")}>
          Nueva toma
        </Boton>
      }
    >
      <p className="-mt-2 max-w-3xl text-theme-sm text-gray-600 dark:text-gray-400">
        Cuenta físicamente lo que hay en una ubicación y compáralo con el sistema. Las diferencias se
        registran como ajustes solo cuando apruebas la toma.
      </p>

      <section aria-labelledby="toma-ubicaciones">
        <h2 id="toma-ubicaciones" className="mb-3 text-theme-md font-bold text-ink-title dark:text-white">
          Ubicaciones
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ubicaciones.map(({ ubicacion, ultimo, abierto: toma }) => {
            const stock = stockDe.get(ubicacion.id);
            const progreso = toma ? progresoConteo(toma) : null;
            const difs = toma ? lineasConDiferencia(toma).length : 0;
            const nuncaContada = !toma && !ultimo;
            return (
              <li
                key={ubicacion.id}
                className={cx(
                  "flex flex-col rounded-2xl border bg-white p-5 dark:bg-white/[0.02]",
                  toma?.estado === "en_revision"
                    ? "border-brand-300 dark:border-brand-500/50"
                    : "border-gray-200 dark:border-white/10",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-theme-md font-bold text-ink-body dark:text-white">{ubicacion.nombre}</h3>
                    <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                      {ETIQUETA_TIPO_UBICACION[ubicacion.tipo]}
                      {stock && stock.skus > 0
                        ? ` · ${formatearEntero(stock.skus)} ${stock.skus === 1 ? "artículo" : "artículos"} · ${formatearMoneda(stock.valor)}`
                        : " · sin existencias"}
                    </p>
                  </div>
                  {toma && <DistintivoConteo estado={toma.estado} />}
                </div>

                <div className="mt-4 flex-1">
                  {toma && progreso ? (
                    toma.estado === "en_revision" ? (
                      <p className="text-theme-sm text-ink-body dark:text-gray-200">
                        {difs === 0 ? (
                          "Contada completa, sin diferencias."
                        ) : (
                          <>
                            <span className="font-bold">
                              {difs} {difs === 1 ? "diferencia" : "diferencias"}
                            </span>{" "}
                            por {monedaConSigno(valorDiferencias(toma))}
                          </>
                        )}
                        <span className="block text-theme-xs text-gray-600 dark:text-gray-400">
                          {toma.responsable} · {fechaRelativa(toma.fecha)}
                        </span>
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <BarraAvance valor={progreso.contadas} total={progreso.total} ancho="flex-1" />
                          <span className="shrink-0 text-theme-xs tabular-nums text-gray-600 dark:text-gray-400">
                            {progreso.contadas} de {progreso.total}
                          </span>
                        </div>
                        <p className="mt-1.5 text-theme-xs text-gray-600 dark:text-gray-400">
                          {toma.responsable} · empezó {fechaRelativa(toma.fecha)}
                        </p>
                      </>
                    )
                  ) : nuncaContada ? (
                    <p className="text-theme-sm font-bold text-brand-700 dark:text-brand-400">Nunca se ha contado</p>
                  ) : (
                    <p className="text-theme-sm text-ink-body dark:text-gray-200">
                      Última toma {fechaRelativa(ultimo!.fecha)}
                      <span className="block text-theme-xs text-gray-600 dark:text-gray-400">
                        {resultadoToma(ultimo!)}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  {toma ? (
                    <Boton variante={toma.estado === "en_revision" ? "principal" : "secundario"} onClick={() => irA(toma.id)}>
                      {toma.estado === "en_revision" ? "Revisar y aplicar" : "Continuar toma"}
                    </Boton>
                  ) : (
                    <Boton variante={nuncaContada ? "secundario" : "texto"} onClick={() => iniciar(ubicacion.id)}>
                      Iniciar toma
                    </Boton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="toma-historial">
        <h2 id="toma-historial" className="mb-1 text-theme-md font-bold text-ink-title dark:text-white">
          Historial
        </h2>
        <p className="mb-3 text-theme-xs text-gray-600 dark:text-gray-400">Tomas cerradas y lo que se ajustó en cada una.</p>
        {cerrados.length === 0 ? (
          <Vacio>Todavía no se ha cerrado ninguna toma.</Vacio>
        ) : (
          <>
            <table className={cx(TABLA.tabla, "hidden sm:table")}>
              <thead>
                <tr>
                  <th className={TABLA.th}>Ubicación</th>
                  <th className={TABLA.th}>Fecha</th>
                  <th className={cx(TABLA.th, "hidden md:table-cell")}>Responsable</th>
                  <th className={TABLA.th}>Resultado</th>
                  <th className={TABLA.thNum}>Valor ajustado</th>
                </tr>
              </thead>
              <tbody>
                {cerrados.map((c) => {
                  const anulada = c.estado === "anulado";
                  return (
                    <tr
                      key={c.id}
                      className={TABLA.filaClic}
                      tabIndex={0}
                      onClick={() => irA(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          irA(c.id);
                        }
                      }}
                    >
                      <td className={TABLA.td}>
                        <CeldaDoble principal={s.nombreUbicacion(c.ubicacionId)} secundaria={c.numero} />
                      </td>
                      <td className={cx(TABLA.td, "whitespace-nowrap")}>{fechaRelativa(c.fecha)}</td>
                      <td className={cx(TABLA.td, "hidden whitespace-nowrap text-gray-600 md:table-cell dark:text-gray-400")}>{c.responsable}</td>
                      <td className={TABLA.td}>
                        {anulada ? <DistintivoConteo estado={c.estado} /> : resultadoToma(c)}
                      </td>
                      <td className={TABLA.tdNum}>
                        {anulada || lineasConDiferencia(c).length === 0 ? <Falta /> : monedaConSigno(valorDiferencias(c))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="sm:hidden">
              {cerrados.map((c) => (
                <FilaMovil
                  key={c.id}
                  onClick={() => irA(c.id)}
                  titulo={s.nombreUbicacion(c.ubicacionId)}
                  detalle={`${c.numero} · ${fechaRelativa(c.fecha)} · ${c.estado === "anulado" ? "Anulada" : resultadoToma(c)}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <PanelNuevoConteo
        abierto={nuevo.abierto}
        ubicacionInicial={nuevo.ubicacionId}
        onCerrar={() => setNuevo({ abierto: false, ubicacionId: "" })}
        onCreado={(c) => {
          setNuevo({ abierto: false, ubicacionId: "" });
          mostrar(`Toma ${c.numero} abierta en ${s.nombreUbicacion(c.ubicacionId)}`);
          irA(c.id);
        }}
      />
      <Aviso texto={aviso} />
    </PaginaInventario>
  );
});

export default ConteosPage;
