import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Select } from "@/elements/form/select";
import { Label } from "@/elements/form/label";
import { ThemeToggleButton } from "@/shell";
import { operadoresStore, sessionStore, rolesStore, type Modulo } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/** Etiqueta legible de cada módulo (antes solo contemplaba turnos y agendamiento). */
const MODULO_LABEL: Record<Modulo, string> = {
  turnos: "Turnos",
  agendamiento: "Agendamiento",
  pedidos: "Pedidos",
};

/**
 * OperadorLoginPage — selector para "Viendo como" (mock).
 *
 * No es un login: el usuario elige de una lista qué operador quiere previsualizar.
 * Al entrar, `sessionStore.simular()` activa la vista y la app corre con las
 * capacidades de ese operador.
 *
 * @deprecated SIN RUTA desde la Fase 4. No volver a enrutarlo.
 *
 * Esta página quedó **fuera de `App.tsx`**: `/operador/login` ahora redirige
 * (ver `RedireccionViendoComo`). Los motivos, por si alguien piensa en
 * resucitarla:
 *
 * 1. **Era un agujero de autorización.** Vivía como ruta standalone, fuera de
 *    `RequireSession` y sin ningún guard, así que bastaba escribir la URL para
 *    impersonar a cualquier operador activo sin tener `team.manage`.
 * 2. **Duplicaba la impersonación.** Esa capacidad ya vive en Equipo
 *    (`/pedidos/equipo` → acción "Ver como"), que sí está guardada. Dos puertas
 *    para la misma acción es justo lo que el contrato (§4) evita.
 *
 * Contrato §1.7: la simulación es una herramienta administrativa, NO
 * autenticación. Si hace falta un selector de "Viendo como" fuera de Equipo,
 * el sitio correcto es una ruta DENTRO de `RequireSession` con
 * `<CapabilityGuard capacidad="team.manage">`, nunca una ruta standalone.
 *
 * El archivo se conserva (sin uso) a propósito; se borra cuando confirmemos que
 * nadie lo necesita.
 */
export const OperadorLoginPage = observer(() => {
  const navigate = useNavigate();
  const [operadorId, setOperadorId] = useState<string>("");

  // Solo se pueden simular operadores activos.
  const operadores = operadoresStore.operadores.filter((o) => o.estado === "activo");

  const opciones = operadores.map((o) => ({
    value: o.id,
    label: `${o.nombre} · ${MODULO_LABEL[o.modulo]}`,
  }));

  const elegido = operadores.find((o) => o.id === operadorId) ?? null;

  const entrar = () => {
    if (!elegido) return;
    sessionStore.simular(elegido.id);
    // Entra a Inicio (vista ya activa). Si el operador no puede ver "inicio",
    // homePathActual lo lleva a su primera sección permitida.
    navigate(sessionStore.homePathActual);
  };

  // Se muestra el ROL, no un contador de secciones: el rol es la fuente de
  // verdad de la autorización (contrato §4) y un "X de N secciones" expone la
  // implementación del permiso en vez de comunicar la capacidad de la persona.
  const rolNombre = elegido ? rolesStore.nombreDe(elegido.rolId) : "";

  return (
    <>
      <PageMeta title="Viendo como" description="Previsualiza la app con las capacidades de un operador" />

      <div className="relative min-h-screen bg-gray-50 px-6 py-12 dark:bg-gray-950">
        <div className="fixed right-6 top-6 z-50">
          <ThemeToggleButton variant="floating" />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-col">
          {/* Encabezado centrado */}
          <div className="mb-8 flex flex-col items-center text-center">
            <img src="/images/logo/necto-icon.svg" alt="NECTO" className="mb-4 h-10 w-10" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Viendo como</h1>
            <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Elige la persona cuya vista quieres previsualizar. Verás la app con sus capacidades.
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
                  {MODULO_LABEL[elegido.modulo]}
                  {rolNombre && ` · ${rolNombre}`}
                </p>
              </div>
            )}

            {/* Acciones */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button size="sm" variant="outline" onClick={() => navigate("/seleccionar")}>Cancelar</Button>
              <Button size="sm" disabled={!elegido} onClick={entrar}>Ver como</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
});

export default OperadorLoginPage;
