/// <reference path="../.sst/platform/config.d.ts" />

import { Env, Config } from '@webiai/sdk.core';
import { Stack } from '@webiai/sdk.infra/util/stack';
import { resources } from '@webiai/sdk.infra/util/resources';
import { DataExport, type DataExportHydrated } from '@webiai/sdk.infra/util/data-export';
import { SstContext } from '@webiai/sdk.infra/util/sst-context';
import { CognitoUserPoolClient, type CognitoUserPoolClientHydrated } from '@webiai/sdk.infra/aws/cognito/UserPoolClient';
import { appWebEnvVisitor, type AppWebEnv } from './env.js';

/**
 * AppWeb — Frontend Deployment Stack
 *
 * Restores shared config from cloud.core and srv.api, then deploys
 * the React SPA as a static site on S3 + CloudFront.
 *
 * The frontend receives environment variables at build time:
 * - VITE_API_URL: The API Gateway URL from srv.api
 * - VITE_COGNITO_USER_POOL_ID: From cloud.core
 * - VITE_COGNITO_CLIENT_ID: From cloud.core
 * - VITE_COGNITO_REGION: From cloud.core
 */
export class AppWeb extends Stack<AppWebEnv> {
  // --- Resource Groups ---
  readonly shared = resources<{ authConfig: any; apiConfig: any; client: any }>();
  readonly site = resources<{ staticSite: any }>();

  constructor() {
    super(() => ({
      app: Env.var('SST_APP').string()!,
      stack: Env.var('SST_STACK').optional.string(),
      retain: Env.var('SST_RETAIN').optional.bool(),
      home: 'aws',
    }), appWebEnvVisitor);
  }

  async run(): Promise<void> {
    await super.run();

    // Phase 1: Restore shared config from other stacks
    await this.initRestoreShared();

    // Phase 2: Deploy the SPA
    await this.initSite();

    // Phase 3: Register callback URLs in Cognito
    await this.initAuth();
  }

  /**
   * Phase 1 — Restore Shared Config
   *
   * Reads auth config (from cloud.core) and API config (from srv.api).
   */
  private async initRestoreShared(): Promise<void> {
    // Auth config: user pool ID, client ID, region
    this.shared.authConfig = await DataExport.restoreFrom(this, {
      urnNamespace: ['stt', 'Core'],
      resourceName: 'Config.Auth',
      stack: 'CloudCore',
    });

    // API config: API URL
    this.shared.apiConfig = await DataExport.restoreFrom(this, {
      urnNamespace: ['stt', 'Api'],
      resourceName: 'Config.Api',
      stack: 'SrvApi',
    });

    // Cognito Client (for addCallbackUrl)
    this.shared.client = await CognitoUserPoolClient.restoreFrom(this, {
      urnNamespace: ['stt', 'Core'],
      resourceName: 'Cognito.Client',
      stack: 'CloudCore',
    });
  }

  /**
   * Phase 2 — Deploy Static Site
   *
   * Deploys the Vite-built React app to S3 + CloudFront.
   * Injects environment variables at build time via VITE_ prefix.
   */
  private async initSite(): Promise<void> {
    const authConfig = this.shared.authConfig as DataExportHydrated<{
      userPoolId: string;
      clientId: string;
      region: string;
    }>;

    const apiConfig = this.shared.apiConfig as DataExportHydrated<{
      apiUrl: string;
      tableName: string;
    }>;

    const isDev = SstContext.dev;

    if (!isDev) {
      // Production: S3 + CloudFront static site
      this.site.staticSite = new sst.aws.StaticSite('TurnosWeb', {
        path: 'modules/app',
        build: {
          command: 'npm run build',
          output: 'dist',
        },
        environment: {
          VITE_API_URL: apiConfig.data.apiUrl,
          VITE_COGNITO_USER_POOL_ID: authConfig.data.userPoolId,
          VITE_COGNITO_CLIENT_ID: authConfig.data.clientId,
          VITE_COGNITO_REGION: authConfig.data.region,
        },
      });
    }
    // In dev mode, Vite dev server runs locally (no deployment needed)
  }

  /**
   * Phase 3 — Auth Integration
   *
   * Adds the deployed site URL as a callback/logout URL in the Cognito Client.
   * This allows the production frontend to complete OAuth flows.
   */
  private async initAuth(): Promise<void> {
    const isDev = SstContext.dev;
    const client = this.shared.client as CognitoUserPoolClientHydrated;

    if (!isDev && this.site.staticSite$) {
      const siteUrl = this.site.staticSite.url;

      // Add production callback/logout URLs to Cognito
      client.addCallbackUrl('ProdCallback', `${siteUrl}/callback`);
      client.addLogoutUrl('ProdLogout', `${siteUrl}/logout`);
    }
  }
}

/**
 * Factory function — entry point for sst.config.ts
 */
export default () => {
  Config.set('settings.logger.timestamp', false);
  Config.set('settings.logger.colorize', true);
  Config.set('settings.logger.data.style', 'compact');

  return new AppWeb();
};
