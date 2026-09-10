import React from "react";
import {
  UtensilsCrossed,
  Flame,
  Coffee,
  Store,
  ChefHat,
  Layers,
  Shirt,
  Wrench,
  Pill,
  Laptop,
  Scissors,
  ShoppingBag,
} from "lucide-react";
import { BusinessIconKey } from "../../context/BusinessContext";

export const BusinessIcon: React.FC<{
  iconKey?: BusinessIconKey | string;
  className?: string;
}> = ({ iconKey = "store", className = "w-4 h-4" }) => {
  switch (iconKey) {
    case "shirt":
      return <Shirt className={className} />;
    case "wrench":
      return <Wrench className={className} />;
    case "pill":
      return <Pill className={className} />;
    case "laptop":
      return <Laptop className={className} />;
    case "scissors":
      return <Scissors className={className} />;
    case "shopping-bag":
      return <ShoppingBag className={className} />;
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
