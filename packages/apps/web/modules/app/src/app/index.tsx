import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@/index.css";
import App from "@/app/App";
import { AppMetaProvider } from "@/shell/meta";
import { ShellProvider } from "@/shell";

/**
 * App entry point - Clean starter application
 * 
 * Run with: npm run dev
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppMetaProvider>
      <ShellProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ShellProvider>
    </AppMetaProvider>
  </StrictMode>
);

// Re-exports for library usage
export { AppShell } from "@/app/AppShell";
export { AppSidebar } from "@/app/AppSidebar";
