import React from "react";
import { User, Phone, Lock, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { AccountTab } from "./hooks/useAccountSettingsForm";

export type { AccountTab };

/**
 * Las áreas de los ajustes de perfil.
 *
 * ⚠️ Sólo `label` + `icon`. El encabezado de cada área **no** se declara aquí:
 * los títulos los llevan los propios grupos de contenido, que ya dicen de qué
 * van ("Correos electrónicos", "Contraseña"). Antes cada pestaña repetía su
 * `<h3>` + párrafo —copiando el rótulo de la barra— y el encabezado del modal
 * repetía a su vez el propósito general: tres capas diciendo lo mismo antes del
 * primer campo.
 *
 * La barra marca **dónde estás**; los grupos dicen **qué hay**. Con eso basta.
 */
export const TABS: Array<{
  id: AccountTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "profile", label: "Perfil y personalización", icon: User },
  { id: "contact", label: "Contacto", icon: Phone },
  { id: "preferences", label: "Preferencias", icon: SlidersHorizontal },
  { id: "security", label: "Seguridad", icon: Lock },
  { id: "permissions", label: "Alcance y permisos", icon: ShieldCheck },
];
