import { Link } from "react-router";
import { ReactNode } from "react";
import { cn } from "@/utils";

/**
 * Definition of a single breadcrumb step.
 * @kgId 2cf3ec0c1a34
 */
export interface BreadcrumbItem {
  /** Display text for the breadcrumb step */
  label: string;
  /** Navigation target — if omitted, the item is the current page (no link) */
  href?: string;
  /** Optional icon rendered before the label (typically `HomeIcon` for the first item) */
  icon?: ReactNode;
}

/**
 * Visual separator between breadcrumb items.
 *
 * - `"slash"` — Forward slash `/` *(default)*
 * - `"chevron"` — Right-pointing angle `>`
 * - `"dot"` — Small filled circle `·`
 * @kgId a9cc5e82bcd5
 */
export type BreadcrumbSeparator = "slash" | "chevron" | "dot";

/**
 * Props for the **Breadcrumb** component.
 * @kgId 00d66bc0b7f3
 */
export interface BreadcrumbProps {
  /**
   * Ordered list of breadcrumb steps from root to current page.
   * The last item is treated as the current page and rendered
   * without a link.
   *
   * @example
   * ```tsx
   * <Breadcrumb items={[
   *   { label: "Home", href: "/", icon: <HomeIcon /> },
   *   { label: "Users", href: "/users" },
   *   { label: "Profile" },
   * ]} />
   * ```
   */
  items: BreadcrumbItem[];

  /**
   * Visual separator between items.
   *
   * @default `"slash"`
   *
   * @example
   * ```tsx
   * <Breadcrumb items={items} separator="chevron" />
   * ```
   */
  separator?: BreadcrumbSeparator;

  /**
   * Additional CSS classes applied to the outer `<nav>` element.
   */
  className?: string;
}

// Home icon SVG - exported for use in items
/**
 * @kgId 3046f875c3f9
 */
export const HomeIcon = () => (
  <svg
    className="fill-current"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.48994 3.61404C7.79216 3.38738 8.20771 3.38738 8.50993 3.61404L12.3433 6.48904C12.5573 6.64957 12.6833 6.9015 12.6833 7.16904V11.8333C12.6833 12.3028 12.3027 12.6833 11.8333 12.6833H8.64993V10.8333C8.64993 10.4744 8.35892 10.1833 7.99993 10.1833C7.64095 10.1833 7.34993 10.4744 7.34993 10.8333V12.6833H4.1666C3.69716 12.6833 3.3166 12.3028 3.3166 11.8333V7.16904C3.3166 6.9015 3.44257 6.64957 3.6566 6.48904L7.48994 3.61404ZM7.99478 13.9833H4.1666C2.97919 13.9833 2.0166 13.0207 2.0166 11.8333V7.16904C2.0166 6.49231 2.33522 5.85508 2.8766 5.44904L6.70994 2.57404C7.47438 2.00071 8.52549 2.00071 9.28993 2.57404L13.1233 5.44904C13.6647 5.85508 13.9833 6.49232 13.9833 7.16904V11.8333C13.9833 13.0207 13.0207 13.9833 11.8333 13.9833H8.00509C8.00337 13.9833 8.00166 13.9833 7.99993 13.9833C7.99821 13.9833 7.9965 13.9833 7.99478 13.9833Z"
      fill=""
    />
  </svg>
);

const ChevronIcon = () => (
  <svg
    className="stroke-current"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.83333 12.6665L10 8.49984L5.83333 4.33317"
      stroke=""
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DotSeparator = () => (
  <span className="block h-1 w-1 rounded-full bg-gray-400"></span>
);

const SlashSeparator = () => (
  <span className="text-gray-500 dark:text-gray-400">/</span>
);

/**
 * Breadcrumb — Hierarchical navigation trail showing the user's position.
 *
 * Renders an ordered list of navigation steps from root to current
 * page. The last item is always the current page (no link). Helps
 * users understand where they are and navigate back up the hierarchy.
 *
 * @remarks
 * **When to use Breadcrumb vs related components:**
 * - Use `Breadcrumb` to show the user's position in a page hierarchy
 *   (e.g. *Home > Users > Profile*).
 * - Use **Tab** for switching between content sections at the same level.
 * - Use **Pagination** for navigating between pages of a data set.
 * - Use **Link** for standalone navigation elements.
 *
 * **Separator options:**
 * - `"slash"` — Classic `/`, lightweight.
 * - `"chevron"` — Right angle `>`, directional emphasis.
 * - `"dot"` — Small circle `·`, minimal visual weight.
 *
 * **Icons:**
 * - Use `icon` on the first item (typically `HomeIcon`) to reinforce
 *   spatial orientation without extra text.
 *
 * **Semantics:**
 * - Renders inside `<nav>` with `<ol>` for proper a11y structure.
 * - The last item (current page) has no link.
 *
 * **Limitations:**
 * - No `aria-current="page"` on the last item. See `TECH_DEBT.md`.
 * - `HomeIcon` exported from Breadcrumb instead of a centralized
 *   icon package. See `TECH_DEBT.md`.
 * - Coupled to `react-router` for link rendering.
 * - Dynamic route labels (UUIDs instead of names) must be resolved
 *   by the router/app context, not by this component.
 *
 * @example Basic breadcrumb
 * ```tsx
 * <Breadcrumb items={[
 *   { label: "Home", href: "/" },
 *   { label: "Users", href: "/users" },
 *   { label: "Profile" },
 * ]} />
 * ```
 *
 * @example With home icon and chevron separator
 * ```tsx
 * <Breadcrumb
 *   separator="chevron"
 *   items={[
 *     { label: "Home", href: "/", icon: <HomeIcon /> },
 *     { label: "Settings", href: "/settings" },
 *     { label: "Security" },
 *   ]}
 * />
 * ```
 *
 * @see {@link Tab} — For content section switching.
 * @see {@link Pagination} — For data page navigation.
 * @see {@link Link} — For standalone navigation.
 * @kgId 096285bdc720
 */
const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = "slash",
  className,
}) => {
  const gap = separator === "dot" ? "gap-2" : "gap-1.5";

  const renderSeparator = () => {
    switch (separator) {
      case "chevron":
        return (
          <span className="text-gray-500 dark:text-gray-400">
            <ChevronIcon />
          </span>
        );
      case "dot":
        return <DotSeparator />;
      default:
        return <SlashSeparator />;
    }
  };

  return (
    <nav className={className}>
      <ol className={cn("flex flex-wrap items-center", gap)}>
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;
          const isClickable = !!item.href && !isLast;

          if (isClickable) {
            return (
              <li key={index}>
                <Link
                  to={item.href!}
                  className={cn("flex items-center", gap, "text-sm text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400")}
                >
                  {!isFirst && renderSeparator()}
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          }

          return (
            <li
              key={index}
              className={cn("flex items-center", gap, "text-sm text-gray-800 dark:text-white/90")}
            >
              {!isFirst && renderSeparator()}
              {item.icon}
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
