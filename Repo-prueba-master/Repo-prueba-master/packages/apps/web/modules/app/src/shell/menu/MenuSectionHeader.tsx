import { observer } from 'mobx-react-lite';
import { useSidebarContext } from '@/shell/sidebar/SidebarContext';
import { useShellConfig } from '@/shell/ShellContext';

interface MenuSectionHeaderProps {
  /** Section title text (e.g., "MENU", "SUPPORT", "OTHERS") */
  title: string;
}

/**
 * @kgId 79a434d5cb7b
 */
export const MenuSectionHeader: React.FC<MenuSectionHeaderProps> = observer(({ title }) => {
  const { isExpanded: showExpanded } = useSidebarContext();
  const { icons: shellIcons } = useShellConfig();

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
