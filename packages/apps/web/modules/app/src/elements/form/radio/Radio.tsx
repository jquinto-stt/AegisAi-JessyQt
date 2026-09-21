import { cn } from "@/utils";

/**
 * Available sizes for the Radio component.
 *
 * - `"default"` — Standard 20px radio with `gap-3` label spacing
 * - `"sm"` — Compact 16px radio with tighter label spacing
 * @kgId eeaa1b8dcc7d
 */
export type RadioSize = "default" | "sm";

/**
 * Props for the Radio component.
 * @kgId 048f568285c8
 */
export interface RadioProps {
  /**
   * Unique HTML `id` for the radio input.
   *
   * Required for associating the `<label>` with the hidden `<input>`.
   */
  id: string;

  /**
   * HTML `name` attribute that groups radio buttons together.
   *
   * All radios in the same group must share the same `name` so only
   * one can be selected at a time.
   */
  name: string;

  /**
   * Value submitted with the form when this radio is selected.
   */
  value: string;

  /**
   * Whether this radio is currently selected (controlled).
   */
  checked: boolean;

  /**
   * Text label displayed next to the radio indicator.
   */
  label: string;

  /**
   * Callback fired when this radio is selected.
   *
   * Receives the `value` string of the selected radio.
   */
  onChange: (value: string) => void;

  /**
   * Additional CSS classes applied to the outer `<label>` wrapper.
   *
   * @default `""`
   */
  className?: string;

  /**
   * Whether the radio is disabled.
   *
   * When `true`, the radio is non-interactive and visually dimmed.
   *
   * @default `false`
   */
  disabled?: boolean;

  /**
   * Size variant of the radio indicator.
   *
   * @default `"default"`
   */
  size?: RadioSize;
}

/**
 * Radio — Single-select option within a mutually exclusive group.
 *
 * Renders a styled radio button with a circular indicator and text label.
 * The component is always controlled — the parent manages `checked` state
 * and updates it via `onChange`. Supports two sizes: `"default"` (20px)
 * and `"sm"` (16px).
 *
 * @remarks
 * **When to use Radio vs related components:**
 * - Use `Radio` for mutually exclusive single-select within a group
 * - Use **Checkbox** for binary yes/no or multi-select choices
 * - Use **Select** for single-select from a long list (saves vertical space)
 * - Use **Switch** for on/off toggles with immediate effect
 *
 * **Limitations:**
 * - No `required`, `error`, or `aria-*` props
 * - Uses `sr-only` hidden input — the visual indicator is a styled `<span>`
 *
 * @example Basic radio group
 * ```tsx
 * const [color, setColor] = useState("red");
 * <Radio id="red" name="color" value="red" label="Red" checked={color === "red"} onChange={setColor} />
 * <Radio id="blue" name="color" value="blue" label="Blue" checked={color === "blue"} onChange={setColor} />
 * ```
 *
 * @example Small size
 * ```tsx
 * <Radio id="opt1" name="opts" value="1" label="Option 1" checked={true} onChange={setValue} size="sm" />
 * ```
 *
 * @see {@link Checkbox} — For multi-select or binary toggle choices.
 * @see {@link Select} — For single-select from a dropdown list.
 * @see {@link Switch} — For on/off toggles.
 * @kgId bf3bac174280
 */
const Radio: React.FC<RadioProps> = ({
  id,
  name,
  value,
  checked,
  label,
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
            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
            : "text-gray-500 dark:text-gray-400 cursor-pointer",
          className
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
          />
          <span
            className={cn(
              "mr-2 flex h-4 w-4 items-center justify-center rounded-full border",
              checked
                ? "border-brand-500 bg-brand-500"
                : "bg-transparent border-gray-300 dark:border-gray-700",
              disabled && "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-700"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                checked ? "bg-white" : "bg-white dark:bg-gray-900"
              )}
            ></span>
          </span>
        </span>
        {label}
      </label>
    );
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-3 text-sm font-medium",
        disabled
          ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
          : "text-gray-700 dark:text-gray-400",
        className
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
      />
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border-[1.25px]",
          checked
            ? "border-brand-500 bg-brand-500"
            : "bg-transparent border-gray-300 dark:border-gray-700",
          disabled && "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-700"
        )}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full bg-white",
            checked ? "block" : "hidden"
          )}
        ></span>
      </span>
      {label}
    </label>
  );
};

export default Radio;
