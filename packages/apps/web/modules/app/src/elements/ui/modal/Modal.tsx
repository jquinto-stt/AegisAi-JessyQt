import { useRef, useEffect } from "react";
import { cn } from "@/utils";

/**
 * Props for the **Modal** component.
 * @kgId c4ba6e9df563
 */
export interface ModalProps {
  /**
   * Controls whether the modal is visible.
   *
   * When `true`, the modal renders with a backdrop overlay and
   * blocks page scroll. Managed externally by the parent.
   *
   * @example
   * ```tsx
   * const [open, setOpen] = useState(false);
   * <Modal isOpen={open} onClose={() => setOpen(false)}>
   *   <p>Modal content</p>
   * </Modal>
   * ```
   */
  isOpen: boolean;

  /**
   * Callback fired when the modal should close — triggered by
   * clicking the backdrop, pressing `Escape`, or the close button.
   */
  onClose: () => void;

  /**
   * Additional CSS classes applied to the modal content container.
   *
   * Useful for controlling width: `max-w-md`, `max-w-2xl`, etc.
   *
   * @example
   * ```tsx
   * <Modal isOpen={open} onClose={close} className="max-w-lg p-6">
   *   ...
   * </Modal>
   * ```
   */
  className?: string;

  /**
   * Content rendered inside the modal — forms, confirmations,
   * consent dialogs, or any layout that requires full user attention.
   *
   * @example
   * ```tsx
   * <Modal isOpen={open} onClose={close}>
   *   <h2>Confirm deletion</h2>
   *   <p>This action cannot be undone.</p>
   *   <Button variant="destructive" onClick={handleDelete}>Delete</Button>
   * </Modal>
   * ```
   */
  children: React.ReactNode;

  /**
   * Whether to show the built-in close button (X) in the top-right corner.
   *
   * @default `true`
   */
  showCloseButton?: boolean;

  /**
   * When `true`, the modal takes the full viewport without backdrop
   * or rounded corners. Useful for immersive experiences like
   * image viewers or full-screen editors.
   *
   * @default `false`
   */
  isFullscreen?: boolean;
}

/**
 * Modal — Full-attention dialog that overlays the page.
 *
 * Captures the user's focus for important interactions: forms,
 * confirmations, consent flows, or any content that needs to
 * block interaction with the rest of the page until resolved.
 *
 * @remarks
 * **When to use Modal vs related components:**
 * - Use `Modal` for content that requires the user's full attention
 *   and a deliberate action to dismiss — forms, confirmations,
 *   consent dialogs, destructive action confirmations.
 * - Use **Dropdown** for quick option selection that doesn't need
 *   to block the page.
 * - Use **Popover** for contextual content that supplements but
 *   doesn't block interaction.
 * - Use **Notification** for transient feedback that auto-dismisses.
 *
 * **Behavior:**
 * - Fully controlled — parent manages `isOpen` state.
 * - Closes on `Escape` key press.
 * - Closes on backdrop click (unless `isFullscreen`).
 * - Blocks page scroll when open (`overflow: hidden` on `<body>`).
 * - Cleans up scroll lock on unmount.
 *
 * **Fullscreen mode:**
 * - No backdrop, no rounded corners, fills entire viewport.
 * - Backdrop click is disabled — only close button or `Escape` works.
 *
 * **Animation (enter only):**
 * - The scrim fades in (`animate-aparecer`, 200 ms) and the panel settles with
 *   a fade, an 8 px rise and a 0.97 → 1 scale (`animate-entrada-panel`,
 *   200 ms). Fullscreen modals fade only — a viewport-sized element that scales
 *   reads as a slide zoom rather than as a layer landing on the content.
 * - Both are declared as `--animate-*` tokens in `css/theme.css` and are
 *   neutralised under `prefers-reduced-motion` in `css/base.css`.
 * - **There is no exit animation, and that is deliberate.** Six of the eight
 *   consumers pass a bare `isOpen` (`isOpen`, which evaluates to `true`) and
 *   unmount the modal from the parent. By the time the state flips there is no
 *   node left to animate, so an exit would play in 2 screens out of 8 and
 *   silently not play in the other 6 — worse than having none, because it reads
 *   as an intermittent bug. Adding one for real means converting those six call
 *   sites to the controlled pattern first, at which point
 *   `useMontajeAnimado` supplies the exit window.
 *
 * **Limitations:**
 * - No exit animation — see above; the entrance is the animated half.
 * - No `size` prop — width controlled via `className`.
 * - Does not trap focus — Tab can escape the modal.
 *
 * @example Basic confirmation
 * ```tsx
 * <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-md p-6">
 *   <h2>Delete item?</h2>
 *   <p>This action cannot be undone.</p>
 *   <div className="flex gap-2 mt-4">
 *     <Button variant="destructive" onClick={handleDelete}>Delete</Button>
 *     <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
 *   </div>
 * </Modal>
 * ```
 *
 * @example Form inside modal
 * ```tsx
 * <Modal isOpen={open} onClose={close} className="max-w-lg p-8">
 *   <h2>Edit Profile</h2>
 *   <form onSubmit={handleSubmit}>
 *     <Input label="Name" value={name} onChange={setName} />
 *     <Button type="submit">Save</Button>
 *   </form>
 * </Modal>
 * ```
 *
 * @example Fullscreen modal
 * ```tsx
 * <Modal isOpen={open} onClose={close} isFullscreen>
 *   <img src="/photo.jpg" alt="Full view" className="w-full h-full object-contain" />
 * </Modal>
 * ```
 *
 * @see {@link Dropdown} — For quick option lists without blocking.
 * @see {@link Popover} — For contextual supplementary content.
 * @see {@link Notification} — For transient feedback messages.
 * @kgId 1a73d3c73c2c
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const contentClasses = isFullscreen
    ? "w-full h-full"
    : "relative w-full rounded-2xl bg-white  dark:bg-gray-900";

  // Pantalla completa solo se funde: aplicarle el asentamiento de escala de
  // `entrada-panel` haría encogerse un elemento que ocupa todo el viewport, que
  // se lee como un zoom de diapositiva y no como una capa que se asienta.
  const animacionPanel = isFullscreen ? "animate-aparecer" : "animate-entrada-panel";

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto modal z-99999">
      {/* Solo ENTRADA, y es una decisión, no un olvido: seis de los ocho
          consumidores pasan `isOpen` como booleano suelto (`isOpen`, que es
          `true`) y desmontan el modal desde el padre. Cuando el estado cambia no
          queda nodo al que animar, así que una salida aquí no se vería en 6 de
          8 pantallas y sí en 2 — peor que no tener ninguna, porque se leería
          como un fallo intermitente. Hacerla de verdad exige migrar esos seis
          call sites al patrón controlado primero.

          Por lo mismo no se usa `useMontajeAnimado`: pedir una ventana de
          salida que no se va a animar solo retrasaría el desmontaje.

          Sobre el desenfoque: el scrim anima `opacity` sobre un elemento con
          `backdrop-blur`. Es seguro porque `opacity` se compone en GPU y el
          resultado del desenfoque no cambia mientras dura el fundido — el fondo
          está quieto. Si algún día el scrim se animara con un `transform` que
          alterase el muestreo, ahí sí habría que recalcular el desenfoque en
          cada fotograma. */}
      {!isFullscreen && (
        <div
          className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px] animate-aparecer"
          onClick={onClose}
        ></div>
      )}
      <div
        ref={modalRef}
        className={cn(contentClasses, animacionPanel, className)}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            // Nombre accesible: el botón solo contiene un `<svg>`, así que sin
            // esto el árbol de accesibilidad lo anuncia como «botón» a secas.
            // Medido con `Accessibility.getFullAXTree`: era el único control sin
            // nombre de `/pedidos/crear` con el modal abierto, y al ser el
            // `Modal` del catálogo afectaba a TODOS los modales de la app.
            // El `aria-label` va aquí y no en el consumidor porque el botón es
            // de este componente: quien monta un `Modal` no puede nombrarlo.
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-999 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:right-6 sm:top-6 sm:h-11 sm:w-11"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
