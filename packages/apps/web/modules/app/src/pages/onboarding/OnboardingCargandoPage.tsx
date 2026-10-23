import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { PageMeta } from "@/shell/meta";
import { organizacionStore, PAISES_CONFIG } from "@/stores/organizacion.store";
import { sessionStore } from "@/stores/session.store";
import { desactivarModoDemo } from "@/lib/modo-demo";

export function OnboardingCargandoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/inicio";

  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Asegurar organización base sin módulos
      const paisActual = organizacionStore.usuario?.pais || "Colombia";
      const configPais = PAISES_CONFIG[paisActual] || PAISES_CONFIG["Colombia"];

      if (!organizacionStore.tieneOrganizacion) {
        organizacionStore.crearOrganizacion({
          nombre: organizacionStore.usuario?.nombre
            ? `Organización de ${organizacionStore.usuario.nombre}`
            : "Mi Organización",
          pais: paisActual,
          moneda: configPais.moneda,
          zonaHoraria: configPais.zonaHoraria,
        });
      }

      // 2. Garantizar que NO haya módulos instalados
      desactivarModoDemo();
      organizacionStore.desinstalarModulo("pedidos");
      organizacionStore.desinstalarModulo("inventarios");
      organizacionStore.setConectorActivo("pedidos", "whatsapp", false);
      sessionStore.configurar([], "administrador");
      sessionStore.setModulos([]);

      // 3. Marcar perfil como completado tras el onboarding
      organizacionStore.actualizarPerfil({
        perfilCompletado: true,
      });

      navigate(redirectTo, { replace: true });
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigate, redirectTo]);

  return (
    <>
      <PageMeta
        title="Procesando tu información — Necto"
        description="Estamos procesando tu información. Por favor, espera un momento."
      />

      <style>{`
        @keyframes nectoLoadingPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.18;
            transform: scale(0.96);
          }
        }
        .necto-loading-logo {
          animation: nectoLoadingPulse 1.35s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen w-full bg-white dark:bg-gray-950 flex flex-col items-center justify-center font-sans select-none p-6">
        <main className="flex flex-col items-center justify-center text-center">
          {/* Logo oficial de Necto con parpadeo claro y definido de carga */}
          <div className="mb-6 necto-loading-logo">
            <img
              src="/images/logo/necto-full-white.svg"
              alt="Necto"
              className="hidden h-11 w-auto dark:block"
            />
            <img
              src="/images/logo/necto-full.svg"
              alt="Necto"
              className="h-11 w-auto dark:hidden"
            />
          </div>

          {/* Textos limpios */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Estamos procesando tu información.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Por favor, espera un momento...
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

export default OnboardingCargandoPage;
