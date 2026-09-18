import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Link, useNavigate } from "react-router";
import { PageMeta } from "@/shell/meta";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import { Switch } from "@/elements/form/switch";
import {
  plataformaStore,
  type IdModuloNegocio,
} from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// ICONOS SVG VECTORIALES LIMPIOS (Sin dependencias externas)
// ═══════════════════════════════════════════════════════════════════════════

const SettingsGearIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const MoreDotsIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);

const CheckCircleSmall = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PlusIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

/** Logo de Pedidos */
const OrdersBrandLogo = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  </div>
);

/** Logo de Inventario */
const InventoryBrandLogo = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  </div>
);

/** Logo de Necto IA (en tamaño compacto) */
const NectoIaMiniLogo = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  </div>
);

/** Logo de WhatsApp (en tamaño compacto) */
const WhatsAppMiniLogo = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// DEFINICIONES DE MÓDULOS DE NEGOCIO Y ESPECIFICACIONES
// ═══════════════════════════════════════════════════════════════════════════

interface ModuloConfigDef {
  id: IdModuloNegocio;
  nombre: string;
  tagline: string;
  descripcion: string;
  logo: React.ReactNode;
  rutaConfig?: string;
  rutasHabilitadas: string[];
  rolesRequeridos: string;
  capacidades: string[];
}

const MODULOS_DEF: Record<IdModuloNegocio, ModuloConfigDef> = {
  pedidos: {
    id: "pedidos",
    nombre: "Pedidos & Delivery",
    tagline: "Ventas y Operación Core",
    descripcion: "Tablero Kanban de órdenes, cocina, delivery, historial completo y métricas analíticas de venta.",
    logo: <OrdersBrandLogo />,
    rutaConfig: "/pedidos/config",
    rutasHabilitadas: ["/pedidos/inicio", "/pedidos", "/pedidos/crear", "/pedidos/historial", "/pedidos/analitica", "/pedidos/config"],
    rolesRequeridos: "orders.read, orders.create, orders.move.*",
    capacidades: [
      "Tablero Kanban de órdenes en tiempo real con ciclo de vida completo",
      "Creación ágil de pedidos con cálculo automático de totales",
      "Historial de ventas exportable y métricas analíticas clave",
      "Asignación de repartidores y direcciones de entrega geolocalizadas",
    ],
  },
  inventario: {
    id: "inventario",
    nombre: "Inventario & Stock",
    tagline: "Catálogo y Existencias Core",
    descripcion: "Control de productos, catálogo de precios, alertas automáticas de existencias y bodegas.",
    logo: <InventoryBrandLogo />,
    rutasHabilitadas: ["/inventario"],
    rolesRequeridos: "inventory.read, inventory.manage",
    capacidades: [
      "Control de existencias y alertas de reposición automática",
      "Administración de catálogo con variantes y costos de insumos",
      "Sincronización con cocina para descontar stock en cada orden",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE: TARJETA JERÁRQUICA DE MÓDULO (MÓDULO + SUS PLUGINS INTEGRADOS)
// ═══════════════════════════════════════════════════════════════════════════

const ModuloJerarquicoCard = observer(({
  def,
  onOpenDetails,
  onDesinstalar,
}: {
  def: ModuloConfigDef;
  onOpenDetails: (def: ModuloConfigDef) => void;
  onDesinstalar: (def: ModuloConfigDef) => void;
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const esActivo = plataformaStore.esModuloActivo(def.id);
  const nectoIaActivo = plataformaStore.esConectorActivo(def.id, "necto_ia");
  const whatsappActivo = plataformaStore.esConectorActivo(def.id, "whatsapp");

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-2xs transition-all duration-200 dark:bg-gray-900 ${
        esActivo
          ? "border-gray-200 hover:border-gray-300 hover:shadow-xs dark:border-gray-800 dark:hover:border-gray-700"
          : "border-gray-200/60 bg-gray-50/40 opacity-80 dark:border-gray-800/60 dark:bg-gray-900/40"
      }`}
    >
      <div>
        {/* ── 1. Cabecera de la Tarjeta: Logo, Título, Menú '...' y Switch de Módulo ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div>{def.logo}</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {def.nombre}
                </h3>
                <Badge color={esActivo ? "success" : "light"} size="xs">
                  {esActivo ? "Módulo Activo" : "Desactivado"}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {def.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Menú Más Opciones (...) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                title="Opciones de módulo"
              >
                <MoreDotsIcon className="h-4 w-4" />
              </button>

              <Dropdown
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                className="right-0 top-full mt-1 w-52 border border-gray-100 shadow-lg dark:border-white/5"
              >
                {def.rutaConfig && (
                  <DropdownItem
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(def.rutaConfig!);
                    }}
                  >
                    Ajustes de {def.nombre}
                  </DropdownItem>
                )}
                <DropdownItem
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenDetails(def);
                  }}
                >
                  Ver especificaciones
                </DropdownItem>
                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                <DropdownItem
                  onClick={() => {
                    setMenuOpen(false);
                    onDesinstalar(def);
                  }}
                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <div className="flex items-center gap-2">
                    <TrashIcon className="h-3.5 w-3.5" />
                    <span>Desinstalar módulo</span>
                  </div>
                </DropdownItem>
              </Dropdown>
            </div>

            {/* Switch Principal: Activar / Desactivar Módulo */}
            <Switch
              checked={esActivo}
              onChange={() => plataformaStore.toggleModulo(def.id)}
              label=""
            />
          </div>
        </div>

        {/* ── 2. Descripción del Módulo ── */}
        <p className="mt-3.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
          {def.descripcion}
        </p>

        {/* ── 3. ESTRUCTURA JERÁRQUICA: Plugins e Integraciones del Módulo ── */}
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/75 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Plugins e Integraciones del Módulo
            </span>
            <span className="text-[11px] font-medium text-gray-400">
              {esActivo ? (
                `${(nectoIaActivo ? 1 : 0) + (whatsappActivo ? 1 : 0)} de 2 activos`
              ) : (
                "En pausa"
              )}
            </span>
          </div>

          <div className="space-y-3">
            {/* Plugin 1: Necto IA */}
            <div className={`flex items-center justify-between gap-3 rounded-lg border bg-white p-2.5 transition-colors dark:bg-gray-900/80 ${
              nectoIaActivo && esActivo
                ? "border-brand-200/80 dark:border-brand-500/20"
                : "border-gray-100 dark:border-gray-800"
            }`}>
              <div className="flex items-center gap-2.5">
                <NectoIaMiniLogo />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                      Necto Intelligence (IA)
                    </span>
                    {nectoIaActivo && esActivo && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Copiloto con IA para consultar {def.id === "pedidos" ? "pedidos y métricas" : "existencias"}.
                  </p>
                </div>
              </div>

              <Switch
                checked={nectoIaActivo}
                disabled={!esActivo}
                onChange={() => plataformaStore.toggleConector(def.id, "necto_ia")}
                label=""
              />
            </div>

            {/* Plugin 2: WhatsApp Business */}
            <div className={`flex items-center justify-between gap-3 rounded-lg border bg-white p-2.5 transition-colors dark:bg-gray-900/80 ${
              whatsappActivo && esActivo
                ? "border-emerald-200/80 dark:border-emerald-500/20"
                : "border-gray-100 dark:border-gray-800"
            }`}>
              <div className="flex items-center gap-2.5">
                <WhatsAppMiniLogo />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                      WhatsApp Business
                    </span>
                    {whatsappActivo && esActivo && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Bandeja y notificaciones directas para {def.id === "pedidos" ? "estados de órdenes" : "consultas de stock"}.
                  </p>
                </div>
              </div>

              <Switch
                checked={whatsappActivo}
                disabled={!esActivo}
                onChange={() => plataformaStore.toggleConector(def.id, "whatsapp")}
                label=""
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Barra Inferior: Configuración y Detalles ── */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          {def.rutaConfig ? (
            <Link
              to={def.rutaConfig}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              title={`Configurar ${def.nombre}`}
            >
              <SettingsGearIcon className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 text-gray-300 opacity-60 dark:border-gray-800 dark:text-gray-600"
              title="Sin ajustes adicionales"
            >
              <SettingsGearIcon className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenDetails(def)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            Details
          </button>
        </div>

        <div className="text-[11px] text-gray-400 dark:text-gray-500">
          {esActivo ? "Operando normalmente" : "Módulo apagado"}
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const ConfiguracionModulosPage = observer(() => {
  const [modalModulo, setModalModulo] = useState<ModuloConfigDef | null>(null);
  const [moduloADesinstalar, setModuloADesinstalar] = useState<ModuloConfigDef | null>(null);
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false);

  // Módulos que están instalados actualmente en la organización
  const modulosInstalados = (Object.keys(MODULOS_DEF) as IdModuloNegocio[])
    .filter((id) => plataformaStore.esModuloInstalado(id))
    .map((id) => MODULOS_DEF[id]);

  // Módulos disponibles en el catálogo para ser instalados / agregados
  const modulosDisponiblesParaInstalar = (Object.keys(MODULOS_DEF) as IdModuloNegocio[])
    .filter((id) => !plataformaStore.esModuloInstalado(id))
    .map((id) => MODULOS_DEF[id]);

  return (
    <>
      <PageMeta
        title="Módulos e Integraciones · Organización"
        description="Gestión jerárquica de módulos de negocio y sus plugins integrados"
      />

      {/* Cabecera Superior */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Link to="/equipo" className="hover:text-gray-700 dark:hover:text-gray-200">
              Organización
            </Link>
            <span>&gt;</span>
            <span className="font-medium text-gray-800 dark:text-white/90">
              Módulos e Integraciones
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Módulos e Integraciones
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Organización jerárquica: administra los módulos de tu empresa y activa plugins de IA y WhatsApp dentro de cada uno.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setModalAgregarAbierto(true)}
            className="flex items-center gap-1.5"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Agregar Módulo</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => plataformaStore.reiniciar()}
            title="Restablecer configuración de fábrica"
          >
            Restablecer
          </Button>
        </div>
      </div>

      {/* ── LISTADO JERÁRQUICO DE MÓDULOS INSTALADOS ── */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Módulos Instalados ({modulosInstalados.length})
            </h2>
            <p className="text-xs text-gray-400">
              Cada módulo contiene sus propios plugins y canales integrados de forma independiente.
            </p>
          </div>
        </div>

        {modulosInstalados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              No tienes módulos instalados
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Instala un módulo de negocio como Pedidos o Inventario para comenzar.
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setModalAgregarAbierto(true)}
            >
              Ver Catálogo de Módulos
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {modulosInstalados.map((mod) => (
              <ModuloJerarquicoCard
                key={mod.id}
                def={mod}
                onOpenDetails={(item) => setModalModulo(item)}
                onDesinstalar={(item) => setModuloADesinstalar(item)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── MODAL 1: DETALLES DEL MÓDULO ('Details') ── */}
      {modalModulo && (
        <Modal
          isOpen={Boolean(modalModulo)}
          onClose={() => setModalModulo(null)}
          className="max-w-lg p-6"
        >
          <div>
            <div className="flex items-center gap-3">
              <div>{modalModulo.logo}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {modalModulo.nombre}
                  </h3>
                  <Badge
                    color={plataformaStore.esModuloActivo(modalModulo.id) ? "success" : "light"}
                    size="xs"
                  >
                    {plataformaStore.esModuloActivo(modalModulo.id) ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {modalModulo.tagline}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {modalModulo.descripcion}
            </p>

            {/* Capacidades del Módulo */}
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                Capacidades operativas incluidas:
              </h4>
              <ul className="mt-2.5 space-y-2">
                {modalModulo.capacidades.map((cap, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <CheckCircleSmall className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rutas y Permisos Requeridos */}
            <div className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Rutas del módulo: </span>
                <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-gray-800">
                  {modalModulo.rutasHabilitadas.join(", ")}
                </code>
              </div>
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Permisos de rol requeridos: </span>
                <span>{modalModulo.rolesRequeridos}</span>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
              {modalModulo.rutaConfig ? (
                <Link
                  to={modalModulo.rutaConfig}
                  onClick={() => setModalModulo(null)}
                >
                  <Button size="sm" variant="outline">
                    Ajustes de {modalModulo.nombre} →
                  </Button>
                </Link>
              ) : (
                <div />
              )}
              <Button size="sm" onClick={() => setModalModulo(null)}>
                Entendido
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 2: CATÁLOGO PARA AGREGAR MÓDULOS ── */}
      {modalAgregarAbierto && (
        <Modal
          isOpen={modalAgregarAbierto}
          onClose={() => setModalAgregarAbierto(false)}
          className="max-w-md p-6"
        >
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Catálogo de Módulos de la Organización
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Agrega módulos a tu espacio de trabajo para habilitar nuevas áreas de negocio.
            </p>

            <div className="mt-4 space-y-3">
              {modulosDisponiblesParaInstalar.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                  Todos los módulos disponibles ya se encuentran instalados en tu organización.
                </div>
              ) : (
                modulosDisponiblesParaInstalar.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 p-3.5 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div>{mod.logo}</div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {mod.nombre}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {mod.tagline}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        plataformaStore.instalarModulo(mod.id);
                        setModalAgregarAbierto(false);
                      }}
                    >
                      Instalar
                    </Button>
                  </div>
                ))
              )}

              {/* Módulo Próximamente */}
              <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 p-3.5 opacity-70 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Facturación Electrónica
                      </h4>
                      <Badge color="light" size="xs">Próximamente</Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      Emisión de facturas electrónicas y control contable.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setModalAgregarAbierto(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 3: CONFIRMAR DESINSTALACIÓN DE MÓDULO ── */}
      {moduloADesinstalar && (
        <Modal
          isOpen={Boolean(moduloADesinstalar)}
          onClose={() => setModuloADesinstalar(null)}
          className="max-w-sm p-6"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <TrashIcon className="h-5 w-5" />
            </div>

            <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-white">
              ¿Desinstalar {moduloADesinstalar.nombre}?
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Al desinstalar este módulo de tu organización, se ocultará de la barra de navegación y sus plugins integrados (Necto IA y WhatsApp) quedarán pausados. Podrás volver a instalarlo en cualquier momento desde el catálogo.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModuloADesinstalar(null)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                onClick={() => {
                  plataformaStore.desinstalarModulo(moduloADesinstalar.id);
                  setModuloADesinstalar(null);
                }}
              >
                Sí, desinstalar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
});
