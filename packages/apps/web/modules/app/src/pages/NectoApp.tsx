import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { EmptyModulesHubView } from "@/compositions/workspace/EmptyModulesHubView";
import { StoreDashboard } from "@/compositions/store-dashboard";
import {
  OrdersModule,
  DEFAULT_ORDERS_SECTION,
  ORDERS_SECTION_META,
  oneOfSections,
  OrdersProvider,
} from "@/compositions/orders";
import type { OrdersSectionKey } from "@/compositions/orders";import {
  ConversationsModule,
  ConversationsProvider,
  oneOfConversationSections,
} from "@/compositions/conversations";
import type { ConversationSectionKey } from "@/compositions/conversations";
import { BusinessSettingsModal } from "@/compositions/workspace/BusinessSettingsModal";
import { CommandPalette } from "@/compositions/workspace/CommandPalette";
import { useBusiness } from "@/context/BusinessContext";
import { useNotifications } from "@/context/notifications/hooks/useNotifications";
import { NotificationBellDropdown } from "@/compositions/shell/NotificationBellDropdown";
import type { BreadcrumbItem } from "@/elements/ui/breadcrumb";
import { BaseAppShell } from "@/shell";
import { AppFooter } from "@/shell/footer";
import { BasePageLayout, BasePageHeader } from "@/layouts/base-page";
import { StockFlowSidebar, APP_DESTINATIONS, type AppDestination } from "@/compositions/shell/StockFlowSidebar";
import { StockFlowHeader } from "@/compositions/shell/StockFlowHeader";
import { eventBus } from "@/infrastructure/eventBus";

/* ── Vocabularios de `tab` ──────────────────────────────────────────────────
 *
 * La URL usa **una sola clave `tab`** para tres módulos con vocabularios
 * distintos, así que el valor sólo es legible si se contrasta con el módulo al
 * que la URL dice apuntar. Sin ese contraste `?tab=en-vivo` —pestaña de la
 * operación de Pedidos— entraba también en el estado de Inventarios y, como el
 * efecto de redirección volvía a escribir la URL, quedaba guardado como una
 * pestaña de Inventarios **que no existe**: `en-vivo` no está en `InventoryTab`.
 *
 * Los tipos se **derivan** de las tablas para que el vocabulario que valida lo
 * que llega por enlace y el que describe el estado no puedan divergir. Si se
 * declararan por separado, una pestaña nueva en el tipo sería inalcanzable por
 * URL sin que nada avisara.
 */
const INVENTORY_TABS = ["products", "purchasing", "kardex", "pricelists", "locations", "valuation", "catalog"] as const;

export type InventoryTab = (typeof INVENTORY_TABS)[number];

/**
 * Las secciones de Pedidos **son** las del módulo (`ORDERS_SECTIONS`).
 *
 * ⚠️ Antes aquí vivía un vocabulario propio —`conversaciones`, `whatsapp`,
 * `menu`, `operacion`, `analitica`— que era residuo del módulo borrado: describía
 * pantallas que ya no existen y que el módulo nuevo (§26) no tiene. Se importa el
 * vocabulario del módulo en vez de redeclararlo para que la URL, el breadcrumb y
 * la barra del módulo no puedan divergir: una sección nueva se declara **una vez**,
 * en `ORDERS_SECTIONS`, y este archivo la honra sin tocar nada más.
 */
export type PedidosSection = OrdersSectionKey;

/**
 * La sección de Pedidos cuando la URL no trae una legible.
 *
 * ⚠️ Es la **primera pantalla del recorrido de trabajo** —la Bandeja de entrada—,
 * no la primera por orden alfabético ni por antigüedad. Abrir Pedidos tiene que
 * dejar al operador donde hay trabajo por decidir. Se **re-exporta** el valor del
 * módulo (`DEFAULT_ORDERS_SECTION`) en vez de escribir el literal aquí: el shell,
 * la barra lateral y el widget del Dashboard abren el módulo por la misma puerta.
 */
export const DEFAULT_PEDIDOS_SECTION: PedidosSection = DEFAULT_ORDERS_SECTION;

/**
 * Las secciones del canal conversacional. Mismo criterio que Pedidos: se importa
 * el vocabulario del canal en vez de redeclararlo, para que la URL, el breadcrumb
 * y la barra del canal no puedan divergir. Una sección nueva se declara **una
 * vez**, en `CONVERSATION_SECTIONS`.
 */
export type WhatsappSection = ConversationSectionKey;

/**
 * Sección del canal cuando la URL no trae una legible.
 *
 * ⚠️ Es una constante compartida, no un literal repetido: la usan el estado
 * inicial y el efecto de sincronía, y una copia suelta en cada sitio podría
 * divergir —dejando que la URL y el estado describieran secciones distintas.
 */
const DEFAULT_WHATSAPP_SECTION: WhatsappSection = "conversaciones";

/** Qué vocabulario de `tab` aplica, según lo que la URL declara. */
type TabVocabulary = "inventario" | null;

/**
 * Lo que `/app` puede pintar.
 *
 * `module-view` es la vista propia de un módulo —hoy sólo Pedidos—;
 * `module-catalogue` es el catálogo donde se acoplan; y `store-dashboard` es el
 * Dashboard de la Tienda, la pantalla de la sede.
 */
type AppSurface = "module-view" | "module-catalogue" | "store-dashboard";

/**
 * `module` manda. Sin él la URL no declara módulo y **ningún** `tab` es legible:
 * se ignora entero en vez de adivinar.
 */
function tabVocabularyFor(module: string | null): TabVocabulary {
  if (module === "inventarios") return "inventario";
  return null;
}

/** El valor si pertenece al vocabulario dado, o `null` si viene de otro módulo. */
function oneOfOrNull<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/* ── Main Root Component ─────────────────────────────────────────────────── */

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  // ⚠️ El destino por defecto es el **Dashboard de la Tienda**, no un módulo: la
  // tienda existe primero y el Dashboard es su pantalla. El catálogo de módulos
  // sólo se abre pidiéndolo (`?module=modules-hub`), que es donde se acoplan.
  const [activeModule, setActiveModule] = useState<AppDestination>(
    () => oneOfOrNull(searchParams.get("module"), APP_DESTINATIONS) ?? "dashboard"
  );
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<any>("general");

  const handleOpenSettings = (tab: any = "general") => {
    setSettingsInitialTab(tab);
    setIsSettingsModalOpen(true);
  };
  const { activeBusiness, activeRole } = useBusiness();
  const activeRoleName = activeRole.name;
  const activeModules = activeBusiness?.activeModules || [];
  const hasPedidos = activeModules.includes("pedidos");
  const hasInventarios = activeModules.includes("inventarios");
  const hasAnyModule = hasPedidos || hasInventarios;

  // ⚠️ La sección de Pedidos se lee **contra el vocabulario del módulo**
  // (`oneOfSections`), no con un `as PedidosSection` a secas: así un
  // `?section=conversaciones` —residuo del módulo borrado— cae a la sección por
  // defecto en vez de quedar guardado como una sección que la barra del módulo no
  // puede marcar.
  const [pedidosSection, setPedidosSection] = useState<PedidosSection>(
    () => oneOfSections(searchParams.get("section")) ?? DEFAULT_PEDIDOS_SECTION
  );

  /**
   * ⚠️ La sección de WhatsApp se lee **contra el vocabulario del canal**, con el
   * mismo cuidado que la de Pedidos: los dos módulos comparten la clave `section`
   * de la URL, así que el valor sólo es legible si se contrasta con el `module`
   * que lo acompaña. Sin este contraste, un `?module=whatsapp&section=preparacion`
   * —sección de Pedidos— se guardaría tal cual y la barra del canal no podría
   * marcarla.
   */
  const [whatsappSection, setWhatsappSection] = useState<WhatsappSection>(
    () => oneOfConversationSections(searchParams.get("section")) ?? DEFAULT_WHATSAPP_SECTION
  );

  // ⚠️ `tab` es **una sola clave** que hoy sólo lee Inventarios. Se lee una vez, al
  // montar: de los cambios posteriores de la URL se ocupa el efecto de sincronía.
  const urlTab = searchParams.get("tab");
  const urlTabVocabulary = tabVocabularyFor(searchParams.get("module"));

  const [inventarioTab, setInventarioTab] = useState<InventoryTab>(() =>
    urlTabVocabulary === "inventario" ? oneOfOrNull(urlTab, INVENTORY_TABS) || "catalog" : "catalog"
  );

  // Redirección al destino que la sede puede honrar.
  //
  // ⚠️ Corrige el destino **activo**, no la URL. Antes escribía
  // `?module=inventarios&tab=…` / `?section=…&tab=…` y, como todavía no existía
  // ninguna vista de módulo (`MODULES_WITH_VIEWS`), la URL acababa prometiendo una
  // pantalla que no se pinta — y encima con la pestaña de otro módulo dentro.
  // 👉 Ahora que la vista de Pedidos existe, aquí es donde hay que volver a
  // publicar el destino en la URL para que el enlace sea compartible.
  useEffect(() => {
    // El Dashboard y el catálogo de módulos no dependen de tener módulos.
    if (activeModule === "dashboard" || activeModule === "modules-hub") return;

    // Una sede sin módulos no puede estar en un destino de módulo: no hay nada
    // que operar. Antes caía al catálogo —que era la única pantalla que existía—;
    // ahora cae al Dashboard, que es la pantalla de la sede.
    if (!hasAnyModule) {
      setActiveModule("dashboard");
      return;
    }

    // Pedidos no acoplado → no hay pantalla de Pedidos que pintar. Es el único
    // módulo con vista, así que sin él el destino de módulo no tiene cuerpo.
    if (activeModule === "pedidos" && !hasPedidos) {
      setActiveModule(hasInventarios ? "inventarios" : "dashboard");
    }
  }, [hasPedidos, hasInventarios, hasAnyModule, activeModule]);

  /**
   * Navega dentro de Pedidos. Es lo que consumen el catálogo de módulos
   * (`EmptyModulesHubView`) y el widget del Dashboard (§25) — que **piden** la
   * sección y dejan que el shell decida dónde llevarla.
   *
   * ⚠️ La sección se normaliza contra el vocabulario del módulo: un residuo como
   * `"operacion"` cae a Órdenes en vez de dejar el estado apuntando a una sección
   * que la barra del módulo no puede marcar.
   *
   * ⚠️⚠️ Y **publica el destino en la URL**. Antes sólo movía estado, así que
   * abrir el módulo desde el catálogo o desde el widget dejaba la barra de
   * direcciones en `?module=modules-hub`: el enlace no era compartible y —peor—
   * el efecto de sincronía de más abajo, que se dispara con `searchParams`, volvía
   * a aplicar el módulo de la URL vieja. Publicarlo es lo que hace que el catálogo
   * y la barra lateral converjan en el mismo destino.
   */
  const handleNavigatePedidos = (section: string) => {
    const target = oneOfSections(section) ?? DEFAULT_PEDIDOS_SECTION;
    setActiveModule("pedidos");
    setPedidosSection(target);
    setSearchParams(
      // La sección por defecto del módulo no se escribe, para no ensuciar el
      // enlace con el valor que ya implica la ausencia de `section`.
      target === DEFAULT_PEDIDOS_SECTION
        ? { module: "pedidos" }
        : { module: "pedidos", section: target },
      { replace: false }
    );
  };

  const handleNavigateInventario = (tab: InventoryTab) => {
    setActiveModule("inventarios");
    setInventarioTab(tab);
  };

  /**
   * Navega dentro del Canal conversacional.
   *
   * ⚠️ Igual que `handleNavigatePedidos`, **publica el destino en la URL**. Sin
   * eso, abrir el canal desde la barra dejaría la barra de direcciones describiendo
   * otra pantalla y el enlace no sería compartible.
   *
   * ⚠️ `conversaciones` es la sección por defecto y no se escribe: declarar el
   * valor implícito ensuciaría el enlace sin añadir información.
   */
  const handleNavigateWhatsapp = (section: string) => {
    const target = oneOfConversationSections(section) ?? "conversaciones";
    setActiveModule("whatsapp");
    setWhatsappSection(target);
    setSearchParams(
      target === "conversaciones" ? { module: "whatsapp" } : { module: "whatsapp", section: target },
      { replace: false }
    );
  };

  const handleNavigateModule = (mod: AppDestination) => {
    // ⚠️ Pedidos delega en su propio navegador: abre en su sección por defecto y
    // publica la sección. Con dos caminos para el mismo destino, uno acabaría
    // olvidando la URL —que es justo el fallo que dejaba el enlace sin compartir—.
    if (mod === "pedidos") {
      handleNavigatePedidos(DEFAULT_PEDIDOS_SECTION);
      return;
    }

    // ⚠️ El canal conversacional es un destino de la **sede**, no de un módulo
    // acoplado: no depende de `activeModules` (§5 — la capacidad de atender
    // conversaciones es de la tienda). Por eso no se filtra como Pedidos.
    if (mod === "whatsapp") {
      handleNavigateWhatsapp("conversaciones");
      return;
    }

    setActiveModule(mod);
    /**
     * ⚠️ El destino se **publica** en la URL. Antes sólo cambiaba el estado, así
     * que abrir un módulo desde la barra dejaba la barra de direcciones en `/app`:
     * el enlace no era compartible ni sobrevivía a un recargado.
     *
     * El Dashboard no lleva `module`: es el destino por defecto y `/app` ya lo
     * describe, así que declararlo sería escribir el valor implícito.
     */
    if (mod === "dashboard") {
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ module: mod }, { replace: false });
    }
  };

  /**
   * Sección del canal por defecto cuando la URL no trae una legible.
   *
   * ⚠️ Es una constante, no un literal repetido: el efecto de abajo la necesita
   * para decidir si la sección **cambió** al resolverse la URL, y una copia suelta
   * en cada sitio podría divergir de la que usa el estado inicial.
   */
  // Synchronize when URL parameters change (e.g. from CommandPalette, direct links, or Hub)
  //
  // ⚠️ La URL **propone** módulo/sección/pestaña y aquí se comprueba que la sede
  // pueda honrarlos: un `module`/`section` de un módulo que la tienda no tiene
  // activo no manda —igual que un `tab` de otro vocabulario—. Antes, cualquier
  // `?section=…` ponía el módulo activo en Pedidos aunque la sede no lo tuviera, y
  // eso deshacía la redirección de arriba, que es la que sabe qué módulos existen.
  useEffect(() => {
    const mod = searchParams.get("module");
    if (mod === "modules-hub") {
      setActiveModule("modules-hub");
      return;
    }
    if (mod === "inventarios") {
      if (!hasInventarios) return;
      setActiveModule("inventarios");
      // Sólo se adopta un `tab` que pertenezca al vocabulario de Inventarios:
      // `?tab=en-vivo` (pestaña del módulo borrado) ya no entra aquí. Antes se
      // guardaba tal cual y la URL describía una pestaña inexistente.
      const t = oneOfOrNull(searchParams.get("tab"), INVENTORY_TABS);
      if (t) {
        setInventarioTab(t);
      }
      return;
    }
    if (mod === "pedidos") {
      if (!hasPedidos) return;
      setActiveModule("pedidos");
      const s = oneOfSections(searchParams.get("section"));
      if (s) setPedidosSection(s);
      return;
    }
    if (mod === "whatsapp") {
      setActiveModule("whatsapp");
      /**
       * ⚠️ Se adopta un `section` del vocabulario **del canal**, o el de por
       * defecto si el valor no pertenece a él: `?module=whatsapp&section=preparacion`
       * —sección de Pedidos— cae a Conversaciones en vez de guardar una sección
       * que el canal no tiene.
       *
       * ⚠️⚠️ Y se escribe **siempre**, incluso cuando ya valía el valor por
       * defecto. Éste era el fallo real: si la sección ya estaba en
       * `"conversaciones"` —porque el canal se abrió antes—, asignarle el mismo
       * valor no cambiaba el estado, así que el efecto no se re-ejecutaba y
       * `activeModule` se quedaba en el destino **anterior**. Abrir
       * `?module=whatsapp&section=configuracion` desde `/app` no montaba el canal:
       * se quedaba en el Dashboard. Un `setState` con el mismo valor es invisible
       * para React y aquí era justamente lo que hacía falta ver.
       */
      const s = oneOfConversationSections(searchParams.get("section")) ?? DEFAULT_WHATSAPP_SECTION;
      setWhatsappSection(s);
      return;
    }

    const s = oneOfSections(searchParams.get("section"));
    if (!s) return;

    // ⚠️ `?section=configuracion` **sin** `module` es el alias histórico de enlace
    // profundo a Ajustes de Sede: abre el modal y deja la URL limpia. Se conserva
    // porque es una URL ya publicada y compartida, y varias guardas la usan.
    //
    // ⚠️ La desambiguación la hace la **ausencia de `module`**: con
    // `?module=pedidos&section=configuracion` la URL habla del módulo y abre su
    // sección Configuración; sin `module`, habla de la sede. Sin este criterio, el
    // nombre `configuracion` —que ahora es una sección legítima del módulo y antes
    // un alias— significaría dos cosas a la vez.
    if (s === "configuracion") {
      setIsSettingsModalOpen(true);
      setActiveModule(hasPedidos ? "pedidos" : "dashboard");
      setPedidosSection(DEFAULT_PEDIDOS_SECTION);
      setSearchParams({}, { replace: true });
      return;
    }

    if (!hasPedidos) return;
    setActiveModule("pedidos");
    setPedidosSection(s);
  }, [searchParams, hasPedidos, hasInventarios]);

  useEffect(() => {
    const unsubSettings = eventBus.subscribe("necto_open_settings", (payload) => {
      handleOpenSettings(payload.tab || "general");
    });
    return () => unsubSettings();
  }, []);

  // NOTE: the theme is owned exclusively by uiStore (it sets the `dark` class on
  // <html> and persists to localStorage). A local useState(false) effect used to
  // force light mode here on mount, which made /app permanently ignore the
  // user's choice. Do not reintroduce theme handling in this component.

  // Notificaciones: cola real, persistida en `necto_notifications` y alimentada
  // por el evento `necto_notification_created`. El array vacío de antes describía
  // un proveedor que no existía; ahora la campana lee de la cola.
  const notificationQueue = useNotifications();

  // Breadcrumb Labels Calculation
  // ⚠️ B7 (auditoría): las claves `insumos` y `gestion` no existen en sus propios tipos
  // (`GestionTab` / `PedidosSection`). Eran residuo del módulo borrado: tsc las marcaba
  // con TS2353 (objeto con propiedad desconocida). Al eliminarlas, los mapas vuelven a
  // ser exhaustivos y verificables por el compilador.
  // ⚠️ Los rótulos de las secciones de Pedidos **son** los del módulo: el mapa se
  // tipa contra `PedidosSection` (= `OrdersSectionKey`), así que una sección nueva
  // en `ORDERS_SECTIONS` rompe la compilación aquí hasta que se le ponga nombre.
  // Antes estas claves eran `conversaciones`, `whatsapp`, `menu`… — pantallas del
  // módulo borrado que el módulo nuevo (§26) no tiene.
  // ⚠️ Los rótulos se leen de `ORDERS_SECTION_META`, que es la **misma** fuente
  // que usa la barra del módulo y la barra lateral: tres listas paralelas harían
  // que "Historial y auditoría" fuera "Historial" en un sitio y otra cosa en otro.
  const pedidosSectionNames = Object.fromEntries(
    ORDERS_SECTION_META.map(meta => [meta.key, meta.label])
  ) as Record<PedidosSection, string>;

  /**
   * Los rótulos de las secciones del canal conversacional. Se tipan contra
   * `WhatsappSection`, que se deriva de `CONVERSATION_SECTIONS`: una sección nueva
   * en el canal rompe la compilación aquí hasta que se le ponga nombre.
   */
  const whatsappSectionNames: Record<WhatsappSection, string> = {
    conversaciones: "Conversaciones",
    configuracion: "Configuración",
  };

  const currentPageName =
    activeModule === "pedidos"
      ? (pedidosSectionNames[pedidosSection] ?? "Pedidos")
      : activeModule === "whatsapp"
      ? whatsappSectionNames[whatsappSection]
      : "Pedidos";

  /**
   * Los módulos que **tienen pantalla propia** dentro de `/app`.
   *
   * ⚠️ Es la única declaración que hace falta: el cuerpo de `/app` se elige por
   * `surface`, y `surface` se deriva de esta lista. Registrar aquí un módulo lo
   * manda a su vista sin tocar nada más — y por eso el breadcrumb ya no puede
   * describir una pantalla que no existe.
   *
   * ⚠️ `whatsapp` está aquí aunque **no** sea un `NectoModuleKey`: su `surface` es
   * la del canal conversacional, que pertenece a la sede y no al catálogo de
   * módulos acoplables (§5). La lista se llama "módulos" porque nació con Pedidos;
   * lo que describe de verdad es **qué destinos tienen cuerpo propio**.
   */
  const MODULES_WITH_VIEWS: string[] = ["pedidos", "whatsapp"];

  /** Lo que `/app` pinta de verdad, derivado —no corregido con un efecto—. */
  const surface: AppSurface = !activeBusiness
    ? // Sin sede no hay Dashboard que pintar: la sede es el sujeto de la pantalla.
      // Se cae al catálogo de módulos, que sí sabe trabajar sin tienda.
      "module-catalogue"
    : MODULES_WITH_VIEWS.includes(activeModule)
    ? "module-view"
    : activeModule === "modules-hub"
    ? "module-catalogue"
    : "store-dashboard";

  /**
   * El destino que la barra lateral debe marcar: el que **está en pantalla**. Si
   * marcara el pedido en vez del efectivo, la barra diría "Pedidos" con el
   * Dashboard pintado — la misma desincronización que el breadcrumb tenía.
   */
  const activeDestination: AppDestination =
    surface === "module-view"
      ? activeModule
      : surface === "module-catalogue"
      ? "modules-hub"
      : "dashboard";

  const pageTitle =
    surface === "store-dashboard"
      ? "Dashboard de tienda"
      : surface === "module-catalogue"
      ? "Módulos de tienda"
      : activeModule === "inventarios"
      ? (inventarioTab === "valuation"
          ? "Valor de inventario"
          : inventarioTab === "locations"
          ? "Bodegas y sucursales"
          : inventarioTab === "purchasing"
          ? "Compras y facturas"
          : inventarioTab === "kardex"
          ? "Historial de movimientos"
          : inventarioTab === "pricelists"
          ? "Listas de precios"
          : "Productos y servicios")
      : currentPageName;



  const breadcrumbItems: BreadcrumbItem[] =
    surface === "store-dashboard"
      ? [
          { label: "Sede y tienda", href: "/app" },
          { label: "Dashboard" },
        ]
      : surface === "module-catalogue"
      ? [
          { label: "Sede y tienda", href: "/app" },
          { label: "Módulos de tienda" },
        ]
      : [
          // ⚠️ El breadcrumb describe lo que **está en pantalla**. Con la vista de
          // Pedidos ya montada, esto es de verdad "Operación / Pedidos / <sección>"
          // — antes declaraba esas migas mientras el cuerpo pintaba el catálogo.
          { label: "Operación", href: "/app" },
          {
            label:
              activeModule === "whatsapp"
                ? "Canal conversacional"
                : activeModule === "inventarios"
                ? "Inventario"
                : "Pedidos",
            href:
              activeModule === "whatsapp"
                ? "/app?module=whatsapp"
                : activeModule === "inventarios"
                ? "/app?module=inventarios"
                : "/app?module=pedidos",
          },
          { label: pageTitle },
        ];

  return (
    <>
      <BaseAppShell
        sidebar={
          <StockFlowSidebar
            activeModule={activeDestination}
            onNavigateModule={handleNavigateModule}
            onOpenSettingsModal={handleOpenSettings}
            // ⚠️ Los sub-destinos de Pedidos se pasan **desde aquí**: la barra
            // lateral no conoce el módulo, sólo pinta los enlaces que el shell le
            // da. Y la sección activa entra para que la barra marque dónde está el
            // operador dentro del módulo, igual que marca el módulo dentro de la sede.
            activeOrdersSection={pedidosSection}
            onNavigateOrdersSection={section => handleNavigatePedidos(section)}
            activeRoleName={activeRoleName}
          />
        }
        header={
          <StockFlowHeader
            breadcrumbItems={breadcrumbItems}
            notificationsDropdown={
              <NotificationBellDropdown queue={notificationQueue} />
            }
          />
        }
        footer={<AppFooter />}
      >
        <BasePageLayout
          // ⚠️ El encabezado lo pone **la pantalla**, no el destino pedido. El
          // Dashboard ya lleva su propio titular —el widget de identidad pinta el
          // nombre de la sede y su lema—, y la vista de Pedidos trae su propia
          // navegación de secciones, así que un `BasePageHeader` encima repetiría
          // el título. El catálogo de módulos sí lo necesita: su cuerpo no tiene
          // titular propio.
          header={
            surface === "module-catalogue" ? (
              <BasePageHeader
                title={pageTitle}
                breadcrumbItems={breadcrumbItems}
              />
            ) : null
          }
        >
          {/* ── El cuerpo se elige por `surface` (§30, Fase 4) ────────────────
           *
           * ⚠️ `surface` describe lo que hay **de verdad** en pantalla, no lo que
           * se pidió: mientras el catálogo era la única pantalla daba igual, pero
           * ahora que el Dashboard es el destino por defecto y Pedidos tiene vista,
           * pintar una cosa con el encabezado de otra sería describir una pantalla
           * y mostrar otra.
           *
           * ⚠️ El `OrdersProvider` se monta **aquí**, por encima de las dos
           * pantallas que lo consumen: la vista del módulo y el widget de Pedidos
           * del Dashboard (§25). Si viviera dentro de `OrdersModule`, el widget
           * —que se pinta dentro del Dashboard, fuera del módulo— no tendría
           * provider y `useOrders()` lanzaría. Montándolo una sola vez, ambas
           * pantallas comparten las mismas órdenes y el mismo `transitionOrder`.
           */}
          <OrdersProvider businessId={activeBusiness?.id ?? null}>
            <ConversationsProvider businessId={activeBusiness?.id ?? null}>
              {surface === "store-dashboard" && activeBusiness ? (
                <StoreDashboard
                  business={activeBusiness}
                  onOpenSettings={handleOpenSettings}
                  onOpenModules={() => handleNavigateModule("modules-hub")}
                  // §25 — el widget de Pedidos **pide** la sección; el shell decide
                  // a dónde lleva. Es la única vía por la que el Dashboard navega a
                  // un módulo, y no conoce ni la ruta ni el vocabulario de secciones.
                  onOpenModuleView={(moduleKey, section) => {
                    if (moduleKey === "pedidos")
                      handleNavigatePedidos(section ?? DEFAULT_PEDIDOS_SECTION);
                  }}
                  // El canal conversacional no es un módulo acoplable: su puerta va
                  // aparte, y el widget la usa para la fila de WhatsApp (§5).
                  onOpenConversations={() => handleNavigateWhatsapp("conversaciones")}
                />
              ) : surface === "module-view" && activeModule === "pedidos" ? (
                <OrdersModule
                  initialSection={pedidosSection}
                  // Puentes de §17/§26: el módulo no reimplementa lo que es de la
                  // Tienda — abre sus Ajustes y deja que el modal de la sede decida.
                  onOpenStoreChannels={() => handleOpenSettings("channels")}
                  onOpenStoreSettings={() => handleOpenSettings()}
                  // ⚠️ La sección es del módulo, pero **publicarla es del shell**:
                  // el módulo no conoce la ruta. Sin esto, navegar a "Despacho"
                  // dentro del módulo dejaba la URL diciendo `bandeja`.
                  onSectionChange={section => {
                    setPedidosSection(section);
                    setSearchParams(
                      section === DEFAULT_PEDIDOS_SECTION
                        ? { module: "pedidos" }
                        : { module: "pedidos", section },
                      { replace: true }
                    );
                  }}
                />
              ) : surface === "module-view" && activeModule === "whatsapp" ? (
                /**
                 * ⚠️ El canal conversacional es una superficie de la **sede**, no
                 * del catálogo de módulos acoplables (§5): se pinta siempre que
                 * haya tienda, igual que el Dashboard. Su provider se monta arriba,
                 * junto al de Pedidos, para que el canal pueda alimentar mañana
                 * otro consumidor sin cambiar este archivo.
                 *
                 * ⚠️ `onOpenStoreChannels` es un **puente**: el canal no administra
                 * su propia conexión —eso es de la sede—, sólo pide que se abra
                 * donde corresponde. Es el mismo reparto que usa Pedidos (§18).
                 */
                <ConversationsModule
                  initialSection={whatsappSection}
                  onOpenStoreChannels={() => handleOpenSettings("channels")}
                  onSectionChange={section => {
                    setWhatsappSection(section);
                    setSearchParams(
                      section === "conversaciones"
                        ? { module: "whatsapp" }
                        : { module: "whatsapp", section },
                      { replace: true }
                    );
                  }}
                />
              ) : (
                <EmptyModulesHubView
                  business={activeBusiness}
                  onNavigateToModule={(mod) => {
                    if (mod === "pedidos") {
                      handleNavigatePedidos(DEFAULT_PEDIDOS_SECTION);
                    } else if (mod === "inventarios") {
                      handleNavigateInventario("catalog");
                    }
                  }}
                  onOpenSettings={handleOpenSettings}
                />
              )}
            </ConversationsProvider>
          </OrdersProvider>
        </BasePageLayout>
      </BaseAppShell>

      <CommandPalette />
      <BusinessSettingsModal
        business={activeBusiness}
        isOpen={isSettingsModalOpen}
        initialTab={settingsInitialTab}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
}
