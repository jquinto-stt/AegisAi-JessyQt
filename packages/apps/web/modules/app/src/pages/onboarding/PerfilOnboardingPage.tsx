import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card, CardTitle, CardDescription } from "@/elements/ui/card";
import { organizacionStore } from "@/stores/organizacion.store";
import { sessionStore } from "@/stores/session.store";
import type { IdModuloNegocio } from "@/stores/plataforma.store";
import { OnboardingLayout } from "./OnboardingLayout";

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

const PedidosIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-8 w-8">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const InventariosIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-8 w-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5 12 4l9 5.5v5L12 20l-9-5.5v-5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m3 9.5 9 5.5 9-5.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v5" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// DATA & CARD
// ═══════════════════════════════════════════════════════════════════════════

interface ModuloOption {
  id: IdModuloNegocio;
  titulo: string;
  descripcion: string;
  icon: () => ReactNode;
}

const MODULOS: ModuloOption[] = [
  {
    id: "pedidos",
    titulo: "Pedidos",
    descripcion: "Gestión de pedidos en vivo: estados, preparación, entregas, cobros y catálogo público.",
    icon: PedidosIcon,
  },
  {
    id: "inventarios",
    titulo: "Inventario",
    descripcion: "Control total de stock: productos, existencias por sede, proveedores y órdenes de compra.",
    icon: InventariosIcon,
  },
];

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

const BRAND_MESSAGES_PERFIL = [
  {
    badge: "Selección Modular",
    title: "Elige las herramientas para tu operativa.",
    subtitle: "Pedidos para ventas y entregas en vivo, Inventario para control de existencias.",
  },
  {
    badge: "Flexibilidad Total",
    title: "Combina o activa según tu necesidad.",
    subtitle: "Ambos módulos se integran de forma nativa sin duplicar datos ni productos.",
  },
  {
    badge: "Configuración Rápida",
    title: "Siempre puedes cambiar o sumar más módulos.",
    subtitle: "Ajusta tus canales, personal y flujos en cualquier momento.",
  },
];

export const PerfilOnboardingPage = observer(() => {
  const navigate = useNavigate();
  const usuarioActual = organizacionStore.usuario;

  // Selección múltiple: permite elegir Pedidos, Inventario o ambos
  const [modulos, setModulos] = useState<IdModuloNegocio[]>(["pedidos"]);

  const toggleModulo = (id: IdModuloNegocio) => {
    setModulos((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleContinuar = () => {
    if (modulos.length === 0) return;

    organizacionStore.actualizarPerfil({
      pais: usuarioActual?.pais || "Colombia",
    });

    // Instalar los módulos seleccionados
    if (modulos.includes("pedidos")) {
      organizacionStore.instalarModulo("pedidos");
    }
    if (modulos.includes("inventarios")) {
      organizacionStore.instalarModulo("inventarios");
    }

    sessionStore.setModulos(modulos);

    navigate("/onboarding/organizacion");
  };

  const nombreCompleto = `${usuarioActual?.nombre || "Usuario"} ${
    usuarioActual?.apellido || ""
  }`.trim();
  const emailUsuario = usuarioActual?.email || "usuario@empresa.com";

  const modulosEtiqueta =
    modulos.length === 2
      ? "Pedidos e Inventario"
      : modulos.includes("pedidos")
      ? "Pedidos"
      : modulos.includes("inventarios")
      ? "Inventario"
      : "Ninguno";

  return (
    <>
      <PageMeta title="Seleccionar módulos · Necto" description="Elige los módulos con los que quieres trabajar" />

      <OnboardingLayout
        pasoActual={1}
        totalPasos={2}
        pasoLabel="Módulos"
        brandMessages={BRAND_MESSAGES_PERFIL}
        brandSummary={{
          eyebrow: "Selección inicial",
          title: modulosEtiqueta,
          lines: [
            nombreCompleto,
            emailUsuario,
          ],
        }}
      >
        <div className="w-full">
          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-brand-400">
              Paso 1 de 2 — Módulos
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-ink-title dark:text-white">
              ¿Qué módulo quieres usar?
            </h1>
            <p className="mt-2 text-sm text-ink-body dark:text-gray-400">
              Elige uno o los dos módulos con los que quieres trabajar. Podrás cambiarlo cuando quieras.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {MODULOS.map((m) => (
              <SelectCard
                key={m.id}
                titulo={m.titulo}
                descripcion={m.descripcion}
                icon={m.icon}
                selected={modulos.includes(m.id)}
                onSelect={() => toggleModulo(m.id)}
              />
            ))}
          </div>

          <div className="pt-8 mt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-400">
              Paso 1 de 2
            </span>
            <Button
              type="button"
              disabled={modulos.length === 0}
              onClick={handleContinuar}
              className="rounded-full px-8 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-theme-lg shadow-brand-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
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
      </OnboardingLayout>
    </>
  );
});

export default PerfilOnboardingPage;
