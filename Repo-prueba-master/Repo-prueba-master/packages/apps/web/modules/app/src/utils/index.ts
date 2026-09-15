import { ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Custom tailwind-merge configuration that recognizes theme-specific classes.
 * 
 * @context Why this is needed
 * 
 * The project uses custom CSS theme variables defined in index.css under @theme:
 * - `text-theme-xl` (20px/30px line-height)
 * - `text-theme-sm` (14px/20px line-height)  
 * - `text-theme-xs` (12px/18px line-height)
 * - `text-title-*` variants for headings
 * 
 * Standard tailwind-merge doesn't recognize these as fontSize classes, so when
 * you try to override `text-theme-xl` with `text-base`, both classes remain
 * instead of `text-base` replacing `text-theme-xl`.
 * 
 * This custom merge extends the fontSize classGroup to include our theme classes,
 * enabling proper class conflict resolution.
 * 
 * @example
 * ```tsx
 * // Without custom merge: "text-theme-xl text-base" (both remain - broken)
 * // With custom merge: "text-base" (text-theme-xl removed - correct)
 * cn("text-theme-xl", "text-base") // => "text-base"
 * ```
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        // Theme text sizes (from index.css @theme)
        'text-theme-xl',
        'text-theme-sm', 
        'text-theme-xs',
        // Title sizes
        'text-title-2xl',
        'text-title-xl',
        'text-title-lg',
        'text-title-md',
        'text-title-sm',
      ],
    },
  },
});

/**
 * Utility function to merge class names with Tailwind CSS conflict resolution.
 * 
 * Combines clsx (conditional classes) with tailwind-merge (conflict resolution).
 * Extended to recognize custom theme classes like `text-theme-xl`.
 * 
 * @example Basic usage
 * ```tsx
 * cn("px-4 py-2", "px-6") // => "py-2 px-6"
 * ```
 * 
 * @example With theme classes
 * ```tsx
 * cn("text-theme-xl", "text-base") // => "text-base"
 * cn("text-title-md", "text-lg") // => "text-lg"
 * ```
 * 
 * @example Conditional classes
 * ```tsx
 * cn("base-class", isActive && "active-class", className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}
