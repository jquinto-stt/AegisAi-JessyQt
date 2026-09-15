import React from "react";
import svgPaths from "@/imports/BannerYFooter/svg-mzezy80iwx";

export interface NectoLogoProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
  inline?: boolean;
  iconOnly?: boolean;
}

export interface NectoIsotypeProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  style?: React.CSSProperties;
}

export function NectoIsotype({
  size = "md",
  className = "",
  style,
}: NectoIsotypeProps) {
  const dims = {
    xs: "w-5 h-5",
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
  }[size];

  return (
    <div className={`relative ${dims} select-none flex-none ${className}`} style={style}>
      <svg
        className="block w-full h-full"
        fill="none"
        viewBox="0 0 50 50.3601"
        preserveAspectRatio="xMidYMid meet"
      >
        <g id="NectoIsotype">
          <path d={svgPaths.p31604a80} fill="#FF3F1A" />
          <path
            d={svgPaths.p1b22ab80}
            className="fill-secondary-600"
            fill="#190088"
          />
        </g>
      </svg>
    </div>
  );
}

export function NectoLogo({
  size = "md",
  className = "",
  style,
  inline = false,
  iconOnly = false,
}: NectoLogoProps) {
  if (iconOnly) {
    return <NectoIsotype size={size} className={className} style={style} />;
  }

  if (inline) {
    const mainWidths = { xs: "w-20", sm: "w-24", md: "w-32", lg: "w-40" };
    const subWidths = { xs: "w-12", sm: "w-14", md: "w-18", lg: "w-22" };

    return (
      <div
        className={`inline-flex items-center gap-2 select-none ${className}`}
        style={style}
      >
        <div className={`relative ${mainWidths[size]} flex-none`}>
          <svg
            className="block w-full h-auto"
            fill="none"
            viewBox="0 0 235 50.3601"
            preserveAspectRatio="xMidYMid meet"
          >
            <g id="Group4">
              <path d={svgPaths.p31604a80} fill="#FF3F1A" />
              <path
                d={svgPaths.p1b22ab80}
                className="necto-logo-e fill-secondary-600"
                fill="#190088"
              />
              <path d={svgPaths.p1aedf600} fill="#FF3F1A" />
              <path d={svgPaths.p204e9500} fill="#FF3F1A" />
              <path d={svgPaths.p14a87f30} fill="#FF3F1A" />
              <path d={svgPaths.pd6f1500} fill="#FF3F1A" />
            </g>
          </svg>
        </div>
        <div className={`relative ${subWidths[size]} flex-none`}>
          <svg
            className="block w-full h-auto"
            fill="none"
            viewBox="0 0 105.906 39.3108"
            preserveAspectRatio="xMidYMid meet"
          >
            <g id="Group3">
              <path
                d={svgPaths.p3c6b27c0}
                className="fill-secondary-600 dark:fill-white"
              />
              <path
                d={svgPaths.p14f5d000}
                className="fill-secondary-600 dark:fill-white"
              />
              <path
                d={svgPaths.p19d15a00}
                className="fill-secondary-600 dark:fill-white"
              />
              <path
                d={svgPaths.p13839f00}
                className="fill-secondary-600 dark:fill-white"
              />
              <path
                d={svgPaths.p2f3333f0}
                className="fill-secondary-600 dark:fill-white"
              />
              <path
                d={svgPaths.p2ad78300}
                className="fill-secondary-600 dark:fill-white"
              />
              <path
                d={svgPaths.p4b91f00}
                className="fill-secondary-600 dark:fill-white"
              />
              <path
                d={svgPaths.p250f9580}
                className="fill-secondary-600 dark:fill-white"
              />
              <path
                d={svgPaths.p80b6880}
                className="fill-secondary-600 dark:fill-white"
              />
              <path
                d={svgPaths.p1224d800}
                className="fill-secondary-600 dark:fill-white"
              />
              <path
                d={svgPaths.p1ea5d900}
                className="fill-secondary-600 dark:fill-white"
              />
              <path
                d={svgPaths.p31032480}
                className="fill-secondary-600 dark:fill-white"
              />
            </g>
          </svg>
        </div>
      </div>
    );
  }

  const dims = {
    xs: "w-24 h-10",
    sm: "w-32 h-14",
    md: "w-44 h-18",
    lg: "w-56 h-24",
  }[size];

  return (
    <div className={`relative ${dims} select-none ${className}`} style={style}>
      <svg
        className="block w-full h-full"
        fill="none"
        viewBox="0 0 235 97"
        preserveAspectRatio="xMidYMid meet"
      >
        <g id="Group3">
          <path
            d={svgPaths.p3c6b27c0}
            className="fill-secondary-600 dark:fill-white"
          />
          <path
            d={svgPaths.p14f5d000}
            className="fill-secondary-600 dark:fill-white"
          />
          <path
            d={svgPaths.p19d15a00}
            className="fill-secondary-600 dark:fill-white"
          />
          <path
            d={svgPaths.p13839f00}
            className="fill-secondary-600 dark:fill-white"
          />
          <path
            d={svgPaths.p2f3333f0}
            className="fill-secondary-600 dark:fill-white"
          />
          <path
            d={svgPaths.p2ad78300}
            className="fill-secondary-600 dark:fill-white"
          />
          <path
            d={svgPaths.p4b91f00}
            className="fill-secondary-600 dark:fill-white"
          />
          <path
            d={svgPaths.p250f9580}
            className="fill-secondary-600 dark:fill-white"
          />
          <path
            d={svgPaths.p80b6880}
            className="fill-secondary-600 dark:fill-white"
          />
          <path
            d={svgPaths.p1224d800}
            className="fill-secondary-600 dark:fill-white"
          />
          <path
            d={svgPaths.p1ea5d900}
            className="fill-secondary-600 dark:fill-white"
          />
          <path
            d={svgPaths.p31032480}
            className="fill-secondary-600 dark:fill-white"
          />
        </g>
        <g id="Group4">
          <path d={svgPaths.p31604a80} fill="#FF3F1A" />
          <path
            d={svgPaths.p1b22ab80}
            className="necto-logo-e fill-secondary-600"
            fill="#190088"
          />
          <path d={svgPaths.p1aedf600} fill="#FF3F1A" />
          <path d={svgPaths.p204e9500} fill="#FF3F1A" />
          <path d={svgPaths.p14a87f30} fill="#FF3F1A" />
          <path d={svgPaths.pd6f1500} fill="#FF3F1A" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Shell wordmark — the static "NECTO + grow together" lockup.
 *
 * Why an <img> pair instead of the inline `NectoLogo`: the shell pins this to an
 * exact `h-6` box, and the inline variant's fixed width steps (w-24 + w-14)
 * render ~160×21 rather than the file's own 161×23 ratio.
 *
 * Why two files: `necto-full.svg` hardcodes indigo (#190088) for the "E" of
 * NECTO and for the whole sub-brand, so on a dark surface half the lockup is
 * invisible. `necto-full-dark.svg` is the same artwork with those 13 fills in
 * white. CSS cannot restyle the inside of an <img>, so the swap is done with
 * `dark:hidden` / `dark:block` — the box stays byte-identical in both themes.
 */
export function NectoSidebarWordmark({ className = "" }: { className?: string }) {
  return (
    <>
      <img
        src="/images/logo/necto-full.svg"
        alt="NECTO"
        className={`h-6 w-auto select-none dark:hidden ${className}`}
      />
      <img
        src="/images/logo/necto-full-dark.svg"
        alt="NECTO"
        className={`hidden h-6 w-auto select-none dark:block ${className}`}
      />
    </>
  );
}
