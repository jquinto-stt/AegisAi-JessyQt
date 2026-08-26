import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

/**
 * Extracts the authenticated user's Cognito `sub` (subject) claim from the
 * API Gateway JWT authorizer context.
 *
 * The ownerId is derived server-side from the verified token — never from the
 * request body — so a client cannot spoof another user's products.
 *
 * Returns null when no valid claim is present.
 */
export function getOwnerId(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): string | null {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  const sub = claims?.sub;
  if (typeof sub === 'string' && sub.length > 0) {
    return sub;
  }
  return null;
}
