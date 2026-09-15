/**
 * Health Check Lambda — Lightweight endpoint to verify the API is operational.
 */
export async function handler() {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'ok',
      service: 'turnos-api',
      timestamp: new Date().toISOString(),
    }),
  };
}
