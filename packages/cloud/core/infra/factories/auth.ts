/// <reference path="../../.sst/platform/config.d.ts" />

import type { CloudCore } from '../app.js';

export namespace Auth {
  export type ClientType = ReturnType<sst.aws.CognitoUserPool['addClient']>;

  export const UserPool = (_app: CloudCore) => {
    return new sst.aws.CognitoUserPool('Auth@UserPool', {
      usernames: ['email'],
    });
  };

  export const Client = (_app: CloudCore, userPool: sst.aws.CognitoUserPool): ClientType => {
    return userPool.addClient('Auth@Client');
  };
}
