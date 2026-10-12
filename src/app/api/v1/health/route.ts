import { jsonResponse } from "@/server/api/validation";
import prisma from "@/lib/db";

export async function GET() {
  let dbStatus = "HEALTHY";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = `UNHEALTHY: ${err instanceof Error ? err.message : String(err)}`;
  }

  return jsonResponse({
    status: dbStatus === "HEALTHY" ? "OK" : "DEGRADED",
    service: "bloom-financial-intelligence",
    version: "1.0.0",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
    components: {
      database: dbStatus,
      calculationEngine: "ACTIVE (v1.0.0 Decimal)",
      providers: {
        amfi: "CONFIGURED (Official Daily NAV)",
        simulated: "READY",
        accountAggregator: "SANDBOX_READY",
        brokerage: "SANDBOX_READY (Live Orders Gated: DISABLED)",
      },
    },
  });
}

