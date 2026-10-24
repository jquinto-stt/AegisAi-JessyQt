import { organizacionStore } from "@/stores/organizacion.store";

/**
 * Tareas de puesta en marcha. Una sola fuente para el checklist de `/inicio`
 * y para las notificaciones del dashboard: si cada pantalla decidiera por su
 * cuenta qué falta, una tarea completada seguiría apareciendo en la otra.
 *
 * Se leen del store dentro de componentes `observer`, así que cambian solas
 * cuando cambia el estado (p. ej. al instalar un módulo).
 */
export interface TareaInicio {
  id: string;
  nombre: string;
  /** Título y texto de la notificación cuando la tarea está pendiente. */
  aviso: { titulo: string; texto: string; accion: string };
  ruta: string;
  completada: boolean;
}

export function tareasDeInicio(): TareaInicio[] {
  return [
    {
      id: "perfil",
      nombre: "Crea tu perfil",
      aviso: {
        titulo: "Perfil: Completa tus datos",
        texto: "Completa tu perfil para personalizar tu cuenta.",
        accion: "Completar perfil",
      },
      ruta: "/onboarding/perfil",
      completada: organizacionStore.tienePerfil,
    },
    {
      id: "modulo",
      nombre: "Instala un módulo",
      aviso: {
        titulo: "Configuración: Instalar módulo",
        texto: "Saltaste este paso. Instala tus módulos (WhatsApp, Catálogo, etc.) para operar.",
        accion: "Instalar módulo",
      },
      ruta: "/configuracion?tab=modulos",
      completada: organizacionStore.modulosActivos.length > 0,
    },
  ];
}
