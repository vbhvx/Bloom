import prisma from "@/lib/db";
import { FeatureGateStatus } from "@prisma/client";

export interface GateCheckResult {
  isPermitted: boolean;
  featureKey: string;
  status: FeatureGateStatus;
  reason: string;
  legalBasis?: string;
  governingAuthority?: string;
}

export const KNOWN_FEATURE_KEYS = {
  PERSONALIZED_SECURITIES_ADVICE: "PERSONALIZED_SECURITIES_ADVICE",
  LIVE_BROKERAGE_EXECUTION: "LIVE_BROKERAGE_EXECUTION",
  BROKERAGE_SANDBOX_ORDER_PREVIEW: "BROKERAGE_SANDBOX_ORDER_PREVIEW",
  ACCOUNT_AGGREGATOR_FETCH: "ACCOUNT_AGGREGATOR_FETCH",
  LIVE_MARKET_DATA_AMFI: "LIVE_MARKET_DATA_AMFI",
  SIMULATED_DATA_EXPLORATION: "SIMULATED_DATA_EXPLORATION",
} as const;

export async function checkFeatureGate(featureKey: string): Promise<GateCheckResult> {
  // 1. Check database regulatory approval table first
  try {
    const record = await prisma.regulatoryApproval.findUnique({
      where: { featureKey },
    });

    if (record) {
      if (record.currentStatus === FeatureGateStatus.ENABLED) {
        return {
          isPermitted: true,
          featureKey,
          status: record.currentStatus,
          reason: "Feature is explicitly authorized and enabled by compliance.",
          legalBasis: record.legalBasis,
          governingAuthority: record.governingAuthority,
        };
      } else {
        return {
          isPermitted: false,
          featureKey,
          status: record.currentStatus,
          reason: `Feature is gated with status '${record.currentStatus}'. ${record.justification}`,
          legalBasis: record.legalBasis,
          governingAuthority: record.governingAuthority,
        };
      }
    }
  } catch (error) {
    console.error(`Error querying regulatory gate for ${featureKey}:`, error);
  }

  // 2. Fallback to strict environment variable defaults
  if (featureKey === KNOWN_FEATURE_KEYS.LIVE_BROKERAGE_EXECUTION) {
    const isEnvEnabled = process.env.ENABLE_LIVE_BROKERAGE_ORDERS === "true";
    return {
      isPermitted: isEnvEnabled,
      featureKey,
      status: isEnvEnabled ? FeatureGateStatus.ENABLED : FeatureGateStatus.DISABLED,
      reason: isEnvEnabled
        ? "Enabled via configuration"
        : "Direct live order execution is disabled. SEBI stockbroker registration and partner exchange approvals required.",
      legalBasis: "SEBI (Stock Brokers) Regulations, 1992 & Execution-Only Platform Circular 2023",
      governingAuthority: "SEBI",
    };
  }

  if (featureKey === KNOWN_FEATURE_KEYS.PERSONALIZED_SECURITIES_ADVICE) {
    const isEnvEnabled = process.env.ENABLE_PERSONALIZED_SECURITIES_ADVICE === "true";
    return {
      isPermitted: isEnvEnabled,
      featureKey,
      status: isEnvEnabled ? FeatureGateStatus.ENABLED : FeatureGateStatus.DISABLED,
      reason: isEnvEnabled
        ? "Enabled via configuration"
        : "Personalized securities advice is disabled. SEBI (Investment Advisers) Regulations, 2013 registration required.",
      legalBasis: "SEBI (Investment Advisers) Regulations, 2013, Regulation 2(1)(x)",
      governingAuthority: "SEBI",
    };
  }

  if (featureKey === KNOWN_FEATURE_KEYS.SIMULATED_DATA_EXPLORATION) {
    return {
      isPermitted: true,
      featureKey,
      status: FeatureGateStatus.ENABLED,
      reason: "Simulated sandbox exploration is allowed without regulatory restriction.",
    };
  }

  if (featureKey === KNOWN_FEATURE_KEYS.LIVE_MARKET_DATA_AMFI) {
    return {
      isPermitted: true,
      featureKey,
      status: FeatureGateStatus.ENABLED,
      reason: "AMFI public daily NAV data feed is open public sector market data.",
      governingAuthority: "AMFI / SEBI",
    };
  }

  // Default closed for safety
  return {
    isPermitted: false,
    featureKey,
    status: FeatureGateStatus.DISABLED,
    reason: `Feature gate for '${featureKey}' is closed by default under compliance safety rules.`,
  };
}

export async function assertFeaturePermitted(featureKey: string): Promise<GateCheckResult> {
  const result = await checkFeatureGate(featureKey);
  if (!result.isPermitted) {
    const err = new Error(`Regulatory Gate Block: ${result.reason}`);
    (err as unknown as { status: number; gateResult: GateCheckResult }).status = 403;
    (err as unknown as { gateResult: GateCheckResult }).gateResult = result;
    throw err;
  }
  return result;
}

