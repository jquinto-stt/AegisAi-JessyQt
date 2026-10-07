import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card, CardTitle, CardDescription } from "@/elements/ui/card";
import { sessionStore, type Modulo, type TipoSesion } from "@/stores/session.store";
import { OnboardingLayout } from "./OnboardingLayout";

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

const AdminIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const OperadorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════

interface RolOption {
  id: TipoSesion;
  titulo: string;
  descripcion: string;
  icon: () => ReactNode;
}

const ROLES: RolOption[] = [
  {
    id: "administrador",
    titulo: "Administrador",
    descripcion: "Acceso completo: configuración, equipo, reportes y ajustes del negocio.",
    icon: AdminIcon,
  },
  {
    id: "operador",
    titulo: "Operador",
    descripcion: "Pide acceso al administrador: él revisa tu solicitud y te asigna un rol. Sin configuración del negocio.",
    icon: OperadorIcon,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// SELECTABLE CARD
// ═══════════════════════════════════════════════════════════════════════════

interface SelectCardProps {
  titulo: string;
  descripcion: string;
  icon: () => ReactNode;
  selected: boolean;
  onSelect: () => void;
}

const SelectCard = ({ titulo, descripcion, icon: Icon, selected, onSelect }: SelectCardProps) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className="group relative rounded-xl text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 w-full cursor-pointer"
  >
    <Card
      className={`h-full transition-all ${
        selected
          ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/30 dark:border-brand-400 dark:bg-brand-500/10"
          : "hover:border-brand-300 hover:shadow-theme-xs dark:hover:border-brand-500/40"
      }`}
    >
      <div
        className={`mb-5 flex h-14 max-w-14 items-center justify-center rounded-[10.5px] transition-colors ${
          selected
            ? "bg-brand-500 text-white"
            : "bg-brand-50 text-brand-500 group-hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400"
        }`}
      >
        <Icon />
      </div>
      <CardTitle>{titulo}</CardTitle>
      <CardDescription>{descripcion}</CardDescription>
    </Card>

    {selected && (
      <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white shadow-theme-xs">
        <CheckIcon />
      </span>
    )}
  </button>
);

const BRAND_MESSAGES_ROL = [
  {
    badge: "Acceso Seguro",
    title: "Define tu perfil de operación.",
    subtitle: "El administrador gestiona todo el negocio; el operador se enfoca en la atención del día a día.",
  },
  {
    badge: "Control de Permisos",
    title: "Roles diseñados para cada función.",
    subtitle: "Protege la configuración clave de tu catálogo, precios y finanzas.",
  },
  {
    badge: "Escalabilidad",
    title: "Invita a tu equipo cuando lo necesites.",
    subtitle: "Puedes sumar operadores adicionales y asignarles secciones específicas.",
  },
];

export const OrganizacionOnboardingPage = observer(() => {
  const navigate = useNavigate();
  const [rol, setRol] = useState<TipoSesion | null>(sessionStore.tipoSesion || "administrador");

  const esOperador = rol === "operador";
  const modulos: Modulo[] = sessionStore.modulos.length > 0 ? sessionStore.modulos : ["pedidos"];
  const modulosLabel =
    modulos.length === 2
      ? "Pedidos e Inventario"
      : modulos.includes("pedidos")
      ? "Pedidos & Fulfillment"
      : "Inventario & Stock";

  const handleConfirmar = () => {
    if (!rol) return;

    sessionStore.configurar(modulos, rol);

    if (rol === "operador") {
      navigate("/operador/registro");
      return;
    }

    // Si seleccionó pedidos, continúa al onboarding del perfil de negocio
    if (modulos.includes("pedidos")) {
      navigate("/onboarding/pedidos");
      return;
    }

    // Si solo tiene inventarios u otro módulo, entra directo
    navigate(sessionStore.moduloEntryPath || "/pedidos/inicio");
  };

  return (
    <>
      <PageMeta
        title={esOperador ? "Solicita tu acceso · Necto" : "¿Con qué rol vas a entrar? · Necto"}
        description="Selecciona tu rol de acceso a la plataforma"
      />

      <OnboardingLayout
        pasoActual={2}
        totalPasos={2}
        pasoLabel="Rol de acceso"
        brandMessages={BRAND_MESSAGES_ROL}
        brandSummary={{
          eyebrow: "Paso 2 de 2",
          title: esOperador ? "Solicitud de Operador" : "Rol Administrador",
          lines: [
            `Módulos: ${modulosLabel}`,
            esOperador ? "Requiere aprobación de admin" : "Acceso total y configuración",
          ],
        }}
      >
        <div className="w-full">
          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-brand-400">
              Paso 2 de 2 — Rol de acceso
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-ink-title dark:text-white">
              {esOperador ? "Solicita tu acceso" : "¿Con qué rol vas a entrar?"}
            </h1>
            <p className="mt-2 text-sm text-ink-body dark:text-gray-400">
              {esOperador
                ? `Vas a solicitar acceso a ${modulosLabel}. Un administrador revisará tu solicitud y te asignará un rol.`
                : `Vas a entrar a ${modulosLabel}. Elige tu rol para continuar.`}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {ROLES.map((r) => (
              <SelectCard
                key={r.id}
                titulo={r.titulo}
                descripcion={r.descripcion}
                icon={r.icon}
                selected={rol === r.id}
                onSelect={() => setRol(r.id)}
              />
            ))}
          </div>

          <div className="pt-8 mt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/onboarding/perfil")}
              className="rounded-full px-6 text-xs font-semibold cursor-pointer"
            >
              ← Volver a Módulos
            </Button>

            <div className="flex items-center gap-3">
              {esOperador && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/operador/login")}
                  className="rounded-full px-6 text-xs font-semibold cursor-pointer"
                >
                  Simular
                </Button>
              )}

              <Button
                type="button"
                disabled={!rol}
                onClick={handleConfirmar}
                className="rounded-full px-8 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-theme-lg shadow-brand-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {esOperador ? "Solicitar acceso" : "Entrar"}
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
            </div>
          </div>
        </div>
      </OnboardingLayout>
    </>
  );
});

export default OrganizacionOnboardingPage;
