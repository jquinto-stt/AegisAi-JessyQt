import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME!;

interface APIGatewayEvent {
  httpMethod: string;
  pathParameters?: Record<string, string>;
  body?: string;
  requestContext?: {
    authorizer?: {
      jwt?: {
        claims?: Record<string, string>;
      };
    };
  };
}

/**
 * Encuesta Lambda — Handles survey creation and retrieval.
 *
 * POST /encuestas — Create a satisfaction survey for a completed turno
 * GET /encuestas/{turnoId} — Get the survey for a specific turno
 */
export async function handler(event: APIGatewayEvent) {
  const method = event.httpMethod;
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;

  if (method === 'POST') {
    return createEncuesta(event, userId!);
  }

  if (method === 'GET') {
    const turnoId = event.pathParameters?.turnoId;
    if (!turnoId) {
      return response(400, { error: 'turnoId is required' });
    }
    return getEncuesta(turnoId);
  }

  return response(405, { error: 'Method not allowed' });
}

async function createEncuesta(event: APIGatewayEvent, userId: string) {
  const body = JSON.parse(event.body || '{}');
  const { turnoId, calificacion, comentario } = body;

  if (!turnoId || !calificacion || calificacion < 1 || calificacion > 5) {
    return response(400, {
      error: 'turnoId and calificacion (1-5) are required',
    });
  }

  const item = {
    pk: `TURNO#${turnoId}`,
    sk: 'ENCUESTA',
    turnoId,
    userId,
    calificacion,
    comentario: comentario || '',
    createdAt: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
  }));

  return response(201, { message: 'Encuesta creada', encuesta: item });
}

async function getEncuesta(turnoId: string) {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND sk = :sk',
    ExpressionAttributeValues: {
      ':pk': `TURNO#${turnoId}`,
      ':sk': 'ENCUESTA',
    },
  }));

  if (!result.Items || result.Items.length === 0) {
    return response(404, { error: 'Encuesta not found' });
  }

  return response(200, { encuesta: result.Items[0] });
}

function response(statusCode: number, body: Record<string, any>) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
