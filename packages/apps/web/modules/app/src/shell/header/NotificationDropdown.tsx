import { useState } from "react";
import { ShellDropdown } from "@/shell/header/ShellDropdown";
import { X } from "lucide-react";

interface NotificationItem {
  id: string;
  name: string;
  action: string;
  target: string;
  category: string;
  time: string;
  avatar: string;
  statusColor: "green" | "red";
}

const NOTIFICATIONS_DATA: NotificationItem[] = [
  {
    id: "1",
    name: "Terry Franci",
    action: "requests permission to change",
    target: "Project - Nganter App",
    category: "Project",
    time: "5 min ago",
    avatar: "/images/user/user-02.jpg",
    statusColor: "green",
  },
  {
    id: "2",
    name: "Alena Franci",
    action: "requests permission to change",
    target: "Project - Nganter App",
    category: "Project",
    time: "8 min ago",
    avatar: "/images/user/user-03.jpg",
    statusColor: "green",
  },
  {
    id: "3",
    name: "Jocelyn Kenter",
    action: "requests permission to change",
    target: "Project - Nganter App",
    category: "Project",
    time: "15 min ago",
    avatar: "/images/user/user-04.jpg",
    statusColor: "green",
  },
  {
    id: "4",
    name: "Brandon Philips",
    action: "requests permission to change",
    target: "Project - Nganter App",
    category: "Project",
    time: "1 hr ago",
    avatar: "/images/user/user-05.jpg",
    statusColor: "red",
  },
];

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
    setNotifying(false);
  };

  return (
    <div className="relative">
      {/* Botón trigger circular con campana outline y punto naranja */}
      <button
        className="relative flex items-center justify-center text-gray-600 transition-colors bg-white border border-gray-200/90 rounded-full dropdown-toggle hover:text-gray-900 h-11 w-11 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer"
        onClick={handleClick}
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <span
          className={`absolute right-1 top-1 z-10 size-2.5 rounded-full bg-brand-500 ring-2 ring-white dark:ring-gray-900 ${
            !notifying ? "hidden" : "block"
          }`}
        />
        <svg
          className="size-5 stroke-current fill-none"
          viewBox="0 0 24 24"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </button>

      {/* Menú desplegable de Notificaciones */}
      <ShellDropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-16 sm:right-0 mt-3 flex w-[350px] sm:w-[390px] flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 z-50 animate-entrada-menu font-sans"
      >
        {/* Cabecera del panel */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-xl font-bold tracking-tight text-ink-title dark:text-white">
            Notificaciones
          </h3>
          <button
            type="button"
            onClick={closeDropdown}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            aria-label="Cerrar notificaciones"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Lista de notificaciones */}
        <ul className="flex flex-col max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/80 custom-scrollbar pr-1">
          {NOTIFICATIONS_DATA.map((item) => (
            <li key={item.id} className="py-4 first:pt-4 last:pb-2">
              <div className="flex items-start gap-3.5">
                {/* Avatar con punto de estado verde o rojo */}
                <div className="relative flex-shrink-0">
                  <img
                    src={item.avatar}
                    alt={item.name}
                    className="size-12 rounded-full object-cover"
                  />
                  <span
                    className={`absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-white dark:border-gray-900 ${
                      item.statusColor === "green" ? "bg-success-500" : "bg-error-500"
                    }`}
                  />
                </div>

                {/* Texto descriptivo */}
                <div className="min-w-0 flex-1 leading-snug pt-0.5">
                  <p className="text-[13px] sm:text-sm text-gray-500 dark:text-gray-400">
                    <strong className="font-semibold text-gray-900 dark:text-white">
                      {item.name}
                    </strong>{" "}
                    {item.action}{" "}
                    <strong className="font-semibold text-gray-900 dark:text-white">
                      {item.target}
                    </strong>
                  </p>

                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 font-normal">
                    <span>{item.category}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Botón inferior: Ver todas las notificaciones */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
          <button
            type="button"
            onClick={closeDropdown}
            className="w-full rounded-xl border border-gray-200/90 bg-white py-3 text-sm font-semibold text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 transition-colors cursor-pointer text-center"
          >
            Ver todas las notificaciones
          </button>
        </div>
      </ShellDropdown>
    </div>
  );
}
