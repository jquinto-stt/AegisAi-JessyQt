import React from "react";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { accentHex, accentOnColor, type AccentId } from "../../../auth/profile";
import type { MessageItem } from "../../onboarding.constants";
import { AnimatedStepMessages } from "../onboarding-chrome";

interface NewUserBrandPanelProps {
  messages: MessageItem[];
  /** Nombre completo de la persona, ya capturado en el registro. */
  fullName: string;
  email: string;
  /** Acento elegido en el paso de personalización. */
  accent: AccentId;
  /** Línea de resumen del paso actual (país, motivo, descubrimiento…). */
  summaryLine: string;
}

/**
 * Panel de marca de `onboarding_new_user`.
 *
 * Mismo lenguaje visual que los otros asistentes —rejilla interactiva y copy
 * rotativo— pero el acento elegido por la persona **se aplica de verdad** aquí:
 * el panel es la previsualización en vivo de su elección, no un adorno. El
 * bloque inferior describe a la persona (nombre, correo), nunca a una tienda.
 */
export const NewUserBrandPanel: React.FC<NewUserBrandPanelProps> = ({
  messages,
  fullName,
  email,
  accent,
  summaryLine,
}) => (
  <div
    className="relative flex min-h-[420px] flex-col justify-between overflow-hidden border-l border-transparent p-8 transition-colors duration-500 sm:p-12 lg:col-span-5 lg:min-h-[560px] dark:border-secondary-900/50"
    style={{ backgroundColor: accentHex(accent), color: accentOnColor(accent) }}
  >
    <InteractiveDotGrid dotGap={26} baseRadius={1.5} activeRadius={3.0} glowDistance={150} />

    <div className="relative z-10 flex h-full animate-in flex-col justify-between fade-in duration-300">
      <img src="/images/logo/necto-full-white.svg" alt="Necto" className="h-7 w-auto" />

      <div className="my-auto space-y-6">
        <AnimatedStepMessages messages={messages} />

        <div className="pt-6">
          {/* Separador con `currentColor` atenuado: el panel cambia de color con
              el acento elegido, así que el borde debe seguir al texto, no a un
              token fijo. */}
          <div className="h-px w-full" style={{ backgroundColor: "currentColor", opacity: 0.25 }} />

          <div className="space-y-2 pt-5">
            <span className="text-theme-xs font-bold uppercase tracking-[0.2em] opacity-60">
              Tu cuenta
            </span>
            <p className="truncate text-2xl font-bold leading-tight tracking-tight">
              {fullName.trim() || "Sin nombre todavía"}
            </p>
            <p className="truncate text-theme-sm font-medium opacity-85">{email.trim() || "Sin correo"}</p>
            <p className="text-theme-sm font-medium opacity-85">{summaryLine}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);
