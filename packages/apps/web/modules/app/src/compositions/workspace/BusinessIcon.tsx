import React from "react";
import { UtensilsCrossed, Flame, Coffee, Store, ChefHat, Layers } from "lucide-react";
import { BusinessIconKey } from "../../context/BusinessContext";

export const BusinessIcon: React.FC<{
  iconKey?: BusinessIconKey | string;
  className?: string;
}> = ({ iconKey = "utensils", className = "w-4 h-4" }) => {
  switch (iconKey) {
    case "flame":
      return <Flame className={className} />;
    case "coffee":
      return <Coffee className={className} />;
    case "store":
      return <Store className={className} />;
    case "chef":
      return <ChefHat className={className} />;
    case "layers":
      return <Layers className={className} />;
    case "utensils":
    default:
      return <UtensilsCrossed className={className} />;
  }
};
