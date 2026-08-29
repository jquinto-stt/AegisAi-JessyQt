/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * Database Factory — Creates DynamoDB tables for Necto modules.
 *
 * Single-table design with GSI for flexible querying:
 * - PK/SK for primary access patterns (Pedidos and Inventarios)
 * - GSI1 for status and category queries
 */
export interface NectoTableConfig {
  onDemand?: boolean;
}

export function createNectoTable(_config?: NectoTableConfig) {
  const table = new sst.aws.Dynamo('NectoTable', {
    fields: {
      pk: 'string',
      sk: 'string',
      gsi1pk: 'string',
      gsi1sk: 'string',
    },
    primaryIndex: {
      hashKey: 'pk',
      rangeKey: 'sk',
    },
    globalIndexes: {
      gsi1: {
        hashKey: 'gsi1pk',
        rangeKey: 'gsi1sk',
      },
    },
  });

  return table;
}
