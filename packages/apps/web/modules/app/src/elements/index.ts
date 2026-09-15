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

/**
 * Link — elemento de navegación del catálogo Elements.
 *
 * Añadido desde el paquete del catálogo (`ui_implement`) y verificado por hash:
 * es byte a byte el `Link` canónico. Cubría el único hueco de navegación que
 * tenía la capa Elements del proyecto.
 */
export { Link } from './ui/link';
export type { LinkProps, LinkVariant, LinkOpacity } from './ui/link';

/**
 * List — colección de items con separadores y marcadores opcionales.
 *
 * Variantes: `unordered` (default), `ordered`, `icon`, `button`,
 * `horizontal`, y las interactivas `checkbox` / `radio`.
 *
 * Añadido desde el paquete del catálogo (`ui_implement`, sesión
 * `4dd2dea26aa0`) y verificado por hash MD5 contra el manifiesto:
 * es byte a byte el `List` canónico, sin extensión local.
 *
 * Ojo con dos límites medidos en la fuente antes de adoptarlo:
 * las variantes interactivas guardan su **estado interno** (`useState`),
 * y la variante `button` fija el ancho en `sm:w-[228px]`.
 */
export { List } from './ui/list';
export type {
  ListProps,
  ListVariant,
  ListButtonItem,
  ListRadioItem,
} from './ui/list/List';

/**
 * Popover — panel flotante anclado a un trigger, activado por click.
 *
 * Añadido desde el paquete del catálogo (`ui_implement`, sesión
 * `4dd2dea26aa0`) y verificado por hash MD5 contra el manifiesto:
 * es byte a byte el `Popover` canónico, sin extensión local.
 *
 * Límites medidos en la fuente: ancho fijo `w-[300px]` (override por
 * `className`), **sin modo controlado** (`open` es estado interno, sólo
 * se observa vía `onOpenChange`), y `position` **centra** sobre el
 * trigger (`left-1/2 -translate-x-1/2`) sin auto-flip.
 */
export { Popover } from './ui/popover';
export type { PopoverProps, PopoverPosition } from './ui/popover/Popover';

// Form Elements
export { Input } from './form/input';
export type { InputProps } from './form/input';

export { Select } from './form/select';
export type { SelectProps, SelectOption } from './form/select';

export { Label } from './form/label';

export { Switch } from './form/switch';

export { Checkbox } from './form/checkbox';

/**
 * Radio — control circular de elección **exclusiva** dentro de un grupo.
 *
 * Añadido desde el paquete del catálogo (`ui_implement`, sesión
 * `4dd2dea26aa0`) y verificado por hash MD5 contra el manifiesto:
 * es byte a byte el `Radio` canónico, sin extensión local.
 *
 * Semántica: todos los radios de un grupo comparten `name` y sólo uno
 * puede estar activo. Para selección **independiente** (varios a la vez)
 * el componente es `Checkbox`, no `Radio`.
 */
export { Radio } from './form/radio';
export type { RadioProps, RadioSize } from './form/radio/Radio';

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

// Elements UI additions from Webi.AI Elements Catalog
export { Avatar } from './ui/avatar';
export type { AvatarProps, AvatarSize, AvatarStatus } from './ui/avatar';

export { Dropdown, DropdownItem } from './ui/dropdown';
export type { DropdownProps, DropdownItemProps } from './ui/dropdown';
