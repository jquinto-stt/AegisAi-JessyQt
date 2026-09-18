import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router";
import { PageMeta } from "@/shell/meta";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Switch } from "@/elements/form/switch";
import {
  plataformaStore,
  CATALOGO_MODULOS,
  DETALLE_CONECTORES,
  type IdModuloNegocio,
  type IdConector,
} from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// ICONOS SVG LIMPIOS (Cero emojis / estilo coherente)
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

const SparklesIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const CheckSmallIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SettingsIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE TARJETA CONECTOR
// ═══════════════════════════════════════════════════════════════════════════

interface ConectorCardProps {
  conectorId: IdConector;
  moduloId: IdModuloNegocio;
  moduloActivo: boolean;
}

const ConectorCard = observer(({ conectorId, moduloId, moduloActivo }: ConectorCardProps) => {
  const detalle = DETALLE_CONECTORES[moduloId][conectorId];
  const activo = plataformaStore.esConectorActivo(moduloId, conectorId);

  const icono = conectorId === "necto_ia" ? <SparklesIcon className="h-5 w-5" /> : <WhatsAppIcon className="h-5 w-5" />;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
        moduloActivo && activo
          ? "border-brand-300 bg-white shadow-xs dark:border-brand-500/30 dark:bg-gray-900"
          : "border-gray-200 bg-gray-50/60 opacity-85 dark:border-gray-800 dark:bg-gray-900/40"
      }`}
    >
      <div>
        {/* Cabecera del Conector */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                moduloActivo && activo
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                  : "bg-gray-200 text-gray-400 dark:bg-gray-800"
              }`}
            >
              {icono}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {detalle.nombre}
                </h4>
                <Badge
                  color={moduloActivo && activo ? "success" : "light"}
                  size="xs"
                >
                  {moduloActivo && activo ? "Conectado" : "Inactivo"}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {conectorId === "necto_ia" ? "Inteligencia Artificial" : "Canal de Comunicación"}
              </p>
            </div>
          </div>

          <Switch
            checked={moduloActivo && activo}
            disabled={!moduloActivo}
            onChange={() => plataformaStore.toggleConector(moduloId, conectorId)}
            label=""
          />
        </div>

        {/* Descripción funcional */}
        <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
          {detalle.descripcion}
        </p>

        {/* Capacidades que habilita */}
        <div className="mt-3.5 space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            Capacidades activas en {CATALOGO_MODULOS[moduloId].nombre}:
          </span>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
            {detalle.beneficios.map((beneficio, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <CheckSmallIcon
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    moduloActivo && activo ? "text-emerald-500" : "text-gray-400"
                  }`}
                />
                <span>{beneficio}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Pie con estado */}
      <div className="mt-4 pt-2 text-[11px] text-gray-400">
        {!moduloActivo
          ? "Requiere que el módulo esté activo."
          : activo
          ? "Visible en navegación y activo para el equipo."
          : "Apagado para este módulo de negocio."}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const ConfiguracionModulosPage = observer(() => {
  const [moduloSeleccionado, setModuloSeleccionado] = useState<IdModuloNegocio>("pedidos");
  const modulos = plataformaStore.catalogoModulos;
  const moduloInfo = CATALOGO_MODULOS[moduloSeleccionado];
  const esActivo = plataformaStore.esModuloActivo(moduloSeleccionado);

  return (
    <>
      <PageMeta
        title="Configuración de Módulos · Organización"
        description="Centro de control de módulos de negocio y conectores de IA y mensajería"
      />

      {/* Encabezado */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Centro de Módulos y Plugins
            </h1>
            <Badge color="primary" size="sm">
              Organización
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Administra los módulos de negocio de tu empresa y activa los conectores de Necto IA y WhatsApp para cada uno.
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

      {/* Selector de Módulo de Negocio (Tabs estilo Cards) */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {modulos.map((mod) => {
          const seleccionado = mod.id === moduloSeleccionado;
          const activo = plataformaStore.esModuloActivo(mod.id);
          const icon = mod.id === "pedidos" ? <OrdersIcon className="h-5 w-5" /> : <InventoryIcon className="h-5 w-5" />;

          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setModuloSeleccionado(mod.id)}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                seleccionado
                  ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20 dark:border-brand-500/50 dark:bg-brand-500/10"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    activo
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                      : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                  }`}
                >
                  {icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {mod.nombre}
                    </span>
                    <Badge color={activo ? "success" : "light"} size="xs">
                      {activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {mod.tagline}
                  </p>
                </div>
              </div>

              <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                {seleccionado ? "Configurando" : "Seleccionar"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Panel del Módulo Seleccionado */}
      <div className="space-y-6">
        {/* Tarjeta Maestra: Estado del Módulo */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                {moduloInfo.id === "pedidos" ? <OrdersIcon className="h-6 w-6" /> : <InventoryIcon className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {moduloInfo.nombre}
                  </h2>
                  <Badge color={esActivo ? "success" : "light"} size="sm">
                    {esActivo ? "Módulo Habilitado" : "Módulo Deshabilitado"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {moduloInfo.descripcion}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {esActivo ? "Activo en la empresa" : "Apagado"}
              </span>
              <Switch
                checked={esActivo}
                onChange={() => plataformaStore.toggleModulo(moduloSeleccionado)}
                label=""
              />
            </div>
          </div>

          {!esActivo && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              Al desactivar este módulo de negocio, se ocultan todas sus pantallas del menú lateral y sus rutas
              quedan inaccesibles. Sus conectores de IA y WhatsApp permanecerán en pausa.
            </div>
          )}
        </div>

        {/* Sección: Plugins y Conectores para este Módulo */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Plugins y Conectores de {moduloInfo.nombre}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Habilita Necto IA y Canales de WhatsApp específicamente sobre este dominio de negocio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ConectorCard
              moduloId={moduloSeleccionado}
              conectorId="necto_ia"
              moduloActivo={esActivo}
            />
            <ConectorCard
              moduloId={moduloSeleccionado}
              conectorId="whatsapp"
              moduloActivo={esActivo}
            />
          </div>
        </div>

        {/* Parámetros Operativos del Módulo */}
        {esActivo && moduloInfo.rutaConfig && (
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Ajustes Operativos de {moduloInfo.nombre}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Horarios de atención, catálogo de productos, plantillas y tiempos objetivo.
                </p>
              </div>
            </div>

            <Link to={moduloInfo.rutaConfig}>
              <Button size="sm" variant="outline">
                Ir a Configuración Operativa →
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
});
