import BasePageLayout from "@/layouts/base-page/BasePageLayout";
import BasePageHeader from "@/layouts/base-page/BasePageHeader";
import { Card, CardTitle, CardDescription } from "@/elements/ui/card";
import { PageMeta } from "@/shell/meta";

/**
 * WelcomePage - Página de bienvenida para aplicaciones nuevas
 * 
 * Esta página se muestra por defecto en la ruta "/".
 * Demuestra la estructura base de una página usando BasePageLayout.
 * Reemplázala con tu propio Dashboard o página principal.
 * @kgId ed0bd46a920d
 */
export const WelcomePage = () => {
  return (
    <>
      <PageMeta title="Welcome" description="Welcome to Elements starter app" />
      <BasePageLayout header={
        <BasePageHeader 
          title="Welcome" 
          breadcrumbItems={[
            { label: "Home", href: "/" },
            { label: "Welcome" }
          ]} 
        />
      }>
      <Card>
        <CardTitle>Welcome to Elements</CardTitle>
        <CardDescription>
          This is a clean starter shell. Get started by customizing:
        </CardDescription>
        <ul className="mt-4 space-y-2 text-gray-500 dark:text-gray-400">
          <li>
            • Sidebar menu in{" "}
            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">
              src/app/AppSidebar.tsx
            </code>
          </li>
          <li>
            • Header in{" "}
            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">
              src/app/AppShell.tsx
            </code>
          </li>
          <li>
            • Routes in{" "}
            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">
              src/app/App.tsx
            </code>
          </li>
        </ul>
      </Card>
      </BasePageLayout>
    </>
  );
};

export default WelcomePage;
