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
        <Search className="w-4 h-4 absolute left-3.5 text-zinc-400 pointer-events-none" />
        <input
          ref={ref}
          type="text"
          data-node-id="necto.el.search.input"
          data-intent={`${intent}.control`}
          value={value}
          onChange={onChange}
          className={[
            'w-full rounded-xl border bg-zinc-50 dark:bg-zinc-900 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-medium outline-none transition-colors',
            'border-zinc-200 dark:border-zinc-800 focus:border-[#FF3F1A] dark:focus:border-[#FF3F1A]',
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
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
            className="absolute right-2.5 w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
            title="Limpiar búsqueda"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        ) : shortcut ? (
          <kbd className="absolute right-2.5 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px] text-zinc-400 pointer-events-none">
            {shortcut}
          </kbd>
        ) : null}
      </div>
    );
  },
);
