/**
 * Base props shared by all form field components.
 *
 * Provides a consistent API for validation states, accessibility,
 * and form integration across `Input`, `Select`, `TextArea`, `Checkbox`,
 * `Radio`, `Switch`, `FileInput`, `MultiSelect`, `PhoneInput`, and `DatePicker`.
 *
 * Every form component's props interface extends `FormFieldProps` to
 * guarantee that consumers can rely on the same set of common props
 * regardless of the specific field type.
 * @kgId 79dd329c2618
 */
export interface FormFieldProps {
  /**
   * Whether the field is disabled.
   *
   * When `true`, the field is non-interactive and visually dimmed.
   *
   * @default `false`
   */
  disabled?: boolean;

  /**
   * Whether to display the error visual state.
   *
   * Applies a red border and tints the focus ring red.
   *
   * @default `false`
   */
  error?: boolean;

  /**
   * Whether to display the success visual state.
   *
   * Applies a green border and tints the focus ring green.
   *
   * @default `false`
   */
  success?: boolean;

  /**
   * Helper text displayed below the field.
   *
   * Color adapts to the current state: red for `error`, green for
   * `success`, gray for neutral.
   */
  hint?: string;

  /**
   * HTML `name` attribute for form submission.
   */
  name?: string;

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
   * Use when a visible `Label` component is not present.
   */
  "aria-label"?: string;

  /**
   * ID of the element that describes this field (e.g. a hint or error message).
   */
  "aria-describedby"?: string;
}
