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
  BoxCubeIcon,
  GridIcon,
  PlugInIcon,
  TimeIcon,
  AlertHexaIcon,
  CheckLineIcon,
} from "@/icons";
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
    icono: AlertHexaIcon,
  },
  general: {
    label: "Moneda y Unidades de Medida",
    hint: "Moneda de valorización y unidades permitidas para productos.",
    icono: BoxCubeIcon,
  },
  codigos: {
    label: "Nomenclatura y Prefijos",
    hint: "Prefijos automáticos para SKU de productos y órdenes de compra.",
    icono: PlugInIcon,
  },
  categorias: {
    label: "Categorías de Productos",
    hint: "Catálogo de familias para clasificación comercial.",
    icono: GridIcon,
  },
  ajustes: {
    label: "Motivos de Ajuste y Merma",
    hint: "Razones predeterminadas para corregir existencias en bodega.",
    icono: TimeIcon,
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
function SeccionAlertas({ disabled }: { disabled: boolean }) {
  const [umbralDefecto, setUmbralDefecto] = useState("5");
  const [notificarEmail, setNotificarEmail] = useState(true);

  return (
    <div className="space-y-6">
      <div className={claseFila}>
        <div className="sm:max-w-md">
          <Label2
            titulo="Umbral de Stock Bajo por Defecto"
            descripcion="Cantidad mínima en mano que dispara la alerta 'Queda poco' cuando el producto no especifica una."
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
            descripcion="Notificar por correo cuando un producto venza en los próximos 15 días."
          />
        </div>
        <div>
          <input
            type="checkbox"
            checked={notificarEmail}
            onChange={(e) => setNotificarEmail(e.target.checked)}
            disabled={disabled}
            className="rounded text-brand-500 focus:ring-brand-500 h-5 w-5"
          />
        </div>
      </div>
    </div>
  );
}

// ── 2. Moneda y Unidades ──────────────────────────────────────────────────
function SeccionGeneral({ disabled }: { disabled: boolean }) {
  const [moneda, setMoneda] = useState("COP");

  return (
    <div className="space-y-6">
      <div className={claseFila}>
        <div className="sm:max-w-md">
          <Label2
            titulo="Moneda Principal"
            descripcion="Moneda utilizada para valorizar compras y existencias en almacén."
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[
              { value: "COP", label: "Pesos Colombianos (COP $)" },
              { value: "USD", label: "Dólares Americanos (USD $)" },
              { value: "MXN", label: "Pesos Mexicanos (MXN $)" },
            ]}
            defaultValue={moneda}
            onChange={(v) => setMoneda(v)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

// ── 3. Nomenclatura y Códigos ─────────────────────────────────────────────
function SeccionCodigos({ disabled }: { disabled: boolean }) {
  const [prefijoProd, setPrefijoProd] = useState("PRD-");
  const [prefijoOrd, setPrefijoOrd] = useState("ORD-");

  return (
    <div className="space-y-6">
      <div className={claseFila}>
        <div className="sm:max-w-md">
          <Label2
            titulo="Prefijo SKU para Productos"
            descripcion="Identificador inicial para autogenerar códigos de productos."
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
            descripcion="Identificador correlativo para órdenes a proveedores."
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
    </div>
  );
}

// ── 4. Categorías Maestras ────────────────────────────────────────────────
function SeccionCategorias({ disabled }: { disabled: boolean }) {
  const categorias = productosStore.categorias;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Categorías registradas actualmente en el catálogo de productos:
      </p>
      <div className="flex flex-wrap gap-2">
        {categorias.map((cat) => (
          <Badge key={cat} variant="light" color="primary">
            {cat}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ── 5. Reglas de Ajuste y Merma ───────────────────────────────────────────
function SeccionAjustes({ disabled }: { disabled: boolean }) {
  const motivos = [
    "Conteo / Auditoría física",
    "Merma / Daño de producto",
    "Caducidad / Vencimiento",
    "Ingreso manual / Donación",
    "Traslado entre sedes",
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Motivos habilitados para justificar ajustes manuales de existencias:
      </p>
      <ul className="divide-y divide-gray-100 dark:divide-white/5 border rounded-xl overflow-hidden">
        {motivos.map((m) => (
          <li key={m} className="p-3 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
