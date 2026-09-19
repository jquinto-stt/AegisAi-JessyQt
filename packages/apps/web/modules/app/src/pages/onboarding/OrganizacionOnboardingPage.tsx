import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { Clock, DollarSign, Upload, Edit3, ArrowRight } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Button } from "@/elements/ui/button";
import { organizacionStore, PAISES_CONFIG } from "@/stores/organizacion.store";
import { OnboardingLayout } from "./OnboardingLayout";

const TIPOS_EMPRESA = [
  "Gastronomía & Alimentos",
  "Moda, Calzado & Accesorios",
  "Retail & Comercio minorista",
  "Tecnología & Software",
  "Servicios Profesionales & Consultoría",
  "Salud, Estética & Bienestar",
  "Construcción & Hogar",
  "Otro rubro comercial",
];

const TAMANOS_EQUIPO = [
  "Solo yo (1 persona)",
  "2 a 5 personas",
  "6 a 20 personas",
  "Más de 20 personas",
];

const BRAND_MESSAGES_ORGANIZACION = [
  {
    badge: "Tu Organización",
    title: "Centraliza la operación de tu negocio.",
    subtitle: "Un espacio de trabajo unificado donde conviven tus ventas, catálogo y equipo.",
  },
  {
    badge: "Estandarización Regional",
    title: "Moneda y horarios sincronizados.",
    subtitle: "Tus reportes y transacciones operan automáticamente bajo el huso horario correcto.",
  },
  {
    badge: "Identidad de Marca",
    title: "Reconocible para clientes y equipo.",
    subtitle: "Personaliza tus comprobantes, pedidos y despachos con el logo de tu empresa.",
  },
];

export const OrganizacionOnboardingPage = observer(() => {
  const navigate = useNavigate();
  const orgActual = organizacionStore.organizacion;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sub-paso dentro de Organización: 1 (Datos) o 2 (Logo)
  const [subPaso, setSubPaso] = useState<1 | 2>(1);

  const [nombre, setNombre] = useState(orgActual?.nombre || "");
  const [pais, setPais] = useState(orgActual?.pais || "Colombia");
  const [tipoEmpresa, setTipoEmpresa] = useState(
    orgActual?.tipoEmpresa || "Retail & Comercio minorista"
  );
  const [tamanoEquipo, setTamanoEquipo] = useState(
    orgActual?.tamanoEquipo || "2 a 5 personas"
  );
  const [logoUrl, setLogoUrl] = useState<string | undefined>(orgActual?.logoUrl);
  const [error, setError] = useState("");

  const configPais = PAISES_CONFIG[pais] || PAISES_CONFIG["Colombia"];

  const slugGenerado = nombre
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const handleNextSubPaso = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nombre.trim()) {
      setError("Por favor ingresa el nombre de tu empresa o negocio.");
      return;
    }
    setError("");
    setSubPaso(2);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setLogoUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinalizarOrganizacion = () => {
    organizacionStore.crearOrganizacion({
      nombre,
      pais,
      moneda: configPais.moneda,
      zonaHoraria: configPais.zonaHoraria,
      tipoEmpresa,
      tamanoEquipo,
      logoUrl,
    });

    // Pasa a la encuesta final antes de entrar directo al workspace
    navigate("/onboarding/encuesta?redirect=/workspaces");
  };

  return (
    <>
      <PageMeta
        title="Crear Organización · Necto"
        description="Define el espacio de trabajo para tu negocio"
      />

      <OnboardingLayout
        pasoActual={2}
        totalPasos={2}
        pasoLabel="Organización"
        onBack={subPaso === 2 ? () => setSubPaso(1) : () => navigate("/onboarding/perfil")}
        brandMessages={BRAND_MESSAGES_ORGANIZACION}
        brandSummary={{
          eyebrow: "Tu empresa",
          title: nombre || "Nombre de tu empresa",
          lines: [
            slugGenerado ? `necto.app/${slugGenerado}` : "",
            `${configPais.moneda} · ${pais}`,
            `Zona horaria: ${configPais.zonaHoraria}`,
            tipoEmpresa,
          ].filter(Boolean),
        }}
      >
        <div className="w-full">
          {/* Encabezado del paso */}
          <div className="mb-6 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Paso 2 de 2 — {subPaso} / 2 Personaliza tu organización
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Personaliza tu organización
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              {subPaso === 1
                ? "Configura tu empresa para ti y los miembros que se unan más adelante."
                : "Agrega el logo de tu empresa para que todos tus reportes y clientes la reconozcan."}
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-error-200 bg-error-50 p-3 text-xs text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          )}

          {/* SUB-PASO 1: Datos de la organización */}
          {subPaso === 1 && (
            <form onSubmit={handleNextSubPaso} className="space-y-4">
              <div>
                <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Nombre de la empresa <span className="text-brand-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  placeholder="Ej: Boutique Roma, Café Central, Consultoría Solís"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setError("");
                  }}
                  className="mt-1.5 h-11"
                />
                {slugGenerado && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Identificador web:{" "}
                    <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
                      necto.app/{slugGenerado}
                    </span>
                  </p>
                )}
              </div>

              {/* País y Zona horaria / Moneda juntos con micro-copy natural */}
              <div>
                <Label htmlFor="countrySelect" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  País de operación <span className="text-brand-500">*</span>
                </Label>
                <div className="mt-1.5 relative">
                  <select
                    id="countrySelect"
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-xs transition-colors focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
                  >
                    {Object.keys(PAISES_CONFIG).map((pKey) => (
                      <option key={pKey} value={pKey}>
                        {pKey} ({PAISES_CONFIG[pKey].moneda})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Explicación sutil y elegante en texto natural, sin badges artificiales */}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Moneda base ({configPais.moneda}) y zona horaria ({configPais.zonaHoraria}) sincronizadas automáticamente con tu región.
                </p>
              </div>

              <div>
                <Label htmlFor="companyType" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Tipo de empresa <span className="text-brand-500">*</span>
                </Label>
                <div className="mt-1.5 relative">
                  <select
                    id="companyType"
                    value={tipoEmpresa}
                    onChange={(e) => setTipoEmpresa(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-xs transition-colors focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
                  >
                    {TIPOS_EMPRESA.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="teamStrength" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Tamaño del equipo <span className="text-brand-500">*</span>
                </Label>
                <div className="mt-1.5 relative">
                  <select
                    id="teamStrength"
                    value={tamanoEquipo}
                    onChange={(e) => setTamanoEquipo(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-xs transition-colors focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
                  >
                    {TAMANOS_EQUIPO.map((tam) => (
                      <option key={tam} value={tam}>
                        {tam}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/onboarding/perfil")}
                  className="rounded-full px-5 text-sm font-semibold cursor-pointer"
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  className="rounded-full px-8 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20 cursor-pointer"
                >
                  Continuar
                  <ArrowRight className="size-4 ml-1.5 inline" />
                </Button>
              </div>
            </form>
          )}

          {/* SUB-PASO 2: Logo de la organización */}
          {subPaso === 2 && (
            <div className="flex flex-col items-center py-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              {/* Círculo central con borde e ícono o previsualización */}
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-brand-500 bg-brand-50/40 p-2 shadow-inner dark:border-brand-400 dark:bg-brand-500/10">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo Organización"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <svg
                    className="h-16 w-16 text-brand-500 dark:text-brand-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                )}
              </div>

              {/* Botones de acción Subir Logo / Cambiar Logo */}
              <div className="mt-8 flex w-full max-w-sm items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 rounded-xl border-gray-300 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Subir logo
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (logoUrl) {
                      setLogoUrl(undefined);
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="flex-1 rounded-xl border-gray-300 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  {logoUrl ? "Quitar logo" : "Cambiar logo"}
                </Button>
              </div>

              {/* Botón Continuar */}
              <div className="mt-10 w-full max-w-sm">
                <Button
                  type="button"
                  onClick={handleFinalizarOrganizacion}
                  className="w-full rounded-xl py-3 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20 cursor-pointer"
                >
                  Continuar
                </Button>
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setSubPaso(1)}
                    className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white cursor-pointer"
                  >
                    ← Volver a editar datos
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </OnboardingLayout>
    </>
  );
});

export default OrganizacionOnboardingPage;
