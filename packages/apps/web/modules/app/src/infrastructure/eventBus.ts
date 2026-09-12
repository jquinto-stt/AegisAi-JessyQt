import type { NectoEventsMap, NectoEventType } from "../contracts/events.contract";

/**
 * Type-safe EventBus wrapper for window CustomEvents.
 * Decouples cross-module communication without requiring direct context dependencies.
 */
export const eventBus = {
  publish<K extends NectoEventType>(eventType: K, payload: NectoEventsMap[K]): void {
    const event = new CustomEvent(eventType, { detail: payload });
    window.dispatchEvent(event);
  },

  subscribe<K extends NectoEventType>(
    eventType: K,
    callback: (payload: NectoEventsMap[K]) => void
  ): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<NectoEventsMap[K]>;
      callback(customEvent.detail);
    };

    window.addEventListener(eventType, handler as EventListener);
    return () => {
      window.removeEventListener(eventType, handler as EventListener);
    };
  },
};
