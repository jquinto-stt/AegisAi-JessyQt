import { useEffect } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Label } from "@/elements/form/label";
import { CalenderIcon } from "@/icons";
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

/**
 * Available picker modes for the DatePicker component.
 *
 * - `"single"` — Select a single date
 * - `"multiple"` — Select multiple individual dates
 * - `"range"` — Select a start and end date range
 * - `"time"` — Select a time only (no date)
 * @kgId 0a4585f3c4f8
 */
export type DatePickerMode = "single" | "multiple" | "range" | "time";

/**
 * Props for the DatePicker component.
 * @kgId 7b7f6c1b7956
 */
export interface DatePickerProps {
  /**
   * Unique HTML `id` for the input element.
   */
  id: string;

  /**
   * Picker mode that determines the selection behavior.
   *
   * @default `"single"`
   */
  mode?: DatePickerMode;

  /**
   * Callback fired when the selected date(s) change.
   */
  onChange?: Hook | Hook[];

  /**
   * Pre-selected date(s) when the picker initializes.
   */
  defaultDate?: DateOption;

  /**
   * Optional label text displayed above the input.
   */
  label?: string;

  /**
   * Placeholder text shown when no date is selected.
   */
  placeholder?: string;

  /**
   * Whether the input is disabled.
   *
   * When `true`, the input is non-interactive and flatpickr is not initialized.
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
   * Whether the field is required.
   *
   * @default `false`
   */
  required?: boolean;

  /**
   * Helper text displayed below the input.
   *
   * Color adapts to the current state: red for `error`, gray for neutral.
   */
  hint?: string;
}

/**
 * DatePicker — Date selection input powered by flatpickr.
 *
 * Wraps a native `<input>` with the flatpickr library to provide a calendar
 * dropdown for selecting dates, date ranges, or times. Includes an optional
 * `Label` and a calendar icon indicator.
 *
 * @remarks
 * **Peer dependency:** Requires `flatpickr` ^4.6.13 installed by the consumer.
 * The consumer must also import the flatpickr CSS: `import "flatpickr/dist/flatpickr.css"`.
 *
 * **When to use DatePicker vs related components:**
 * - Use `DatePicker` for calendar-based date selection with a visual picker
 * - Use **Input** with `type="date"` for simple date entry without a custom picker
 *
 * **Limitations:**
 * - No `success`, `minDate`, `maxDate`, `locale`, or controlled `value` — see `TECH_DEBT.md`
 * - Uses `id`-based DOM selection (`#${id}-wrapper`) — `id` must be unique per page
 *
 * @example Basic usage
 * ```tsx
 * <DatePicker id="start-date" label="Start Date" placeholder="Select a date" />
 * ```
 *
 * @example Range mode
 * ```tsx
 * <DatePicker
 *   id="date-range"
 *   mode="range"
 *   label="Date Range"
 *   onChange={(dates) => console.log(dates)}
 * />
 * ```
 *
 * @see {@link Input} — For simple text/date inputs without a calendar picker.
 * @see {@link Label} — Used internally for the optional label.
 * @kgId bb900b559175
 */
export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  disabled = false,
  error = false,
  name,
  required = false,
  hint,
}: DatePickerProps) {
  useEffect(() => {
    if (disabled) return;

    const flatPickr = flatpickr(`#${id}-wrapper`, {
      mode: mode || "single",
      wrap: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate,
      onChange,
    });

    return () => {
      if (!Array.isArray(flatPickr)) {
        flatPickr.destroy();
      }
    };
  }, [mode, onChange, id, defaultDate, disabled]);

  const borderClass = disabled
    ? "border-gray-300 opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 dark:border-gray-700"
    : error
    ? "border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:border-error-500 dark:focus:border-error-800"
    : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800";

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div id={`${id}-wrapper`} className="relative">
        <input
          id={id}
          data-input
          placeholder={placeholder}
          disabled={disabled}
          name={name}
          required={required}
          className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 ${borderClass}`}
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
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
}
