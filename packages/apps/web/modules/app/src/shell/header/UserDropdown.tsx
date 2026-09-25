import { useState } from "react";
import { observer } from "mobx-react-lite";
import { ShellDropdown, ShellDropdownItem } from "@/shell/header/ShellDropdown";
import { useNavigate } from "react-router";
import { User, Settings, Info, Globe, LogOut, LayoutGrid } from "lucide-react";
import { sessionStore, organizacionStore } from "@/stores";

/**
 * UserDropdown
 * Trigger y menú desplegable del perfil de usuario.
 * Diseño: [Iniciales con halo celeste] [Nombre] [Chevron]
 *
 * La identidad se lee de `organizacionStore.usuario`. Antes estaba escrita a mano
 * —«Musharof», «Musharof Chowdhury», `randomuser@pimjo.com` y la foto
 * `/images/user/owner.png`—, así que la cabecera de **todas** las páginas le
 * atribuía al usuario un nombre, un correo y una cara que no eran los suyos.
 *
 * `UsuarioPerfil` no tiene campo de avatar, así que se pintan **iniciales** en vez
 * de la foto de un desconocido: es lo que el sistema sabe de verdad. El día que el
 * modelo tenga `avatarUrl`, se cambia aquí y en ningún otro sitio.
 *
 * Es `observer` porque `usuario` cambia —onboarding, `/profile`— y el nombre del
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
      }
    : organizacionStore.usuario;

  /**
   * «¿el rol puede gestionar la organización?» — la misma capacidad que exige
   * `/modulos` en `App.tsx`. Se lee por `hasPermission` y no por `esAdmin`
   * (prohibido por el contrato de acceso, §1.8): el permiso es el hecho, el rol
   * es una de sus fuentes.
   */
  const puedeIrAlLanzador = sessionStore.hasPermission("team.manage");

  const iniciales = usuario
    ? `${usuario.nombre.charAt(0)}${usuario.apellido?.charAt(0) ?? ""}`.toUpperCase()
    : "";
  const nombreCompleto = usuario
    ? `${usuario.nombre} ${usuario.apellido ?? ""}`.trim()
    : "Mi cuenta";

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleLogout = () => {
    closeDropdown();
    // `logout()` no existe en `SessionStore` —el método real es `reset()`, con el
    // docblock «Limpia la sesión (ej. al cerrar sesión)»—. Este botón lanzaba un
    // TypeError al pulsarlo: el sidebar cerraba sesión y el menú de usuario no.
    sessionStore.reset();
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
            El halo era `#E0E2FD`, un lila escrito a mano que no existe en
            `Esencia_necto` —ni en `theme.css`— y que por tanto no cambiaba con
            el tema. Ahora es el celeste de la guía (`accent-200`), que sí es
            token y tiene su variante oscura.
            Sin `avatarUrl` en el modelo se pintan iniciales; si no hay sesión
            de usuario, un glifo genérico. */}
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-200 p-0.5 overflow-hidden dark:bg-accent-500/25">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-medium uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {iniciales || <User className="size-4 text-gray-400" />}
          </span>
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
        {/* Cabecera del usuario. Sin `usuario` no se inventa un correo: la línea
            simplemente no se pinta. */}
        <div className="px-2 pt-1 pb-2">
          <span className="block font-bold text-gray-900 text-sm dark:text-white">
            {nombreCompleto}
          </span>
          {usuario?.email && (
            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400 truncate">
              {usuario.email}
            </span>
          )}
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

          {/* Configuración de la organización — módulos y conectores.
              Decía «Configuración de la cuenta» y llevaba a la configuración de la
              ORGANIZACIÓN: cuenta y organización no son lo mismo, y «Editar perfil»
              ya cubre lo de la cuenta. Se corrigió la etiqueta, no el destino. */}
          <li>
            <ShellDropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/configuracion"
              className="flex items-center gap-3 px-2.5 py-2 font-medium text-gray-700 rounded-xl group text-sm hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/70 dark:hover:text-white transition-colors"
            >
              <Settings className="size-4.5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" />
              <span>Configuración de la organización</span>
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

          {/* Idioma — informativo, no un control: no hay i18n. Decía «English 🇺🇸»
              mientras toda la interfaz está en español. */}
          <li>
            <div className="flex items-center justify-between px-2.5 py-2 font-medium text-gray-700 rounded-xl text-sm hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/70 transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="size-4.5 text-gray-500 dark:text-gray-400" />
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

        {/* Workspace — de vuelta al Lanzador de Módulos (`/modulos`).
            Va destacado —fondo de marca, no el gris de las opciones de arriba—
            porque no es una preferencia de la cuenta: es salir de donde estás.
            Separado del bloque de perfil por la misma línea que separa «Cerrar
            sesión», para que se lea como acción de navegación y no de ajustes.

            El rótulo es «Workspace» a secas. Decía «Cambiar de Módulo /
            Workspace» y nombraba dos cosas que son la misma: `/modulos` es
            «Módulos de la organización» y es el Lanzador; «Workspace» era el
            nombre viejo de esa pantalla, retirado porque describía a la
            ORGANIZACIÓN con el nombre de otra cosa. Aquí se conserva porque es
            el término que el usuario reconoce, pero una sola vez y no en
            conflicto con «Módulo».

            COMPUERTA `team.manage`. `/modulos` gestiona la pertenencia de la
            organización (instalar, desinstalar) y la ruta exige lo mismo que
            `/configuracion` — ver `App.tsx`. Sin esta condición, un rol con
            `orders.read` y sin `team.manage` vería la opción, la pulsaría y
            aterrizaría en «No tienes acceso a esta sección»: un control visible
            que el rol no puede ejecutar, que es lo que el contrato de acceso
            manda **ocultar**. Es el mismo defecto que se retiró del pie del
            sidebar (`Ayuda` sí, `Configuración` no) y de `SeccionSinConectar`;
            no se reintroduce aquí por copiar la spec al pie de la letra. */}
        {puedeIrAlLanzador && (
          <>
            <ShellDropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/modulos"
              className="flex items-center gap-3 px-2.5 py-2 font-medium text-brand-700 rounded-xl group text-sm bg-brand-50 hover:bg-brand-100 dark:text-brand-300 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 transition-colors"
            >
              <LayoutGrid className="size-4.5 text-brand-500 group-hover:text-brand-600 dark:text-brand-400" />
              <span>Workspace</span>
            </ShellDropdownItem>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          </>
        )}

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
});

export default UserDropdown;
