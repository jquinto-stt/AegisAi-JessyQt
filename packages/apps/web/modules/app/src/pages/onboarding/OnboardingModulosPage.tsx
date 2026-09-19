import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { ThemeToggleButton } from "@/shell";
import { organizacionStore } from "@/stores/organizacion.store";

export const OnboardingModulosPage = observer(() => {
  const navigate = useNavigate();
  const org = organizacionStore.organizacion;

  const handleAgregarPedidos = () => {
    navigate("/onboarding/pedidos");
  };

  const handleOmitir = () => {
    navigate("/modulos");
  };

  return (
    <>
      <PageMeta
        title="Catálogo de Módulos · Onboarding Necto"
        description="Selecciona los módulos para tu espacio de trabajo"
      />

      <div className="relative min-h-screen bg-gray-50/70 px-4 py-12 dark:bg-gray-950 sm:px-6">
        <div className="fixed right-6 top-6 z-50">
          <ThemeToggleButton variant="floating" />
        </div>

        <div className="mx-auto w-full max-w-4xl">
          {/* Header del Onboarding */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 mb-3">
              <span className="h-2 w-2 rounded-full bg-brand-500"></span>
              Paso 3 de 3 · Catálogo de Módulos · {org?.nombre || "Mi Organización"}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Elige los módulos para tu negocio
            </h1>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
              Necto es modular. Puedes agregar Pedidos ahora para gestionar tus ventas y entregas, o sumar nuevos módulos más adelante.
            </p>
          </div>

          {/* Grilla del Catálogo en Onboarding */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* 1. Módulo Pedidos & Fulfillment */}
            <div className="flex flex-col justify-between rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm hover:border-brand-500/40 hover:shadow-md transition-all dark:border-gray-800 dark:bg-gray-900">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shadow-brand-500/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                  </div>
                  <Badge color="primary" size="sm">
                    Disponible
                  </Badge>
                </div>

                <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                  Pedidos & Fulfillment
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Gestión completa de órdenes de venta, preparación en cocina o empaque, transportadoras/courier, cobranza y analítica de despacho.
                </p>

                <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-500">✓</span> Tablero Kanban dinámico por estados
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-500">✓</span> Adaptable a Gastronomía, Ropa, Servicios o Retail
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-500">✓</span> Agentes de WhatsApp e Inteligencia Artificial
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button
                  size="md"
                  className="w-full"
                  onClick={handleAgregarPedidos}
                >
                  + Agregar módulo
                </Button>
              </div>
            </div>

            {/* 2. Módulo Inventario & Stock */}
            <div className="flex flex-col justify-between rounded-3xl border border-gray-200/80 bg-white/70 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60 opacity-90">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </div>
                  <Badge color="light" size="sm">
                    Próximamente
                  </Badge>
                </div>

                <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                  Inventario & Existencias
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Control de existencias multi-bodega, materias primas, alertas de reposición y sincronización automática de stock con las órdenes.
                </p>

                <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">•</span> Trazabilidad de lotes y movimientos
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">•</span> Descuento de stock en cada pedido
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">•</span> Alertas automáticas de stock mínimo
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button size="md" variant="outline" className="w-full" disabled>
                  Próximamente
                </Button>
              </div>
            </div>
          </div>

          {/* Footer del paso de onboarding */}
          <div className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-800 text-xs text-gray-500">
            <button
              type="button"
              onClick={() => navigate("/onboarding/organizacion")}
              className="hover:underline cursor-pointer"
            >
              ← Volver a Organización
            </button>
            <button
              type="button"
              onClick={handleOmitir}
              className="hover:underline cursor-pointer text-gray-600 dark:text-gray-400"
            >
              Omitir por ahora e ir al workspace →
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

export default OnboardingModulosPage;
