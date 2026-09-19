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
import { plataformaStore } from "@/stores/plataforma.store";
import type { BusinessProfileType } from "@/domain/pedidos/pedidos.profiles";

interface PerfilInfo {
  id: BusinessProfileType;
  icon: string;
  name: string;
  description: string;
  tags: string[];
}

const PERFILES_DISPONIBLES: PerfilInfo[] = [
  {
    id: "food",
    icon: "🍔",
    name: "Alimentos y Bebidas",
    description:
      "Restaurantes, dark kitchens, cafés y panaderías con cocina o preparación inmediata.",
    tags: [
      "Modificadores de platillo",
      "Tiempo de preparación",
      "Reparto urbano",
      "Consumo en mesa",
    ],
  },
  {
    id: "fashion",
    icon: "👕",
    name: "Ropa, Calzado y Accesorios",
    description:
      "Boutiques, tiendas de moda, calzado y confección con variantes de talla, color y envíos.",
    tags: [
      "Tallas y variantes",
      "Envíos con guía",
      "Devoluciones",
      "Reparto urbano",
    ],
  },
  {
    id: "services",
    icon: "🛠️",
    name: "Servicios y Citas",
    description:
      "Profesionales, barberías, spas, consultorios y talleres con agendamiento.",
    tags: ["Citas / Agendamiento"],
  },
  {
    id: "general",
    icon: "📦",
    name: "Comercio General / Retail",
    description:
      "Venta de productos físicos estándar, papelería, tecnología u hogar.",
    tags: ["Tallas y variantes", "Reparto urbano", "Envíos con guía"],
  },
];

export const ModulosWorkspacePage = observer(() => {
  const navigate = useNavigate();
  const org = organizacionStore.organizacion;

  const [modalPedidosOpen, setModalPedidosOpen] = useState(false);
  const [pasoWizard, setPasoWizard] = useState<1 | 2>(1);
  const [perfilElegido, setPerfilElegido] = useState<BusinessProfileType>("food");
  const [habilitarWhatsApp, setHabilitarWhatsApp] = useState(true);
  const [habilitarIA, setHabilitarIA] = useState(true);

  const tienePedidos = organizacionStore.tieneModuloPedidos;

  const handleAbrirAgregarPedidos = () => {
    setPasoWizard(1);
    setModalPedidosOpen(true);
  };

  const handleTerminarOnboardingPedidos = () => {
    // 1. Guardar en la organización que el módulo está instalado
    organizacionStore.instalarModulo("pedidos");

    // 2. Aplicar el perfil comercial y generar datos demo correspondientes
    pedidosStore.setPerfilComercial(perfilElegido, true);

    // 3. Configurar en plataformaStore el módulo y los conectores
    plataformaStore.setModuloActivo("pedidos", true);
    plataformaStore.setConectorActivo("pedidos", "whatsapp", habilitarWhatsApp);
    plataformaStore.setConectorActivo("pedidos", "necto_ia", habilitarIA);

    // 4. Activar la sesión con rol de Administrador para este módulo
    sessionStore.configurar(["pedidos"], "administrador");

    setModalPedidosOpen(false);

    // 5. Entrar al módulo Pedidos ya contextualizado
    navigate("/pedidos/inicio");
  };

  const handleDesinstalarPedidos = () => {
    organizacionStore.desinstalarModulo("pedidos");
    plataformaStore.desinstalarModulo("pedidos");
  };

  const perfilActualInfo = PERFILES_DISPONIBLES.find(
    (p) => p.id === (pedidosStore.config.perfilComercial || "food")
  );

  return (
    <>
      <PageMeta
        title="Módulos del Workspace · Necto"
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
              Selecciona e instala los módulos que impulsan la actividad de tu empresa.
            </p>
          </div>

          {/* Barra de acción de módulos */}
          <div className="mb-6 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Catálogo de Módulos
            </div>
            {!tienePedidos && (
              <Button size="sm" onClick={handleAbrirAgregarPedidos}>
                + Agregar módulo
              </Button>
            )}
          </div>

          {/* Grilla de Módulos */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* 1. Módulo Pedidos & Fulfillment */}
            <div
              className={`flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm dark:bg-gray-900 transition-all ${
                tienePedidos
                  ? "border-emerald-500/40 ring-2 ring-emerald-500/10"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shadow-brand-500/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                  </div>
                  <Badge color={tienePedidos ? "success" : "light"} size="sm">
                    {tienePedidos ? "✓ Activo" : "Disponible"}
                  </Badge>
                </div>

                <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                  Pedidos & Fulfillment
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Gestión completa de órdenes de venta, preparación en cocina o empaque, transportadoras, cobranza y analítica de despacho.
                </p>

                {tienePedidos && perfilActualInfo && (
                  <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      <span>{perfilActualInfo.icon}</span>
                      <span>Perfil: {perfilActualInfo.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {plataformaStore.esConectorActivo("pedidos", "whatsapp") && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                          💬 WhatsApp Agent
                        </span>
                      )}
                      {plataformaStore.esConectorActivo("pedidos", "necto_ia") && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                          🤖 Necto Agent
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-500">✓</span> Tablero Kanban dinámico por estados
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-500">✓</span> Adaptable a Gastronomía, Ropa, Servicios o Retail
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
                {tienePedidos ? (
                  <>
                    <Button
                      size="md"
                      className="w-full"
                      onClick={() => {
                        sessionStore.configurar(["pedidos"], "administrador");
                        navigate("/pedidos/inicio");
                      }}
                    >
                      Entrar al módulo →
                    </Button>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={handleAbrirAgregarPedidos}
                        className="text-brand-500 hover:underline cursor-pointer"
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
                  </>
                ) : (
                  <Button
                    size="md"
                    className="w-full"
                    onClick={handleAbrirAgregarPedidos}
                  >
                    + Agregar módulo
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
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          ONBOARDING WIZARD DEL MÓDULO DE PEDIDOS
         ═════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={modalPedidosOpen}
        onClose={() => setModalPedidosOpen(false)}
        className="max-w-3xl p-6 sm:p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
      >
        <div>
          {/* PASO 1: ¿Qué vende tu negocio? */}
          {pasoWizard === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  Paso 1 de 2 · Perfil Comercial
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                ¿Qué vende tu negocio?
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Selecciona tu perfil comercial. Esto adapta las capacidades, campos de producto y terminología sin cambiar el núcleo de tus pedidos.
              </p>

              {/* Grid de los 4 perfiles comerciales exactos */}
              <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                {PERFILES_DISPONIBLES.map((perfil) => {
                  const seleccionado = perfilElegido === perfil.id;
                  return (
                    <div
                      key={perfil.id}
                      onClick={() => setPerfilElegido(perfil.id)}
                      className={`flex flex-col justify-between rounded-2xl border p-4 transition-all cursor-pointer ${
                        seleccionado
                          ? "border-brand-500 bg-brand-50/50 dark:border-brand-400 dark:bg-brand-950/20 shadow-sm ring-2 ring-brand-500/20"
                          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/60"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-2xl">{perfil.icon}</span>
                          <div className="flex items-center gap-2">
                            {seleccionado && (
                              <Badge color="success" size="xs">
                                Activo
                              </Badge>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPerfilElegido(perfil.id);
                              }}
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                seleccionado
                                  ? "bg-brand-500 text-white"
                                  : "border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                              }`}
                            >
                              {seleccionado ? "Perfil seleccionado" : "Activar perfil"}
                            </button>
                          </div>
                        </div>

                        <h4 className="mt-2.5 text-sm font-bold text-gray-900 dark:text-white">
                          {perfil.name}
                        </h4>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          {perfil.description}
                        </p>
                      </div>

                      {/* Badges de capacidades exactas */}
                      <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-gray-100 pt-2.5 dark:border-gray-800/60">
                        {perfil.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botones de acción Paso 1 */}
              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalPedidosOpen(false)}
                >
                  Cancelar
                </Button>
                <Button size="md" onClick={() => setPasoWizard(2)}>
                  Siguiente: Configurar Agentes →
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2: ¿Quieres habilitar WhatsApp Agent o Necto Agent? */}
          {pasoWizard === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  Paso 2 de 2 · Agentes y Automatizaciones
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                ¿Quieres habilitar WhatsApp Agent o Necto Agent?
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Automatiza la atención a clientes y la operación de tus pedidos con agentes especializados. Puedes activarlos o cambiarlos en cualquier momento.
              </p>

              <div className="mt-6 space-y-4">
                {/* Switch WhatsApp Agent */}
                <div
                  onClick={() => setHabilitarWhatsApp(!habilitarWhatsApp)}
                  className={`flex items-center justify-between rounded-2xl border p-4 sm:p-5 transition cursor-pointer ${
                    habilitarWhatsApp
                      ? "border-emerald-500/50 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-950/20"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xl">
                      💬
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          WhatsApp Agent
                        </h4>
                        {habilitarWhatsApp && (
                          <Badge color="success" size="xs">
                            Habilitado
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Recibe pedidos por WhatsApp, informa estados a los clientes y atiende conversaciones automáticamente.
                      </p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={habilitarWhatsApp}
                      onChange={setHabilitarWhatsApp}
                    />
                  </div>
                </div>

                {/* Switch Necto Agent */}
                <div
                  onClick={() => setHabilitarIA(!habilitarIA)}
                  className={`flex items-center justify-between rounded-2xl border p-4 sm:p-5 transition cursor-pointer ${
                    habilitarIA
                      ? "border-purple-500/50 bg-purple-50/40 dark:border-purple-500/30 dark:bg-purple-950/20"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xl">
                      🤖
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          Necto Agent (IA)
                        </h4>
                        {habilitarIA && (
                          <Badge color="primary" size="xs">
                            Habilitado
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Copiloto con IA para análisis de ventas, asistencia a operadores y sugerencias automáticas de pedidos.
                      </p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch checked={habilitarIA} onChange={setHabilitarIA} />
                  </div>
                </div>
              </div>

              {/* Botones de acción Paso 2 */}
              <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPasoWizard(1)}
                >
                  ← Volver al perfil
                </Button>
                <Button size="md" onClick={handleTerminarOnboardingPedidos}>
                  Terminar y entrar a Pedidos →
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
});

export default ModulosWorkspacePage;
