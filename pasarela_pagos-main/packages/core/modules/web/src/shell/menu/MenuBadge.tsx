interface MenuBadgeProps {
  /** Badge variant determines color scheme */
  variant: 'new' | 'pro';
  /** Whether parent item is active (affects background color) */
  isActive?: boolean;
}

/**
 * @kgId ad953d18826a
 */
export const MenuBadge: React.FC<MenuBadgeProps> = ({ variant, isActive = false }) => {
  const baseClass = variant === 'new' ? 'menu-dropdown-badge' : 'menu-dropdown-badge-pro';
  
  const stateClass = variant === 'new'
    ? (isActive ? 'menu-dropdown-badge-active' : 'menu-dropdown-badge-inactive')
    : (isActive ? 'menu-dropdown-badge-pro-active' : 'menu-dropdown-badge-pro-inactive');

  return (
    <span className={`${baseClass} ${stateClass}`}>
      {variant}
    </span>
  );
};

export default MenuBadge;
