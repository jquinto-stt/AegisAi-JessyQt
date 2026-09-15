/// <reference path="../../.sst/platform/config.d.ts" />

import { CognitoUserPool, type CognitoUserPoolArgs } from '@webiai/sdk.infra/aws/cognito/UserPool';
import { CognitoUserPoolClient, type CognitoUserPoolClientArgs } from '@webiai/sdk.infra/aws/cognito/UserPoolClient';
import type { WebiAiResourceOptions } from '@webiai/sdk.infra/util/webiai-resource';
import * as pulumi from '@pulumi/pulumi';

/**
 * Cognito Factory — Creates User Pool + Client for authentication.
 *
 * Features:
 * - User Pool with email as username
 * - Password policy (min 8 chars, requires uppercase + lowercase + number)
 * - User groups: "admin" and "usuario"
 * - App Client with Authorization Code + PKCE flow (for SPA)
 * - Self-registration enabled (users sign up themselves)
 */
export interface CreateCognitoConfig {
  region: string;
}

export interface CognitoResources {
  userPool: CognitoUserPool;
  client: CognitoUserPoolClient;
  adminGroup: aws.cognito.UserGroup;
  userGroup: aws.cognito.UserGroup;
  domain: aws.cognito.UserPoolDomain;
}

export function createCognito(config: CreateCognitoConfig): CognitoResources {
  const { region } = config;

  // --- User Pool ---
  const userPoolArgs: CognitoUserPoolArgs = {
    region,

    // Email as login identifier
    usernameAttributes: ['email'],
    autoVerifiedAttributes: ['email'],

    // Password policy
    passwordPolicy: {
      minimumLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
    },

    // Schema: nombre del usuario
    schemas: [
      {
        name: 'name',
        attributeDataType: 'String',
        required: true,
        mutable: true,
        stringAttributeConstraints: {
          minLength: '2',
          maxLength: '100',
        },
      },
    ],

    // Account recovery via email
    accountRecoverySetting: {
      recoveryMechanisms: [
        {
          name: 'verified_email',
          priority: 1,
        },
      ],
    },

    // Verification message
    verificationMessageTemplate: {
      defaultEmailOption: 'CONFIRM_WITH_CODE',
      emailSubject: 'Tu codigo de verificacion - Sistema de Turnos',
      emailMessage: 'Tu codigo de verificacion es: {####}',
    },
  };

  const userPoolOpts: WebiAiResourceOptions = {
    shared: {
      urnNamespace: ['stt', 'Core'],
      resourceName: 'Cognito.UserPool',
      stack: 'CloudCore',
    },
  };

  const userPool = new CognitoUserPool('TurnosUserPool', userPoolArgs, userPoolOpts);

  // --- Cognito Domain (hosted UI) ---
  // Cognito domain names must be lowercase, digits, and hyphens only.
  const domainName = `turnos-${pulumi.getStack().toLowerCase()}`;
  const domain = new aws.cognito.UserPoolDomain('TurnosDomain', {
    domain: domainName,
    userPoolId: userPool.id,
  });

  // --- User Groups ---
  const adminGroup = new aws.cognito.UserGroup('AdminGroup', {
    name: 'admin',
    userPoolId: userPool.id,
    description: 'Administradores del sistema de turnos',
  });

  const userGroup = new aws.cognito.UserGroup('UserGroup', {
    name: 'usuario',
    userPoolId: userPool.id,
    description: 'Usuarios que solicitan turnos',
  });

  // --- App Client (SPA - Authorization Code + PKCE) ---
  const clientArgs: CognitoUserPoolClientArgs = {
    name: 'turnos-web-app',
    userPoolId: userPool.id,
    region,

    // No secret for SPA (public client)
    generateSecret: false,

    // OAuth config
    allowedOauthFlows: ['code'],
    allowedOauthFlowsUserPoolClient: true,
    allowedOauthScopes: ['openid', 'email', 'profile'],
    supportedIdentityProviders: ['COGNITO'],

    // Auth flows
    explicitAuthFlows: [
      'ALLOW_USER_SRP_AUTH',
      'ALLOW_REFRESH_TOKEN_AUTH',
    ],

    // Callback/logout URLs (dev defaults, other stacks add their own via addCallbackUrl)
    callbackUrls: ['http://localhost:5173/callback'],
    logoutUrls: ['http://localhost:5173/logout'],

    // Token validity
    accessTokenValidity: 1,   // 1 hour
    idTokenValidity: 1,       // 1 hour
    refreshTokenValidity: 30, // 30 days
    tokenValidityUnits: {
      accessToken: 'hours',
      idToken: 'hours',
      refreshToken: 'days',
    },

    // Security
    preventUserExistenceErrors: 'ENABLED',
    enableTokenRevocation: true,
  };

  const clientOpts: WebiAiResourceOptions = {
    shared: {
      urnNamespace: ['stt', 'Core'],
      resourceName: 'Cognito.Client',
      stack: 'CloudCore',
    },
  };

  const client = new CognitoUserPoolClient('TurnosWebClient', clientArgs, clientOpts);

  return { userPool, client, adminGroup, userGroup, domain };
}
