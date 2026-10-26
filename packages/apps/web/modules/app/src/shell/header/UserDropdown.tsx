import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { ShellDropdown, ShellDropdownItem } from "@/shell/header/ShellDropdown";
import { useNavigate } from "react-router";
import {
  ArrowLeftOnRectangleIcon,
  GlobeAltIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { sessionStore, organizacionStore } from "@/stores";
import { cerrarSesion } from "@/lib/auth.service";
import { InsigniaVerificada } from "@/icons";

/**
 * UserDropdown
 * Trigger y menú desplegable del perfil de usuario.
 * Diseño: [Avatar / Iniciales con halo celeste] [Nombre] [Chevron]
 *
 * La identidad se lee de `organizacionStore.usuario` (o `sessionStore.operadorSimulado`).
 * Si el usuario cuenta con `avatarUrl`, se renderiza la fotografía recortada al círculo;
 * si no tiene foto o falla al cargar, cae grácilmente a las iniciales del nombre o al icono genérico.
 *
 * Es `observer` porque `usuario` cambia —onboarding, `/profile`— y el avatar/nombre del
 * trigger tiene que seguirlo sin recargar la página.
 */
const UserDropdown = observer(() => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const opSimulado = sessionStore.operadorSimulado;
  const usuario = opSimulado
    ? {
        id: opSimulado.id,
        nombre: opSimulado.nombre,
        apellido: "",
        email: opSimulado.cargo || "",
        pais: "Colombia",
        perfilCompletado: true,
        avatarUrl: opSimulado.avatarUrl,
      }
    : organizacionStore.usuario;

  const avatarUrl = usuario?.avatarUrl?.trim();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const iniciales = usuario
    ? `${usuario.nombre.charAt(0)}${usuario.apellido?.charAt(0) ?? ""}`.toUpperCase()
    : "";
  const nombreCompleto = usuario
    ? `${usuario.nombre} ${usuario.apellido ?? ""}`.trim()
    : "Mi cuenta";

  const estaVerificado = organizacionStore.organizacion?.verificacion?.estado === "aprobado";

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleLogout = async () => {
    closeDropdown();
    await cerrarSesion();
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
        {/* Avatar circular con halo celeste de marca.
            Renderiza la imagen de avatarUrl si está definida y válida;
            de lo contrario muestra las iniciales o el glifo genérico. */}
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-200 p-0.5 overflow-hidden dark:bg-accent-500/25">
            {avatarUrl && !imageError ? (
              <img
                src={avatarUrl}
                alt={nombreCompleto}
                onError={() => setImageError(true)}
                className="h-full w-full rounded-full object-cover object-center"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-medium uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {iniciales || <UserIcon className="size-4 text-gray-400" />}
              </span>
            )}
          </div>
          {estaVerificado && (
            <span
              className="absolute -top-1 -right-1 z-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 ring-2 ring-white dark:ring-gray-900 shadow-xs"
              title="Usuario verificado"
            >
              <InsigniaVerificada className="size-4" />
            </span>
          )}
        </div>

        <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
          {usuario?.nombre ?? "Mi cuenta"}
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
        className="absolute right-0 mt-[14px] flex w-[270px] flex-col rounded-2xl border border-gray-200 bg-white p-3.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 z-50 font-sans animate-entrada-menu"
      >
        {/* Cabecera del usuario */}
        <div className="flex items-center gap-3 px-2 pt-1 pb-2.5 border-b border-gray-100 dark:border-gray-800">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-200 p-0.5 overflow-hidden dark:bg-accent-500/25">
              {avatarUrl && !imageError ? (
                <img
                  src={avatarUrl}
                  alt={nombreCompleto}
                  onError={() => setImageError(true)}
                  className="h-full w-full rounded-full object-cover object-center"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {iniciales || <UserIcon className="size-3.5 text-gray-400" />}
                </span>
              )}
            </div>
            {estaVerificado && (
              <span
                className="absolute -top-1 -right-1 z-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 ring-1.5 ring-white dark:ring-gray-900 shadow-xs"
                title="Usuario verificado"
              >
                <InsigniaVerificada className="size-3.5" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block font-bold text-gray-900 text-sm dark:text-white truncate">
              {nombreCompleto}
            </span>
            {usuario?.email && (
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400 truncate">
                {usuario.email}
              </span>
            )}
          </div>
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
              <UserIcon className="size-4.5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" />
              <span>Editar perfil</span>
            </ShellDropdownItem>
          </li>



          {/* Idioma — informativo, no un control: no hay i18n. Decía «English 🇺🇸»
              mientras toda la interfaz está en español. */}
          <li>
            <div className="flex items-center justify-between px-2.5 py-2 font-medium text-gray-700 rounded-xl text-sm hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/70 transition-colors">
              <div className="flex items-center gap-3">
                <GlobeAltIcon className="size-4.5 text-gray-500 dark:text-gray-400" />
                <span>Idioma</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                Español
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
          <ArrowLeftOnRectangleIcon className="size-4.5 text-gray-500 dark:text-gray-400" />
          <span>Cerrar sesión</span>
        </button>
      </ShellDropdown>
    </div>
  );
});

export default UserDropdown;
