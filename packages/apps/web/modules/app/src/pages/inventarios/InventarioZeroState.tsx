import { useRef, useState } from "react";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import {
  BoxIcon,
  PlusIcon,
  DownloadIcon,
  InfoIcon,
  CheckLineIcon,
  BuildingStorefrontIcon,
  FileIcon,
} from "@/icons";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { productosStore } from "@/stores/productos.store";
import { descargarCsv, BOM_UTF8 } from "@/lib/csv";
import type { UnidadMedida } from "@/domain/inventarios/productos.domain";

interface InventarioZeroStateProps {
  onCrearManual: () => void;
  puedeEditar: boolean;
}

export const InventarioZeroState: React.FC<InventarioZeroStateProps> = ({
  onCrearManual,
  puedeEditar,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cargandoSector, setCargandoSector] = useState<string | null>(null);
  const [mensajeImportacion, setMensajeImportacion] = useState<string | null>(null);

  /**
   * Genera y descarga una plantilla CSV lista para rellenar
   */
  function descargarPlantilla() {
    const encabezados = [
      "Nombre",
      "Categoria",
      "Precio_Compra",
      "Unidad",
      "Stock_Minimo",
      "Stock_Inicial",
    ];
    const ejemplos = [
      ["Arroz Diana 1 kg", "Granos", "3800", "paquete", "10", "25"],
      ["Aceite Vegetal 900 ml", "Abarrotes", "7200", "litro", "5", "15"],
      ["Detergente Líquido 1 L", "Aseo", "6500", "litro", "8", "20"],
    ];

    const filas = [encabezados.join(","), ...ejemplos.map((e) => e.join(","))].join("\n");
    descargarCsv(BOM_UTF8 + filas, "plantilla_carga_inventario.csv");
  }

  /**
   * Procesa el archivo CSV subido por el comerciante
   */
  function handleSubirCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const texto = event.target?.result as string;
      if (!texto) return;

      const lineas = texto
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lineas.length <= 1) {
        setMensajeImportacion("El archivo no contiene filas de datos.");
        return;
      }

      const items: Array<{
        nombre: string;
        categoria: string;
        precioCompra: number;
        unidad: UnidadMedida;
        minimo: number;
        stockInicial?: number;
      }> = [];

      // Omitir fila 0 si son encabezados
      const primeraFila = lineas[0].toLowerCase();
      const inicio = primeraFila.includes("nombre") || primeraFila.includes("producto") ? 1 : 0;

      for (let i = inicio; i < lineas.length; i++) {
        const celdas = lineas[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (!celdas[0]) continue;

        const uRaw = (celdas[3] || "").toLowerCase().trim();
        const unidad: UnidadMedida = uRaw.startsWith("paq")
          ? "paquete"
          : uRaw.startsWith("caj")
          ? "caja"
          : uRaw.startsWith("lit")
          ? "litro"
          : uRaw.startsWith("kil")
          ? "kilo"
          : "unidad";

        items.push({
          nombre: celdas[0],
          categoria: celdas[1] || "General",
          precioCompra: parseFloat(celdas[2]) || 0,
          unidad,
          minimo: parseInt(celdas[4], 10) || 5,
          stockInicial: parseInt(celdas[5], 10) || 0,
        });
      }

      const res = productosStore.importarProductosCsv(items);
      setMensajeImportacion(`¡Se importaron ${res.creados} productos con éxito!`);
      setTimeout(() => setMensajeImportacion(null), 4000);
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCargarSector(sector: "minimarket" | "farmacia" | "ferreteria") {
    setCargandoSector(sector);
    setTimeout(() => {
      productosStore.cargarPresetSector(sector);
      setCargandoSector(null);
    }, 250);
  }

  return (
    <div className="mx-auto max-w-5xl py-6 sm:py-10">
      {/* ── Encabezado Hero Original ──────────────────────────────────────── */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 mb-4 shadow-sm border border-brand-100 dark:border-brand-500/20">
          <BoxIcon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-title dark:text-white">
          Configura tus primeros productos
        </h2>
        <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Tu inventario está en ceros. Elige cómo quieres registrar tus artículos para comenzar a controlar
          stock multisede, costes y emitir ventas sin roturas de almacén.
        </p>

        {mensajeImportacion && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400 text-theme-sm font-medium border border-success-200 dark:border-success-500/20">
            <CheckLineIcon className="w-4 h-4" />
            <span>{mensajeImportacion}</span>
          </div>
        )}
      </div>

      {/* ── Rejilla 3-Card SaaS B2B ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Creación Manual */}
        <div className="relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <PlusIcon className="w-5 h-5" />
              </div>
              <Badge color="light" size="sm">
                Control individual
              </Badge>
            </div>
            <h3 className="text-base font-semibold text-ink-title dark:text-white mb-1.5">
              Crear uno por uno
            </h3>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Ideal si tienes un catálogo pequeño o quieres registrar artículos específicos con SKU y reparto
              por sede detallado.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
            <Button
              className="w-full justify-center"
              startIcon={<PlusIcon className="w-4 h-4" />}
              onClick={onCrearManual}
              disabled={!puedeEditar}
            >
              Nuevo producto
            </Button>
          </div>
        </div>

        {/* Card 2: Plantilla Excel / CSV */}
        <div className="relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileIcon className="w-5 h-5" />
              </div>
              <Badge color="light" size="sm">
                Recomendado masivo
              </Badge>
            </div>
            <h3 className="text-base font-semibold text-ink-title dark:text-white mb-1.5">
              Carga con archivo CSV / Excel
            </h3>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Descarga nuestra plantilla estructurada, llénala con tu inventario actual en Excel y cárgala en
              pocos segundos.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-theme-xs"
              startIcon={<DownloadIcon className="w-3.5 h-3.5" />}
              onClick={descargarPlantilla}
            >
              Descargar plantilla (.csv)
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              className="hidden"
              onChange={handleSubirCsv}
            />
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center text-theme-xs"
              startIcon={<ArrowUpTrayIcon className="w-3.5 h-3.5" />}
              onClick={() => fileInputRef.current?.click()}
              disabled={!puedeEditar}
            >
              Subir archivo completado
            </Button>
          </div>
        </div>

        {/* Card 3: Presets por Sector */}
        <div className="relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <BuildingStorefrontIcon className="w-5 h-5" />
              </div>
              <Badge color="light" size="sm">
                1 clic · Rápido
              </Badge>
            </div>
            <h3 className="text-base font-semibold text-ink-title dark:text-white mb-1.5">
              Cargar kit por sector
            </h3>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Inicia al instante con una lista predeterminada de artículos frecuentes con precios sugeridos y
              existencias de prueba.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <button
              type="button"
              onClick={() => handleCargarSector("minimarket")}
              disabled={!puedeEditar || cargandoSector !== null}
              className="w-full text-left px-3 py-2 rounded-lg text-theme-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-gray-800 transition-colors flex items-center justify-between"
            >
              <span>🛒 Minimarket / Abarrotes</span>
              <span className="text-gray-400 text-[11px]">5 ítems</span>
            </button>
            <button
              type="button"
              onClick={() => handleCargarSector("farmacia")}
              disabled={!puedeEditar || cargandoSector !== null}
              className="w-full text-left px-3 py-2 rounded-lg text-theme-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-gray-800 transition-colors flex items-center justify-between"
            >
              <span>💊 Droguería / Farmacia</span>
              <span className="text-gray-400 text-[11px]">4 ítems</span>
            </button>
            <button
              type="button"
              onClick={() => handleCargarSector("ferreteria")}
              disabled={!puedeEditar || cargandoSector !== null}
              className="w-full text-left px-3 py-2 rounded-lg text-theme-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-gray-800 transition-colors flex items-center justify-between"
            >
              <span>🔧 Ferretería</span>
              <span className="text-gray-400 text-[11px]">4 ítems</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Barra Informativa de Buenas Prácticas ────────────────────────── */}
      <div className="mt-8 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-theme-xs text-gray-600 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <InfoIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
          <span>
            <strong>¿Quieres restablecer la demostración completa?</strong> Puedes volver al dataset inicial con
            14 productos multisede y órdenes de compra en cualquier momento.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 text-theme-xs"
          onClick={() => productosStore.restaurarSeed()}
          disabled={!puedeEditar}
        >
          Restaurar datos de muestra
        </Button>
      </div>
    </div>
  );
};
