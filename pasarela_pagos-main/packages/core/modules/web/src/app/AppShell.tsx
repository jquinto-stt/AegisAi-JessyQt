import { Outlet } from "react-router";
import { 
  BaseAppShell, 
  BaseAppHeader, 
  ToggleAppSidebar,
} from "@/shell";
import { ThemeToggleButton } from "@/shell";
import { AppSidebar } from "@/app/AppSidebar";

// ═══════════════════════════════════════════════════════════════════════════
// APP HEADER - Minimal header for new applications
// ═══════════════════════════════════════════════════════════════════════════

const AppHeader = () => (
  <BaseAppHeader
    leftContent={
      <div className="flex items-center gap-4">
        <ToggleAppSidebar />
      </div>
    }
  >
    <div className="flex items-center gap-3">
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
    >
      <Outlet />
    </BaseAppShell>
  );
};

export default AppShell;
