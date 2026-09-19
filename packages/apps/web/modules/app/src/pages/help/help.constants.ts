import {
  Rocket,
  ShieldCheck,
  CreditCard,
  Headphones,
  type LucideIcon,
} from "lucide-react";

/* ── Centro de ayuda: contenido estático ───────────────────────────────
 * Los textos viven aquí y no dentro del JSX para que el acordeón y los pasos
 * sean componentes de presentación: cambiar una respuesta no obliga a tocar
 * maquetación. Las respuestas describen lo que el producto hace de verdad (los
 * tres flujos de alta, el ámbito tienda/sucursal, la contraseña de una cuenta
 * de Google), no lo que sería bonito prometer.
 * ──────────────────────────────────────────────────────────────────── */

export interface HelpFeature {
  id: string;
  label: string;
  icon: LucideIcon;
}

/** Sellos de confianza del hero. */
export const HELP_FEATURES: HelpFeature[] = [
  { id: "fast", label: "Puesta en marcha rápida", icon: Rocket },
  { id: "secure", label: "Plataforma segura", icon: ShieldCheck },
  { id: "payments", label: "Pagos simples", icon: CreditCard },
  { id: "support", label: "Soporte experto", icon: Headphones },
];

export interface HelpStep {
  num: number;
  title: string;
  body: string;
}

/**
 * Primeros pasos. Reflejan el orden real del alta —cuenta, usuario, tienda— que
 * es justo el modelo que el producto separa: la persona existe antes que el
 * negocio, y la tienda se crea cuando el usuario lo decide desde el hub.
 */
export const HELP_STEPS: HelpStep[] = [
  {
    num: 1,
    title: "Crea tu cuenta",
    body: "Regístrate con tu correo o entra con Google. Aquí se crea tu cuenta de Necto; todavía no hay ninguna tienda implicada.",
  },
  {
    num: 2,
    title: "Completa tu perfil",
    body: "Cuatro pantallas rápidas: cómo te verás (foto o avatar y tu acento), tu país, para qué quieres usar Necto y cómo nos conociste. No volverás a verlas.",
  },
  {
    num: 3,
    title: "Crea tu Organización",
    body: "Define el nombre de tu empresa, país, moneda base y zona horaria para tu espacio de trabajo.",
  },
  {
    num: 4,
    title: "Enciende módulos y conecta canales",
    body: "Activa solo lo que necesitas hoy (pedidos, catálogo, preparación) y vincula tus canales cuando quieras.",
  },
];

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "usuario-vs-organizacion",
    question: "¿Qué diferencia hay entre mi usuario y mi organización?",
    answer:
      "Tu usuario es la persona: se crea al registrarte y sigue siendo el mismo aunque cambies de correo o entres con Google. La organización es tu espacio de trabajo comercial donde conviven tus módulos activos.",
  },
  {
    id: "agregar-modulos",
    question: "¿Puedo activar más módulos en cualquier momento?",
    answer:
      "Sí, totalmente. Desde tu espacio de trabajo puedes explorar el catálogo y agregar módulos como Pedidos, adaptando su perfil a tu modelo de negocio.",
  },
  {
    id: "password-google",
    question: "Entré con Google y no tengo contraseña. ¿Cómo entro con correo?",
    answer:
      "En Ajustes → Seguridad verás «Establecer contraseña» en lugar de «Cambiar contraseña». Al establecerla podrás entrar también con correo y contraseña, sin dejar de usar Google, y seguirás siendo la misma cuenta.",
  },
  {
    id: "whatsapp-obligatorio",
    question: "¿Necesito conectar WhatsApp para empezar?",
    answer:
      "No, es opcional. Puedes vincularlo más tarde desde la configuración del módulo. Mientras no esté conectado, puedes gestionar tus ventas y pedidos directamente desde el panel operativo.",
  },
  {
    id: "modulos-despues",
    question: "¿Puedo cambiar el perfil comercial de mis módulos después?",
    answer:
      "Sí, y sin perder información. Puedes reconfigurar el perfil comercial de pedidos en cualquier momento para adaptar la terminología, los modificadores o los flujos.",
  },
  {
    id: "cambiar-pais-moneda",
    question: "¿Puedo cambiar el país o la moneda de mi organización?",
    answer:
      "Sí, desde Configuración de la Organización puedes ajustar la moneda base y la zona horaria de tu espacio de trabajo.",
  },
  {
    id: "recuperar-password",
    question: "¿Cómo recupero mi contraseña?",
    answer:
      "Usa «¿Olvidaste tu contraseña?» en la pantalla de acceso y te enviamos un enlace al correo con el que te registraste. Si entraste con Google y nunca estableciste una contraseña, ese mismo enlace sirve para crearla.",
  },
];
