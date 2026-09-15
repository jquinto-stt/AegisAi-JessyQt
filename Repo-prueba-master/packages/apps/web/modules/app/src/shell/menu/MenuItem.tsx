import { useState, useRef, useEffect, ReactNode } from 'react';
import { Link } from 'react-router';
import { observer } from 'mobx-react-lite';
import { MenuBadge } from '@/shell/menu/MenuBadge';
import { useSidebarContext } from '@/shell/sidebar/SidebarContext';
import { useShellConfig } from '@/shell/ShellContext';

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
  const isSimpleLink = !!path && !hasChildren;

  // Check if any child is active
  const hasActiveChild = subItemPaths.some(item => isActive(item.path));

  // Determine if this item is active
  // For expandable items: only active styling if a child is active (not just because it's open)
  // For simple links: active if the path matches
  const active = isSimpleLink ? isActive(path) : hasActiveChild;

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

  // Render as link
  if (isSimpleLink) {
    const handleLinkClick = () => {
      if (isControlled) {
        onMenuToggle(null);
      }
    };

    return (
      <li ref={itemRef}>
        <Link to={path} className={itemClasses} onClick={handleLinkClick}>
          <span className={iconClasses}>{icon}</span>
          {showExpanded && <span className="menu-item-text">{name}</span>}
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
