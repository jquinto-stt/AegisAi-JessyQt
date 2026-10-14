import { FC, ReactNode } from "react";
import { cn } from "@/utils";

/**
 * Props for the Label component.
 * @kgId 5d642ef267b3
 */
export interface LabelProps {
  /**
   * HTML `for` attribute linking the label to a form field by `id`.
   *
   * When provided, clicking the label focuses the associated input.
   */
  htmlFor?: string;

  /**
   * Label content — typically plain text, but accepts any ReactNode
   * for cases like required-field indicators (`<span>*</span>`).
   */
  children: ReactNode;

  /**
   * Additional CSS classes merged with `cn()`.
   *
   * Useful for overriding spacing, font size, or color.
   *
   * @example
   * ```tsx
   * <Label htmlFor="name" className="text-base">Full Name</Label>
   * ```
   */
  className?: string;
}

/**
 * Label — Accessible form field label.
 *
 * Renders a styled `<label>` element with consistent typography for
 * form fields. Uses `cn()` for class merging, so `className` overrides
 * work correctly with Tailwind.
 *
 * @remarks
 * **When to use Label:**
 * - Pair with every visible form field (`Input`, `Select`, `TextArea`, etc.)
 *   for accessibility — screen readers associate the label with the field
 *   via `htmlFor`
 *
 * **Limitations:**
 * - No `required` indicator built in — add manually via children if needed
 * - No `error` or `disabled` visual states — styling is always neutral
 *
 * @example Basic usage
 * ```tsx
 * <Label htmlFor="email">Email Address</Label>
 * <Input id="email" type="email" />
 * ```
 *
 * @example With required indicator
 * ```tsx
 * <Label htmlFor="name">
 *   Name <span className="text-error-500">*</span>
 * </Label>
 * ```
 *
 * @see {@link Input} — Text input to pair with Label.
 * @see {@link Select} — Dropdown to pair with Label.
 * @see {@link TextArea} — Multi-line input to pair with Label.
 * @kgId f5adba9462d7
 */
const Label: FC<LabelProps> = ({ htmlFor, children, className }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400",
        className
      )}
    >
      {children}
    </label>
  );
};

export default Label;
