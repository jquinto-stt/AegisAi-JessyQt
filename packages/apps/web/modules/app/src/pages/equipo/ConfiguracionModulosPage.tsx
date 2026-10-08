import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Link, useNavigate } from "react-router";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import { Switch } from "@/elements/form/switch";
import {
  organizacionStore,
  plataformaStore,
  CATALOGO_MODULOS,
  type IdModuloNegocio,
  type InfoModuloNegocio,
} from "@/stores";
import {
  AiIcon,
  BoxCubeIcon,
  CartIcon,
  ChatIcon,
  CheckLineIcon,
  MoreDotsIcon,
  PageIcon,
  PlusIcon,
  SettingsGearIcon,
  TrashBinIcon,
} from "@/icons";

// ═══════════════════════════════════════════════════════════════════════════
// LOGOS DE MÓDULO
// ═══════════════════════════════════════════════════════════════════════════
//
// Los cuatro logos salen de Heroicons, igual que el resto de la interfaz. Antes
// eran `<svg>` escritos a mano en este archivo, con `strokeWidth` y `viewBox`
// propios: cuatro formas que no venían del mismo juego que el resto de la app y
// que nadie podía retocar sin dibujarlas de nuevo. Las clases del contenedor
// (cuadro de color, radio, tamaño) se conservan **byte a byte**: lo que cambia
// es de dónde sale el trazo, no cómo se ve el bloque.

/** Logo del Módulo de Pedidos */
const OrdersBrandLogo = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600 dark:bg-brand-500/10 dark:text-brand-400">
    <CartIcon className="h-6 w-6" />
  </div>
);

/** Logo del Módulo de Inventarios — una caja, que es lo que se cuenta. */
const InventariosBrandLogo = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600 dark:bg-brand-500/10 dark:text-brand-400">
    <BoxCubeIcon className="h-6 w-6" />
  </div>
);

/** Logo de Integración: Necto IA */
const NectoIaIntegrationLogo = () => (
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600 dark:bg-brand-500/10 dark:text-brand-400">
    <AiIcon className="h-5 w-5" />
  </div>
);

/** Logo de Integración: WhatsApp Business */
const WhatsAppIntegrationLogo = () => (
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
    <ChatIcon className="h-5 w-5" />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS Y MODELOS DE DATOS
// ═══════════════════════════════════════════════════════════════════════════

interface SubIntegracionDef {
  id: "necto_ia" | "whatsapp";
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

/**
 * Lo que esta pantalla añade al catálogo. **Nada de identidad del módulo.**
 *
 * `nombre`, `tagline`, `descripcion`, `rutaConfig` y `disponible` viven en
 * `CATALOGO_MODULOS` y se leen de ahí. Esta tabla los duplicaba, y la copia ya
 * había divergido: el `tagline` de Pedidos decía aquí «Ventas y Operación Core»
 * mientras el catálogo decía «Ventas y Operaciones», y la `descripcion` era un
 * tercer texto distinto del de `/modulos` y del de `/onboarding/modulos`.
 *
 * Lo que sí es de esta pantalla: con qué logo se pinta, qué rutas habilita el
 * módulo, qué permisos pide y qué lista larga de capacidades se muestra en su
 * modal de detalles.
 */
interface PresentacionModulo {
  logo: React.ReactNode;
  rutasHabilitadas: string[];
  rolesRequeridos: string;
  capacidades: string[];
}

type ModuloConfigDef = InfoModuloNegocio & PresentacionModulo;

const PRESENTACION_MODULOS: Record<IdModuloNegocio, PresentacionModulo> = {
  pedidos: {
    logo: <OrdersBrandLogo />,
    rutasHabilitadas: ["/pedidos/inicio", "/pedidos", "/pedidos/catalogo", "/pedidos/crear", "/pedidos/historial", "/pedidos/analitica", "/pedidos/config"],
    rolesRequeridos: "orders.read, orders.create, orders.move.*",
    capacidades: [
      "Tablero Kanban de órdenes en tiempo real con ciclo de vida completo",
      "Creación ágil de pedidos con cálculo automático de totales",
      "Historial de ventas exportable y métricas analíticas clave",
      "Asignación de repartidores y transportadoras con seguimiento",
    ],
  },
  inventarios: {
    logo: <InventariosBrandLogo />,
    rutasHabilitadas: [
      "/inventarios",
      "/inventarios/elementos",
      "/inventarios/ubicaciones",
      "/inventarios/historial",
      "/inventarios/alertas",
      "/inventarios/reportes",
      "/inventarios/config",
    ],
    rolesRequeridos: "inventory.read, inventory.count, inventory.finalize",
    // Las capacidades se listan con el lenguaje del módulo, no con el de un
    // ERP: se cuenta, se verifica y se deja rastro. Ninguna línea promete
    // control de existencias, valorización ni reposición — el módulo no hace
    // ninguna de las tres y describirlo así sería vender lo que no hay.
    capacidades: [
      "Conteos iniciales, periódicos y finales por ubicación",
      "Cantidad esperada congelada frente a la observada, con diferencia visible",
      "Evidencia fotográfica y condición por elemento contado",
      "Historial con autor y hora de cada movimiento",
    ],
  },
};

/** Identidad (catálogo) + presentación (esta pantalla). Una sola fuente por dato. */
const moduloDef = (id: IdModuloNegocio): ModuloConfigDef => ({
  ...CATALOGO_MODULOS[id],
  ...PRESENTACION_MODULOS[id],
});

const MODULOS_DEF: Record<IdModuloNegocio, ModuloConfigDef> = {
  pedidos: moduloDef("pedidos"),
  inventarios: moduloDef("inventarios"),
};

const IDS_MODULOS = Object.keys(MODULOS_DEF) as IdModuloNegocio[];

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA DE INTEGRACIÓN (DISEÑO EXACTO DE LA REFERENCIA DEL USUARIO)
// ═══════════════════════════════════════════════════════════════════════════

const SubIntegrationCard = observer(({
  item,
  parentActivo,
  onOpenDetails,
}: {
  item: SubIntegracionDef;
  parentActivo: boolean;
  onOpenDetails: (item: SubIntegracionDef) => void;
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`w-full relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-theme-xs transition-all duration-200 dark:bg-gray-900 ${
        parentActivo
          ? "border-gray-200 hover:border-gray-300 hover:shadow-theme-xs dark:border-gray-800 dark:hover:border-gray-700"
          : "border-gray-200/60 bg-gray-50/50 opacity-60 dark:border-gray-800/60 dark:bg-gray-900/40"
      }`}
    >
      <div>
        {/* Fila Superior: Logo a la izquierda, menú '...' a la derecha */}
        <div className="flex items-center justify-between">
          <div>{item.logo}</div>

          <div className="relative">
            <button
              type="button"
              disabled={!parentActivo}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-300 cursor-pointer"
              title="Opciones de integración"
            >
              <MoreDotsIcon className="h-4 w-4" />
            </button>

            <Dropdown
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              className="right-0 top-full mt-1 w-48 border border-gray-100 shadow-theme-lg dark:border-white/5"
            >
              <DropdownItem
                onClick={() => {
                  setMenuOpen(false);
                  onOpenDetails(item);
                }}
              >
                Ver especificaciones
              </DropdownItem>
              {item.rutaConfig && parentActivo && (
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

        {/* Título de la Integración */}
        <h4 className="mt-4 text-sm font-bold text-ink-title dark:text-white">
          {item.nombre}
        </h4>

        {/* Descripción corta de 2 líneas */}
        <p className="mt-1.5 min-h-[36px] text-xs leading-relaxed text-gray-500 line-clamp-2 dark:text-gray-400">
          {item.descripcion}
        </p>
      </div>

      {/* Fila Inferior: [ ⚙ ] [ Details ] a la izquierda, Switch a la derecha */}
      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3.5 dark:border-gray-800">
        <div className="flex items-center gap-2">
          {item.rutaConfig && parentActivo ? (
            <Link
              to={item.rutaConfig}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              title="Ajustes operativos"
            >
              <SettingsGearIcon className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 text-gray-300 opacity-50 dark:border-gray-800 dark:text-gray-600"
              title="Sin ajustes adicionales"
            >
              <SettingsGearIcon className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenDetails(item)}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer"
          >
            Ver detalles
          </button>
        </div>

        <div>
          <Switch
            checked={item.activo && parentActivo}
            disabled={!parentActivo}
            onChange={item.onToggle}
            label=""
          />
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTENEDOR MAESTRO DEL MÓDULO (INCLUYE SUS TARJETAS DE INTEGRACIÓN)
// ═══════════════════════════════════════════════════════════════════════════

const ModuloMaestroCard = observer(({
  def,
  onOpenModuloDetails,
  onDesinstalar,
}: {
  def: ModuloConfigDef;
  onOpenModuloDetails: (def: ModuloConfigDef) => void;
  onOpenIntegrationDetails?: (item: SubIntegracionDef) => void;
  onDesinstalar: (def: ModuloConfigDef) => void;
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const esActivo = organizacionStore.esModuloActivo(def.id);
  const nectoIaActivo = organizacionStore.esConectorActivo(def.id, "necto_ia");
  const whatsappActivo = organizacionStore.esConectorActivo(def.id, "whatsapp");
  const disponible = plataformaStore.esModuloDisponible(def.id);

  return (
    <div
      className={`w-full max-w-[720px] rounded-3xl border bg-white p-6 shadow-theme-xs transition-all duration-200 dark:bg-gray-900/60 ${
        esActivo
          ? "border-gray-200 shadow-theme-xs dark:border-gray-800"
          : "border-gray-200/70 bg-gray-50/40 opacity-75 dark:border-gray-800/60"
      }`}
    >
      {/* ── 1. Cabecera del Módulo ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div>{def.logo}</div>
          <div>
            <h3 className="text-base font-bold text-ink-title dark:text-white">
              {def.nombre}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
              {def.descripcion}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Menú de opciones (...) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 cursor-pointer"
              title="Opciones"
            >
              <MoreDotsIcon className="h-4 w-4" />
            </button>

            <Dropdown
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              className="right-0 top-full mt-1 w-48 border border-gray-100 shadow-theme-lg dark:border-white/5"
            >
              {def.rutaConfig && (
                <DropdownItem
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(def.rutaConfig!);
                  }}
                >
                  Configuración
                </DropdownItem>
              )}
              <DropdownItem
                onClick={() => {
                  setMenuOpen(false);
                  onOpenModuloDetails(def);
                }}
              >
                Ver detalles
              </DropdownItem>
              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
              <DropdownItem
                onClick={() => {
                  setMenuOpen(false);
                  onDesinstalar(def);
                }}
                className="text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
              >
                <div className="flex items-center gap-2">
                  <TrashBinIcon className="h-3.5 w-3.5" />
                  <span>Desinstalar</span>
                </div>
              </DropdownItem>
            </Dropdown>
          </div>

          {/* Switch del Módulo.
              Si el módulo está instalado pero YA NO disponible (una instalación
              anterior a que se marcara `disponible: false`), el interruptor no se
              pinta: encenderlo no encendería nada — no hay ruta, ni página, ni
              store detrás. Se dice con una etiqueta en vez de ofrecer un control
              que no hace nada. */}
          {disponible ? (
            <Switch
              checked={esActivo}
              onChange={() => organizacionStore.toggleModulo(def.id)}
              label=""
            />
          ) : (
            <span
              className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500 dark:bg-white/5 dark:text-gray-400"
              title="Este módulo todavía no está disponible: activarlo no habilitaría ninguna pantalla."
            >
              Próximamente
            </span>
          )}
        </div>
      </div>

    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PESTAÑA "MÓDULOS E INTEGRACIONES"
// ═══════════════════════════════════════════════════════════════════════════
//
// Era una PÁGINA servida en `/configuracion`. Ahora es una pestaña de la
// configuración de la organización, y por eso ya no pinta su propio `<h1>`, ni
// su descripción, ni su `PageMeta`: el `ConfigShell` de la página que la aloja
// pone el título y el consejo de la sección. Repetirlos aquí daba dos
// encabezados para la misma cosa, que es la misma clase de defecto que las tres
// descripciones distintas del mismo módulo.
//
// Lo que sí es suyo: el contenido y sus dos acciones (agregar y restablecer).

export const ModulosTab = observer(() => {
  const navigate = useNavigate();
  const [modalModulo, setModalModulo] = useState<ModuloConfigDef | null>(null);
  const [modalIntegracion, setModalIntegracion] = useState<SubIntegracionDef | null>(null);
  const [moduloADesinstalar, setModuloADesinstalar] = useState<ModuloConfigDef | null>(null);
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false);

  // Módulos instalados
  const modulosInstalados = IDS_MODULOS
    .filter((id) => organizacionStore.esModuloInstalado(id))
    .map((id) => MODULOS_DEF[id]);

  /**
   * Módulos instalables: no instalados **y disponibles en la plataforma**.
   *
   * El filtro por `disponible` no es cosmético. Sin él esta lista ofrecía
   * «Instalar» un módulo declarado pero no implementado —sin ruta, sin página y
   * sin store— y al instalarlo no aparecía en ninguna parte de la aplicación.
   * `disponible` es la única respuesta a «¿se puede usar hoy?»; la pantalla no lo
   * decide por su cuenta.
   */
  const modulosDisponiblesParaInstalar = IDS_MODULOS
    .filter((id) => !organizacionStore.esModuloInstalado(id))
    .filter((id) => plataformaStore.esModuloDisponible(id))
    .map((id) => MODULOS_DEF[id]);

  /**
   * Declarados pero todavía no disponibles: se **nombran con su motivo** en vez de
   * desaparecer. Un catálogo que esconde lo que viene es tan poco honesto como uno
   * que ofrece lo que no existe.
   */
  const modulosProximamente = IDS_MODULOS
    .filter((id) => !plataformaStore.esModuloDisponible(id))
    .map((id) => MODULOS_DEF[id]);

  return (
    <>
      {/* Acciones de la sección. El título y el consejo los pinta el
          `ConfigShell` que aloja esta pestaña; aquí solo van los botones. */}
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <Button
          size="sm"
          onClick={() => setModalAgregarAbierto(true)}
          className="flex items-center gap-1.5"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Agregar Módulo</span>
        </Button>

        {/* `Button` del catálogo no reenvía `title` al DOM (documentado en
            REFERENCIA.md), así que el tooltip va en un `<span>` que lo envuelve:
            pasarlo directo al `Button` no compila y no pintaría nada. */}
        <span title="Restablecer configuración de fábrica">
          <Button size="sm" variant="outline" onClick={() => organizacionStore.reiniciarModulos()}>
            Restablecer
          </Button>
        </span>
      </div>

      {/* ── LISTADO DE MÓDULOS DE NEGOCIO Y SUS INTEGRACIONES ── */}
      <section className="mb-10">
        {modulosInstalados.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
            <h3 className="text-base font-semibold text-ink-title dark:text-white">
              No tienes módulos instalados
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Instala un módulo de negocio para habilitar operaciones e integraciones.
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {modulosInstalados.map((mod) => (
              <ModuloMaestroCard
                key={mod.id}
                def={mod}
                onOpenModuloDetails={(item) => setModalModulo(item)}
                onOpenIntegrationDetails={(item) => setModalIntegracion(item)}
                onDesinstalar={(item) => setModuloADesinstalar(item)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── MODAL 1: ESPECIFICACIONES DEL MÓDULO ── */}
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
                  <h3 className="text-base font-bold text-ink-title dark:text-white">
                    {modalModulo.nombre}
                  </h3>
                  <Badge
                    color={organizacionStore.esModuloActivo(modalModulo.id) ? "success" : "light"}
                    size="xs"
                  >
                    {organizacionStore.esModuloActivo(modalModulo.id) ? "Activo" : "Inactivo"}
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

            {/* Capacidades */}
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <h4 className="text-xs font-semibold text-ink-title dark:text-white">
                Capacidades operativas incluidas:
              </h4>
              <ul className="mt-2.5 space-y-2">
                {modalModulo.capacidades.map((cap, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <CheckLineIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rutas y Permisos */}
            <div className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Rutas del módulo: </span>
                {modalModulo.rutasHabilitadas.length > 0 ? (
                  <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-gray-800">
                    {modalModulo.rutasHabilitadas.join(", ")}
                  </code>
                ) : (
                  // Vacío es un dato, no un hueco: significa «este módulo todavía no
                  // habilita ninguna ruta». Antes aquí se listaba una ruta que no
                  // existía en el router.
                  <span className="italic text-gray-400">Todavía no habilita rutas</span>
                )}
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

      {/* ── MODAL 2: ESPECIFICACIONES DE INTEGRACIÓN ('Details') ── */}
      {modalIntegracion && (
        <Modal
          isOpen={Boolean(modalIntegracion)}
          onClose={() => setModalIntegracion(null)}
          className="max-w-lg p-6"
        >
          <div>
            <div className="flex items-center gap-3">
              <div>{modalIntegracion.logo}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-ink-title dark:text-white">
                    {modalIntegracion.nombre}
                  </h3>
                  <Badge
                    color={modalIntegracion.activo ? "success" : "light"}
                    size="xs"
                  >
                    {modalIntegracion.activo ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {modalIntegracion.detalles.categoria}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {modalIntegracion.descripcion}
            </p>

            {/* Beneficios */}
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <h4 className="text-xs font-semibold text-ink-title dark:text-white">
                Capacidades de la integración:
              </h4>
              <ul className="mt-2.5 space-y-2">
                {modalIntegracion.detalles.beneficios.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <CheckLineIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rutas y Permisos */}
            <div className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Rutas asociadas: </span>
                <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-gray-800">
                  {modalIntegracion.detalles.rutasHabilitadas.join(", ")}
                </code>
              </div>
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Permiso requerido: </span>
                <span>{modalIntegracion.detalles.rolesRequeridos}</span>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
              {modalIntegracion.rutaConfig ? (
                <Link
                  to={modalIntegracion.rutaConfig}
                  onClick={() => setModalIntegracion(null)}
                >
                  <Button size="sm" variant="outline">
                    Ir a configuración operativa →
                  </Button>
                </Link>
              ) : (
                <div />
              )}
              <Button size="sm" onClick={() => setModalIntegracion(null)}>
                Entendido
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 3: CATÁLOGO PARA AGREGAR MÓDULOS ── */}
      {modalAgregarAbierto && (
        <Modal
          isOpen={modalAgregarAbierto}
          onClose={() => setModalAgregarAbierto(false)}
          className="max-w-md p-6"
        >
          <div>
            <h3 className="text-base font-bold text-ink-title dark:text-white">
              Catálogo de Módulos de la Organización
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Agrega módulos a tu organización para habilitar nuevas áreas de negocio.
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
                        <h4 className="text-sm font-semibold text-ink-title dark:text-white">
                          {mod.nombre}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {mod.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Si el módulo tiene paso de onboarding, se redirige ahí
                        en vez de instalarlo en silencio: el onboarding configura
                        rubro, conectores y lo que haga falta antes de activar.
                        Un módulo sin `rutaOnboarding` se instala directamente. */}
                    <Button
                      size="sm"
                      onClick={() => {
                        const ruta = mod.rutaOnboarding;
                        if (ruta) {
                          setModalAgregarAbierto(false);
                          navigate(ruta);
                        } else {
                          organizacionStore.instalarModulo(mod.id);
                          setModalAgregarAbierto(false);
                        }
                      }}
                    >
                      {mod.rutaOnboarding ? "Configurar e instalar" : "Instalar"}
                    </Button>
                  </div>
                ))
              )}

              {/* Declarados y todavía no disponibles: se nombran, sin interruptor.
                  Se DERIVAN del catálogo, así que el día que se declare un módulo
                  sin implementarlo basta con dejarlo en `disponible: false` y
                  aparece aquí solo — esta pantalla no pregunta «¿es inventario?».
                  Hoy el bloque está vacío: los dos módulos del catálogo existen. */}
              {modulosProximamente.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 p-3.5 opacity-70 dark:border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="opacity-60">{mod.logo}</div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-ink-title dark:text-white">
                          {mod.nombre}
                        </h4>
                        <Badge color="light" size="xs">Próximamente</Badge>
                      </div>
                      <p className="text-xs text-gray-400">{mod.descripcion}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Módulo Próximamente */}
              <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 p-3.5 opacity-70 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600 dark:bg-accent-500/10 dark:text-accent-400">
                    <PageIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-ink-title dark:text-white">
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

      {/* ── MODAL 4: CONFIRMAR DESINSTALACIÓN DE MÓDULO ── */}
      {moduloADesinstalar && (
        <Modal
          isOpen={Boolean(moduloADesinstalar)}
          onClose={() => setModuloADesinstalar(null)}
          className="max-w-sm p-6"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400">
              <TrashBinIcon className="h-5 w-5" />
            </div>

            <h3 className="mt-3 text-base font-bold text-ink-title dark:text-white">
              ¿Desinstalar {moduloADesinstalar.nombre}?
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Al desinstalar este módulo de tu organización, se ocultará de la barra de navegación y sus tarjetas de integración (Necto IA y WhatsApp) quedarán en pausa. Podrás volver a instalarlo en cualquier momento desde el catálogo.
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
                className="bg-error-600 text-white hover:bg-error-700 dark:bg-error-500 dark:hover:bg-error-600"
                onClick={() => {
                  organizacionStore.desinstalarModulo(moduloADesinstalar.id);
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
