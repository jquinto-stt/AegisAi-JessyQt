import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card, CardTitle, CardDescription } from "@/elements/ui/card";
import { ThemeToggleButton } from "@/shell";
import { sessionStore, type Modulo, type Rol } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

const TurnosIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-8 w-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const AgendaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-8 w-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V11.25A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const PedidosIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-8 w-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

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

interface ModuloOption {
  id: Modulo;
  titulo: string;
  descripcion: string;
  icon: () => ReactNode;
}

const MODULOS: ModuloOption[] = [
  {
    id: "turnos",
    titulo: "Turnos",
    descripcion: "Gestiona la fila en vivo: filas, atención de turnos, display de sala y encuestas.",
    icon: TurnosIcon,
  },
  {
    id: "agendamiento",
    titulo: "Agendamiento",
    descripcion: "Citas con profesionales: agenda por profesional, calendario y analítica de clientes.",
    icon: AgendaIcon,
  },
  {
    id: "pedidos",
    titulo: "Pedidos",
    descripcion: "Flujo de pedidos que llegan por WhatsApp: tablero por estados, entrega e historial.",
    icon: PedidosIcon,
  },
];

interface RolOption {
  id: Rol;
  titulo: string;
  descripcion: string;
  icon: () => ReactNode;
}

const ROLES: RolOption[] = [
  {
    id: "administrador",
    titulo: "Administrador",
    descripcion: "Acceso completo: configuración, filas/profesionales, reportes y ajustes del negocio.",
    icon: AdminIcon,
  },
  {
    id: "operador",
    titulo: "Operador",
    descripcion: "Operación del día a día: atender turnos y gestionar citas, sin cambiar la configuración.",
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

/**
 * SelectCard — tarjeta seleccionable del flujo Elements.
 *
 * Construida sobre el componente `Card` del catálogo Elements siguiendo el
 * blueprint IconCard (contenedor de ícono + CardTitle + CardDescription). Se
 * envuelve en un <button> para hacer toda la superficie clickeable y añade el
 * estado activo/hover + el check por encima. Sirve tanto para selección
 * múltiple (módulos, toggle) como exclusiva (rol).
 */
const SelectCard = ({ titulo, descripcion, icon: Icon, selected, onSelect }: SelectCardProps) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className="group relative rounded-xl text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
  >
    <Card
      className={`h-full transition-all ${
        selected
          ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/30 dark:border-brand-400 dark:bg-brand-500/10"
          : "hover:border-brand-300 hover:shadow-sm dark:hover:border-brand-500/40"
      }`}
    >
      {/* IconCard blueprint: contenedor de ícono h-14 max-w-14 rounded-[10.5px] */}
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
      <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white">
        <CheckIcon />
      </span>
    )}
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════
// STEP INDICATOR
// ═══════════════════════════════════════════════════════════════════════════

const StepDots = ({ step }: { step: 1 | 2 }) => (
  <div className="flex items-center gap-2">
    <span className={`h-2 rounded-full transition-all ${step === 1 ? "w-6 bg-brand-500" : "w-2 bg-gray-300 dark:bg-gray-700"}`} />
    <span className={`h-2 rounded-full transition-all ${step === 2 ? "w-6 bg-brand-500" : "w-2 bg-gray-300 dark:bg-gray-700"}`} />
  </div>
);

/** Etiqueta legible del conjunto de módulos elegidos, para el subtítulo. */
const sessionModulosLabel = (modulos: Modulo[]) => {
  const label: Record<Modulo, string> = { turnos: "Turnos", agendamiento: "Agendamiento", pedidos: "Pedidos" };
  const nombres = modulos.map((m) => label[m]);
  if (nombres.length === 0) return "tu módulo";
  if (nombres.length === 1) return `el módulo de ${nombres[0]}`;
  return `los módulos de ${nombres.join(" y ")}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SeleccionarPage — pantalla de configuración previa post-login (mock).
 *
 * Paso 1: elegir módulo (Turnos | Agendamiento).
 * Paso 2: elegir rol (Administrador | Operador).
 * Al confirmar, guarda la selección en sessionStore y navega a la vista de
 * configuración del módulo elegido.
 */
export const SeleccionarPage = observer(() => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  // Seleccion multiple: el usuario puede elegir uno o los dos modulos.
  const [modulos, setModulos] = useState<Modulo[]>([...sessionStore.modulos]);
  const [rol, setRol] = useState<Rol | null>(sessionStore.rol);

  const toggleModulo = (m: Modulo) => {
    setModulos((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const goToRol = () => {
    if (modulos.length === 0) return;
    setStep(2);
  };

  const confirmar = () => {
    if (modulos.length === 0 || !rol) return;
    sessionStore.configurar(modulos, rol);

    if (rol === "operador") {
      // Un operador "sale de" un administrador: en vez de entrar al modulo,
      // pasa por una pantalla para dejar sus datos, que (mock) le llegan como
      // notificacion al administrador para darlo de alta.
      navigate("/operador/registro");
      return;
    }

    // Administrador: entra directo al modulo funcional. Regla acordada: si
    // eligio ambos modulos, entra por Turnos (navegable luego por el sidebar).
    navigate(sessionStore.moduloEntryPath);
  };

  return (
    <>
      <PageMeta title="Seleccionar módulo" description="Elige el módulo y tu rol para continuar" />

      <div className="relative min-h-screen bg-gray-50 px-6 py-12 dark:bg-gray-950">
        <div className="fixed right-6 top-6 z-50">
          <ThemeToggleButton variant="floating" />
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col">
          {/* Marca */}
          <div className="mb-8 flex flex-col items-center text-center">
            <img src="/images/logo/necto-icon.svg" alt="NECTO" className="mb-4 h-10 w-10" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {step === 1 ? "¿Qué módulo quieres usar?" : "¿Con qué rol vas a entrar?"}
            </h1>
            <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
              {step === 1
                ? "Elige uno o los dos módulos con los que quieres trabajar. Podrás cambiarlo cuando quieras."
                : `Vas a entrar a ${sessionModulosLabel(modulos)}. Elige tu rol para continuar.`}
            </p>
          </div>

          {/* Paso 1: módulos */}
          {step === 1 && (
            <>
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
              <div className="mt-8 flex items-center justify-between">
                <StepDots step={1} />
                <Button size="sm" disabled={modulos.length === 0} onClick={goToRol}>Continuar</Button>
              </div>
            </>
          )}

          {/* Paso 2: rol */}
          {step === 2 && (
            <>
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
              <div className="mt-8 flex items-center justify-between">
                <StepDots step={2} />
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" onClick={() => setStep(1)}>Atrás</Button>
                  {/* Simular: solo tiene sentido para el rol operador (mock). */}
                  {rol === "operador" && (
                    <Button size="sm" variant="outline" onClick={() => navigate("/operador/login")}>
                      Simular
                    </Button>
                  )}
                  <Button size="sm" disabled={!rol} onClick={confirmar}>Entrar</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
});

export default SeleccionarPage;
