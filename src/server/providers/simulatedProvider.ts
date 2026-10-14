import { IMarketDataProvider, MarketObservationRecord, InstrumentSummary } from "./types";
import { MarketDataStatus } from "@prisma/client";
import { Decimal } from "@/lib/decimal";

export const SIMULATED_INSTRUMENT_FIXTURES: Record<string, {
  id: string;
  symbol: string;
  name: string;
  isin: string;
  category: "MUTUAL_FUND" | "ETF" | "SGB" | "PPF" | "NPS" | "FD" | "EQUITY";
  assetClass: "EQUITY" | "DEBT" | "COMMODITY" | "HYBRID" | "CASH_EQUIVALENT";
  currency: string;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  expenseRatio: string;
  lockInDays: number;
  taxNotes: string;
  minInvestment: string;
  basePrice: string;
  expectedAnnualReturn: string;
}> = {
  "NIFTY50_INDEX": {
    id: "inst-sim-nifty50",
    symbol: "NIFTY50_INDEX",
    isin: "INF209K01157",
    name: "UTI Nifty 50 Index Mutual Fund (Direct Growth)",
    category: "MUTUAL_FUND",
    assetClass: "EQUITY",
    currency: "INR",
    riskLevel: "VERY_HIGH",
    expenseRatio: "0.0018", // 0.18%
    lockInDays: 0,
    taxNotes: "LTCG taxed at 12.5% above ₹1.25 Lakh per financial year (Union Budget 2024 amendments). STCG at 20%.",
    minInvestment: "500",
    basePrice: "184.4250",
    expectedAnnualReturn: "0.1200",
  },
  "PARAG_PARIKH_FLEXI": {
    id: "inst-sim-ppfc",
    symbol: "PARAG_PARIKH_FLEXI",
    isin: "INF879O01019",
    name: "Parag Parikh Flexi Cap Fund (Direct Growth)",
    category: "MUTUAL_FUND",
    assetClass: "EQUITY",
    currency: "INR",
    riskLevel: "VERY_HIGH",
    expenseRatio: "0.0062", // 0.62%
    lockInDays: 0,
    taxNotes: "Equity taxation applies (minimum 65% domestic equity). LTCG 12.5% > ₹1.25L, STCG 20%.",
    minInvestment: "1000",
    basePrice: "82.1640",
    expectedAnnualReturn: "0.1350",
  },
  "HDFC_LIQUID": {
    id: "inst-sim-hdfcliq",
    symbol: "HDFC_LIQUID",
    isin: "INF179K01931",
    name: "HDFC Liquid Fund (Direct Growth)",
    category: "MUTUAL_FUND",
    assetClass: "CASH_EQUIVALENT",
    currency: "INR",
    riskLevel: "LOW",
    expenseRatio: "0.0020", // 0.20%
    lockInDays: 0,
    taxNotes: "Specified mutual funds (debt/liquid) taxed at applicable income tax slab rates.",
    minInvestment: "100",
    basePrice: "4682.1500",
    expectedAnnualReturn: "0.0675",
  },
  "SGB_SERIES_VI": {
    id: "inst-sim-sgb",
    symbol: "SGB_SERIES_VI",
    isin: "IN0020210080",
    name: "Sovereign Gold Bond 2021-22 Series VI (2.50% Coupon)",
    category: "SGB",
    assetClass: "COMMODITY",
    currency: "INR",
    riskLevel: "MODERATE",
    expenseRatio: "0.0000",
    lockInDays: 1825, // 5 years before RBI redemption window
    taxNotes: "Semi-annual 2.5% interest taxable at slab rates. Capital gains fully tax-exempt on maturity at 8 years.",
    minInvestment: "5000",
    basePrice: "7250.0000",
    expectedAnnualReturn: "0.0950",
  },
  "PPF_SCHEME": {
    id: "inst-sim-ppf",
    symbol: "PPF_SCHEME",
    isin: "GOI-PPF-1968",
    name: "Public Provident Fund (15-Year Central Govt Scheme)",
    category: "PPF",
    assetClass: "DEBT",
    currency: "INR",
    riskLevel: "LOW",
    expenseRatio: "0.0000",
    lockInDays: 5475, // 15 years
    taxNotes: "EEE status: Investment exempt u/s 80C, interest earned is tax-exempt, maturity proceeds are completely tax-free.",
    minInvestment: "500",
    basePrice: "100.0000",
    expectedAnnualReturn: "0.0710",
  },
  "NPS_TIER1": {
    id: "inst-sim-nps",
    symbol: "NPS_TIER1",
    isin: "PFRDA-NPS-T1",
    name: "National Pension System Tier 1 (Moderate Auto Choice LC-50)",
    category: "NPS",
    assetClass: "HYBRID",
    currency: "INR",
    riskLevel: "MODERATE",
    expenseRatio: "0.0009", // Ultra low PFRDA capped 0.09%
    lockInDays: 7300, // Locked until age 60
    taxNotes: "Tax deduction u/s 80CCD(1B) up to ₹50,000 extra. 60% lump sum at retirement is tax-free, 40% goes into annuity.",
    minInvestment: "1000",
    basePrice: "48.2500",
    expectedAnnualReturn: "0.1050",
  },
  "SBI_5YR_FD": {
    id: "inst-sim-sbifd",
    symbol: "SBI_5YR_FD",
    isin: "SBI-FD-TAX-01",
    name: "SBI 5-Year Tax Saver Fixed Deposit",
    category: "FD",
    assetClass: "DEBT",
    currency: "INR",
    riskLevel: "LOW",
    expenseRatio: "0.0000",
    lockInDays: 1825, // 5 years
    taxNotes: "Section 80C tax deduction on deposit amount. Interest is fully taxable under income from other sources at slab rate.",
    minInvestment: "10000",
    basePrice: "100.0000",
    expectedAnnualReturn: "0.0710",
  },
};

export class SimulatedMarketDataProvider implements IMarketDataProvider {
  getProviderCode(): string {
    return "SIMULATED_FIXTURES";
  }

  getProviderName(): string {
    return "Deterministic Simulated Market Fixture Engine";
  }

  isSimulated(): boolean {
    return true;
  }

  async fetchQuote(symbol: string): Promise<MarketObservationRecord | null> {
    const fixture = SIMULATED_INSTRUMENT_FIXTURES[symbol];
    if (!fixture) return null;

    // Deterministic price calculation based on fixed seed / base price
    const base = new Decimal(fixture.basePrice);
    const now = new Date();

    return {
      providerId: "SIMULATED_FIXTURES",
      instrumentId: fixture.id,
      symbol: fixture.symbol,
      price: base,
      changeAmount: new Decimal("0.85"),
      changePercent: new Decimal("0.46"),
      currency: fixture.currency,
      sourceTimestamp: now,
      ingestedAt: now,
      dataStatus: MarketDataStatus.REALTIME,
      isSimulated: true,
      isDelayed: false,
      validityStatus: "VALID",
      rawPayload: {
        simulationSource: "Deterministic fixture seed v1",
        note: "DEMO ONLY: Not real exchange price data",
      },
    };
  }

  async searchInstruments(query: string): Promise<InstrumentSummary[]> {
    const q = query.toLowerCase().trim();
    const results: InstrumentSummary[] = [];

    for (const item of Object.values(SIMULATED_INSTRUMENT_FIXTURES)) {
      if (
        !q ||
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.assetClass.toLowerCase().includes(q)
      ) {
        results.push({
          id: item.id,
          symbol: item.symbol,
          isin: item.isin,
          name: item.name,
          category: item.category,
          assetClass: item.assetClass,
          currency: item.currency,
          riskLevel: item.riskLevel,
          expenseRatio: item.expenseRatio,
          lockInDays: item.lockInDays,
          taxNotes: item.taxNotes,
          isSimulated: true,
          latestObservation: {
            providerId: "SIMULATED_FIXTURES",
            instrumentId: item.id,
            symbol: item.symbol,
            price: item.basePrice,
            currency: item.currency,
            sourceTimestamp: new Date(),
            ingestedAt: new Date(),
            dataStatus: MarketDataStatus.REALTIME,
            isSimulated: true,
            isDelayed: false,
            validityStatus: "VALID",
          },
        });
      }
    }

    return results;
  }
}

export const simulatedProvider = new SimulatedMarketDataProvider();

