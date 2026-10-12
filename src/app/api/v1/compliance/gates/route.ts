import { jsonResponse } from "@/server/api/validation";
import prisma from "@/lib/db";

export async function GET() {
  const gates = await prisma.regulatoryApproval.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return jsonResponse({
    timestamp: new Date().toISOString(),
    regulatoryFrameworks: ["SEBI (IA) Regulations 2013", "SEBI (Stock Brokers) 1992", "RBI NBFC-AA 2016", "DPDP Act 2023"],
    gates: gates.map((g) => ({
      featureKey: g.featureKey,
      featureName: g.featureName,
      status: g.currentStatus,
      governingAuthority: g.governingAuthority,
      legalBasis: g.legalBasis,
      justification: g.justification,
      reviewedBy: g.reviewedBy,
      reviewDate: g.reviewDate.toISOString(),
      notes: g.notes,
    })),
  });
}

