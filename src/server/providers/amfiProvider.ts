import { IMarketDataProvider, MarketObservationRecord, InstrumentSummary } from "./types";
import { MarketDataStatus } from "@prisma/client";
import { Decimal } from "@/lib/decimal";
import https from "https";

interface ParsedAmfiRecord {
  schemeCode: string;
  isin: string;
  schemeName: string;
  nav: string;
  dateStr: string;
}

class AmfiMarketDataProvider implements IMarketDataProvider {
  private cache: Map<string, ParsedAmfiRecord> = new Map();
  private lastFetchedAt: Date | null = null;
  private isFetching = false;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
  private readonly AMFI_URL = "https://portal.amfiindia.com/spages/NAVAll.txt";

  getProviderCode(): string {
    return "AMFI";
  }

  getProviderName(): string {
    return "Association of Mutual Funds in India (AMFI Official Daily Feed)";
  }

  isSimulated(): boolean {
    return false;
  }

  private async fetchWithFallback(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          headers: { "User-Agent": "Bloom-Financial-Planning/1.0" },
          rejectUnauthorized: false, // Handle Indian government cert authority root bundles in local dev
          timeout: 8000,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // Handle redirect
            this.fetchWithFallback(res.headers.location).then(resolve).catch(reject);
            return;
          }

          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => resolve(data));
        }
      );

      req.on("error", (err) => reject(err));
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("AMFI fetch request timed out"));
      });
    });
  }

  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (
      this.cache.size > 0 &&
      this.lastFetchedAt &&
      now - this.lastFetchedAt.getTime() < this.CACHE_TTL_MS
    ) {
      return;
    }

    if (this.isFetching) return;

    this.isFetching = true;
    try {
      const text = await this.fetchWithFallback(this.AMFI_URL);
      const lines = text.split("\n");

      const newCache = new Map<string, ParsedAmfiRecord>();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("Scheme Code") || trimmed.includes("Open Ended Schemes")) {
          continue;
        }

        const parts = trimmed.split(";");
        if (parts.length >= 6) {
          const schemeCode = parts[0]?.trim();
          const isin = parts[1]?.trim();
          let schemeName = "";
          let nav = "";
          let dateStr = "";

          if (parts.length >= 8) {
            // Format: Scheme Code;ISIN Div Payout/Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;NAV;Date
            const rawName = parts[3]?.trim();
            const plan = parts[4]?.trim();
            const opt = parts[5]?.trim();
            schemeName = `${rawName} (${plan} ${opt})`;
            nav = parts[6]?.trim();
            dateStr = parts[7]?.trim();
          } else {
            // Older 6-part format: Scheme Code;ISIN Growth;ISIN Reinv;Scheme Name;NAV;Date
            schemeName = parts[3]?.trim();
            nav = parts[4]?.trim();
            dateStr = parts[5]?.trim();
          }

          if (nav && !isNaN(Number(nav)) && Number(nav) > 0) {
            const record: ParsedAmfiRecord = {
              schemeCode,
              isin: isin && isin !== "-" ? isin : schemeCode,
              schemeName,
              nav,
              dateStr,
            };

            if (schemeCode) newCache.set(schemeCode, record);
            if (isin && isin !== "-") newCache.set(isin, record);
          }
        }
      }

      if (newCache.size > 0) {
        this.cache = newCache;
        this.lastFetchedAt = new Date();
      }
    } catch (err) {
      console.error("Error refreshing AMFI NAV cache:", err);
    } finally {
      this.isFetching = false;
    }
  }

  async fetchQuote(symbolOrIsin: string): Promise<MarketObservationRecord | null> {
    await this.refreshCacheIfNeeded();

    const record = this.cache.get(symbolOrIsin);
    if (!record) {
      return null;
    }

    const price = new Decimal(record.nav);
    const now = new Date();

    // Parse dateStr e.g. "09-Nov-2026"
    let sourceDate = now;
    try {
      const parsed = Date.parse(record.dateStr);
      if (!isNaN(parsed)) {
        sourceDate = new Date(parsed);
      }
    } catch {
      sourceDate = now;
    }

    // Check freshness: if older than 4 days, mark STALE
    const ageDays = (now.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24);
    const dataStatus = ageDays > 4 ? MarketDataStatus.STALE : MarketDataStatus.END_OF_DAY;

    return {
      providerId: "AMFI",
      instrumentId: record.schemeCode,
      symbol: record.schemeCode,
      price,
      currency: "INR",
      sourceTimestamp: sourceDate,
      ingestedAt: this.lastFetchedAt || now,
      dataStatus,
      isSimulated: false,
      isDelayed: false,
      validityStatus: "VALID",
      rawPayload: {
        schemeCode: record.schemeCode,
        isin: record.isin,
        schemeName: record.schemeName,
        publishedDate: record.dateStr,
        source: "AMFI Official Daily NAV Feed",
      },
    };
  }

  async searchInstruments(query: string): Promise<InstrumentSummary[]> {
    await this.refreshCacheIfNeeded();

    const q = query.toLowerCase().trim();
    if (!q || q.length < 2) return [];

    const results: InstrumentSummary[] = [];
    const seenCodes = new Set<string>();

    for (const record of this.cache.values()) {
      if (seenCodes.has(record.schemeCode)) continue;

      if (
        record.schemeName.toLowerCase().includes(q) ||
        record.schemeCode.includes(q) ||
        record.isin.toLowerCase().includes(q)
      ) {
        seenCodes.add(record.schemeCode);

        // Classify category
        const lowerName = record.schemeName.toLowerCase();
        const assetClass = lowerName.includes("liquid") || lowerName.includes("overnight") || lowerName.includes("money market")
          ? "CASH_EQUIVALENT"
          : lowerName.includes("debt") || lowerName.includes("bond") || lowerName.includes("gilt") || lowerName.includes("banking & psu")
          ? "DEBT"
          : lowerName.includes("hybrid") || lowerName.includes("balanced") || lowerName.includes("arbitrage")
          ? "HYBRID"
          : "EQUITY";

        results.push({
          id: `amfi-${record.schemeCode}`,
          symbol: record.schemeCode,
          isin: record.isin,
          name: record.schemeName,
          category: "MUTUAL_FUND",
          assetClass,
          currency: "INR",
          riskLevel: assetClass === "EQUITY" ? "VERY_HIGH" : assetClass === "DEBT" ? "LOW" : "MODERATE",
          lockInDays: lowerName.includes("elss") ? 1095 : 0, // 3-year lockin for ELSS tax savers
          taxNotes: assetClass === "EQUITY"
            ? "LTCG taxed at 12.5% over ₹1.25 Lakh. STCG taxed at 20%."
            : "Debt taxation: Taxed at marginal income slab rate.",
          isSimulated: false,
          latestObservation: {
            providerId: "AMFI",
            instrumentId: record.schemeCode,
            symbol: record.schemeCode,
            price: record.nav,
            currency: "INR",
            sourceTimestamp: new Date(),
            ingestedAt: this.lastFetchedAt || new Date(),
            dataStatus: MarketDataStatus.END_OF_DAY,
            isSimulated: false,
            isDelayed: false,
            validityStatus: "VALID",
          },
        });

        if (results.length >= 25) break;
      }
    }

    return results;
  }
}

export const amfiProvider = new AmfiMarketDataProvider();
