import { useState, useMemo } from "react";
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
  ConfigShell,
  ConfigAcciones,
  VolverAlHub,
  claseFila,
} from "@/pages/config-layout";
import {
  inventarioStore,
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
    hint: "Umbrales mínimos de stock por SKU, avisos de desabastecimiento crítico y reglas de reposición preventiva.",
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
    hint: "Método de costeo de inventario (Promedio ponderado, PEPS/FIFO), márgenes sugeridos e impuestos aplicables.",
    icono: DollarLineIcon,
    palabrasClave: ["costo", "valoracion", "promedio", "fifo", "peps", "margen", "precio"],
  },
  conteos: {
    label: "Conteos y ajustes",
    hint: "Frecuencia de conteos cíclicos, motivos estándar de mermas, tolerancias de diferencias y auditorías.",
    icono: ShieldCheckIcon,
    palabrasClave: ["conteo", "ajuste", "merma", "ciego", "auditoria", "tolerancia", "diferencia"],
  },
  ordenes: {
    label: "Órdenes de compra y proveedores",
    hint: "Prefijo de numeración (OC), notas por defecto, múltiplos de pedido y condiciones con proveedores.",
    icono: PlugInIcon,
    palabrasClave: ["orden", "compra", "proveedor", "prefijo", "oc", "pedido", "abastecimiento"],
  },
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
  const [busqueda, setBusqueda] = useState("");

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

  // Filtrado de tarjetas para la búsqueda interactiva
  const tarjetasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return ORDEN_SECCIONES;
    return ORDEN_SECCIONES.filter((key) => {
      const meta = META_SECCIONES[key];
      const matchTitulo = meta.label.toLowerCase().includes(q);
      const matchDesc = meta.hint.toLowerCase().includes(q);
      const matchKeywords = meta.palabrasClave.some((kw) => kw.includes(q));
      return matchTitulo || matchDesc || matchKeywords;
    });
  }, [busqueda]);

  // ═════════════════════════════════════════════════════════════════════════
  // VISTA RAÍZ: CUADRÍCULA DE TARJETAS (HUB)
  // ═════════════════════════════════════════════════════════════════════════
  if (!seccion) {
    return (
      <div className="pb-12 space-y-8 font-sans">
        <PageMeta
          title="Configuración · Inventario"
          description="Ajustes y parámetros operativos del módulo de inventarios"
        />

        {/* ── Encabezado de la página con barra de búsqueda ─────────────── */}
        <section className="space-y-6" data-purpose="page-header">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="text-[24px] sm:text-[36px] font-bold text-[#190088] leading-tight dark:text-white">
                Configuración de Inventario
              </h1>
              <p className="text-[14px] sm:text-[16px] text-[#212121] dark:text-gray-400 max-w-2xl font-normal leading-relaxed">
                Gestiona el flujo operativo, almacenes físicos, puntos de reorden, unidades de medida y métodos de costeo.
              </p>
            </div>

            {/* Barra de búsqueda interactiva */}
            <div className="w-full md:w-80 relative shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <input
                id="inventorySearchInput"
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar ajuste o parámetro..."
                className="w-full pl-10 pr-9 py-2.5 text-[14px] font-normal bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-[#FF3F1A]/20 focus:border-[#FF3F1A] dark:focus:border-[#FF3F1A] text-[#212121] dark:text-white shadow-theme-xs transition placeholder-gray-400 dark:placeholder-gray-500"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  aria-label="Borrar búsqueda"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M6 18L18 6M6 6l12 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="h-px bg-[#ECECEC] dark:bg-gray-800" />
        </section>

        {/* ── Cuadrícula de 6 Tarjetas Estructuradas ─────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-purpose="modules-grid">
          {tarjetasFiltradas.length > 0 ? (
            tarjetasFiltradas.map((key) => {
              const meta = META_SECCIONES[key];
              const Icono = meta.icono;
              return (
                <article
                  key={key}
                  onClick={() => entrarASeccion(key)}
                  className="group relative bg-white dark:bg-gray-900 border-2 border-[#ECECEC] dark:border-gray-800 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] rounded-3xl p-6 sm:p-7 shadow-theme-xs hover:shadow-theme-md transition-all duration-200 flex flex-col justify-between cursor-pointer hover:-translate-y-1"
                >
                  <div>
                    {/* Header de la tarjeta */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-[#97D6DF]/20 border border-[#97D6DF]/30 flex items-center justify-center text-[#190088] group-hover:bg-[#FF3F1A] group-hover:text-white group-hover:border-[#FF3F1A] transition-all duration-200 dark:bg-[#97D6DF]/15 dark:text-[#97D6DF]">
                        <Icono className="w-7 h-7 stroke-[1.75]" />
                      </div>
                      {meta.badge && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold tracking-wide uppercase bg-[#97D6DF]/30 text-[#190088] border border-[#97D6DF]/50">
                          {meta.badge}
                        </span>
                      )}
                    </div>

                    {/* Título y descripción */}
                    <h3 className="text-[20px] sm:text-[24px] font-bold text-[#190088] dark:text-white mb-2 group-hover:text-[#FF3F1A] transition-colors leading-tight">
                      {meta.label}
                    </h3>
                    <p className="text-[14px] font-normal text-[#212121] dark:text-gray-400 leading-relaxed mb-6">
                      {meta.hint}
                    </p>
                  </div>

                  {/* Footer con llamada a la acción */}
                  <div className="pt-4 border-t border-[#ECECEC] dark:border-gray-800 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#FF3F1A] group-hover:text-[#e5351a] transition-colors">
                      <span>Configurar</span>
                      <svg
                        className="w-4 h-4 text-[#FF3F1A] group-hover:translate-x-1 transition-all"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-[#ECECEC] dark:border-gray-800">
              <p className="text-[14px] text-gray-500 dark:text-gray-400">
                No se encontraron ajustes con el término «{busqueda}».
              </p>
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="mt-3 text-[14px] font-bold text-[#FF3F1A] hover:underline cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}
        </section>
      </div>
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
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-sm font-semibold animate-fadeIn">
            <CheckLineIcon className="w-5 h-5" />
            Cambios guardados correctamente en la configuración de Inventario.
          </div>
        )}

        {mensajeError && (
          <div className="p-4 rounded-xl bg-error-50 border border-error-200 text-error-800 dark:bg-error-950/40 dark:border-error-800 dark:text-error-300 flex items-center gap-2 text-sm font-semibold animate-fadeIn">
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
