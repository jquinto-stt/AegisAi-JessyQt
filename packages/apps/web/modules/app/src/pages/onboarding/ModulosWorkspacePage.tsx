import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Modal } from "@/elements/ui/modal";
import { Switch } from "@/elements/form/switch";
import { ThemeToggleButton } from "@/shell";
import { organizacionStore } from "@/stores/organizacion.store";
import { pedidosStore } from "@/stores/pedidos.store";
import { sessionStore } from "@/stores/session.store";
import { BUSINESS_PROFILES, type BusinessProfileId } from "@/domain/pedidos/pedidos.profiles";

export const ModulosWorkspacePage = observer(() => {
  const navigate = useNavigate();
  const org = organizacionStore.organizacion;

  const [modalPedidosOpen, setModalPedidosOpen] = useState(false);
  const [perfilElegido, setPerfilElegido] = useState<BusinessProfileId>("fashion");
  const [conectarWhatsApp, setConectarWhatsApp] = useState(true);
  const [conectarIA, setConectarIA] = useState(true);

  const tienePedidos = organizacionStore.tieneModuloPedidos;

  const handleInstalarPedidos = () => {
    // 1. Guardar en la organización que el módulo está instalado
    organizacionStore.instalarModulo("pedidos");

    // 2. Aplicar el perfil comercial y generar datos demo correspondientes
    pedidosStore.setPerfilComercial(perfilElegido, true);

    // 3. Activar la sesión con rol de Administrador para este módulo
    sessionStore.configurar(["pedidos"], "administrador");

    setModalPedidosOpen(false);

    // 4. Entrar al módulo Pedidos ya contextualizado
    navigate("/pedidos/inicio");
  };

  return (
    <>
      <PageMeta
        title="Módulos · Necto"
        description="Gestiona los módulos activos de tu Organización"
      />

      <div className="relative min-h-screen bg-gray-50/70 px-4 py-12 dark:bg-gray-950 sm:px-6">
        <div className="fixed right-6 top-6 z-50">
          <ThemeToggleButton variant="floating" />
        </div>

        <div className="mx-auto w-full max-w-4xl">
          {/* Header de la Organización */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 mb-3">
              <span className="h-2 w-2 rounded-full bg-brand-500"></span>
              Workspace: {org?.nombre || "Mi Organización"} · {org?.moneda || "COP"}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Módulos del Negocio
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
              Instala y gestiona las aplicaciones operativas que impulsan la actividad de tu empresa.
            </p>
          </div>

          {/* Grilla de Módulos */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* 1. Módulo Pedidos & Fulfillment */}
            <div className="flex flex-col justify-between rounded-3xl border border-brand-500/30 bg-white p-6 shadow-sm dark:border-brand-500/20 dark:bg-gray-900 ring-2 ring-brand-500/10">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shadow-brand-500/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                  </div>
                  <Badge color={tienePedidos ? "success" : "primary"} size="sm">
                    {tienePedidos ? "✓ Instalado" : "Disponible"}
                  </Badge>
                </div>

                <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                  Pedidos & Fulfillment
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Gestión completa de órdenes de venta, preparación, transportadoras/courier, cobranza y analítica de despacho.
                </p>

                <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-500">✓</span> Tablero Kanban dinámico por estados
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-500">✓</span> Adaptable a Gastronomía, Ropa, Servicios o Retail
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-500">✓</span> Historial exportable y métricas de venta
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                {tienePedidos ? (
                  <Button
                    size="md"
                    className="w-full"
                    onClick={() => {
                      sessionStore.configurar(["pedidos"], "administrador");
                      navigate("/pedidos/inicio");
                    }}
                  >
                    Abrir Pedidos →
                  </Button>
                ) : (
                  <Button
                    size="md"
                    className="w-full"
                    onClick={() => setModalPedidosOpen(true)}
                  >
                    Instalar módulo →
                  </Button>
                )}
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
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    Próximamente
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                  Inventario & Existencias
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Control de stock multi-bodega, insumos, alertas de reposición y sincronización automática de existencias con las órdenes.
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
                  En desarrollo
                </Button>
              </div>
            </div>

            {/* 3. Conector Transversal WhatsApp */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
                  </svg>
                </div>
                <Badge color="light" size="xs">Canal Conector</Badge>
              </div>
              <h4 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">
                Canales de WhatsApp
              </h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Conecta números de WhatsApp para recibir pedidos por chat y enviar notificaciones automáticas de estado.
              </p>
            </div>

            {/* 4. Conector Transversal Necto IA */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  </svg>
                </div>
                <Badge color="light" size="xs">Inteligencia</Badge>
              </div>
              <h4 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">
                Necto Intelligence (IA)
              </h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Asistente analítico que diagnostica tus ventas, genera resúmenes diarios y redacta respuestas a clientes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          MODAL DE ONBOARDING ESPECÍFICO DE PEDIDOS
         ═════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={modalPedidosOpen}
        onClose={() => setModalPedidosOpen(false)}
        className="max-w-2xl p-6 sm:p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              Setup de Módulo
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            ¿Qué tipo de operaciones gestiona tu negocio?
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Pedidos adaptará su vocabulario, columnas de Kanban, modalidades de entrega y campos de producto para ajustarse a tu rubro.
          </p>

          {/* Selector de Perfil Comercial */}
          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-h-[42vh] overflow-y-auto pr-1 custom-scrollbar">
            {(Object.entries(BUSINESS_PROFILES) as [BusinessProfileId, typeof BUSINESS_PROFILES[BusinessProfileId]][]).map(
              ([id, perfil]) => {
                const seleccionado = perfilElegido === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPerfilElegido(id)}
                    className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all ${
                      seleccionado
                        ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 ring-2 ring-brand-500/20"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xl">{perfil.icon}</span>
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                          seleccionado
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-gray-300 dark:border-gray-700"
                        }`}
                      >
                        {seleccionado && "✓"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-gray-900 dark:text-white">
                      {perfil.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                      {perfil.description}
                    </p>
                  </button>
                );
              }
            )}
          </div>

          {/* Integraciones Opcionales */}
          <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Integraciones recomendadas para este módulo
            </h4>

            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <span className="text-base">💬</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white/90">
                    Vincular canal de WhatsApp
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Notificaciones automáticas al cliente y recepción de pedidos por chat.
                  </p>
                </div>
              </div>
              <Switch checked={conectarWhatsApp} onChange={setConectarWhatsApp} />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <span className="text-base">⚡</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white/90">
                    Habilitar Necto Intelligence (IA)
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Sugerencias de respuesta automática y diagnóstico analítico de ventas.
                  </p>
                </div>
              </div>
              <Switch checked={conectarIA} onChange={setConectarIA} />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setModalPedidosOpen(false)}>
              Cancelar
            </Button>
            <Button size="md" onClick={handleInstalarPedidos}>
              Instalar y entrar a Pedidos →
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default ModulosWorkspacePage;
