import { Breadcrumb, type BreadcrumbItem } from "@/elements/ui/breadcrumb";

/**
 * @kgId 11e0789d4738
 */
export interface BasePageHeaderProps {
  title: string;
  breadcrumbItems?: BreadcrumbItem[];
}

/**
 * @kgId f4bac5e30167
 */
const BasePageHeader: React.FC<BasePageHeaderProps> = ({
  title,
  breadcrumbItems,
}) => {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        {title}
      </h2>
      {breadcrumbItems && <Breadcrumb items={breadcrumbItems} separator="chevron" />}
    </div>
  );
};

export default BasePageHeader;
