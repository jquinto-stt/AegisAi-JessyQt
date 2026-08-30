import React, { useState } from "react";
import { Package } from "lucide-react";

export const SafeImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => {
  const [imgError, setImgError] = useState(false);

  if (imgError || !src) {
    return (
      <div
        className={`bg-slate-100 dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-[#FF3F1A] flex items-center justify-center font-bold text-xs p-2 shrink-0 ${
          className || ""
        }`}
      >
        <Package className="w-4 h-4 opacity-70" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
    />
  );
};
