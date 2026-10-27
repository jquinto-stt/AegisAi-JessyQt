import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { animate } from "motion/react";
import { PageMeta } from "@/shell/meta";
import { organizacionStore, PAISES_CONFIG } from "@/stores/organizacion.store";
import { sessionStore } from "@/stores/session.store";
import { desactivarModoDemo } from "@/lib/modo-demo";
import { completarAltaOrganizacion } from "@/lib/auth.service";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import { usePasoOnboardingMontado } from "./useTransicionOnboarding";

/**
 * Barra de progreso: el contador usa la misma curva, retardo y duración que
 * `.anim-necto-progress` para que el número y el ancho avancen a la par.
 */
const PROGRESO_RETARDO_S = 1.6;
const PROGRESO_DURACION_S = 4.5;
const PROGRESO_CURVA: [number, number, number, number] = [0.2, 0.1, 0.25, 1];

/**
 * OnboardingCargandoPage
 *
 * Secuencia de Motion Graphics NECTO (7.0 segundos totales):
 * - 0.0s – 0.8s: Primer impulso — el acento azul marino de la "N" aparece con escala sutil y se asienta.
 * - 0.8s – 2.0s: Revelación del wordmark — NECTO en blanco emerge con fade-in y desplazamiento suave de 12px hacia arriba.
 * - 2.0s – 3.0s: Revelación del tagline — "grow together" aparece sutilmente en 2 líneas bajo el logo.
 * - 3.0s – 7.0s: Indicador de carga piramidal casi pegado al logo — barra horizontal simétrica más ancha que el logo,
 *               con progreso continuo azul marino de 0% a 100% durante 4.0 segundos, y "Conectando tu negocio" en tipografía nítida y destacada.
 */
export function OnboardingCargandoPage() {
  const navigate = useNavigate();
  usePasoOnboardingMontado();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/inicio";
  const barraRef = useRef<HTMLDivElement | null>(null);
  const contadorRef = useRef<HTMLSpanElement | null>(null);

  // Contador 0 → 100 %. Escribe directo en el nodo en vez de pasar por el estado
  // de React: así no hay un render por fotograma mientras corre la animación.
  useEffect(() => {
    const barra = barraRef.current;
    const contador = contadorRef.current;
    if (!barra || !contador) return;
    const control = animate(0, 100, {
      duration: PROGRESO_DURACION_S,
      delay: PROGRESO_RETARDO_S,
      ease: PROGRESO_CURVA,
      onUpdate: (valor) => {
        const entero = Math.round(valor);
        contador.textContent = `${entero}%`;
        barra.setAttribute("aria-valuenow", String(entero));
      },
    });
    return () => control.stop();
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function finalizarOnboarding() {
      const paisActual = organizacionStore.usuario?.pais || "Colombia";
      const configPais = PAISES_CONFIG[paisActual] || PAISES_CONFIG["Colombia"];
      const nombreOrg =
        organizacionStore.organizacion?.nombre ||
        (organizacionStore.usuario?.nombre
          ? `Organización de ${organizacionStore.usuario.nombre}`
          : "Mi Organización");

      // Limpieza de modo demo
      desactivarModoDemo();
      organizacionStore.desinstalarModulo("pedidos");
      organizacionStore.desinstalarModulo("inventarios");
      organizacionStore.setConectorActivo("pedidos", "whatsapp", false);
      sessionStore.configurar([], "administrador");
      sessionStore.setModulos([]);

      // Persistencia en Supabase
      try {
        await completarAltaOrganizacion({
          nombreOrg,
          pais: paisActual,
          moneda: configPais.moneda,
          zonaHoraria: configPais.zonaHoraria,
          tipoEmpresa: organizacionStore.organizacion?.tipoEmpresa,
          tamanoEquipo: organizacionStore.organizacion?.tamanoEquipo,
          modulos: [],
          rol: "administrador",
        });
      } catch (err) {
        console.error("[OnboardingCargandoPage] Error al persistir alta en Supabase:", err);
      }

      organizacionStore.actualizarPerfil({
        perfilCompletado: true,
      });

      if (!cancelado) {
        navigate(redirectTo, { replace: true });
      }
    }

    // Duración total exacta solicitada: 7.0 segundos (7000ms)
    const timer = setTimeout(() => {
      void finalizarOnboarding();
    }, 7000);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [navigate, redirectTo]);

  return (
    <>
      <PageMeta
        title="Conectando tu negocio — Necto"
        description="Preparando tu plataforma Necto."
      />

      <style>{`
        /* --- HIGH-END ORCHESTRATED MOTION GRAPHICS (NECTO LOGO) --- */

        /* 1. Acento azul marino (#190088): Entrada elástica precisa y pulso sutil de energía */
        @keyframes nectoAccentEntrance {
          0% {
            opacity: 0;
            transform: scale(0.2) translateY(-8px);
          }
          60% {
            opacity: 1;
            transform: scale(1.14) translateY(0px);
          }
          82% {
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0px);
          }
        }

        @keyframes nectoAccentPulse {
          0%, 100% {
            filter: drop-shadow(0 0 0px transparent);
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(25, 0, 136, 0.85));
            transform: scale(1.08);
          }
        }

        /* 2. Revelación orquestada en cascada de las letras N-E-C-T-O (ordenada y simétrica) */
        @keyframes nectoLetterGlideUp {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 3. Revelación del claim "grow together" */
        @keyframes nectoTaglineReveal {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 4. Revelación de la barra de carga y subtítulo */
        @keyframes nectoLoaderReveal {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes nectoProgressBarProgress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }

        /* Clases aplicadas a cada elemento */
        .anim-necto-accent {
          transform-box: fill-box;
          transform-origin: center;
          animation: 
            nectoAccentEntrance 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards,
            nectoAccentPulse 2.4s ease-in-out 1.2s infinite;
          will-change: transform, opacity, filter;
        }

        .anim-necto-l-n {
          opacity: 0;
          animation: nectoLetterGlideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.30s forwards;
          will-change: transform, opacity;
        }

        .anim-necto-l-e {
          opacity: 0;
          animation: nectoLetterGlideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.42s forwards;
          will-change: transform, opacity;
        }

        .anim-necto-l-c {
          opacity: 0;
          animation: nectoLetterGlideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.54s forwards;
          will-change: transform, opacity;
        }

        .anim-necto-l-t {
          opacity: 0;
          animation: nectoLetterGlideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.66s forwards;
          will-change: transform, opacity;
        }

        .anim-necto-l-o {
          opacity: 0;
          animation: nectoLetterGlideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.78s forwards;
          will-change: transform, opacity;
        }

        .anim-necto-tagline {
          opacity: 0;
          animation: nectoTaglineReveal 0.75s cubic-bezier(0.16, 1, 0.3, 1) 1.2s forwards;
          will-change: transform, opacity;
        }

        .anim-necto-loader {
          opacity: 0;
          animation: nectoLoaderReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.5s forwards;
          will-change: transform, opacity;
        }

        .anim-necto-progress {
          width: 0%;
          /* Mantener en sincronía con PROGRESO_* (contador de porcentaje). */
          animation: nectoProgressBarProgress 4.5s cubic-bezier(0.2, 0.1, 0.25, 1) 1.6s forwards;
          will-change: width;
        }
      `}</style>

      {/* Contenedor principal: Fondo rojo-naranja de marca Necto (#FF3F1A) a pantalla completa */}
      <div className="relative min-h-screen w-full bg-[#FF3F1A] overflow-hidden flex flex-col justify-center items-center px-6 select-none font-sans">
        
        {/* FONDO 1: Mosaico estelar dinámico interactivo del login */}
        <InteractiveDotGrid
          dotGap={28}
          baseRadius={1.8}
          activeRadius={3.6}
          glowDistance={160}
          dotColor="rgba(255, 255, 255, 0.18)"
          activeDotColor="rgba(255, 255, 255, 0.95)"
        />

        {/* FONDO 2: Círculos de marca Necto prominentes y claramente visibles a pantalla completa */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          {/* Aro superior izquierdo grande y nítido */}
          <div
            className="absolute rounded-full"
            style={{
              width: "680px",
              height: "680px",
              top: "-220px",
              left: "-200px",
              border: "32px solid rgba(255, 255, 255, 0.38)",
            }}
          />

          {/* Aro inferior derecho mediano */}
          <div
            className="absolute rounded-full"
            style={{
              width: "560px",
              height: "560px",
              bottom: "-180px",
              right: "-160px",
              border: "28px solid rgba(255, 255, 255, 0.34)",
            }}
          />

          {/* Aro de acento derecho a media altura */}
          <div
            className="absolute rounded-full"
            style={{
              width: "420px",
              height: "420px",
              top: "50%",
              right: "-140px",
              transform: "translateY(-50%)",
              border: "30px solid rgba(255, 255, 255, 0.42)",
            }}
          />

          {/* Círculos decorativos del login */}
          <DecorativeCircles variant="brand" className="opacity-80" />

          {/* Arcos orbitales con nodos azul marino (#190088) */}
          <div
            className="absolute rounded-full border border-white/30"
            style={{
              width: "600px",
              height: "600px",
              top: "-180px",
              right: "-120px",
            }}
          >
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-[#190088] ring-2 ring-white shadow-md"
              style={{
                bottom: "180px",
                left: "80px",
              }}
            />
          </div>

          <div
            className="absolute rounded-full border border-white/30"
            style={{
              width: "640px",
              height: "640px",
              bottom: "-200px",
              left: "-160px",
            }}
          >
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-[#190088] ring-2 ring-white shadow-md"
              style={{
                top: "160px",
                right: "100px",
              }}
            />
          </div>
        </div>

        {/* NÚCLEO CENTRAL PIRAMIDAL: Logo + Barra de Carga Símétrica + Subtítulo */}
        <main className="relative z-10 flex flex-col items-center justify-center text-center my-auto">
          {/* 1. Cúspide: Logo NECTO con motion graphics orquestado */}
          <svg
            viewBox="0 0 109 50"
            className="w-56 sm:w-64 md:w-72 h-auto overflow-visible drop-shadow-md"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="NECTO grow together"
          >
            {/* CAPA 1: Letras N-E-C-T-O individuales con revelación en cascada rítmica y ordenada */}
            <g>
              {/* Letra N */}
              <path
                className="anim-necto-l-n"
                d="M22.4171 19.1921L19.5245 22.1622C18.9564 22.7461 18.0008 22.7715 17.4068 22.1622L9.16827 14.064C8.23853 13.1501 6.63731 13.7848 6.63731 15.1049V21.0453C6.63731 21.8576 5.96583 22.4923 5.16522 22.4923H1.47209C0.645653 22.4923 0 21.8322 0 21.0453V5.3819C0 5.0011 0.154957 4.62031 0.439044 4.34106L3.43487 1.39625C4.00305 0.837748 4.90696 0.837748 5.50096 1.37086L22.3654 17.1104C22.9594 17.6689 22.9852 18.5828 22.4171 19.1667V19.1921Z"
                fill="#FFFFFF"
              />
              {/* Letra E */}
              <path
                className="anim-necto-l-e"
                d="M40.1338 17.0342H31.3787V14.2417H38.6359C40.2113 14.2417 41.5026 12.9978 41.5026 11.4492C41.5026 9.90066 40.2113 8.63134 38.6359 8.63134H31.3787V5.96578H40.0047C41.58 5.96578 42.8714 4.72185 42.8714 3.17329C42.8714 1.62472 41.58 0.355408 40.0047 0.355408H28.3054C26.5492 0.355408 25.2063 1.70088 25.2063 3.40176V19.5982C25.2063 21.3245 26.5751 22.6446 28.3054 22.6446H40.1596C41.735 22.6446 43.0263 21.4007 43.0263 19.8521C43.0263 18.3035 41.735 17.0342 40.1596 17.0342H40.1338Z"
                fill="#FFFFFF"
              />
              {/* Letra C */}
              <path
                className="anim-necto-l-c"
                d="M62.0085 15.1049C61.337 15.1049 60.6655 15.3587 60.1232 15.7649C59.0127 16.6534 57.8763 17.2373 56.0427 17.2373C52.9952 17.2373 50.7225 14.7748 50.7225 11.4238C50.7225 8.07285 53.021 5.73731 56.0427 5.73731C57.4373 5.73731 58.6253 6.14349 59.9166 7.10817C60.2007 7.28587 60.8205 7.66667 61.7244 7.66667C63.4289 7.66667 64.7977 6.32119 64.7977 4.67108C64.7977 3.7064 64.3328 2.81788 63.5839 2.234C61.492 0.710817 59.0901 0 56.0943 0C49.3537 0 44.2918 4.95033 44.2918 11.5V11.5508C44.2918 17.9735 49.3795 23 55.9135 23C59.2193 23 61.6728 22.1369 63.9455 20.2075C64.6169 19.649 65.0043 18.8366 65.0043 17.9989C65.0043 16.3996 63.6872 15.1302 62.0343 15.1302L62.0085 15.1049Z"
                fill="#FFFFFF"
              />
              {/* Letra T */}
              <path
                className="anim-necto-l-t"
                d="M82.127 0.355408H68.5683C66.9413 0.355408 65.65 1.65011 65.65 3.22406C65.65 4.79801 66.9671 6.09271 68.5683 6.09271H72.2356V19.7759C72.2356 21.5022 73.6044 22.8223 75.3348 22.8223C77.0651 22.8223 78.4339 21.4768 78.4339 19.7759V6.1181H82.1012C83.7283 6.1181 85.0196 4.8234 85.0196 3.24945C85.0196 1.6755 83.7024 0.380794 82.1012 0.380794L82.127 0.355408Z"
                fill="#FFFFFF"
              />
              {/* Letra O */}
              <path
                className="anim-necto-l-o"
                d="M96.8996 0C90.159 0 84.8646 5.05188 84.8646 11.5V11.5508C84.8646 18.0751 90.004 23 96.8479 23C103.692 23 108.883 17.9481 108.883 11.4492C108.883 4.95033 103.743 0 96.8996 0ZM96.8479 5.76269C100.05 5.76269 102.452 8.22517 102.452 11.5V11.5508C102.452 14.8002 100.076 17.2373 96.8996 17.2373C93.723 17.2373 91.2953 14.7748 91.2953 11.4238C91.2953 8.07285 93.6713 5.73731 96.8479 5.73731V5.76269Z"
                fill="#FFFFFF"
              />
            </g>

            {/* CAPA 2: Acento azul marino (#190088) con entrada elástica y respiración */}
            <g className="anim-necto-accent">
              <path
                d="M22.8045 1.92936V4.29029C22.8045 5.12803 22.0555 5.83885 21.1258 5.83885H15.3149C13.8428 5.83885 13.0938 4.21413 14.1269 3.22406L16.6062 0.863135C16.9161 0.558499 17.3551 0.406181 17.7942 0.406181H21.1258C22.0555 0.406181 22.8045 1.09161 22.8045 1.95475V1.92936Z"
                fill="#190088"
              />
            </g>

            {/* CAPA 3: Tagline original en dos líneas "grow together" en blanco */}
            <g transform="translate(-52 32)" className="anim-necto-tagline">
              {/* grow */}
              <path d="M112.395 7.20971L112.989 5.9404C113.609 6.27042 114.229 6.47351 115.03 6.47351C116.192 6.47351 116.76 5.91501 116.76 4.87417V4.59492C116.243 5.17881 115.701 5.5596 114.797 5.5596C113.402 5.5596 112.111 4.54415 112.111 2.79249C112.111 0.990066 113.402 0 114.771 0C115.701 0 116.243 0.380795 116.708 0.888521V0.101545H118.413V4.69647C118.413 5.76269 118.154 6.52428 117.638 7.03201C117.07 7.59051 116.218 7.81898 115.055 7.81898C114.074 7.81898 113.144 7.59051 112.395 7.20971ZM116.734 2.79249C116.734 1.95475 116.088 1.39625 115.262 1.39625C114.436 1.39625 113.79 1.95475 113.79 2.76711C113.79 3.60486 114.41 4.16336 115.262 4.16336C116.114 4.16336 116.734 3.60486 116.734 2.79249Z" fill="#FFFFFF"/>
              <path d="M119.962 0.101544H121.667V1.2947C122.003 0.482339 122.571 -0.0507738 123.578 -1.12853e-06V1.75165H123.475C122.338 1.75165 121.641 2.43708 121.641 3.83333V6.01655H119.936V0.101544H119.962Z" fill="#FFFFFF"/>
              <path d="M124.198 3.09713C124.198 1.37086 125.592 0 127.478 0C129.363 0 130.732 1.37086 130.732 3.04636C130.732 4.77263 129.337 6.14349 127.452 6.14349C125.567 6.14349 124.198 4.77263 124.198 3.07174V3.09713ZM129.027 3.09713C129.027 2.20861 128.382 1.44702 127.452 1.44702C126.522 1.44702 125.902 2.18322 125.902 3.04636C125.902 3.93488 126.548 4.69647 127.478 4.69647C128.407 4.69647 129.027 3.96027 129.027 3.09713Z" fill="#FFFFFF"/>
              <path d="M131.171 0.101543H132.901L133.857 3.68101L134.993 0.0761566H136.465L137.602 3.7064L138.583 0.101543H140.287L138.402 6.06733H136.853L135.69 2.43708L134.502 6.06733H132.979L131.171 0.101543Z" fill="#FFFFFF"/>

              {/* together */}
              <path d="M112.654 14.4956V11.7031H111.93V10.2561H112.654V8.73289H114.358V10.2561H115.778V11.7031H114.358V14.2417C114.358 14.6225 114.539 14.8256 114.9 14.8256C115.21 14.8256 115.494 14.7494 115.753 14.6225V15.968C115.391 16.1711 114.978 16.298 114.41 16.298C113.377 16.298 112.654 15.8918 112.654 14.521V14.4956Z" fill="#FFFFFF"/>
              <path d="M116.579 13.2517C116.579 11.5254 117.974 10.1545 119.859 10.1545C121.744 10.1545 123.113 11.5254 123.113 13.2009C123.113 14.9271 121.718 16.298 119.833 16.298C117.948 16.298 116.579 14.9271 116.579 13.2263V13.2517ZM121.409 13.2517C121.409 12.3631 120.763 11.6015 119.833 11.6015C118.903 11.6015 118.284 12.3377 118.284 13.2009C118.284 14.0894 118.929 14.851 119.859 14.851C120.789 14.851 121.409 14.1148 121.409 13.2517Z" fill="#FFFFFF"/>
              <path d="M124.379 17.3642L124.973 16.0949C125.592 16.4249 126.212 16.628 127.013 16.628C128.175 16.628 128.743 16.0695 128.743 15.0287V14.7494C128.227 15.3333 127.684 15.7141 126.78 15.7141C125.386 15.7141 124.094 14.6987 124.094 12.947C124.094 11.17 125.386 10.1545 126.78 10.1545C127.71 10.1545 128.252 10.5353 128.717 11.043V10.2815H130.422V14.851C130.422 15.9172 130.164 16.6788 129.647 17.1865C129.079 17.745 128.227 17.9735 127.064 17.9735C126.083 17.9735 125.179 17.745 124.404 17.3642H124.379ZM128.717 12.947C128.717 12.1093 128.072 11.5508 127.245 11.5508C126.419 11.5508 125.799 12.1093 125.799 12.9216C125.799 13.7594 126.419 14.3179 127.245 14.3179C128.072 14.3179 128.717 13.7594 128.717 12.947Z" fill="#FFFFFF"/>
              <path d="M131.636 13.2517C131.636 11.5508 132.85 10.1545 134.606 10.1545C136.62 10.1545 137.55 11.6777 137.55 13.3786C137.55 13.5055 137.55 13.6578 137.55 13.8102H133.366C133.521 14.5717 134.063 14.9779 134.838 14.9779C135.406 14.9779 135.82 14.8002 136.31 14.3686L137.292 15.2064C136.723 15.8918 135.923 16.3234 134.838 16.3234C133.03 16.3234 131.687 15.0795 131.687 13.2517H131.636ZM135.871 12.7439C135.768 11.9823 135.329 11.4746 134.606 11.4746C133.883 11.4746 133.444 11.9823 133.314 12.7439H135.897H135.871Z" fill="#FFFFFF"/>
              <path d="M139.099 14.4956V11.7031H138.376V10.2561H139.099V8.73289H140.804V10.2561H142.224V11.7031H140.804V14.2417C140.804 14.6225 140.985 14.8256 141.346 14.8256C141.656 14.8256 141.94 14.7494 142.199 14.6225V15.968C141.837 16.1711 141.424 16.298 140.856 16.298C139.823 16.298 139.099 15.8918 139.099 14.521V14.4956Z" fill="#FFFFFF"/>
              <path d="M143.49 8.12362H145.194V11.0938C145.582 10.5861 146.098 10.1545 146.951 10.1545C148.242 10.1545 148.991 10.9923 148.991 12.3631V16.1965H147.286V12.8962C147.286 12.1093 146.899 11.7031 146.253 11.7031C145.608 11.7031 145.194 12.1093 145.194 12.8962V16.1965H143.49V8.12362Z" fill="#FFFFFF"/>
              <path d="M150.179 13.2517C150.179 11.5508 151.393 10.1545 153.149 10.1545C155.163 10.1545 156.067 11.6777 156.067 13.3786C156.067 13.5055 156.067 13.6578 156.067 13.8102H151.883C152.064 14.5717 152.581 14.9779 153.355 14.9779C153.924 14.9779 154.337 14.8002 154.802 14.3686L155.783 15.2064C155.215 15.8918 154.414 16.3234 153.33 16.3234C151.522 16.3234 150.179 15.0795 150.179 13.2517ZM154.414 12.7439C154.311 11.9823 153.872 11.4746 153.149 11.4746C152.426 11.4746 151.987 11.9823 151.858 12.7439H154.44H154.414Z" fill="#FFFFFF"/>
              <path d="M157.384 10.2561H159.089V11.4492C159.425 10.6369 159.993 10.1038 161 10.1545V11.9062H160.923C159.786 11.9062 159.089 12.5916 159.089 13.9879V16.1711H157.384V10.2561Z" fill="#FFFFFF"/>
            </g>
          </svg>

          {/* 2. Base de la Pirámide: Barra de carga 100% simétrica con el ancho del logo */}
          <div className="mt-7 sm:mt-8 flex flex-col items-center anim-necto-loader">
            {/* Barra horizontal perfectamente simétrica alineada a los extremos del logo (N a O) */}
            <div
              ref={barraRef}
              role="progressbar"
              aria-label="Progreso de carga"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              className="w-56 sm:w-64 md:w-72 h-[3px] rounded-full bg-white/35 overflow-hidden"
            >
              <div className="h-full bg-[#190088] rounded-full anim-necto-progress shadow-[0_0_8px_rgba(25,0,136,0.5)]" />
            </div>

            {/* Contador de carga 0 % → 100 %, sincronizado con la barra */}
            <span
              ref={contadorRef}
              aria-hidden="true"
              className="mt-3 text-[14px] font-bold tabular-nums text-white drop-shadow-md"
            >
              0%
            </span>

            {/* 3. Subtítulo: "Conectando tu negocio" en tipografía nítida y destacada */}
            <p className="mt-2 text-base sm:text-lg md:text-xl font-bold tracking-wider text-white drop-shadow-md">
              Conectando tu negocio
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

export default OnboardingCargandoPage;

