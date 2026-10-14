import { useState } from "react";

/**
 * Country code entry for the PhoneInput country selector.
 * @kgId 5aa3ddf4f997
 */
export interface CountryCode {
  /** ISO country code used as the `<option>` value (e.g. `"US"`, `"GB"`). */
  code: string;
  /** Dial prefix displayed and prepended to the phone number (e.g. `"+1"`, `"+44"`). */
  label: string;
}

/**
 * Position of the country code selector relative to the input.
 *
 * - `"start"` — Country selector on the left side of the input
 * - `"end"` — Country selector on the right side of the input
 * @kgId eb2358a94e4b
 */
export type PhoneInputSelectPosition = "start" | "end";

/**
 * Props for the PhoneInput component.
 * @kgId 42974b8e5ee7
 */
export interface PhoneInputProps {
  /**
   * Array of available country codes for the selector dropdown.
   */
  countries: CountryCode[];

  /**
   * Placeholder text for the phone number input.
   *
   * @default `"+1 (555) 000-0000"`
   */
  placeholder?: string;

  /**
   * Callback fired when the phone number changes (including country code changes).
   *
   * Receives the full phone number string including the dial prefix.
   */
  onChange?: (phoneNumber: string) => void;

  /**
   * Position of the country code `<select>` relative to the input field.
   *
   * @default `"start"`
   */
  selectPosition?: PhoneInputSelectPosition;

  /**
   * Whether the input is disabled.
   *
   * When `true`, the input and country selector are non-interactive.
   *
   * @default `false`
   */
  disabled?: boolean;

  /**
   * Whether to display the error visual state.
   *
   * Applies a red border to the input.
   *
   * @default `false`
   */
  error?: boolean;

  /**
   * HTML `name` attribute for form submission.
   */
  name?: string;

  /**
   * Helper text displayed below the input.
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
 * PhoneInput — Phone number input with country code selector.
 *
 * Renders a text input for phone numbers with an integrated country code
 * dropdown. The country selector can be positioned at the start or end
 * of the input. Changing the country automatically updates the dial prefix.
 *
 * @remarks
 * **When to use PhoneInput:**
 * - Use `PhoneInput` for international phone number entry with country selection
 * - Use **Input** with `type="tel"` for simple phone entry without country codes
 *
 * **Limitations:**
 * - Monolithic component — does not reuse `Input` or `Select` internally — see `TECH_DEBT.md`
 * - No `value` (controlled) — internal state manages country and phone number
 * - No phone number formatting or validation
 *
 * @example Basic usage
 * ```tsx
 * <PhoneInput
 *   countries={[
 *     { code: "US", label: "+1" },
 *     { code: "GB", label: "+44" },
 *   ]}
 *   onChange={(phone) => setPhone(phone)}
 * />
 * ```
 *
 * @example Selector at end
 * ```tsx
 * <PhoneInput
 *   countries={countries}
 *   selectPosition="end"
 *   placeholder="Enter phone number"
 * />
 * ```
 *
 * @see {@link Input} — For simple text/tel inputs without country selection.
 * @see {@link Select} — For standalone dropdown selection.
 * @kgId ca657bcd73af
 */
const PhoneInput: React.FC<PhoneInputProps> = ({
  countries,
  placeholder = "+1 (555) 000-0000",
  onChange,
  selectPosition = "start",
  disabled = false,
  error = false,
  name,
  hint,
  "aria-label": ariaLabel,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>("US");
  const [phoneNumber, setPhoneNumber] = useState<string>("+1");

  const countryCodes: Record<string, string> = countries.reduce(
    (acc, { code, label }) => ({ ...acc, [code]: label }),
    {}
  );

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value;
    setSelectedCountry(newCountry);
    setPhoneNumber(countryCodes[newCountry]);
    if (onChange) {
      onChange(countryCodes[newCountry]);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhoneNumber = e.target.value;
    setPhoneNumber(newPhoneNumber);
    if (onChange) {
      onChange(newPhoneNumber);
    }
  };

  return (
    <div>
      <div className="relative flex">
      {/* Dropdown position: Start */}
      {selectPosition === "start" && (
        <div className="absolute">
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            disabled={disabled}
            className="appearance-none bg-none rounded-l-lg border-0 border-r border-gray-200 bg-transparent py-3 pl-3.5 pr-8 leading-tight text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-gray-400"
          >
            {countries.map((country) => (
              <option
                key={country.code}
                value={country.code}
                className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                {country.code}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 flex items-center text-gray-700 pointer-events-none bg-none right-3 dark:text-gray-400">
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Input field */}
      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        name={name}
        aria-label={ariaLabel}
        className={`dark:bg-dark-900 h-11 w-full ${
          selectPosition === "start" ? "pl-[84px]" : "pr-[84px]"
        } rounded-lg border bg-transparent py-3 px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
          disabled
            ? "cursor-not-allowed opacity-50 border-gray-300 dark:border-gray-700"
            : error
            ? "border-error-500 focus:border-error-300 focus:ring-error-500/10 dark:border-error-500 dark:focus:border-error-800"
            : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800"
        }`}
      />

      {/* Dropdown position: End */}
      {selectPosition === "end" && (
        <div className="absolute right-0">
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            disabled={disabled}
            className="appearance-none bg-none rounded-r-lg border-0 border-l border-gray-200 bg-transparent py-3 pl-3.5 pr-8 leading-tight text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-gray-400"
          >
            {countries.map((country) => (
              <option
                key={country.code}
                value={country.code}
                className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                {country.code}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 flex items-center text-gray-700 pointer-events-none right-3 dark:text-gray-400">
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}
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

export default PhoneInput;
