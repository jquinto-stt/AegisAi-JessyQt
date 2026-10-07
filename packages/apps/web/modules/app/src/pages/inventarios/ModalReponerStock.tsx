import { useState, useEffect } from "react";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import { productosStore } from "@/stores/productos.store";
import { formatearMoneda } from "./productos.presentacion";
import type { Producto } from "@/domain/inventarios/productos.domain";

interface ModalReponerStockProps {
  abierto: boolean;
  onCerrar: () => void;
  producto: Producto | null;
  cantidadActual: number;
  onOrdenCreada?: (numeroOrden: string) => void;
}

export function ModalReponerStock({
  abierto,
  onCerrar,
  producto,
  cantidadActual,
  onOrdenCreada,
}: ModalReponerStockProps) {
  const [cantidadAPedir, setCantidadAPedir] = useState("20");
  const [proveedorId, setProveedorId] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [fechaEstimada, setFechaEstimada] = useState("");

  const proveedores = productosStore.proveedores;
  const sedes = productosStore.sedesActivas;

  useEffect(() => {
    if (producto && abierto) {
      // Cálculo amigable del reabastecimiento:
      // Si el mínimo es 10 y hay 2, sugerimos pedir lo necesario para llegar al doble del mínimo (ej. 20 - 2 = 18 unidades)
      const deficit = Math.max(0, producto.minimo - cantidadActual);
      const sugerencia = deficit > 0 ? Math.max(deficit, producto.minimo * 2 - cantidadActual) : Math.max(10, producto.minimo || 10);
      setCantidadAPedir(sugerencia.toString());

      // Preseleccionar proveedor que tenga categoría o nombre afín
      const provAfin = proveedores.find(
        (p) =>
          p.categoria.toLowerCase() === producto.categoria.toLowerCase() ||
          p.productoPrincipal.toLowerCase().includes(producto.nombre.toLowerCase()),
      );
      setProveedorId(provAfin?.id || proveedores[0]?.id || "");

      // Sede por defecto
      setSedeId(sedes[0]?.id || "");

      // Fecha estimada a 4 días
      const dentroDe4Dias = new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0];
      setFechaEstimada(dentroDe4Dias);
    }
  }, [producto, cantidadActual, abierto, proveedores, sedes]);

  if (!producto) return null;

  const cant = parseInt(cantidadAPedir, 10) || 0;
  const costoTotal = cant * producto.precioCompra;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cant <= 0) return;

    const res = productosStore.crearOrden({
      productoId: producto.id,
      proveedorId,
      sedeId,
      cantidad: cant,
      valorTotal: costoTotal,
      unidad: producto.unidad,
      fechaEntregaEstimada: fechaEstimada,
      notificar: true,
    });

    if (res.ok) {
      const orden = productosStore.ordenPorId(res.id);
      onOrdenCreada?.(orden?.numero || "ORD-001");
      onCerrar();
    }
  };

  return (
    <Modal isOpen={abierto} onClose={onCerrar} className="max-w-md p-6">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-1">
            <ShoppingBagIcon className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Reponer Inventario</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Pedir {producto.nombre}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Existencia actual: <strong className="text-amber-600">{cantidadActual} {producto.unidad}s</strong> · Mínimo sugerido: {producto.minimo} {producto.unidad}s
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 space-y-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Recomendación automática
            </span>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              Te sugerimos solicitar <strong>{cant} {producto.unidad}s</strong> para cubrir el déficit y mantener existencias de seguridad.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="repCantidad">Unidades a pedir *</Label>
              <Input
                id="repCantidad"
                type="number"
                min="1"
                required
                value={cantidadAPedir}
                onChange={(e) => setCantidadAPedir(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="repCosto">Costo estimado</Label>
              <div className="h-10 px-3 flex items-center rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white">
                {formatearMoneda(costoTotal)}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="repProveedor">Proveedor *</Label>
            <Select
              options={proveedores.map((p) => ({
                value: p.id,
                label: p.nombre,
              }))}
              defaultValue={proveedorId}
              onChange={(val) => setProveedorId(val)}
            />
          </div>


          <div>
            <Label htmlFor="repFecha">Fecha estimada de llegada</Label>
            <Input
              id="repFecha"
              type="date"
              required
              value={fechaEstimada}
              onChange={(e) => setFechaEstimada(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
            <Button type="button" variant="outline" size="sm" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
            >
              Confirmar y Enviar Pedido
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
