import type { ReactNode } from "react";
import { cn } from "@/utils";

// ═══════════════════════════════════════════════════════════════════════════
// Shared icon
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default box icon for ButtonsGroup demos.
 * @kgId 442fc21fab71
 */
export const BoxIcon = () => (
  <svg
    className="fill-current"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.77644 3.24175C9.9172 3.17137 10.0829 3.17137 10.2236 3.24175L15.3708 5.81524L10.3354 8.33283C10.1243 8.43839 9.87577 8.43839 9.66463 8.33283L4.62931 5.81524L9.77644 3.24175ZM3.70215 7.02871V13.412C3.70215 13.6013 3.80915 13.7745 3.97855 13.8592L9.24968 16.4947L9.24967 9.78321C9.16279 9.75247 9.07733 9.71623 8.99383 9.67447L3.70215 7.02871ZM10.7497 16.495V9.78347C10.8368 9.75267 10.9225 9.71634 11.0062 9.67447L16.2979 7.02871V13.412C16.2979 13.6013 16.1909 13.7745 16.0215 13.8592L10.7497 16.495ZM9.41414 17.4826L9.10563 18.0997C9.66867 18.3812 10.3314 18.3812 10.8944 18.0997L16.6923 15.2008C17.3699 14.862 17.7979 14.1695 17.7979 13.412V6.58782C17.7979 5.83027 17.3699 5.13774 16.6923 4.79896L10.8944 1.9001C10.3314 1.61859 9.66868 1.61859 9.10563 1.9001L9.44103 2.57092L9.10563 1.9001L3.30774 4.79896C2.63016 5.13774 2.20215 5.83027 2.20215 6.58782V13.412C2.20215 14.1695 2.63016 14.862 3.30774 15.2008L9.10563 18.0997L9.41414 17.4826Z"
      fill=""
    />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Visual style of the ButtonsGroup.
 *
 * - `"primary"` — Brand-colored first button, brand-outlined rest *(default)*
 * - `"secondary"` — All buttons with neutral gray outline, lower visual weight
 * @kgId ddd3c90f8b8b
 */
export type ButtonsGroupVariant = "primary" | "secondary";

/**
 * Position of the optional icon relative to the button text.
 *
 * - `"left"` — Icon before text *(default)*
 * - `"right"` — Icon after text
 * @kgId 0b66ce3b8060
 */
export type ButtonsGroupIconPosition = "left" | "right";

/**
 * Definition of a single button within the group.
 * @kgId ed98a77c9449
 */
export interface ButtonsGroupItem {
  /** Button label text */
  label: string;
  /** Callback fired when the button is clicked */
  onClick?: () => void;
}

/**
 * Props for the **ButtonsGroup** component.
 * @kgId 7dabd6aba1a6
 */
export interface ButtonsGroupProps {
  /**
   * Visual style — `"primary"` for brand-colored emphasis,
   * `"secondary"` for neutral gray when the group shouldn't
   * compete with a primary action.
   *
   * @default `"primary"`
   */
  variant?: ButtonsGroupVariant;

  /**
   * Optional icon rendered in each button to reinforce quick scanning.
   *
   * @example
   * ```tsx
   * <ButtonsGroup icon={<BoxIcon />} />
   * ```
   */
  icon?: ReactNode;

  /**
   * Position of the icon relative to the button text.
   *
   * @default `"left"`
   */
  iconPosition?: ButtonsGroupIconPosition;

  /**
   * Array of button definitions. When omitted, renders 3 demo buttons
   * with "Button Text" labels for backward compatibility.
   *
   * @example
   * ```tsx
   * <ButtonsGroup items={[
   *   { label: "Day", onClick: () => setView("day") },
   *   { label: "Week", onClick: () => setView("week") },
   *   { label: "Month", onClick: () => setView("month") },
   * ]} />
   * ```
   */
  items?: ButtonsGroupItem[];

  /**
   * Additional CSS classes applied to the outer container.
   */
  className?: string;
}

const DEFAULT_ITEMS: ButtonsGroupItem[] = [
  { label: "Button Text" },
  { label: "Button Text" },
  { label: "Button Text" },
];

// ═══════════════════════════════════════════════════════════════════════════
// ButtonsGroup component
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ButtonsGroup — Visually fused group of buttons forming a segmented control.
 *
 * Groups two or more buttons as a cohesive unit with merged borders,
 * reading as a single segmented control. Accepts custom `items` via props
 * for full reusability.
 *
 * @remarks
 * **When to use ButtonsGroup vs related components:**
 * - Use `ButtonsGroup` for actions or filters where the user picks
 *   one option from a fixed set (e.g. view mode, sort direction).
 * - Use **Tab** for switching between content panels — Tabs switch
 *   views, ButtonsGroup executes actions or applies filters.
 * - Use **Button** for standalone individual actions.
 * - Use **Dropdown** when there are too many options for inline display.
 *
 * **Variant guide:**
 * - `"primary"` — First button is solid brand, rest are outlined brand.
 * - `"secondary"` — All buttons neutral gray.
 *
 * **Limitations:**
 * - Does not use `cn()`.
 *
 * @example Primary group with custom items
 * ```tsx
 * <ButtonsGroup items={[
 *   { label: "Day" },
 *   { label: "Week" },
 *   { label: "Month" },
 * ]} />
 * ```
 *
 * @example Secondary with left icons
 * ```tsx
 * <ButtonsGroup variant="secondary" icon={<BoxIcon />} iconPosition="left" />
 * ```
 *
 * @see {@link Tab} — For content panel switching (different semantics).
 * @see {@link Button} — For standalone actions.
 * @see {@link Dropdown} — For many options in a menu.
 * @kgId ef50e24c71cc
 */
export function ButtonsGroup({
  variant = "primary",
  icon,
  iconPosition = "left",
  items,
  className,
}: ButtonsGroupProps) {
  const buttonItems = items ?? DEFAULT_ITEMS;
  const hasIcon = !!icon;
  const minWidth = hasIcon ? "min-w-[393px]" : "min-w-[309px]";
  const scrollPb = hasIcon ? "sm:pb-0" : "xsm:pb-0";

  if (variant === "primary") {
    const firstBtnClass = "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-white transition bg-brand-500 ring-1 ring-inset ring-brand-500 first:rounded-l-lg last:rounded-r-lg hover:bg-brand-500";
    const otherBtnClass = "inline-flex items-center gap-2 px-4 py-3 -ml-px text-sm font-medium bg-transparent text-brand-500 ring-1 ring-inset ring-brand-500 first:rounded-l-lg last:rounded-r-lg hover:bg-brand-500 hover:text-white";

    const renderContent = (text: string) => {
      if (!hasIcon) return text;
      return iconPosition === "left" ? <>{icon} {text}</> : <>{text} {icon}</>;
    };

    return (
      <div className={cn("max-w-full pb-3 overflow-x-auto custom-scrollbar", scrollPb, className)}>
        <div className={minWidth}>
          <div className="inline-flex items-center shadow-theme-xs">
            {buttonItems.map((item, i) => (
              <button
                key={i}
                type="button"
                className={i === 0 ? firstBtnClass : otherBtnClass}
                onClick={item.onClick}
              >
                {renderContent(item.label)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // variant === "secondary"
  const firstBtnClass = "inline-flex items-center gap-2 bg-transparent px-4 py-3 text-sm font-medium text-gray-800 ring-1 ring-inset ring-gray-300 transition first:rounded-l-lg last:rounded-r-lg hover:bg-gray-50 dark:bg-white/[0.03] dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-white/[0.03]";
  const otherBtnClass = "-ml-px inline-flex items-center gap-2 bg-transparent px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition first:rounded-l-lg last:rounded-r-lg hover:bg-gray-50 hover:text-gray-800 dark:bg-transparent dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]";

  const renderIcon = () => {
    if (!hasIcon) return null;
    return <span className="fill-gray-800 dark:fill-gray-200">{icon}</span>;
  };

  const renderContent = (text: string, isFirst: boolean) => {
    if (!hasIcon) return text;
    const iconEl = isFirst ? icon : renderIcon();
    const wrappedIcon = isFirst ? <span className="fill-gray-800 dark:fill-gray-200">{iconEl}</span> : iconEl;
    return iconPosition === "left" ? <>{wrappedIcon} {text}</> : <>{text} {wrappedIcon}</>;
  };

  return (
    <div className={cn("max-w-full pb-3 overflow-x-auto custom-scrollbar", scrollPb, className)}>
      <div className={minWidth}>
        <div className="inline-flex items-center shadow-theme-xs">
          {buttonItems.map((item, i) => (
            <button
              key={i}
              type="button"
              className={i === 0 ? firstBtnClass : otherBtnClass}
              onClick={item.onClick}
            >
              {renderContent(item.label, i === 0)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ButtonsGroup;
