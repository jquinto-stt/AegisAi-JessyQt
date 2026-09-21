import React from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { SUPPORT_CHANNELS, type SupportChannel } from "./support.constants";

/**
 * Una tarjeta de canal. El destino se resuelve aquí y no en el llamante porque
 * el canal declara **a dónde va**, no **cómo se navega**:
 *
 *   - `to`   → `Link` de react-router: navegación de cliente, sin recargar.
 *   - `href` → `<a>` nativo, que es lo correcto para `mailto:` y para el ancla
 *     de la propia página (el router no desplaza la vista a un `#id`).
 */
const ChannelCard: React.FC<{ channel: SupportChannel }> = ({ channel }) => {
  const { icon: Icon, title, description, action, to, href } = channel;

  const className =
    "group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-left transition-colors hover:border-brand-500/50 hover:bg-brand-500/[0.04] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/[0.06]";

  const body = (
    <>
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-500/10 text-brand-700 transition-colors group-hover:bg-brand-500 group-hover:text-white dark:text-brand-500">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="text-base font-bold text-gray-900 dark:text-white">{title}</span>
      <span className="text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
        {description}
      </span>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-theme-sm font-semibold text-brand-700 dark:text-brand-500">
        {action}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {body}
      </a>
    );
  }

  return (
    <Link to={to ?? "/soporte"} className={className}>
      {body}
    </Link>
  );
};

/**
 * Canales de contacto.
 *
 * Va **antes** del formulario a propósito: quien llega con una duda ya resuelta
 * en el centro de ayuda no debería tener que rellenar nada para descubrirlo. El
 * formulario no desaparece —está justo debajo—, pero deja de ser la única puerta.
 */
export const SupportChannels: React.FC = () => (
  <section aria-labelledby="support-channels">
    <h2
      id="support-channels"
      className="text-2xl font-bold tracking-tight text-ink-title dark:text-white"
    >
      Canales de contacto
    </h2>

    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SUPPORT_CHANNELS.map(channel => (
        <ChannelCard key={channel.id} channel={channel} />
      ))}
    </div>
  </section>
);

export default SupportChannels;
