import { organizacionStore } from "@/stores/organizacion.store";
import { hayCanalesMensajeriaActivos } from "@/stores/acceso.utils";
import { Eye, Lightbulb, Handshake, Network } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Tareas de puesta en marcha. Una sola fuente para el checklist de `/inicio`
 * y para las notificaciones del dashboard: si cada pantalla decidiera por su
 * cuenta qué falta, una tarea completada seguiría apareciendo en la otra.
 *
 * Se leen del store dentro de componentes `observer`, así que cambian solas
 * cuando cambia el estado (p. ej. al instalar un módulo o conectar un canal).
 */
export interface TareaInicio {
  id: string;
  nombre: string;
  /** Título y texto de la notificación cuando la tarea está pendiente. */
  aviso: { titulo: string; texto: string; accion: string };
  ruta: string;
  completada: boolean;
  icono: LucideIcon;
}

export function tareasDeInicio(): TareaInicio[] {
  return [
    {
      id: "perfil",
      nombre: "Visualiza tus agentes y perfil",
      aviso: {
        titulo: "Perfil: Completa tus datos",
        texto: "Completa tu perfil para personalizar tu cuenta.",
        accion: "Completar perfil",
      },
      ruta: "/onboarding/perfil",
      completada: organizacionStore.tienePerfil,
      icono: Eye,
    },
    {
      id: "modulo",
      nombre: "Comprende tus costos y módulos",
      aviso: {
        titulo: "Configuración: Instalar módulo",
        texto: "Instala tus módulos (WhatsApp, Catálogo, etc.) para operar.",
        accion: "Instalar módulo",
      },
      ruta: "/configuracion?tab=modulos",
      completada: organizacionStore.modulosActivos.length > 0,
      icono: Lightbulb,
    },
    {
      id: "canales",
      nombre: "Demuestra el valor de tus canales",
      aviso: {
        titulo: "Canales: Conectar mensajería",
        texto: "Conecta WhatsApp, Instagram o Messenger para recibir clientes.",
        accion: "Conectar canales",
      },
      ruta: "/configuracion?tab=canales",
      completada: hayCanalesMensajeriaActivos(),
      icono: Handshake,
    },
    {
      id: "agentes",
      nombre: "Corrige y ajusta lo que no funciona",
      aviso: {
        titulo: "Bot IA: Ajustar respuestas y flujo",
        texto: "Revisa y personaliza la atención automática de tus agentes.",
        accion: "Ajustar bot",
      },
      ruta: "/conversaciones?tab=bot",
      completada: Boolean(organizacionStore.esModuloActivo("conversaciones")),
      icono: Network,
    },
  ];
}
