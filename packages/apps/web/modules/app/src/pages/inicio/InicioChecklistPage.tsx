import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { Check } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { organizacionStore } from "@/stores/organizacion.store";
import { uiStore } from "@/stores";
import { tareasDeInicio, type TareaInicio } from "./tareas-inicio";

/** La animación de completar dura ~1,1 s; se deja verla antes de salir. */
const SALIDA_AL_TERMINAR_MS = 1800;

/**
 * Tareas cuya animación de «completada» ya se reprodujo, por organización.
 * Las tareas se completan fuera de Inicio, así que la animación se muestra al
 * volver, y solo la primera vez. Si el almacenamiento no está disponible, la
 * tarea aparece directamente como completada.
 */
const claveVistas = (orgId: string) => `necto:inicio:tareas-vistas:${orgId}`;

function leerVistas(orgId: string): string[] | null {
  try {
    const crudo = localStorage.getItem(claveVistas(orgId));
    return crudo ? (JSON.parse(crudo) as string[]) : [];
  } catch {
    return null;
  }
}

function guardarVistas(orgId: string, ids: string[]) {
  try {
    localStorage.setItem(claveVistas(orgId), JSON.stringify(ids));
  } catch {
    // Sin almacenamiento la animación podría repetirse; no es un error.
  }
}

const TarjetaTarea = ({
  tarea,
  recienCompletada,
  onCompletar,
}: {
  tarea: TareaInicio;
  recienCompletada: boolean;
  onCompletar: () => void;
}) => (
  <div
    className={`tarea-checklist flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-[#ECECEC] dark:border-white/10 shadow-xs transition-[border-color] ${
      tarea.completada
        ? "bg-[#ECECEC]/50 dark:bg-white/[0.04]"
        : "bg-white dark:bg-[#212121]/60 hover:border-[#97D6DF]/60 dark:hover:border-white/20"
    } ${recienCompletada ? "tarea-checklist--recien-completada" : ""}`}
  >
    <div className="flex items-center gap-3.5">
      {tarea.completada ? (
        <div className="tarea-checklist__circulo flex h-6 w-6 items-center justify-center rounded-full bg-[#97D6DF] text-[#190088] shrink-0 shadow-xs">
          <Check className="w-4 h-4 stroke-[2.8]" />
        </div>
      ) : (
        <div className="h-6 w-6 rounded-full border-2 border-[#ECECEC] dark:border-white/20 shrink-0" />
      )}
      <span
        className={`tarea-checklist__nombre relative inline-block text-[16px] ${
          tarea.completada
            ? "font-normal text-[#212121]/40 dark:text-[#ECECEC]/40"
            : "font-bold text-[#212121] dark:text-white"
        }`}
      >
        {tarea.nombre}
        {tarea.completada && <span className="tarea-checklist__tachado" aria-hidden="true" />}
      </span>
    </div>

    {tarea.completada ? (
      <span className="tarea-checklist__estado px-4 py-1.5 rounded-xl bg-[#97D6DF]/20 border border-[#97D6DF]/40 text-[#190088] dark:text-[#97D6DF] text-[12px] font-bold tracking-wide select-none">
        Completado
      </span>
    ) : (
      <button
        type="button"
        onClick={onCompletar}
        className="px-6 py-2 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] active:scale-[0.98] text-white text-[14px] font-bold tracking-wide cursor-pointer transition-[background-color,transform] shadow-md shadow-[#FF3F1A]/25"
      >
        Completar
      </button>
    )}
  </div>
);

export const InicioChecklistPage = observer(() => {
  const navigate = useNavigate();

  // Asegurar que la barra lateral esté contraída al abrir Inicio
  useEffect(() => {
    uiStore.setSidebarExpanded(false);
  }, []);

  const tareas = tareasDeInicio();
  const completadas = tareas.filter((t) => t.completada).map((t) => t.id);
  const todasCompletadas = completadas.length === tareas.length;
  const orgId = organizacionStore.organizacion?.id ?? "sin-organizacion";

  // Lo visto se lee una vez, al entrar; lo «recién completado» se deriva en cada
  // render, así que una tarea que se completa estando aquí (o cuyo dato llega
  // tarde del servidor) también se anima. Guardar en el efecto, y no aquí,
  // evita que el doble render de StrictMode la marque vista antes de pintarla.
  const [vistasAlEntrar] = useState(() => leerVistas(orgId));
  const recienCompletadas = new Set(
    vistasAlEntrar ? completadas.filter((id) => !vistasAlEntrar.includes(id)) : []
  );

  useEffect(() => {
    guardarVistas(orgId, completadas);
    // `completadas` se deriva del store en cada render; la clave es su contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, completadas.join(",")]);

  // Con todo completado el checklist ya no tiene función. Si la última tarea se
  // acaba de completar, se deja ver su animación y luego se pasa al dashboard.
  const mostrandoCierre = todasCompletadas && recienCompletadas.size > 0;
  useEffect(() => {
    if (!mostrandoCierre) return;
    const temporizador = setTimeout(() => navigate("/dashboard", { replace: true }), SALIDA_AL_TERMINAR_MS);
    return () => clearTimeout(temporizador);
  }, [mostrandoCierre, navigate]);

  const handleOmitir = () => {
    navigate("/dashboard");
  };

  if (todasCompletadas && !mostrandoCierre) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <PageMeta
        title="Inicio · Necto"
        description="Completa estos pasos y comienza a operar en Necto."
      />

      <div className="flex-1 w-full min-h-[calc(100vh-140px)] flex flex-col justify-center items-center py-10 px-4 sm:px-6 select-none animate-in fade-in duration-200 font-sans">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          {/* Título principal centrado — 36px Bold con Azul profundo NECTO #190088 */}
          <div className="text-center space-y-4">
            <h1 className="text-[24px] sm:text-[36px] font-bold leading-tight tracking-tight text-[#190088] dark:text-white">
              ¡Completa estos pasos y comienza a operar!
            </h1>

            {/* Barra y estado de progreso */}
            <div className="max-w-md mx-auto pt-1 space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wider text-[#212121]/70 dark:text-[#ECECEC]/70">
                <span>Configuración</span>
                <span className="text-[#190088] dark:text-[#97D6DF] font-bold">
                  Pasos completados {completadas.length}/{tareas.length}
                </span>
              </div>

              {/* Un segmento por tarea: Naranja NECTO si está completada, Gris claro si no */}
              <div className="grid grid-cols-2 gap-2.5 w-full">
                {tareas.map((t) => (
                  <div
                    key={t.id}
                    className={`h-2 rounded-full ${
                      t.completada
                        ? "bg-[#FF3F1A] shadow-xs shadow-[#FF3F1A]/30"
                        : "bg-[#ECECEC] dark:bg-white/10"
                    } ${recienCompletadas.has(t.id) ? "progreso-checklist__segmento--recien-completado" : ""}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Lista de tareas */}
          <div className="space-y-3 pt-3">
            {tareas.map((t) => (
              <TarjetaTarea
                key={t.id}
                tarea={t}
                recienCompletada={recienCompletadas.has(t.id)}
                onCompletar={() => navigate(t.ruta)}
              />
            ))}
          </div>

          {/* Enlace para Omitir — 14px Regular */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleOmitir}
              className="text-[14px] font-normal text-[#212121]/60 hover:text-[#FF3F1A] dark:text-[#ECECEC]/60 dark:hover:text-[#97D6DF] underline underline-offset-4 cursor-pointer transition-colors"
            >
              Saltar
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

export default InicioChecklistPage;
