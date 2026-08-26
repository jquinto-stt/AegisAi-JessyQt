import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Shared DynamoDB Document Client.
 *
 * Instantiated once per Lambda container (outside the handler) so it is
 * reused across warm invocations. Region is resolved automatically from the
 * Lambda execution environment (AWS_REGION).
 */
const client = new DynamoDBClient({});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});
