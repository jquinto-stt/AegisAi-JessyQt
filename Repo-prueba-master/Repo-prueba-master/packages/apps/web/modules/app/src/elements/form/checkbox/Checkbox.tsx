import type React from "react";
import { useRef, useEffect } from "react";
import { cn } from "@/utils";

/**
 * Props for the Checkbox component.
 * @kgId c3c9b2baf824
 */
export interface CheckboxProps {
  /**
   * Text label displayed next to the checkbox.
   *
   * When provided, renders a `<span>` to the right of the checkbox input.
   * Omit for standalone checkboxes where the label is handled externally
   * (e.g. inside a table row or custom layout).
   */
  label?: string;

  /**
   * Whether the checkbox is currently checked (controlled).
   *
   * The component is always controlled — the parent must manage this value
   * and update it via `onChange`.
   *
   * @example
   * ```tsx
   * const [agreed, setAgreed] = useState(false);
   * <Checkbox checked={agreed} onChange={setAgreed} label="I agree" />
   * ```
   */
  checked: boolean;

  /**
   * Additional CSS classes applied to the `<input>` element.
   *
   * @default `""`
   */
  className?: string;

  /**
   * HTML `id` attribute for the checkbox input.
   *
   * Useful for associating with an external `<label>` or for test selectors.
   */
  id?: string;

  /**
   * Callback fired when the checked state changes.
   *
   * Receives the new `boolean` value (not the event).
   */
  onChange: (checked: boolean) => void;

  /**
   * Whether the checkbox is disabled.
   *
   * When `true`, the checkbox is non-interactive and visually dimmed.
   *
   * @default `false`
   */
  disabled?: boolean;

  /**
   * HTML `name` attribute for form submission.
   */
  name?: string;

  /**
   * HTML `value` attribute sent with the form when checked.
   */
  value?: string;

  /**
   * Whether the field is required.
   *
   * Maps to the native HTML `required` attribute.
   *
   * @default `false`
   */
  required?: boolean;

  /**
   * Accessible label for screen readers.
   *
   * Use when a visible `label` prop is not present.
   */
  "aria-label"?: string;

  /**
   * Whether the checkbox is in an indeterminate (mixed) state.
   *
   * Visually shows a dash instead of a checkmark. Useful for
   * "select all" checkboxes where some but not all children are checked.
   *
   * @default `false`
   */
  indeterminate?: boolean;
}

/**
 * Checkbox — Binary toggle for selecting or deselecting an option.
 *
 * Renders a styled `<input type="checkbox">` with an optional text label.
 * The component is always controlled — the parent owns the `checked` state
 * and updates it through `onChange`.
 *
 * @remarks
 * **When to use Checkbox vs related components:**
 * - Use `Checkbox` for binary yes/no choices or multi-select lists
 * - Use **Radio** for mutually exclusive single-select within a group
 * - Use **Switch** for toggling a setting on/off with immediate effect
 *
 * **Limitations:**
 * - No `error` visual state — see `TECH_DEBT.md`
 *
 * @example Basic usage
 * ```tsx
 * const [checked, setChecked] = useState(false);
 * <Checkbox
 *   checked={checked}
 *   onChange={setChecked}
 *   label="Accept terms and conditions"
 * />
 * ```
 *
 * @example In a form with name/value
 * ```tsx
 * <Checkbox
 *   checked={isSubscribed}
 *   onChange={setIsSubscribed}
 *   name="newsletter"
 *   value="subscribed"
 *   label="Subscribe to newsletter"
 * />
 * ```
 *
 * @see {@link Radio} — For mutually exclusive single-select choices.
 * @see {@link Switch} — For on/off toggles with immediate visual feedback.
 * @kgId 2320ac34a561
 */
const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  id,
  onChange,
  className = "",
  disabled = false,
  name,
  value,
  required = false,
  "aria-label": ariaLabel,
  indeterminate = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      className={cn("flex items-center space-x-3 group cursor-pointer", disabled && "cursor-not-allowed opacity-60")}
    >
      <div className="relative w-5 h-5">
        <input
          ref={inputRef}
          id={id}
          type="checkbox"
          className={cn(
            "w-5 h-5 appearance-none cursor-pointer dark:border-gray-700 border border-gray-300 checked:border-transparent rounded-md checked:bg-brand-500 disabled:opacity-60",
            indeterminate && "border-transparent bg-brand-500",
            className
          )}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          name={name}
          value={value}
          required={required}
          aria-label={ariaLabel}
        />
        {indeterminate && !checked && (
          <svg
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none top-1/2 left-1/2"
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path d="M3 7H11" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
        {checked && !indeterminate && (
          <svg
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none top-1/2 left-1/2"
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
              stroke="white"
              strokeWidth="1.94437"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {disabled && !checked && !indeterminate && (
          <svg
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none top-1/2 left-1/2"
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
              stroke="#E4E7EC"
              strokeWidth="2.33333"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {label && (
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {label}
        </span>
      )}
    </label>
  );
};

export default Checkbox;
