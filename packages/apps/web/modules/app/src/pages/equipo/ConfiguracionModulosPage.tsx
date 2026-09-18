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
  CATALOGO_MODULOS,
  type IdModuloNegocio,
} from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// ICONOS SVG VECTORIALES (Fieles al diseño limpio de la referencia)
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

/** Icono de Pedidos */
const OrdersBrandLogo = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  </div>
);

/** Icono de Inventario */
const InventoryBrandLogo = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  </div>
);

/** Icono de Necto IA */
const NectoIaBrandLogo = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  </div>
);

/** Icono oficial de WhatsApp */
const WhatsAppBrandLogo = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE ITEM DE INTEGRACIÓN
// ═══════════════════════════════════════════════════════════════════════════

interface IntegracionItem {
  id: string;
  tipo: "modulo" | "plugin";
  nombre: string;
  descripcion: string;
  logo: React.ReactNode;
  activo: boolean;
  onToggle: () => void;
  rutaConfig?: string;
  detalles: {
    categoria: string;
    beneficios: string[];
    rutasHabilitadas: string[];
    rolesRequeridos: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA DE INTEGRACIÓN (LAYOUT EXACTO DE LA REFERENCIA)
// ═══════════════════════════════════════════════════════════════════════════

const IntegrationCard = observer(({
  item,
  onOpenDetails,
}: {
  item: IntegracionItem;
  onOpenDetails: (item: IntegracionItem) => void;
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs transition-all hover:shadow-xs dark:border-gray-800 dark:bg-gray-900">
      <div>
        {/* Fila Superior: Logo a la izquierda, menú '...' a la derecha */}
        <div className="flex items-center justify-between">
          <div>{item.logo}</div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Más opciones"
            >
              <MoreDotsIcon className="h-4 w-4" />
            </button>

            <Dropdown
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              className="right-0 top-full mt-1 w-44 shadow-lg border border-gray-100 dark:border-white/5"
            >
              <DropdownItem
                onClick={() => {
                  setMenuOpen(false);
                  onOpenDetails(item);
                }}
              >
                Ver especificaciones
              </DropdownItem>
              {item.rutaConfig && (
                <DropdownItem
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(item.rutaConfig!);
                  }}
                >
                  Ir a configuración
                </DropdownItem>
              )}
            </Dropdown>
          </div>
        </div>

        {/* Título */}
        <h3 className="mt-5 text-base font-semibold text-gray-900 dark:text-white">
          {item.nombre}
        </h3>

        {/* Descripción (altura uniforme) */}
        <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[34px]">
          {item.descripcion}
        </p>
      </div>

      {/* Fila Inferior: [ ⚙ ] [ Details ] a la izquierda, Toggle Switch a la derecha */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          {item.rutaConfig ? (
            <Link
              to={item.rutaConfig}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              title="Configuración"
            >
              <SettingsGearIcon className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 text-gray-300 dark:border-gray-800 dark:text-gray-600 opacity-60"
              title="Sin ajustes adicionales"
            >
              <SettingsGearIcon className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenDetails(item)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            Details
          </button>
        </div>

        <div className="flex items-center">
          <Switch
            checked={item.activo}
            onChange={item.onToggle}
            label=""
          />
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const ConfiguracionModulosPage = observer(() => {
  const [modalItem, setModalItem] = useState<IntegracionItem | null>(null);

  // ── Módulos de Negocio Core ────────────────────────────────────────────────
  const modulosNegocio: IntegracionItem[] = [
    {
      id: "pedidos",
      tipo: "modulo",
      nombre: "Pedidos & Delivery",
      descripcion: "Tablero de pedidos, cocina, delivery, historial y métricas operativas de venta.",
      logo: <OrdersBrandLogo />,
      activo: plataformaStore.esModuloActivo("pedidos"),
      onToggle: () => plataformaStore.toggleModulo("pedidos"),
      rutaConfig: "/pedidos/config",
      detalles: {
        categoria: "Módulo Core de Negocio",
        beneficios: [
          "Tablero Kanban con ciclo de vida del pedido (nuevo, confirmado, en cocina, entregado)",
          "Formulario ágil para creación de pedidos con cálculo automático de totales",
          "Métricas analíticas de ventas, ingresos y tiempos promedio de preparación",
          "Gestión de repartidores y direcciones de entrega geolocalizadas",
        ],
        rutasHabilitadas: ["/pedidos/inicio", "/pedidos", "/pedidos/crear", "/pedidos/historial", "/pedidos/analitica", "/pedidos/config"],
        rolesRequeridos: "orders.read, orders.create, orders.move.*",
      },
    },
    {
      id: "inventario",
      tipo: "modulo",
      nombre: "Inventario & Stock",
      descripcion: "Control de productos, catálogo de precios, alertas de existencias y bodegas.",
      logo: <InventoryBrandLogo />,
      activo: plataformaStore.esModuloActivo("inventario"),
      onToggle: () => plataformaStore.toggleModulo("inventario"),
      detalles: {
        categoria: "Módulo Core de Negocio",
        beneficios: [
          "Control de existencias y alertas automáticas de reposición de insumos",
          "Administración de catálogo con variantes, precios de compra y de venta",
          "Sincronización con cocina para descontar stock en cada orden procesada",
        ],
        rutasHabilitadas: ["/inventario"],
        rolesRequeridos: "inventory.read, inventory.manage",
      },
    },
  ];

  // ── Plugins y Conectores de Comunicación & IA ──────────────────────────────
  const pluginsConectores: IntegracionItem[] = [
    {
      id: "asistente",
      tipo: "plugin",
      nombre: "Necto Intelligence (IA)",
      descripcion: "Copiloto con IA para consultar pedidos, analizar ventas y automatizar respuestas.",
      logo: <NectoIaBrandLogo />,
      activo: plataformaStore.tieneConectorActivo("necto_ia"),
      onToggle: () => plataformaStore.toggleConector("pedidos", "necto_ia"),
      rutaConfig: "/asistente/config",
      detalles: {
        categoria: "Plugin / Inteligencia Artificial",
        beneficios: [
          "Conexión con las herramientas del módulo de pedidos para responder preguntas en tiempo real",
          "Generación de reportes ejecutivos diarios y comparativas de ventas",
          "Sugerencias contextuales de respuesta automática para clientes en espera",
        ],
        rutasHabilitadas: ["/asistente", "/asistente/config"],
        rolesRequeridos: "assistant.use",
      },
    },
    {
      id: "conversaciones",
      tipo: "plugin",
      nombre: "WhatsApp Business",
      descripcion: "Bandeja de entrada omnicanal y notificaciones automáticas de pedidos a clientes.",
      logo: <WhatsAppBrandLogo />,
      activo: plataformaStore.tieneConectorActivo("whatsapp"),
      onToggle: () => plataformaStore.toggleConector("pedidos", "whatsapp"),
      rutaConfig: "/conversaciones/config",
      detalles: {
        categoria: "Plugin / Canal de Mensajería",
        beneficios: [
          "Envío de plantillas automáticas de estado al avanzar pedidos (confirmado, en camino, listo)",
          "Bandeja unificada para que el equipo atienda mensajes de WhatsApp",
          "Recepción de pedidos asistida por chat y bot de atención",
        ],
        rutasHabilitadas: ["/conversaciones", "/conversaciones/historial", "/conversaciones/config"],
        rolesRequeridos: "channels.read, channels.respond, channels.manage",
      },
    },
  ];

  return (
    <>
      <PageMeta
        title="Módulos e Integraciones · Organización"
        description="Gestión simple y transparente de módulos de negocio y extensiones activas"
      />

      {/* Cabecera Superior con Breadcrumb y Título */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* Breadcrumb estilo referencia */}
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
            Activa o apaga los módulos de tu negocio y sus canales oficiales con un solo clic.
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
            Restablecer
          </Button>
        </div>
      </div>

      {/* ── 1. Módulos de tu Negocio ─────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Módulos de tu Negocio (Core)
          </h2>
          <p className="text-xs text-gray-400">
            Áreas operativas principales para gestionar tus ventas, producción y catálogo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modulosNegocio.map((mod) => (
            <IntegrationCard
              key={mod.id}
              item={mod}
              onOpenDetails={(it) => setModalItem(it)}
            />
          ))}
        </div>
      </section>

      {/* ── 2. Plugins y Canales de Comunicación ───────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Plugins y Canales Oficiales
          </h2>
          <p className="text-xs text-gray-400">
            Capacidades para potenciar la atención al cliente, notificaciones e inteligencia artificial.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pluginsConectores.map((plugin) => (
            <IntegrationCard
              key={plugin.id}
              item={plugin}
              onOpenDetails={(it) => setModalItem(it)}
            />
          ))}
        </div>
      </section>

      {/* ── Modal de Detalles (Al presionar el botón 'Details') ─────────────── */}
      {modalItem && (
        <Modal
          isOpen={Boolean(modalItem)}
          onClose={() => setModalItem(null)}
          className="max-w-lg p-6"
        >
          <div>
            {/* Header del Modal */}
            <div className="flex items-center gap-3">
              <div>{modalItem.logo}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {modalItem.nombre}
                  </h3>
                  <Badge color={modalItem.activo ? "success" : "light"} size="xs">
                    {modalItem.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {modalItem.detalles.categoria}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {modalItem.descripcion}
            </p>

            {/* Capacidades */}
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                Capacidades y herramientas incluidas:
              </h4>
              <ul className="mt-2.5 space-y-2">
                {modalItem.detalles.beneficios.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <CheckCircleSmall className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rutas y Permisos */}
            <div className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Rutas protegidas: </span>
                <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-gray-800">
                  {modalItem.detalles.rutasHabilitadas.join(", ")}
                </code>
              </div>
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Permisos de rol requeridos: </span>
                <span>{modalItem.detalles.rolesRequeridos}</span>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
              {modalItem.rutaConfig ? (
                <Link
                  to={modalItem.rutaConfig}
                  onClick={() => setModalItem(null)}
                >
                  <Button size="sm" variant="outline">
                    Ir a configuración operativa →
                  </Button>
                </Link>
              ) : (
                <div />
              )}
              <Button size="sm" onClick={() => setModalItem(null)}>
                Entendido
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
});
