import { useEffect, useRef, useState } from "react";

import { Modal } from "@/elements/ui/modal";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import { Label } from "@/elements/form/label";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { PlusIcon, BoxCubeIcon, CheckLineIcon } from "@/icons";
import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/utils";

import type {
  Producto,
  TipoImpuesto,
  UnidadMedida,
} from "@/domain/inventarios/productos.domain";
import type { DatosProducto, ResultadoGuardado } from "@/stores/productos.store";
import {
  MAX_BYTES_IMAGEN,
  OPCIONES_UNIDAD,
  TEXTO_SOLO_LECTURA,
} from "./productos.constants";

const idCampo = (sufijo: string) => `producto-${sufijo}`;

const OPCIONES_IMPUESTO: Array<{ value: TipoImpuesto; label: string }> = [
  { value: "iva_19", label: "IVA 19% (Tarifa General)" },
  { value: "iva_5", label: "IVA 5% (Canasta / Agrícola)" },
  { value: "iva_0", label: "IVA 0%" },
  { value: "exento", label: "Exento / Excluido" },
  { value: "impoconsumo", label: "Impoconsumo 8% (Restaurantes/Bares)" },
];

interface Formulario {
  nombre: string;
  codigo: string;
  codigoBarras: string;
  categoria: string;
  categoriaNueva: string;
  precioCompra: string;
  precioVenta: string;
  impuesto: TipoImpuesto;
  publicarEnCatalogo: boolean;
  descripcion: string;
  cantidadInicial: string;
  unidad: UnidadMedida;
  vencimiento: string;
  minimo: string;
  imagenDataUrl: string | null;
}

const VACIO: Formulario = {
  nombre: "",
  codigo: "",
  codigoBarras: "",
  categoria: "",
  categoriaNueva: "",
  precioCompra: "",
  precioVenta: "",
  impuesto: "iva_19",
  publicarEnCatalogo: true,
  descripcion: "",
  cantidadInicial: "10",
  unidad: "unidad",
  vencimiento: "",
  minimo: "5",
  imagenDataUrl: null,
};

const NUEVA_CATEGORIA = "__nueva__";

function desdeProducto(p: Producto): Formulario {
  return {
    nombre: p.nombre,
    codigo: p.codigo,
    codigoBarras: p.codigoBarras ?? "",
    categoria: p.categoria,
    categoriaNueva: "",
    precioCompra: String(p.precioCompra),
    precioVenta: p.precioVenta ? String(p.precioVenta) : "",
    impuesto: p.impuesto ?? "iva_19",
    publicarEnCatalogo: p.publicarEnCatalogo ?? true,
    descripcion: p.descripcion ?? "",
    cantidadInicial: "",
    unidad: p.unidad,
    vencimiento: p.vencimiento ?? "",
    minimo: String(p.minimo),
    imagenDataUrl: p.imagenDataUrl,
  };
}

export function ModalProducto({
  abierto,
  onCerrar,
  producto,
  categorias,
  soloLectura,
  onGuardar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  producto: Producto | null;
  categorias: string[];
  soloLectura: boolean;
  onGuardar: (datos: DatosProducto) => ResultadoGuardado;
}) {
  const [form, setForm] = useState<Formulario>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const esEdicion = producto !== null;

  useEffect(() => {
    if (!abierto) return;
    setForm(producto ? desdeProducto(producto) : {
      ...VACIO,
      codigo: `PRD-${Math.floor(100 + Math.random() * 900)}`,
    });
    setError(null);
  }, [abierto, producto]);

  const campo = <K extends keyof Formulario>(clave: K, valor: Formulario[K]) =>
    setForm((prev) => ({ ...prev, [clave]: valor }));

  function cargarArchivo(archivo: File | undefined) {
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen válida (PNG, JPG, WebP).");
      return;
    }
    if (archivo.size > MAX_BYTES_IMAGEN) {
      const mb = Math.round(MAX_BYTES_IMAGEN / 1024 / 1024);
      setError(`La imagen excede el límite permitido de ${mb} MB.`);
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      setError(null);
      campo("imagenDataUrl", typeof lector.result === "string" ? lector.result : null);
    };
    lector.onerror = () => setError("No fue posible cargar la imagen.");
    lector.readAsDataURL(archivo);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setArrastrando(false);
    cargarArchivo(e.dataTransfer.files?.[0]);
  }

  // Cálculo de Margen de Ganancia en vivo
  const costoNum = parseFloat(form.precioCompra) || 0;
  const ventaNum = parseFloat(form.precioVenta) || 0;
  const gananciaNeta = ventaNum - costoNum;
  const margenPorcentaje = ventaNum > 0 ? ((gananciaNeta / ventaNum) * 100).toFixed(1) : null;

  function modificarCantidad(delta: number) {
    const act = parseInt(form.cantidadInicial, 10) || 0;
    campo("cantidadInicial", String(Math.max(0, act + delta)));
  }

  function modificarMinimo(delta: number) {
    const act = parseInt(form.minimo, 10) || 0;
    campo("minimo", String(Math.max(0, act + delta)));
  }

  function guardar() {
    const categoria =
      form.categoria === NUEVA_CATEGORIA ? form.categoriaNueva : form.categoria;

    const resultado = onGuardar({
      nombre: form.nombre,
      codigo: form.codigo,
      codigoBarras: form.codigoBarras.trim() || null,
      categoria,
      precioCompra: form.precioCompra,
      precioVenta: form.precioVenta,
      impuesto: form.impuesto,
      publicarEnCatalogo: form.publicarEnCatalogo,
      descripcion: form.descripcion.trim() || null,
      cantidadInicial: esEdicion ? 0 : form.cantidadInicial,
      minimo: form.minimo,
      unidad: form.unidad,
      vencimiento: form.vencimiento.trim() === "" ? null : form.vencimiento,
      imagenDataUrl: form.imagenDataUrl,
    });

    if (!resultado.ok) {
      setError(resultado.motivo ?? "No se pudo guardar el producto");
      return;
    }
    onCerrar();
  }

  const opcionesCategoria = [
    ...categorias.map((c) => ({ value: c, label: c })),
    { value: NUEVA_CATEGORIA, label: "➕ Añadir nueva categoría…" },
  ];

  return (
    <Modal
      isOpen={abierto}
      onClose={onCerrar}
      className="max-w-4xl p-6 sm:p-8"
      ariaLabelledBy="titulo-modal-producto"
      manageFocus
    >
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2
            id="titulo-modal-producto"
            className="text-xl font-bold text-ink-title dark:text-white"
          >
            {esEdicion ? "Editar producto" : "Nuevo producto"}
          </h2>
          <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            {esEdicion
              ? "Actualiza la información comercial, precios e imagen del artículo."
              : "Registra los datos básicos, precios de venta, costos y stock inicial."}
          </p>
        </div>
        <Button onClick={guardar} disabled={soloLectura} size="sm">
          {esEdicion ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>

      {soloLectura && (
        <p className="mt-4 rounded-xl bg-estado-amarillo px-3.5 py-2.5 text-sm text-ink-body dark:bg-estado-amarillo/15 dark:text-estado-amarillo">
          {TEXTO_SOLO_LECTURA}
        </p>
      )}

      <fieldset disabled={soloLectura} className="mt-6 space-y-6 max-h-[72vh] overflow-y-auto pr-1">
        {/* ── Zona de Foto: Dropzone ─────────────────────────────────────── */}
        <div>
          <Label className="mb-2 block">Fotografía del producto</Label>
          {form.imagenDataUrl ? (
            <div className="relative inline-flex items-center gap-4 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <img
                src={form.imagenDataUrl}
                alt="Vista previa del producto"
                className="w-24 h-24 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
              />
              <div className="space-y-1.5">
                <Badge color="success" size="sm">
                  Imagen cargada
                </Badge>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  Visible en catálogo virtual y listados de almacén.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[12px] h-7 px-2.5"
                    onClick={() => inputArchivo.current?.click()}
                  >
                    Cambiar foto
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[12px] h-7 px-2 text-error-600 hover:text-error-700 dark:text-error-400"
                    onClick={() => campo("imagenDataUrl", null)}
                  >
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    Quitar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={handleDrop}
              onClick={() => inputArchivo.current?.click()}
              className={cn(
                "cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all",
                arrastrando
                  ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/10"
                  : "border-gray-200 dark:border-gray-800 hover:border-brand-400 hover:bg-gray-50/50 dark:hover:bg-white/[0.02]",
              )}
            >
              <div className="mx-auto w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-2">
                <ArrowUpTrayIcon className="w-5 h-5" />
              </div>
              <p className="text-theme-sm font-medium text-ink-title dark:text-white">
                Carga una foto de tu producto
              </p>
              <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                Arrastra una imagen aquí o haz clic para explorar. PNG, JPG o WebP hasta 2 MB.
              </p>
            </div>
          )}
          <input
            ref={inputArchivo}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => cargarArchivo(e.target.files?.[0])}
          />
        </div>

        {/* ── Distribución en 2 Columnas Estructuradas ────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna Izquierda: Información Principal */}
          <div className="space-y-4">
            <h3 className="text-theme-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Información Básica
            </h3>

            <div>
              <Label htmlFor={idCampo("nombre")}>Nombre del producto *</Label>
              <Input
                id={idCampo("nombre")}
                type="text"
                value={form.nombre}
                placeholder="Ej.: Café Sello Rojo 250 g"
                onChange={(e) => campo("nombre", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={idCampo("codigo")}>Código SKU / ID *</Label>
                <Input
                  id={idCampo("codigo")}
                  type="text"
                  value={form.codigo}
                  placeholder="PRD-001"
                  onChange={(e) => campo("codigo", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={idCampo("codigoBarras")}>Código de Barras</Label>
                <Input
                  id={idCampo("codigoBarras")}
                  type="text"
                  value={form.codigoBarras}
                  placeholder="77020101..."
                  onChange={(e) => campo("codigoBarras", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoría</Label>
                <Select
                  aria-label="Categoría"
                  options={opcionesCategoria}
                  placeholder="Selecciona categoría"
                  defaultValue={form.categoria}
                  onChange={(v) => campo("categoria", v)}
                />
              </div>
              <div>
                <Label>Unidad de medida</Label>
                <Select
                  aria-label="Unidad de medida"
                  options={OPCIONES_UNIDAD}
                  defaultValue={form.unidad}
                  onChange={(v) => campo("unidad", v as UnidadMedida)}
                />
              </div>
            </div>

            {form.categoria === NUEVA_CATEGORIA && (
              <div>
                <Label htmlFor={idCampo("categoriaNueva")}>Nombre nueva categoría</Label>
                <Input
                  id={idCampo("categoriaNueva")}
                  type="text"
                  value={form.categoriaNueva}
                  placeholder="Ej.: Lácteos y Huevos"
                  onChange={(e) => campo("categoriaNueva", e.target.value)}
                />
              </div>
            )}

            <div>
              <Label htmlFor={idCampo("descripcion")}>Descripción o detalles</Label>
              <textarea
                id={idCampo("descripcion")}
                rows={2}
                value={form.descripcion}
                placeholder="Notas para el cliente o especificaciones de almacenamiento..."
                onChange={(e) => campo("descripcion", e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2 text-theme-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Columna Derecha: Precios, Impuestos y Stock */}
          <div className="space-y-4">
            <h3 className="text-theme-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Financiero y Existencias
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={idCampo("precioCompra")}>Costo (Compra COP) *</Label>
                <Input
                  id={idCampo("precioCompra")}
                  type="number"
                  min="0"
                  step={100}
                  value={form.precioCompra}
                  placeholder="Ej.: 5500"
                  onChange={(e) => campo("precioCompra", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={idCampo("precioVenta")}>Precio de Venta (COP)</Label>
                <Input
                  id={idCampo("precioVenta")}
                  type="number"
                  min="0"
                  step={100}
                  value={form.precioVenta}
                  placeholder="Ej.: 7500"
                  onChange={(e) => campo("precioVenta", e.target.value)}
                />
              </div>
            </div>

            {/* Cálculo de Margen */}
            {margenPorcentaje !== null && (
              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-between text-theme-xs">
                <span className="text-blue-700 dark:text-blue-300 font-medium">
                  Margen bruto: <strong>{margenPorcentaje}%</strong>
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  Ganancia: ${gananciaNeta.toLocaleString("es-CO")} / {form.unidad}
                </span>
              </div>
            )}

            <div>
              <Label>Régimen de Impuesto (Colombia)</Label>
              <Select
                aria-label="Impuesto"
                options={OPCIONES_IMPUESTO}
                defaultValue={form.impuesto}
                onChange={(v) => campo("impuesto", v as TipoImpuesto)}
              />
            </div>

            {/* Controles de unidades con botones + y - */}
            <div className="grid grid-cols-2 gap-3">
              {!esEdicion && (
                <div>
                  <Label htmlFor={idCampo("cantidad")}>Stock inicial</Label>
                  <div className="flex items-center rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
                    <button
                      type="button"
                      onClick={() => modificarCantidad(-1)}
                      className="px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold"
                    >
                      −
                    </button>
                    <input
                      id={idCampo("cantidad")}
                      type="number"
                      min="0"
                      value={form.cantidadInicial}
                      onChange={(e) => campo("cantidadInicial", e.target.value)}
                      className="w-full text-center text-theme-sm font-semibold text-ink-title dark:text-white bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => modificarCantidad(1)}
                      className="px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor={idCampo("minimo")}>Alerta de stock bajo</Label>
                <div className="flex items-center rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
                  <button
                    type="button"
                    onClick={() => modificarMinimo(-1)}
                    className="px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold"
                  >
                    −
                  </button>
                  <input
                    id={idCampo("minimo")}
                    type="number"
                    min="0"
                    value={form.minimo}
                    onChange={(e) => campo("minimo", e.target.value)}
                    className="w-full text-center text-theme-sm font-semibold text-ink-title dark:text-white bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => modificarMinimo(1)}
                    className="px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor={idCampo("vencimiento")}>Fecha de vencimiento</Label>
              <Input
                id={idCampo("vencimiento")}
                type="date"
                value={form.vencimiento}
                hint="Opcional. Deja vacío si no tiene caducidad."
                onChange={(e) => campo("vencimiento", e.target.value)}
              />
            </div>

            {/* Switch de Publicar en catálogo */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02] cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.04] transition-colors">
                <input
                  type="checkbox"
                  checked={form.publicarEnCatalogo}
                  onChange={(e) => campo("publicarEnCatalogo", e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <div>
                  <p className="text-theme-xs font-semibold text-ink-title dark:text-white">
                    Publicar en catálogo virtual
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Tus clientes podrán consultar y pedir este producto directamente desde el enlace de tu tienda.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </fieldset>

      {error && (
        <p
          role="alert"
          className={cn(
            "mt-4 rounded-xl bg-estado-rojo px-3.5 py-2.5 text-sm text-ink-body",
            "dark:bg-estado-rojo/15 dark:text-estado-rojo",
          )}
        >
          {error}
        </p>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5">
        <Button variant="outline" onClick={onCerrar}>
          Descartar
        </Button>
        <Button onClick={guardar} disabled={soloLectura}>
          {esEdicion ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </Modal>
  );
}
