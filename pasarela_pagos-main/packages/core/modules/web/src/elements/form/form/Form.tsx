import { FC, ReactNode, FormEvent } from "react";

/**
 * Props for the Form component.
 * @kgId ce4bcc09c488
 */
export interface FormProps {
  /**
   * Callback fired when the form is submitted.
   *
   * `preventDefault()` is called automatically — the consumer receives
   * the event after default submission is blocked.
   *
   * @example
   * ```tsx
   * <Form onSubmit={(e) => handleSubmit(e)}>
   *   <Input name="email" />
   *   <Button type="submit">Send</Button>
   * </Form>
   * ```
   */
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;

  /**
   * Form content — typically a combination of form fields, labels, and buttons.
   */
  children: ReactNode;

  /**
   * Additional CSS classes applied to the `<form>` element.
   */
  className?: string;
}

/**
 * Form — Wrapper `<form>` element with automatic `preventDefault`.
 *
 * Renders a native `<form>` that intercepts the submit event and calls
 * `preventDefault()` before forwarding to the `onSubmit` callback.
 * This prevents full-page reloads in SPA contexts.
 *
 * @remarks
 * **When to use Form:**
 * - Use `Form` as a semantic wrapper around groups of form fields
 * - Provides automatic `preventDefault` so the consumer doesn't need to
 *
 * **Limitations:**
 * - No built-in validation — see `TECH_DEBT.md` (FormLayout entry)
 * - No `method`, `action`, or `encType` props for native form attributes
 * - No `noValidate` prop to disable browser validation
 *
 * @example Basic usage
 * ```tsx
 * <Form onSubmit={(e) => saveData()}>
 *   <Label htmlFor="name">Name</Label>
 *   <Input id="name" name="name" placeholder="Enter your name" />
 *   <Button type="submit">Save</Button>
 * </Form>
 * ```
 *
 * @see {@link Input} — Text input field for forms.
 * @see {@link Select} — Dropdown selection for forms.
 * @see {@link Label} — Accessible label for form fields.
 * @kgId e760adbb83c2
 */
const Form: FC<FormProps> = ({ onSubmit, children, className }) => {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(event);
      }}
      className={` ${className}`}
    >
      {children}
    </form>
  );
};

export default Form;
