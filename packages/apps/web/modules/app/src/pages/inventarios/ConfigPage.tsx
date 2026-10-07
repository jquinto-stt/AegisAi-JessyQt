import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import {
  ConfigHeader,
  ConfigHub,
  ConfigShell,
  Label2,
  claseFila,
  VolverAlHub,
  type TarjetaHub,
} from "@/pages/config-layout";
import {
  BellAlertIcon,
  CurrencyDollarIcon,
  QrCodeIcon,
  TagIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { puedeConfigurarInventarios, puedeVerInventarios } from "@/stores";
import { productosStore } from "@/stores/productos.store";

export type SeccionConfig = "alertas" | "general" | "codigos" | "categorias" | "ajustes";

export const ORDEN_SECCIONES: SeccionConfig[] = [
  "alertas",
  "general",
  "codigos",
  "categorias",
  "ajustes",
];

export const META_SECCION: Record<
  SeccionConfig,
  { label: string; hint: string; icono: any }
> = {
  alertas: {
    label: "Alertas y Umbrales Globales",
    hint: "Umbral mínimo por defecto y notificaciones automáticas.",
    icono: BellAlertIcon,
  },
  general: {
    label: "Moneda y Unidades de Medida",
    hint: "Moneda de valorización y unidades permitidas para productos.",
    icono: CurrencyDollarIcon,
  },
  codigos: {
    label: "Nomenclatura y Prefijos",
    hint: "Prefijos automáticos para SKU de productos y órdenes de compra.",
    icono: QrCodeIcon,
  },
  categorias: {
    label: "Categorías de Productos",
    hint: "Catálogo de familias para clasificación comercial.",
    icono: TagIcon,
  },
  ajustes: {
    label: "Motivos de Ajuste y Merma",
    hint: "Razones predeterminadas para corregir existencias en bodega.",
    icono: ArrowsRightLeftIcon,
  },
};

const esClaveSeccion = (v: string | null): v is SeccionConfig =>
  v !== null && (ORDEN_SECCIONES as string[]).includes(v);

export const InventariosConfigPage = observer(function InventariosConfigPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const seccionParam = searchParams.get("seccion");
  const seccion: SeccionConfig | null = esClaveSeccion(seccionParam) ? seccionParam : null;

  const puedeConfigurar = puedeConfigurarInventarios();

  if (!puedeVerInventarios()) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">No tienes permisos para ver la configuración.</p>
      </div>
    );
  }

  const entrarASeccion = (k: string) => setSearchParams({ seccion: k });
  const volverAlHub = () => setSearchParams({});

  const tarjetasHub: TarjetaHub[] = ORDEN_SECCIONES.map((k) => ({
    key: k,
    label: META_SECCION[k].label,
    hint: META_SECCION[k].hint,
    icono: META_SECCION[k].icono,
  }));

  if (!seccion) {
    return (
      <div className="pb-12">
        <PageMeta
          title="Configuración · Inventario"
          description="Parámetros operativos del inventario"
        />

        <div className="mb-7">
          <ConfigHeader
            titulo="Configuración de Inventario"
            descripcion="Parametriza las reglas de abastecimiento, unidades y umbrales de alerta."
            acciones={
              <Button variant="outline" size="sm" onClick={() => navigate("/inventarios/productos")}>
                Volver a Productos
              </Button>
            }
          />
        </div>

        <ConfigHub tarjetas={tarjetasHub} onEntrar={entrarASeccion} />
      </div>
    );
  }

  const meta = META_SECCION[seccion];

  return (
    <div className="pb-12">
      <PageMeta
        title="Configuración · Inventario"
        description="Parámetros operativos del inventario"
      />

      <div className="mb-5">
        <ConfigHeader
          titulo="Configuración de Inventario"
          descripcion="Preferencias y parámetros para el catálogo y almacén."
          acciones={
            <Badge color={puedeConfigurar ? "success" : "light"} size="sm">
              {puedeConfigurar ? "Edición habilitada" : "Solo lectura"}
            </Badge>
          }
        />
      </div>

      <div className="mb-4">
        <VolverAlHub onVolver={volverAlHub} etiqueta="Volver a Configuración" />
      </div>

      <ConfigShell seccionKey={seccion} titulo={meta.label} hint={meta.hint}>
        {seccion === "alertas" && <SeccionAlertas disabled={!puedeConfigurar} />}
        {seccion === "general" && <SeccionGeneral disabled={!puedeConfigurar} />}
        {seccion === "codigos" && <SeccionCodigos disabled={!puedeConfigurar} />}
        {seccion === "categorias" && <SeccionCategorias disabled={!puedeConfigurar} />}
        {seccion === "ajustes" && <SeccionAjustes disabled={!puedeConfigurar} />}
      </ConfigShell>
    </div>
  );
});

// ── 1. Alertas y Umbrales ─────────────────────────────────────────────────
const SeccionAlertas = observer(function SeccionAlertas({ disabled }: { disabled: boolean }) {
  const config = productosStore.configuracion;
  const [umbralDefecto, setUmbralDefecto] = useState(config.umbralMinimoDefecto.toString());
  const [notificarEmail, setNotificarEmail] = useState(config.notificarVencimientoEmail);
  const [guardado, setGuardado] = useState(false);

  const guardar = () => {
    const val = parseInt(umbralDefecto, 10);
    productosStore.actualizarConfiguracion({
      umbralMinimoDefecto: isNaN(val) ? 5 : val,
      notificarVencimientoEmail: notificarEmail,
    });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  return (
    <div className="space-y-6">
      {guardado && (
        <div className="p-3 text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <CheckCircleIcon className="size-4 text-emerald-600" />
          <span>Preferencias de alertas guardadas y aplicadas.</span>
        </div>
      )}

      <div className={claseFila}>
        <div className="sm:max-w-md">
          <Label2
            titulo="Umbral de Stock Bajo por Defecto"
            descripcion="Cantidad mínima en mano que dispara la alerta 'Queda poco' cuando el producto no especifica una propia."
          />
        </div>
        <div className="w-full sm:w-48">
          <Input
            type="number"
            min="0"
            value={umbralDefecto}
            onChange={(e) => setUmbralDefecto(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className={claseFila}>
        <div className="sm:max-w-md">
          <Label2
            titulo="Alertas de Vencimiento Próximo"
            descripcion="Activar monitoreo y notificaciones cuando un lote venza en los próximos 15 días."
          />
        </div>
        <div>
          <input
            type="checkbox"
            checked={notificarEmail}
            onChange={(e) => setNotificarEmail(e.target.checked)}
            disabled={disabled}
            className="rounded text-brand-500 focus:ring-brand-500 h-5 w-5 cursor-pointer"
          />
        </div>
      </div>

      {!disabled && (
        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-white/5">
          <Button size="sm" onClick={guardar} className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer">
            Guardar Cambios
          </Button>
        </div>
      )}
    </div>
  );
});

// ── 2. Moneda y Unidades ──────────────────────────────────────────────────
const SeccionGeneral = observer(function SeccionGeneral({ disabled }: { disabled: boolean }) {
  const config = productosStore.configuracion;
  const [moneda, setMoneda] = useState(config.moneda);
  const [guardado, setGuardado] = useState(false);

  const guardar = () => {
    productosStore.actualizarConfiguracion({ moneda });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  return (
    <div className="space-y-6">
      {guardado && (
        <div className="p-3 text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <CheckCircleIcon className="size-4 text-emerald-600" />
          <span>Moneda principal actualizada.</span>
        </div>
      )}

      <div className={claseFila}>
        <div className="sm:max-w-md">
          <Label2
            titulo="Moneda Principal de Operación"
            descripcion="Moneda utilizada para valorizar compras, inventario en bodegas y reportes de margen."
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[
              { value: "COP", label: "Pesos Colombianos (COP $)" },
              { value: "USD", label: "Dólares Americanos (USD $)" },
              { value: "EUR", label: "Euros (EUR €)" },
              { value: "MXN", label: "Pesos Mexicanos (MXN $)" },
            ]}
            defaultValue={moneda}
            onChange={(v) => setMoneda(v)}
            disabled={disabled}
          />
        </div>
      </div>

      {!disabled && (
        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-white/5">
          <Button size="sm" onClick={guardar} className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer">
            Guardar Cambios
          </Button>
        </div>
      )}
    </div>
  );
});

// ── 3. Nomenclatura y Códigos ─────────────────────────────────────────────
const SeccionCodigos = observer(function SeccionCodigos({ disabled }: { disabled: boolean }) {
  const config = productosStore.configuracion;
  const [prefijoProd, setPrefijoProd] = useState(config.prefijoSku);
  const [prefijoOrd, setPrefijoOrd] = useState(config.prefijoOrden);
  const [guardado, setGuardado] = useState(false);

  const guardar = () => {
    productosStore.actualizarConfiguracion({
      prefijoSku: prefijoProd.trim() || "PRD",
      prefijoOrden: prefijoOrd.trim() || "ORD",
    });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  return (
    <div className="space-y-6">
      {guardado && (
        <div className="p-3 text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <CheckCircleIcon className="size-4 text-emerald-600" />
          <span>Prefijos de nomenclatura guardados.</span>
        </div>
      )}

      <div className={claseFila}>
        <div className="sm:max-w-md">
          <Label2
            titulo="Prefijo SKU para Productos"
            descripcion="Identificador correlativo inicial para la generación de códigos de catálogo."
          />
        </div>
        <div className="w-full sm:w-48">
          <Input
            value={prefijoProd}
            onChange={(e) => setPrefijoProd(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className={claseFila}>
        <div className="sm:max-w-md">
          <Label2
            titulo="Prefijo para Órdenes de Compra"
            descripcion="Nomenclatura inicial para las órdenes generadas a proveedores."
          />
        </div>
        <div className="w-full sm:w-48">
          <Input
            value={prefijoOrd}
            onChange={(e) => setPrefijoOrd(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {!disabled && (
        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-white/5">
          <Button size="sm" onClick={guardar} className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer">
            Guardar Cambios
          </Button>
        </div>
      )}
    </div>
  );
});

// ── 4. Categorías Maestras ────────────────────────────────────────────────
const SeccionCategorias = observer(function SeccionCategorias({ disabled }: { disabled: boolean }) {
  const [nuevaCat, setNuevaCat] = useState("");
  const categorias = productosStore.categorias;

  const agregarCategoria = (e: React.FormEvent) => {
    e.preventDefault();
    const limpia = nuevaCat.trim();
    if (!limpia) return;
    if (!productosStore.categorias.includes(limpia)) {
      productosStore.categorias = [...productosStore.categorias, limpia].sort((a, b) =>
        a.localeCompare(b, "es"),
      );
    }
    setNuevaCat("");
  };

  const eliminarCategoria = (cat: string) => {
    if (productosStore.categorias.length <= 1) return;
    productosStore.categorias = productosStore.categorias.filter((c) => c !== cat);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Categorías maestras disponibles para clasificar productos en catálogo, órdenes y filtros:
      </p>

      {!disabled && (
        <form onSubmit={agregarCategoria} className="flex gap-2 max-w-md">
          <Input
            placeholder="Añadir nueva categoría..."
            value={nuevaCat}
            onChange={(e) => setNuevaCat(e.target.value)}
          />
          <Button type="submit" size="sm" className="bg-brand-500 hover:bg-brand-600 text-white shrink-0 cursor-pointer">
            Añadir
          </Button>
        </form>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {categorias.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-200 dark:border-brand-500/20"
          >
            <span>{cat}</span>
            {!disabled && categorias.length > 1 && (
              <button
                type="button"
                onClick={() => eliminarCategoria(cat)}
                className="text-brand-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer ml-0.5"
                title={`Eliminar categoría ${cat}`}
              >
                <XMarkIcon className="size-3.5" />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
});

// ── 5. Reglas de Ajuste y Merma ───────────────────────────────────────────
function SeccionAjustes({ disabled }: { disabled: boolean }) {
  const motivos = [
    { label: "Conteo / Auditoría física", desc: "Corrección por arqueo o inventario ciego" },
    { label: "Merma / Daño de producto", desc: "Rotura de envase o producto no apto para venta" },
    { label: "Caducidad / Vencimiento", desc: "Retiro por cumplimiento de fecha límite de vida útil" },
    { label: "Ingreso manual / Donación", desc: "Entrada extraordinaria fuera de órdenes de compra" },
    { label: "Traslado entre sedes", desc: "Rebalanceo operativo entre sucursales y bodegas" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Catálogo de motivos estándar para justificar movimientos y ajustes de existencias en kárdex:
      </p>
      <ul className="divide-y divide-gray-100 dark:divide-white/5 border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
        {motivos.map((m) => (
          <li key={m.label} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{m.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
            </div>
            <Badge color="light" size="sm">Sistema</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
