import type React from "react";
import { useState } from "react";

/**
 * A selectable option in the MultiSelect dropdown.
 * @kgId d3c1b89ddc3a
 */
export interface MultiSelectOption {
  /** Unique value used for selection tracking and form submission. */
  value: string;
  /** Display text shown in the dropdown list and selected chips. */
  text: string;
}

/**
 * Props for the MultiSelect component.
 * @kgId c06a82dca7cd
 */
export interface MultiSelectProps {
  /**
   * Label text displayed above the dropdown.
   */
  label: string;

  /**
   * Array of available options to choose from.
   *
   * @example
   * ```tsx
   * const options = [
   *   { value: "react", text: "React" },
   *   { value: "vue", text: "Vue" },
   *   { value: "angular", text: "Angular" },
   * ];
   * ```
   */
  options: MultiSelectOption[];

  /**
   * Array of `value` strings that are pre-selected on mount.
   *
   * Only used for the initial render — the component manages its own
   * internal state after that (uncontrolled).
   *
   * @default `[]`
   */
  defaultSelected?: string[];

  /**
   * Callback fired when the selection changes.
   *
   * Receives the full array of currently selected `value` strings.
   */
  onChange?: (selected: string[]) => void;

  /**
   * Whether the dropdown is disabled.
   *
   * When `true`, the dropdown cannot be opened and selections cannot change.
   *
   * @default `false`
   */
  disabled?: boolean;

  /**
   * HTML `name` attribute for form submission.
   */
  name?: string;

  /**
   * Whether to display the error visual state.
   *
   * Applies a red border to the dropdown container.
   *
   * @default `false`
   */
  error?: boolean;

  /**
   * Helper text displayed below the dropdown.
   *
   * Color adapts to the current state: red for `error`, gray for neutral.
   */
  hint?: string;

  /**
   * Accessible label for screen readers.
   */
  "aria-label"?: string;
}

/**
 * MultiSelect — Dropdown that allows selecting multiple options as chips.
 *
 * Renders a custom dropdown with chip-style selected values. Users can
 * toggle options on/off and remove selections via the chip close button.
 * The component is uncontrolled — it manages its own selection state
 * initialized from `defaultSelected`.
 *
 * @remarks
 * **When to use MultiSelect vs related components:**
 * - Use `MultiSelect` for selecting multiple items from a list
 * - Use **Select** for single-value selection from a dropdown
 * - Use **Checkbox** for multi-select with all options visible at once
 *
 * **Limitations:**
 * - No search/filter functionality — see `TECH_DEBT.md`
 * - No keyboard navigation — see `TECH_DEBT.md`
 * - No `role="listbox"` — see `TECH_DEBT.md`
 * - No close on outside click — dropdown stays open until toggled
 * - Uncontrolled only — no `value` prop for controlled mode
 * - No `leadingIcon` / `trailingIcon` addon support — see `TECH_DEBT.md`
 *
 * @example Basic usage
 * ```tsx
 * <MultiSelect
 *   label="Technologies"
 *   options={[
 *     { value: "react", text: "React" },
 *     { value: "vue", text: "Vue" },
 *   ]}
 *   onChange={(selected) => console.log(selected)}
 * />
 * ```
 *
 * @example With default selection
 * ```tsx
 * <MultiSelect
 *   label="Skills"
 *   options={skills}
 *   defaultSelected={["react", "typescript"]}
 *   onChange={setSelectedSkills}
 * />
 * ```
 *
 * @see {@link Select} — For single-value dropdown selection.
 * @see {@link Checkbox} — For multi-select with all options visible.
 * @kgId c3e30217aeeb
 */
const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  defaultSelected = [],
  onChange,
  disabled = false,
  name,
  error = false,
  hint,
  "aria-label": ariaLabel,
}) => {
  const [selectedOptions, setSelectedOptions] =
    useState<string[]>(defaultSelected);
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    if (!disabled) setIsOpen((prev) => !prev);
  };

  const handleSelect = (optionValue: string) => {
    const newSelectedOptions = selectedOptions.includes(optionValue)
      ? selectedOptions.filter((value) => value !== optionValue)
      : [...selectedOptions, optionValue];

    setSelectedOptions(newSelectedOptions);
    onChange?.(newSelectedOptions);
  };

  const removeOption = (value: string) => {
    const newSelectedOptions = selectedOptions.filter((opt) => opt !== value);
    setSelectedOptions(newSelectedOptions);
    onChange?.(newSelectedOptions);
  };

  const selectedValuesText = selectedOptions.map(
    (value) => options.find((option) => option.value === value)?.text || ""
  );

  return (
    <div className="w-full" aria-label={ariaLabel}>
      {name && <input type="hidden" name={name} value={selectedOptions.join(",")} />}
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
        {label}
      </label>

      <div className="relative z-20 inline-block w-full">
        <div className="relative flex flex-col items-center">
          <div onClick={toggleDropdown} className="w-full">
            <div className={`mb-2 flex h-11 rounded-lg border py-1.5 pl-3 pr-3 shadow-theme-xs outline-hidden transition focus:border-brand-300 focus:shadow-focus-ring dark:bg-gray-900 dark:focus:border-brand-300 ${error ? "border-error-500 dark:border-error-500" : "border-gray-300 dark:border-gray-700"}`}>
              <div className="flex flex-wrap flex-auto gap-2">
                {selectedValuesText.length > 0 ? (
                  selectedValuesText.map((text, index) => (
                    <div
                      key={index}
                      className="group flex items-center justify-center rounded-full border-[0.7px] border-transparent bg-gray-100 py-1 pl-2.5 pr-2 text-sm text-gray-800 hover:border-gray-200 dark:bg-gray-800 dark:text-white/90 dark:hover:border-gray-800"
                    >
                      <span className="flex-initial max-w-full">{text}</span>
                      <div className="flex flex-row-reverse flex-auto">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            removeOption(selectedOptions[index]);
                          }}
                          className="pl-2 text-gray-500 cursor-pointer group-hover:text-gray-400 dark:text-gray-400"
                        >
                          <svg
                            className="fill-current"
                            role="button"
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M3.40717 4.46881C3.11428 4.17591 3.11428 3.70104 3.40717 3.40815C3.70006 3.11525 4.17494 3.11525 4.46783 3.40815L6.99943 5.93975L9.53095 3.40822C9.82385 3.11533 10.2987 3.11533 10.5916 3.40822C10.8845 3.70112 10.8845 4.17599 10.5916 4.46888L8.06009 7.00041L10.5916 9.53193C10.8845 9.82482 10.8845 10.2997 10.5916 10.5926C10.2987 10.8855 9.82385 10.8855 9.53095 10.5926L6.99943 8.06107L4.46783 10.5927C4.17494 10.8856 3.70006 10.8856 3.40717 10.5927C3.11428 10.2998 3.11428 9.8249 3.40717 9.53201L5.93877 7.00041L3.40717 4.46881Z"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <input
                    placeholder="Select option"
                    className="w-full h-full p-1 pr-2 text-sm bg-transparent border-0 outline-hidden appearance-none placeholder:text-gray-800 focus:border-0 focus:outline-hidden focus:ring-0 dark:placeholder:text-white/90"
                    readOnly
                    value="Select option"
                  />
                )}
              </div>
              <div className="flex items-center py-1 pl-1 pr-1 w-7">
                <button
                  type="button"
                  onClick={toggleDropdown}
                  className="w-5 h-5 text-gray-700 outline-hidden cursor-pointer focus:outline-hidden dark:text-gray-400"
                >
                  <svg
                    className={`stroke-current ${isOpen ? "rotate-180" : ""}`}
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.79175 7.39551L10.0001 12.6038L15.2084 7.39551"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {isOpen && (
            <div
              className="absolute left-0 z-40 w-full overflow-y-auto bg-white rounded-lg shadow-2xs top-full max-h-select dark:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col">
                {options.map((option, index) => (
                  <div
                    key={index}
                    className={`hover:bg-primary/5 w-full cursor-pointer rounded-t border-b border-gray-200/70 dark:border-white/5`}
                    onClick={() => handleSelect(option.value)}
                  >
                    <div
                      className={`relative flex w-full items-center p-2 pl-2 ${
                        selectedOptions.includes(option.value)
                          ? "bg-primary/10"
                          : ""
                      }`}
                    >
                      <div className="mx-2 leading-6 text-gray-800 dark:text-white/90">
                        {option.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error ? "text-error-500" : "text-gray-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default MultiSelect;
