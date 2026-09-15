import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Select } from "@/elements/form/select";
import { Label } from "@/elements/form/label";
import { ThemeToggleButton } from "@/shell";
import { operadoresStore, sessionStore, SECCIONES } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OperadorLoginPage — "login" de operador para SIMULAR (mock).
 *
 * En vez de un login real, el usuario elige de una lista qué operador quiere
 * simular. Al entrar, sessionStore.simular() activa el modo simulación y la app
 * corre con los permisos de ese operador (sidebar + rutas limitados).
 *
 * Vista construida con el flujo Elements: Card + Select + Button del catálogo.
 */
export const OperadorLoginPage = observer(() => {
  const navigate = useNavigate();
  const [operadorId, setOperadorId] = useState<string>("");

  // Solo se pueden simular operadores activos.
  const operadores = operadoresStore.operadores.filter((o) => o.estado === "activo");

  const opciones = operadores.map((o) => ({
    value: o.id,
    label: `${o.nombre} · ${o.modulo === "turnos" ? "Turnos" : "Agendamiento"}`,
  }));

  const elegido = operadores.find((o) => o.id === operadorId) ?? null;

  const entrar = () => {
    if (!elegido) return;
    sessionStore.simular(elegido.id);
    // Entra a Inicio (modo simulación ya activo). Si el operador no tiene
    // permiso a "inicio", homePathActual lo lleva a su primera sección.
    navigate(sessionStore.homePathActual);
  };

  const totalSecciones = elegido ? SECCIONES[elegido.modulo].length : 0;

  return (
    <>
      <PageMeta title="Simular operador" description="Entra como un operador para ver la app con sus permisos" />

      <div className="relative min-h-screen bg-gray-50 px-6 py-12 dark:bg-gray-950">
        <div className="fixed right-6 top-6 z-50">
          <ThemeToggleButton variant="floating" />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-col">
          {/* Encabezado centrado */}
          <div className="mb-8 flex flex-col items-center text-center">
            <img src="/images/logo/necto-icon.svg" alt="NECTO" className="mb-4 h-10 w-10" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Simular operador</h1>
            <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Elige el operador con el que quieres entrar. Verás la app con sus permisos.
            </p>
          </div>

          {/* Tarjeta con el selector */}
          <Card>
            <div>
              <Label htmlFor="op-select">Operador</Label>
              <Select
                options={opciones}
                placeholder="Elige un operador"
                defaultValue=""
                onChange={setOperadorId}
              />
            </div>

            {/* Resumen del operador elegido (solo si hay selección) */}
            {elegido && (
              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{elegido.nombre}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {elegido.modulo === "turnos" ? "Turnos" : "Agendamiento"} · {elegido.permisos.length} de {totalSecciones} secciones permitidas
                </p>
              </div>
            )}

            {/* Acciones */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button size="sm" variant="outline" onClick={() => navigate("/seleccionar")}>Cancelar</Button>
              <Button size="sm" disabled={!elegido} onClick={entrar}>Entrar como operador</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
});

export default OperadorLoginPage;
