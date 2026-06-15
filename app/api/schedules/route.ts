import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Schedules collection endpoint.
 *
 * Note for hackathon scope: live data lives on the client (in
 * ScheduledOrdersProvider/localStorage) so judges can demo the full
 * lifecycle without a database. This endpoint exists to document the
 * production contract:
 *
 *   GET  /api/schedules                  -> list user schedules
 *   POST /api/schedules                  -> create a schedule
 *
 * Production wiring: API Gateway → Lambda → DynamoDB; EventBridge
 * Scheduler creates the recurring trigger; SNS/Pinpoint sends
 * pre-order confirmations.
 */
export async function GET() {
  return NextResponse.json({
    note: 'Schedules in this prototype are client-side via ScheduledOrdersProvider. This endpoint documents the production contract.',
    productionPath: 'API Gateway -> Lambda -> DynamoDB -> EventBridge Scheduler'
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({
    ok: true,
    received: body,
    note: 'In production this would persist to DynamoDB and create an EventBridge Schedule.'
  });
}
