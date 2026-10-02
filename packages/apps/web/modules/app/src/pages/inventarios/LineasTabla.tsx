import { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import { Textarea } from "@/elements/form/textarea";
import { Badge } from "@/elements/ui/badge";
import { CheckLineIcon, CloseLineIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { cn } from "@/utils";
import { inventariosStore, type LineaInventario } from "@/stores";
import { sanearCantidad } from "@/domain/inventarios/inventarios.domain";
import {
  CantidadObservadaTexto,
  CondicionBadge,
  DiferenciaTexto,
  EstadoLineaBadge,
} from "./inventarios.widgets";
import { OPCIONES_CONDICION, OPCIONES_ESTADO_LINEA } from "./inventarios.constants";
import {
  FILTRO_TODOS,
  formatearFechaCorta,
  validarConteo,
  type FiltroEstadoLinea,
} from "./inventarios.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// TABLA DE LÍNEAS DEL CONTEO — con edición en línea
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Por qué se cuenta en la fila y no en un modal ──────────────────────────
//
// Un conteo son decenas de elementos que se registran uno tras otro. Abrir un
// modal, escribir, guardar y cerrarlo por cada uno convierte un trabajo de tres
// minutos en uno de diez. La fila se edita en el sitio: se escribe la cantidad,
// sale el `estadoDeLinea` calculado al instante, y se confirma.
//
// ── Lo que la fila NO permite editar ───────────────────────────────────────
//
// La cantidad **esperada**. No hay control para ella en ninguna parte: se
// congeló al iniciar y es el número contra el que se compara. Un campo editable
// ahí convertiría el conteo en un formulario donde se escribe el resultado que
// se quiere y desaparecería la verificación — que es todo el módulo.

export interface FilaLineaProps {
  linea: LineaInventario;
  /** Nombre del elemento, ya resuelto por el contenedor. */
  nombre: string;
  codigo: string;
  unidad: string;
  /** Código del elemento, `unidad` textual y si está dañado. */
  editable: boolean;
  esUltima: boolean;
  onGuardar: (datos: { cantidadObservada: number | null; condicion: LineaInventario["condicion"]; observacion?: string }) => string | null;
  onQuitar: () => void;
  onAdjuntarEvidencia: () => void;
}

/**
 * Tabla completa de líneas, con los filtros de la cabecera.
 *
 * El contenedor (`DetalleInventarioPage`) le pasa las líneas ya filtradas y los
 * callbacks; esta pieza solo pinta y delega.
 */
export const LineasTabla = observer(function LineasTabla({
  lineas,
  editable,
  onGuardar,
  onQuitar,
  onAbrirEvidencia,
}: {
  lineas: readonly LineaInventario[];
  editable: boolean;
  onGuardar: (lineaId: string, datos: Parameters<FilaLineaProps["onGuardar"]>[0]) => string | null;
  onQuitar: (lineaId: string) => void;
  onAbrirEvidencia: (lineaId: string) => void;
}) {
  if (lineas.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-gray-200 bg-gray-50/70 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
            <TableCell header className="py-3 pl-4 pr-3 text-left font-semibold">Producto</TableCell>
            <TableCell header className="w-24 py-3 text-right font-semibold">Esperado</TableCell>
            <TableCell header className="w-36 py-3 text-center font-semibold">Contado</TableCell>
            <TableCell header className="w-24 py-3 text-right font-semibold">Diferencia</TableCell>
            <TableCell header className="w-28 py-3 text-center font-semibold">Estado</TableCell>
            <TableCell header className="py-3 font-semibold">Notas y fotos</TableCell>
            <TableCell header className="w-24 py-3 pr-4 text-right font-semibold">Acciones</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineas.map((l) => (
            <FilaLinea
              key={l.id}
              linea={l}
              editable={editable}
              onGuardar={(datos) => onGuardar(l.id, datos)}
              onQuitar={() => onQuitar(l.id)}
              onAdjuntarEvidencia={() => onAbrirEvidencia(l.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

// ── La fila ───────────────────────────────────────────────────────────────

const FilaLinea = observer(function FilaLinea({
  linea,
  editable,
  onGuardar,
  onQuitar,
  onAdjuntarEvidencia,
}: {
  linea: LineaInventario;
  editable: boolean;
  onGuardar: FilaLineaProps["onGuardar"];
  onQuitar: () => void;
  onAdjuntarEvidencia: () => void;
}) {
  const elemento = inventariosStore.elementoDe(linea);
  const evidencias = inventariosStore.evidenciasDeLinea(linea.id);

  const [editando, setEditando] = useState(false);
  // El borrador guarda la cantidad como **texto**: es lo que permite distinguir
  // «campo vacío» de «cero escrito». Con un `number` en el estado, ambos serían
  // `0` y la distinción que sostiene el módulo se perdería en el formulario.
  const [cantidad, setCantidad] = useState<string>(
    linea.cantidadObservada === null ? "" : String(linea.cantidadObservada),
  );
  const [condicion, setCondicion] = useState(linea.condicion);
  const [observacion, setObservacion] = useState(linea.observacion ?? "");
  const [error, setError] = useState<string | null>(null);

  // Al cambiar de inventario o si el store rechaza el guardado, el borrador se
  // resincroniza con el hecho real. Sin esto, una fila que falló al guardar
  // seguiría enseñando lo que se escribió aunque no se haya registrado.
  useEffect(() => {
    if (editando) return;
    setCantidad(linea.cantidadObservada === null ? "" : String(linea.cantidadObservada));
    setCondicion(linea.condicion);
    setObservacion(linea.observacion ?? "");
  }, [linea.cantidadObservada, linea.condicion, linea.observacion, editando]);

  const cantidadSaneada = sanearCantidad(cantidad);

  const validacion = useMemo(
    () =>
      validarConteo({
        cantidadObservada: cantidadSaneada,
        condicion,
        observacion,
        evidenciaIds: linea.evidenciaIds,
      }),
    [cantidadSaneada, condicion, observacion, linea.evidenciaIds],
  );

  function guardar() {
    const motivo = onGuardar({
      cantidadObservada: cantidadSaneada,
      condicion,
      observacion: observacion.trim() || undefined,
    });
    if (motivo) {
      setError(motivo);
      return;
    }
    setError(null);
    setEditando(false);
  }

  function cancelar() {
    setCantidad(linea.cantidadObservada === null ? "" : String(linea.cantidadObservada));
    setCondicion(linea.condicion);
    setObservacion(linea.observacion ?? "");
    setError(null);
    setEditando(false);
  }

  const enEdicion = editando && editable;

  return (
    <TableRow className={cn(enEdicion && "bg-brand-50/40 dark:bg-brand-500/[0.06]")}>
      {/* ── Elemento ─────────────────────────────────────────────────── */}
      <TableCell>
        <span className="block font-mono text-[11px] text-gray-600 dark:text-gray-400">
          {elemento?.codigo ?? "—"}
        </span>
        <span className="mt-0.5 block truncate text-sm font-medium text-ink-title dark:text-gray-100">
          {elemento?.nombre ?? "Elemento desconocido"}
        </span>
        <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">
          {elemento?.unidad === "grupo" ? "Se cuenta por grupo" : "Se cuenta por unidad"}
        </span>
      </TableCell>

      {/* ── Esperado: congelado, jamás editable ──────────────────────── */}
      <TableCell className="text-right">
        {linea.cantidadEsperada === null ? (
          <span className="text-xs text-gray-600 dark:text-gray-400" title="Sin conteo de referencia">
            sin ref.
          </span>
        ) : (
          <span className="text-sm tabular-nums text-ink-body dark:text-gray-300">
            {linea.cantidadEsperada}
          </span>
        )}
      </TableCell>

      {/* ── Observado: el único editable ─────────────────────────────── */}
      <TableCell>
        {enEdicion ? (
          <div className="flex flex-col gap-1">
            <StepperCantidad valor={cantidad} onCambio={setCantidad} />
            <span className="text-[10px] text-gray-600 dark:text-gray-400">
              {cantidad.trim() === "" ? "vacío = sin contar" : "vacío = sin contar · 0 = no había"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CantidadObservadaTexto cantidad={linea.cantidadObservada} className="text-sm" />
            <EstadoLineaBadge linea={linea} />
          </div>
        )}
      </TableCell>

      {/* ── Diferencia ───────────────────────────────────────────────── */}
      <TableCell className="text-right">
        <DiferenciaTexto linea={linea} className="text-sm" />
      </TableCell>

      {/* ── Condición ────────────────────────────────────────────────── */}
      <TableCell>
        {enEdicion ? (
          <Select
            options={OPCIONES_CONDICION}
            defaultValue={condicion}
            onChange={(v) => setCondicion(v as LineaInventario["condicion"])}
            aria-label="Condición del elemento"
          />
        ) : (
          <CondicionBadge condicion={linea.condicion} />
        )}
      </TableCell>

      {/* ── Observación y evidencias ───────────────────────────────── */}
      <TableCell>
        {enEdicion ? (
          <Textarea
            value={observacion}
            onChange={setObservacion}
            rows={2}
            placeholder={condicion === "dañado" ? "Describe el daño (obligatorio)" : "Nota opcional"}
            error={!!validacion.errores.observacion}
          />
        ) : linea.observacion ? (
          <span className="block text-xs leading-snug text-gray-600 dark:text-gray-300">
            {linea.observacion}
          </span>
        ) : (
          <span className="text-xs text-gray-600 dark:text-gray-400">—</span>
        )}
        {linea.evidenciaIds.length > 0 && (
          <button
            type="button"
            onClick={onAdjuntarEvidencia}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-800 dark:text-brand-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 6.75h.008v.008H18V6.75z" />
            </svg>
            {linea.evidenciaIds.length} {linea.evidenciaIds.length === 1 ? "foto" : "fotos"}
          </button>
        )}
      </TableCell>

      {/* ── Acciones ─────────────────────────────────────────────────── */}
      <TableCell className="pr-4 text-right">
        {!editable ? (
          <span className="text-xs text-gray-600 dark:text-gray-400">—</span>
        ) : enEdicion ? (
          <div className="flex items-center justify-end gap-1.5">
            <IconoAccion
              titulo="Guardar conteo"
              onClick={guardar}
              disabled={!validacion.ok}
              tono="ok"
            >
              <CheckLineIcon className="h-4 w-4" />
            </IconoAccion>
            <IconoAccion titulo="Cancelar" onClick={cancelar} tono="neutro">
              <CloseLineIcon className="h-4 w-4" />
            </IconoAccion>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              title="Registrar conteo de este producto"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              <span>Contar</span>
            </button>
            <IconoAccion titulo="Quitar del conteo" onClick={onQuitar} tono="peligro">
              <TrashBinIcon className="h-3.5 w-3.5" />
            </IconoAccion>
          </div>
        )}

        {error && (
          <span className="mt-1 block text-[10px] leading-tight text-error-700 dark:text-error-400">
            {error}
          </span>
        )}
        {enEdicion && !validacion.ok && !error && (
          <span className="mt-1 block text-[10px] leading-tight text-warning-700 dark:text-warning-400">
            {Object.values(validacion.errores)[0]}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
});

// ── Stepper de cantidad ───────────────────────────────────────────────────

/**
 * `− [n] +` con campo de texto libre.
 *
 * ── Por qué es un `<input>` y no un `type="number"` ────────────────────────
 *
 * `type="number"` con el campo vacío devuelve `""` en el DOM pero los
 * navegadores lo tratan como valor «inválido» y algunos lo normalizan a `0` al
 * perder el foco. Aquí el campo vacío **significa** «sin contar», así que
 * cualquier cosa que lo convierta en `0` rompe la distinción central del
 * módulo. Se usa `type="text"` con `inputMode="numeric"` —el teclado numérico
 * del móvil se conserva— y el saneo lo hace `sanearCantidad`.
 *
 * Los botones `−`/`+` mueven el valor **desde lo que haya escritos** y no desde
 * un mínimo de 0: pulsar `+` con el campo vacío escribe `1`, que es lo que
 * espera quien empieza a contar; pulsar `−` con el campo vacío lo deja vacío
 * (no se puede bajar de «sin contar» a «cero» sin querer).
 */
export function StepperCantidad({
  valor,
  onCambio,
  disabled,
}: {
  valor: string;
  onCambio: (v: string) => void;
  disabled?: boolean;
}) {
  const actual = sanearCantidad(valor);

  function ajustar(delta: number) {
    if (actual === null) {
      if (delta > 0) onCambio("1");
      return;
    }
    const siguiente = Math.max(0, actual + delta);
    onCambio(String(siguiente));
  }

  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => ajustar(-1)}
        disabled={disabled}
        aria-label="Restar uno"
        className="flex h-8 w-8 items-center justify-center text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/5"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={valor}
        disabled={disabled}
        onChange={(e) => {
          const limpio = e.target.value.replace(/[^\d]/g, "");
          onCambio(limpio);
        }}
        aria-label="Cantidad observada"
        className="w-14 border-x border-gray-200 bg-transparent px-1 py-1 text-center text-sm font-semibold tabular-nums text-ink-title outline-none dark:border-gray-700 dark:text-gray-100"
      />
      <button
        type="button"
        onClick={() => ajustar(1)}
        disabled={disabled}
        aria-label="Sumar uno"
        className="flex h-8 w-8 items-center justify-center text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/5"
      >
        +
      </button>
    </div>
  );
}

// ── Botón de icono de la fila ─────────────────────────────────────────────

function IconoAccion({
  titulo,
  onClick,
  disabled,
  tono,
  children,
}: {
  titulo: string;
  onClick: () => void;
  disabled?: boolean;
  tono: "neutro" | "ok" | "peligro";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        tono === "ok" && "bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-500/10 dark:text-success-500 dark:hover:bg-success-500/20",
        tono === "peligro" && "text-gray-500 hover:bg-error-50 hover:text-error-700 dark:hover:bg-error-500/10 dark:hover:text-error-400",
        tono === "neutro" && "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-200",
        disabled && "hover:bg-transparent hover:text-gray-500 dark:hover:text-gray-400",
      )}
    >
      {children}
    </button>
  );
}

// ── Barra de filtros de líneas ────────────────────────────────────────────

export function FiltrosLineas({
  consulta,
  onConsulta,
  filtro,
  onFiltro,
  conteos,
  total,
}: {
  consulta: string;
  onConsulta: (v: string) => void;
  filtro: FiltroEstadoLinea;
  onFiltro: (v: FiltroEstadoLinea) => void;
  conteos: Record<string, number>;
  total: number;
}) {
  const pastillas: { id: FiltroEstadoLinea; label: string }[] = [
    { id: FILTRO_TODOS, label: "Todas" },
    { id: "pendiente", label: "Pendientes" },
    { id: "falta", label: "Falta" },
    { id: "sobra", label: "Sobra" },
    { id: "coincide", label: "Coinciden" },
    { id: "sin_esperado", label: "Sin referencia" },
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-1.5">
        {pastillas.map((p) => {
          const n = p.id === FILTRO_TODOS ? total : conteos[p.id] ?? 0;
          const activa = filtro === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onFiltro(p.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activa
                  ? "bg-brand-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10",
              )}
            >
              {p.label}
              <span className={cn("tabular-nums text-[11px]", activa ? "text-white/80" : "text-gray-600 dark:text-gray-400")}>
                {n}
              </span>
            </button>
          );
        })}
      </div>
      <div className="w-full lg:w-72">
        <Input
          value={consulta}
          onChange={(e) => onConsulta(e.target.value)}
          placeholder="Buscar producto o código..."
          aria-label="Buscar producto"
        />
      </div>
    </div>
  );
}

/** Envuelve `Badge` para no repetir el estilo de la etiqueta de evidencia. */
export function EtiquetaEvidencia({ n }: { n: number }) {
  return (
    <Badge color="info" size="xs">
      {n} {n === 1 ? "evidencia" : "evidencias"}
    </Badge>
  );
}

export default LineasTabla;
