import { useState, useRef, useEffect, ReactNode } from 'react';
import { Link } from 'react-router';
import { observer } from 'mobx-react-lite';
import { MenuBadge } from '@/shell/menu/MenuBadge';
import { useSidebarContext } from '@/shell/sidebar/SidebarContext';
import { useShellConfig } from '@/shell/ShellContext';
import { uiStore } from '@/stores';

interface SubItemPath {
  path: string;
}

interface MenuItemProps {
  /** Icon component to display */
  icon: ReactNode;
  /** Menu item label */
  name: string;
  /** Navigation path (makes item a link) */
  path?: string;
  /** Direct onClick action (makes item an action button) */
  onClick?: () => void;
  /** Explicit active state override */
  active?: boolean;
  /** Optional badge */
  badge?: ReactNode;
  /** Show "NEW" badge */
  isNew?: boolean;
  /** Child submenu items */
  children?: ReactNode;
  /** Sub-item paths for auto-expand detection */
  subItemPaths?: SubItemPath[];
  /** Callback to check if path is active */
  isActive?: (path: string) => boolean;
  /** Currently open menu name (for accordion behavior) */
  openMenuName?: string | null;
  /** Callback when this menu is toggled (for accordion behavior) */
  onMenuToggle?: (name: string | null) => void;
}

/**
 * @kgId dbe3f03a1d37
 */
export const MenuItem: React.FC<MenuItemProps> = observer(({
  icon,
  name,
  path,
  onClick,
  active: explicitActive,
  badge,
  isNew = false,
  children,
  subItemPaths = [],
  isActive = () => false,
  openMenuName,
  onMenuToggle,
}) => {
  // Use controlled state if accordion props are provided, otherwise local state
  const isControlled = openMenuName !== undefined && onMenuToggle !== undefined;
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = isControlled ? openMenuName === name : localIsOpen;
  const [submenuHeight, setSubmenuHeight] = useState(0);
  const submenuRef = useRef<HTMLDivElement>(null);

  const { isExpanded: showExpanded } = useSidebarContext();
  const { icons: shellIcons } = useShellConfig();
  const hasChildren = !!children;
  const isActionBtn = !!onClick && !hasChildren;
  const isSimpleLink = !!path && !hasChildren && !isActionBtn;

  // Check if any child is active
  const hasActiveChild = subItemPaths.some(item => isActive(item.path));

  // Determine if this item is active
  const active = explicitActive !== undefined 
    ? explicitActive 
    : isSimpleLink 
    ? isActive(path) 
    : hasActiveChild;

  // Measure submenu height when open state changes
  useEffect(() => {
    if (submenuRef.current) {
      setSubmenuHeight(submenuRef.current.scrollHeight);
    }
  }, [isOpen, children]);

  // Auto-expand if a child is active (only for uncontrolled mode)
  useEffect(() => {
    if (hasActiveChild && !isControlled && !localIsOpen) {
      setLocalIsOpen(true);
    }
  }, [hasActiveChild]);

  const handleToggle = () => {
    if (hasChildren) {
      if (isControlled) {
        onMenuToggle(isOpen ? null : name);
      } else {
        setLocalIsOpen(!localIsOpen);
      }
    }
  };

  const iconClasses = `menu-item-icon-size ${
    active ? 'menu-item-icon-active' : 'menu-item-icon-inactive'
  }`;

  const itemClasses = `menu-item group ${
    active ? 'menu-item-active' : 'menu-item-inactive'
  } ${!showExpanded ? 'xl:justify-center' : 'xl:justify-start'}`;

  const itemRef = useRef<HTMLLIElement>(null);

  // Scroll into view on initial mount if active (for simple links)
  useEffect(() => {
    if (active && isSimpleLink && itemRef.current) {
      const timer = setTimeout(() => {
        itemRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []); // Only on mount

  /**
   * ⚠️⚠️ Con la barra **colapsada**, un `MenuItem` con hijos no pintaba nada: el
   * `showExpanded && …` de más abajo sólo dibujaba el icono del padre, y los
   * hijos —el destino real ("Pedidos")— quedaban fuera del DOM. En una barra
   * estrecha eso hacía el destino **inalcanzable**: no había ningún otro enlace
   * al módulo. El icono del padre pasa a ser el acceso directo (con `title` para
   * que el rótulo siga siendo legible), así que un módulo acoplado nunca
   * desaparece por colapsar la barra.
   */
  const collapsedAsAction = !showExpanded && hasChildren;

  // Render as action button
  if (isActionBtn || collapsedAsAction) {
    const handleActionClick = () => {
      if (isControlled) {
        onMenuToggle(null);
      }
      if (onClick) {
        onClick();
      } else {
        // Sin `onClick` propio no hay acción que ejecutar: se expande la barra,
        // que es lo que el usuario querría al pulsar el icono de un grupo.
        uiStore.toggleSidebar();
      }
    };

    return (
      <li ref={itemRef}>
        <button
          type="button"
          onClick={handleActionClick}
          // ⚠️ Colapsado el rótulo no se pinta (`showExpanded && …`), así que el
          // `title` es la única forma de que el usuario sepa qué hace el icono.
          // Antes sólo lo llevaba el caso de grupo: los ítems de acción —los
          // módulos, entre ellos— quedaban como iconos anónimos.
          title={showExpanded ? undefined : name}
          className={`${itemClasses} cursor-pointer`}
        >
          <span className={iconClasses}>{icon}</span>
          {showExpanded && <span className="menu-item-text">{name}</span>}
          {badge && showExpanded && <span className="ml-auto">{badge}</span>}
          {isNew && showExpanded && !badge && (
            <span className="ml-auto absolute right-10">
              <MenuBadge variant="new" isActive={active} />
            </span>
          )}
        </button>
      </li>
    );
  }

  // Render as link
  if (isSimpleLink) {
    const handleLinkClick = () => {
      if (isControlled) {
        onMenuToggle(null);
      }
    };

    return (
      <li ref={itemRef}>
        <Link
          to={path!}
          className={itemClasses}
          onClick={handleLinkClick}
          title={showExpanded ? undefined : name}
        >
          <span className={iconClasses}>{icon}</span>
          {showExpanded && <span className="menu-item-text">{name}</span>}
          {badge && showExpanded && <span className="ml-auto">{badge}</span>}
        </Link>
      </li>
    );
  }

  // Render as expandable button
  return (
    <li>
      <button
        onClick={handleToggle}
        className={`${itemClasses} cursor-pointer`}
      >
        <span className={iconClasses}>{icon}</span>
        {showExpanded && (
          <>
            <span className="menu-item-text">{name}</span>
            {isNew && (
              <span className="ml-auto absolute right-10">
                <MenuBadge variant="new" isActive={active} />
              </span>
            )}
            <span
              className={`ml-auto transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              } ${active ? 'text-brand-500' : ''}`}
            >
              {shellIcons.chevronDown}
            </span>
          </>
        )}
      </button>

      {/* Submenu container with animation */}
      {hasChildren && showExpanded && (
        <div
          ref={submenuRef}
          className="overflow-hidden transition-all duration-300"
          style={{ height: isOpen ? `${submenuHeight}px` : '0px' }}
        >
          <ul className="mt-2 space-y-1 ml-9">
            {children}
          </ul>
        </div>
      )}
    </li>
  );
});

export default MenuItem;
