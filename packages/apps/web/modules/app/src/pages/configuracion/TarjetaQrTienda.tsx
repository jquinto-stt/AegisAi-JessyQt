import React, { useState, useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import QRCode from "qrcode";
import { CheckIcon } from "@heroicons/react/24/outline";
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
 *  - Marco horizontal apaisado con esquinas redondeadas.
 *  - Fondo uniforme celeste/cian pastel (#D7E6EB).
 *  - Doble panel orgánico con división inclinada (~7°).
 *  - Panel izquierdo: Isotipo hexagonal QueryPal + Nombre de marca en bold + Pregunta destacada en dos líneas.
 *  - Panel derecho: Código QR enmarcado en recuadro blanco con borde oscuro grueso.
 */
export const TarjetaQrTienda: React.FC<TarjetaQrTiendaProps> = observer(({
  nombre,
  slug,
  subtitulo,
  className = "",
}) => {
  const org = organizacionStore.organizacion;
  const nombreTienda = (nombre || org?.nombre || "Tu Negocio").trim();
  const slugTienda = slug || slugDe(nombreTienda);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://necto.app";
  const urlReal = `${origin}/catalogo-clientes?org=${slugTienda}`;
  const urlAmigable = `necto.app/${slugTienda}`;

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Generación reactiva del código QR en alta resolución
  useEffect(() => {
    let activo = true;

    QRCode.toDataURL(urlReal, {
      width: 512,
      margin: 1,
      color: {
        dark: "#1A153A", // Color morado/azul marino oscuro profundo idéntico al diseño
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
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    } catch {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    }
  };

  // Descargar la tarjeta completa como imagen PNG de alta definición
  const descargarBannerPng = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URLObject = window.URL || window.webkitURL || window;
    const blobURL = URLObject.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#D7E6EB";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `tarjeta-qr-${slugTienda}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      URLObject.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  // Textos adaptados respetando el estilo de dos líneas de QueryPal
  const linea1 = subtitulo
    ? subtitulo.split("?")[0] + (subtitulo.includes("?") ? "?" : "")
    : "How much could agentic AI";
  const linea2 = subtitulo
    ? "¿Quieres impulsar tus pedidos y catálogo digital?"
    : "reduce your support cost and risk?";

  return (
    <div className={`w-full max-w-4xl select-none font-['DM_Sans',sans-serif] ${className}`}>
      {/* ── VECTOR EXACTO QUERYPAL (Siempre mantiene relación de aspecto horizontal) ── */}
      <div className="relative w-full overflow-hidden rounded-[32px] sm:rounded-[36px] shadow-sm hover:shadow-md transition-shadow">
        <svg
          ref={svgRef}
          viewBox="0 0 960 400"
          className="w-full h-auto block"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fondo pastel uniforme celeste/cian */}
          <rect
            x="2"
            y="2"
            width="956"
            height="396"
            rx="34"
            fill="#D7E6EB"
            stroke="#1A153A"
            strokeWidth="3"
          />

          {/* ── PANEL IZQUIERDO: Conector orgánico inclinado a la derecha ── */}
          <path
            d="M 44 20
               H 692
               Q 713 20 718 38
               L 754 362
               Q 759 380 738 380
               H 44
               Q 20 380 20 356
               V 44
               Q 20 20 44 20 Z"
            fill="none"
            stroke="#1A153A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Isotipo Hexagonal QueryPal */}
          <g transform="translate(52, 60)">
            {/* Hexágono exterior delineado */}
            <path
              d="M 36 2 L 68 18.5 V 51.5 L 36 68 L 4 51.5 V 18.5 Z"
              fill="none"
              stroke="#1A153A"
              strokeWidth="5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Hexágono interior sólido */}
            <path
              d="M 36 12 L 56 22.5 V 47.5 L 36 58 L 16 47.5 V 22.5 Z"
              fill="#1A153A"
            />
            {/* Dos cápsulas verticales blancas */}
            <rect x="29" y="27" width="4.5" height="12" rx="2.25" fill="#FFFFFF" />
            <rect x="40" y="23" width="4.5" height="12" rx="2.25" fill="#FFFFFF" />
          </g>

          {/* Nombre de la Marca */}
          <text
            x="138"
            y="110"
            fontFamily="'DM Sans', -apple-system, sans-serif"
            fontSize="46"
            fontWeight="700"
            fill="#1A153A"
            letterSpacing="-0.03em"
          >
            {nombreTienda}
          </text>

          {/* Pregunta Titular en dos líneas (Exacto a QueryPal) */}
          <text
            x="52"
            y="262"
            fontFamily="'DM Sans', -apple-system, sans-serif"
            fontSize="30"
            fontWeight="600"
            fill="#1A153A"
            letterSpacing="-0.02em"
          >
            <tspan x="52" dy="0">{linea1}</tspan>
            <tspan x="52" dy="44">{linea2}</tspan>
          </text>

          {/* ── PANEL DERECHO: Ranura inclinada y marco del Código QR ── */}
          <path
            d="M 744 20
               H 916
               Q 940 20 940 44
               V 356
               Q 940 380 916 380
               H 798
               Q 778 380 773 362
               L 737 38
               Q 732 20 744 20 Z"
            fill="none"
            stroke="#1A153A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Marco blanco para el Código QR con borde oscuro grueso */}
          <rect
            x="754"
            y="114"
            width="172"
            height="172"
            rx="26"
            fill="#FFFFFF"
            stroke="#1A153A"
            strokeWidth="3"
            style={{ cursor: "pointer" }}
            onClick={copiarEnlace}
          />

          {/* Imagen del Código QR escaneable */}
          {qrDataUrl && (
            <image
              href={qrDataUrl}
              x="770"
              y="130"
              width="140"
              height="140"
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
