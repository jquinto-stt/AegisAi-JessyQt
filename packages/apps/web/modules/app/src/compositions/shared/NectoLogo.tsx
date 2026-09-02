import React from "react";
import svgPaths from "@/imports/BannerYFooter/svg-mzezy80iwx";
import { ChevronLeft } from "lucide-react";

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
            className="fill-[#190088]"
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

export interface NectoSidebarLogoProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export function NectoSidebarLogo({
  isCollapsed,
  onToggle,
  className = "",
}: NectoSidebarLogoProps) {
  return (
    <div
      className={`flex items-center justify-between w-full select-none transition-all duration-150 ${className}`}
    >
      <button
        type="button"
        onClick={isCollapsed ? onToggle : undefined}
        title={isCollapsed ? "Expandir barra lateral" : "Necto"}
        className={`flex items-center gap-1.5 focus:outline-none transition-all text-left group ${
          isCollapsed ? "cursor-pointer mx-auto" : "cursor-default"
        }`}
      >
        {/* Anchor: The 'N' Isotype (Always visible, lead glyph) */}
        <div
          className={`w-8 h-8 flex items-center justify-center flex-none transition-all duration-150 ${
            isCollapsed
              ? "p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-2xs group-hover:border-[#FF3F1A] dark:group-hover:border-[#FF3F1A] group-hover:scale-105 active:scale-95"
              : ""
          }`}
        >
          <svg
            className="block w-full h-full"
            fill="none"
            viewBox="0 0 50 50.3601"
            preserveAspectRatio="xMidYMid meet"
          >
            <g id="NectoIsotypeAnchor">
              <path d={svgPaths.p31604a80} fill="#FF3F1A" />
              <path
                d={svgPaths.p1b22ab80}
                className="fill-[#190088]"
                fill="#190088"
              />
            </g>
          </svg>
        </div>

        {/* The Emerging Letters: E, C, T, O sliding out from the N on expansion */}
        <div
          className={`overflow-hidden flex items-center transition-all duration-200 ease-out ${
            isCollapsed
              ? "max-w-0 opacity-0 -translate-x-3 pointer-events-none"
              : "max-w-[190px] opacity-100 translate-x-0"
          }`}
        >
          {/* Letters E - C - T - O */}
          <div className="relative w-[84px] h-6 flex-none transition-transform duration-200">
            <svg
              className="block w-full h-full"
              fill="none"
              viewBox="50 0 185 50.3601"
              preserveAspectRatio="xMidYMid meet"
            >
              <g id="LettersECTO">
                <path d={svgPaths.p1aedf600} fill="#FF3F1A" />
                <path d={svgPaths.p204e9500} fill="#FF3F1A" />
                <path d={svgPaths.p14a87f30} fill="#FF3F1A" />
                <path d={svgPaths.pd6f1500} fill="#FF3F1A" />
              </g>
            </svg>
          </div>

          {/* Secondary Wordmark Tag */}
          <div className="relative w-11 h-4 ml-1.5 flex-none transition-all duration-200 delay-[50ms]">
            <svg
              className="block w-full h-full"
              fill="none"
              viewBox="0 0 105.906 39.3108"
              preserveAspectRatio="xMidYMid meet"
            >
              <g id="SubBrandTag">
                <path d={svgPaths.p3c6b27c0} className="fill-[#190088] dark:fill-white" />
                <path d={svgPaths.p14f5d000} className="fill-[#190088] dark:fill-white" />
                <path d={svgPaths.p19d15a00} className="fill-[#190088] dark:fill-white" />
                <path d={svgPaths.p13839f00} className="fill-[#190088] dark:fill-white" />
                <path d={svgPaths.p2f3333f0} className="fill-[#190088] dark:fill-white" />
                <path d={svgPaths.p2ad78300} className="fill-[#190088] dark:fill-white" />
                <path d={svgPaths.p4b91f00} className="fill-[#190088] dark:fill-white" />
                <path d={svgPaths.p250f9580} className="fill-[#190088] dark:fill-white" />
                <path d={svgPaths.p80b6880} className="fill-[#190088] dark:fill-white" />
                <path d={svgPaths.p1224d800} className="fill-[#190088] dark:fill-white" />
                <path d={svgPaths.p1ea5d900} className="fill-[#190088] dark:fill-white" />
                <path d={svgPaths.p31032480} className="fill-[#190088] dark:fill-white" />
              </g>
            </svg>
          </div>
        </div>
      </button>

      {/* Collapse Trigger Button (Visible only when sidebar is expanded) */}
      {!isCollapsed && (
        <button
          type="button"
          onClick={onToggle}
          title="Colapsar barra lateral"
          className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-[#EFE6D3] dark:hover:bg-[#37332A] hover:text-[#FF3F1A] dark:hover:text-[#FF3F1A] flex items-center justify-center transition-all cursor-pointer shadow-2xs group flex-none animate-fade-in"
        >
          <ChevronLeft className="w-4 h-4 text-zinc-700 dark:text-zinc-200 group-hover:text-[#FF3F1A] transition-colors" />
        </button>
      )}
    </div>
  );
}
