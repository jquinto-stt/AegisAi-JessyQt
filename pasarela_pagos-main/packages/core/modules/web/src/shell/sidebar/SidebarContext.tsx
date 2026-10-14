import { createContext, useContext, ReactNode } from 'react';
import { uiStore } from '@/stores';

interface SidebarContextValue {
  /** Whether the sidebar is expanded (showing full content) */
  isExpanded: boolean;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  children: ReactNode;
  /** Override for collapsed state (for showcases) */
  collapsed?: boolean;
}

/**
 * @kgId 246480693041
 */
export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children, collapsed }) => {
  // If collapsed prop is defined, use it as override; otherwise use store
  const isExpanded = collapsed !== undefined 
    ? !collapsed 
    : uiStore.isSidebarVisible;

  return (
    <SidebarContext.Provider value={{ isExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
};

/**
 * @kgId 7c0a6aba0f7e
 */
export const useSidebarContext = (): SidebarContextValue => {
  const context = useContext(SidebarContext);
  
  // Fallback to store if no provider (backwards compatibility)
  if (!context) {
    return { isExpanded: uiStore.isSidebarVisible };
  }
  
  return context;
};
