import React from "react";

interface TextoMensajeFormateadoProps {
  texto: string;
  className?: string;
}

const ExternalLinkIcon: React.FC = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="inline-block shrink-0 opacity-80"
    aria-hidden="true"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

function parsearInline(
  texto: string,
  baseKey: string,
  linkClassName: string,
): React.ReactNode[] {
  // Regex que captura:
  // 1. Enlaces HTML: <a ...>...</a>
  // 2. Enlaces Markdown: [texto](url)
  // 3. Negrita HTML: <b>...</b>, <strong>...</strong>
  // 4. Código HTML: <code>...</code>
  // 5. Cursiva HTML: <i>...</i>, <em>...</em>
  // 6. Negrita WhatsApp: *texto*
  // 7. Cursiva WhatsApp: _texto_
  // 8. Código Markdown: `texto`
  // 9. URLs directas: https://... o http://...
  const inlineRegex =
    /(<a\s+[\s\S]*?<\/a>|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|<b>[\s\S]*?<\/b>|<strong>[\s\S]*?<\/strong>|<code>[\s\S]*?<\/code>|<i>[\s\S]*?<\/i>|<em>[\s\S]*?<\/em>|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|https?:\/\/[^\s<]+)/gi;

  const partes = texto.split(inlineRegex).filter(Boolean);

  return partes.map((t, idx) => {
    const key = `${baseKey}-in-${idx}`;

    // Enlace HTML (<a href="...">...</a>)
    if (/^<a\s+/i.test(t)) {
      const hrefMatch = t.match(/href=["']?([^"'\s>]+)["']?/i);
      const contentMatch = t.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
      const href = hrefMatch ? hrefMatch[1] : "#";
      const rawContent = contentMatch ? contentMatch[1] : href;
      const textContent =
        rawContent.replace(/<\/?[^>]+(>|$)/g, "").trim() || href;

      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          onClick={(e) => e.stopPropagation()}
        >
          <span>{textContent}</span>
          <ExternalLinkIcon />
        </a>
      );
    }

    // Enlace Markdown ([texto](url))
    if (/^\[[^\]]+\]\(https?:\/\/[^\s)]+\)$/.test(t)) {
      const match = t.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (match) {
        const [, label, url] = match;
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={(e) => e.stopPropagation()}
          >
            <span>{label}</span>
            <ExternalLinkIcon />
          </a>
        );
      }
    }

    // Negrita HTML (<b>...</b> o <strong>...</strong>)
    if (/^<(b|strong)[ >]/i.test(t)) {
      const limpio = t.replace(/<\/?[^>]+(>|$)/g, "");
      return (
        <strong key={key} className="font-semibold text-inherit">
          {limpio}
        </strong>
      );
    }

    // Negrita WhatsApp (*texto*)
    if (/^\*[^*\n]+\*$/.test(t)) {
      return (
        <strong key={key} className="font-semibold text-inherit">
          {t.slice(1, -1)}
        </strong>
      );
    }

    // Código HTML (<code>...</code>)
    if (/^<code[ >]/i.test(t)) {
      const limpio = t.replace(/<\/?[^>]+(>|$)/g, "");
      return (
        <code
          key={key}
          className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5 font-mono text-xs text-brand-600 dark:text-brand-400"
        >
          {limpio}
        </code>
      );
    }

    // Código Markdown (`...`)
    if (/^`[^`\n]+`$/.test(t)) {
      return (
        <code
          key={key}
          className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5 font-mono text-xs text-brand-600 dark:text-brand-400"
        >
          {t.slice(1, -1)}
        </code>
      );
    }

    // Cursiva HTML (<i> / <em>)
    if (/^<(i|em)[ >]/i.test(t)) {
      const limpio = t.replace(/<\/?[^>]+(>|$)/g, "");
      return (
        <em key={key} className="italic text-inherit opacity-90">
          {limpio}
        </em>
      );
    }

    // Cursiva WhatsApp (_texto_)
    if (/^_[^_\n]+_$/.test(t)) {
      return (
        <em key={key} className="italic text-inherit opacity-90">
          {t.slice(1, -1)}
        </em>
      );
    }

    // URL directa (http://... o https://...)
    if (/^https?:\/\/[^\s<]+$/i.test(t)) {
      let url = t;
      let trailing = "";
      const trailMatch = t.match(/[.,;:!?]+$/);
      if (trailMatch) {
        trailing = trailMatch[0];
        url = t.slice(0, -trailing.length);
      }

      return (
        <React.Fragment key={key}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={(e) => e.stopPropagation()}
          >
            <span>{url}</span>
            <ExternalLinkIcon />
          </a>
          {trailing}
        </React.Fragment>
      );
    }

    return <React.Fragment key={key}>{t}</React.Fragment>;
  });
}

export const TextoMensajeFormateado: React.FC<TextoMensajeFormateadoProps> = ({
  texto,
  className = "whitespace-pre-line leading-relaxed break-words [overflow-wrap:anywhere] font-sans",
}) => {
  if (!texto) return null;

  // Normalizar saltos de línea HTML si existen
  const textoNormalizado = texto.replace(/<br\s*\/?>/gi, "\n");

  const esBlanco = className.includes("text-white");
  const linkClassName = esBlanco
    ? "inline-flex items-center gap-1 font-medium text-white underline decoration-white/70 underline-offset-2 hover:opacity-85 break-all cursor-pointer"
    : "inline-flex items-center gap-1 font-medium text-brand-600 underline decoration-brand-500/50 underline-offset-2 hover:text-brand-700 hover:decoration-brand-600 dark:text-brand-400 dark:hover:text-brand-300 break-all cursor-pointer";

  // Split por bloques <blockquote>...</blockquote>
  const blockRegex = /(<blockquote>[\s\S]*?<\/blockquote>)/gi;
  const bloques = textoNormalizado.split(blockRegex).filter(Boolean);

  return (
    <div className={className}>
      {bloques.map((b, idx) => {
        const key = `b-${idx}`;
        if (/^<blockquote[ >]/i.test(b)) {
          const contenido = b
            .replace(/^<blockquote[^>]*>/i, "")
            .replace(/<\/blockquote>$/i, "")
            .trim();
          return (
            <blockquote
              key={key}
              className="my-2 rounded-r border-l-2 border-brand-500 bg-black/[0.04] py-1.5 pl-3 pr-2.5 text-sm font-normal leading-relaxed text-inherit dark:border-brand-500/60 dark:bg-white/[0.04]"
            >
              {parsearInline(contenido, key, linkClassName)}
            </blockquote>
          );
        }

        return <span key={key}>{parsearInline(b, key, linkClassName)}</span>;
      })}
    </div>
  );
};
