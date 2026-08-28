import { Resource } from 'sst';
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './shared/dynamo.js';
import { getOwnerId } from './shared/auth.js';
import { ok, created, badRequest, unauthorized, serverError } from './shared/response.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Necto Pedidos Handlers
 */
export const list = async (event: any) => {
  try {
    const ownerId = getOwnerId(event);
    if (!ownerId) return unauthorized();

    const result = await ddb.send(
      new QueryCommand({
        TableName: (Resource as any)['Pedidos@Table'].name,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `OWNER#${ownerId}`,
          ':prefix': 'ORDER#',
        },
      }),
    );

    return ok({ orders: result.Items ?? [] });
  } catch (err: any) {
    return serverError(err.message);
  }
};

export const create = async (event: any) => {
  try {
    const ownerId = getOwnerId(event);
    if (!ownerId) return unauthorized();

    const body = event.body ? JSON.parse(event.body) : {};
    const orderId = body.id || uuidv4();
    const order = {
      pk: `OWNER#${ownerId}`,
      sk: `ORDER#${orderId}`,
      id: orderId,
      customerName: body.customerName,
      customerPhone: body.customerPhone || '',
      deliveryAddress: body.deliveryAddress || '',
      channel: body.channel || 'web',
      type: body.type || 'inmediato',
      status: body.status || 'NUEVO',
      items: body.items || [],
      total: body.total || 0,
      createdAt: new Date().toISOString(),
      estimatedMinutes: body.estimatedMinutes || 30,
      elapsedMinutes: 0,
      urgency: body.urgency || 'A_TIEMPO',
      isAIOrigin: body.isAIOrigin || false,
      aiConfidence: body.aiConfidence || 'Alta',
      history: [
        {
          timestamp: new Date().toISOString(),
          toStatus: body.status || 'NUEVO',
          user: ownerId,
          note: 'Pedido creado',
        },
      ],
    };

    await ddb.send(
      new PutCommand({
        TableName: (Resource as any)['Pedidos@Table'].name,
        Item: order,
      }),
    );

    return created({ order });
  } catch (err: any) {
    return serverError(err.message);
  }
};

export const updateStatus = async (event: any) => {
  try {
    const ownerId = getOwnerId(event);
    if (!ownerId) return unauthorized();

    const orderId = event.pathParameters?.id;
    if (!orderId) return badRequest('Missing order id');

    const body = event.body ? JSON.parse(event.body) : {};
    const newStatus = body.status;

    await ddb.send(
      new UpdateCommand({
        TableName: (Resource as any)['Pedidos@Table'].name,
        Key: {
          pk: `OWNER#${ownerId}`,
          sk: `ORDER#${orderId}`,
        },
        UpdateExpression: 'SET #status = :status, #history = list_append(if_not_exists(#history, :emptyList), :newEvent)',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#history': 'history',
        },
        ExpressionAttributeValues: {
          ':status': newStatus,
          ':emptyList': [],
          ':newEvent': [
            {
              timestamp: new Date().toISOString(),
              toStatus: newStatus,
              user: ownerId,
              note: body.note || `Estado cambiado a ${newStatus}`,
            },
          ],
        },
      }),
    );

    return ok({ success: true });
  } catch (err: any) {
    return serverError(err.message);
  }
};
