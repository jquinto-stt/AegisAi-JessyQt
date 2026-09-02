import React from "react";
import svgPaths from "@/imports/BannerYFooter/svg-mzezy80iwx";
import { useBusiness } from "@/context/BusinessContext";

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
  const { activeBusiness } = useBusiness();
  const customBanner = activeBusiness?.bannerUrl;

  return (
    <div className="relative rounded-3xl p-6 sm:p-7 overflow-hidden bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 shadow-2xs">
      {customBanner ? (
        /* Custom Business Banner Background without milky haze */
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <img
            src={customBanner}
            alt={activeBusiness.name}
            style={{
              transform: activeBusiness.bannerTransform
                ? `rotate(${activeBusiness.bannerTransform.rotate || 0}deg) scale(${activeBusiness.bannerTransform.scale || 1}) translate(${activeBusiness.bannerTransform.posX || 0}%, ${activeBusiness.bannerTransform.posY || 0}%)`
                : undefined,
            }}
            className="w-full h-full object-cover"
          />
          {/* Subtle dark gradient on the left only to guarantee text contrast without washing out the image */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
        </div>
      ) : (
        /* Default Official Necto Watermark */
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* Prominent Official Necto Logo on the right */}
          <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-80 sm:w-96 opacity-[0.07] dark:opacity-[0.12] transform rotate-[-4deg]">
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

          {/* Clean Geometric Accents */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-12 gap-y-8 w-full h-full p-4 opacity-[0.03] dark:opacity-[0.06] transform -rotate-6 scale-110">
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
      )}

      {/* Banner Content */}
      <div className="relative z-10 space-y-1 max-w-3xl">
        <h3
          className={`font-black text-xl sm:text-2xl tracking-tight flex items-center gap-2.5 ${
            customBanner
              ? "text-white drop-shadow-sm"
              : "text-zinc-900 dark:text-zinc-50"
          }`}
        >
          {icon}
          {title}
        </h3>
        <p
          className={`text-xs sm:text-sm leading-relaxed font-medium ${
            customBanner
              ? "text-zinc-100 drop-shadow-xs"
              : "text-zinc-600 dark:text-zinc-300"
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  );
};
