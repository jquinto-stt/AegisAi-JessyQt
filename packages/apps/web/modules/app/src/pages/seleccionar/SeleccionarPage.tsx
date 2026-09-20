import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card, CardTitle, CardDescription } from "@/elements/ui/card";
import { ThemeToggleButton } from "@/shell";
import {
  CATALOGO_MODULOS,
  organizacionStore,
  sessionStore,
  modulosOperablesDeSesion,
  type TipoSesion,
} from "@/stores";

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

interface TipoSesionOption {
  id: TipoSesion;
  titulo: string;
  descripcion: string;
  icon: () => ReactNode;
}

const TIPOS_SESION: TipoSesionOption[] = [
  {
    id: "administrador",
    titulo: "Administrador",
    descripcion: "Acceso completo: configuración, equipo, reportes y ajustes del negocio.",
    icon: AdminIcon,
  },
  {
    id: "operador",
    titulo: "Operador",
    // El operador NO entra: pide acceso. La impersonación ("Viendo como") es una
    // herramienta de administrador y vive en Equipo, no aquí.
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

/**
 * SelectCard — tarjeta seleccionable del flujo Elements.
 *
 * Construida sobre el componente `Card` del catálogo Elements siguiendo el
 * blueprint IconCard (contenedor de ícono + CardTitle + CardDescription). Se
 * envuelve en un <button> para hacer toda la superficie clickeable y añade el
 * estado activo/hover + el check por encima.
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
          : "hover:border-brand-300 hover:shadow-2xs dark:hover:border-brand-500/40"
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
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SeleccionarPage — elige la **vía de entrada** antes de entrar a la app (mock).
 *
 * ── Qué cambió, y por qué ─────────────────────────────────────────────────
 * Esta pantalla tenía DOS pasos: elegir módulo y elegir vía de entrada. El paso
 * de módulos ya solo ofrecía una tarjeta —Pedidos—, así que pedía una decisión
 * que no existía: un selector de un solo elemento no elige nada, y presentarlo
 * como una elección es una mentira en la interfaz. Se eliminó, junto con
 * `turnos` y `agendamiento`, que eran las otras dos opciones.
 *
 * Lo que queda es la parte que sí decidía algo. Las dos vías tienen efectos
 * distintos y reales:
 *   - **Administrador** → `configurar()` deja la sesión autenticada y entra.
 *   - **Operador** → NO entra: va a `/operador/registro` a solicitar acceso. La
 *     sesión queda sin rol, así que `RequireSession` bloquea el shell.
 *
 * ── El módulo, ahora derivado ─────────────────────────────────────────────
 * La sesión recibe la pertenencia real de la organización
 * (`Sesión ⊆ Organización`), no una lista escrita a mano. Si la organización no
 * tiene ningún módulo activo, esta pantalla **no** entra: manda a `/modulos` a
 * agregar uno. Antes, `moduloEntryPath` devolvía `/seleccionar` con la lista
 * vacía, lo que era un bucle de redirección esperando a que alguien lo pisara.
 */
export const SeleccionarPage = observer(() => {
  const navigate = useNavigate();
  const [tipoSesion, setTipoSesion] = useState<TipoSesion | null>(sessionStore.tipoSesion);

  /** El operador no "entra": solicita acceso. Cambia la copia y el CTA. */
  const esOperador = tipoSesion === "operador";

  const modulosDisponibles = modulosOperablesDeSesion(organizacionStore.modulosActivos);
  const nombreModulo = modulosDisponibles[0]
    ? CATALOGO_MODULOS[modulosDisponibles[0]].nombre
    : null;

  const confirmar = () => {
    if (!tipoSesion) return;

    // Sin módulos activos no hay nada que operar: se va a agregarlos. Es la
    // misma regla que sigue el login, y evita que `moduloEntryPath` devuelva
    // `/seleccionar` y la pantalla se recargue a sí misma.
    if (modulosDisponibles.length === 0) {
      navigate("/modulos");
      return;
    }

    sessionStore.configurar(modulosDisponibles, tipoSesion);

    if (tipoSesion === "operador") {
      // Un operador "sale de" un administrador: en vez de entrar al módulo,
      // pasa por una pantalla para dejar sus datos, que (mock) le llegan como
      // notificación al administrador para darlo de alta.
      //
      // `configurar()` deja la sesión SIN autenticar (el tipo "operador" no
      // resuelve a ningún rol), así que `RequireSession` bloquea el shell: el
      // operador no puede colarse. Guardar los módulos sirve para que el
      // formulario de registro pueda pre-seleccionar el módulo solicitado.
      navigate("/operador/registro");
      return;
    }

    navigate(sessionStore.moduloEntryPath);
  };

  return (
    <>
      <PageMeta title="Cómo vas a entrar" description="Elige la vía de entrada a tu organización" />

      <div className="relative min-h-screen bg-gray-50 px-6 py-12 dark:bg-gray-950">
        <div className="fixed right-6 top-6 z-50">
          <ThemeToggleButton variant="floating" />
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col">
          {/* Marca */}
          <div className="mb-8 flex flex-col items-center text-center">
            <img src="/images/logo/necto-icon.svg" alt="NECTO" className="mb-4 h-10 w-10" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {esOperador ? "Solicita tu acceso" : "¿Cómo vas a entrar?"}
            </h1>
            <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
              {esOperador
                ? `Vas a solicitar acceso a ${nombreModulo ?? "tu módulo"}. Un administrador revisará tu solicitud y te asignará un rol.`
                : `Vas a entrar a ${nombreModulo ?? "tu módulo"}. Elige cómo vas a entrar.`}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {TIPOS_SESION.map((r) => (
              <SelectCard
                key={r.id}
                titulo={r.titulo}
                descripcion={r.descripcion}
                icon={r.icon}
                selected={tipoSesion === r.id}
                onSelect={() => setTipoSesion(r.id)}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-end">
            <div className="flex items-center gap-3">
              {/* El CTA dice lo que de verdad pasa: el administrador entra,
                  el operador solicita acceso. Antes ambos decían "Entrar" y
                  había un botón "Simular" aparte, que ya no existe. */}
              <Button size="sm" disabled={!tipoSesion} onClick={confirmar}>
                {esOperador ? "Solicitar acceso" : "Entrar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default SeleccionarPage;
