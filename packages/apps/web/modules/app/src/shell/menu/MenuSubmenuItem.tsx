import { useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { MenuBadge } from '@/shell/menu/MenuBadge';

interface MenuSubmenuItemProps {
  /** Item display name */
  name: string;
  /** Navigation path */
  path?: string;
  /** Action on click */
  onClick?: () => void;
  /** Explicit active override */
  active?: boolean;
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
  onClick,
  active: explicitActive,
  isNew = false,
  isPro = false,
  isActive = () => false,
}) => {
  const active = explicitActive !== undefined ? explicitActive : (path ? isActive(path) : false);
  const itemRef = useRef<HTMLLIElement>(null);

  // Scroll into view on initial mount if active
  useEffect(() => {
    if (active && itemRef.current) {
      const timer = setTimeout(() => {
        itemRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []); // Only on mount

  const itemClass = `menu-dropdown-item cursor-pointer w-full text-left ${
    active ? 'menu-dropdown-item-active font-semibold' : 'menu-dropdown-item-inactive'
  }`;

  if (onClick || !path) {
    return (
      <li ref={itemRef}>
        <button
          type="button"
          onClick={onClick}
          className={itemClass}
        >
          <span>{name}</span>
          {(isNew || isPro) && (
            <span className="flex items-center gap-1 ml-auto">
              {isNew && <MenuBadge variant="new" isActive={active} />}
              {isPro && <MenuBadge variant="pro" isActive={active} />}
            </span>
          )}
        </button>
      </li>
    );
  }

  return (
    <li ref={itemRef}>
      <Link
        to={path}
        className={itemClass}
      >
        <span>{name}</span>
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
