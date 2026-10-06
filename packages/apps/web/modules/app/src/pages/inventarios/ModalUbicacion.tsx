import { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";

import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { Badge } from "@/elements/ui/badge";
import { Alert } from "@/elements/ui/alert";
import { ChevronDownIcon, FolderIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { cn } from "@/utils";
import { inventariosStore, type DatosUbicacion, type Ubicacion } from "@/stores";
import { nivelPadre } from "@/domain/inventarios/inventarios.domain";
import { NIVEL_UBICACION_META } from "./inventarios.constants";
import { validarUbicacion } from "./inventarios.presentacion";

export const ModalUbicacion = observer(function ModalUbicacion({
  abierto,
  ubicacion,
  /** Nivel preseleccionado al crear desde un nodo del árbol. */
  nivelInicial,
  padreInicial,
  onCerrar,
}: {
  abierto: boolean;
  ubicacion: Ubicacion | null;
  nivelInicial?: Ubicacion["nivel"];
  padreInicial?: string | null;
  onCerrar: () => void;
}) {
  const editando = ubicacion !== null;

  const [nombre, setNombre] = useState("");
  const [nivel, setNivel] = useState<Ubicacion["nivel"]>("cliente");
  const [padreId, setPadreId] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setEnviado(false);
    setError(null);
    if (ubicacion) {
      setNombre(ubicacion.nombre);
      setNivel(ubicacion.nivel);
      setPadreId(ubicacion.padreId);
    } else {
      setNombre("");
      setNivel(nivelInicial ?? "cliente");
      setPadreId(padreInicial ?? null);
    }
  }, [abierto, ubicacion?.id, nivelInicial, padreInicial]);

  const nivelSuperior = nivelPadre(nivel);

  const opcionesPadre = useMemo(() => {
    if (!nivelSuperior) return [];
    return inventariosStore.ubicaciones
      .filter((u) => u.nivel === nivelSuperior && u.estado === "activo" && u.id !== ubicacion?.id)
      .map((u) => ({ value: u.id, label: u.nombre }));
  }, [nivelSuperior, ubicacion?.id, inventariosStore.ubicaciones.length]);

  const validacion = useMemo(
    () => validarUbicacion({ nombre, nivel, padreId, ubicacionId: ubicacion?.id }, inventariosStore.ubicaciones),
    [nombre, nivel, padreId, ubicacion?.id, inventariosStore.ubicaciones.length],
  );

  function cambiarNivel(n: Ubicacion["nivel"]) {
    setNivel(n);
    setPadreId(null);
  }

  function guardar() {
    setEnviado(true);
    setError(null);
    if (!validacion.ok) return;

    const datos: DatosUbicacion = { nombre: nombre.trim(), nivel, padreId };
    const r = editando ? inventariosStore.actualizarUbicacion(ubicacion.id, datos) : inventariosStore.crearUbicacion(datos);

    if (!r.ok) {
      setError(r.motivo ?? "No se pudo guardar la ubicación");
      return;
    }
    onCerrar();
  }

  const err = (campo: string) => (enviado ? validacion.errores[campo] : undefined);

  return (
    <Modal isOpen={abierto} onClose={onCerrar} className="max-w-lg p-6">
      <h2 className="text-lg font-semibold text-ink-title dark:text-white">
        {editando ? "Editar ubicación" : "Nueva ubicación"}
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Organiza tus espacios de conteo por Cliente o Empresa, Sede y Ubicación física específica.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="ub-nivel">Nivel de la ubicación</Label>
          <Select
            options={[
              { value: "cliente", label: NIVEL_UBICACION_META.cliente.label },
              { value: "sede", label: NIVEL_UBICACION_META.sede.label },
              { value: "ubicacion", label: NIVEL_UBICACION_META.ubicacion.label },
            ]}
            defaultValue={nivel}
            onChange={(v) => cambiarNivel(v as Ubicacion["nivel"])}
            disabled={editando}
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{NIVEL_UBICACION_META[nivel].hint}</p>
          {editando && (
            <p className="mt-1.5 text-[11px] text-gray-600 dark:text-gray-400">
              El nivel no se puede modificar una vez creada la ubicación.
            </p>
          )}
        </div>

        {nivelSuperior && (
          <div>
            <Label htmlFor="ub-padre">Pertenece a</Label>
            <Select
              options={opcionesPadre}
              defaultValue={padreId ?? ""}
              onChange={(v) => setPadreId(v || null)}
              placeholder={`Seleccionar ${NIVEL_UBICACION_META[nivelSuperior].label.toLowerCase()}`}
              error={!!err("padreId")}
              disabled={opcionesPadre.length === 0}
            />
            {err("padreId") ? (
              <p className="mt-1.5 text-xs text-error-700 dark:text-error-400">{err("padreId")}</p>
            ) : opcionesPadre.length === 0 ? (
              <p className="mt-1.5 text-xs text-brand-700 dark:text-brand-400">
                No hay {NIVEL_UBICACION_META[nivelSuperior].labelPlural.toLowerCase()} activos disponibles. Debes crear uno primero.
              </p>
            ) : null}
          </div>
        )}

        <div>
          <Label htmlFor="ub-nombre">Nombre</Label>
          <Input
            id="ub-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={
              nivel === "cliente" ? "Distribuidora El Roble" : nivel === "sede" ? "Sede Norte" : "Almacén principal"
            }
            error={!!err("nombre")}
          />
          {err("nombre") && <p className="mt-1.5 text-xs text-error-700 dark:text-error-400">{err("nombre")}</p>}
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error" title="No se pudo guardar" message={error} />
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
        <Button variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={enviado && !validacion.ok}>
          {editando ? "Guardar cambios" : "Crear ubicación"}
        </Button>
      </div>
    </Modal>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// NODO DEL ÁRBOL — recursivo
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Un nodo del árbol y sus hijos.
 *
 * ── Por qué es recursivo y no una lista aplanada ───────────────────────────
 *
 * La jerarquía es de tres niveles, así que se podría aplanar en un `if/else`.
 * Pero el conteo **ocurre solo en el último nivel**, y quien mira el árbol
 * necesita ver de un golpe de vista cuál es hoja y cuál agrupa. Una lista
 * aplanada obliga a leer la etiqueta de nivel de cada fila para deducirlo.
 *
 * ── Los tres estados de un nodo ────────────────────────────────────────────
 *
 *   · **Con hijos**: se puede plegar. Nunca se cuenta aquí.
 *   · **Hoja (nivel «ubicacion»)**: es donde se cuenta. Lleva el botón de
 *     «nuevo conteo» porque es la acción que se va a querer hacer al verla.
 *   · **Hoja sin conteos**: se marca, para distinguir «espacio nunca contado»
 *     de «espacio con conteos al día». Son dos situaciones muy distintas.
 */
export const NodoUbicacion = observer(function NodoUbicacion({
  ubicacion,
  profundidad,
  onNuevoConteo,
  onEditar,
  onBaja,
  onAgregarHijo,
}: {
  ubicacion: Ubicacion;
  profundidad: number;
  onNuevoConteo: (ubicacionId: string) => void;
  onEditar: (u: Ubicacion) => void;
  onBaja: (u: Ubicacion) => void;
  onAgregarHijo: (padreId: string, nivel: Ubicacion["nivel"]) => void;
}) {
  const [plegado, setPlegado] = useState(false);
  const arbol = inventariosStore.arbolUbicaciones;
  const nodo = arbol.porId.get(ubicacion.id);
  const hijos = nodo?.hijos ?? [];

  const esHoja = ubicacion.nivel === "ubicacion";
  const conteos = esHoja ? inventariosStore.inventariosEnUbicacion(ubicacion.id) : [];
  const abiertos = conteos.filter((i) => i.estado === "borrador" || i.estado === "en_curso");
  const ultimoCerrado = conteos.find((i) => i.estado === "finalizado");
  const inactiva = ubicacion.estado === "inactivo";

  const nivelHijo = profundidad === 0 ? "sede" : profundidad === 1 ? "ubicacion" : null;

  return (
    <li>
      <div
        className={cn(
          "group flex flex-wrap items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]",
          inactiva && "opacity-60",
        )}
        style={{ marginLeft: profundidad * 20 }}
      >
        {/* ── Plega / despliega ─────────────────────────────────────── */}
        {hijos.length > 0 ? (
          <button
            type="button"
            onClick={() => setPlegado((p) => !p)}
            aria-label={plegado ? "Desplegar" : "Plegar"}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", plegado && "-rotate-90")} />
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            esHoja
              ? "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
              : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
          )}
        >
          <FolderIcon className="h-4 w-4" />
        </span>

        {/* ── Nombre y meta ─────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-ink-title dark:text-gray-100">{ubicacion.nombre}</span>
            <Badge color="light" size="xs">
              {NIVEL_UBICACION_META[ubicacion.nivel].label}
            </Badge>
            {inactiva && (
              <Badge color="light" size="xs">
                De baja
              </Badge>
            )}
            {esHoja && abiertos.length > 0 && (
              <Badge color="info" size="xs">
                {abiertos.length} {abiertos.length === 1 ? "conteo abierto" : "conteos abiertos"}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">
            {esHoja
              ? conteos.length === 0
                ? "Nunca se ha contado aquí"
                : ultimoCerrado
                  ? `Último conteo cerrado: ${ultimoCerrado.numero}`
                  : `${conteos.length} ${conteos.length === 1 ? "conteo" : "conteos"} registrados`
              : hijos.length === 0
                ? `Sin ${profundidad === 0 ? "sedes" : "ubicaciones"} dentro`
                : `${hijos.length} ${profundidad === 0 ? (hijos.length === 1 ? "sede" : "sedes") : hijos.length === 1 ? "ubicación" : "ubicaciones"}`}
          </p>
        </div>

        {/* ── Acciones ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
          {nivelHijo && (
            <button
              type="button"
              title={`Agregar ${NIVEL_UBICACION_META[nivelHijo].label.toLowerCase()}`}
              onClick={() => onAgregarHijo(ubicacion.id, nivelHijo)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5 dark:hover:text-brand-400"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          )}
          {esHoja && !inactiva && (
            <button
              type="button"
              title="Nuevo conteo en esta ubicación"
              onClick={() => onNuevoConteo(ubicacion.id)}
              className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-brand-500 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Contar
            </button>
          )}
          <button
            type="button"
            title="Editar"
            onClick={() => onEditar(ubicacion)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5 dark:hover:text-brand-400"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            title={inactiva ? "Reactivar" : "Dar de baja"}
            onClick={() => onBaja(ubicacion)}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors",
              inactiva
                ? "hover:bg-accent-50 hover:text-accent-700 dark:hover:bg-accent-500/10"
                : "hover:bg-error-50 hover:text-error-700 dark:hover:bg-error-500/10",
            )}
          >
            {inactiva ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <TrashBinIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* ── Hijos ───────────────────────────────────────────────────── */}
      {!plegado && hijos.length > 0 && (
        <ul>
          {hijos.map((h) => (
            <NodoUbicacion
              key={h.ubicacion.id}
              ubicacion={h.ubicacion}
              profundidad={profundidad + 1}
              onNuevoConteo={onNuevoConteo}
              onEditar={onEditar}
              onBaja={onBaja}
              onAgregarHijo={onAgregarHijo}
            />
          ))}
        </ul>
      )}
    </li>
  );
});

export default ModalUbicacion;
