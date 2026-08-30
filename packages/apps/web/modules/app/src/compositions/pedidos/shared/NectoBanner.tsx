import React from "react";
import svgPaths from "@/imports/BannerYFooter/svg-mzezy80iwx";

interface NectoBannerProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const NectoBanner: React.FC<NectoBannerProps> = ({
  title,
  description,
  icon,
}) => {
  return (
    <div className="relative rounded-3xl p-6 sm:p-7 overflow-hidden bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] shadow-xs">
      {/* Official Necto Logo Watermark & Repeating Mosaic */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Prominent Official Necto Logo on the right */}
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-80 sm:w-96 opacity-[0.12] dark:opacity-[0.16] transform rotate-[-4deg]">
          <svg className="w-full h-auto" fill="none" viewBox="0 0 235 50.3601">
            <g id="Group4">
              <path d={svgPaths.p31604a80} fill="#FF3F1A" />
              <path d={svgPaths.p1b22ab80} fill="#190088" />
              <path d={svgPaths.p1aedf600} fill="#FF3F1A" />
              <path d={svgPaths.p204e9500} fill="#FF3F1A" />
              <path d={svgPaths.p14a87f30} fill="#FF3F1A" />
              <path d={svgPaths.pd6f1500} fill="#FF3F1A" />
            </g>
          </svg>
        </div>

        {/* Official Necto Logo Repeating Mosaic Pattern */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-12 gap-y-8 w-full h-full p-4 opacity-[0.06] dark:opacity-[0.10] transform -rotate-6 scale-110">
          {Array.from({ length: 18 }).map((_, idx) => (
            <div key={idx} className="w-24 sm:w-28 flex items-center justify-center">
              <svg className="w-full h-auto" fill="none" viewBox="0 0 235 50.3601">
                <g>
                  <path d={svgPaths.p31604a80} fill={idx % 2 === 0 ? "#FF3F1A" : "#190088"} />
                  <path d={svgPaths.p1b22ab80} fill={idx % 2 === 0 ? "#190088" : "#FF3F1A"} />
                  <path d={svgPaths.p1aedf600} fill={idx % 2 === 0 ? "#FF3F1A" : "#190088"} />
                  <path d={svgPaths.p204e9500} fill={idx % 2 === 0 ? "#FF3F1A" : "#190088"} />
                  <path d={svgPaths.p14a87f30} fill={idx % 2 === 0 ? "#FF3F1A" : "#190088"} />
                  <path d={svgPaths.pd6f1500} fill={idx % 2 === 0 ? "#FF3F1A" : "#190088"} />
                </g>
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Banner Content */}
      <div className="relative z-10 space-y-1 max-w-3xl">
        <h3 className="font-black text-xl sm:text-2xl text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2.5">
          {icon}
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};
