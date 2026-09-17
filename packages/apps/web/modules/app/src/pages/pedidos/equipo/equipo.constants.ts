import type { BadgeColor } from "@/elements/ui/badge";
import type { OperadorEstado } from "@/stores/operadores.store";
import type { NivelArea } from "./equipo.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES DE LA PANTALLA "EQUIPO" (pedidos)
// ═══════════════════════════════════════════════════════════════════════════
//
// Metadatos de presentación: cómo se llaman y cómo se pintan las cosas del
// equipo. Nada de autorización aquí — eso vive en `roles.store` y
// `session.store` (contrato §1).
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Metadatos de estado de una persona del equipo.
 *
 * Nota de nomenclatura: "Operador" era el nombre del *tipo de sesión*
 * (`administrador` | `operador`), y se retiró del vocabulario de autorización
 * (contrato §1.2). En la UI de equipo hablamos de **personas** y de su
 * **acceso**, que puede estar activo, pendiente o suspendido.
 */
export const ESTADO_META: Record<OperadorEstado, { label: string; color: BadgeColor; descripcion: string }> = {
  activo: {
    label: "Activo",
    color: "success",
    descripcion: "Puede entrar y operar según lo que le permita su rol.",
  },
  pendiente: {
    label: "Pendiente",
    color: "warning",
    descripcion: "Solicitó acceso. Falta aprobarla y asignarle un rol.",
  },
  inactivo: {
    label: "Suspendido",
    color: "light",
    descripcion: "Sin acceso. Su historial se conserva.",
  },
};

/** Pestañas de la pantalla. */
export type TabEquipo = "todos" | "pendientes" | "roles";

/**
 * Sentinel del filtro de estado ("Todos"). Se usa una cadena imposible en vez
 * de `null` para que el valor del `<select>` siga siendo un string.
 */
export const FILTRO_ESTADO_TODAS = "__todas__";

/** Opciones del filtro de estado (para el `<Select>`). */
export const OPCIONES_FILTRO_ESTADO: { value: string; label: string }[] = [
  { value: FILTRO_ESTADO_TODAS, label: "Todos" },
  { value: "activo", label: ESTADO_META.activo.label },
  { value: "pendiente", label: ESTADO_META.pendiente.label },
  { value: "inactivo", label: ESTADO_META.inactivo.label },
];

/** Colores de badge semánticos para cada categoría de capacidades. */
export const CATEGORIA_COLORES: Record<string, BadgeColor> = {
  ordenes: "info",
  preparacion: "warning",
  programados: "primary",
  canales: "success",
  ajustes: "light",
  equipo: "dark",
};

/**
 * Color del chip de nivel de un área (`Sí` / `Parcial` / `No`).
 *
 * Vive aquí, y no en cada pantalla, para que el perfil de una persona y el
 * editor de roles pinten el mismo nivel con el mismo color: si "Parcial" es
 * naranja en un sitio, tiene que serlo en el otro.
 */
export const NIVEL_COLOR: Record<NivelArea, BadgeColor> = {
  si: "success",
  parcial: "warning",
  no: "light",
};

/**
 * Genera un correo de ejemplo a partir del nombre, para el alta rápida.
 * No es autoritativo: el admin lo puede editar antes de guardar.
 */
export function emailSugerido(nombre: string): string {
  const limpio = nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "");
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  const usuario = partes.length === 1 ? partes[0] : `${partes[0]}.${partes[partes.length - 1]}`;
  return `${usuario}@negocio.com`;
}
