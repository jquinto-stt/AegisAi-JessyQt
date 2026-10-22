import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useSearchParams } from "react-router";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Switch } from "@/elements/form/switch";
import {
  BuildingOffice2Icon,
  AlertHexaIcon,
  GridIcon,
  DollarLineIcon,
  ShieldCheckIcon,
  PlugInIcon,
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  CheckLineIcon,
} from "@/icons";
import {
  BloqueConfig,
  ConfigHubPagina,
  ConfigShell,
  ConfigAcciones,
  VolverAlHub,
  claseFila,
  type TarjetaHub,
} from "@/pages/config-layout";
import {
  inventarioStore,
  ETIQUETA_UNIDAD,
  type ConfigInventario,
  type MetodoValoracion,
  type UnidadMedida,
  type TipoUbicacion,
} from "@/stores";

type ClaveSeccion =
  | "almacenes"
  | "reorden"
  | "catalogos"
  | "costeo"
  | "conteos"
  | "ordenes";

interface MetaSeccionInfo {
  label: string;
  hint: string;
  icono: React.FC<React.SVGProps<SVGSVGElement>>;
  badge?: string;
  palabrasClave: string[];
}

const META_SECCIONES: Record<ClaveSeccion, MetaSeccionInfo> = {
  almacenes: {
    label: "Almacenes y ubicaciones",
    hint: "Define bodegas, sucursales físicas, estanterías y puntos de despacho para el control geográfico de existencias.",
    icono: BuildingOffice2Icon,
    palabrasClave: ["bodega", "almacen", "estante", "muelle", "sucursal", "ubicacion", "despacho"],
  },
  reorden: {
    label: "Puntos de reorden y alertas",
    hint: "Punto de reorden y stock máximo para artículos nuevos, días de cobertura y alertas de stock bajo.",
    icono: AlertHexaIcon,
    palabrasClave: ["reorden", "minimo", "maximo", "alerta", "agotado", "whatsapp", "notificacion", "cobertura"],
  },
  catalogos: {
    label: "Categorías y medidas",
    hint: "Jerarquía de familias de productos, unidades de conteo (piezas, kg, resmas, cajas) y clasificaciones.",
    icono: GridIcon,
    palabrasClave: ["categoria", "unidad", "medida", "familias", "piezas", "kilos", "clasificacion"],
  },
  costeo: {
    label: "Valoración y costeo",
    hint: "Método con el que se calcula el costo de lo que sale del almacén: promedio ponderado o PEPS/FIFO.",
    icono: DollarLineIcon,
    palabrasClave: ["costo", "valoracion", "promedio", "fifo", "peps", "margen", "precio"],
  },
  conteos: {
    label: "Conteos y ajustes",
    hint: "Conteo a ciegas, revisión ante diferencias, umbral de alerta y referencia obligatoria en salidas.",
    icono: ShieldCheckIcon,
    palabrasClave: ["conteo", "ajuste", "merma", "ciego", "auditoria", "tolerancia", "diferencia"],
  },
  ordenes: {
    label: "Órdenes de compra y proveedores",
    hint: "Prefijo de numeración, mercancía en tránsito, múltiplo de pedido y notas por defecto.",
    icono: PlugInIcon,
    palabrasClave: ["orden", "compra", "proveedor", "prefijo", "oc", "pedido", "abastecimiento"],
  },
};

/** Los ajustes que hay dentro de cada sección, con el nombre que llevan en ella. */
const AJUSTES_SECCION: Record<ClaveSeccion, string[]> = {
  almacenes: ["Almacén de recepción", "Bodegas y ubicaciones"],
  reorden: ["Punto de reorden", "Stock máximo", "Días de cobertura", "Alertas de stock bajo"],
  catalogos: ["Unidad de medida", "Categorías"],
  costeo: ["Método de valoración"],
  conteos: ["Conteo a ciegas", "Revisión ante diferencias", "Umbral de alerta", "Referencia en salidas"],
  ordenes: ["Prefijo de órdenes", "Descontar en tránsito", "Múltiplo de pedido", "Notas por defecto"],
};

const ORDEN_SECCIONES: ClaveSeccion[] = [
  "almacenes",
  "reorden",
  "catalogos",
  "costeo",
  "conteos",
  "ordenes",
];

const UNIDADES_MEDIDA: { id: UnidadMedida; label: string }[] = [
  { id: "unidad", label: "Unidades (ud)" },
  { id: "kg", label: "Kilogramos (kg)" },
  { id: "litro", label: "Litros (L)" },
  { id: "paquete", label: "Paquetes (paq)" },
  { id: "rollo", label: "Rollos (rol)" },
  { id: "caja", label: "Cajas (cj)" },
  { id: "resma", label: "Resmas (res)" },
];

export const InventarioConfigPage = observer(() => {
  const [params, setParams] = useSearchParams();
  const seccion = params.get("seccion") as ClaveSeccion | null;

  // Borrador de configuración sincronizado con el store
  const [draft, setDraft] = useState<ConfigInventario>(() => ({ ...inventarioStore.config }));
  const [guardado, setGuardado] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Estados locales para sub-secciones
  const [nuevaCat, setNuevaCat] = useState("");
  const [editandoCat, setEditandoCat] = useState<{ actual: string; nuevo: string } | null>(null);
  const [nuevoAlmacenNombre, setNuevoAlmacenNombre] = useState("");
  const [nuevoAlmacenTipo, setNuevoAlmacenTipo] = useState<TipoUbicacion>("bodega");

  const entrarASeccion = (key: ClaveSeccion) => {
    setParams({ seccion: key });
    setMensajeError(null);
  };

  const volverAlHub = () => {
    setParams({});
    setMensajeError(null);
  };

  const guardarCambios = () => {
    setMensajeError(null);
    const res = inventarioStore.guardarConfig(draft);
    if (!res.ok) {
      setMensajeError(res.error);
      return;
    }
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const restablecerBorrador = () => {
    setDraft({ ...inventarioStore.config });
    setMensajeError(null);
  };

  // Cómo está configurada hoy cada sección: se lee del store, no del borrador.
  const cfg = inventarioStore.config;
  const ubicacionesActivas = inventarioStore.ubicacionesActivas.length;
  const estadoSeccion: Record<ClaveSeccion, string> = {
    almacenes: `Recibe en ${inventarioStore.nombreUbicacion(cfg.ubicacionRecepcionId)} · ${ubicacionesActivas} ${ubicacionesActivas === 1 ? "ubicación activa" : "ubicaciones activas"}`,
    reorden: `Reorden en ${cfg.puntoReordenPorDefecto} · máximo ${cfg.stockMaximoPorDefecto}`,
    catalogos: `${cfg.categorias.length} categorías · artículos nuevos en ${ETIQUETA_UNIDAD[cfg.unidadPorDefecto].toLowerCase()}`,
    costeo: cfg.metodoValoracion === "fifo" ? "Usa PEPS/FIFO" : "Usa promedio ponderado",
    conteos: cfg.conteoCiego ? "Conteo a ciegas activado" : "Conteo a ciegas apagado",
    ordenes: `Numeración ${cfg.prefijoOrdenCompra}-0001`,
  };

  const tarjetasHub: TarjetaHub[] = ORDEN_SECCIONES.map((k) => ({
    key: k,
    label: META_SECCIONES[k].label,
    hint: META_SECCIONES[k].hint,
    icono: META_SECCIONES[k].icono,
    badge: META_SECCIONES[k].badge,
    ajustes: AJUSTES_SECCION[k],
    estado: estadoSeccion[k],
    palabrasClave: META_SECCIONES[k].palabrasClave,
  }));

  if (!seccion) {
    return (
      <>
        <PageMeta
          title="Configuración · Inventario"
          description="Ajustes y parámetros operativos del módulo de inventarios"
        />
        <ConfigHubPagina
          titulo="Configuración de Inventario"
          descripcion="Elige una sección para ajustar dónde se guarda la mercancía, cuándo reponer, cómo se cuenta y cómo se compra."
          tarjetas={tarjetasHub}
          onEntrar={(k) => entrarASeccion(k as ClaveSeccion)}
        />
      </>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VISTA DE DETALLE DE CADA SECCIÓN SELECCIONADA
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="pb-16 space-y-6 font-sans">
      <PageMeta
        title={`Configuración · ${META_SECCIONES[seccion]?.label ?? "Inventario"}`}
        description="Ajuste de parámetros del módulo de inventario"
      />

      <ConfigShell
        seccionKey={seccion}
        titulo={META_SECCIONES[seccion]?.label ?? "Configuración"}
        hint={META_SECCIONES[seccion]?.hint ?? ""}
        volver={<VolverAlHub onVolver={volverAlHub} etiqueta="Volver a Configuración" />}
        footer={
          <ConfigAcciones>
            <Button size="sm" variant="outline" onClick={restablecerBorrador}>
              Descartar cambios
            </Button>
            <Button size="sm" className="bg-[#FF3F1A] hover:bg-[#e03412] text-white font-bold" onClick={guardarCambios}>
              Guardar cambios
            </Button>
          </ConfigAcciones>
        }
      >
        {/* Banner de mensajes de estado */}
        {guardado && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-[14px] font-bold animate-fadeIn">
            <CheckLineIcon className="w-5 h-5" />
            Cambios guardados correctamente en la configuración de Inventario.
          </div>
        )}

        {mensajeError && (
          <div className="p-4 rounded-xl bg-error-50 border border-error-200 text-error-800 dark:bg-error-950/40 dark:border-error-800 dark:text-error-300 flex items-center gap-2 text-[14px] font-bold animate-fadeIn">
            <AlertHexaIcon className="w-5 h-5 text-error-600" />
            {mensajeError}
          </div>
        )}

        {/* ── SECCIÓN 1: ALMACENES Y UBICACIONES ────────────────────────── */}
        {seccion === "almacenes" && (
          <div className="space-y-6">
            <BloqueConfig
              icono={BuildingOffice2Icon}
              pregunta="¿Dónde se recibe la mercancía de las órdenes de compra?"
              descripcion="Ubicación predeterminada a la que ingresan los artículos cuando se confirma una recepción."
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] font-bold text-[#190088] dark:text-white mb-1.5">
                    Almacén de recepción por defecto
                  </label>
                  <select
                    value={draft.ubicacionRecepcionId}
                    onChange={(e) => setDraft((p) => ({ ...p, ubicacionRecepcionId: e.target.value }))}
                    className="w-full max-w-md px-3.5 py-2.5 rounded-xl border border-[#ECECEC] dark:border-gray-800 bg-white dark:bg-gray-900 text-[#212121] dark:text-white text-[14px] font-normal"
                  >
                    {inventarioStore.ubicaciones.map((u) => (
                      <option key={u.id} value={u.id} disabled={!u.activa}>
                        {u.nombre} {!u.activa ? "(Inactiva)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </BloqueConfig>

            <BloqueConfig
              icono={BuildingOffice2Icon}
              pregunta="Gestión de almacenes y depósitos físicos"
              descripcion="Bodegas, sucursales y estanterías habilitadas en tu operación."
            >
              <div className="space-y-4">
                {/* Lista de ubicaciones */}
                <div className="divide-y divide-[#ECECEC] dark:divide-gray-800">
                  {inventarioStore.ubicaciones.map((u) => (
                    <div key={u.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[14px] font-bold text-gray-900 dark:text-white">
                          {u.nombre}
                        </p>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 capitalize">
                          Tipo: {u.tipo} {u.id === draft.ubicacionRecepcionId ? "· (Recepción activa)" : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[12px] font-bold ${u.activa ? "text-emerald-600" : "text-gray-400"}`}>
                          {u.activa ? "Activa" : "Inactiva"}
                        </span>
                        <Switch
                          checked={u.activa}
                          color="orange"
                          onChange={() => {
                            const res = inventarioStore.alternarUbicacionActiva(u.id);
                            if (!res.ok) setMensajeError(res.error);
                          }}
                          aria-label={`Alternar estado de ${u.nombre}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulario para agregar nueva ubicación */}
                <div className="pt-4 border-t border-[#ECECEC] dark:border-gray-800 flex flex-col sm:flex-row gap-3 items-end">
                  <div className="w-full sm:flex-1">
                    <label className="block text-[12px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Nombre de la nueva ubicación
                    </label>
                    <Input
                      value={nuevoAlmacenNombre}
                      onChange={(e) => setNuevoAlmacenNombre(e.target.value)}
                      placeholder="p. ej. Estantería B-3, Pasillo 4..."
                    />
                  </div>
                  <div className="w-full sm:w-44">
                    <label className="block text-[12px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Tipo
                    </label>
                    <select
                      value={nuevoAlmacenTipo}
                      onChange={(e) => setNuevoAlmacenTipo(e.target.value as TipoUbicacion)}
                      className="w-full px-3 py-2 rounded-xl border border-[#ECECEC] dark:border-gray-800 bg-white dark:bg-gray-900 text-[14px]"
                    >
                      <option value="bodega">Bodega</option>
                      <option value="almacen">Almacén</option>
                      <option value="estante">Estante</option>
                      <option value="oficina">Oficina</option>
                      <option value="muelle">Muelle</option>
                    </select>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#97D6DF] text-[#12141a] hover:bg-[#85c9d3] font-bold shrink-0 cursor-pointer"
                    onClick={() => {
                      if (!nuevoAlmacenNombre.trim()) return;
                      const res = inventarioStore.agregarUbicacion({
                        nombre: nuevoAlmacenNombre,
                        tipo: nuevoAlmacenTipo,
                      });
                      if (res.ok) setNuevoAlmacenNombre("");
                      else setMensajeError(res.error);
                    }}
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Añadir almacén
                  </Button>
                </div>
              </div>
            </BloqueConfig>
          </div>
        )}

        {/* ── SECCIÓN 2: PUNTOS DE REORDEN Y ALERTAS ────────────────────── */}
        {seccion === "reorden" && (
          <div className="space-y-6">
            <BloqueConfig
              icono={AlertHexaIcon}
              pregunta="Umbrales por defecto para nuevos artículos"
              descripcion="Valores sugeridos al crear un artículo en el catálogo."
            >
              <div className="space-y-4">
                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Punto de reorden estándar
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Dispara la alerta cuando el inventario baja de este número.
                    </p>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="0"
                      value={String(draft.puntoReordenPorDefecto)}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, puntoReordenPorDefecto: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                      }
                    />
                  </div>
                </div>

                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Stock máximo objetivo
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Tope ideal de existencias para no sobre-stockear el almacén.
                    </p>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="1"
                      value={String(draft.stockMaximoPorDefecto)}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, stockMaximoPorDefecto: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                    />
                  </div>
                </div>

                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Días de cobertura requeridos
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Horizonte de consumo que debe cubrir una reposición automática.
                    </p>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="1"
                      value={String(draft.diasCobertura)}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, diasCobertura: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                    />
                  </div>
                </div>
              </div>
            </BloqueConfig>

            <BloqueConfig
              icono={AlertHexaIcon}
              pregunta="Alertas y Notificaciones de Desabastecimiento"
              descripcion="Configura qué avisos enviar y a través de qué canales."
            >
              <div className="space-y-4">
                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Alerta visual en pantalla por stock bajo
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Muestra badges en el panel de control y banner preventivo.
                    </p>
                  </div>
                  <Switch
                    checked={draft.alertaStockBajo}
                    color="orange"
                    onChange={(v) => setDraft((p) => ({ ...p, alertaStockBajo: v }))}
                  />
                </div>

                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Notificaciones instantáneas vía WhatsApp
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Envía un mensaje al encargado de compras al entrar en stock crítico.
                    </p>
                  </div>
                  <Switch
                    checked={draft.alertaWhatsapp}
                    color="orange"
                    onChange={(v) => setDraft((p) => ({ ...p, alertaWhatsapp: v }))}
                  />
                </div>

                {draft.alertaWhatsapp && (
                  <div className="pt-2">
                    <label className="block text-[12px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Teléfono WhatsApp con indicativo de país
                    </label>
                    <Input
                      placeholder="+57 300 123 4567"
                      value={draft.whatsappDestino}
                      onChange={(e) => setDraft((p) => ({ ...p, whatsappDestino: e.target.value }))}
                      className="max-w-md"
                    />
                  </div>
                )}

                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Resumen diario de existencias
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Consolida los quiebres de inventario a primera hora.
                    </p>
                  </div>
                  <Switch
                    checked={draft.resumenDiario}
                    color="orange"
                    onChange={(v) => setDraft((p) => ({ ...p, resumenDiario: v }))}
                  />
                </div>

                {draft.resumenDiario && (
                  <div className="pt-2">
                    <label className="block text-[12px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Hora de envío del resumen
                    </label>
                    <Input
                      type="time"
                      value={draft.horaResumen}
                      onChange={(e) => setDraft((p) => ({ ...p, horaResumen: e.target.value }))}
                      className="max-w-xs"
                    />
                  </div>
                )}
              </div>
            </BloqueConfig>
          </div>
        )}

        {/* ── SECCIÓN 3: CATEGORÍAS Y MEDIDAS ───────────────────────────── */}
        {seccion === "catalogos" && (
          <div className="space-y-6">
            <BloqueConfig
              icono={GridIcon}
              pregunta="Unidad de medida predeterminada"
              descripcion="Unidad asignada automáticamente a los nuevos artículos del catálogo."
            >
              <div className="max-w-md">
                <select
                  value={draft.unidadPorDefecto}
                  onChange={(e) => setDraft((p) => ({ ...p, unidadPorDefecto: e.target.value as UnidadMedida }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ECECEC] dark:border-gray-800 bg-white dark:bg-gray-900 text-[#212121] dark:text-white text-[14px]"
                >
                  {UNIDADES_MEDIDA.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </BloqueConfig>

            <BloqueConfig
              icono={GridIcon}
              pregunta="Familias y categorías de artículos"
              descripcion="Organiza tus productos por grupos para filtrado y reportes consolidados."
            >
              <div className="space-y-4">
                <div className="divide-y divide-[#ECECEC] dark:divide-gray-800">
                  {inventarioStore.config.categorias.map((cat) => (
                    <div key={cat} className="py-3 flex items-center justify-between gap-4">
                      {editandoCat?.actual === cat ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editandoCat.nuevo}
                            onChange={(e) => setEditandoCat({ actual: cat, nuevo: e.target.value })}
                            className="max-w-xs"
                          />
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-white cursor-pointer"
                            onClick={() => {
                              const res = inventarioStore.renombrarCategoria(cat, editandoCat.nuevo);
                              if (res.ok) setEditandoCat(null);
                              else setMensajeError(res.error);
                            }}
                          >
                            <CheckLineIcon className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditandoCat(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-[14px] font-bold text-gray-800 dark:text-gray-200">
                            {cat}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditandoCat({ actual: cat, nuevo: cat })}
                              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                              title="Renombrar categoría"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const res = inventarioStore.eliminarCategoria(cat);
                                if (!res.ok) setMensajeError(res.error);
                              }}
                              className="p-1.5 text-gray-400 hover:text-error-600 cursor-pointer"
                              title="Eliminar categoría"
                            >
                              <TrashBinIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#ECECEC] dark:border-gray-800 flex gap-2">
                  <Input
                    placeholder="Nueva categoría..."
                    value={nuevaCat}
                    onChange={(e) => setNuevaCat(e.target.value)}
                    className="max-w-md"
                  />
                  <Button
                    size="sm"
                    className="bg-[#97D6DF] text-[#12141a] hover:bg-[#85c9d3] font-bold cursor-pointer"
                    onClick={() => {
                      if (!nuevaCat.trim()) return;
                      const res = inventarioStore.agregarCategoria(nuevaCat);
                      if (res.ok) setNuevaCat("");
                      else setMensajeError(res.error);
                    }}
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Agregar
                  </Button>
                </div>
              </div>
            </BloqueConfig>
          </div>
        )}

        {/* ── SECCIÓN 4: VALORACIÓN Y COSTEO ────────────────────────────── */}
        {seccion === "costeo" && (
          <div className="space-y-6">
            <BloqueConfig
              icono={DollarLineIcon}
              pregunta="Método de valoración contable del stock"
              descripcion="Determina cómo se calcula el costo unitario de los productos al salir del almacén."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setDraft((p) => ({ ...p, metodoValoracion: "promedio" as MetodoValoracion }))}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    draft.metodoValoracion === "promedio"
                      ? "border-[#FF3F1A] bg-[#FF3F1A]/5 shadow-sm"
                      : "border-[#ECECEC] dark:border-gray-800 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[16px] text-[#190088] dark:text-white">
                      Costo Promedio Ponderado
                    </span>
                    {draft.metodoValoracion === "promedio" && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF3F1A]" />
                    )}
                  </div>
                  <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
                    Recalcula el costo por unidad cada vez que entra mercancía nueva a un costo diferente. Es el método más estable y común.
                  </p>
                </div>

                <div
                  onClick={() => setDraft((p) => ({ ...p, metodoValoracion: "fifo" as MetodoValoracion }))}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    draft.metodoValoracion === "fifo"
                      ? "border-[#FF3F1A] bg-[#FF3F1A]/5 shadow-sm"
                      : "border-[#ECECEC] dark:border-gray-800 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[16px] text-[#190088] dark:text-white">
                      PEPS / FIFO (Primero en Entrar)
                    </span>
                    {draft.metodoValoracion === "fifo" && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF3F1A]" />
                    )}
                  </div>
                  <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
                    Asume que las primeras unidades que entraron son las primeras en salir. Ideal para productos perecederos o con vencimiento.
                  </p>
                </div>
              </div>
            </BloqueConfig>
          </div>
        )}

        {/* ── SECCIÓN 5: CONTEOS Y AJUSTES ──────────────────────────────── */}
        {seccion === "conteos" && (
          <div className="space-y-6">
            <BloqueConfig
              icono={ShieldCheckIcon}
              pregunta="Políticas de conteos físicos y auditorías"
              descripcion="Control de discrepancias entre el inventario del sistema y la existencia física."
            >
              <div className="space-y-4">
                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Conteo a ciegas (Conteo Ciego)
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Oculta las existencias teóricas al operador para evitar sesgos o copias durante la auditoría.
                    </p>
                  </div>
                  <Switch
                    checked={draft.conteoCiego}
                    color="orange"
                    onChange={(v) => setDraft((p) => ({ ...p, conteoCiego: v }))}
                  />
                </div>

                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Revisión obligatoria ante discrepancias
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Exige que un supervisor apruebe el conteo antes de aplicar ajustes en existencias.
                    </p>
                  </div>
                  <Switch
                    checked={draft.requiereRevisionConteos}
                    color="orange"
                    onChange={(v) => setDraft((p) => ({ ...p, requiereRevisionConteos: v }))}
                  />
                </div>

                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Umbral de diferencia para alerta (%)
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Porcentaje de desviación respecto a lo esperado que marca la línea en rojo.
                    </p>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={String(draft.umbralDiferenciaPct)}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, umbralDiferenciaPct: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) }))
                      }
                    />
                  </div>
                </div>

                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Documento de referencia obligatorio en salidas
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Exige registrar un número de remisión o factura para registrar bajas de stock.
                    </p>
                  </div>
                  <Switch
                    checked={draft.referenciaObligatoriaSalidas}
                    color="orange"
                    onChange={(v) => setDraft((p) => ({ ...p, referenciaObligatoriaSalidas: v }))}
                  />
                </div>
              </div>
            </BloqueConfig>
          </div>
        )}

        {/* ── SECCIÓN 6: ÓRDENES DE COMPRA Y PROVEEDORES ─────────────────── */}
        {seccion === "ordenes" && (
          <div className="space-y-6">
            <BloqueConfig
              icono={PlugInIcon}
              pregunta="Parámetros de órdenes de compra"
              descripcion="Numeración correlativa y reglas automáticas para reposiciones."
            >
              <div className="space-y-4">
                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Prefijo de órdenes de compra
                    </p>
                    <p className="text-[12px] text-gray-500">
                      De 1 a 5 letras mayúsculas (p. ej. OC para generar OC-0001).
                    </p>
                  </div>
                  <div className="w-32">
                    <Input
                      value={draft.prefijoOrdenCompra}
                      maxLength={5}
                      onChange={(e) => setDraft((p) => ({ ...p, prefijoOrdenCompra: e.target.value.toUpperCase() }))}
                    />
                  </div>
                </div>

                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Descontar mercancía en tránsito
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Resta las órdenes de compra ya emitidas al calcular la cantidad a reordenar.
                    </p>
                  </div>
                  <Switch
                    checked={draft.descontarEnTransito}
                    color="orange"
                    onChange={(v) => setDraft((p) => ({ ...p, descontarEnTransito: v }))}
                  />
                </div>

                <div className={claseFila}>
                  <div>
                    <p className="text-[14px] font-bold text-[#190088] dark:text-white">
                      Múltiplo de pedido por defecto
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Redondea las sugerencias de compra a este múltiplo (1 = sin redondeo).
                    </p>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="1"
                      value={String(draft.multiploPedido)}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, multiploPedido: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-bold text-[#190088] dark:text-white mb-1.5">
                    Términos o notas por defecto en cada orden
                  </label>
                  <textarea
                    rows={3}
                    value={draft.notasOrdenPorDefecto}
                    onChange={(e) => setDraft((p) => ({ ...p, notasOrdenPorDefecto: e.target.value }))}
                    placeholder="Condiciones comerciales, horarios de recepción en muelle, instrucciones de facturación..."
                    className="w-full p-3 rounded-xl border border-[#ECECEC] dark:border-gray-800 bg-white dark:bg-gray-900 text-[#212121] dark:text-white text-[14px]"
                  />
                </div>
              </div>
            </BloqueConfig>
          </div>
        )}
      </ConfigShell>
    </div>
  );
});

export default InventarioConfigPage;
