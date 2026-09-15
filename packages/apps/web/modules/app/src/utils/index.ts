import { ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        // Theme text sizes
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

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}
