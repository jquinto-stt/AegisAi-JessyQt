import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Button } from "@/elements/ui/button";
import { ThemeToggleButton } from "@/shell";
import { organizacionStore } from "@/stores/organizacion.store";

const CANALES_ADQUISICION = [
  { id: "instagram", label: "Instagram o TikTok", icon: "📱" },
  { id: "colega", label: "Recomendación de un colega", icon: "🤝" },
  { id: "google", label: "Búsqueda en Google", icon: "🔍" },
  { id: "comunidad", label: "Comunidad o evento", icon: "👥" },
  { id: "otro", label: "Otro canal", icon: "✨" },
];

export const PerfilOnboardingPage = observer(() => {
  const navigate = useNavigate();
  const usuarioActual = organizacionStore.usuario;

  const [nombre, setNombre] = useState(usuarioActual?.nombre || "");
  const [apellido, setApellido] = useState(usuarioActual?.apellido || "");
  const [email, setEmail] = useState(usuarioActual?.email || "usuario@empresa.com");
  const [pais, setPais] = useState(usuarioActual?.pais || "Colombia");
  const [canalElegido, setCanalElegido] = useState(usuarioActual?.comoNosConociste || "");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim() || !email.trim()) {
      setError("Por favor completa tu nombre, apellido y correo electrónico.");
      return;
    }

    organizacionStore.actualizarPerfil({
      nombre,
      apellido,
      email,
      pais,
      comoNosConociste: canalElegido || undefined,
    });

    navigate("/onboarding/organizacion");
  };

  return (
    <>
      <PageMeta title="Bienvenido a Necto · Tu Perfil" description="Completa tu perfil personal" />

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
              Paso 1 de 3 · Perfil Personal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              ¡Te damos la bienvenida a Necto!
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Configuremos tu perfil personal antes de crear el espacio de trabajo de tu negocio.
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="nombre">Nombre <span className="text-error-500">*</span></Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Carolina"
                    value={nombre}
                    onChange={(e) => {
                      setNombre(e.target.value);
                      setError("");
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="apellido">Apellido <span className="text-error-500">*</span></Label>
                  <Input
                    id="apellido"
                    placeholder="Ej: Zapata"
                    value={apellido}
                    onChange={(e) => {
                      setApellido(e.target.value);
                      setError("");
                    }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Correo electrónico <span className="text-error-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                />
              </div>

              <div>
                <Label htmlFor="pais">País de residencia</Label>
                <select
                  id="pais"
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
                  <option value="Otro">Otro país</option>
                </select>
              </div>

              {/* Pregunta de Adquisición */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  ¿Cómo conociste Necto?
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CANALES_ADQUISICION.map((c) => {
                    const seleccionado = canalElegido === c.label;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCanalElegido(c.label)}
                        className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-xs font-medium transition-all ${
                          seleccionado
                            ? "border-brand-500 bg-brand-50/70 text-brand-700 shadow-2xs dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="text-base">{c.icon}</span>
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">Paso 1 de 3</span>
                <Button size="md" type="submit">
                  Continuar a crear Organización →
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
});

export default PerfilOnboardingPage;
