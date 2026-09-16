import { useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { MenuBadge } from '@/shell/menu/MenuBadge';

interface MenuSubmenuItemProps {
  /** Item display name */
  name: string;
  /** Navigation path */
  path: string;
  /** Show "NEW" badge */
  isNew?: boolean;
  /** Show "PRO" badge */
  isPro?: boolean;
  /** Callback to check if path is active */
  isActive?: (path: string) => boolean;
}

/**
 * @kgId 7a35f4bb3188
 */
export const MenuSubmenuItem: React.FC<MenuSubmenuItemProps> = ({
  name,
  path,
  isNew = false,
  isPro = false,
  isActive = () => false,
}) => {
  const active = isActive(path);
  const itemRef = useRef<HTMLLIElement>(null);

  // Scroll into view on initial mount if active
  useEffect(() => {
    if (active && itemRef.current) {
      // Small delay to ensure the submenu is expanded first
      const timer = setTimeout(() => {
        itemRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []); // Only on mount

  return (
    <li ref={itemRef}>
      <Link
        to={path}
        className={`menu-dropdown-item ${
          active ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive'
        }`}
      >
        {name}
        {(isNew || isPro) && (
          <span className="flex items-center gap-1 ml-auto">
            {isNew && <MenuBadge variant="new" isActive={active} />}
            {isPro && <MenuBadge variant="pro" isActive={active} />}
          </span>
        )}
      </Link>
    </li>
  );
};

export default MenuSubmenuItem;
