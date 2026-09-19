import { Link } from "react-router";
import { cn } from "@/utils";
import { LEGAL_LINKS } from "./legal.constants";

/**
 * Enlaces legales reutilizables.
 *
 * Se derivan de `LEGAL_LINKS` para que la ruta y el rótulo no puedan divergir:
 * declararlos a mano en cada sitio es justo lo que hacía que el registro tuviera
 * textos de "Términos" que no llevaban a ninguna parte.
 *
 * ⚠️ El **tono** es una prop y no una clase que pase quien llama, porque el
 * contraste es una propiedad del enlace y no del sitio: los mismos enlaces se
 * pintan sobre el pie claro de las páginas públicas y sobre la barra índigo del
 * pie de la aplicación. Con las clases en el llamante, el segundo caso repite a
 * mano los colores y basta olvidar el `hover` para dejar un enlace ilegible.
 */
export function LegalFooterLinks({
  className,
  tone = "muted",
}: {
  className?: string;
  /** `"muted"` sobre fondo claro · `"onDark"` sobre la barra índigo del pie. */
  tone?: "muted" | "onDark";
}) {
  return (
    <nav
      aria-label="Enlaces legales"
      className={cn("flex flex-wrap items-center gap-x-5 gap-y-2", className)}
    >
      {LEGAL_LINKS.map(link => (
        <Link
          key={link.id}
          to={link.to}
          className={cn(
            "text-theme-xs font-medium transition-colors",
            tone === "onDark"
              ? "text-white/80 hover:text-white"
              : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
