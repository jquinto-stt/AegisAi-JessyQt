/// <reference types="vite/client" />

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

// vite-plugin-svgr (see vite.config.ts: exportType 'named', namedExport 'ReactComponent').
// Without this the ~60 `import { ReactComponent as X } from "*.svg?react"` calls in
// src/icons/index.ts and src/shell/icons/index.ts fail to resolve for TypeScript,
// even though the SVG files exist and Vite serves them fine at runtime.
declare module "*.svg?react" {
  import type { FC, SVGProps } from "react";
  export const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
