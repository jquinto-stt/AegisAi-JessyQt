import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/elements/ui/badge";
import { Card } from "@/elements/ui/card";
import { cn } from "@/utils";

type TrendDirection = "up" | "down";
type MetricLayout = "vertical" | "horizontal" | "compact";
type ContentOrder = "title-first" | "value-first";

export interface MetricCardProps {
  icon?: React.ReactNode;
  title: string;
  value: string;
  change?: string;
  trend?: TrendDirection;
  layout?: MetricLayout;
  order?: ContentOrder;
  comparisonText?: string;
  showArrow?: boolean;
  badgeSize?: "xs" | "sm" | "md";
  iconSize?: string;
  iconBgClass?: string;
  valueSize?: string;
  className?: string;
}

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
  badgeSize = "sm",
  iconSize = "w-12 h-12",
  iconBgClass = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90",
  valueSize,
  className,
}: MetricCardProps) {
  const badgeColor = trend === "up" ? "success" : "error";

  const badgeContent = change && trend ? (
    <Badge color={badgeColor} size={badgeSize}>
      {showArrow && (trend === "up" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      {change}
    </Badge>
  ) : null;

  const badgeWithComparison = badgeContent ? (
    <div className="flex items-center gap-1.5">
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
      <Card className={cn("rounded-xl p-5 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs", className)}>
        <div className="flex items-center gap-4">
          {icon && (
            <div className={`flex items-center justify-center rounded-xl flex-none ${iconBgClass} ${iconSize}`}>
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className={`${valueSize || "text-2xl"} font-bold text-gray-800 dark:text-white/90 tracking-tight`}>
              {value}
            </h4>
            {badgeWithComparison ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-theme-xs text-gray-500 dark:text-gray-400 font-medium truncate">{title}</span>
                {badgeWithComparison}
              </div>
            ) : (
              <p className="text-theme-xs text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">{title}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // ── Compact layout (Analytics / CRM style — no icon) ──
  if (layout === "compact") {
    if (order === "value-first") {
      return (
        <Card className={cn("rounded-xl p-5 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs", className)}>
          <h4 className={`font-bold text-gray-800 ${valueSize || "text-2xl"} dark:text-white/90 tracking-tight`}>
            {value}
          </h4>
          <div className="flex items-end justify-between mt-4">
            <p className="text-gray-600 text-theme-xs font-medium dark:text-gray-400">
              {title}
            </p>
            {badgeWithComparison}
          </div>
        </Card>
      );
    }
    return (
      <Card className={cn("rounded-xl p-5 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs", className)}>
        <p className="text-gray-500 text-theme-xs font-medium dark:text-gray-400">
          {title}
        </p>
        <div className="flex items-end justify-between mt-3">
          <h4 className={`${valueSize || "text-2xl"} font-bold text-gray-800 dark:text-white/90 tracking-tight`}>
            {value}
          </h4>
          {badgeWithComparison}
        </div>
      </Card>
    );
  }

  // ── Vertical layout (default — Ecommerce / Marketing style) ──
  return (
    <Card className={cn("rounded-xl p-5 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs", className)}>
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <div className={`flex items-center justify-center rounded-xl flex-none ${iconBgClass} ${iconSize}`}>
            {icon}
          </div>
        )}
        {badgeWithComparison}
      </div>
      <div className="mt-4">
        <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
          {title}
        </span>
        <h4 className={`mt-1 font-bold text-gray-800 ${valueSize || "text-2xl"} dark:text-white/90 tracking-tight`}>
          {value}
        </h4>
        {comparisonText && !badgeWithComparison && (
          <p className="text-theme-xs text-gray-400 mt-1">{comparisonText}</p>
        )}
      </div>
    </Card>
  );
}

export default MetricCard;
