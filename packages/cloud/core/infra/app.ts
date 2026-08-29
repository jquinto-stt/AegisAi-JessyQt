/// <reference path="../../cloud/core/.sst/platform/config.d.ts" />

import { Stack } from '@webiai/sdk.infra';
import type { CloudCoreEnv } from './env.js';
import { Auth, Params } from './factories/index.js';

/**
 * CloudCore — Infrastructure Stack for Necto
 *
 * Provisions shared base infrastructure:
 * - VPC: Networking layer (Public and Private Subnets)
 * - Cognito User Pool + Client (Authentication)
 * - SSM Parameters (Cross-stack contracts)
 */
export class CloudCore extends Stack<CloudCoreEnv> {
  readonly networking: {
    vpc: sst.aws.Vpc;
  } = {} as any;

  readonly auth: {
    userPool: sst.aws.CognitoUserPool;
    client: Auth.ClientType;
  } = {} as any;

  initNetworking(): this {
    const vpc = new sst.aws.Vpc('NectoVpc', {
      nat: 'ec2',
      az: 2,
    });
    Object.assign(this.networking, { vpc });
    return this;
  }

  initAuth(): this {
    const userPool = new sst.aws.CognitoUserPool('Auth@UserPool', {
      usernames: ['email'],
    });
    const client = userPool.addClient('Auth@Client');
    Object.assign(this.auth, { userPool, client });
    return this;
  }

  initParameters(): this {
    Params.ProjectInfo(this);
    Params.AuthConfig(this, this.auth.userPool, this.auth.client);
    return this;
  }

  async run() {
    this.initNetworking();
    this.initAuth();
    this.initParameters();
  }
}

export default () => new CloudCore();
