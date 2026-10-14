import { useState } from "react";
import type { FormFieldProps } from "@/elements/form/common";
import { cn } from "@/utils";

/**
 * A selectable option in the Select dropdown.
 * @kgId d77f49fa3080
 */
export interface SelectOption {
  /** Value submitted with the form or passed to `onChange`. */
  value: string;
  /** Display text shown in the dropdown list. */
  label: string;
}

/**
 * Props for the Select component.
 * @kgId 10f1d9bc15f8
 */
export interface SelectProps extends FormFieldProps {
  /**
   * Array of available options to choose from.
   *
   * @example
   * ```tsx
   * const options = [
   *   { value: "us", label: "United States" },
   *   { value: "uk", label: "United Kingdom" },
   * ];
   * ```
   */
  options: SelectOption[];

  /**
   * Placeholder text shown when no option is selected.
   *
   * Rendered as a disabled `<option>` at the top of the list.
   *
   * @default `"Select an option"`
   */
  placeholder?: string;

  /**
   * Callback fired when the selected value changes.
   *
   * Receives the `value` string of the selected option.
   */
  onChange: (value: string) => void;

  /**
   * Additional CSS classes appended to the `<select>` element.
   *
   * @default `""`
   */
  className?: string;

  /**
   * Initial selected value on mount (uncontrolled).
   *
   * @default `""`
   */
  defaultValue?: string;
}

/**
 * Select — Single-value dropdown selection.
 *
 * Renders a styled native `<select>` with a custom chevron icon.
 * The component manages its own internal state initialized from
 * `defaultValue` (uncontrolled pattern).
 *
 * @remarks
 * **When to use Select vs related components:**
 * - Use `Select` for single-value selection from a predefined list
 * - Use **MultiSelect** for selecting multiple values
 * - Use **Radio** for single-select with all options visible at once
 * - Use **Input** for free-text entry
 *
 * **Limitations:**
 * - No `leadingIcon` / `trailingIcon` addon support — see `TECH_DEBT.md`
 * - Uncontrolled only — no `value` prop for controlled mode
 *
 * @example Basic usage
 * ```tsx
 * <Select
 *   options={[
 *     { value: "sm", label: "Small" },
 *     { value: "md", label: "Medium" },
 *     { value: "lg", label: "Large" },
 *   ]}
 *   onChange={(val) => setSize(val)}
 * />
 * ```
 *
 * @example With default value and name
 * ```tsx
 * <Select
 *   options={countries}
 *   defaultValue="us"
 *   name="country"
 *   placeholder="Choose a country"
 *   onChange={setCountry}
 * />
 * ```
 *
 * @see {@link MultiSelect} — For selecting multiple values.
 * @see {@link Radio} — For single-select with all options visible.
 * @see {@link Label} — Pair with Label for accessible dropdowns.
 * @kgId ac3e943b0623
 */
const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
  disabled = false,
  name,
  error = false,
  success = false,
  hint,
  required = false,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedValue(value);
    onChange(value);
  };

  let selectClasses = `h-11 w-full appearance-none rounded-lg border bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30`;

  if (disabled) {
    selectClasses += ` cursor-not-allowed opacity-50 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700`;
  } else if (error) {
    selectClasses += ` border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:border-error-500 dark:focus:border-error-800`;
  } else if (success) {
    selectClasses += ` border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:border-success-500 dark:focus:border-success-800`;
  } else {
    selectClasses += ` border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800`;
  }

  return (
    <div>
      <div className="relative">
        <select
          className={cn(selectClasses, selectedValue ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-gray-400", className)}
          value={selectedValue}
          onChange={handleChange}
          disabled={disabled}
          name={name}
          required={required}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
        >
          <option
            value=""
            disabled
            className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
          >
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
            >
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="absolute text-gray-700 dark:text-gray-400 right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.79175 8.02075L10.0001 13.2291L15.2084 8.02075"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
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

export default Select;
