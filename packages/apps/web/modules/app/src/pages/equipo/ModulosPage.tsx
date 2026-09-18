import { observer } from "mobx-react-lite";
import { Link } from "react-router";
import { PageMeta } from "@/shell/meta";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Switch } from "@/elements/form/switch";
import {
  plataformaStore,
  type ItemPlataforma,
  type IdPlataforma,
} from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// ICONOS SVG LIMPIOS (Cero dependencias externas / cero emojis)
// ═══════════════════════════════════════════════════════════════════════════

const OrdersIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const InventoryIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const ChatChannelsIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const IntelligenceIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const InfoCheckIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

function IconoParaModulo({ id, className }: { id: IdPlataforma; className?: string }) {
  switch (id) {
    case "pedidos":
      return <OrdersIcon className={className} />;
    case "inventario":
      return <InventoryIcon className={className} />;
    case "conversaciones":
      return <ChatChannelsIcon className={className} />;
    case "asistente":
      return <IntelligenceIcon className={className} />;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA DE MÓDULO O PLUGIN
// ═══════════════════════════════════════════════════════════════════════════

interface ModuloCardProps {
  item: ItemPlataforma;
  activo: boolean;
  onToggle: () => void;
}

const ModuloCard = observer(({ item, activo, onToggle }: ModuloCardProps) => {
  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
        activo
          ? "border-brand-300 bg-white shadow-sm dark:border-brand-500/30 dark:bg-gray-900"
          : "border-gray-200 bg-gray-50/70 opacity-80 dark:border-gray-800 dark:bg-gray-900/40"
      }`}
    >
      <div>
        {/* Cabecera de la tarjeta: Icono + Badges + Switch */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activo
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                  : "bg-gray-200/80 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              <IconoParaModulo id={item.id} className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {item.nombre}
              </h3>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge
                  color={item.categoria === "negocio" ? "primary" : "info"}
                  size="sm"
                >
                  {item.categoria === "negocio" ? "Negocio Core" : "Plugin / Add-on"}
                </Badge>
                <Badge color={activo ? "success" : "light"} size="sm">
                  {activo ? "Activo" : "Desactivado"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <Switch
              checked={activo}
              onChange={onToggle}
              label=""
            />
          </div>
        </div>

        {/* Descripción */}
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {item.descripcion}
        </p>

        {/* Detalle ampliado */}
        <div className="mt-3 rounded-lg bg-gray-100/70 p-2.5 text-xs text-gray-500 dark:bg-white/[0.03] dark:text-gray-400">
          {item.detalle}
        </div>
      </div>

      {/* Enlaces de acceso rápido si está activo */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <span className="text-xs text-gray-400">
          Identificador: <code className="font-mono">{item.id}</code>
        </span>

        {activo && item.rutaConfig && (
          <Link
            to={item.rutaConfig}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400"
          >
            Configuración →
          </Link>
        )}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const ModulosPage = observer(() => {
  const modulosNegocio = plataformaStore.modulosNegocio;
  const plugins = plataformaStore.plugins;
  const cantidadActivos = plataformaStore.cantidadActivos;
  const total = plataformaStore.items.length;

  return (
    <>
      <PageMeta
        title="Módulos y Plugins · Organización"
        description="Gestión de módulos de negocio y extensiones activas en la plataforma"
      />

      {/* Encabezado */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Módulos e Integraciones
            </h1>
            <Badge color="primary" size="sm">
              {cantidadActivos} de {total} activos
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Habilita o apaga módulos de negocio y plugins según las necesidades de tu operación.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/equipo">
            <Button size="sm" variant="outline">
              ← Volver a Equipo
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => plataformaStore.reiniciar()}
          >
            Restablecer valores
          </Button>
        </div>
      </div>

      {/* Banner Informativo */}
      <div className="mb-8 flex items-start gap-3 rounded-xl border border-brand-200/80 bg-brand-50/60 p-4 text-sm text-brand-900 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200">
        <InfoCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
        <div>
          <span className="font-semibold">Control en tiempo real:</span> Si desactivas un módulo o plugin,
          desaparecerá inmediatamente del menú lateral y sus rutas quedarán bloqueadas para todos los operadores de la
          organización. Necto IA desconecta de forma automática las herramientas de cualquier módulo apagado.
        </div>
      </div>

      {/* ── 1. Módulos de Negocio (Core Verticals) ─────────────────────────── */}
      <section className="mb-8">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Módulos de Negocio (Core)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Dominios operativos principales para gestionar ventas, stock y producción.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {modulosNegocio.map((mod) => (
            <ModuloCard
              key={mod.id}
              item={mod}
              activo={plataformaStore.estaActivo(mod.id)}
              onToggle={() => plataformaStore.toggle(mod.id)}
            />
          ))}
        </div>
      </section>

      {/* ── 2. Plugins y Add-ons (Cross-cutting Capabilities) ─────────────── */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Plugins y Canales (Add-ons)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Capacidades transversales para potenciar la comunicación y el análisis inteligente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {plugins.map((plugin) => (
            <ModuloCard
              key={plugin.id}
              item={plugin}
              activo={plataformaStore.estaActivo(plugin.id)}
              onToggle={() => plataformaStore.toggle(plugin.id)}
            />
          ))}
        </div>
      </section>
    </>
  );
});
