import { cn } from "@/utils";

/** Available sizes for the Radio component. */
export type RadioSize = "default" | "sm";

export interface RadioProps {
  /** Unique HTML `id` for the radio input and associated label. */
  id: string;
  /** Name shared by radio options in the same group. */
  name: string;
  /** Value submitted when selected. */
  value: string;
  /** Controlled checked state. */
  checked: boolean;
  /** Visible option title. */
  label: string;
  /** Optional supporting copy shown below the option title. */
  description?: string;
  /** Optional id or ids of descriptions associated with the radio. */
  "aria-describedby"?: string;
  /** Whether the radio group is required for form submission. */
  required?: boolean;
  /** Value callback when selected. */
  onChange: (value: string) => void;
  /** Additional classes applied to the outer label. */
  className?: string;
  /** Whether the radio is disabled. */
  disabled?: boolean;
  /** Size variant for the indicator. */
  size?: RadioSize;
}

/**
 * Radio — controlled, mutually-exclusive choice. Optional description and
 * aria-describedby support let cards explain a decision without inventing a
 * second input model; existing instances keep their original compact layout.
 */
const Radio: React.FC<RadioProps> = ({
  id,
  name,
  value,
  checked,
  label,
  description,
  "aria-describedby": ariaDescribedBy,
  required = false,
  onChange,
  className = "",
  disabled = false,
  size = "default",
}) => {
  const isSmall = size === "sm";

  if (isSmall) {
    return (
      <label
        htmlFor={id}
        className={cn(
          "flex select-none items-center text-sm",
          disabled
            ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
            : "cursor-pointer text-gray-500 dark:text-gray-400",
          className,
        )}
      >
        <span className="relative">
          <input
            type="radio"
            id={id}
            name={name}
            value={value}
            checked={checked}
            onChange={() => !disabled && onChange(value)}
            className="sr-only"
            disabled={disabled}
            required={required}
            aria-describedby={ariaDescribedBy}
          />
          <span
            className={cn(
              "mr-2 flex h-4 w-4 items-center justify-center rounded-full border",
              checked
                ? "border-brand-500 bg-brand-500"
                : "border-gray-300 bg-transparent dark:border-gray-700",
              disabled && "border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-700",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", checked ? "bg-white" : "bg-white dark:bg-gray-900")} />
          </span>
        </span>
        {label}
        {description && <span id={`${id}-description`} className="sr-only">{description}</span>}
      </label>
    );
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-3 text-sm font-medium",
        disabled
          ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
          : "text-gray-700 dark:text-gray-400",
        className,
      )}
    >
      <input
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        onChange={() => !disabled && onChange(value)}
        className="sr-only"
        disabled={disabled}
        required={required}
        aria-labelledby={description ? `${id}-label` : undefined}
        aria-describedby={ariaDescribedBy ?? (description ? `${id}-description` : undefined)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.25px]",
          checked
            ? "border-brand-500 bg-brand-500"
            : "border-gray-300 bg-transparent dark:border-gray-700",
          disabled && "border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-700",
        )}
      >
        <span className={cn("h-2 w-2 rounded-full bg-white", checked ? "block" : "hidden")} />
      </span>
      {description ? (
        <span className="min-w-0 flex-1">
          <span id={`${id}-label`} className="block text-sm font-semibold">{label}</span>
          <span id={`${id}-description`} className="mt-0.5 block text-xs font-normal leading-4 text-gray-600 dark:text-gray-300">
            {description}
          </span>
        </span>
      ) : (
        label
      )}
    </label>
  );
};

export default Radio;
