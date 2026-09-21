import { useState } from "react";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import {
  inventarioStore,
  motivoSinPermiso,
  puede,
  type AuditoriaInventario,
  type LineaAuditoria,
} from "@/stores";
// Tres funciones puras del dominio, importadas directamente y no por el barrel
// —el barrel re-exporta los TIPOS de inventario, no sus funciones—:
// `clasificarDiferencia` pinta cada fila y `resumenDeAuditoria` cuenta el
// resumen, así que el contador y la tabla no pueden discrepar; y
// `motivoNoConciliable` es **la misma función** que el guardarraíl del store,
// que es lo que hace que el texto del botón apagado sea el que saldría al
// pulsarlo.
import {
  clasificarDiferencia,
  motivoNoConciliable,
  resumenDeAuditoria,
} from "@/domain/inventario/inventario.domain";
import {
  cantidad,
  cantidadConSigno,
  etiquetaFecha,
  interpretarConteo,
} from "./inventario.utils";
import {
  CabeceraPagina,
  EstadoAuditoriaBadge,
  EstadoLineaBadge,
  KpiCard,
  SinResultados,
} from "./inventario.widgets";

// ═══════════════════════════════════════════════════════════════════════════
// CONTEO FÍSICO — contar lo que hay y conciliar la diferencia
// ═══════════════════════════════════════════════════════════════════════════
//
// Es la única pantalla del módulo donde el operador **contradice al sistema con
// un hecho**. Todo lo demás registra algo que pasó —entró, salió, se movió—;
// esto escribe la diferencia entre lo que el kárdex cree y lo que hay en el
// estante, y por eso el ajuste que produce exige motivo (I5).
//
// ── Tres decisiones que esta pantalla NO toma ─────────────────────────────
//
//   1. **No decide si se puede conciliar.** Pregunta `motivoNoConciliable`, la
//      misma función que usa el store para rechazar. Si la respuesta no es
//      `null`, el botón se deshabilita y **se dice el motivo** — el mismo texto
//      que saldría al pulsarlo. Una pantalla no es una regla: el guardarraíl
//      está en `conciliarAuditoria`.
//   2. **No calcula diferencias.** Cada fila lee `diferencia` de
//      `lineasDeAuditoria` y la clasifica con `clasificarDiferencia`, que es lo
//      mismo que usa `resumenDeAuditoria`. Restar en el JSX sería un segundo
//      cálculo del mismo número.
//   3. **No escribe en el kárdex.** Conciliar lo hace el store, que pasa cada
//      ajuste por `registrarMovimiento` y por tanto por `validarMovimiento`.
//
// ── Por qué la casilla escribe al store en cada tecla ─────────────────────
//
// El texto tecleado vive en estado local, pero **lo que la tabla pinta sale del
// store**. Si lo tecleado no se entiende —una cifra ambigua, un texto— no se
// escribe nada y la fila se queda como estaba, con su motivo debajo. Así la
// tabla nunca enseña una diferencia que el kárdex no tenga: el badge y el
// contador son de lo registrado, no de lo escrito.
//
// ── Una sola capacidad para todo el flujo ─────────────────────────────────
//
// Abrir, contar, conciliar y cancelar piden `inventory.adjust`, que es la misma
// capacidad que ya protege el ajuste manual en el kárdex. Es deliberado y es
// grueso: **el producto de este flujo es un ajuste**, y un conteo que quien lo
// llenó no puede aplicar es un formulario a medias con dueño. La alternativa
// —contar con `inventory.move` y conciliar con `inventory.adjust`— es
// defendible y se deja anotada como deuda declarada: parte el flujo en dos
// personas y ninguna de las dos ve el estado completo.

/** Centinela del selector de bodega: no es un valor de bodega, es su ausencia. */
const SIN_BODEGA = "";

export const AuditoriaPage = observer(() => {
  const [bodegaId, setBodegaId] = useState(
    () => inventarioStore.bodegaPrincipal?.id ?? inventarioStore.bodegas[0]?.id ?? SIN_BODEGA,
  );
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  const puedeAuditar = puede("inventory.adjust");
  const motivoAuditar = motivoSinPermiso("inventory.adjust");

  const bodegas = inventarioStore.bodegas;
  const bodega = inventarioStore.bodegaPorId(bodegaId);
  const abierta = bodegaId === SIN_BODEGA ? undefined : inventarioStore.auditoriaEnProceso(bodegaId);

  /**
   * El historial se calcula en el render, **sin `useMemo`**, y no es descuido.
   *
   * `inventarioStore.auditorias` es un array observable de MobX: un `push` muta
   * el array y **la referencia no cambia**. Como dependencia de `useMemo` sería
   * una dependencia que nunca se invalida, y la lista de conteos anteriores se
   * quedaría congelada justo después de conciliar — el momento en que hay algo
   * nuevo que enseñar. Aquí el render es el que se suscribe, y el coste es un
   * `filter` sobre decenas de elementos.
   */
  const historial =
    bodegaId === SIN_BODEGA
      ? []
      : inventarioStore.auditoriasDe(bodegaId).filter((a) => a.estado !== "en_proceso");

  const abrirAuditoria = () => {
    setError(null);
    setResultado(null);
    const r = inventarioStore.iniciarAuditoria(bodegaId);
    if (!r.ok) setError(r.motivo);
  };

  return (
    <>
      <PageMeta
        title="Inventario · Conteo físico"
        description="Contar lo que hay en una bodega y conciliar la diferencia contra el kárdex"
      />

      <CabeceraPagina
        titulo="Conteo físico"
        descripcion="Se cuenta a mano, se compara contra lo que el sistema cree y se concilia la diferencia."
        acciones={
          abierta ? undefined : (
            <Button
              onClick={abrirAuditoria}
              disabled={!puedeAuditar || bodegaId === SIN_BODEGA}
            >
              Iniciar conteo
            </Button>
          )
        }
      />

      {!puedeAuditar && (
        <div className="mb-6">
          <Alert
            variant="info"
            title="Conteo en solo lectura"
            message={`Puedes ver las auditorías y sus discrepancias, pero no abrir un conteo ni conciliarlo. ${motivoAuditar}`}
          />
        </div>
      )}

      {error && (
        <div className="mb-6">
          <Alert variant="error" title="No se pudo abrir el conteo" message={error} />
        </div>
      )}

      {resultado && (
        <div className="mb-6">
          {/* `info` y no `success`: el módulo no usa el verde del catálogo —el
              manual de marca no lo tiene— y conciliar no es un logro, es el
              cierre de una discrepancia. Misma razón que en
              `ESTADO_AUDITORIA_BADGE`. */}
          <Alert variant="info" title="Auditoría conciliada" message={resultado} />
        </div>
      )}

      {/* ── Bodega ────────────────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="max-w-sm">
          <Label>Bodega</Label>
          <div className="mt-1.5">
            <Select
              key={`bod-${bodegaId}-${bodegas.map((b) => b.id).join("|")}`}
              options={bodegas.map((b) => ({
                value: b.id,
                label: b.principal ? `${b.nombre} (principal)` : b.nombre,
              }))}
              defaultValue={bodegaId}
              onChange={(v) => {
                setBodegaId(v);
                setError(null);
                setResultado(null);
              }}
              aria-label="Bodega que se va a contar"
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            Solo puede haber un conteo abierto por bodega. Dos conteos a la vez partirían de la
            misma foto y el segundo ajustaría contra un teórico que ya no existe.
          </p>
        </div>
      </Card>

      {bodegaId === SIN_BODEGA ? (
        <div className="mt-6">
          <Card className="p-5">
            <SinResultados
              titulo="No hay bodegas"
              mensaje="El módulo necesita al menos una bodega para poder contar algo."
              accion={{ label: "Crear una bodega", to: "/inventario/config" }}
            />
          </Card>
        </div>
      ) : abierta ? (
        <PanelConteo
          key={abierta.id}
          auditoria={abierta}
          puedeAuditar={puedeAuditar}
          motivoAuditar={motivoAuditar}
          onResultado={setResultado}
        />
      ) : (
        <div className="mt-6">
          <Card className="p-5">
            <SinResultados
              titulo={`Ningún conteo abierto en ${bodega?.nombre ?? "esta bodega"}`}
              mensaje="«Iniciar conteo» congela la existencia que el sistema da a cada artículo de esta bodega. A partir de ahí se cuenta a mano y se comparan las dos cifras."
            />
          </Card>
        </div>
      )}

      {/* ── Historial ─────────────────────────────────────────────────────── */}
      {bodegaId !== SIN_BODEGA && historial.length > 0 && (
        <div className="mt-6">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink-title dark:text-white/90">
              Conteos anteriores
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Una auditoría cerrada no se reabre: lo que dejó escrito está en el kárdex, y el kárdex
              no se reescribe.
            </p>
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell header>Abierta</TableCell>
                    <TableCell header>Estado</TableCell>
                    <TableCell header className="text-right">Líneas</TableCell>
                    <TableCell header className="text-right">Con diferencia</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.map((a) => {
                    const resumen = resumenDeAuditoria(a);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {etiquetaFecha(a.fechaInicio)}
                        </TableCell>
                        <TableCell>
                          <EstadoAuditoriaBadge estado={a.estado} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-gray-800 dark:text-white/90">
                          {a.items.length}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-gray-800 dark:text-white/90">
                          {resumen.sobra + resumen.falta}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PANEL DEL CONTEO ABIERTO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * El conteo abierto de una bodega.
 *
 * Es un componente aparte y **se monta con `key={auditoria.id}`**: así el texto
 * tecleado se reinicia cuando cambia la auditoría. Guardarlo en la página
 * dejaría las casillas de un conteo viejo encima de las líneas de uno nuevo, con
 * las mismas claves —los ids de artículo se repiten— y sin forma de notarlo.
 *
 * Va envuelto en `observer` **por derecho propio, no por herencia**: lee el
 * estado de las líneas (`conteoFisico`) y lo escribe el store en cada tecla. Sin
 * su propia suscripción, la tabla dependería de que el componente de arriba se
 * volviera a pintar por casualidad — y la fila se quedaría con el badge viejo
 * mientras la casilla ya enseña el número nuevo. Es exactamente la clase de
 * defecto que no ve ningún test de este repo, porque ningún test importa un
 * `.tsx`.
 */
const PanelConteo = observer(function PanelConteo({
  auditoria,
  puedeAuditar,
  motivoAuditar,
  onResultado,
}: {
  auditoria: AuditoriaInventario;
  puedeAuditar: boolean;
  motivoAuditar: string;
  onResultado: (mensaje: string | null) => void;
}) {
  /**
   * Lo tecleado, por artículo. **Solo lo que no se pudo interpretar** se queda
   * aquí de forma estable: un valor válido va derecho al store y la casilla lo
   * vuelve a leer de allí.
   */
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [erroresLinea, setErroresLinea] = useState<Record<string, string>>({});
  const [errorConciliacion, setErrorConciliacion] = useState<string | null>(null);

  const lineas = inventarioStore.lineasDeAuditoria(auditoria.id);
  const resumen = resumenDeAuditoria(auditoria);
  const noConciliable = motivoNoConciliable(auditoria);

  /**
   * Líneas cuya existencia de hoy ya no es la que se congeló al abrir.
   *
   * Se avisa **antes** de conciliar y no se bloquea: el ajuste sigue siendo
   * correcto —se ajusta contra lo contado— pero el operador tiene que saber que
   * el sistema se movió mientras contaba, porque eso explica por qué el
   * resultado no coincide con la diferencia que vio en su hoja de papel.
   */
  const desviadas = lineas.filter((l) => l.existenciaActual !== l.item.conteoTeorico);

  const valorDe = (linea: LineaAuditoria): string => {
    const tecleado = textos[linea.item.articuloId];
    if (tecleado !== undefined) return tecleado;
    return linea.item.conteoFisico === null ? "" : String(linea.item.conteoFisico);
  };

  const alEscribir = (linea: LineaAuditoria, texto: string) => {
    const articuloId = linea.item.articuloId;
    setTextos((p) => ({ ...p, [articuloId]: texto }));

    const leido = interpretarConteo(texto);
    if (!leido.valido) {
      setErroresLinea((p) => ({ ...p, [articuloId]: leido.motivo }));
      return;
    }
    setErroresLinea((p) => {
      if (p[articuloId] === undefined) return p;
      const copia = { ...p };
      delete copia[articuloId];
      return copia;
    });
    inventarioStore.registrarConteo(auditoria.id, articuloId, leido.conteoFisico);
  };

  const conciliar = () => {
    setErrorConciliacion(null);
    const r = inventarioStore.conciliarAuditoria(auditoria.id);
    if (!r.ok) {
      setErrorConciliacion(r.motivo);
      return;
    }
    // Se cuenta lo que el kárdex ganó, no lo que se pulsó: «conciliada» sin
    // decir cuánto se movió es un acuse de recibo.
    const n = r.movimientos.length;
    onResultado(
      n === 0
        ? "El conteo coincidió en todas las líneas. No se escribió ningún ajuste."
        : n === 1
          ? "Se escribió 1 ajuste en el kárdex."
          : `Se escribieron ${n} ajustes en el kárdex.`,
    );
  };

  const cancelar = () => {
    setErrorConciliacion(null);
    const r = inventarioStore.cancelarAuditoria(auditoria.id);
    if (!r.ok) setErrorConciliacion(r.motivo);
  };

  return (
    <>
      {/* ── Resumen ───────────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Sin contar"
          value={String(resumen.pendiente)}
          hint={resumen.pendiente === 0 ? "Conteo completo" : "Faltan líneas por contar"}
          alerta={resumen.pendiente > 0}
          tono="aviso"
        />
        <KpiCard label="Coinciden" value={String(resumen.coincide)} hint="Sistema y estante dicen lo mismo" />
        <KpiCard
          label="Sobra"
          value={String(resumen.sobra)}
          hint="Hay más de lo que el sistema cree"
          alerta={resumen.sobra > 0}
          tono="aviso"
        />
        <KpiCard
          label="Falta"
          value={String(resumen.falta)}
          hint="Hay menos de lo que el sistema cree"
          alerta={resumen.falta > 0}
          tono="grave"
        />
      </div>

      {desviadas.length > 0 && (
        <div className="mt-4">
          <Alert
            variant="warning"
            title="El almacén se movió mientras se contaba"
            message={`${desviadas.length === 1 ? "Un artículo ya no tiene" : `${desviadas.length} artículos ya no tienen`} la existencia que se congeló al abrir el conteo. La conciliación ajusta contra lo contado, así que el resultado puede no cuadrar con la diferencia que viste al contar.`}
          />
        </div>
      )}

      {errorConciliacion && (
        <div className="mt-4">
          <Alert variant="error" title="No se pudo conciliar" message={errorConciliacion} />
        </div>
      )}

      {/* ── Líneas ────────────────────────────────────────────────────────── */}
      <div className="mt-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink-title dark:text-white/90">
                  {inventarioStore.bodegaPorId(auditoria.almacenId)?.nombre ?? "Bodega eliminada"}
                </h2>
                <EstadoAuditoriaBadge estado={auditoria.estado} />
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Abierta {etiquetaFecha(auditoria.fechaInicio)} · {auditoria.items.length} líneas. El
                teórico es la foto que el sistema dio al abrir; no se recalcula.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" onClick={cancelar} disabled={!puedeAuditar}>
                Cancelar conteo
              </Button>
              <Button
                onClick={conciliar}
                disabled={!puedeAuditar || noConciliable !== null}
              >
                Conciliar
              </Button>
            </div>
          </div>

          {!puedeAuditar && (
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">{motivoAuditar}</p>
          )}
          {puedeAuditar && noConciliable && (
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">{noConciliable}</p>
          )}

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header>Artículo</TableCell>
                  <TableCell header className="text-right">Teórico (foto)</TableCell>
                  <TableCell header className="text-right">Existencia hoy</TableCell>
                  <TableCell header>Contado</TableCell>
                  <TableCell header className="text-right">Diferencia</TableCell>
                  <TableCell header>Resultado</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineas.map((linea) => {
                  const { item, articulo, diferencia, existenciaActual } = linea;
                  const clase = clasificarDiferencia(diferencia);
                  const errorLinea = erroresLinea[item.articuloId];
                  return (
                    <TableRow key={item.articuloId}>
                      <TableCell className="font-medium text-gray-800 dark:text-white/90">
                        {articulo.nombre}
                        <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                          {articulo.sku}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-500 dark:text-gray-400">
                        {cantidad(item.conteoTeorico, articulo.unidad)}
                      </TableCell>
                      {/* La existencia de hoy se enseña SIEMPRE, no solo cuando
                          difiere: esconderla haría que la columna apareciera y
                          desapareciera según el estado del almacén, y el
                          operador no sabría que existe. */}
                      <TableCell
                        className={
                          existenciaActual === item.conteoTeorico
                            ? "text-right tabular-nums text-gray-500 dark:text-gray-400"
                            : "text-right tabular-nums font-medium text-warning-600 dark:text-warning-400"
                        }
                      >
                        {cantidad(existenciaActual, articulo.unidad)}
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <Input
                            type="text"
                            value={valorDe(linea)}
                            error={Boolean(errorLinea)}
                            hint={errorLinea}
                            disabled={!puedeAuditar}
                            onChange={(e) => alEscribir(linea, e.target.value)}
                            aria-label={`Cantidad contada de ${articulo.nombre}`}
                            placeholder="sin contar"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-800 dark:text-white/90">
                        {diferencia === null ? "—" : cantidadConSigno(diferencia, articulo.unidad)}
                      </TableCell>
                      <TableCell>
                        <EstadoLineaBadge estado={clase} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </>
  );
});
