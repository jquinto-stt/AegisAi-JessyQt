import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import {
  Layers,
  Plus,
  ArrowRight,
  Building2,
  LogOut,
  ChevronDown,
  User,
  Settings,
  Info,
  Globe,
} from "lucide-react";
import { BaseAppHeader } from "@/shell";
import { ThemeToggleButton } from "@/shell";
import NotificationDropdown from "@/shell/header/NotificationDropdown";
import UserDropdown from "@/shell/header/UserDropdown";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { NectoLogo } from "@/compositions/shared/NectoLogo";
import {
  organizacionStore,
  pedidosStore,
  plataformaStore,
  sessionStore,
} from "@/stores";
import {
  BUSINESS_PROFILES,
  type BusinessProfileType,
} from "@/domain/pedidos/pedidos.profiles";

export const WorkspacesPage = observer(() => {
  const navigate = useNavigate();
  const org = organizacionStore.organizacion;
  const usuario = organizacionStore.usuario;
  const tienePedidos = organizacionStore.tieneModuloPedidos;
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const perfilActualKey = (pedidosStore.config.perfilComercial || "food") as BusinessProfileType;
  const perfilActual = BUSINESS_PROFILES[perfilActualKey] || BUSINESS_PROFILES.food;

  const handleEntrarPedidos = () => {
    sessionStore.configurar(["pedidos"], "administrador");
    navigate("/pedidos/inicio");
  };

  const handleDesinstalarPedidos = () => {
    organizacionStore.desinstalarModulo("pedidos");
    plataformaStore.desinstalarModulo("pedidos");
  };

  const handleLogout = () => {
    sessionStore.reset();
    navigate("/login");
  };

  const iniciales = usuario?.nombre
    ? `${usuario.nombre.charAt(0)}${usuario.apellido?.charAt(0) || ""}`.toUpperCase()
    : "AD";

  return (
    <div className="flex min-h-screen w-full flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8 bg-gray-50/70 dark:bg-gray-950">
      <PageMeta
        title="Espacio de Trabajo · Módulos"
        description="Módulos activos en tu Organización"
      />

      {/* Header */}
      <BaseAppHeader
        leftContent={
          <div className="flex items-center gap-3 sm:gap-4">
            <NectoLogo size="xs" inline />
            <span className="hidden h-5 w-px bg-gray-200 sm:block dark:bg-gray-800" />
            <span className="hidden text-theme-xs font-semibold uppercase tracking-wider text-gray-400 sm:inline dark:text-gray-500">
              {org?.nombre || "Espacio de trabajo"}
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

      {/* Superficie principal del Workspace */}
      <main className="w-full flex-1 rounded-3xl border border-gray-200/80 bg-white p-6 shadow-theme-sm sm:p-8 lg:p-10 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          {/* Cabecera del Workspace */}
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
                Gestiona las aplicaciones operativas activas en tu espacio de trabajo.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/onboarding/organizacion")}
                className="rounded-full"
              >
                Configurar Organización
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/onboarding/modulos")}
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
                Tu espacio de trabajo está listo. Comienza agregando el módulo de Pedidos para gestionar tus ventas y clientes.
              </p>

              <div className="mt-8 flex justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate("/onboarding/modulos")}
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
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Módulos Activos (1)
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/onboarding/modulos")}
                  className="rounded-full text-xs"
                >
                  <Plus className="size-3.5 mr-1" />
                  Agregar más módulos
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Módulo Pedidos Activo */}
                <div className="flex flex-col justify-between rounded-3xl border border-emerald-500/40 bg-white p-6 shadow-sm dark:bg-gray-900 ring-2 ring-emerald-500/10">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shadow-brand-500/20">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="h-6 w-6"
                        >
                          <circle cx="9" cy="21" r="1" />
                          <circle cx="20" cy="21" r="1" />
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                      </div>
                      <Badge color="success" size="sm">
                        ✓ Activo
                      </Badge>
                    </div>

                    <h4 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                      Pedidos & Fulfillment
                    </h4>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Gestión completa de órdenes de venta, preparación en cocina o empaque, transportadoras, cobranza y analítica de despacho.
                    </p>

                    {perfilActual && (
                      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          <span>{perfilActual.icon}</span>
                          <span>Perfil: {perfilActual.name}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {plataformaStore.esConectorActivo("pedidos", "whatsapp") && (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                              💬 WhatsApp Agent
                            </span>
                          )}
                          {plataformaStore.esConectorActivo("pedidos", "necto_ia") && (
                            <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                              🤖 Necto Agent (IA)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
                    <Button
                      size="md"
                      className="w-full rounded-full font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20"
                      onClick={handleEntrarPedidos}
                    >
                      Entrar al módulo
                      <ArrowRight className="size-4 ml-1.5 inline" />
                    </Button>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => navigate("/onboarding/pedidos")}
                        className="text-brand-600 hover:underline cursor-pointer dark:text-brand-400 font-medium"
                      >
                        Reconfigurar perfil
                      </button>
                      <button
                        type="button"
                        onClick={handleDesinstalarPedidos}
                        className="text-gray-400 hover:text-error-500 cursor-pointer"
                      >
                        Desinstalar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
});

export default WorkspacesPage;
