import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useBusiness, BusinessInstance } from "../../context/BusinessContext";
import { isChannelConnected } from "../../context/business/channel-connections.utils";
import { useAuth } from "../../auth/AuthContext";
import { rememberPendingAction } from "./pending-action";
import { BusinessIcon } from "./BusinessIcon";
import { BusinessSettingsModal } from "./BusinessSettingsModal";
import {
  Activity,
  ArrowRight,
  BarChart2,
  Blocks,
  History,
  ImageIcon,
  MessageCircle,
  Plus,
  Settings,
  Store,
} from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  CardDescription,
  CardTitle,
} from "@/elements";
import { BasePageHeader } from "@/layouts/base-page";
import { HomeIcon } from "@/elements/ui/breadcrumb";

type AnalyticsTab = "resumen" | "historial" | "analitica";

/**
 * Contenedor de ícono del blueprint **IconCard** de la referencia.
 *
 * Es el mismo `h-14 max-w-14 rounded-[10.5px]` que usa `SelectCard` en
 * `SeleccionarPage`, para que las tarjetas de esta pantalla hablen el mismo
 * idioma visual que el resto del sistema.
 */
const ICON_TILE =
  "flex h-14 max-w-14 items-center justify-center rounded-[10.5px] bg-brand-50 text-brand-500 transition-colors dark:bg-brand-500/10 dark:text-brand-400";

/**
 * Acción terciaria de tarjeta: **sólo ícono**.
 *
 * Es un `<button>` nativo y no el `Button` del DS porque `Button` no reenvía
 * props nativas (`aria-label` se perdería): su contrato sólo acepta `title`.
 * Un control sin etiqueta visible necesita las dos cosas.
 */
const ICON_ACTION =
  "inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full text-gray-500 ring-1 ring-inset ring-gray-300 transition-colors hover:bg-gray-50 hover:text-brand-500 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-brand-400";

const CARD_NAME =
  "truncate text-lg font-bold leading-snug tracking-tight text-gray-800 transition-colors group-hover:text-brand-500 dark:text-white/90";

const CARD_SPECIALTY =
  "mt-1 truncate text-theme-xs font-medium text-gray-500 dark:text-gray-400";

/* ── Resumen del grupo ──────────────────────────────────────────────────
 * Los cuatro números del encabezado salen **todos** del registro de las
 * sedes: no hay métricas de módulos inventadas. Es la misma disciplina que
 * el Dashboard de tienda (`collectStoreActivity` devuelve `[]` cuando no
 * hay nada que contar) aplicada al ámbito del grupo.
 * ───────────────────────────────────────────────────────────────────── */

type MetricTone = "success" | "warning" | "muted";

const METRIC_CHIP: Record<MetricTone, string> = {
  success:
    "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
  warning:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500",
  muted: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

/**
 * Tarjeta de métrica — el bloque de resumen de la referencia.
 *
 * Ícono arriba a la izquierda, dato abajo, y un chip con el **contexto** del
 * número (no una tendencia: no hay serie histórica que la sostenga, e
 * inventarla sería justo lo que la referencia hace y este producto no debe).
 *
 * La superficie es el `Card` del catálogo, no una copia a mano de sus clases:
 * antes era un `<div>` con `rounded-xl border border-gray-200 bg-white p-5
 * dark:border-gray-800 dark:bg-white/[0.03]` — la base de `Card` transcrita,
 * que se desincroniza en cuanto la base cambie. El `p-5 sm:p-5` neutraliza el
 * `sm:p-6` de la base para conservar el p-5 en todos los anchos; computado, el
 * resultado es idéntico al anterior.
 *
 * Por qué NO la composición `MetricCard` del catálogo. El flujo la devolvió
 * como candidato nº 1 para este intento y es el candidato natural — "KPI
 * display card" es literalmente su descripción; de hecho el proyecto ya la
 * tiene vendida (`compositions/metric-card`) y la usa en `/analitica`. No
 * encaja aquí por el **chip**: `MetricCard` deriva el color del badge de
 * `trend` (binario: `up`→`success`, `down`→`error`) y le antepone una flecha.
 * El chip de esta pantalla no es una tendencia sino un **contexto**, y tiene
 * tres tonos (success / warning / muted): `MetricCard` sólo puede expresar dos,
 * y ninguno de ellos es el neutro. Además su `Card` fija `shadow-theme-xs`
 * (sombra en reposo, que aquí no existe) y `dark:bg-gray-900`, cuando la base
 * del DS es `dark:bg-white/[0.03]`.
 */
const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  chip: React.ReactNode;
  tone: MetricTone;
}> = ({ icon, label, value, chip, tone }) => (
  <Card className="p-5 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <span className="flex size-12 flex-none items-center justify-center rounded-xl bg-gray-100 text-secondary-600 dark:bg-gray-800 dark:text-white/90">
        {icon}
      </span>
      <span
        className={`inline-flex flex-none items-center rounded-full px-2.5 py-1 text-theme-xs font-medium ${METRIC_CHIP[tone]}`}
      >
        {chip}
      </span>
    </div>
    <p className="mt-4 text-theme-sm text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <p className="mt-1 text-theme-xl font-bold text-gray-800 dark:text-white/90">
      {value}
    </p>
  </Card>
);

/**
 * Un dato de la ficha de sede.
 *
 * Sustituye la línea corrida `SUC-01 · COP · 2 módulos` por columnas
 * rotuladas: el mismo dato, pero se puede **leer de un vistazo** en lugar de
 * tener que parsear separadores.
 */
const CardFact: React.FC<{ label: string; value: string; emphasis?: boolean }> = ({
  label,
  value,
  emphasis,
}) => (
  <div className="min-w-0 px-3 first:pl-0 last:pr-0">
    <span className="block truncate text-theme-xs font-medium text-gray-400 dark:text-gray-500">
      {label}
    </span>
    <span
      className={`mt-0.5 block truncate text-theme-sm font-semibold ${
        emphasis
          ? "text-secondary-600 dark:text-white/90"
          : "text-gray-700 dark:text-gray-300"
      }`}
    >
      {value}
    </span>
  </div>
);

/**
 * Estado operativo de la sede.
 *
 * ⚠️ El estado **no** es un adorno fijo: la píldora decía "Operando" incluso
 * con la sede en pausa, porque el literal estaba escrito a mano. El estado
 * real lo posee `pauseConfig.isPaused` (no existe un campo `status`), así que
 * la píldora lo lee. Además el resumen del grupo cuenta pausas: si la tarjeta
 * dijera siempre "Operando", el contador del encabezado sería indemostrable.
 */
const StatusPill: React.FC<{
  paused: boolean;
  onCover?: boolean;
  className?: string;
}> = ({ paused, onCover, className = "" }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-bold text-gray-800 ${
      onCover
        ? "bg-white/95 shadow-theme-xs ring-1 ring-black/5 backdrop-blur-md"
        : "bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
    } ${className}`}
  >
    <span
      className={`size-1.5 rounded-full ${paused ? "bg-warning-500" : "bg-success-500"}`}
    />
    {paused ? "En pausa" : "Operando"}
  </span>
);

/** Logo de la sede — solapado sobre la portada, o en fila cuando no hay. */
const StoreLogo: React.FC<{ biz: BusinessInstance; overlap?: boolean }> = ({
  biz,
  overlap,
}) => (
  <div
    className={`flex size-14 flex-none items-center justify-center overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800 ${
      overlap ? "ring-4 ring-white dark:ring-gray-900" : ""
    }`}
  >
    {biz.logoUrl ? (
      <img
        src={biz.logoUrl}
        alt={biz.name}
        style={{
          transform: biz.logoTransform
            ? `rotate(${biz.logoTransform.rotate || 0}deg) scale(${biz.logoTransform.scale || 1}) translate(${biz.logoTransform.posX || 0}%, ${biz.logoTransform.posY || 0}%)`
            : undefined,
        }}
        className="h-full w-full object-cover"
      />
    ) : (
      <BusinessIcon iconKey={biz.iconKey} className="size-7 text-brand-500" />
    )}
  </div>
);

/** Abre el editor de portada y logo de la sede. */
const CoverButton: React.FC<{
  onOpen: () => void;
  className: string;
  children: React.ReactNode;
}> = ({ onOpen, className, children }) => (
  <button
    type="button"
    title="Editar portada y logo de esta sede"
    aria-label="Editar portada y logo de esta sede"
    onClick={e => {
      e.stopPropagation();
      onOpen();
    }}
    className={className}
  >
    {children}
  </button>
);

export const GlobalFranchiseOverview: React.FC = () => {
  const navigate = useNavigate();
  const { businesses, switchBusiness } = useBusiness();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const [selectedBusinessForSettings, setSelectedBusinessForSettings] =
    useState<BusinessInstance | null>(null);
  const [settingsTab, setSettingsTab] = useState<string>("general");

  /**
   * Resumen del grupo, derivado del registro de sedes.
   *
   * `modules` cuenta módulos **distintos** en todo el grupo (no la suma): dos
   * sedes con `pedidos` son una capacidad acoplada, no dos. Hoy da 0 porque
   * ningún módulo está implementado, y el chip lo dice en lugar de esconderlo.
   */
  const summary = useMemo(() => {
    const total = businesses.length;
    const paused = businesses.filter(b => b.pauseConfig?.isPaused).length;
    const cities = new Set(
      businesses.map(b => b.city?.trim()).filter((c): c is string => Boolean(c))
    ).size;
    return {
      total,
      paused,
      operating: total - paused,
      cities,
      withChannel: businesses.filter(b => isChannelConnected(b, "whatsapp"))
        .length,
      modules: new Set(businesses.flatMap(b => b.activeModules)).size,
      sedesWithModules: businesses.filter(b => b.activeModules.length > 0)
        .length,
    };
  }, [businesses]);

  /**
   * Entra en la sede: la marca como activa y abre su operación.
   *
   * ⚠️ Antes, pulsar la tarjeta abría el selector de perfil de acceso (y por eso
   * "Entrar" y la tarjeta hacían cosas distintas: la tarjeta **no** cambiaba de
   * sede). Con un único rol —Admin Cliente, §5.3— no hay perfil que elegir, así
   * que la tarjeta y el botón hacen lo mismo.
   *
   * ⚠️⚠️ La URL era `/app?section=operacion&tab=en-vivo` — **residuo del módulo
   * borrado** (el que tenía `OperacionTab` y un `tab=en-vivo` de inventario).
   * Ninguno de los dos valores existe hoy: `oneOfSections("operacion")` devuelve
   * `null`, así que la sincronía de `NectoApp` no cambiaba el módulo activo y el
   * usuario aterrizaba en el Dashboard creyendo que el módulo no cargaba. Los
   * valores muertos se retiran: la sede entra en su pantalla por defecto.
   */
  const enterBusiness = (biz: BusinessInstance) => {
    switchBusiness(biz.id);
    navigate("/app");
  };

  /** Opens the settings surface straight onto the relevant tab. */
  const openSettings = (biz: BusinessInstance, tab: string = "general") => {
    setSettingsTab(tab);
    setSelectedBusinessForSettings(biz);
  };

  const goToAnalitica = (bizId: string, tab: AnalyticsTab) => {
    switchBusiness(bizId);
    navigate("/analitica", { state: { bizId, tab } });
  };

  /**
   * Abre el alta de sucursal — el **único** camino del hub hacia `/onboarding`.
   *
   * El hub es público, así que este botón puede pulsarse sin sesión. Antes se
   * navegaba a `/onboarding` y era `OnboardingPage` quien, ya dentro, expulsaba a
   * `/login`: el usuario veía un panel de sedes con el botón habilitado y
   * acababa en un formulario de acceso sin que nada lo anunciara.
   *
   * Aquí la decisión se toma **antes de salir**, que es donde el usuario puede
   * entenderla, y se anota la intención para que el login lo devuelva al alta.
   * Mientras el perfil se rehidrata no se decide nada: redirigir a mitad de
   * carga es justo lo que producía el salto.
   */
  const startBranchCreation = () => {
    if (isAuthLoading) return;
    if (!profile) {
      rememberPendingAction("branch.create");
      navigate("/login");
      return;
    }
    navigate("/onboarding");
  };

  return (
    <div className="w-full antialiased">
      <BasePageHeader
        title="Visión consolidada"
        breadcrumbItems={[
          { label: "Inicio", href: "/", icon: <HomeIcon /> },
          { label: "Hub de sedes" },
        ]}
      />

      {/* ── Description + actions ──────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-xl text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Consolidación financiera, operativa y gestión centralizada de todas tus
          sucursales y marcas.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            intent="hub.audit.global"
            startIcon={<BarChart2 className="size-4" />}
            onClick={() => navigate("/analitica")}
            className="rounded-full px-5"
          >
            Analítica
          </Button>
          <Button
            size="sm"
            variant="primary"
            intent="hub.branch.create"
            startIcon={<Plus className="size-4" />}
            onClick={startBranchCreation}
            className="rounded-full px-5"
          >
            Nueva sucursal
          </Button>
        </div>
      </div>

      {/* ── Resumen del grupo ──────────────────────────────────────── */}
      {/* Sólo con sedes: cuatro ceros no resumen nada, son ruido. */}
      {summary.total > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Store className="size-6" />}
            label="Sucursales"
            value={summary.total}
            tone="muted"
            chip={
              summary.cities > 0
                ? `${summary.cities} ${summary.cities === 1 ? "ciudad" : "ciudades"}`
                : "Sin ciudad"
            }
          />
          <MetricCard
            icon={<Activity className="size-6" />}
            label="Operando ahora"
            value={summary.operating}
            tone={summary.paused > 0 ? "warning" : "success"}
            chip={
              summary.paused > 0
                ? `${summary.paused} en pausa`
                : "Todas operando"
            }
          />
          <MetricCard
            icon={<MessageCircle className="size-6" />}
            label="Con WhatsApp"
            value={summary.withChannel}
            tone="muted"
            chip={`de ${summary.total} ${summary.total === 1 ? "sede" : "sedes"}`}
          />
          <MetricCard
            icon={<Blocks className="size-6" />}
            label="Módulos acoplados"
            value={summary.modules}
            tone="muted"
            chip={
              summary.modules === 0
                ? "Aún sin acoplar"
                : `en ${summary.sedesWithModules} ${summary.sedesWithModules === 1 ? "sede" : "sedes"}`
            }
          />
        </div>
      )}

      {/* ── Branches ───────────────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Sucursales y marcas
            </h3>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-theme-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {businesses.length}
            </span>
          </div>
          <span className="hidden text-theme-xs text-gray-400 sm:inline dark:text-gray-500">
            Elige una sede para entrar al panel de operaciones o ajustar su configuración
          </span>
        </div>

        {businesses.length === 0 ? (
          /* ── Empty state — a Card centred in the region, not a brand hero ── */
          <div className="flex justify-center py-6 sm:py-10">
            <Card className="w-full max-w-lg">
              <CardBody className="flex flex-col items-center text-center">
                <div className={ICON_TILE}>
                  <Store className="size-7" />
                </div>
                <CardTitle className="mb-0 mt-5">Aún no tienes sucursales</CardTitle>
                <CardDescription className="mt-2 max-w-md">
                  Crea tu primera tienda y Necto preparará el catálogo, las existencias y los canales según tu modelo.
                </CardDescription>
                <Button
                  variant="primary"
                  intent="hub.branch.create.empty"
                  startIcon={<Plus className="size-4" />}
                  onClick={startBranchCreation}
                  className="mt-7 rounded-full px-6"
                >
                  Crear mi primera tienda
                </Button>
              </CardBody>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {businesses.map(biz => {
              /**
               * La portada es **contenido** (el banner que subió la sede), no
               * un adorno. Sin banner no se pinta una losa falsa: la tarjeta
               * abre con la fila de identidad y el logo en su sitio.
               *
               * ⚠️ Antes el respaldo era un bloque `bg-brand-500` a sangre. Con
               * tres sedes sin portada la pantalla eran tres losas naranjas
               * grandes —el acento dejaba de señalar nada— y al aclararlo el
               * hueco se leía como un área sin cargar. Quitarlo resuelve las
               * dos cosas: el acento vuelve al CTA y a las acciones, y las
               * sedes que **sí** tienen banner se distinguen de un vistazo.
               */
              const hasBanner = Boolean(biz.bannerUrl);
              const paused = Boolean(biz.pauseConfig?.isPaused);

              return (
                <Card
                  key={biz.id}
                  onClick={() => enterBusiness(biz)}
                  className="group flex cursor-pointer flex-col overflow-hidden p-0 transition-shadow duration-300 hover:shadow-theme-md sm:p-0"
                >
                  {hasBanner && (
                    <div className="relative h-36 w-full flex-none overflow-hidden">
                      <img
                        src={biz.bannerUrl}
                        alt={biz.name}
                        style={{
                          transform: biz.bannerTransform
                            ? `rotate(${biz.bannerTransform.rotate || 0}deg) scale(${biz.bannerTransform.scale || 1}) translate(${biz.bannerTransform.posX || 0}%, ${biz.bannerTransform.posY || 0}%)`
                            : undefined,
                        }}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

                      <StatusPill paused={paused} onCover className="absolute left-3 top-3 z-10" />

                      <CoverButton
                        onOpen={() => openSettings(biz, "branding")}
                        className="absolute right-3 top-3 z-10 inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/95 text-secondary-600 shadow-theme-xs ring-1 ring-black/5 backdrop-blur-md transition-colors hover:bg-white hover:text-brand-500"
                      >
                        <ImageIcon className="size-3.5" />
                      </CoverButton>
                    </div>
                  )}

                  {/* Body */}
                  <div className="flex flex-1 flex-col px-5 pb-4">
                    {hasBanner ? (
                      <>
                        {/* Logo — overlaps the cover, exactly as the storefront
                            renders it. `relative z-10` is load-bearing: the cover
                            is `position: relative`, so without it the positioned
                            cover paints OVER the static badge and eats the top
                            half of the logo. */}
                        <div className="relative z-10 -mt-7 flex items-end">
                          <StoreLogo biz={biz} overlap />
                        </div>
                        <div className="mt-3.5 min-w-0">
                          <h4 className={CARD_NAME}>{biz.name}</h4>
                          <p className={CARD_SPECIALTY}>
                            {[biz.specialty, biz.city].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </>
                    ) : (
                      /* Sin banner: identidad en una fila. El logo, el nombre y
                         el estado caben juntos, así que la tarjeta no reserva
                         alto para una portada que no existe. */
                      <div className="flex items-start gap-3 pt-5">
                        <StoreLogo biz={biz} />
                        <div className="min-w-0 flex-1">
                          <h4 className={CARD_NAME}>{biz.name}</h4>
                          <p className={CARD_SPECIALTY}>
                            {[biz.specialty, biz.city].filter(Boolean).join(" · ")}
                          </p>
                          <StatusPill paused={paused} className="mt-2.5" />
                        </div>
                        <CoverButton
                          onOpen={() => openSettings(biz, "branding")}
                          className={ICON_ACTION}
                        >
                          <ImageIcon className="size-3.5" />
                        </CoverButton>
                      </div>
                    )}

                    {/* Ficha de la sede — columnas rotuladas con hairline, no
                        una línea corrida con separadores que hay que parsear.
                        ⚠️ Va anclada al pie (`mt-auto`): en una fila de rejilla
                        las tarjetas se estiran a la más alta, y sin el ancla el
                        sobrante caía entre la ficha y las acciones, dejando un
                        hueco en el medio. Así el aire queda junto a la
                        identidad, que es donde no molesta. */}
                    <div className="mt-auto pt-4">
                      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 pt-3.5 dark:divide-gray-800 dark:border-gray-800">
                        <CardFact label="Código" value={biz.code || "—"} emphasis />
                        <CardFact label="Moneda" value={biz.currency} />
                        <CardFact
                          label="Módulos"
                          value={String(biz.activeModules.length)}
                        />
                      </div>
                    </div>

                    {/* Actions — stopPropagation so card-level select does not fire */}
                    <div
                      className="pt-4"
                      onClick={e => e.stopPropagation()}
                      role="presentation"
                    >
                      {/* Una sola fila: CTA a sangre + dos acciones de ícono.
                          Antes eran dos filas (la segunda, "Historial de ventas"
                          a todo lo ancho) y la tarjeta crecía sin ganar nada. */}
                      <div className="flex items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
                        <Button
                          size="sm"
                          variant="primary"
                          intent="hub.branch.enter"
                          onClick={() => enterBusiness(biz)}
                          endIcon={<ArrowRight className="size-4" />}
                          className="flex-1 rounded-full"
                        >
                          Entrar
                        </Button>
                        <button
                          type="button"
                          title="Configurar la imagen, el asistente y los ajustes de la sede"
                          aria-label="Configurar la imagen, el asistente y los ajustes de la sede"
                          onClick={() => openSettings(biz)}
                          className={ICON_ACTION}
                        >
                          <Settings className="size-4" />
                        </button>
                        <button
                          type="button"
                          title="Historial de ventas"
                          aria-label="Historial de ventas"
                          onClick={() => goToAnalitica(biz.id, "historial")}
                          className={ICON_ACTION}
                        >
                          <History className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Add-branch tile — same dialect as the reference's SelectCard */}
            <button
              type="button"
              onClick={startBranchCreation}
              className="group flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 p-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-800 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5"
            >
              <span className="flex h-14 max-w-14 items-center justify-center rounded-[10.5px] bg-brand-50 text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white dark:bg-brand-500/10 dark:text-brand-400 dark:group-hover:bg-brand-500 dark:group-hover:text-white">
                <Plus className="size-6" />
              </span>
              <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                Nueva sucursal
              </span>
              <span className="max-w-[180px] text-theme-xs leading-relaxed text-gray-400 dark:text-gray-500">
                Suma otra marca o sede al grupo en minutos
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Business Settings Modal (Edit Mode) */}
      {selectedBusinessForSettings && (
        <BusinessSettingsModal
          key={selectedBusinessForSettings.id}
          business={selectedBusinessForSettings}
          isOpen={Boolean(selectedBusinessForSettings)}
          initialTab={settingsTab}
          onClose={() => setSelectedBusinessForSettings(null)}
        />
      )}
    </div>
  );
};

export default GlobalFranchiseOverview;
