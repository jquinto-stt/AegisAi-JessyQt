/**
 * Barrel de la capa Elements.
 *
 * Elements = componentes UI atómicos y reutilizables, cada uno declarado con
 * ui_dsl() y emitiendo data-node-id + data-intent para trazabilidad.
 */
export { ui_dsl, cx } from './dsl';
export type {
  ElementBaseProps,
  RenderContext,
  UiDslConfig,
} from './dsl';

export { Button } from './Button';
export type { ButtonProps } from './Button';
export { Card } from './Card';
export type { CardProps } from './Card';
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';
export { Field } from './Field';
export type { FieldProps } from './Field';
export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';
export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';
export { Toggle } from './Toggle';
export type { ToggleProps } from './Toggle';
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentOption } from './SegmentedControl';
export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';
