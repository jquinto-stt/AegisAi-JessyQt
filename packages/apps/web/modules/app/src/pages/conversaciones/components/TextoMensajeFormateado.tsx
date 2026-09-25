import React from "react";

interface TextoMensajeFormateadoProps {
  texto: string;
  className?: string;
}

function parsearInline(texto: string, baseKey: string): React.ReactNode[] {
  const inlineRegex = /(<b>[\s\S]*?<\/b>|<strong>[\s\S]*?<\/strong>|<code>[\s\S]*?<\/code>|<i>[\s\S]*?<\/i>|<em>[\s\S]*?<\/em>|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/gi;
  const partes = texto.split(inlineRegex).filter(Boolean);

  return partes.map((t, idx) => {
    const key = `${baseKey}-in-${idx}`;

    // Negrita HTML (<b>...</b> o <strong>...</strong>)
    if (/^<(b|strong)[ >]/i.test(t)) {
      const limpio = t.replace(/<\/?[^>]+(>|$)/g, "");
      return (
        <strong key={key} className="font-semibold text-gray-900 dark:text-white">
          {limpio}
        </strong>
      );
    }
    // Negrita WhatsApp (*texto*)
    if (/^\*[^*\n]+\*$/.test(t)) {
      return (
        <strong key={key} className="font-semibold text-gray-900 dark:text-white">
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
          className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs text-brand-600 dark:bg-white/10 dark:text-brand-400"
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
          className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs text-brand-600 dark:bg-white/10 dark:text-brand-400"
        >
          {t.slice(1, -1)}
        </code>
      );
    }
    // Cursiva HTML (<i> / <em>)
    if (/^<(i|em)[ >]/i.test(t)) {
      const limpio = t.replace(/<\/?[^>]+(>|$)/g, "");
      return (
        <em key={key} className="italic text-gray-700 dark:text-gray-300">
          {limpio}
        </em>
      );
    }
    // Cursiva WhatsApp (_texto_)
    if (/^_[^_\n]+_$/.test(t)) {
      return (
        <em key={key} className="italic text-gray-700 dark:text-gray-300">
          {t.slice(1, -1)}
        </em>
      );
    }

    return <React.Fragment key={key}>{t}</React.Fragment>;
  });
}

export const TextoMensajeFormateado: React.FC<TextoMensajeFormateadoProps> = ({
  texto,
  className = "whitespace-pre-line leading-relaxed",
}) => {
  if (!texto) return null;

  // Split por bloques <blockquote>...</blockquote>
  const blockRegex = /(<blockquote>[\s\S]*?<\/blockquote>)/gi;
  const bloques = texto.split(blockRegex).filter(Boolean);

  return (
    <div className={className}>
      {bloques.map((b, idx) => {
        const key = `b-${idx}`;
        if (/^<blockquote[ >]/i.test(b)) {
          const contenido = b.replace(/^<blockquote[^>]*>/i, "").replace(/<\/blockquote>$/i, "").trim();
          return (
            <blockquote
              key={key}
              className="my-2 rounded-r border-l-2 border-brand-500/60 bg-gray-50/70 py-1.5 pl-3 pr-2.5 text-[13px] font-normal leading-relaxed text-gray-700 dark:border-brand-400/60 dark:bg-white/[0.04] dark:text-gray-300"
            >
              {parsearInline(contenido, key)}
            </blockquote>
          );
        }

        return <span key={key}>{parsearInline(b, key)}</span>;
      })}
    </div>
  );
};
