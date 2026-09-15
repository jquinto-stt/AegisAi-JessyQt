type EventType = "new" | "completed" | "cancelled" | "called";

interface ActivityEvent {
  type: EventType;
  text: string;
  time: string;
}

const events: ActivityEvent[] = [
  { type: "new", text: "Nuevo turno de Juan Perez via WhatsApp", time: "hace 1m" },
  { type: "called", text: "Turno A-042 llamado a Caja 3", time: "hace 3m" },
  { type: "completed", text: "Turno C-011 completado", time: "hace 8m" },
  { type: "new", text: "Nuevo turno de Ana Silva via WhatsApp", time: "hace 12m" },
  { type: "cancelled", text: "Turno B-104 cancelado", time: "hace 18m" },
  { type: "completed", text: "Turno A-041 completado", time: "hace 25m" },
];

const dotColor: Record<EventType, string> = {
  new: "bg-success-500",
  called: "bg-warning-500",
  completed: "bg-secondary-600",
  cancelled: "bg-error-500",
};

/**
 * ActivityFeed — Recent operational events timeline.
 */
export const ActivityFeed = () => {
  return (
    <div className="h-full rounded-2xl bg-white p-5 shadow-theme-sm dark:bg-gray-900">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Actividad Reciente</h3>
      <ol className="relative space-y-5 border-l border-gray-200 pl-5 dark:border-gray-800">
        {events.map((e, i) => (
          <li key={i} className="relative">
            <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-gray-900 ${dotColor[e.type]}`} />
            <p className="text-sm text-gray-700 dark:text-gray-300">{e.text}</p>
            <p className="mt-0.5 text-xs text-gray-400">{e.time}</p>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default ActivityFeed;
