import { useEffect, useState } from "react";
import { Link } from "@/elements";
import { PageMeta } from "@/shell/meta";
import PublicPageLayout from "../layouts/public/PublicPageLayout";
import { LEGAL_LINKS, type LegalBlock, type LegalDocument } from "./legal.constants";

/** Pinta un bloque del cuerpo según su tipo. */
function Block({ block }: { block: LegalBlock }) {
  if (block.kind === "p") {
    return (
      <p className="text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {block.text}
      </p>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className="space-y-2.5">
        {block.items.map((item, i) => (
          <li
            key={i}
            className="flex gap-3 text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400"
          >
            {/* Punto de marca: la viñeta por defecto desaparece al usar `flex`. */}
            <span
              aria-hidden
              className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-brand-500"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <dl className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
      {block.items.map(item => (
        <div key={item.term} className="grid gap-1 px-4 py-3.5 sm:grid-cols-3 sm:gap-4">
          <dt className="text-theme-sm font-semibold text-gray-800 dark:text-gray-100">
            {item.term}
          </dt>
          <dd className="text-theme-sm leading-relaxed text-gray-600 sm:col-span-2 dark:text-gray-400">
            {item.description}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Índice lateral. Se genera del documento, no se escribe a mano. */
function SectionIndex({ doc }: { doc: LegalDocument }) {
  const [activeId, setActiveId] = useState<string>(doc.sections[0]?.id ?? "");

  // Resalta la sección visible. `IntersectionObserver` en vez de escuchar el
  // scroll: con el scroll, cada evento obliga a medir todas las secciones.
  useEffect(() => {
    setActiveId(doc.sections[0]?.id ?? "");
    const nodes = doc.sections
      .map(s => document.getElementById(s.id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );
    nodes.forEach(n => observer.observe(n));
    return () => observer.disconnect();
  }, [doc]);

  return (
    <nav aria-label="Índice del documento" className="lg:sticky lg:top-8">
      <p className="mb-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">Contenido</p>
      <ul className="space-y-1 border-l border-gray-200 dark:border-gray-800">
        {doc.sections.map(section => {
          const isActive = activeId === section.id;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={
                  isActive
                    ? "-ml-px block border-l-2 border-brand-500 py-1 pl-3 text-theme-xs font-semibold text-brand-600 dark:text-brand-400"
                    : "-ml-px block border-l-2 border-transparent py-1 pl-3 text-theme-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Vista de un documento legal.
 *
 * Una sola vista para los tres documentos: el contenido entra como dato, así que
 * añadir "Aviso legal" en el futuro es añadir una entrada al catálogo, no un
 * componente nuevo. Con un `.tsx` por documento, cada revisión de copy obligaría
 * a tocar tres archivos con la misma estructura y se acabarían separando.
 *
 * La columna es **estrecha a propósito** (`prose`): un texto legal se lee de
 * arriba abajo, y a todo el ancho de la banda la línea se vuelve incómoda.
 */
export default function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <PublicPageLayout
      eyebrow={doc.eyebrow}
      title={doc.title}
      summary={doc.summary}
      contentWidth="prose"
      compactHero
      heroExtra={
        <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-theme-xs font-medium text-white/75">
          <span>Versión {doc.version}</span>
          <span aria-hidden className="text-white/40">
            ·
          </span>
          <span>En vigor desde el {doc.effectiveDate}</span>
        </p>
      }
    >
      <PageMeta title={`${doc.title} — NECTO`} description={doc.summary} />

      {/*
        El índice es una columna **pegajosa** en escritorio y se apila arriba en
        móvil. El ancho de la columna de texto la decide la columna del apartado
        (`1fr`), no un `max-w` propio: con un `max-w` interno el texto quedaba en
        430 px y la línea se partía demasiado pronto.
      */}
      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <aside className="mb-10 lg:mb-0">
          <SectionIndex doc={doc} />
        </aside>

        <div className="min-w-0 space-y-10">
          {doc.sections.map(section => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="mb-3 text-lg font-bold tracking-tight text-ink-title dark:text-white">
                {section.title}
              </h2>
              <div className="space-y-3.5">
                {section.blocks.map((block, i) => (
                  <Block key={i} block={block} />
                ))}
              </div>
            </section>
          ))}

          {/* Ruta cruzada: quien acaba de leer los términos suele querer los
              otros dos. Se derivan del catálogo para que no diverjan.

              Es el `Link` de Elements, no el de react-router: por dentro
              envuelve al de react-router, así que sigue siendo navegación de
              cliente, y `variant="secondary"` da el `text-brand-500` que antes
              estaba escrito a mano. `text-theme-sm` recupera el tamaño —el
              `Link` base emite `text-sm`—. */}
          <div className="border-t border-gray-100 pt-8 dark:border-gray-800">
            <p className="mb-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              Otros documentos legales
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL_LINKS.filter(l => l.id !== doc.id).map(link => (
                <Link
                  key={link.id}
                  to={link.to}
                  text={link.label}
                  variant="secondary"
                  className="text-theme-sm font-semibold hover:underline"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  );
}
