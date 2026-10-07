import { useEffect, useState } from "react";
import { Link } from "@/elements";
import { PageMeta } from "@/shell/meta";
import PublicPageLayout from "../layouts/public/PublicPageLayout";
import { LEGAL_LINKS, type LegalBlock, type LegalDocument } from "./legal.constants";

/** Pinta un bloque del cuerpo según su tipo. */
function Block({ block }: { block: LegalBlock }) {
  if (block.kind === "p") {
    return (
      <p className="text-base sm:text-[17px] leading-relaxed text-gray-700 dark:text-gray-300">
        {block.text}
      </p>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className="space-y-3">
        {block.items.map((item, i) => (
          <li
            key={i}
            className="flex gap-3 text-base sm:text-[17px] leading-relaxed text-gray-700 dark:text-gray-300"
          >
            {/* Punto de viñeta en verde legal #17B363 */}
            <span
              aria-hidden
              className="mt-[9px] h-2 w-2 flex-none rounded-full bg-[#17b363]"
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
        <div key={item.term} className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-6">
          <dt className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {item.term}
          </dt>
          <dd className="text-base sm:text-[17px] leading-relaxed text-gray-700 sm:col-span-2 dark:text-gray-300">
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
      <p className="mb-3.5 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Contenido</p>
      <ul className="space-y-1.5 border-l-2 border-gray-100 dark:border-gray-800">
        {doc.sections.map(section => {
          const isActive = activeId === section.id;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={
                  isActive
                    ? "-ml-[2px] block border-l-2 border-[#17b363] py-1.5 pl-3.5 text-theme-sm font-bold text-[#17b363] dark:text-[#17b363]"
                    : "-ml-[2px] block border-l-2 border-transparent py-1.5 pl-3.5 text-theme-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
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
 */
export default function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <PublicPageLayout
      eyebrow={doc.eyebrow}
      title={doc.title}
      summary={doc.summary}
      contentWidth="wide"
      compactHero
      heroColor="green"
      heroExtra={
        <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-white/80">
          <span>Versión {doc.version}</span>
          <span aria-hidden className="text-white/40">
            ·
          </span>
          <span>En vigor desde el {doc.effectiveDate}</span>
        </p>
      }
    >
      <PageMeta title={`${doc.title} — NECTO`} description={doc.summary} />

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
        <aside className="mb-10 lg:mb-0">
          <SectionIndex doc={doc} />
        </aside>

        <div className="min-w-0 space-y-12">
          {doc.sections.map(section => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="mb-4 text-xl sm:text-2xl font-bold tracking-tight text-ink-title dark:text-white">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.blocks.map((block, i) => (
                  <Block key={i} block={block} />
                ))}
              </div>
            </section>
          ))}

          {/* Ruta cruzada: quien acaba de leer los términos suele querer los
              otros dos. Se derivan del catálogo para que no diverjan. */}
          <div className="border-t border-gray-100 pt-8 dark:border-gray-800">
            <p className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
              Otros documentos legales
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {LEGAL_LINKS.filter(l => l.id !== doc.id).map(link => (
                <Link
                  key={link.id}
                  to={link.to}
                  text={link.label}
                  className="text-base font-semibold text-[#17b363] hover:underline"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  );
}
