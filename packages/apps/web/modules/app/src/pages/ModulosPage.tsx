import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { Layers, Plus, ArrowRight } from "lucide-react";
import { BaseAppHeader } from "@/shell";
import { ThemeToggleButton } from "@/shell";
import NotificationDropdown from "@/shell/header/NotificationDropdown";
import UserDropdown from "@/shell/header/UserDropdown";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { CartIcon } from "@/icons";
import { NectoLogo } from "@/compositions/shared/NectoLogo";
import {
  MetricasVivas,
  AtajosRapidos,
  TarjetaProximo,
  metricasPedidosHoy,
  modulosProximos,
  ATAJOS_PEDIDOS,
} from "@/pages/modulos/TarjetasModulo";
import { ModalEspecificaciones } from "@/pages/modulos/ModalEspecificaciones";
import {
  organizacionStore,
  pedidosStore,
  sessionStore,
  modulosOperablesDeSesion,
  CATALOGO_MODULOS,
} from "@/stores";
import type { InfoModuloNegocio } from "@/stores/plataforma.store";
import {
  BUSINESS_PROFILES,
  type BusinessProfileType,
} from "@/domain/pedidos/pedidos.profiles";

/**
 * Módulos de la organización — la pantalla de «qué tiene contratado esta empresa».
 *
 * Se llamaba `WorkspacesPage` y se servía en tres rutas (`/workspaces`, `/modulos`,
 * `/workspace/modulos`). «Workspace» y «Organización» eran la misma cosa con dos
 * nombres, y esa ambigüedad es la que hacía que nadie supiera cuál era la canónica.
 * Se quedó «Organización»: la ruta es `/modulos` y las otras dos redirigen aquí.
 *
 * Nota de alcance: la rejilla de abajo sigue listando **solo Pedidos** a mano. Es
 * correcto mientras `Modulo = "pedidos"` sea el único valor del tipo, pero el día
 * que entre Inventario hay que derivarla del catálogo.
 */
/**
 * Identidad del único módulo que esta rejilla pinta.
 *
 * La rejilla sigue listando solo Pedidos a mano (correcto mientras
 * `Modulo = "pedidos"` sea el único valor del tipo), pero su nombre y su
 * descripción salen del catálogo: escribirlos aquí otra vez es cómo aparecieron
 * tres descripciones distintas del mismo módulo.
 */
const MODULO_PEDIDOS = CATALOGO_MODULOS.pedidos;

export const ModulosPage = observer(() => {
  const navigate = useNavigate();
  const org = organizacionStore.organizacion;
  const tienePedidos = organizacionStore.tieneModuloPedidos;

  // Módulo cuyas especificaciones se están mirando (o `null`).
  const [moduloEspecificado, setModuloEspecificado] = useState<InfoModuloNegocio | null>(null);

  const perfilActualKey = (pedidosStore.config.perfilComercial || "food") as BusinessProfileType;
  const perfilActual = BUSINESS_PROFILES[perfilActualKey] || BUSINESS_PROFILES.food;

  // Métricas de hoy. `metricasPedidosHoy()` es una función pura sobre el store;
  // el `observer` de este componente la re-ejecuta cuando el store cambia, así
  // que los números siguen al negocio sin ningún polling.
  const metricas = metricasPedidosHoy();

  // Solo si el módulo está activo: si la organización no tiene Pedidos
  // instalados, los atajos a sus subrutas son enlaces a un módulo que no está.
  const proximos = tienePedidos
    ? modulosProximos(organizacionStore.modulosActivos)
    : modulosProximos([]);

  const handleEntrarPedidos = () => {
    // Re-deriva la pertenencia de la sesión desde la organización
    // (`Sesión ⊆ Organización`) **preservando el tipo de sesión**.
    //
    // Antes decía `"administrador"` fijo, y eso era una escalada: bastaba con
    // abrir `/modulos` y pulsar este botón para obtener una sesión de
    // administrador sin credenciales. La ruta ya no es anónima (ver `App.tsx`),
    // pero el tipo de sesión tampoco es algo que un botón de navegación deba
    // conceder — quien entra aquí ya tiene `team.manage`.
    //
    // Queda un segundo resto del mismo defecto, más difícil de ver: el fallback
    // `sessionStore.tipoSesion ?? "administrador"`. Con una sesión simulada
    // cuyo `tipoSesion` persistido sea nulo (clave antigua, o `localStorage`
    // editado a mano) el `??` **fabricaba** el tipo. Ahora el tipo se lee del
    // `accessContext` —la fuente resuelta— y si no hay ninguno **no se toca la
    // sesión**: navegar no es autenticar.
    //
    // No se re-deriva mientras se simula: `simular()` restringe los módulos de la
    // sesión a los del operador a propósito, y re-derivarlos de la organización
    // los ampliaría.
    const tipoActual = sessionStore.accessContext.tipoSesion;
    if (!sessionStore.isSimulando && tipoActual) {
      sessionStore.configurar(
        modulosOperablesDeSesion(organizacionStore.modulosActivos),
        tipoActual,
      );
    }
    navigate("/pedidos/inicio");
  };

  // Aquí vivía `handleDesinstalarPedidos`, que escribía en `organizacionStore`
  // (una sola llamada: la pertenencia tiene un único dueño). Se retiró junto con
  // el botón «Desinstalar» de la tarjeta: la baja de un módulo es administración
  // avanzada y destructiva, y su sitio es `/configuracion?tab=modulos`.

  // Aquí vivían `handleLogout` e `iniciales`, ya sin usar en `WorkspacesPage`: el
  // cierre de sesión está en `UserDropdown` y las iniciales no las pintaba nadie.

  return (
    <div className="flex min-h-screen w-full flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8 bg-gray-50/70 dark:bg-gray-950">
      <PageMeta
        title="Módulos · Organización"
        description="Módulos activos en tu Organización"
      />

      {/* Header */}
      <BaseAppHeader
        leftContent={
          <div className="flex items-center gap-3 sm:gap-4">
            <NectoLogo size="xs" inline />
            <span className="hidden h-5 w-px bg-gray-200 sm:block dark:bg-gray-800" />
            <span className="hidden text-theme-xs font-semibold uppercase tracking-wider text-gray-400 sm:inline dark:text-gray-500">
              {org?.nombre || "Mi organización"}
            </span>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          <NotificationDropdown />
          <UserDropdown />
        </div>
      </BaseAppHeader>

      {/* Superficie principal */}
      <main className="w-full flex-1 rounded-3xl border border-gray-200/80 bg-white p-6 shadow-theme-sm sm:p-8 lg:p-10 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          {/* Cabecera de la organización */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-6 dark:border-gray-800">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 mb-2">
                <span className="size-2 rounded-full bg-brand-500" />
                {org?.nombre || "Mi Organización"} · {org?.moneda || "COP"}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Módulos del Negocio
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Gestiona las aplicaciones operativas activas en tu organización.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/configuracion")}
                className="rounded-full"
              >
                Configurar Organización
              </Button>
              {/* Único botón de alta de módulos de la pantalla. Antes había tres
                  destinos al asistente en esta misma vista (cabecera, subcabecera
                  de la lista y estado vacío); la subcabecera se retiró. El del
                  estado vacío se conserva porque «sin módulos» no pinta esta
                  cabecera, así que nunca se ven los dos.

                  El destino es `/configuracion?tab=modulos`, no el asistente de
                  onboarding: la gestión de la pertenencia (instalar, desinstalar)
                  vive ahí, junto a la compuerta `team.manage` que esta pantalla
                  ya exige — ver `App.tsx`. `?tab=modulos` es una `ClaveTab` real
                  (`ConfiguracionPage.tsx`), no un parámetro inventado. */}
              <Button
                size="sm"
                onClick={() => navigate("/configuracion?tab=modulos")}
                className="rounded-full font-bold bg-brand-500 text-white shadow-sm shadow-brand-500/20"
              >
                <Plus className="size-4 mr-1.5" />
                Agregar módulo
              </Button>
            </div>
          </div>

          {/* ESTADO VACÍO (si no hay módulos instalados: BOTÓN EN EL CENTRO) */}
          {!tienePedidos ? (
            <div className="mx-auto my-12 max-w-lg rounded-3xl border border-dashed border-gray-300 bg-white/70 p-10 text-center shadow-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-14">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-brand-500 shadow-sm dark:bg-brand-500/10 dark:text-brand-400 mb-6">
                <Layers className="size-10" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                No tienes ningún módulo instalado
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Tu organización está lista. Comienza agregando el módulo de Pedidos para gestionar tus ventas y clientes.
              </p>

              <div className="mt-8 flex justify-center">
                {/* Mismo destino que el botón de la cabecera, por la misma razón:
                    instalar un módulo es gestionar la pertenencia, y eso vive en
                    `/configuracion?tab=modulos`. Se conserva este botón porque en
                    el estado vacío no hay cabecera de módulos que lo ofrezca. */}
                <Button
                  size="lg"
                  onClick={() => navigate("/configuracion?tab=modulos")}
                  className="rounded-full px-8 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                >
                  <Plus className="size-5 mr-1.5" />
                  Agregar módulo
                </Button>
              </div>
            </div>
          ) : (
            /* VISTA CON MÓDULOS ACTIVOS */
            <div className="space-y-6">
              {/* Subcabecera de la lista. Tenía un botón «Agregar más módulos»
                  apuntando al asistente, duplicando el de la cabecera con otro
                  destino. Se retiró: la acción de alta es UNA y vive arriba.

                  Sin contador a la derecha: mientras `Modulo` tenga un solo
                  valor, «(1)» sería un número inventado esperando a ser falso.
                  Vuelve cuando la rejilla se derive del catálogo. */}
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Módulo activo
              </h3>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Módulo Pedidos Activo */}
                <div className="flex flex-col justify-between rounded-3xl border border-emerald-500/40 bg-white p-6 shadow-sm dark:bg-gray-900 ring-2 ring-emerald-500/10">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shadow-brand-500/20">
                        {/* El glifo venía como `<svg>` inline escrito a mano aquí.
                            Se usa `CartIcon` de `@/icons`, que es el MISMO que ya
                            usaba `conversaciones/ConfigPage`. Deuda pendiente: el
                            icono por módulo debería salir del catálogo. */}
                        <CartIcon className="h-6 w-6" />
                      </div>
                      <Badge color="success" size="sm">
                        ✓ Activo
                      </Badge>
                    </div>

                    <h4 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                      {MODULO_PEDIDOS.nombre}
                    </h4>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {/* Del catálogo, no escrita aquí: esta tarjeta tenía su PROPIA
                          descripción, distinta de la de `/configuracion` y de la de
                          `/onboarding/modulos`. Tres pantallas, tres textos del
                          mismo módulo. */}
                      {MODULO_PEDIDOS.descripcion}
                    </p>

                    {/* Métricas vivas del negocio. */}
                    <MetricasVivas metricas={metricas} />

                    {perfilActual && (
                      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          <span>{perfilActual.icon}</span>
                          <span>Perfil: {perfilActual.name}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {organizacionStore.esConectorActivo("pedidos", "whatsapp") && (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                              💬 WhatsApp Agent
                            </span>
                          )}
                          {organizacionStore.esConectorActivo("pedidos", "necto_ia") && (
                            <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                              🤖 Necto Agent (IA)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pie de la tarjeta: UNA sola acción de primer nivel.
                      Se retiraron dos controles que vivían aquí y no pertenecen
                      al launcher:
                        · «Desinstalar» — destructivo. Dar de baja un módulo es
                          administración avanzada y vive en
                          `/configuracion?tab=modulos`, que ya exige `team.manage`.
                        · «Reconfigurar perfil» — opción técnica del módulo.
                      Un lanzador sirve para ENTRAR; ofrecer aquí la baja es
                      poner una acción irreversible a un clic de quien venía a
                      trabajar, junto al botón que sí quiere pulsar. */}
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      size="md"
                      className="w-full rounded-full font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20"
                      onClick={handleEntrarPedidos}
                    >
                      Entrar al módulo
                      <ArrowRight className="size-4 ml-1.5 inline" />
                    </Button>
                  </div>

                  {/* Atajos directos a las subrutas del módulo. Cada uno se
                      pinta según SU capacidad (no todas piden lo mismo). */}
                  <AtajosRapidos atajos={ATAJOS_PEDIDOS} onIr={(to) => navigate(to)} />
                </div>
              </div>
            </div>
          )}

          {/* ── Módulos del catálogo que esta organización no tiene activos ──
              Se derivan del catálogo, no de una lista a mano. `disponible`
              decide el rótulo: hoy `inventario` está en `false` → «Próximamente». */}
          {proximos.length > 0 && (
            <div className="space-y-4 border-t border-gray-100 pt-8 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Catálogo de módulos
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {proximos.length === 1 ? "1 disponible" : `${proximos.length} disponibles`}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {proximos.map((m) => (
                  <TarjetaProximo
                    key={m.id}
                    modulo={m}
                    onVerEspecificaciones={(mod) => setModuloEspecificado(mod)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <ModalEspecificaciones
        modulo={moduloEspecificado}
        onClose={() => setModuloEspecificado(null)}
      />
    </div>
  );
});

export default ModulosPage;
