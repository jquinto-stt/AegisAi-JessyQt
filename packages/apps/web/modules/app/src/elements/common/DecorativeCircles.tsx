import React from "react";

/**
 * DecorativeCircles — aros de marca para los paneles de color.
 *
 * ── Medido sobre la referencia, no aproximado ───────────────────────────────
 *
 * La referencia de marca trae TRES aros, no uno, y son GRUESOS:
 *
 *   · dos aros claros, de 18 px de trazo, cortados por los bordes —uno arriba a
 *     la izquierda y otro abajo a la derecha—;
 *   · un aro de acento grande, de ~22 px de trazo, cortado por el borde derecho
 *     y a plena intensidad.
 *
 * El aro claro mide `#4d3199` sobre el panel índigo `#190088`, que es
 * exactamente blanco al ~15 %. Por eso los dos aros claros son BLANCOS en las
 * dos variantes: sobre naranja se leen como blanco rebajado y sobre índigo dan
 * el tono que pide la referencia. Lo que cambia entre variantes es el aro de
 * acento, que sobre naranja no puede ser naranja.
 *
 * Antes esto eran siete adornos de 2–5 px al 12–18 % de opacidad: se veía uno
 * —el de acento— y los demás no existían a efectos prácticos.
 *
 * El componente es puramente decorativo (`aria-hidden`, `pointer-events-none`)
 * y se posiciona en absoluto sobre el contenedor padre, que necesita
 * `overflow-hidden` para que los aros queden cortados por los bordes.
 */

export interface DecorativeCirclesProps {
  /** Esquema de color que corresponde al fondo del panel. */
  variant?: "brand" | "indigo";
  /** Clases extra en el contenedor. */
  className?: string;
}

export function DecorativeCircles({
  variant = "brand",
  className = "",
}: DecorativeCirclesProps) {
  const isBrand = variant === "brand";

  // Los dos aros claros: blancos en las dos variantes (ver la nota de arriba).
  const claro = "rgba(255,255,255,0.55)";
  // El aro de acento: naranja de marca sobre índigo; sobre naranja no se vería,
  // así que ahí va en blanco rebajado.
  const acento = isBrand ? "rgba(255,255,255,0.35)" : "#FF3F1A";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Arriba-izquierda: aro grande, cortado por los dos bordes. */}
      <div
        className="absolute rounded-full opacity-[0.30]"
        style={{
          width: "440px",
          height: "440px",
          top: "-160px",
          left: "-170px",
          border: `18px solid ${claro}`,
        }}
      />

      {/* Abajo-derecha: aro mediano, cortado por abajo. */}
      <div
        className="absolute rounded-full opacity-[0.28]"
        style={{
          width: "320px",
          height: "320px",
          bottom: "-130px",
          right: "-90px",
          border: `18px solid ${claro}`,
        }}
      />

      {/* Derecha: el aro de acento, cortado por el borde derecho y a plena
          intensidad — es el que da el golpe de color de la referencia. */}
      <div
        className="absolute rounded-full"
        style={{
          width: "280px",
          height: "280px",
          top: "50%",
          right: "-110px",
          transform: "translateY(-50%)",
          border: `22px solid ${acento}`,
          opacity: isBrand ? 0.55 : 0.92,
        }}
      />
    </div>
  );
}

export default DecorativeCircles;
