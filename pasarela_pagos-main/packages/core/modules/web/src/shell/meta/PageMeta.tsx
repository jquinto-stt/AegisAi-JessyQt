import { Helmet, HelmetProvider } from "react-helmet-async";

interface PageMetaProps {
  /** Page title - appears in browser tab */
  title: string;
  /** Meta description for SEO */
  description?: string;
}

/**
 * PageMeta - Manages document head meta tags
 * 
 * Updates the browser tab title and meta description dynamically.
 * Requires HelmetProvider to be wrapped around the app.
 * 
 * @example
 * <PageMeta 
 *   title="Dashboard" 
 *   description="Main dashboard page" 
 * />
 * @kgId d8a10ba6cc45
 */
export const PageMeta: React.FC<PageMetaProps> = ({ title, description }) => (
  <Helmet>
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
  </Helmet>
);

/**
 * AppMetaProvider - Wrapper that enables PageMeta functionality
 * 
 * Must wrap the entire app for PageMeta to work.
 * 
 * @example
 * // In your entry point (index.tsx)
 * <AppMetaProvider>
 *   <App />
 * </AppMetaProvider>
 * @kgId 2b47479de1ca
 */
export const AppMetaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <HelmetProvider>{children}</HelmetProvider>
);

export default PageMeta;
