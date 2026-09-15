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
 * **Limitations:**
 * - No animation/transition on open/close.
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
    : "relative w-full rounded-3xl bg-white  dark:bg-gray-900";

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto modal z-99999">
      {!isFullscreen && (
        <div
          className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"
          onClick={onClose}
        ></div>
      )}
      <div
        ref={modalRef}
        className={cn(contentClasses, className)}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
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
