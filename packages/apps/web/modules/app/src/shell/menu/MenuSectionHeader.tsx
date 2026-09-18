import { observer } from 'mobx-react-lite';
import { useSidebarContext } from '@/shell/sidebar/SidebarContext';
import { useShellConfig } from '@/shell/ShellContext';
import { ChevronDownIcon } from '@/icons';

interface MenuSectionHeaderProps {
  /** Section title text (e.g., "MENU", "SUPPORT", "OTHERS") */
  title: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
  collapsible?: boolean;
}

/**
 * @kgId 79a434d5cb7b
 */
export const MenuSectionHeader: React.FC<MenuSectionHeaderProps> = observer(({
  title,
  isCollapsed = false,
  onToggle,
  collapsible = false,
}) => {
  const { isExpanded: showExpanded } = useSidebarContext();
  const { icons: shellIcons } = useShellConfig();

  if (!showExpanded) {
    return (
      <h2 className="mb-4 text-xs uppercase flex leading-[20px] text-gray-400 xl:justify-center">
        {shellIcons.sectionCollapsed}
      </h2>
    );
  }

  if (collapsible && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="mb-3 w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors group cursor-pointer select-none text-left"
        aria-expanded={!isCollapsed}
        title={isCollapsed ? `Expandir ${title}` : `Colapsar ${title}`}
      >
        <span>{title}</span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 group-hover:text-gray-300 ${
            isCollapsed ? "-rotate-90" : "rotate-0"
          }`}
        />
      </button>
    );
  }

  return (
    <h2
      className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
        !showExpanded ? 'xl:justify-center' : 'justify-start'
      }`}
    >
      {showExpanded ? title : shellIcons.sectionCollapsed}
    </h2>
  );
});

export default MenuSectionHeader;
