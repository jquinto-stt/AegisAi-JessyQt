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
import { sessionStore } from "@/stores/session.store";
import { plataformaStore } from "@/stores/plataforma.store";
import type { BusinessProfileType } from "@/domain/pedidos/pedidos.profiles";

interface PerfilComercialItem {
  id: BusinessProfileType;
  icon: string;
  name: string;
  description: string;
  badges: string[];
}

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

    // 5. Entrar al módulo Pedidos
    navigate("/pedidos/inicio");
  };

  return (
    <>
      <PageMeta
        title="Onboarding de Pedidos · Necto"
        description="Configuración de perfil comercial y agentes para Pedidos"
      />

      <div className="relative min-h-screen bg-gray-50/70 px-4 py-12 dark:bg-gray-950 sm:px-6">
        <div className="fixed right-6 top-6 z-50">
          <ThemeToggleButton variant="floating" />
        </div>

        <div className="mx-auto w-full max-w-4xl">
          {/* PASO 1: ¿Qué vende tu negocio? */}
          {paso === 1 && (
            <div>
              {/* Header */}
              <div className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 mb-3">
                  <span className="h-2 w-2 rounded-full bg-brand-500"></span>
                  Paso 1 de 2 · Configuración de Pedidos
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                  ¿Qué vende tu negocio?
                </h1>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
                  Selecciona tu perfil comercial. Esto adapta las capacidades, campos de producto y terminología sin cambiar el núcleo de tus pedidos.
                </p>
              </div>

              {/* Grid de 4 perfiles comerciales */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {PERFILES_COMERCIALES.map((perfil) => {
                  const seleccionado = perfilElegido === perfil.id;

                  return (
                    <div
                      key={perfil.id}
                      onClick={() => setPerfilElegido(perfil.id)}
                      className={`flex flex-col justify-between rounded-3xl border p-6 transition-all cursor-pointer ${
                        seleccionado
                          ? "border-brand-500 bg-white dark:bg-gray-900 shadow-md ring-2 ring-brand-500/20 dark:border-brand-400"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-gray-700"
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
                              className={`rounded-lg px-3 py-1 text-xs font-medium transition cursor-pointer ${
                                seleccionado
                                  ? "bg-brand-500 text-white"
                                  : "border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                              }`}
                            >
                              {seleccionado ? "Reaplicar datos demo" : "Activar perfil"}
                            </button>
                          </div>
                        </div>

                        <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                          {perfil.name}
                        </h3>
                        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          {perfil.description}
                        </p>
                      </div>

                      {/* Lista de capacidades / tags */}
                      <div className="mt-5 flex flex-wrap gap-1.5 border-t border-gray-100 pt-4 dark:border-gray-800">
                        {perfil.badges.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Barra de navegación inferior */}
              <div className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => navigate("/modulos")}
                >
                  ← Volver a módulos
                </Button>
                <Button size="md" onClick={() => setPaso(2)}>
                  Continuar a Agentes →
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2: ¿Quieres habilitar WhatsApp Agent o Necto Agent? */}
          {paso === 2 && (
            <div className="mx-auto max-w-2xl">
              {/* Header */}
              <div className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 mb-3">
                  <span className="h-2 w-2 rounded-full bg-brand-500"></span>
                  Paso 2 de 2 · Agentes y Automatización
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                  ¿Quieres habilitar WhatsApp Agent o Necto Agent?
                </h1>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
                  Activa los agentes inteligentes para automatizar la recepción de pedidos, el estado para clientes y la asistencia operativa.
                </p>
              </div>

              {/* Tarjetas de los dos agentes */}
              <div className="space-y-4">
                {/* WhatsApp Agent */}
                <div
                  onClick={() => setHabilitarWhatsApp(!habilitarWhatsApp)}
                  className={`flex items-center justify-between rounded-3xl border p-6 transition cursor-pointer ${
                    habilitarWhatsApp
                      ? "border-emerald-500/50 bg-white dark:bg-gray-900 shadow-md ring-2 ring-emerald-500/20"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-2xl">
                      💬
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          WhatsApp Agent
                        </h3>
                        {habilitarWhatsApp && (
                          <Badge color="success" size="xs">
                            Habilitado
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Recibe pedidos por WhatsApp, informa estados a los clientes y atiende conversaciones automáticamente.
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
                      ? "border-purple-500/50 bg-white dark:bg-gray-900 shadow-md ring-2 ring-purple-500/20"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-2xl">
                      🤖
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
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

              {/* Barra de navegación inferior */}
              <div className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-800">
                <Button variant="outline" size="md" onClick={() => setPaso(1)}>
                  ← Volver a perfil comercial
                </Button>
                <Button size="md" onClick={handleFinalizar}>
                  Terminar y entrar a Pedidos →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export default PedidosOnboardingPage;
