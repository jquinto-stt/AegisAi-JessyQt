/**
 * Barrel de la capa Elements puro (basado en Repo-prueba-master).
 * 
 * Exporta componentes atómicos oficiales de Elements y mantiene
 * compatibilidad retroactiva durante la migración de pantallas.
 */

// UI Elements
export { Button } from './ui/button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './ui/button';

export { Badge } from './ui/badge';
export type { BadgeProps, BadgeVariant, BadgeSize, BadgeColor } from './ui/badge';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
} from './ui/card';
export type { CardProps, CardLayout } from './ui/card';

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from './ui/table';
export type { TableProps } from './ui/table';

export { Modal } from './ui/modal';
export type { ModalProps } from './ui/modal';

export { Alert } from './ui/alert';
export type { AlertProps } from './ui/alert';

export { Notification } from './ui/notification';
export type { NotificationProps } from './ui/notification';

export { Breadcrumb } from './ui/breadcrumb';
export type { BreadcrumbProps, BreadcrumbItem } from './ui/breadcrumb';

export { ButtonsGroup } from './ui/buttons-group';
export type { ButtonsGroupProps, ButtonsGroupItem } from './ui/buttons-group';

// Form Elements
export { Input } from './form/input';
export type { InputProps } from './form/input';

export { Select } from './form/select';
export type { SelectProps, SelectOption } from './form/select';

export { Label } from './form/label';

export { Switch } from './form/switch';

export { Checkbox } from './form/checkbox';

export { Textarea, Textarea as TextArea } from './form/textarea';
export type { TextareaProps, TextareaProps as TextAreaProps } from './form/textarea';

// Backwards-compatible aliases
export { Field } from './Field';
export type { FieldProps } from './Field';

export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';

export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentOption } from './SegmentedControl';

export { Toggle } from './Toggle';
export type { ToggleProps } from './Toggle';
