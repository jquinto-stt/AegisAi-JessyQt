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
      <h2 className="mb-4 text-xs flex leading-[20px] text-gray-600 xl:justify-center dark:text-gray-400">
        {shellIcons.sectionCollapsed}
      </h2>
    );
  }

  if (collapsible && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="mb-3 w-full flex items-center justify-between text-xs font-bold text-gray-600 hover:text-ink-title dark:text-gray-400 dark:hover:text-white transition-colors group cursor-pointer select-none text-left"
        aria-expanded={!isCollapsed}
        title={isCollapsed ? `Expandir ${title}` : `Colapsar ${title}`}
      >
        <span>{title}</span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 group-hover:text-ink-title dark:group-hover:text-white ${
            isCollapsed ? "-rotate-90" : "rotate-0"
          }`}
        />
      </button>
    );
  }

  return (
    <h2
      className={`mb-4 text-xs flex leading-[20px] text-gray-600 dark:text-gray-400 ${
        !showExpanded ? 'xl:justify-center' : 'justify-start'
      }`}
    >
      {showExpanded ? title : shellIcons.sectionCollapsed}
    </h2>
  );
});

export default MenuSectionHeader;
