/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * Database Factory — Creates DynamoDB table for the queue system.
 *
 * Single-table design with GSI for flexible querying:
 * - PK/SK for primary access patterns (queue turnos, user turnos, encuestas)
 * - GSI1 for admin-centric queries (turnos por admin + estado)
 *
 * Access patterns:
 * 1. Get all turnos in a queue (ordered): PK = QUEUE#{queueId}, SK begins_with TURNO#
 * 2. Get user's turnos: PK = USER#{userId}, SK begins_with TURNO#
 * 3. Get encuesta for a turno: PK = TURNO#{turnoId}, SK = ENCUESTA
 * 4. Get admin's turnos by status: GSI1-PK = ADMIN#{adminId}, GSI1-SK begins_with STATUS#
 */
export interface TurnosTableConfig {
  /** Whether to use on-demand billing (true) or provisioned (false) */
  onDemand?: boolean;
}

export function createTurnosTable(_config?: TurnosTableConfig) {
  const table = new sst.aws.Dynamo('TurnosTable', {
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
