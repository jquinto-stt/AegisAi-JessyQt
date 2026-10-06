import React from "react";

/**
 * DecorativeCircles — ornamentos circulares de marca para paneles de color.
 *
 * Inspirados en el manual de marca Necto: aros grandes en los bordes del panel,
 * parcialmente recortados por `overflow-hidden` del contenedor padre, generando
 * profundidad y movimiento visual sin competir con el contenido.
 *
 * Variantes:
 *  - `"brand"` (default): aros blancos semitransparentes + aro rojo accent,
 *     diseñados para fondo naranja (`bg-brand-500`).
 *  - `"indigo"`: aros índigo/violeta suaves + aro rojo accent,
 *     diseñados para fondo índigo oscuro.
 *
 * El componente es puramente decorativo (`aria-hidden`, `pointer-events-none`)
 * y se posiciona en absoluto sobre el contenedor padre.
 */

export interface DecorativeCirclesProps {
  /** Color scheme matching the panel background. */
  variant?: "brand" | "indigo";
  /** Extra CSS classes on the wrapper. */
  className?: string;
}

export function DecorativeCircles({
  variant = "brand",
  className = "",
}: DecorativeCirclesProps) {
  const isBrand = variant === "brand";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* ── Top-left: large ring, partially clipped ── */}
      <div
        className="absolute rounded-full border-[3px] opacity-[0.18]"
        style={{
          width: "340px",
          height: "340px",
          top: "-80px",
          left: "-90px",
          borderColor: isBrand ? "rgba(255,255,255,0.6)" : "rgba(99,102,241,0.45)",
        }}
      />

      {/* ── Top-left: smaller concentric ring ── */}
      <div
        className="absolute rounded-full border-[2.5px] opacity-[0.12]"
        style={{
          width: "200px",
          height: "200px",
          top: "-20px",
          left: "-30px",
          borderColor: isBrand ? "rgba(255,255,255,0.5)" : "rgba(129,140,248,0.35)",
        }}
      />

      {/* ── Bottom-left: medium filled circle, soft glow ── */}
      <div
        className="absolute rounded-full opacity-[0.08]"
        style={{
          width: "180px",
          height: "180px",
          bottom: "-50px",
          left: "8%",
          background: isBrand
            ? "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(129,140,248,0.4) 0%, transparent 70%)",
        }}
      />

      {/* ── Right: large accent ring (red/coral), partially clipped ── */}
      <div
        className="absolute rounded-full border-[5px]"
        style={{
          width: "320px",
          height: "320px",
          top: "50%",
          right: "-100px",
          transform: "translateY(-50%)",
          borderColor: "#FF3F1A",
          opacity: isBrand ? 0.35 : 0.30,
        }}
      />

      {/* ── Right: inner accent ring ── */}
      <div
        className="absolute rounded-full border-[3px]"
        style={{
          width: "220px",
          height: "220px",
          top: "50%",
          right: "-50px",
          transform: "translateY(-50%)",
          borderColor: "#FF3F1A",
          opacity: isBrand ? 0.18 : 0.15,
        }}
      />

      {/* ── Bottom-right: small white ring ── */}
      <div
        className="absolute rounded-full border-[2px] opacity-[0.14]"
        style={{
          width: "100px",
          height: "100px",
          bottom: "12%",
          right: "15%",
          borderColor: isBrand ? "rgba(255,255,255,0.6)" : "rgba(165,180,252,0.4)",
        }}
      />

      {/* ── Top-right: tiny filled dot ── */}
      <div
        className="absolute rounded-full opacity-[0.20]"
        style={{
          width: "14px",
          height: "14px",
          top: "18%",
          right: "22%",
          background: isBrand ? "rgba(255,255,255,0.7)" : "rgba(199,210,254,0.5)",
        }}
      />

      {/* ── Center-left: floating dot ── */}
      <div
        className="absolute rounded-full opacity-[0.15]"
        style={{
          width: "10px",
          height: "10px",
          top: "55%",
          left: "18%",
          background: isBrand ? "rgba(255,255,255,0.6)" : "rgba(165,180,252,0.4)",
        }}
      />
    </div>
  );
}

export default DecorativeCircles;
