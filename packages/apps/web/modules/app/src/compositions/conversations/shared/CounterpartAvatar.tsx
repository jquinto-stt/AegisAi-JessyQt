import { cn } from "@/utils";

/**
 * Avatar de un interlocutor del canal.
 *
 * ── Por qué iniciales y no una foto ─────────────────────────────────────────
 *
 * En `wacrm-main` el avatar era `avatar_url` **o** iniciales, con la imagen
 * mandando. Aquí sólo hay iniciales, y es una decisión de alcance, no una
 * carencia: cargar una foto implica una URL, y una URL implica un archivo que en
 * esta fase no existe (§8). Prometer una imagen que no se puede resolver dejaría
 * un hueco roto en cada fila.
 *
 * Las iniciales se **reciben ya resueltas** (`counterpart.initials`) en lugar de
 * calcularse aquí desde el nombre: cuando el nombre es un teléfono no hay
 * iniciales que sacar, y ese caso ya se resolvió al construir el hilo.
 *
 * ⚠️ Es un `<div>` y no un `<img>`: sin imagen real, una etiqueta `img` con un
 * `src` inventado sería una petición fallida por cada fila de la lista.
 */
export interface CounterpartAvatarProps {
  initials: string;
  /** Tamaño en píxeles del lado. La lista usa 40 y el encabezado 36. */
  size?: number;
  /** Variante: `neutral` para la lista, `whatsapp` para el encabezado del hilo. */
  tone?: "neutral" | "brand";
  className?: string;
}

export function CounterpartAvatar({
  initials,
  size = 40,
  tone = "neutral",
  className,
}: CounterpartAvatarProps) {
  const toneClasses =
    tone === "brand"
      ? "bg-[#EFE6D3] text-[#190088] dark:bg-white/10 dark:text-[#97D6DF] font-bold"
      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 font-semibold";

  return (
    <span
      data-conversation-avatar
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cn(
        "flex flex-none items-center justify-center rounded-full font-medium select-none",
        toneClasses,
        className
      )}
    >
      {initials}
    </span>
  );
}

export default CounterpartAvatar;
