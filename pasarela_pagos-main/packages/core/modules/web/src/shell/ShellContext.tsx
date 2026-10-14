/**
 * ShellContext — Configuration provider for shell customization.
 *
 * Allows consumers to override shell defaults (icons, etc.) without
 * modifying the shell source. If no ShellProvider is rendered, all
 * components use built-in defaults.
 */

import { createContext, useContext, type ReactNode } from "react";
import { ChevronDownIcon, HorizontaLDots } from "@/shell/icons";

/**
 * @kgId 833ea17b5704
 */
export interface ShellConfig {
  icons: {
    /** Icon for submenu expand/collapse toggle in MenuItem */
    chevronDown: ReactNode;
    /** Icon shown in MenuSectionHeader when sidebar is collapsed */
    sectionCollapsed: ReactNode;
  };
}

const defaultConfig: ShellConfig = {
  icons: {
    chevronDown: <ChevronDownIcon className="w-5 h-5" />,
    sectionCollapsed: <HorizontaLDots className="size-6" />,
  },
};

const ShellConfigContext = createContext<ShellConfig>(defaultConfig);

interface ShellProviderProps {
  config?: Partial<ShellConfig>;
  children: ReactNode;
}

/**
 * Wraps the shell to provide custom configuration.
 * Merges provided config with defaults — only override what you need.
 *
 * @example
 * ```tsx
 * <ShellProvider config={{ icons: { chevronDown: <MyChevron /> } }}>
 *   <AppShell />
 * </ShellProvider>
 * ```
 * @kgId 59d1f6a570c8
 */
export const ShellProvider: React.FC<ShellProviderProps> = ({ config, children }) => {
  const merged: ShellConfig = {
    icons: {
      ...defaultConfig.icons,
      ...config?.icons,
    },
  };

  return (
    <ShellConfigContext.Provider value={merged}>
      {children}
    </ShellConfigContext.Provider>
  );
};

/**
 * Access the shell configuration from any shell component.
 * Returns defaults if no ShellProvider is rendered above.
 * @kgId a05252fd21e3
 */
export const useShellConfig = (): ShellConfig => {
  return useContext(ShellConfigContext);
};
