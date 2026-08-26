import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

/**
 * CORS headers.
 *
 * API Gateway HTTP API handles CORS preflight/headers at the gateway level
 * (configured in the Products@Api factory), but we also echo permissive
 * headers here so direct/proxy responses remain browser-friendly.
 */
const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

export function json(
  statusCode: number,
  body: unknown,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

export function ok(body: unknown): APIGatewayProxyStructuredResultV2 {
  return json(200, body);
}

export function created(body: unknown): APIGatewayProxyStructuredResultV2 {
  return json(201, body);
}

export function badRequest(message: string, details?: unknown) {
  return json(400, { error: 'BadRequest', message, details });
}

export function unauthorized(message = 'Unauthorized') {
  return json(401, { error: 'Unauthorized', message });
}

export function serverError(message = 'Internal server error') {
  return json(500, { error: 'InternalServerError', message });
}
