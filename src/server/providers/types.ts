import { MarketDataStatus } from "@prisma/client";
import { Decimal } from "@/lib/decimal";

export interface MarketObservationRecord {
  providerId: string;
  instrumentId: string;
  symbol: string;
  price: Decimal | string;
  changeAmount?: Decimal | string;
  changePercent?: Decimal | string;
  currency: string;
  sourceTimestamp: Date;
  ingestedAt: Date;
  dataStatus: MarketDataStatus;
  isSimulated: boolean;
  isDelayed: boolean;
  validityStatus: "VALID" | "STALE" | "DISCREPANT" | "UNAVAILABLE";
  rawPayload?: Record<string, unknown>;
}

export interface InstrumentSummary {
  id: string;
  symbol: string;
  isin?: string;
  name: string;
  category: string;
  assetClass: string;
  currency: string;
  riskLevel: string;
  expenseRatio?: number | string;
  lockInDays: number;
  taxNotes?: string;
  isSimulated: boolean;
  latestObservation?: MarketObservationRecord;
}

export interface IMarketDataProvider {
  getProviderCode(): string;
  getProviderName(): string;
  isSimulated(): boolean;
  fetchQuote(symbol: string): Promise<MarketObservationRecord | null>;
  searchInstruments(query: string): Promise<InstrumentSummary[]>;
}

export interface ConsentRequestParams {
  userId: string;
  fiTypes: string[]; // e.g. ["DEPOSIT", "TERM_DEPOSIT", "MUTUAL_FUNDS"]
  purposeCode: string;
  dataLifeMonths: number;
  fetchFrequency: "ONETIME" | "DAILY" | "MONTHLY";
}

export interface ConsentResult {
  consentId: string;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED" | "EXPIRED";
  consentHandle: string;
  redirectUrl?: string;
  expiresAt: Date;
}

export interface IAccountAggregatorProvider {
  createConsentRequest(params: ConsentRequestParams): Promise<ConsentResult>;
  checkConsentStatus(consentId: string): Promise<ConsentResult>;
  fetchFinancialInformation(consentId: string): Promise<{
    accounts: Array<{
      accountNumberMask: string;
      institutionName: string;
      accountType: string;
      balance: string;
      currency: string;
      balanceTimestamp: string;
      holdings?: Array<{
        symbol: string;
        name: string;
        units: string;
        nav: string;
        valuation: string;
      }>;
    }>;
  }>;
  revokeConsent(consentId: string): Promise<boolean>;
}

export interface BrokerOrderRequest {
  userId: string;
  symbol: string;
  exchange: "NSE" | "BSE";
  transactionType: "BUY" | "SELL";
  productType: "CNC" | "MIS"; // Cash & Carry vs Intraday
  orderType: "MARKET" | "LIMIT";
  quantity: number;
  price?: number;
  idempotencyKey: string;
  userConfirmationToken: string;
  isSandbox?: boolean;
}

export interface BrokerOrderPreview {
  symbol: string;
  exchange: string;
  transactionType: "BUY" | "SELL";
  quantity: number;
  estimatedPrice: string;
  estimatedTotal: string;
  brokerageFee: string;
  sebiTurnoverFee: string;
  sttCtt: string;
  stampDuty: string;
  estimatedNetValue: string;
  currency: string;
  confirmationToken: string;
  expiresAt: Date;
}

export interface BrokerOrderResponse {
  orderId: string;
  idempotencyKey: string;
  status: "SUBMITTED" | "FILLED" | "REJECTED" | "CANCELLED";
  symbol: string;
  quantity: number;
  filledQuantity: number;
  averagePrice: string;
  isSimulated: boolean;
  message: string;
  placedAt: Date;
}

