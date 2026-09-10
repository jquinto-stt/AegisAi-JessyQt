import { ReactNode } from "react";

/**
 * @kgId 63ec79f2a635
 */
export interface BasePageLayoutProps {
  /** Page header component (typically BasePageHeader) */
  header: ReactNode;
  /** Page content */
  children: ReactNode;
}

/**
 * BasePageLayout - Standard page wrapper
 * 
 * A simple layout container that renders a header slot and content.
 * Does not know about specific header implementations.
 * 
 * @example
 * <BasePageLayout header={<BasePageHeader title="Welcome" />}>
 *   <Card>...</Card>
 * </BasePageLayout>
 * @kgId 209b7bb7a235
 */
const BasePageLayout: React.FC<BasePageLayoutProps> = ({
  header,
  children,
}) => {
  return (
    <div>
      {header}
      {children}
    </div>
  );
};

export default BasePageLayout;
