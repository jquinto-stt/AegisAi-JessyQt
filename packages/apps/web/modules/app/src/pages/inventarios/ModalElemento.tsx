import { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";

import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { Textarea } from "@/elements/form/textarea";
import { Alert } from "@/elements/ui/alert";
import { Badge } from "@/elements/ui/badge";
import { inventariosStore, type DatosElemento, type Elemento } from "@/stores";
import { OPCIONES_UNIDAD, UNIDAD_META } from "./inventarios.constants";
import { validarElemento } from "./inventarios.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// MODAL — CREAR Y EDITAR ELEMENTO
// ═══════════════════════════════════════════════════════════════════════════
//
// ── El campo `categoria` es lo que hace universal a este módulo ────────────
//
// Es **texto libre con sugerencias**, nunca un desplegable cerrado. Un catálogo
// fijo de categorías es asumir rubro: «Bebidas» y «Lácteos» no le sirven a un
// negocio que cuenta herramientas, y «Mobiliario» no le sirve a una cafetería.
// El usuario escribe la suya y las que ya existen se ofrecen como chips, para
// que la segunda vez se escriba igual que la primera sin obligarlo.
//
// ── La unidad es deliberadamente pobre ────────────────────────────────────
//
// `unidad` / `grupo`. No hay `kg`, `l` ni `porcion`: esas son magnitudes de un
// rubro concreto. Un negocio que pesa cuenta bultos o cajas — y si de verdad
// necesita el peso, es que necesita un ERP, no un módulo de conteo.

export const ModalElemento = observer(function ModalElemento({
  abierto,
  elemento,
  onCerrar,
}: {
  abierto: boolean;
  /** `null` para crear, un elemento para editar. */
  elemento: Elemento | null;
  onCerrar: () => void;
}) {
  const editando = elemento !== null;

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidad, setUnidad] = useState<DatosElemento["unidad"]>("unidad");
  const [descripcion, setDescripcion] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir, el formulario toma el elemento (o vuelve al estado inicial). Se
  // resincroniza en cada apertura y no una sola vez al montar: el modal es el
  // mismo componente para crear y para editar, así que el estado tiene que
  // seguir al `elemento` que le pasen.
  useEffect(() => {
    if (!abierto) return;
    setEnviado(false);
    setError(null);
    if (elemento) {
      setCodigo(elemento.codigo);
      setNombre(elemento.nombre);
      setCategoria(elemento.categoria);
      setUnidad(elemento.unidad);
      setDescripcion(elemento.descripcion ?? "");
    } else {
      setCodigo("");
      setNombre("");
      setCategoria("");
      setUnidad(inventariosStore.config.unidadPorDefecto);
      setDescripcion("");
    }
  }, [abierto, elemento?.id, inventariosStore.config.unidadPorDefecto]);

  const sugeridas = inventariosStore.categoriasSugeridas;
  const usadas = inventariosStore.categoriasUsadas;

  const validacion = useMemo(
    () => validarElemento({ codigo, nombre, categoria, unidad, descripcion }, inventariosStore.elementos, elemento?.id),
    [codigo, nombre, categoria, unidad, descripcion, elemento?.id, inventariosStore.elementos.length],
  );

  function guardar() {
    setEnviado(true);
    setError(null);
    if (!validacion.ok) return;

    const datos: DatosElemento = {
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      categoria: categoria.trim(),
      unidad,
      descripcion: descripcion.trim() || undefined,
    };

    const r = editando ? inventariosStore.actualizarElemento(elemento.id, datos) : inventariosStore.crearElemento(datos);

    if (!r.ok) {
      setError(r.motivo ?? "No se pudo guardar el elemento");
      return;
    }
    onCerrar();
  }

  const err = (campo: string) => (enviado ? validacion.errores[campo] : undefined);

  return (
    <Modal isOpen={abierto} onClose={onCerrar} className="max-w-lg p-6">
      <h2 className="text-xl font-bold tracking-tight text-ink-title dark:text-white">
        {editando ? "Editar producto" : "Agregar nuevo producto"}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {editando
          ? "Actualiza la información del producto. Se aplicará a los próximos conteos."
          : "Registra los datos básicos del producto o artículo para poder incluirlo en los inventarios."}
      </p>

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="el-codigo">Código o referencia</Label>
            <Input
              id="el-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: ART-001"
              error={!!err("codigo")}
            />
            {err("codigo") ? (
              <p className="mt-1.5 text-xs text-error-700 dark:text-error-400">{err("codigo")}</p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Identificador único del producto.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="el-unidad">Unidad de medida</Label>
            <Select
              options={OPCIONES_UNIDAD}
              defaultValue={unidad}
              onChange={(v) => setUnidad(v as DatosElemento["unidad"])}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="el-nombre">Nombre del producto</Label>
          <Input
            id="el-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Monitor LED 24 pulgadas"
            error={!!err("nombre")}
          />
          {err("nombre") && (
            <p className="mt-1.5 text-xs text-error-700 dark:text-error-400">{err("nombre")}</p>
          )}
        </div>

        {/* ── Categoría: texto libre + sugerencias ─────────────────────── */}
        <div>
          <Label htmlFor="el-categoria">Categoría</Label>
          <Input
            id="el-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Ej: Tecnología, Mobiliario, Herramientas…"
            error={!!err("categoria")}
          />
          {err("categoria") && (
            <p className="mt-1.5 text-xs text-error-700 dark:text-error-400">{err("categoria")}</p>
          )}

          {usadas.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-600 dark:text-gray-400">Sugerencias:</span>
              {usadas.slice(0, 8).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoria(c)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    categoria === c
                      ? "bg-brand-700 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="el-descripcion">Descripción o notas (opcional)</Label>
          <Textarea
            id="el-descripcion"
            value={descripcion}
            onChange={setDescripcion}
            rows={2}
            placeholder="Detalles que faciliten reconocer el producto (marca, color, especificaciones)…"
            error={!!err("descripcion")}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert variant="error" title="No se pudo guardar" message={error} />
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
        <Button variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={enviado && !validacion.ok}>
          {editando ? "Guardar cambios" : "Guardar producto"}
        </Button>
      </div>
    </Modal>
  );
});

/** Etiqueta de unidad, para reusar en la tabla. */
export function EtiquetaUnidad({ unidad }: { unidad: DatosElemento["unidad"] }) {
  return (
    <Badge color="light" size="xs">
      {UNIDAD_META[unidad].label}
    </Badge>
  );
}

export default ModalElemento;
