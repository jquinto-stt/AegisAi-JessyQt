import React, { useState, useEffect } from "react";
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
 * Réplica exacta del diseño de referencia QueryPal:
 *  - Sin background (transparente / trazo limpio).
 *  - División inclinada entre ambos paneles.
 *  - El Código QR está centrado JUSTO EN EL MEDIO entre ambos lados (montado sobre la división central).
 *  - Panel izquierdo: Isotipo hexagonal QueryPal + Nombre de marca en bold + Pregunta en dos líneas.
 *  - Panel derecho: Cápsula complementaria.
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

  useEffect(() => {
    let activo = true;

    QRCode.toDataURL(urlReal, {
      width: 512,
      margin: 1,
      color: {
        dark: "#1A153A",
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
      {/* ── TARJETA QUERYPAL SIN BACKGROUND (TRANSPARENTE / LIMPIO) ── */}
      <div className="relative w-full overflow-hidden bg-transparent">
        <svg
          viewBox="0 0 1000 400"
          className="w-full h-auto block"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Marco exterior sin relleno */}
          <rect
            x="3"
            y="3"
            width="994"
            height="394"
            rx="36"
            fill="none"
            stroke="#1A153A"
            strokeWidth="2.5"
            className="dark:stroke-white/80"
          />

          {/* ── PANEL IZQUIERDO: Silueta con borde derecho inclinado ── */}
          <path
            d="M 44 20
               H 712
               Q 732 20 737 38
               L 775 362
               Q 780 380 758 380
               H 44
               Q 20 380 20 356
               V 44
               Q 20 20 44 20 Z"
            fill="none"
            stroke="#1A153A"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="dark:stroke-white/80"
          />

          {/* Isotipo Hexagonal QueryPal */}
          <g transform="translate(54, 56)">
            {/* Hexágono exterior delineado */}
            <path
              d="M 38 2 L 72 19.5 V 54.5 L 38 72 L 4 54.5 V 19.5 Z"
              fill="none"
              stroke="#1A153A"
              strokeWidth="5"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="dark:stroke-white"
            />
            {/* Hexágono interior sólido */}
            <path
              d="M 38 12.5 L 59 23.5 V 50.5 L 38 61.5 L 17 50.5 V 23.5 Z"
              fill="#1A153A"
              className="dark:fill-white"
            />
            {/* Dos cápsulas verticales blancas */}
            <rect
              x="31"
              y="28"
              width="5"
              height="13"
              rx="2.5"
              fill="#FFFFFF"
              className="dark:fill-[#121212]"
            />
            <rect
              x="42.5"
              y="23.5"
              width="5"
              height="13"
              rx="2.5"
              fill="#FFFFFF"
              className="dark:fill-[#121212]"
            />
          </g>

          {/* Nombre de Marca */}
          <text
            x="146"
            y="112"
            fontFamily="'DM Sans', -apple-system, sans-serif"
            fontSize="48"
            fontWeight="700"
            fill="#1A153A"
            letterSpacing="-0.03em"
            className="dark:fill-white"
          >
            {nombreTienda}
          </text>

          {/* Pregunta Titular en dos líneas */}
          <text
            x="54"
            y="268"
            fontFamily="'DM Sans', -apple-system, sans-serif"
            fontSize="30"
            fontWeight="600"
            fill="#1A153A"
            letterSpacing="-0.025em"
            className="dark:fill-gray-100"
          >
            <tspan x="54" dy="0">{linea1}</tspan>
            <tspan x="54" dy="42">{linea2}</tspan>
          </text>

          {/* ── PANEL DERECHO: Silueta complementaria inclinada ── */}
          <path
            d="M 764 20
               H 956
               Q 980 20 980 44
               V 356
               Q 980 380 956 380
               H 824
               Q 802 380 797 362
               L 759 38
               Q 754 20 764 20 Z"
            fill="none"
            stroke="#1A153A"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="dark:stroke-white/80"
          />

          {/* ── EL CÓDIGO QR CENTRADO JUSTO ENTRE AMBOS LADOS (MONTADO SOBRE LA DIVISIÓN) ──
              La división central entre el panel izquierdo y derecho pasa por X ≈ 760.
              Al ubicar el cuadro blanco de 210x210 en X = 655, queda exactamente 50% en el lado izquierdo
              y 50% en el lado derecho, montado sobre la unión orgánica tal como en la foto de referencia.
          */}
          <rect
            x="655"
            y="95"
            width="210"
            height="210"
            rx="30"
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
              x="677"
              y="117"
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
