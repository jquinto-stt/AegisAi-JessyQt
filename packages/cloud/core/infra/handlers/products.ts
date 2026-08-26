import { Resource } from 'sst';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { ddb } from './shared/dynamo.js';
import { getOwnerId } from './shared/auth.js';
import { ok, created, badRequest, unauthorized, serverError } from './shared/response.js';

/**
 * Products slice — Lambda handlers.
 *
 * Data model (DynamoDB single-table, per-owner isolation):
 *   pk = ownerId   (Cognito `sub`)
 *   sk = productId (uuid v4)
 *   + name, sku, price, stock, createdAt, updatedAt
 *
 * The table name is injected at runtime via SST resource linking
 * (Resource["Products@Table"].name) — no hardcoded names, no manual env vars.
 */

const TABLE = Resource['Products@Table'].name;

interface ProductInput {
  name: string;
  sku: string;
  price: number;
  stock: number;
}

interface ProductRecord extends ProductInput {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /products — list the authenticated user's products.
 */
export async function list(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> {
  const ownerId = getOwnerId(event);
  if (!ownerId) {
    console.warn('[products.list] missing owner claim');
    return unauthorized('Missing or invalid authentication token');
  }

  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'pk = :owner',
        ExpressionAttributeValues: { ':owner': ownerId },
      }),
    );

    const items = (result.Items ?? []).map(toProduct);
    console.log(`[products.list] owner=${ownerId} count=${items.length}`);
    return ok({ products: items });
  } catch (err) {
    console.error('[products.list] error', err);
    return serverError('Failed to list products');
  }
}

/**
 * POST /products — create a product for the authenticated user.
 */
export async function create(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> {
  const ownerId = getOwnerId(event);
  if (!ownerId) {
    console.warn('[products.create] missing owner claim');
    return unauthorized('Missing or invalid authentication token');
  }

  let payload: Partial<ProductInput>;
  try {
    payload = JSON.parse(event.body ?? '{}');
  } catch {
    return badRequest('Request body is not valid JSON');
  }

  const validation = validate(payload);
  if (validation.length > 0) {
    return badRequest('Validation failed', validation);
  }

  const now = new Date().toISOString();
  const record: ProductRecord = {
    id: uuidv4(),
    ownerId,
    name: payload.name!.trim(),
    sku: payload.sku!.trim(),
    price: payload.price!,
    stock: payload.stock!,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          pk: ownerId,
          sk: record.id,
          ...record,
        },
        ConditionExpression: 'attribute_not_exists(sk)',
      }),
    );

    console.log(`[products.create] owner=${ownerId} id=${record.id}`);
    return created({ product: record });
  } catch (err) {
    console.error('[products.create] error', err);
    return serverError('Failed to create product');
  }
}

/**
 * Maps a raw DynamoDB item to the public Product shape (drops pk/sk).
 */
function toProduct(item: Record<string, unknown>): ProductRecord {
  return {
    id: item.id as string,
    ownerId: item.ownerId as string,
    name: item.name as string,
    sku: item.sku as string,
    price: item.price as number,
    stock: item.stock as number,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

/**
 * Validates a product payload. Returns a list of error messages (empty = valid).
 */
function validate(p: Partial<ProductInput>): string[] {
  const errors: string[] = [];

  if (typeof p.name !== 'string' || p.name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  }
  if (typeof p.sku !== 'string' || p.sku.trim().length === 0) {
    errors.push('sku is required and must be a non-empty string');
  }
  if (typeof p.price !== 'number' || Number.isNaN(p.price) || p.price < 0) {
    errors.push('price is required and must be a number >= 0');
  }
  if (
    typeof p.stock !== 'number' ||
    !Number.isInteger(p.stock) ||
    p.stock < 0
  ) {
    errors.push('stock is required and must be an integer >= 0');
  }

  return errors;
}
