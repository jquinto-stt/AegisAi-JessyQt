import BasePageLayout from "@/layouts/base-page/BasePageLayout";
import BasePageHeader from "@/layouts/base-page/BasePageHeader";
import { Card, CardTitle, CardDescription } from "@/elements/ui/card";
import { PageMeta } from "@/shell/meta";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

/**
 * PlaceholderPage — Temporary page for sections not yet implemented.
 * Renders inside the app shell so navigation and the active sidebar
 * state can be verified before the real content exists.
 */
export const PlaceholderPage = ({ title, description }: PlaceholderPageProps) => {
  return (
    <>
      <PageMeta title={title} description={description ?? title} />
      <BasePageLayout
        header={
          <BasePageHeader
            title={title}
            breadcrumbItems={[{ label: "Inicio", href: "/dashboard" }, { label: title }]}
          />
        }
      >
        <Card>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description ?? "Esta seccion esta en construccion."}
          </CardDescription>
        </Card>
      </BasePageLayout>
    </>
  );
};

export default PlaceholderPage;
