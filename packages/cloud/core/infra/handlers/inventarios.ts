import { Resource } from 'sst';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './shared/dynamo.js';
import { getOwnerId } from './shared/auth.js';
import { ok, created, badRequest, unauthorized, serverError } from './shared/response.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Necto Inventarios Handlers
 */
export const list = async (event: any) => {
  try {
    const ownerId = getOwnerId(event);
    if (!ownerId) return unauthorized();

    const result = await ddb.send(
      new QueryCommand({
        TableName: (Resource as any)['Inventarios@Table'].name,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `OWNER#${ownerId}`,
          ':prefix': 'ITEM#',
        },
      }),
    );

    return ok({ items: result.Items ?? [] });
  } catch (err: any) {
    return serverError(err.message);
  }
};

export const create = async (event: any) => {
  try {
    const ownerId = getOwnerId(event);
    if (!ownerId) return unauthorized();

    const body = event.body ? JSON.parse(event.body) : {};
    const itemId = body.id || uuidv4();
    const item = {
      pk: `OWNER#${ownerId}`,
      sk: `ITEM#${itemId}`,
      id: itemId,
      code: body.code || `INV-${Date.now().toString().slice(-4)}`,
      name: body.name,
      category: body.category || 'General',
      clientName: body.clientName || 'Default',
      status: body.status || 'Activo',
      condition: body.condition || 'Buena',
      location: body.location || 'Almacén Central',
      lastUpdated: new Date().toISOString(),
      evidenceCount: body.evidenceCount || 0,
      evidenceType: body.evidenceType || 'foto',
      notes: body.notes || '',
      createdAt: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: (Resource as any)['Inventarios@Table'].name,
        Item: item,
      }),
    );

    return created({ item });
  } catch (err: any) {
    return serverError(err.message);
  }
};

export const updateStatus = async (event: any) => {
  try {
    const ownerId = getOwnerId(event);
    if (!ownerId) return unauthorized();

    const itemId = event.pathParameters?.id;
    if (!itemId) return badRequest('Missing item id');

    const body = event.body ? JSON.parse(event.body) : {};

    await ddb.send(
      new UpdateCommand({
        TableName: (Resource as any)['Inventarios@Table'].name,
        Key: {
          pk: `OWNER#${ownerId}`,
          sk: `ITEM#${itemId}`,
        },
        UpdateExpression: 'SET #status = :status, #cond = :cond, lastUpdated = :now',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#cond': 'condition',
        },
        ExpressionAttributeValues: {
          ':status': body.status || 'Activo',
          ':cond': body.condition || 'Buena',
          ':now': new Date().toISOString(),
        },
      }),
    );

    return ok({ success: true });
  } catch (err: any) {
    return serverError(err.message);
  }
};
