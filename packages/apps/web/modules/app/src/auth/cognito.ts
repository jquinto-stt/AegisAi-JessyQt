import { CognitoUserPool } from 'amazon-cognito-identity-js';

const userPoolId = import.meta.env.VITE_USER_POOL_ID || import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_localMockPool';
const clientId = import.meta.env.VITE_CLIENT_ID || import.meta.env.VITE_COGNITO_CLIENT_ID || 'localMockClient';

const poolData = {
  UserPoolId: userPoolId,
  ClientId: clientId,
};

export const isCognitoConfigured = Boolean(
  (import.meta.env.VITE_USER_POOL_ID || import.meta.env.VITE_COGNITO_USER_POOL_ID) &&
  (import.meta.env.VITE_CLIENT_ID || import.meta.env.VITE_COGNITO_CLIENT_ID)
);

export const userPool = new CognitoUserPool(poolData);
