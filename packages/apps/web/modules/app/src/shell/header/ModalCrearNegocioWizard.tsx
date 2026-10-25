import React, { useState, useRef, useEffect } from "react";
import { 
  BuildingStorefrontIcon, 
  ChevronDownIcon, 
  XMarkIcon,
  CheckIcon,
  GlobeAltIcon,
  TruckIcon,
  PhoneIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { organizacionStore, slugDe } from "@/stores/organizacion.store";
import { BanderaPais } from "./NegocioSelector";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import { ThemeToggleButton } from "@/shell";

const PREFIJOS: Record<string, { codigo: string; prefijo: string }> = {
  Colombia: { codigo: "CO", prefijo: "+57" },
  Ecuador: { codigo: "EC", prefijo: "+593" },
  Perú: { codigo: "PE", prefijo: "+51" },
};

const PAISES_DISPONIBLES = [
  { 
    nombre: "Colombia", 
    moneda: "COP", 
    simbolo: "$", 
    descripcion: "Transportadoras nacionales, cobro contraentrega y logística local." 
  },
  { 
    nombre: "Ecuador", 
    moneda: "USD", 
    simbolo: "$", 
    descripcion: "Operaciones en dólares con transportadoras integradas." 
  },
  { 
    nombre: "Perú", 
    moneda: "PEN", 
    simbolo: "S/", 
    descripcion: "Lima y provincias con operadores logísticos y recaudos." 
  },
];

interface ModalCrearNegocioWizardProps {
  abierto: boolean;
  onCerrar: () => void;
  onCreado?: (nuevoNegocioId: string) => void;
}

export const ModalCrearNegocioWizard: React.FC<ModalCrearNegocioWizardProps> = ({
  abierto,
  onCerrar,
  onCreado,
}) => {
  const [paso, setPaso] = useState<number>(1);
  const [nombre, setNombre] = useState("");
  const [nombrePublico, setNombrePublico] = useState("");
  const [telefono, setTelefono] = useState("");
  const [paisTelefono, setPaisTelefono] = useState("Colombia");
  const [selectorPrefijoAbierto, setSelectorPrefijoAbierto] = useState(false);
  const [paisOperacion, setPaisOperacion] = useState("Colombia");
  const [cargando, setCargando] = useState(false);

  const inputNombreRef = useRef<HTMLInputElement>(null);
  const inputPublicoRef = useRef<HTMLInputElement>(null);
  const inputTelefonoRef = useRef<HTMLInputElement>(null);

  // Reiniciar estado al abrir
  useEffect(() => {
    if (abierto) {
      setPaso(1);
      setNombre("");
      setNombrePublico("");
      setTelefono("");
      setPaisTelefono("Colombia");
      setPaisOperacion("Colombia");
      setCargando(false);
      setTimeout(() => inputNombreRef.current?.focus(), 150);
    }
  }, [abierto]);

  // Enfocar según el paso activo
  useEffect(() => {
    if (!abierto) return;
    if (paso === 1) inputNombreRef.current?.focus();
    if (paso === 2) {
      if (!nombrePublico.trim()) setNombrePublico(nombre.trim());
      inputPublicoRef.current?.focus();
    }
    if (paso === 3) inputTelefonoRef.current?.focus();
  }, [paso, abierto]);

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const puedeAvanzar = () => {
    if (paso === 1) return nombre.trim().length > 0;
    if (paso === 2) return true;
    if (paso === 3) return telefono.trim().length >= 6;
    if (paso === 4) return Boolean(paisOperacion);
    return true;
  };

  const siguiente = () => {
    if (!puedeAvanzar()) return;
    if (paso < 4) {
      setPaso((prev) => prev + 1);
    } else {
      finalizarCreacion();
    }
  };

  const atras = () => {
    if (paso > 1) {
      setPaso((prev) => prev - 1);
    }
  };

  const finalizarCreacion = () => {
    if (!nombre.trim()) return;
    setCargando(true);

    const prefijo = PREFIJOS[paisTelefono]?.prefijo || "+57";
    const telefonoCompleto = telefono.trim() ? `${prefijo} ${telefono.trim()}` : undefined;

    const nuevaOrg = organizacionStore.agregarOrganizacion({
      nombre: nombre.trim(),
      nombrePublico: nombrePublico.trim() || nombre.trim(),
      telefono: telefonoCompleto,
      pais: paisOperacion,
    });

    setCargando(false);
    onCerrar();
    if (onCreado && nuevaOrg?.id) {
      onCreado(nuevaOrg.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      siguiente();
    }
  };

  const porcentajeProgreso = (paso / 4) * 100;

  return (
    <div className="fixed inset-0 z-[100] min-h-screen w-full bg-[#FAFAFA] dark:bg-[#0c0d12] flex flex-col justify-between p-6 sm:p-10 font-['DM_Sans',sans-serif] select-none overflow-y-auto transition-colors duration-200">
      {/* Barra de progreso superior */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-[#ECECEC] dark:bg-white/10 z-30">
        <div 
          className="h-full bg-[#FF3F1A] transition-all duration-300 ease-out"
          style={{ width: `${porcentajeProgreso}%` }}
        />
      </div>

      {/* Mosaico interactivo de puntos */}
      <InteractiveDotGrid dotGap={28} baseRadius={1.4} activeRadius={3.2} glowDistance={160} />

      {/* Círculos decorativos de fondo */}
      <div className="dark:hidden">
        <DecorativeCircles variant="canvas" />
      </div>
      <div className="hidden dark:block">
        <DecorativeCircles variant="indigo" />
      </div>

      {/* Header superior */}
      <header className="relative w-full flex items-center justify-between z-20 pointer-events-auto">
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
          <span className="hidden sm:inline-flex items-center text-[12px] font-bold uppercase tracking-wider text-[#190088] dark:text-[#97D6DF] bg-[#EFE6D3] dark:bg-white/10 rounded-full px-3 py-1">
            Nuevo Negocio
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[12px] font-bold text-[#212121]/60 dark:text-gray-400 hidden sm:block">
            Paso {paso} de 4
          </div>
          <ThemeToggleButton />
          <button
            type="button"
            onClick={onCerrar}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#ECECEC] dark:border-white/15 bg-white/80 dark:bg-white/5 hover:border-[#FF3F1A] hover:text-[#FF3F1A] text-[14px] font-bold text-[#212121] dark:text-gray-300 transition-all cursor-pointer"
          >
            <span>Cancelar y salir</span>
            <XMarkIcon className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Contenedor central — Flujo directo de Onboarding sin tarjeta externa */}
      <main className="relative flex-1 flex flex-col justify-center px-4 max-w-2xl sm:max-w-3xl mx-auto w-full my-auto z-20 pointer-events-auto py-8 text-left">
        <div className="flex flex-col gap-8 transition-all">
          
          {/* SLIDE 1: NOMBRE DEL NEGOCIO */}
          {paso === 1 && (
            <div className="flex flex-col gap-6 animate-aparecer">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#190088] dark:bg-[#97D6DF] text-white dark:text-[#190088] text-[12px] font-bold">
                    1
                  </span>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#FF3F1A]">
                    Paso 1 de 4 — Identificación
                  </span>
                </div>
                <h1 className="text-[36px] font-bold text-[#190088] dark:text-white leading-tight font-['DM_Sans',sans-serif]">
                  ¿Cuál es el nombre de este negocio?
                </h1>
                <p className="text-[16px] font-light text-[#212121]/70 dark:text-gray-300">
                  Es el nombre con el que lo identificas internamente, no es visible al público y puedes editarlo después.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <input
                  ref={inputNombreRef}
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ingresa el nombre del negocio"
                  className="w-full text-[24px] font-bold text-[#212121] dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 border-2 border-[#ECECEC] dark:border-white/15 focus:border-[#FF3F1A] rounded-2xl p-4 bg-white/80 dark:bg-white/5 backdrop-blur-xs outline-none transition-all shadow-xs"
                />

                {/* Vista previa en tiempo real de la URL propia */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#EFE6D3]/60 dark:bg-white/5 border border-[#ECECEC] dark:border-white/10 backdrop-blur-xs">
                  <GlobeAltIcon className="w-5 h-5 text-[#FF3F1A] shrink-0" />
                  <span className="text-[14px] font-bold text-[#212121] dark:text-white">URL personalizada:</span>
                  <span className="font-mono text-[16px] font-bold text-[#190088] dark:text-[#97D6DF] truncate">
                    necto.app/{slugDe(nombre || "tu-negocio")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: NOMBRE PÚBLICO DEL NEGOCIO */}
          {paso === 2 && (
            <div className="flex flex-col gap-6 animate-aparecer">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#190088] dark:bg-[#97D6DF] text-white dark:text-[#190088] text-[12px] font-bold">
                    2
                  </span>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#FF3F1A]">
                    Paso 2 de 4 — Rótulo de Envíos
                  </span>
                </div>
                <h1 className="text-[36px] font-bold text-[#190088] dark:text-white leading-tight font-['DM_Sans',sans-serif]">
                  Nombre público del negocio
                </h1>
                <p className="text-[16px] font-light text-[#212121]/70 dark:text-gray-300">
                  Es el nombre que aparecerá impreso como remitente en las guías de las transportadoras.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <input
                  ref={inputPublicoRef}
                  type="text"
                  value={nombrePublico}
                  onChange={(e) => setNombrePublico(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ingresa un nombre público para tu negocio"
                  className="w-full text-[24px] font-bold text-[#212121] dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 border-2 border-[#ECECEC] dark:border-white/15 focus:border-[#FF3F1A] rounded-2xl p-4 bg-white/80 dark:bg-white/5 backdrop-blur-xs outline-none transition-all shadow-xs"
                />

                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#EFE6D3]/60 dark:bg-white/5 border border-[#ECECEC] dark:border-white/10 backdrop-blur-xs">
                  <TruckIcon className="w-5 h-5 text-[#190088] dark:text-[#97D6DF] shrink-0" />
                  <p className="text-[14px] font-light text-[#212121] dark:text-gray-300">
                    Tus clientes verán este nombre en el rótulo del paquete al momento de la entrega.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: TELÉFONO DEL NEGOCIO */}
          {paso === 3 && (
            <div className="flex flex-col gap-6 animate-aparecer">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#190088] dark:bg-[#97D6DF] text-white dark:text-[#190088] text-[12px] font-bold">
                    3
                  </span>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#FF3F1A]">
                    Paso 3 de 4 — Contacto de Guías
                  </span>
                </div>
                <h1 className="text-[36px] font-bold text-[#190088] dark:text-white leading-tight font-['DM_Sans',sans-serif]">
                  Teléfono del negocio
                </h1>
                <p className="text-[16px] font-light text-[#212121]/70 dark:text-gray-300">
                  Este número será utilizado para colocarlo como contacto de remitente en las guías generadas.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="relative flex items-center shadow-xs">
                  {/* Selector de prefijo */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSelectorPrefijoAbierto((p) => !p)}
                      className="flex items-center gap-2 px-4 py-4 rounded-l-2xl border-2 border-r-0 border-[#ECECEC] dark:border-white/15 bg-white/90 dark:bg-white/10 backdrop-blur-xs hover:bg-gray-100 dark:hover:bg-white/15 text-[14px] font-bold text-[#212121] dark:text-gray-200 transition-colors cursor-pointer"
                    >
                      <BanderaPais pais={paisTelefono} className="w-6 h-6 rounded-md" />
                      <span>{PREFIJOS[paisTelefono]?.codigo || "CO"}</span>
                      <span className="text-[12px] font-normal text-gray-500">
                        ({PREFIJOS[paisTelefono]?.prefijo || "+57"})
                      </span>
                      <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                    </button>

                    {selectorPrefijoAbierto && (
                      <div className="absolute top-full left-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#16171d] border border-[#ECECEC] dark:border-white/15 shadow-2xl z-30 p-1.5 flex flex-col gap-1">
                        {Object.entries(PREFIJOS).map(([paisKey, val]) => (
                          <button
                            key={paisKey}
                            type="button"
                            onClick={() => {
                              setPaisTelefono(paisKey);
                              setSelectorPrefijoAbierto(false);
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] font-normal text-[#212121] dark:text-gray-200 hover:bg-[#EFE6D3]/40 dark:hover:bg-white/10 text-left cursor-pointer transition-colors"
                          >
                            <BanderaPais pais={paisKey} className="w-5 h-5 rounded-md" />
                            <span className="font-bold">{val.codigo}</span>
                            <span className="text-[12px] text-gray-400">({val.prefijo})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Input teléfono */}
                  <input
                    ref={inputTelefonoRef}
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ingresa un teléfono"
                    className="w-full text-[24px] font-bold text-[#212121] dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 border-2 border-[#ECECEC] dark:border-white/15 focus:border-[#FF3F1A] rounded-r-2xl p-4 bg-white/80 dark:bg-white/5 backdrop-blur-xs outline-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EFE6D3]/60 dark:bg-white/5 border border-[#ECECEC] dark:border-white/10 backdrop-blur-xs">
                  <PhoneIcon className="w-4 h-4 text-[#FF3F1A] shrink-0" />
                  <p className="text-[12px] font-light text-[#212121]/70 dark:text-gray-400">
                    Las transportadoras contactarán a este teléfono en caso de novedades de entrega.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: DÓNDE OPERARÁ TU NEGOCIO */}
          {paso === 4 && (
            <div className="flex flex-col gap-6 animate-aparecer">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#190088] dark:bg-[#97D6DF] text-white dark:text-[#190088] text-[12px] font-bold">
                    4
                  </span>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#FF3F1A]">
                    Paso 4 de 4 — Operación Logística
                  </span>
                </div>
                <h1 className="text-[36px] font-bold text-[#190088] dark:text-white leading-tight font-['DM_Sans',sans-serif]">
                  ¿Dónde operará tu negocio?
                </h1>
                <p className="text-[16px] font-light text-[#212121]/70 dark:text-gray-300">
                  Usaremos la ubicación de tu negocio para configurar las transportadoras, la moneda y más.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {PAISES_DISPONIBLES.map((opcion) => {
                  const seleccionado = paisOperacion === opcion.nombre;
                  return (
                    <button
                      key={opcion.nombre}
                      type="button"
                      onClick={() => {
                        setPaisOperacion(opcion.nombre);
                        setPaisTelefono(opcion.nombre);
                      }}
                      className={`flex flex-col items-start p-5 rounded-2xl transition-all cursor-pointer text-left relative ${
                        seleccionado
                          ? "border-2 border-[#190088] dark:border-[#97D6DF] ring-2 ring-[#190088]/20 bg-[#EFE6D3]/40 dark:bg-white/10 backdrop-blur-xs shadow-md"
                          : "border-2 border-[#ECECEC] dark:border-white/10 hover:border-gray-400 dark:hover:border-white/25 bg-white/90 dark:bg-white/5 backdrop-blur-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <BanderaPais pais={opcion.nombre} className="w-8 h-8 rounded-lg" />
                        <span className="text-[12px] font-bold uppercase tracking-wider text-[#190088] dark:text-[#97D6DF] bg-[#EFE6D3] dark:bg-white/10 px-2.5 py-0.5 rounded-full">
                          {opcion.moneda} ({opcion.simbolo})
                        </span>
                      </div>

                      <span className="text-[24px] font-bold text-[#212121] dark:text-white leading-tight mb-1">
                        {opcion.nombre}
                      </span>
                      <p className="text-[14px] font-light text-[#212121]/70 dark:text-gray-300 leading-snug">
                        {opcion.descripcion}
                      </p>

                      {seleccionado && (
                        <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF3F1A] text-white">
                          <CheckIcon className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navegación y Botones del Onboarding */}
          <div className="flex items-center justify-between pt-6 border-t border-[#ECECEC] dark:border-white/10 mt-2">
            <div>
              {paso > 1 ? (
                <button
                  type="button"
                  onClick={atras}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-[#ECECEC] dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/10 text-[14px] font-bold text-[#212121] dark:text-gray-200 transition-all cursor-pointer"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCerrar}
                  className="text-[14px] font-light text-[#212121]/60 dark:text-gray-400 hover:text-[#212121] dark:hover:text-white transition-colors cursor-pointer px-2"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[12px] font-light text-[#212121]/50 dark:text-gray-500 hidden sm:inline-block">
                presiona <strong className="font-bold text-[#212121] dark:text-gray-300">Enter ↵</strong>
              </span>

              <button
                type="button"
                onClick={siguiente}
                disabled={!puedeAvanzar() || cargando}
                className="px-8 py-3.5 rounded-2xl font-bold text-[16px] text-white bg-[#FF3F1A] hover:bg-[#e03413] active:scale-[0.98] shadow-lg shadow-[#FF3F1A]/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>
                  {cargando
                    ? "Creando negocio..."
                    : paso === 4
                    ? "Crear negocio"
                    : "Continuar"}
                </span>
                {paso === 4 ? (
                  <SparklesIcon className="w-5 h-5" />
                ) : (
                  <ArrowRightIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer del Onboarding */}
      <footer className="relative w-full flex items-center justify-between text-[12px] font-light text-[#212121]/50 dark:text-gray-500 z-20 pointer-events-auto">
        <span>Necto &copy; {new Date().getFullYear()} — Infraestructura de Comercio y Logística</span>
        <span>Paso {paso} de 4</span>
      </footer>
    </div>
  );
};
