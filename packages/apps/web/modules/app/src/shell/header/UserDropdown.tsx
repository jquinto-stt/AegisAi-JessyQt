import { useState } from "react";
import { ShellDropdown, ShellDropdownItem } from "@/shell/header/ShellDropdown";
import { useNavigate } from "react-router";
import { User, Settings, Info, Globe, LogOut } from "lucide-react";
import { sessionStore } from "@/stores";

/**
 * UserDropdown
 * Trigger y menú desplegable del perfil de usuario.
 * Diseño limpio: [Foto con halo lila] [Musharof] [Chevron]
 */
export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleLogout = () => {
    closeDropdown();
    sessionStore.logout();
    navigate("/login");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        className="flex items-center gap-2 text-gray-800 dark:text-gray-100 hover:opacity-85 transition-opacity cursor-pointer select-none"
        aria-expanded={isOpen}
      >
        {/* Avatar circular con halo lila suave idéntico a la referencia */}
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E0E2FD] dark:bg-indigo-950/60 p-0.5 overflow-hidden">
          <img
            src="/images/user/owner.png"
            alt="Musharof"
            className="h-full w-full rounded-full object-cover"
          />
        </div>

        <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
          Musharof
        </span>

        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="16"
          height="16"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <ShellDropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[14px] flex w-[270px] flex-col rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xl dark:border-gray-800 dark:bg-gray-900 z-50 font-sans animate-in fade-in slide-in-from-top-2"
      >
        {/* Cabecera del usuario */}
        <div className="px-2 pt-1 pb-2">
          <span className="block font-bold text-gray-900 text-sm dark:text-white">
            Musharof Chowdhury
          </span>
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400 truncate">
            randomuser@pimjo.com
          </span>
        </div>

        {/* Lista de opciones */}
        <ul className="flex flex-col gap-0.5 pt-2 pb-2">
          {/* Editar perfil */}
          <li>
            <ShellDropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/profile"
              className="flex items-center gap-3 px-2.5 py-2 font-medium text-gray-700 rounded-xl group text-sm hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/70 dark:hover:text-white transition-colors"
            >
              <User className="size-4.5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" />
              <span>Editar perfil</span>
            </ShellDropdownItem>
          </li>

          {/* Configuración de la cuenta */}
          <li>
            <ShellDropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/organizacion/configuracion"
              className="flex items-center gap-3 px-2.5 py-2 font-medium text-gray-700 rounded-xl group text-sm hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/70 dark:hover:text-white transition-colors"
            >
              <Settings className="size-4.5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" />
              <span>Configuración de la cuenta</span>
            </ShellDropdownItem>
          </li>

          {/* Soporte */}
          <li>
            <ShellDropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/soporte"
              className="flex items-center gap-3 px-2.5 py-2 font-medium text-gray-700 rounded-xl group text-sm hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/70 dark:hover:text-white transition-colors"
            >
              <Info className="size-4.5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" />
              <span>Soporte</span>
            </ShellDropdownItem>
          </li>

          {/* Idioma */}
          <li>
            <div className="flex items-center justify-between px-2.5 py-2 font-medium text-gray-700 rounded-xl text-sm hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/70 transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="size-4.5 text-gray-500 dark:text-gray-400" />
                <span>Idioma</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                English 🇺🇸
              </span>
            </div>
          </li>
        </ul>

        {/* Separador */}
        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

        {/* Cerrar sesión */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-2.5 py-2 font-medium text-gray-700 rounded-xl text-sm hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/70 dark:hover:text-white transition-colors cursor-pointer text-left"
        >
          <LogOut className="size-4.5 text-gray-500 dark:text-gray-400" />
          <span>Cerrar sesión</span>
        </button>
      </ShellDropdown>
    </div>
  );
}
