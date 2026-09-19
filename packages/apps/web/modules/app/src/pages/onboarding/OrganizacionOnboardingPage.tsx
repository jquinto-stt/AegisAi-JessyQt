import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Button } from "@/elements/ui/button";
import { ThemeToggleButton } from "@/shell";
import { organizacionStore } from "@/stores/organizacion.store";

const MONEDAS_COMUNES = [
  { codigo: "COP", label: "Peso Colombiano (COP · $)", pais: "Colombia" },
  { codigo: "USD", label: "Dólar Estadounidense (USD · $)", pais: "Internacional" },
  { codigo: "MXN", label: "Peso Mexicano (MXN · $)", pais: "México" },
  { codigo: "ARS", label: "Peso Argentino (ARS · $)", pais: "Argentina" },
  { codigo: "EUR", label: "Euro (EUR · €)", pais: "España / Europa" },
];

export const OrganizacionOnboardingPage = observer(() => {
  const navigate = useNavigate();
  const orgActual = organizacionStore.organizacion;

  const [nombre, setNombre] = useState(orgActual?.nombre || "");
  const [pais, setPais] = useState(orgActual?.pais || "Colombia");
  const [moneda, setMoneda] = useState(orgActual?.moneda || "COP");
  const [zonaHoraria, setZonaHoraria] = useState(orgActual?.zonaHoraria || "America/Bogota");
  const [error, setError] = useState("");

  const slugGenerado = nombre
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Por favor ingresa el nombre de tu negocio o empresa.");
      return;
    }

    organizacionStore.crearOrganizacion({
      nombre,
      pais,
      moneda,
      zonaHoraria,
    });

    navigate("/modulos");
  };

  return (
    <>
      <PageMeta
        title="Crear Organización · Necto"
        description="Define el espacio de trabajo para tu negocio"
      />

      <div className="relative min-h-screen bg-gray-50/70 px-4 py-12 dark:bg-gray-950 sm:px-6">
        <div className="fixed right-6 top-6 z-50">
          <ThemeToggleButton variant="floating" />
        </div>

        <div className="mx-auto w-full max-w-xl">
          {/* Logo y Encabezado */}
          <div className="mb-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/20 text-white font-black text-xl mb-4">
              N
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 mb-2">
              Paso 2 de 3 · Espacio de Trabajo
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Crea tu Organización
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              La Organización es el contenedor donde viven tus módulos operativos, miembros y ajustes macro.
            </p>
          </div>

          {/* Tarjeta del formulario */}
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {error && (
              <div className="mb-5 rounded-xl border border-error-200 bg-error-50 p-3 text-xs text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="nombreOrg">Nombre del negocio o empresa <span className="text-error-500">*</span></Label>
                <Input
                  id="nombreOrg"
                  placeholder="Ej: Boutique Roma, Café Central, Consultoría Solís"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setError("");
                  }}
                />
                {slugGenerado && (
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Identificador único: <span className="font-mono text-brand-600 dark:text-brand-400">necto.app/{slugGenerado}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="paisOrg">País de operación</Label>
                  <select
                    id="paisOrg"
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="Colombia">Colombia</option>
                    <option value="México">México</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Chile">Chile</option>
                    <option value="España">España</option>
                    <option value="Estados Unidos">Estados Unidos</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="monedaOrg">Moneda base</Label>
                  <select
                    id="monedaOrg"
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    {MONEDAS_COMUNES.map((m) => (
                      <option key={m.codigo} value={m.codigo}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="zonaHoraria">Zona horaria del negocio</Label>
                <select
                  id="zonaHoraria"
                  value={zonaHoraria}
                  onChange={(e) => setZonaHoraria(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="America/Bogota">Bogotá, Lima, Quito (GMT-5)</option>
                  <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                  <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
                  <option value="America/Santiago">Santiago de Chile (GMT-4)</option>
                  <option value="Europe/Madrid">Madrid, Barcelona (GMT+1)</option>
                  <option value="America/New_York">Nueva York, Miami (GMT-5)</option>
                </select>
                <p className="mt-1.5 text-xs text-gray-400">
                  Tus pedidos, reportes y turnos se sincronizarán bajo este huso horario.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate("/onboarding/perfil")}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ← Volver a perfil
                </button>
                <Button size="md" type="submit">
                  Crear espacio de trabajo →
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
});

export default OrganizacionOnboardingPage;
