import { cn } from "@/utils";

interface StarRatingProps {
  value: number;       // 0-5 (can be fractional for averages)
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

const sizeMap = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-7 w-7" };

const Star = ({ fill, className }: { fill: "full" | "half" | "empty"; className: string }) => {
  if (fill === "half") {
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <defs>
          <linearGradient id="half-star">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path
          fill="url(#half-star)"
          stroke="currentColor"
          strokeWidth={1.2}
          d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8l-5.8 3.1 1.1-6.5L2.6 9.8l6.5-.9L12 2.5z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill={fill === "full" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.2}>
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8l-5.8 3.1 1.1-6.5L2.6 9.8l6.5-.9L12 2.5z" />
    </svg>
  );
};

/**
 * StarRating — Read-only 1-5 star display (supports fractional averages).
 */
export const StarRating = ({ value, size = "md", showValue = false }: StarRatingProps) => {
  const cls = sizeMap[size];
  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex text-warning-400">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = value >= i ? "full" : value >= i - 0.5 ? "half" : "empty";
          return <Star key={i} fill={fill} className={cls} />;
        })}
      </div>
      {showValue && (
        <span className={cn("font-semibold text-gray-700 dark:text-gray-200", size === "lg" ? "text-lg" : "text-sm")}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default StarRating;
