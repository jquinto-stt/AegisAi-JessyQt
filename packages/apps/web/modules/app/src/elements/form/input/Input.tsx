import type React from "react";
import type { FC } from "react";
import type { FormFieldProps } from "@/elements/form/common";
import { cn } from "@/utils";

/**
 * Props for the Input component.
 * @kgId 1b7c23542432
 */
export interface InputProps extends FormFieldProps {
  /**
   * HTML input type.
   *
   * Accepts standard types like `"text"`, `"email"`, `"password"`, `"number"`,
   * `"date"`, `"time"`, or any valid `<input>` type string.
   *
   * @default `"text"`
   */
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;

  /**
   * HTML `id` attribute for the input element.
   *
   * Used to associate with a `Label` via `htmlFor`.
   */
  id?: string;

  /**
   * Placeholder text shown when the input is empty.
   */
  placeholder?: string;

  /**
   * Current value of the input (controlled).
   */
  value?: string | number;

  /**
   * Callback fired when the input value changes.
   */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  /**
   * Additional CSS classes appended to the `<input>` element.
   *
   * @default `""`
   */
  className?: string;

  /**
   * HTML `min` attribute for number/date inputs.
   */
  min?: string;

  /**
   * HTML `max` attribute for number/date inputs.
   */
  max?: string;

  /**
   * HTML `step` attribute for number inputs.
   */
  step?: number;

  /**
   * Whether the input is read-only.
   *
   * When `true`, the value is visible and selectable but not editable.
   *
   * @default `false`
   */
  readOnly?: boolean;

  /**
   * Maximum number of characters allowed.
   *
   * Maps to the native HTML `maxLength` attribute.
   */
  maxLength?: number;

  /**
   * Hint for the browser's autocomplete behavior.
   *
   * Maps to the native HTML `autocomplete` attribute.
   *
   * @example `"email"` | `"current-password"` | `"off"`
   */
  autoComplete?: string;
}

/**
 * Input — Single-line text input field with validation states.
 *
 * Renders a styled `<input>` with support for `error`, `success`, and
 * `disabled` visual states, plus an optional `hint` message below the field.
 *
 * @remarks
 * **When to use Input vs related components:**
 * - Use `Input` for single-line text, email, password, number, or date entry
 * - Use **TextArea** for multi-line text entry
 * - Use **Select** for choosing from a predefined list of options
 * - Use **DatePicker** for calendar-based date selection with a visual picker
 *
 * **Limitations:**
 * - No `leadingIcon` / `trailingIcon` addon support — see `TECH_DEBT.md`
 * - Does not support `forwardRef`
 *
 * @example Basic usage
 * ```tsx
 * <Input placeholder="Enter your email" type="email" />
 * ```
 *
 * @example With validation state and hint
 * ```tsx
 * <Input
 *   error
 *   hint="This field is required"
 *   placeholder="Username"
 *   value={username}
 *   onChange={(e) => setUsername(e.target.value)}
 * />
 * ```
 *
 * @example With accessibility attributes
 * ```tsx
 * <Input
 *   required
 *   aria-label="Email address"
 *   autoComplete="email"
 *   maxLength={100}
 * />
 * ```
 *
 * @see {@link TextArea} — For multi-line text input.
 * @see {@link Select} — For dropdown selection.
 * @see {@link Label} — Pair with Label for accessible form fields.
 * @see {@link DatePicker} — For calendar-based date selection.
 * @kgId 58c6756ddb23
 */
const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  value,
  onChange,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
  required = false,
  readOnly = false,
  maxLength,
  autoComplete,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}) => {
  const baseClasses = "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

  let stateClasses: string;

  if (disabled) {
    stateClasses = "text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  } else if (error) {
    stateClasses = "border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800";
  } else if (success) {
    stateClasses = "border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:text-success-400 dark:border-success-500 dark:focus:border-success-800";
  } else {
    stateClasses = "bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800";
  }

  const inputClasses = cn(baseClasses, stateClasses, className);

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        className={inputClasses}
      />

      {hint && (
        <p
          className={cn(
            "mt-1.5 text-xs",
            error
              ? "text-error-500"
              : success
              ? "text-success-500"
              : "text-gray-500"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;
