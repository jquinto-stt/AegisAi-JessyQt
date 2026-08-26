/// <reference path="../../.sst/platform/config.d.ts" />

import type { CloudCore } from '../app.js';

export namespace Auth {
  export const UserPool = (app: CloudCore) => {
    return new sst.aws.CognitoUserPool('Auth@UserPool', {
      usernames: ['email'],
    });
  };

  export const Client = (app: CloudCore, userPool: sst.aws.CognitoUserPool) => {
    return userPool.addClient('Auth@Client');
  };
}
