import React from "react";
import svgPaths from "@/imports/BannerYFooter/svg-mzezy80iwx";

export interface NectoLogoProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
  inline?: boolean;
}

export function NectoLogo({
  size = "md",
  className = "",
  style,
  inline = false,
}: NectoLogoProps) {
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
                className="necto-logo-e fill-[#190088]"
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
                className="fill-[#190088] dark:fill-white"
              />
              <path
                d={svgPaths.p14f5d000}
                className="fill-[#190088] dark:fill-white"
              />
              <path
                d={svgPaths.p19d15a00}
                className="fill-[#190088] dark:fill-white"
              />
              <path
                d={svgPaths.p13839f00}
                className="fill-[#190088] dark:fill-white"
              />
              <path
                d={svgPaths.p2f3333f0}
                className="fill-[#190088] dark:fill-white"
              />
              <path
                d={svgPaths.p2ad78300}
                className="fill-[#190088] dark:fill-white"
              />
              <path
                d={svgPaths.p4b91f00}
                className="fill-[#190088] dark:fill-white"
              />
              <path
                d={svgPaths.p250f9580}
                className="fill-[#190088] dark:fill-white"
              />
              <path
                d={svgPaths.p80b6880}
                className="fill-[#190088] dark:fill-white"
              />
              <path
                d={svgPaths.p1224d800}
                className="fill-[#190088] dark:fill-white"
              />
              <path
                d={svgPaths.p1ea5d900}
                className="fill-[#190088] dark:fill-white"
              />
              <path
                d={svgPaths.p31032480}
                className="fill-[#190088] dark:fill-white"
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
            className="fill-[#190088] dark:fill-white"
          />
          <path
            d={svgPaths.p14f5d000}
            className="fill-[#190088] dark:fill-white"
          />
          <path
            d={svgPaths.p19d15a00}
            className="fill-[#190088] dark:fill-white"
          />
          <path
            d={svgPaths.p13839f00}
            className="fill-[#190088] dark:fill-white"
          />
          <path
            d={svgPaths.p2f3333f0}
            className="fill-[#190088] dark:fill-white"
          />
          <path
            d={svgPaths.p2ad78300}
            className="fill-[#190088] dark:fill-white"
          />
          <path
            d={svgPaths.p4b91f00}
            className="fill-[#190088] dark:fill-white"
          />
          <path
            d={svgPaths.p250f9580}
            className="fill-[#190088] dark:fill-white"
          />
          <path
            d={svgPaths.p80b6880}
            className="fill-[#190088] dark:fill-white"
          />
          <path
            d={svgPaths.p1224d800}
            className="fill-[#190088] dark:fill-white"
          />
          <path
            d={svgPaths.p1ea5d900}
            className="fill-[#190088] dark:fill-white"
          />
          <path
            d={svgPaths.p31032480}
            className="fill-[#190088] dark:fill-white"
          />
        </g>
        <g id="Group4">
          <path d={svgPaths.p31604a80} fill="#FF3F1A" />
          <path
            d={svgPaths.p1b22ab80}
            className="necto-logo-e fill-[#190088]"
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
