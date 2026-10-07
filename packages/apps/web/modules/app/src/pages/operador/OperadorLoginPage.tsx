import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Select } from "@/elements/form/select";
import { Label } from "@/elements/form/label";
import { ThemeToggleButton } from "@/shell";
import {
  operadoresStore,
  sessionStore,
  pedidosStore,
  inventariosStore,
  rolesStore,
  type Modulo,
} from "@/stores";

const MODULO_LABEL: Record<Modulo, string> = {
  pedidos: "Pedidos",
  inventarios: "Inventario",
};

/**
 * OperadorLoginPage — pantalla para SIMULAR acceso como un operador (mock).
 *
 * Permite al administrador o tester entrar previsualizando la app con las
 * capacidades y permisos de un operador activo (por ejemplo, Óscar Peña).
 */
export const OperadorLoginPage = observer(() => {
  const navigate = useNavigate();
  const [operadorId, setOperadorId] = useState<string>("");

  // Solo se pueden simular operadores activos
  const operadores = operadoresStore.operadores.filter((o) => o.estado === "activo");

  const opciones = operadores.map((o) => {
    const rolNombre = rolesStore.nombreDe(o.rolId);
    return {
      value: o.id,
      label: `${o.nombre} · ${rolNombre || o.cargo || MODULO_LABEL[o.modulo]}`,
    };
  });

  const elegido = operadores.find((o) => o.id === operadorId) ?? null;

  const entrar = () => {
    if (!elegido) return;
    sessionStore.simular(elegido.id);
    navigate(sessionStore.homePathActual || "/pedidos/inicio");
  };

  const rolNombre = elegido ? rolesStore.nombreDe(elegido.rolId) : "";

  return (
    <>
      <PageMeta title="Simular operador · Necto" description="Entra como un operador para ver la app con sus permisos" />

      <div className="relative min-h-screen bg-gray-50 px-6 py-12 dark:bg-gray-950">
        <div className="fixed right-6 top-6 z-50">
          <ThemeToggleButton variant="floating" />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-col">
          {/* Encabezado centrado */}
          <div className="mb-8 flex flex-col items-center text-center">
            <img src="/images/logo/necto-icon.svg" alt="NECTO" className="mb-4 h-10 w-10" />
            <h1 className="text-2xl font-bold text-ink-title dark:text-white/90">Simular acceso</h1>
            <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Elige el operador cuya vista quieres probar. Verás la plataforma con sus permisos exactos.
            </p>
          </div>

          {/* Tarjeta con el selector */}
          <Card className="p-6">
            <div>
              <Label htmlFor="op-select" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Operador a simular
              </Label>
              <Select
                options={opciones}
                placeholder="Selecciona un operador (ej. Óscar Peña)"
                defaultValue=""
                onChange={setOperadorId}
              />
            </div>

            {/* Resumen del operador elegido */}
            {elegido && (
              <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  {elegido.avatarUrl && (
                    <img
                      src={elegido.avatarUrl}
                      alt={elegido.nombre}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
                    />
                  )}
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{elegido.nombre}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {elegido.cargo} {rolNombre && `· Rol: ${rolNombre}`}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-gray-200/60 pt-2.5 text-xs text-gray-500 dark:border-gray-700/60 dark:text-gray-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Estado: {elegido.estado}</span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span>Módulo: {MODULO_LABEL[elegido.modulo] || elegido.modulo}</span>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(-1)}
                className="rounded-full px-5 cursor-pointer"
              >
                Volver
              </Button>
              <Button
                size="sm"
                disabled={!elegido}
                onClick={entrar}
                className="rounded-full px-6 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-theme-sm shadow-brand-500/20 cursor-pointer disabled:opacity-50"
              >
                Simular acceso
              </Button>
            </div>

            <div className="mt-5 pt-4 border-t border-dashed border-gray-200 dark:border-gray-800 text-center">
              <Button
                size="sm"
                variant="outline"
                type="button"
                className="w-full border-dashed text-xs text-gray-600 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 cursor-pointer"
                onClick={() => {
                  sessionStore.reset();
                  pedidosStore.iniciarDesdeCero();
                  inventariosStore.iniciarDesdeCero();
                  operadoresStore.iniciarDesdeCero();
                  navigate("/onboarding/perfil");
                }}
              >
                Simular inicio desde 0 (Sin datos · Onboarding)
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
});

export default OperadorLoginPage;
