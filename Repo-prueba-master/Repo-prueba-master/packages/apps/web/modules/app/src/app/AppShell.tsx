import { Outlet } from "react-router";
import { 
  BaseAppShell, 
  BaseAppHeader, 
  ToggleAppSidebar,
} from "@/shell";
import { ThemeToggleButton } from "@/shell";
import { AppSidebar } from "@/app/AppSidebar";
import { AppFooter } from "@/shell/footer";

// ═══════════════════════════════════════════════════════════════════════════
// HEADER ICONS
// ═══════════════════════════════════════════════════════════════════════════

const NotificationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const UserIconOutline = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// APP HEADER
// ═══════════════════════════════════════════════════════════════════════════

const AppHeader = () => (
  <BaseAppHeader
    leftContent={
      <div className="flex items-center gap-4">
        <ToggleAppSidebar />
      </div>
    }
  >
    <div className="flex items-center gap-2">
      <button className="flex h-10 w-10 items-center justify-center rounded-full text-secondary-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
        <NotificationIcon />
      </button>
      <button className="flex h-10 w-10 items-center justify-center rounded-full text-secondary-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
        <UserIconOutline />
      </button>
      <ThemeToggleButton />
    </div>
  </BaseAppHeader>
);

// ═══════════════════════════════════════════════════════════════════════════
// APP SHELL - Clean layout wrapper for new applications
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AppShell is a minimal layout wrapper for new applications.
 * It provides a clean sidebar and header, ready to be customized.
 * 
 * For a full-featured demo with TailAdmin-style menu, see `demo/DemoShell`.
 * 
 * Usage in App.tsx:
 * ```tsx
 * <Routes>
 *   <Route element={<AppShell />}>
 *     <Route path="/" element={<Dashboard />} />
 *     <Route path="/users" element={<Users />} />
 *   </Route>
 * </Routes>
 * ```
 * @kgId 6886ae306c98
 */
export const AppShell = () => {
  return (
    <BaseAppShell
      sidebar={<AppSidebar />}
      header={<AppHeader />}
      footer={<AppFooter />}
    >
      <Outlet />
    </BaseAppShell>
  );
};

export default AppShell;
