import React from "react";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";

export interface BrandPanelSummary {
  eyebrow: string;
  title: string;
  lines: string[];
}

export interface BrandPanelProps {
  badge: string;
  headline: string;
  description: string;
  bullets?: string[];
  summary: BrandPanelSummary;
}

export const OnboardingBrandPanel: React.FC<BrandPanelProps> = ({
  badge,
  headline,
  description,
  bullets = [],
  summary,
}) => {
  return (
    <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between overflow-hidden bg-brand-500 p-10 xl:p-12 text-white shadow-2xl dark:bg-secondary-600">
      {/* Mosaico de estrellas interactivo */}
      <InteractiveDotGrid dotGap={26} baseRadius={1.6} activeRadius={3.8} glowDistance={150} />

      {/* Header del Panel */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md text-white font-black text-lg border border-white/20">
            N
          </div>
          <span className="text-xl font-bold tracking-tight text-white">NECTO</span>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
          {badge}
        </span>
      </div>

      {/* Mensajes centrales de la marca */}
      <div className="relative z-10 my-auto space-y-6 max-w-md">
        <div className="space-y-3">
          <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight leading-snug text-white">
            {headline}
          </h2>
          <p className="text-sm font-medium text-white/85 leading-relaxed">
            {description}
          </p>
        </div>

        {bullets.length > 0 && (
          <ul className="space-y-2.5 pt-2">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex items-center gap-2.5 text-xs font-semibold text-white/90">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
                  ✓
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Resumen dinámico en vivo en el pie del panel */}
      <div className="relative z-10 border-t border-white/20 pt-6 backdrop-blur-[2px]">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/60 block mb-1">
          {summary.eyebrow}
        </span>
        <p className="truncate text-xl font-bold leading-tight text-white">
          {summary.title || "Completando información…"}
        </p>
        <div className="mt-2 space-y-1">
          {summary.lines.filter(Boolean).map((line, idx) => (
            <p key={idx} className="text-xs font-medium text-white/80">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingBrandPanel;
