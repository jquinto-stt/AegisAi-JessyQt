import { ArrowUpIcon, ArrowDownIcon } from "@/icons";
import { Badge } from "@/elements/ui/badge";
import { Card } from "@/elements/ui/card";
import { cn } from "@/utils";

type TrendDirection = "up" | "down";
type MetricLayout = "vertical" | "horizontal" | "compact";
type ContentOrder = "title-first" | "value-first";

/**
 * @kgId 26c8f330c440
 */
export interface MetricCardProps {
  /** Icon rendered inside the card (optional for compact layout) */
  icon?: React.ReactNode;
  /** Metric label (e.g. "Customers") */
  title: string;
  /** Metric value (e.g. "3,782") */
  value: string;
  /** Percentage change text (e.g. "11.01%") — optional for simple metrics */
  change?: string;
  /** Trend direction — controls badge color and arrow — optional for simple metrics */
  trend?: TrendDirection;
  /** Card layout: vertical (default), horizontal (icon left), compact (no icon) */
  layout?: MetricLayout;
  /** Content order: title-first (default) or value-first (CRM style) */
  order?: ContentOrder;
  /** Comparison text shown after badge (e.g. "Vs last month") */
  comparisonText?: string;
  /** Show arrow icon inside badge (default: true) */
  showArrow?: boolean;
  /** Badge size override */
  badgeSize?: "xs" | "sm" | "md";
  /** Icon container size class override (default: "w-12 h-12") */
  iconSize?: string;
  /** Icon container background class override (default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90") */
  iconBgClass?: string;
  /** Value text size class override (e.g. "text-title-xs", "text-2xl", "text-title-sm") */
  valueSize?: string;
  /** Additional classes passed to the Card wrapper (merged via tailwind-merge) */
  className?: string;
}

/**
 * MetricCard — Atomic card for displaying a single KPI metric.
 *
 * Supports multiple layouts found across TailAdmin dashboards:
 * - vertical (Ecommerce, Marketing): icon top, content below
 * - horizontal (Logistics): icon left, content right
 * - compact (Analytics, CRM): no icon, just title+value+badge
 * @kgId 36c05f2462a5
 */
export function MetricCard({
  icon,
  title,
  value,
  change,
  trend,
  layout = "vertical",
  order = "title-first",
  comparisonText,
  showArrow = true,
  badgeSize = "md",
  iconSize = "w-12 h-12",
  iconBgClass = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90",
  valueSize,
  className,
}: MetricCardProps) {
  const badgeColor = trend === "up" ? "success" : "error";

  const badgeContent = change && trend ? (
    <Badge color={badgeColor} size={badgeSize}>
      {showArrow && (trend === "up" ? <ArrowUpIcon /> : <ArrowDownIcon />)}
      {change}
    </Badge>
  ) : null;

  const badgeWithComparison = badgeContent ? (
    <div className="flex items-center gap-1">
      {badgeContent}
      {comparisonText && (
        <span className="text-gray-500 text-theme-xs dark:text-gray-400">
          {comparisonText}
        </span>
      )}
    </div>
  ) : null;

  // ── Horizontal layout (Logistics / Support style) ──
  if (layout === "horizontal") {
    return (
      <Card className={cn("rounded-2xl", className)}>
        <div className="flex items-center gap-5">
          {icon && (
            <div className={`flex items-center justify-center rounded-xl ${iconBgClass} ${iconSize}`}>
              {icon}
            </div>
          )}
          <div>
            <h4 className={`${valueSize || "text-2xl"} font-semibold text-gray-800 dark:text-white/90`}>
              {value}
            </h4>
            {badgeWithComparison ? (
              <p className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                {title}
                {badgeWithComparison}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // ── Compact layout (Analytics / CRM style — no icon) ──
  if (layout === "compact") {
    if (order === "value-first") {
      // CRM style: value on top, title + badge below
      return (
        <Card className={cn("rounded-2xl md:p-6", className)}>
          <h4 className={`font-bold text-gray-800 ${valueSize || "text-title-sm"} dark:text-white/90`}>
            {value}
          </h4>
          <div className="flex items-end justify-between mt-4 sm:mt-5">
            <p className="text-gray-700 text-theme-sm dark:text-gray-400">
              {title}
            </p>
            {badgeWithComparison}
          </div>
        </Card>
      );
    }
    // Analytics style: title on top, value + badge below
    return (
      <Card className={cn("rounded-2xl", className)}>
        <p className="text-gray-500 text-theme-sm dark:text-gray-400">
          {title}
        </p>
        <div className="flex items-end justify-between mt-3">
          <h4 className={`${valueSize || "text-2xl"} font-bold text-gray-800 dark:text-white/90`}>
            {value}
          </h4>
          {badgeWithComparison}
        </div>
      </Card>
    );
  }

  // ── Vertical layout (default — Ecommerce / Marketing style) ──
  return (
    <Card className={cn("rounded-2xl sm:p-5 md:p-6", className)}>
      {icon && (
        <div className={`flex items-center justify-center rounded-xl ${iconBgClass} ${iconSize}`}>
          {icon}
        </div>
      )}
      <div className={`flex items-end justify-between ${icon ? "mt-5" : "mt-0"}`}>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {title}
          </span>
          <h4 className={`mt-2 font-bold text-gray-800 ${valueSize || "text-title-sm"} dark:text-white/90`}>
            {value}
          </h4>
        </div>
        {badgeWithComparison}
      </div>
    </Card>
  );
}

export default MetricCard;
