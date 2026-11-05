import { TruckIcon } from "@heroicons/react/24/outline";

import type { Transportadora } from "@/domain/pedidos/transportadoras.catalogo";

// ═══════════════════════════════════════════════════════════════════════════
// LOGO DE TRANSPORTADORA
// ═══════════════════════════════════════════════════════════════════════════
//
// El logo no es adorno: en una cola de novedades la primera pregunta del
// operador es «¿a quién le reclamo?», y el wordmark de la transportadora se
// reconoce antes que su nombre escrito.
//
// ── Por qué el fondo cambia por transportadora ─────────────────────────────
//
// Los logos vienen en dos familias: unos son tinta oscura sobre transparente y
// necesitan fondo claro; otros —InterRapidísimo— son claros y desaparecen sobre
// blanco. `fondoLogo: "oscuro"` en el catálogo es la única señal, y pintar todos
// igual deja un logo invisible sin que nada avise.
//
// ── Por qué `max-w` y no `w-full` ──────────────────────────────────────────
//
// Van de 5:1 a cuadrado. Al límite del recuadro un wordmark toca el borde y
// parece recortado; con `object-contain` y aire dentro, se lee.
// ═══════════════════════════════════════════════════════════════════════════

const MEDIDAS = {
  sm: { caja: "h-7 w-16", icono: "size-4" },
  md: { caja: "h-9 w-[96px]", icono: "size-5" },
  lg: { caja: "h-11 w-[120px]", icono: "size-6" },
} as const;

export interface LogoTransportadoraProps {
  transportadora: Transportadora | undefined;
  /** Nombre a mostrar cuando la transportadora no está en el catálogo. */
  nombre?: string;
  tamano?: keyof typeof MEDIDAS;
  className?: string;
}

export const LogoTransportadora = ({
  transportadora,
  nombre,
  tamano = "md",
  className = "",
}: LogoTransportadoraProps) => {
  const m = MEDIDAS[tamano];
  const fondo = !transportadora?.logo
    ? "bg-[#ECECEC] dark:bg-white/[0.08]"
    : transportadora.fondoLogo === "oscuro"
      ? "bg-[#212121] ring-1 ring-black/10 dark:ring-white/15"
      : "bg-white ring-1 ring-[#ECECEC] dark:ring-white/10";

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md px-1.5 ${m.caja} ${fondo} ${className}`}
      // El nombre viaja en el `title` porque el logo es una imagen decorativa:
      // sin esto, un logo sin `alt` no dice a quién pertenece.
      title={transportadora?.nombre ?? nombre}
    >
      {transportadora?.logo ? (
        <img
          src={transportadora.logo}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : (
        <TruckIcon className={`${m.icono} text-gray-400 dark:text-white/40`} aria-hidden="true" />
      )}
    </span>
  );
};

export default LogoTransportadora;
