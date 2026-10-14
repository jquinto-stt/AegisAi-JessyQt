import { ReactNode } from "react";
import { cn } from "@/utils";

/**
 * Layout direction of the Card content.
 *
 * - `"vertical"` — Default stacked layout *(default)*
 * - `"horizontal"` — Side-by-side layout on `sm+` breakpoint — image
 *   and content rendered in a flex row
 * @kgId f1dc53d95179
 */
export type CardLayout = "vertical" | "horizontal";

/**
 * Props for the **Card** component.
 * @kgId 2860a35ec65b
 */
export interface CardProps {
  /**
   * Card content — plain elements, or composed with semantic slots
   * (`CardHeader`, `CardBody`, `CardFooter`, `CardTitle`, `CardDescription`).
   *
   * No slot is mandatory — a Card without footer is as valid as one
   * with header + body + footer.
   *
   * @example
   * ```tsx
   * <Card>
   *   <CardTitle>Simple card</CardTitle>
   *   <CardDescription>Just title and description.</CardDescription>
   * </Card>
   * ```
   */
  children?: ReactNode;

  /**
   * Additional CSS classes merged via `cn()`.
   *
   * Use `className="p-0 sm:p-0"` when using slotted layout
   * (`CardHeader` + `CardBody` + `CardFooter`) so each slot
   * controls its own padding.
   *
   * @example
   * ```tsx
   * <Card className="p-0 sm:p-0">
   *   <CardHeader><CardTitle>Title</CardTitle></CardHeader>
   *   <CardBody>Content</CardBody>
   *   <CardFooter>Actions</CardFooter>
   * </Card>
   * ```
   */
  className?: string;

  /**
   * Content direction — `"vertical"` stacks children,
   * `"horizontal"` places them side by side on `sm+`.
   *
   * @default `"vertical"`
   *
   * @example
   * ```tsx
   * <Card layout="horizontal">
   *   <img src="/photo.jpg" alt="" className="rounded-lg w-40" />
   *   <div>
   *     <CardTitle>Horizontal card</CardTitle>
   *     <CardDescription>Image and text side by side.</CardDescription>
   *   </div>
   * </Card>
   * ```
   */
  layout?: CardLayout;
}

/**
 * Card — General-purpose container for grouping related information.
 *
 * The most versatile component in the system. Renders a bordered,
 * rounded panel that can hold any combination of content: text,
 * images, icons, action buttons, or composed semantic slots.
 *
 * @remarks
 * **When to use Card vs related components:**
 * - Use `Card` to group related information visually — profile
 *   sections, dashboard widgets, content previews, form sections.
 * - Use **Modal** when the content needs to block the page and
 *   capture full user attention.
 * - Use **Alert** for status messages that don't need a container.
 *
 * **Composition:**
 * - `CardHeader` — Top zone with bottom divider. For title + actions.
 * - `CardBody` — Main content zone with padding.
 * - `CardFooter` — Bottom zone with top divider. For actions/links.
 * - `CardTitle` — Heading text with three size options via `className`.
 * - `CardDescription` — Secondary text below the title.
 * - No slot is mandatory — mix and match as needed.
 *
 * **Layout:**
 * - `"vertical"` (default) — Standard stacked content.
 * - `"horizontal"` — Image + content side by side on `sm+`.
 *
 * **Limitations:**
 * - Slotted layout requires `className="p-0 sm:p-0"` on Card
 *   to avoid double padding. See `TECH_DEBT.md` (Card slots Fase 2).
 * - `CardTitle.divider` is deprecated — use `CardHeader` instead.
 *
 * @example Simple card
 * ```tsx
 * <Card>
 *   <CardTitle>Dashboard</CardTitle>
 *   <CardDescription>Overview of your metrics.</CardDescription>
 * </Card>
 * ```
 *
 * @example Slotted layout with dividers
 * ```tsx
 * <Card className="p-0 sm:p-0">
 *   <CardHeader><CardTitle>Users</CardTitle></CardHeader>
 *   <CardBody>Table content here</CardBody>
 *   <CardFooter><Pagination totalPages={5} /></CardFooter>
 * </Card>
 * ```
 *
 * @see {@link CardHeader} — Header slot with bottom divider.
 * @see {@link CardBody} — Body/content slot.
 * @see {@link CardFooter} — Footer slot with top divider.
 * @see {@link Modal} — For full-attention overlays.
 * @kgId a98cbc10b9a9
 */
const Card: React.FC<CardProps> = ({ children, className, layout = "vertical" }) => {
  const isHorizontal = layout === "horizontal";

  return (
    <div className={cn(
      "rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]",
      isHorizontal
        ? "flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:gap-6"
        : "p-5 sm:p-6",
      className
    )}>
      {children}
    </div>
  );
};

export default Card;
