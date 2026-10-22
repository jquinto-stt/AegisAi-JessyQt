/**
 * Conteos y ajustes.
 *
 * Pregunta de la pantalla: «¿qué ubicación toca contar y qué diferencias hay
 * que resolver?». La lista de conteos va junto a las ubicaciones con la fecha de
 * su último conteo, para que lo pendiente se vea sin buscarlo.
 */
import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useSearchParams } from "react-router";
import { ArrowLeft, Plus } from "lucide-react";
import {
  inventarioStore,
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
  EnlaceTexto,
  FilaMovil,
  MensajeError,
  OpcionesTarjeta,
  PaginaInventario,
  PanelLateral,
  Pestanas,
  TABLA,
  Tarjeta,
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
      titulo="Nuevo conteo"
      subtitulo="Un recorrido físico por una ubicación para comparar lo que hay con lo que dice el sistema."
      pie={
        <>
          <Boton variante="texto" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="principal" onClick={crear} disabled={!ubicacionId}>
            Empezar conteo
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
                ? "Ya tiene un conteo en curso"
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
}: {
  conteo: Conteo;
  linea: LineaConteo;
  onError: (m: string) => void;
}) {
  const nombre =
    inventarioStore.articulo(linea.articuloId)?.nombre ?? "artículo";
  // `CONTROL` trae `w-full`; el ancho fijo de 96px lo pone el contenedor.
  return (
    <span className="block w-24 shrink-0">
      <input
        data-campo-conteo
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        aria-label={`Cantidad contada de ${nombre}`}
        value={linea.contado ?? ""}
        placeholder="—"
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
      ? c.lineas.filter((l) => l.contado === null)
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
      titulo={`Conteo ${c.numero} · ${nombreUbicacion}`}
      resumen={
        <>
          {formatearEntero(contadas)} de {formatearEntero(total)} contados
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
            Conteos
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
                                ? "text-success-700 dark:text-success-400"
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
                    <p className="truncate font-bold text-ink-body dark:text-white">
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
                    <CampoContado conteo={c} linea={l} onError={mostrar} />
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
            <Boton variante="texto" onClick={() => setConfirmar("anular")}>
              Anular conteo
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
          ajustes.length === 0 ? "Cerrar conteo" : "Aplicar ajustes"
        }
        onConfirmar={aplicar}
        onCancelar={() => setConfirmar(null)}
      >
        {ajustes.length === 0 ? (
          "No hay diferencias con la existencia actual; el conteo se cerrará sin registrar ajustes."
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
        textoConfirmar="Anular conteo"
        peligro
        onConfirmar={anular}
        onCancelar={() => setConfirmar(null)}
      >
        Se descarta lo contado y no se registra ningún ajuste. {nombreUbicacion}{" "}
        quedará libre para un conteo nuevo.
      </Confirmar>

      <Aviso texto={aviso} />
    </PaginaInventario>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// LISTA
// ═══════════════════════════════════════════════════════════════════════════

type PestanaLista = "abiertos" | "cerrados";

export const ConteosPage = observer(function ConteosPage() {
  const s = inventarioStore;
  const [params, setParams] = useSearchParams();
  const { aviso, mostrar } = useAviso();
  const [pestana, setPestana] = useState<PestanaLista>("abiertos");
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
  const ordenados = [...s.conteos].sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  );
  const abiertos = ordenados.filter(abierto);
  const cerrados = ordenados.filter((c) => !abierto(c));
  const visibles = pestana === "abiertos" ? abiertos : cerrados;

  const ubicaciones = s.ultimoConteoPorUbicacion;
  const enCurso = abiertos.filter((c) => c.estado === "en_progreso").length;
  const enRevision = abiertos.filter((c) => c.estado === "en_revision").length;
  const nunca = ubicaciones.filter((u) => !u.ultimo && !u.abierto);
  const partes = [
    enCurso > 0 &&
      `${enCurso} ${enCurso === 1 ? "conteo en curso" : "conteos en curso"}`,
    enRevision > 0 && `${enRevision} esperando revisión`,
    nunca.length === 1 && `${nunca[0].ubicacion.nombre} nunca se ha contado`,
    nunca.length > 1 && `${nunca.length} ubicaciones nunca se han contado`,
  ].filter(Boolean);

  return (
    <PaginaInventario
      titulo="Conteos y ajustes"
      resumen={
        partes.length
          ? partes.join(" · ")
          : "Todo al día: no hay conteos abiertos."
      }
      acciones={
        <Boton
          variante="principal"
          icono={<Plus className="h-4 w-4" />}
          onClick={() => setNuevo({ abierto: true, ubicacionId: "" })}
        >
          Nuevo conteo
        </Boton>
      }
    >
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Pestanas<PestanaLista>
            valor={pestana}
            onCambio={setPestana}
            opciones={[
              {
                valor: "abiertos",
                etiqueta: "Abiertos",
                cuenta: abiertos.length,
              },
              {
                valor: "cerrados",
                etiqueta: "Cerrados",
                cuenta: cerrados.length,
              },
            ]}
          />
          {visibles.length === 0 ? (
            <Vacio>
              {pestana === "abiertos"
                ? "No hay conteos abiertos. Elige una ubicación para empezar uno."
                : "Todavía no se ha cerrado ningún conteo."}
            </Vacio>
          ) : (
            <>
              <table className={cx(TABLA.tabla, "hidden sm:table")}>
                <thead>
                  <tr>
                    <th className={TABLA.th}>Conteo</th>
                    <th className={TABLA.th}>Estado</th>
                    <th className={TABLA.th}>Avance</th>
                    <th className={TABLA.thNum}>Diferencias</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((c) => {
                    const { contadas, total } = progresoConteo(c);
                    const dif = lineasConDiferencia(c).length;
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
                          <CeldaDoble
                            principal={s.nombreUbicacion(c.ubicacionId)}
                            secundaria={`${c.numero} · ${c.responsable} · ${fechaRelativa(c.fecha)}`}
                          />
                        </td>
                        <td className={TABLA.td}>
                          <DistintivoConteo estado={c.estado} />
                        </td>
                        <td className={TABLA.td}>
                          <div className="flex items-center gap-2.5">
                            <BarraAvance
                              valor={contadas}
                              total={total}
                              ancho="w-16"
                            />
                            <span className="whitespace-nowrap tabular-nums text-gray-600 dark:text-gray-400">
                              {contadas} de {total}
                            </span>
                          </div>
                        </td>
                        <td className={TABLA.tdNum}>
                          {dif === 0 ? (
                            <span className="text-gray-500">0</span>
                          ) : (
                            <>
                              <span className="font-bold text-ink-body dark:text-white">
                                {dif}
                              </span>
                              <span className="block text-theme-xs text-gray-600 dark:text-gray-400">
                                {monedaConSigno(valorDiferencias(c))}
                              </span>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="sm:hidden">
                {visibles.map((c) => {
                  const { contadas, total } = progresoConteo(c);
                  return (
                    <FilaMovil
                      key={c.id}
                      onClick={() => irA(c.id)}
                      titulo={s.nombreUbicacion(c.ubicacionId)}
                      detalle={`${c.numero} · ${contadas} de ${total} contados · ${fechaRelativa(c.fecha)}`}
                      cifra={<DistintivoConteo estado={c.estado} />}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>

        <Tarjeta
          titulo="Ubicaciones"
          detalle="Cuándo se contó cada una por última vez"
          className="lg:col-span-2"
          sinRelleno
        >
          <ul className="px-5 pb-2">
            {ubicaciones.map(({ ubicacion, ultimo, abierto: enCursoAqui }) => (
              <li
                key={ubicacion.id}
                className="flex items-center justify-between gap-3 border-t border-gray-100 py-3 first:border-t-0 dark:border-white/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-ink-body dark:text-white">
                    {ubicacion.nombre}
                  </p>
                  <p
                    className={cx(
                      "mt-0.5 text-theme-xs",
                      !ultimo && !enCursoAqui
                        ? "text-brand-700 dark:text-brand-400"
                        : "text-gray-600 dark:text-gray-400",
                    )}
                  >
                    {enCursoAqui
                      ? `Conteo ${enCursoAqui.numero} en curso`
                      : ultimo
                        ? `Contada ${fechaRelativa(ultimo.fecha)}`
                        : "Nunca contada"}
                  </p>
                </div>
                {enCursoAqui ? (
                  <EnlaceTexto onClick={() => irA(enCursoAqui.id)}>
                    Abrir
                  </EnlaceTexto>
                ) : (
                  <EnlaceTexto
                    onClick={() =>
                      setNuevo({ abierto: true, ubicacionId: ubicacion.id })
                    }
                  >
                    Contar
                  </EnlaceTexto>
                )}
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      <PanelNuevoConteo
        abierto={nuevo.abierto}
        ubicacionInicial={nuevo.ubicacionId}
        onCerrar={() => setNuevo({ abierto: false, ubicacionId: "" })}
        onCreado={(c) => {
          setNuevo({ abierto: false, ubicacionId: "" });
          mostrar(
            `Conteo ${c.numero} abierto en ${s.nombreUbicacion(c.ubicacionId)}`,
          );
          irA(c.id);
        }}
      />
      <Aviso texto={aviso} />
    </PaginaInventario>
  );
});

export default ConteosPage;
