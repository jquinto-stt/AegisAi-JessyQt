import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ThemeToggleButton } from "@/shell";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { organizacionStore } from "@/stores/organizacion.store";
import { sessionStore } from "@/stores/session.store";
import { actualizarPerfilRemoto } from "@/lib/auth.service";

export interface OpcionModeloNegocio {
  id: string;
  letra: string;
  tecla: string;
  titulo: string;
  descripcion: string;
  tipoEmpresa: string;
  esColaborador?: boolean;
}

const OPCIONES_MODELO_NEGOCIO: OpcionModeloNegocio[] = [
  {
    id: "marca-propia",
    letra: "A",
    tecla: "A",
    titulo: "Tengo una marca propia",
    descripcion: "(Quiero gestionar el inventario y la logística de mis propios productos)",
    tipoEmpresa: "Marca propia & Fabricación",
  },
  {
    id: "comercio-fisico",
    letra: "B",
    tecla: "B",
    titulo: "Comercio o Tienda física",
    descripcion: "(Quiero vender en punto de venta y controlar el stock en sucursales)",
    tipoEmpresa: "Retail & Comercio minorista",
  },
  {
    id: "ecommerce",
    letra: "C",
    tecla: "C",
    titulo: "E-commerce / Venta online",
    descripcion: "(Quiero centralizar pedidos por internet, WhatsApp y despachos)",
    tipoEmpresa: "E-commerce & Venta digital",
  },
  {
    id: "mayorista",
    letra: "D",
    tecla: "D",
    titulo: "Distribuidor o Mayorista",
    descripcion: "(Quiero gestionar compras por volumen, catálogo B2B y despacho a comercios)",
    tipoEmpresa: "Distribución & Mayorista",
  },
  {
    id: "colaborador",
    letra: "E",
    tecla: "E",
    titulo: "Colaborador",
    descripcion: "(Voy a colaborar en un negocio que ya existe en Necto)",
    tipoEmpresa: "Colaborador",
    esColaborador: true,
  },
];

export function OnboardingModeloNegocioPage() {
  const navigate = useNavigate();
  const [seleccionado, setSeleccionado] = useState<string>("marca-propia");
  const [cargando, setCargando] = useState(false);

  // Atajos de teclado: A, B, C, D, E y Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toUpperCase();
      const opcionPorLetra = OPCIONES_MODELO_NEGOCIO.find(
        (o) => o.letra === key || o.tecla === key
      );

      if (opcionPorLetra) {
        setSeleccionado(opcionPorLetra.id);
      } else if (e.key >= "1" && e.key <= "5") {
        const indice = parseInt(e.key, 10) - 1;
        if (OPCIONES_MODELO_NEGOCIO[indice]) {
          setSeleccionado(OPCIONES_MODELO_NEGOCIO[indice].id);
        }
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleContinuar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [seleccionado]);

  const handleContinuar = async () => {
    const opcion = OPCIONES_MODELO_NEGOCIO.find((o) => o.id === seleccionado) || OPCIONES_MODELO_NEGOCIO[0];
    setCargando(true);

    try {
      if (opcion.esColaborador) {
        // Redirige al flujo de operador / colaborador
        sessionStore.configurar(["pedidos"], "operador");
        navigate("/operador/registro");
        return;
      }

      // Guardar el tipo de empresa en el perfil y organización
      if (organizacionStore.tieneOrganizacion) {
        organizacionStore.actualizarOrganizacion({
          tipoEmpresa: opcion.tipoEmpresa,
        });
      }

      await actualizarPerfilRemoto({
        pais: organizacionStore.usuario?.pais || "Colombia",
      });

      // Avanzar a la encuesta de origen
      navigate("/onboarding/encuesta");
    } catch {
      navigate("/onboarding/encuesta");
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Tipo de negocio — Necto"
        description="Identifica el modelo de tu negocio para configurar Necto a tu medida."
      />

      <div className="relative min-h-screen w-full bg-white dark:bg-gray-950 flex flex-col justify-between p-6 sm:p-10 font-sans transition-colors duration-200 overflow-hidden select-none">
        {/* Barra delgada de progreso superior (estilo Typeform) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800 z-20">
          <div
            className="h-full bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: "60%" }}
          />
        </div>

        {/* Mosaico interactivo de puntos */}
        <InteractiveDotGrid dotGap={28} baseRadius={1.4} activeRadius={3.2} glowDistance={160} />

        {/* Círculos decorativos de marca */}
        <div className="dark:hidden">
          <DecorativeCircles variant="canvas" />
        </div>
        <div className="hidden dark:block">
          <DecorativeCircles variant="indigo" />
        </div>

        {/* Header con Logo y Selector de Tema */}
        <header className="relative w-full flex items-center justify-between z-10 pointer-events-auto">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo/necto-full-white.svg"
              alt="Necto"
              className="hidden h-9 w-auto dark:block"
            />
            <img
              src="/images/logo/logo-principal.svg"
              alt="Necto"
              className="h-9 w-auto dark:hidden"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggleButton />
          </div>
        </header>

        {/* Contenido Central: Pregunta 3 */}
        <main className="relative flex-1 flex flex-col justify-center px-4 max-w-3xl mx-auto w-full my-auto z-10 pointer-events-auto">
          {/* Título de la pregunta */}
          <div className="mb-7">
            <div className="flex items-start gap-2.5 mb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[11px] font-bold mt-1 shrink-0">
                3
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-title dark:text-white leading-snug">
                ¿Con cuál de las siguientes opciones se identifica tu negocio?<span className="text-brand-500">*</span>
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 pl-7 leading-relaxed">
              Selecciona el modelo principal para preparar tu inventario y gestión de pedidos.
            </p>
          </div>

          {/* Lista de Opciones Identificadas con Necto */}
          <div className="pl-7 space-y-3.5">
            {OPCIONES_MODELO_NEGOCIO.map((opcion) => {
              const esSeleccionado = seleccionado === opcion.id;
              return (
                <button
                  key={opcion.id}
                  type="button"
                  onClick={() => setSeleccionado(opcion.id)}
                  className={`group relative w-full flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 rounded-xl border-2 transition-all duration-150 cursor-pointer text-left backdrop-blur-md ${
                    esSeleccionado
                      ? "border-brand-500 bg-brand-50/60 dark:bg-brand-500/10 ring-2 ring-brand-500/20 dark:border-brand-400 shadow-md translate-x-1"
                      : "border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    {/* Chip con la letra del atajo [ A ] */}
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-mono font-bold transition-colors ${
                        esSeleccionado
                          ? "bg-brand-500 text-white shadow-xs"
                          : "bg-white text-gray-600 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 group-hover:border-gray-400"
                      }`}
                    >
                      {opcion.letra}
                    </span>

                    {/* Texto del modelo y detalle explicativo */}
                    <div className="text-sm sm:text-base leading-snug">
                      <span className="font-semibold text-ink-title dark:text-white mr-2">
                        {opcion.titulo}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 font-normal text-xs sm:text-sm">
                        {opcion.descripcion}
                      </span>
                    </div>
                  </div>

                  {/* Icono de Check cuando está seleccionado */}
                  {esSeleccionado && (
                    <CheckCircle2 className="w-5 h-5 text-brand-500 dark:text-brand-400 shrink-0 animate-in zoom-in-75 duration-150 ml-2" />
                  )}
                </button>
              );
            })}

            {/* Botón Continuar */}
            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleContinuar}
                disabled={cargando}
                className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] shadow-lg shadow-brand-500/25 transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {cargando ? "Guardando..." : "Continuar"}
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline-block">
                presiona <strong className="text-gray-600 dark:text-gray-300">Enter ↵</strong> o usa las teclas <strong className="text-gray-600 dark:text-gray-300">A / B / C / D / E</strong>
              </span>
            </div>
          </div>
        </main>

        {/* Footer con flechas de navegación Typeform */}
        <footer className="relative w-full flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 z-10 pointer-events-auto">
          <span>Necto &copy; {new Date().getFullYear()}</span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/onboarding/pais")}
              title="Paso anterior (País)"
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleContinuar}
              title="Siguiente paso"
              className="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
