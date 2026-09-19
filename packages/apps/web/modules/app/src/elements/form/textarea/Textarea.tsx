import React from "react";
import type { FormFieldProps } from "@/elements/form/common";
import { cn } from "@/utils";

/**
 * Props for the TextArea component.
 * @kgId 134afb135c59
 */
export interface TextareaProps extends FormFieldProps {
  /**
   * HTML id attribute for DOM and label pairing.
   */
  id?: string;

  /**
   * Placeholder text shown when the textarea is empty.
   *
   * @default `"Enter your message"`
   */
  placeholder?: string;

  /**
   * Number of visible text rows.
   *
   * Maps directly to the HTML `rows` attribute.
   *
   * @default `3`
   */
  rows?: number;

  /**
   * Current value of the textarea (controlled).
   *
   * @default `""`
   */
  value?: string;

  /**
   * Callback fired when the textarea content changes.
   *
   * Receives the new text `string` value (not the event).
   */
  onChange?: (value: string) => void;

  /**
   * Additional CSS classes appended to the `<textarea>` element.
   *
   * @default `""`
   */
  className?: string;

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
}

/**
 * TextArea — Multi-line text input with validation states.
 *
 * Renders a styled `<textarea>` with support for `error`, `success`, and
 * `disabled` visual states, plus an optional `hint` message below the field.
 *
 * @remarks
 * **When to use TextArea vs related components:**
 * - Use `TextArea` for multi-line text entry (comments, descriptions, messages)
 * - Use **Input** for single-line text entry
 *
 * **Limitations:**
 * - No `resize` prop — see `TECH_DEBT.md`
 * - `onChange` receives `string` value, not the native event
 *
 * @example Basic usage
 * ```tsx
 * <TextArea placeholder="Write a comment..." rows={5} />
 * ```
 *
 * @example With error state and hint
 * ```tsx
 * <TextArea
 *   error
 *   hint="Message is required"
 *   value={message}
 *   onChange={setMessage}
 * />
 * ```
 *
 * @see {@link Input} — For single-line text input.
 * @see {@link Label} — Pair with Label for accessible form fields.
 * @kgId 3d7dabccfd4a
 */
const TextArea: React.FC<TextareaProps> = ({
  id,
  placeholder = "Enter your message",
  rows = 3,
  value = "",
  onChange,
  className = "",
  disabled = false,
  error = false,
  success = false,
  hint = "",
  name,
  required = false,
  readOnly = false,
  maxLength,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const baseClasses = "w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden";

  let stateClasses: string;

  if (disabled) {
    stateClasses = "bg-gray-100 opacity-50 text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  } else if (error) {
    stateClasses = "bg-transparent border-gray-300 focus:border-error-300 focus:ring-3 focus:ring-error-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-error-800";
  } else if (success) {
    stateClasses = "bg-transparent border-success-500 focus:border-success-300 focus:ring-3 focus:ring-success-500/20 dark:border-success-500 dark:bg-gray-900 dark:text-success-400 dark:focus:border-success-800";
  } else {
    stateClasses = "bg-transparent text-gray-900 dark:text-gray-300 text-gray-900 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";
  }

  const textareaClasses = cn(baseClasses, stateClasses, className);

  return (
    <div className="relative">
      <textarea
        id={id}
        placeholder={placeholder}
        rows={rows}
        value={value}
        name={name}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        className={textareaClasses}
      />
      {hint && (
        <p
          className={cn(
            "mt-2 text-sm",
            error
              ? "text-error-500"
              : success
              ? "text-success-500"
              : "text-gray-500 dark:text-gray-400"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default TextArea;
