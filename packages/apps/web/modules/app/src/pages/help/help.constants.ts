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
    title: "Da de alta tu tienda",
    body: "Desde el hub defines el tipo de negocio y su primera sucursal: nombre, código, teléfono de atención, ubicación y horarios. Las siguientes sucursales heredan la identidad de la tienda.",
  },
  {
    num: 4,
    title: "Enciende módulos y conecta WhatsApp",
    body: "Activa solo lo que necesitas hoy (pedidos, inventario, turnos, reservas, agendamiento, fidelización) y vincula WhatsApp Business cuando quieras: es opcional.",
  },
];

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "usuario-vs-tienda",
    question: "¿Qué diferencia hay entre mi usuario y mi tienda?",
    answer:
      "Tu usuario es la persona: se crea al registrarte y sigue siendo el mismo aunque cambies de correo o entres con Google. La tienda es el negocio: puedes tener una o varias, y cada una con sus sucursales. Por eso puedes tener cuenta en Necto sin haber creado todavía ninguna tienda.",
  },
  {
    id: "varias-sucursales",
    question: "¿Puedo tener varias sucursales bajo la misma tienda?",
    answer:
      "Sí. El tipo de negocio, el modelo de oferta, la moneda y el país se definen una sola vez para la tienda. Cada sucursal aporta lo suyo: nombre, código interno, teléfono de atención, dirección, ciudad, horarios, canales y módulos activos.",
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
      "No, es opcional. Puedes vincularlo más tarde desde Configuración → Canales de entrada. Eso sí: mientras no esté conectado, los pedidos entran solo por tienda web y mostrador, no por conversación.",
  },
  {
    id: "modulos-despues",
    question: "¿Puedo activar módulos más adelante?",
    answer:
      "Sí, y sin rehacer nada. Los módulos se eligen al crear la sucursal y se pueden activar o desactivar después, sucursal por sucursal, para que una sede tenga inventario y otra no.",
  },
  {
    id: "cambiar-pais-moneda",
    question: "¿Puedo cambiar el país o la moneda después?",
    answer:
      "Sí, desde Configuración → General. Como son datos de la tienda y no de una sucursal concreta, el cambio se aplica a todas tus sucursales a la vez: así no quedan dos sedes operando con monedas distintas.",
  },
  {
    id: "recuperar-password",
    question: "¿Cómo recupero mi contraseña?",
    answer:
      "Usa «¿Olvidaste tu contraseña?» en la pantalla de acceso y te enviamos un enlace al correo con el que te registraste. Si entraste con Google y nunca estableciste una contraseña, ese mismo enlace sirve para crearla.",
  },
];
