import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Switch } from "@/elements/form/switch";
import { ThemeToggleButton } from "@/shell";
import { organizacionStore } from "@/stores/organizacion.store";
import { pedidosStore } from "@/stores/pedidos.store";
import { sessionStore, modulosOperablesDeSesion } from "@/stores/session.store";
import type { BusinessProfileType } from "@/domain/pedidos/pedidos.profiles";
import { OnboardingStepper } from "./OnboardingStepper";
import { OnboardingBrandPanel } from "./OnboardingBrandPanel";
import { OnboardingLayout } from "./OnboardingLayout";

interface PerfilComercialItem {
  id: BusinessProfileType;
  icon: string;
  name: string;
  description: string;
  badges: string[];
}

const PEDIDOS_STEPS = [
  { num: 1, label: "Rubro" },
  { num: 2, label: "Agentes" },
];

const PERFILES_COMERCIALES: PerfilComercialItem[] = [
  {
    id: "food",
    icon: "🍔",
    name: "Alimentos y Bebidas",
    description:
      "Restaurantes, dark kitchens, cafés y panaderías con cocina o preparación inmediata.",
    badges: [
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
    badges: [
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
    badges: ["Citas / Agendamiento"],
  },
  {
    id: "general",
    icon: "📦",
    name: "Comercio General / Retail",
    description:
      "Venta de productos físicos estándar, papelería, tecnología u hogar.",
    badges: ["Tallas y variantes", "Reparto urbano", "Envíos con guía"],
  },
];

export const PedidosOnboardingPage = observer(() => {
  const navigate = useNavigate();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [perfilElegido, setPerfilElegido] = useState<BusinessProfileType>("food");
  const [habilitarWhatsApp, setHabilitarWhatsApp] = useState(true);
  const [habilitarIA, setHabilitarIA] = useState(true);

  const handleFinalizar = () => {
    // 1. Instalar y encender el módulo, y fijar sus conectores. Las tres cosas
    //    son nivel 2 (Organización) y viven en un solo store: `organizacionStore`.
    //    `instalarModulo` ya deja el módulo activo y siembra sus conectores, así
    //    que solo hay que corregir lo que el usuario decidió en el paso 2.
    organizacionStore.instalarModulo("pedidos");
    organizacionStore.setConectorActivo("pedidos", "whatsapp", habilitarWhatsApp);
    organizacionStore.setConectorActivo("pedidos", "necto_ia", habilitarIA);

    // 2. Aplicar el perfil comercial y generar datos demo correspondientes
    pedidosStore.setPerfilComercial(perfilElegido, true);

    // 3. Sincronizar la sesión con la pertenencia recién instalada. La lista se
    //    deriva de la organización, no se escribe a mano.
    //
    //    El TIPO de sesión se PRESERVA: antes decía `"administrador"` fijo, así que
    //    volver a este paso desde `/modulos` → «Reconfigurar perfil» ascendía a
    //    administrador a cualquier rol con `team.manage` que no lo fuera. El
    //    fallback solo cubre el caso legítimo de quien llega aquí sin sesión (el
    //    alta desde `/register`), donde el creador de la organización sí es admin.
    sessionStore.configurar(
      modulosOperablesDeSesion(organizacionStore.modulosActivos),
      sessionStore.tipoSesion ?? "administrador",
    );

    // 5. Entrar a la encuesta final antes de iniciar la operativa
    navigate("/onboarding/encuesta?redirect=/pedidos/inicio");
  };

  const perfilActualObj =
    PERFILES_COMERCIALES.find((p) => p.id === perfilElegido) || PERFILES_COMERCIALES[0];

  return (
    <>
      <PageMeta
        title="Onboarding de Pedidos · Necto"
        description="Configuración de perfil comercial y agentes para Pedidos"
      />

      <OnboardingLayout
        pasoActual={paso}
        totalPasos={2}
        pasoLabel={paso === 1 ? "Rubro Comercial" : "Agentes IA"}
        onBack={paso === 2 ? () => setPaso(1) : () => navigate("/onboarding/modulos")}
        brandBadge={paso === 1 ? "Rubro Comercial" : "Automatización IA"}
        brandHeadline={
          paso === 1
            ? "Tu operación adaptada a tu rubro"
            : "Asistentes 24/7 en tu negocio"
        }
        brandDescription={
          paso === 1
            ? "Configura flujos específicos para cocina, variantes de moda, citas o retail sin perder consistencia."
            : "Tus clientes pueden consultar estados y tus operadores reciben recomendaciones inteligentes en tiempo real."
        }
        brandBullets={
          paso === 1
            ? [
                "Terminología adaptada a tu sector",
                "Campos y variantes por producto",
                "Flujos de despacho especializados",
              ]
            : [
                "Recepción y consulta por WhatsApp",
                "Sugerencias inteligentes de pedidos",
                "Atención automatizada 24/7",
              ]
        }
        brandQuote={{
          text: "La adaptación inmediata al rubro gastronómico nos permitió operar las comandas y despachos sin fricción técnica.",
          author: "Chef Rodrigo L. · Cocina & Reparto",
        }}
        brandSummary={{
          eyebrow: "Configuración de Pedidos",
          title: perfilActualObj.name,
          lines: [
            habilitarWhatsApp ? "✓ WhatsApp Agent activo" : "✗ WhatsApp desactivado",
            habilitarIA ? "✓ Necto Agent (IA) activo" : "✗ Agente IA desactivado",
          ],
        }}
      >
        <div className="w-full">
          {/* PASO 1: ¿Qué vende tu negocio? */}
          {paso === 1 && (
            <div>
                <div className="mb-8">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    Paso 1 de 2 — Rubro y Perfil Comercial
                  </span>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-ink-title dark:text-white">
                    ¿Qué vende tu negocio?
                  </h1>
                  <p className="mt-2 text-sm text-ink-body dark:text-gray-400">
                    Selecciona tu perfil comercial. Esto adapta las capacidades, campos de producto y terminología sin cambiar el núcleo de tus pedidos.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {PERFILES_COMERCIALES.map((perfil) => {
                    const seleccionado = perfilElegido === perfil.id;

                    return (
                      <div
                        key={perfil.id}
                        onClick={() => setPerfilElegido(perfil.id)}
                        className={`flex flex-col justify-between rounded-3xl border p-5 transition-all cursor-pointer ${
                          seleccionado
                            ? "border-brand-500 bg-white dark:bg-white/[0.03] shadow-theme-md ring-2 ring-brand-500/20 dark:border-brand-400"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-theme-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-3xl">{perfil.icon}</span>
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
                                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                                  seleccionado
                                    ? "bg-brand-500 text-white"
                                    : "border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                                }`}
                              >
                                {seleccionado ? "Reaplicar demo" : "Activar perfil"}
                              </button>
                            </div>
                          </div>

                          <h3 className="mt-3 text-sm font-bold text-ink-title dark:text-white">
                            {perfil.name}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            {perfil.description}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
                          {perfil.badges.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PASO 2: Agentes y Automatización */}
            {paso === 2 && (
              <div>
                <div className="mb-8">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    Paso 2 de 2 — Agentes y Automatización
                  </span>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-ink-title dark:text-white">
                    ¿Quieres habilitar WhatsApp Agent o Necto Agent?
                  </h1>
                  <p className="mt-2 text-sm text-ink-body dark:text-gray-400">
                    Activa los agentes inteligentes para automatizar la recepción de pedidos, el estado para clientes y la asistencia operativa.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* WhatsApp Agent */}
                  <div
                    onClick={() => setHabilitarWhatsApp(!habilitarWhatsApp)}
                    className={`flex items-center justify-between rounded-3xl border p-6 transition cursor-pointer ${
                      habilitarWhatsApp
                        ? "border-brand-500/50 bg-white dark:bg-white/[0.03] shadow-theme-md ring-2 ring-brand-500/20"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/10 text-[#25D366] text-2xl">
                        💬
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-ink-title dark:text-white">
                            WhatsApp Agent
                          </h3>
                          {habilitarWhatsApp && (
                            <Badge color="success" size="xs">
                              Habilitado
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          Recibe pedidos por WhatsApp, informa estados a clientes y atiende conversaciones automáticamente.
                        </p>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="pl-4">
                      <Switch
                        checked={habilitarWhatsApp}
                        onChange={setHabilitarWhatsApp}
                      />
                    </div>
                  </div>

                  {/* Necto Agent */}
                  <div
                    onClick={() => setHabilitarIA(!habilitarIA)}
                    className={`flex items-center justify-between rounded-3xl border p-6 transition cursor-pointer ${
                      habilitarIA
                        ? "border-brand-500/50 bg-white dark:bg-white/[0.03] shadow-theme-md ring-2 ring-brand-500/20"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-700 dark:text-accent-300 text-2xl">
                        🤖
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-ink-title dark:text-white">
                            Necto Agent (IA)
                          </h3>
                          {habilitarIA && (
                            <Badge color="primary" size="xs">
                              Habilitado
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          Copiloto con IA para análisis de ventas, asistencia a operadores y sugerencias automáticas de pedidos.
                        </p>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="pl-4">
                      <Switch checked={habilitarIA} onChange={setHabilitarIA} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="sticky bottom-0 z-20 mx-auto mt-12 flex w-full max-w-2xl items-center justify-between bg-white/95 pt-6 pb-3 backdrop-blur-md dark:bg-gray-950/95">
            {paso === 1 ? (
              <button
                type="button"
                onClick={() => navigate("/onboarding/modulos")}
                className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Volver a módulos
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Volver a rubro
              </button>
            )}

            {paso === 1 ? (
              <Button
                type="button"
                onClick={() => setPaso(2)}
                className="rounded-full px-7 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-theme-lg shadow-brand-500/20"
              >
                Continuar a Agentes
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 ml-1.5 inline"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinalizar}
                className="rounded-full px-7 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-theme-lg shadow-brand-500/20"
              >
                Terminar y entrar a Pedidos
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 ml-1.5 inline"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Button>
            )}
          </div>
      </OnboardingLayout>
    </>
  );
});

export default PedidosOnboardingPage;
