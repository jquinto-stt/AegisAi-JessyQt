import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'onChange'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Callback del botón de limpiar; si se omite, no se muestra el botón. */
  onClear?: () => void;
  /** Intent tag para trazabilidad. */
  intent?: string;
  className?: string;
  /** Atajo mostrado a la derecha (ej: ⌘K). Opcional. */
  shortcut?: string;
}

/**
 * Element: SearchInput — campo de búsqueda con icono, botón de limpiar y
 * soporte de ref (para focus programático / atajos de teclado).
 *
 * Node ID base: necto.el.search. Intent por defecto: input.search.
 *
 * A diferencia de los Elements declarados con ui_dsl(), este usa forwardRef
 * porque los buscadores del proyecto (Bandeja, Insumos, Historial, Command
 * Palette) necesitan exponer el ref del <input> para enfocarlo. Mantiene la
 * convención de la capa: emite data-node-id y data-intent.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { value, onChange, onClear, intent = 'input.search', className = '', shortcut, ...rest },
    ref,
  ) {
    return (
      <div
        data-node-id="necto.el.search"
        data-intent={intent}
        className={`relative flex items-center ${className}`}
      >
        <Search className="w-4 h-4 absolute left-3.5 text-gray-400 pointer-events-none" />
        <input
          ref={ref}
          type="text"
          data-node-id="necto.el.search.input"
          data-intent={`${intent}.control`}
          value={value}
          onChange={onChange}
          className={[
            'w-full rounded-xl border bg-gray-100/60 dark:bg-gray-900 py-2 text-theme-xs text-gray-900 dark:text-gray-100 font-medium outline-none transition-colors',
            'border-gray-200 dark:border-gray-800 focus:border-brand-500 dark:focus:border-brand-500',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'pl-9',
            value && onClear ? 'pr-9' : shortcut ? 'pr-14' : 'pr-3',
          ].join(' ')}
          {...rest}
        />
        {value && onClear ? (
          <button
            type="button"
            data-node-id="necto.el.search.clear"
            data-intent={`${intent}.clear`}
            onClick={onClear}
            className="absolute right-2.5 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            title="Limpiar búsqueda"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        ) : shortcut ? (
          <kbd className="absolute right-2.5 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-theme-xs text-gray-400 pointer-events-none">
            {shortcut}
          </kbd>
        ) : null}
      </div>
    );
  },
);
