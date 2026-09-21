import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/utils";

/**
 * Position of the popover relative to its trigger element.
 *
 * - `"top"` — Above the trigger, centered horizontally
 * - `"right"` — To the right of the trigger, centered vertically
 * - `"bottom"` — Below the trigger, centered horizontally
 * - `"left"` — To the left of the trigger, centered vertically
 * @kgId e192270aa11f
 */
export type PopoverPosition = "top" | "right" | "bottom" | "left";

/**
 * Props for the **Popover** component.
 * @kgId 57427885ca18
 */
export interface PopoverProps {
  /**
   * Where the popover appears relative to the trigger element.
   */
  position: PopoverPosition;

  /**
   * Element that opens the popover on click.
   */
  trigger: React.ReactNode;

  /**
   * Content rendered inside the popover bubble.
   */
  children: ReactNode;

  /**
   * Additional CSS classes merged with `cn()` on the popover container.
   *
   * Useful for overriding width, padding, or z-index.
   */
  className?: string;

  /**
   * Callback fired when the popover opens or closes.
   *
   * Receives the new `boolean` state.
   */
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * Popover — Click-triggered floating panel for rich interactive content.
 *
 * Similar to `Tooltip` in positioning, but activated by click instead
 * of hover, and designed for richer content: titles, descriptions,
 * action buttons, lists, or any composed layout. Closes when clicking
 * outside the popover or its trigger.
 *
 * @remarks
 * **When to use Popover vs related components:**
 * - Use `Popover` for interactive content triggered by click — menus
 *   with actions, info panels with title + description + buttons,
 *   or lists with links.
 * - Use **Tooltip** for brief, non-interactive hints on hover — plain
 *   text only, no actions needed.
 * - Use **Dropdown** for a list of selectable options or actions
 *   (profile menu, action menu). Dropdown is more opinionated about
 *   its item structure with `DropdownItem`.
 * - Use **Modal** when the content requires the user's full attention
 *   and should block interaction with the rest of the page.
 *
 * **Behavior:**
 * - Opens/closes on trigger click (toggle).
 * - Closes on click outside (via `mousedown` listener).
 * - Renders conditionally — not in the DOM when closed.
 * - Fixed width of `300px`.
 *
 * **Limitations:**
 * - Fixed width (`w-[300px]`) — override via `className` if needed.
 * - No controlled mode (`open` prop) — internal state only.
 *
 * @example Basic with title and description
 * ```tsx
 * <Popover position="bottom" trigger={<Button>Details</Button>}>
 *   <div className="p-4">
 *     <h4 className="font-medium text-ink-title">Popover Title</h4>
 *     <p className="text-sm text-gray-500">Description text.</p>
 *   </div>
 * </Popover>
 * ```
 *
 * @example With action buttons
 * ```tsx
 * <Popover position="right" trigger={<Button variant="outline">Actions</Button>}>
 *   <div className="p-4 space-y-3">
 *     <p className="text-sm">Are you sure?</p>
 *     <div className="flex gap-2">
 *       <Button size="sm">Confirm</Button>
 *       <Button size="sm" variant="outline">Cancel</Button>
 *     </div>
 *   </div>
 * </Popover>
 * ```
 *
 * @see {@link Tooltip} — For brief hover-only hints (text only).
 * @see {@link Dropdown} — For structured option/action lists.
 * @see {@link Modal} — For full-attention dialogs.
 * @kgId 0f02119d5185
 */
export default function Popover({ position, trigger, children, className, onOpenChange }: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onOpenChange, isOpen]);

  const togglePopover = () => {
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange?.(next);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
  };

  const arrowClasses = {
    top: "bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45",
    right:
      "left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 rotate-45",
    bottom:
      "top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45",
    left: "right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 rotate-45",
  };

  return (
    <div className="relative inline-block">
      <div ref={triggerRef} onClick={togglePopover}>
        {trigger}
      </div>
      {isOpen && (
        <div
          ref={popoverRef}
          className={cn("absolute w-[300px] z-99999", positionClasses[position], className)}
        >
          <div className="w-full bg-white rounded-xl shadow-theme-lg dark:bg-gray-900">
            {children}
            <div
              className={cn("absolute w-3 h-3 bg-white shadow-theme-lg dark:bg-gray-900", arrowClasses[position])}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
