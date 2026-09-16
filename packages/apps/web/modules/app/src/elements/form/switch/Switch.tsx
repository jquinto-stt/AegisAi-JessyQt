import { useState } from "react";

/**
 * Color theme for the Switch track when toggled on.
 *
 * - `"blue"` — Brand blue track (`bg-brand-500`)
 * - `"gray"` — Neutral dark track (`bg-gray-800`)
 * @kgId ee266f1cc67b
 */
export type SwitchColor = "blue" | "gray";

/**
 * Props for the Switch component.
 * @kgId 182767f0d402
 */
export interface SwitchProps {
  /**
   * Text label displayed next to the switch.
   *
   * Omit for standalone switches where the label is handled externally.
   */
  label?: string;

  /**
   * Controlled checked state.
   *
   * When provided, the component is controlled — the parent must update
   * this value via `onChange`. When omitted, the component manages its
   * own state starting from `defaultChecked`.
   */
  checked?: boolean;

  /**
   * Initial checked state for uncontrolled mode.
   *
   * Ignored when `checked` is provided.
   *
   * @default `false`
   */
  defaultChecked?: boolean;

  /**
   * Whether the switch is disabled.
   *
   * When `true`, the switch is non-interactive and visually dimmed.
   *
   * @default `false`
   */
  disabled?: boolean;

  /**
   * Callback fired when the switch is toggled.
   *
   * Receives the new `boolean` state.
   */
  onChange?: (checked: boolean) => void;

  /**
   * Color theme of the switch track when toggled on.
   *
   * @default `"blue"`
   */
  color?: SwitchColor;

  /**
   * HTML `name` attribute for form submission.
   */
  name?: string;

  /**
   * HTML `value` attribute sent with the form when checked.
   */
  value?: string;

  /**
   * Accessible label for screen readers.
   *
   * Use when a visible `label` prop is not present.
   */
  "aria-label"?: string;
}

/**
 * Switch — Toggle control for binary on/off settings.
 *
 * Renders a pill-shaped track with a sliding knob. Supports both
 * controlled (`checked` + `onChange`) and uncontrolled (`defaultChecked`)
 * modes. Two color themes are available: `"blue"` (brand) and `"gray"`.
 *
 * Uses a hidden `<input type="checkbox" role="switch">` for accessibility —
 * screen readers and keyboard navigation work natively.
 *
 * @remarks
 * **When to use Switch vs related components:**
 * - Use `Switch` for toggling a setting on/off with immediate visual feedback
 * - Use **Checkbox** for binary choices in forms (e.g. "I agree to terms")
 * - Use **Radio** for mutually exclusive single-select within a group
 *
 * **Limitations:**
 * - Does not use `cn()` for class merging
 *
 * @example Uncontrolled
 * ```tsx
 * <Switch label="Enable notifications" defaultChecked onChange={(on) => console.log(on)} />
 * ```
 *
 * @example Controlled
 * ```tsx
 * const [dark, setDark] = useState(false);
 * <Switch checked={dark} onChange={setDark} label="Dark mode" color="gray" />
 * ```
 *
 * @see {@link Checkbox} — For binary form choices with a checkmark indicator.
 * @see {@link Radio} — For mutually exclusive single-select.
 * @kgId 8fb0b972a527
 */
const Switch: React.FC<SwitchProps> = ({
  label,
  checked: controlledChecked,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue",
  name,
  value,
  "aria-label": ariaLabel,
}) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : internalChecked;

  const handleChange = () => {
    if (disabled) return;
    const newCheckedState = !isChecked;
    if (!isControlled) {
      setInternalChecked(newCheckedState);
    }
    if (onChange) {
      onChange(newCheckedState);
    }
  };

  const switchColors =
    color === "blue"
      ? {
          background: isChecked
            ? "bg-brand-500 "
            : "bg-gray-200 dark:bg-white/10",
          knob: isChecked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        }
      : {
          background: isChecked
            ? "bg-gray-800 dark:bg-white/10"
            : "bg-gray-200 dark:bg-white/10",
          knob: isChecked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        };

  return (
    <label
      className={`flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
        disabled ? "text-gray-400 cursor-not-allowed" : "text-gray-700 dark:text-gray-400"
      }`}
    >
      <div className="relative">
        <input
          type="checkbox"
          role="switch"
          className="sr-only"
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          name={name}
          value={value}
          aria-label={ariaLabel}
        />
        <div
          className={`block transition duration-150 ease-linear h-6 w-11 rounded-full ${
            disabled
              ? "bg-gray-100 pointer-events-none dark:bg-gray-800"
              : switchColors.background
          }`}
        ></div>
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-theme-sm duration-150 ease-linear transform ${switchColors.knob}`}
        ></div>
      </div>
      {label}
    </label>
  );
};

export default Switch;
