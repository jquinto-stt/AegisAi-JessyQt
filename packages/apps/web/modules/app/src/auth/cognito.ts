import { CognitoUserPool } from 'amazon-cognito-identity-js';

const userPoolId = import.meta.env.VITE_USER_POOL_ID || import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_localMockPool';
const clientId = import.meta.env.VITE_CLIENT_ID || import.meta.env.VITE_COGNITO_CLIENT_ID || 'localMockClient';

const poolData = {
  UserPoolId: userPoolId,
  ClientId: clientId,
};

// El backend de autenticación en AWS Cognito aún no está listo o el pool client fue dado de baja.
// Para evitar bloqueos (como "User pool client ... does not exist"), por defecto usamos el modo local/demo.
// Cuando el backend esté listo y se desee Cognito real, basta con definir VITE_USE_COGNITO=true en .env.
export const isCognitoConfigured = Boolean(
  import.meta.env.VITE_USE_COGNITO === 'true' &&
  (import.meta.env.VITE_USER_POOL_ID || import.meta.env.VITE_COGNITO_USER_POOL_ID) &&
  (import.meta.env.VITE_CLIENT_ID || import.meta.env.VITE_COGNITO_CLIENT_ID)
);


export const userPool = new CognitoUserPool(poolData);
