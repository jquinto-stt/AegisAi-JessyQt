import React, { useState, useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import QRCode from "qrcode";
import { organizacionStore, slugDe } from "@/stores/organizacion.store";

interface TarjetaQrTiendaProps {
  nombre?: string;
  slug?: string;
  subtitulo?: string;
  className?: string;
}

/**
 * Tarjeta de URL y Código QR del negocio.
 * Réplica idéntica y vectorial del diseño de referencia QueryPal:
 *  - Fondo celeste/cian pastel prominente (#C5DEE5).
 *  - División orgánica inclinada (~6°).
 *  - Panel izquierdo: Isotipo hexagonal QueryPal + Nombre de marca en bold + Pregunta en dos líneas.
 *  - Panel derecho: Código QR en recuadro blanco perfectamente centrado horizontal y verticalmente.
 */
export const TarjetaQrTienda: React.FC<TarjetaQrTiendaProps> = observer(({
  nombre,
  slug,
  subtitulo,
  className = "",
}) => {
  const org = organizacionStore.organizacion;
  const nombreTienda = (nombre || org?.nombre || "QueryPal").trim();
  const slugTienda = slug || slugDe(nombreTienda);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://necto.app";
  const urlReal = `${origin}/catalogo-clientes?org=${slugTienda}`;

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const svgRef = useRef<SVGSVGElement>(null);

  // Generación reactiva del código QR en alta resolución
  useEffect(() => {
    let activo = true;

    QRCode.toDataURL(urlReal, {
      width: 512,
      margin: 1,
      color: {
        dark: "#1A153A", // Azul marino / morado oscuro idéntico a QueryPal
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })
      .then((dataUri) => {
        if (activo) setQrDataUrl(dataUri);
      })
      .catch((err) => console.error("[TarjetaQrTienda] Error generando QR:", err));

    return () => {
      activo = false;
    };
  }, [urlReal]);

  const copiarEnlace = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(urlReal);
      }
    } catch {
      // noop
    }
  };

  // Textos idénticos al cartel de QueryPal (o subtítulo custom si se envía)
  const linea1 = subtitulo
    ? subtitulo.split("?")[0] + (subtitulo.includes("?") ? "?" : "")
    : "How much could agentic AI";
  const linea2 = subtitulo
    ? "¿Quieres impulsar tus pedidos y catálogo digital?"
    : "reduce your support cost and risk?";

  return (
    <div className={`w-full max-w-5xl select-none font-['DM_Sans',sans-serif] ${className}`}>
      {/* ── TARJETA QUERYPAL CON BACKGROUND CIAN/MINT DEFINIDO Y CENTRADO PERFECTO ── */}
      <div
        className="relative w-full overflow-hidden rounded-[32px] sm:rounded-[38px] border-[2.5px] border-[#1A153A] shadow-md transition-shadow"
        style={{ backgroundColor: "#C5DEE5" }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1000 420"
          className="w-full h-auto block"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fondo uniforme cian pastel visible (#C5DEE5) */}
          <rect
            x="0"
            y="0"
            width="1000"
            height="420"
            fill="#C5DEE5"
          />

          {/* ── PANEL IZQUIERDO: Silueta con esquina derecha inclinada ── */}
          <path
            d="M 44 20
               H 710
               Q 732 20 737 40
               L 775 376
               Q 780 398 758 398
               H 44
               Q 20 398 20 374
               V 44
               Q 20 20 44 20 Z"
            fill="none"
            stroke="#1A153A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Isotipo Hexagonal QueryPal */}
          <g transform="translate(54, 58)">
            {/* Hexágono exterior delineado */}
            <path
              d="M 38 2 L 72 19.5 V 54.5 L 38 72 L 4 54.5 V 19.5 Z"
              fill="none"
              stroke="#1A153A"
              strokeWidth="5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Hexágono interior sólido */}
            <path
              d="M 38 12.5 L 59 23.5 V 50.5 L 38 61.5 L 17 50.5 V 23.5 Z"
              fill="#1A153A"
            />
            {/* Dos cápsulas verticales blancas */}
            <rect x="31" y="28" width="5" height="13" rx="2.5" fill="#FFFFFF" />
            <rect x="42.5" y="23.5" width="5" height="13" rx="2.5" fill="#FFFFFF" />
          </g>

          {/* Nombre de Marca */}
          <text
            x="146"
            y="114"
            fontFamily="'DM Sans', -apple-system, sans-serif"
            fontSize="48"
            fontWeight="700"
            fill="#1A153A"
            letterSpacing="-0.03em"
          >
            {nombreTienda}
          </text>

          {/* Pregunta Titular en dos líneas (Exacto a QueryPal) */}
          <text
            x="54"
            y="274"
            fontFamily="'DM Sans', -apple-system, sans-serif"
            fontSize="31"
            fontWeight="600"
            fill="#1A153A"
            letterSpacing="-0.025em"
          >
            <tspan x="54" dy="0">{linea1}</tspan>
            <tspan x="54" dy="44">{linea2}</tspan>
          </text>

          {/* ── PANEL DERECHO: Silueta complementaria inclinada ── */}
          <path
            d="M 764 20
               H 954
               Q 978 20 978 44
               V 374
               Q 978 398 954 398
               H 824
               Q 802 398 797 376
               L 759 40
               Q 754 20 764 20 Z"
            fill="none"
            stroke="#1A153A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* ── MARCO BLANCO DEL QR (PERFECTAMENTE CENTRADO EN EL PANEL DERECHO) ──
              Centro del panel derecho = X ≈ 868, Y = 210.
              Marco de 204 x 204 -> X = 766, Y = 108.
          */}
          <rect
            x="766"
            y="108"
            width="204"
            height="204"
            rx="28"
            fill="#FFFFFF"
            stroke="#1A153A"
            strokeWidth="3.5"
            style={{ cursor: "pointer" }}
            onClick={copiarEnlace}
          />

          {/* Código QR escaneable centrado dentro del marco blanco */}
          {qrDataUrl && (
            <image
              href={qrDataUrl}
              x="785"
              y="127"
              width="166"
              height="166"
              style={{ cursor: "pointer" }}
              onClick={copiarEnlace}
            />
          )}
        </svg>
      </div>
    </div>
  );
});

export default TarjetaQrTienda;
