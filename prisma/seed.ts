import { PrismaClient, FeatureGateStatus, GoalCategory, GoalPriority, GoalStatus, HoldingSourceType, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Decimal } from "../src/lib/decimal";
import { calculatePlanningScenarios } from "../src/server/finance/calculations";
import { SIMULATED_INSTRUMENT_FIXTURES } from "../src/server/providers/simulatedProvider";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Bloom database...");

  // 1. Seed Regulatory Approvals
  const regulatoryFeatures = [
    {
      featureKey: "SIMULATED_DATA_EXPLORATION",
      featureName: "Simulated Data Exploration & Testing",
      currentStatus: FeatureGateStatus.ENABLED,
      legalBasis: "No regulatory restriction for educational simulation fixtures",
      governingAuthority: "Platform Policy",
      justification: "Educational and demo exploration with clearly isolated and labeled fixtures.",
    },
    {
      featureKey: "LIVE_MARKET_DATA_AMFI",
      featureName: "Live Indian Mutual Fund Daily NAV Feed",
      currentStatus: FeatureGateStatus.ENABLED,
      legalBasis: "SEBI (Mutual Funds) Regulations, 1996 - Public NAV Dissemination",
      governingAuthority: "AMFI / SEBI",
      justification: "AMFI public daily NAV feed is open regulatory data intended for public investor transparency.",
    },
    {
      featureKey: "ACCOUNT_AGGREGATOR_FETCH",
      featureName: "RBI Account Aggregator Financial Information Fetch (Sandbox)",
      currentStatus: FeatureGateStatus.ENABLED,
      legalBasis: "Reserve Bank of India (Financial Services Providers) Directions, 2016 (NBFC-AA)",
      governingAuthority: "RBI",
      justification: "Authorized via ReBIT electronic consent artifacts for read-only financial data aggregation.",
    },
    {
      featureKey: "BROKERAGE_SANDBOX_ORDER_PREVIEW",
      featureName: "Brokerage Order Preview & Sandbox Simulation",
      currentStatus: FeatureGateStatus.ENABLED,
      legalBasis: "Exchange Sandbox Guidelines (NSE/BSE/SEBI)",
      governingAuthority: "SEBI",
      justification: "Order validation, lot calculation, and sandbox simulation without exchange market impact.",
    },
    {
      featureKey: "PERSONALIZED_SECURITIES_ADVICE",
      featureName: "Personalized Securities Advice & Individual Stock Calls",
      currentStatus: FeatureGateStatus.DISABLED,
      legalBasis: "SEBI (Investment Advisers) Regulations, 2013, Regulation 2(1)(x) & Regulation 15",
      governingAuthority: "SEBI",
      justification: "Bloom operates as an educational planning platform. Direct personal securities advice remains strictly disabled until SEBI RIA registration, audited compliance controls, and partner agreements are complete.",
    },
    {
      featureKey: "LIVE_BROKERAGE_EXECUTION",
      featureName: "Live Brokerage Exchange Order Routing",
      currentStatus: FeatureGateStatus.DISABLED,
      legalBasis: "SEBI Circular on Execution-Only Platforms (EOP) 2023 & SEBI (Stock Brokers) Regulations, 1992",
      governingAuthority: "SEBI",
      justification: "Live order execution to exchanges requires registered broker partnership, direct client authorization tokens, and bilateral SLA. Sandboxed order flow remains active for review.",
    },
  ];

  for (const rf of regulatoryFeatures) {
    await prisma.regulatoryApproval.upsert({
      where: { featureKey: rf.featureKey },
      update: rf,
      create: rf,
    });
  }
  console.log("✓ Regulatory feature gates seeded.");

  // 2. Seed Providers
  const providersData = [
    {
      code: "AMFI",
      name: "Association of Mutual Funds in India (AMFI)",
      category: "MARKET_DATA" as const,
      capabilities: { type: "END_OF_DAY_NAV", assetClasses: ["MUTUAL_FUNDS"] },
      status: "ACTIVE" as const,
      documentationUrl: "https://www.amfiindia.com",
      termsNotes: "Official daily mutual fund NAV repository.",
    },
    {
      code: "SIMULATED",
      name: "Deterministic Simulation Fixture Engine",
      category: "MARKET_DATA" as const,
      capabilities: { type: "SYNTHETIC_PRICING", assetClasses: ["ALL"] },
      status: "ACTIVE" as const,
      documentationUrl: "https://bloom.invest/docs/simulation",
      termsNotes: "Deterministic demo fixtures with explicit provenance markers.",
    },
    {
      code: "SETU_AA",
      name: "Setu Account Aggregator Gateway",
      category: "ACCOUNT_AGGREGATOR" as const,
      capabilities: { type: "NBFC_AA", fiTypes: ["DEPOSIT", "MUTUAL_FUNDS", "TERM_DEPOSIT"] },
      status: "SANDBOX_ONLY" as const,
      documentationUrl: "https://setu.co/docs/account-aggregator",
      termsNotes: "RBI regulated Account Aggregator consent gateway.",
    },
    {
      code: "ZERODHA",
      name: "Zerodha Kite Connect Brokerage",
      category: "BROKERAGE" as const,
      capabilities: { type: "BROKERAGE_API", exchanges: ["NSE", "BSE"] },
      status: "SANDBOX_ONLY" as const,
      documentationUrl: "https://kite.trade/docs/connect/v3",
      termsNotes: "Brokerage execution adapter (gated sandbox mode).",
    },
  ];

  for (const p of providersData) {
    await prisma.provider.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
  }
  console.log("✓ Providers seeded.");

  // 3. Seed Instruments from Fixtures
  for (const f of Object.values(SIMULATED_INSTRUMENT_FIXTURES)) {
    const inst = await prisma.instrument.upsert({
      where: { symbol: f.symbol },
      update: {
        name: f.name,
        isin: f.isin,
        category: f.category,
        assetClass: f.assetClass,
        currency: f.currency,
        riskLevel: f.riskLevel,
        expenseRatio: new Decimal(f.expenseRatio),
        lockInDays: f.lockInDays,
        taxNotes: f.taxNotes,
        minInvestment: new Decimal(f.minInvestment),
        isSimulated: true,
      },
      create: {
        symbol: f.symbol,
        isin: f.isin,
        name: f.name,
        category: f.category,
        assetClass: f.assetClass,
        currency: f.currency,
        riskLevel: f.riskLevel,
        expenseRatio: new Decimal(f.expenseRatio),
        lockInDays: f.lockInDays,
        taxNotes: f.taxNotes,
        minInvestment: new Decimal(f.minInvestment),
        isSimulated: true,
      },
    });

    // Seed market observation for instrument
    const simProvider = await prisma.provider.findUnique({ where: { code: "SIMULATED" } });
    if (simProvider) {
      await prisma.marketObservation.create({
        data: {
          providerId: simProvider.id,
          instrumentId: inst.id,
          price: new Decimal(f.basePrice),
          changeAmount: new Decimal("0.85"),
          changePercent: new Decimal("0.46"),
          currency: f.currency,
          sourceTimestamp: new Date(),
          isSimulated: true,
          dataStatus: "REALTIME",
          validityStatus: "VALID",
        },
      });
    }
  }
  console.log("✓ Instruments and initial observations seeded.");

  // 4. Seed Knowledge Sources & Chunks
  const source1 = await prisma.knowledgeSource.create({
    data: {
      title: "Union Budget 2024 Amendments: Capital Gains Taxation under Section 112A & 111A",
      publisher: "Ministry of Finance, Government of India",
      category: "TAXATION",
      url: "https://incometaxindia.gov.in",
      publicationDate: new Date("2024-07-23"),
      isOfficial: true,
      summary: "Official rules governing revised Long Term Capital Gains (LTCG) tax of 12.5% on listed equities and equity mutual funds above ₹1.25 Lakh exemption limit, and Short Term Capital Gains (STCG) at 20%.",
    },
  });

  await prisma.knowledgeChunk.createMany({
    data: [
      {
        sourceId: source1.id,
        chunkIndex: 1,
        title: "Equity Mutual Funds & Shares LTCG Taxation",
        content: "Under the Finance (No. 2) Act 2024, Long Term Capital Gains (LTCG) on listed equity shares and equity-oriented mutual funds held for more than 12 months are taxed at a uniform rate of 12.5% (increased from 10%). The annual exemption limit for aggregate LTCG has been raised from ₹1,00,000 to ₹1,25,000 per financial year. Gains exceeding ₹1.25 Lakh are taxable at 12.5% without indexation benefits.",
        keywords: ["ltcg", "taxation", "equity", "12.5%", "1.25 lakh", "budget 2024", "mutual funds"],
      },
      {
        sourceId: source1.id,
        chunkIndex: 2,
        title: "Equity Short Term Capital Gains (STCG) Taxation",
        content: "Under Section 111A of the Income Tax Act, Short Term Capital Gains (STCG) on equity shares and units of equity-oriented mutual funds held for 12 months or less are taxed at 20% (increased from 15%), plus applicable surcharge and cess.",
        keywords: ["stcg", "taxation", "equity", "20%", "short term"],
      },
      {
        sourceId: source1.id,
        chunkIndex: 3,
        title: "Specified Debt Mutual Funds Taxation",
        content: "Under Section 50AA of the Income Tax Act, gains arising from the transfer of units of specified debt mutual funds (where not more than 35% is invested in equity) acquired on or after April 1, 2023, are deemed as short-term capital gains irrespective of holding period and taxed at the investor's applicable marginal income tax slab rates.",
        keywords: ["debt mutual funds", "taxation", "slab rate", "50aa", "liquid fund"],
      },
    ],
  });

  const source2 = await prisma.knowledgeSource.create({
    data: {
      title: "SEBI Master Circular on Categorisation and Rationalisation of Mutual Fund Schemes",
      publisher: "Securities and Exchange Board of India (SEBI)",
      category: "REGULATION",
      url: "https://www.sebi.gov.in",
      publicationDate: new Date("2021-04-01"),
      isOfficial: true,
      summary: "Official SEBI directives establishing mutual fund categories: Equity Schemes, Debt Schemes, Hybrid Schemes, and Solution Oriented Schemes.",
    },
  });

  await prisma.knowledgeChunk.createMany({
    data: [
      {
        sourceId: source2.id,
        chunkIndex: 1,
        title: "Large Cap & Index Mutual Funds Definition",
        content: "SEBI defines Large Cap stocks as the 1st to 100th company in terms of full market capitalization. Large Cap mutual funds must maintain at least 80% investment in large-cap companies. Index funds replicate a recognized benchmark like the NIFTY 50 or S&P BSE SENSEX, investing at least 95% in securities of the target index with low tracking errors and minimal expense ratios.",
        keywords: ["nifty 50", "large cap", "index fund", "sebi", "tracking error"],
      },
      {
        sourceId: source2.id,
        chunkIndex: 2,
        title: "Flexi Cap Mutual Funds Mandate",
        content: "SEBI introduced the Flexi Cap category allowing fund managers to invest across large cap, mid cap, and small cap companies with a dynamic allocation, subject to a minimum investment of 65% in Indian equities.",
        keywords: ["flexi cap", "multicap", "equity allocation", "diversification"],
      },
      {
        sourceId: source2.id,
        chunkIndex: 3,
        title: "Risk-o-meter & Investor Suitability",
        content: "Every mutual fund scheme in India is required by SEBI to display a monthly Risk-o-meter depicting six risk levels: Low, Low to Moderate, Moderate, Moderately High, High, and Very High. Pure equity schemes fall under Very High risk due to market volatility.",
        keywords: ["riskometer", "risk level", "suitability", "sebi"],
      },
    ],
  });

  const source3 = await prisma.knowledgeSource.create({
    data: {
      title: "Reserve Bank of India: Sovereign Gold Bond (SGB) Scheme Operational Directives",
      publisher: "Reserve Bank of India (RBI)",
      category: "ASSET_CLASSES",
      url: "https://rbi.org.in",
      publicationDate: new Date("2023-11-15"),
      isOfficial: true,
      summary: "Operational framework for Sovereign Gold Bonds issued by the RBI on behalf of the Government of India.",
    },
  });

  await prisma.knowledgeChunk.createMany({
    data: [
      {
        sourceId: source3.id,
        chunkIndex: 1,
        title: "Sovereign Gold Bond Interest and Maturity Benefits",
        content: "SGBs earn a fixed coupon interest rate of 2.50% per annum on the nominal issue price, credited semi-annually directly to the investor's bank account. The tenor of the bond is 8 years, with an early exit option after the 5th year on coupon payment dates. Capital gains tax on redemption of SGBs on maturity by an individual is completely exempt from income tax under Section 47(viic).",
        keywords: ["sgb", "gold", "rbi", "2.5% interest", "tax free maturity"],
      },
    ],
  });

  const source4 = await prisma.knowledgeSource.create({
    data: {
      title: "Public Provident Fund (PPF) Scheme & National Pension System (NPS) Rules",
      publisher: "Ministry of Finance & PFRDA",
      category: "GOAL_PLANNING",
      url: "https://pfrda.org.in",
      publicationDate: new Date("2023-01-01"),
      isOfficial: true,
      summary: "Long term government-backed savings vehicles for retirement and goal planning.",
    },
  });

  await prisma.knowledgeChunk.createMany({
    data: [
      {
        sourceId: source4.id,
        chunkIndex: 1,
        title: "PPF EEE Tax Exemption and Lock-in Rules",
        content: "PPF is a 15-year central government statutory scheme offering Exemplary EEE status: (1) Contribution exempt under Sec 80C up to ₹1.5 Lakh/year, (2) Interest earned is tax-exempt, and (3) Maturity amount is 100% tax-free. Interest is declared quarterly by the Ministry of Finance (currently 7.10% p.a.). Partial withdrawals are allowed from the 7th financial year onwards.",
        keywords: ["ppf", "eee", "80c", "tax free", "7.10%"],
      },
      {
        sourceId: source4.id,
        chunkIndex: 2,
        title: "NPS Tier I Structure, Tax Benefits & Annuity Mandate",
        content: "NPS Tier I is a voluntary, long-term retirement scheme regulated by PFRDA. It provides an exclusive additional tax deduction of up to ₹50,000 under Section 80CCD(1B) beyond the Section 80C ₹1.5 Lakh limit. At age 60, up to 60% of the accumulated corpus can be withdrawn as a tax-free lump sum, while the remaining 40% must be used to purchase a life annuity for regular pension.",
        keywords: ["nps", "80ccd", "retirement", "pfrda", "annuity"],
      },
    ],
  });
  console.log("✓ Knowledge sources and verified chunks seeded.");

  // 5. Seed Demo User
  const demoEmail = "demo@bloom.invest";
  const passwordHash = await bcrypt.hash("BloomDemo@2026", 10);

  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: "Aarav Sharma",
      passwordHash,
      isDemoUser: true,
    },
    create: {
      email: demoEmail,
      name: "Aarav Sharma",
      passwordHash,
      role: "USER",
      isDemoUser: true,
    },
  });

  // Seed User Profile
  await prisma.userProfile.upsert({
    where: { userId: demoUser.id },
    update: {
      locale: "en-IN",
      country: "IND",
      preferredCurrency: "INR",
      monthlyIncome: new Decimal("120000"),
      monthlyExpenses: new Decimal("55000"),
      currentSavings: new Decimal("250000"),
      riskTolerance: "MODERATE",
      planningPreferences: {
        retirementAge: 60,
        expectedInflation: 0.06,
        primaryFocus: ["EMERGENCY_FUND", "WEALTH_CREATION", "HOME_PURCHASE"],
      },
    },
    create: {
      userId: demoUser.id,
      locale: "en-IN",
      country: "IND",
      preferredCurrency: "INR",
      monthlyIncome: new Decimal("120000"),
      monthlyExpenses: new Decimal("55000"),
      currentSavings: new Decimal("250000"),
      riskTolerance: "MODERATE",
      planningPreferences: {
        retirementAge: 60,
        expectedInflation: 0.06,
        primaryFocus: ["EMERGENCY_FUND", "WEALTH_CREATION", "HOME_PURCHASE"],
      },
    },
  });

  // Seed Risk Assessment
  await prisma.riskAssessment.create({
    data: {
      userId: demoUser.id,
      version: "v1.0",
      score: 65,
      riskProfile: "MODERATE",
      answers: {
        investmentHorizon: "5-10 years",
        reactionToMarketDrop: "Hold or buy more units at lower NAV",
        primaryGoal: "Capital growth with moderate downside cushion",
        dependentsCount: 1,
      },
    },
  });

  // Clean old demo goals if re-seeding
  await prisma.financialGoal.deleteMany({ where: { userId: demoUser.id } });

  // Goal 1: Emergency Fund
  const goal1TargetDate = new Date();
  goal1TargetDate.setMonth(goal1TargetDate.getMonth() + 12);

  const goal1 = await prisma.financialGoal.create({
    data: {
      userId: demoUser.id,
      title: "Emergency Cushion (6 Months Expenses)",
      description: "6 months living expenses stored safely in liquid funds and high-yield savings.",
      category: GoalCategory.EMERGENCY_FUND,
      targetAmount: new Decimal("330000"), // 55,000 * 6
      currency: "INR",
      targetDate: goal1TargetDate,
      currentAllocatedSavings: new Decimal("150000"),
      monthlyContribution: new Decimal("15000"),
      contributionFrequency: "MONTHLY",
      priority: GoalPriority.HIGH,
      status: GoalStatus.ACTIVE,
    },
  });

  // Scenario for Goal 1
  const goal1Calc = calculatePlanningScenarios({
    targetAmount: "330000",
    currentSavings: "150000",
    monthlyContribution: "15000",
    timeHorizonMonths: 12,
    baselineReturnRateAnnual: "0.065", // Liquid / FD safe returns
    favorableReturnRateAnnual: "0.075",
    adverseReturnRateAnnual: "0.055",
    inflationRateAnnual: "0.055",
    currency: "INR",
  });

  await prisma.planningScenario.create({
    data: {
      goalId: goal1.id,
      userId: demoUser.id,
      name: "Emergency Fund 12-Month Accumulation Plan",
      formulaVersion: goal1Calc.formulaVersion,
      currency: "INR",
      targetAmount: new Decimal(goal1Calc.inputs.targetAmount),
      timeHorizonMonths: 12,
      monthlyContribution: new Decimal(goal1Calc.inputs.monthlyContribution),
      currentSavings: new Decimal(goal1Calc.inputs.currentSavings),
      inflationRate: new Decimal(goal1Calc.inputs.inflationRateAnnual),
      baselineReturnRate: new Decimal(goal1Calc.inputs.baselineReturnRateAnnual),
      favorableReturnRate: new Decimal(goal1Calc.inputs.favorableReturnRateAnnual),
      adverseReturnRate: new Decimal(goal1Calc.inputs.adverseReturnRateAnnual),
      baselineFV: new Decimal(goal1Calc.outputs.baselineFV),
      favorableFV: new Decimal(goal1Calc.outputs.favorableFV),
      adverseFV: new Decimal(goal1Calc.outputs.adverseFV),
      totalContributions: new Decimal(goal1Calc.outputs.totalContributions),
      baselineGrowth: new Decimal(goal1Calc.outputs.baselineGrowth),
      requiredMonthlyContribution: new Decimal(goal1Calc.outputs.requiredMonthlyContribution),
      metadata: goal1Calc as unknown as object,
    },
  });

  // Goal 2: Home Down Payment (5 Years)
  const goal2TargetDate = new Date();
  goal2TargetDate.setFullYear(goal2TargetDate.getFullYear() + 5);

  const goal2 = await prisma.financialGoal.create({
    data: {
      userId: demoUser.id,
      title: "First Home Down Payment",
      description: "Down payment of 20% on a ₹1.25 Crore home in Bangalore.",
      category: GoalCategory.HOME_PURCHASE,
      targetAmount: new Decimal("2500000"),
      currency: "INR",
      targetDate: goal2TargetDate,
      currentAllocatedSavings: new Decimal("300000"),
      monthlyContribution: new Decimal("28000"),
      contributionFrequency: "MONTHLY",
      priority: GoalPriority.HIGH,
      status: GoalStatus.ACTIVE,
    },
  });

  const goal2Calc = calculatePlanningScenarios({
    targetAmount: "2500000",
    currentSavings: "300000",
    monthlyContribution: "28000",
    timeHorizonMonths: 60,
    baselineReturnRateAnnual: "0.105",
    favorableReturnRateAnnual: "0.13",
    adverseReturnRateAnnual: "0.07",
    inflationRateAnnual: "0.06",
    currency: "INR",
  });

  await prisma.planningScenario.create({
    data: {
      goalId: goal2.id,
      userId: demoUser.id,
      name: "5-Year Moderate Hybrid Accumulation Plan",
      formulaVersion: goal2Calc.formulaVersion,
      currency: "INR",
      targetAmount: new Decimal(goal2Calc.inputs.targetAmount),
      timeHorizonMonths: 60,
      monthlyContribution: new Decimal(goal2Calc.inputs.monthlyContribution),
      currentSavings: new Decimal(goal2Calc.inputs.currentSavings),
      inflationRate: new Decimal(goal2Calc.inputs.inflationRateAnnual),
      baselineReturnRate: new Decimal(goal2Calc.inputs.baselineReturnRateAnnual),
      favorableReturnRate: new Decimal(goal2Calc.inputs.favorableReturnRateAnnual),
      adverseReturnRate: new Decimal(goal2Calc.inputs.adverseReturnRateAnnual),
      baselineFV: new Decimal(goal2Calc.outputs.baselineFV),
      favorableFV: new Decimal(goal2Calc.outputs.favorableFV),
      adverseFV: new Decimal(goal2Calc.outputs.adverseFV),
      totalContributions: new Decimal(goal2Calc.outputs.totalContributions),
      baselineGrowth: new Decimal(goal2Calc.outputs.baselineGrowth),
      requiredMonthlyContribution: new Decimal(goal2Calc.outputs.requiredMonthlyContribution),
      metadata: goal2Calc as unknown as object,
    },
  });

  // Seed Demo Financial Accounts & Simulated Holdings
  await prisma.financialAccount.deleteMany({ where: { userId: demoUser.id } });

  const bankAccount = await prisma.financialAccount.create({
    data: {
      userId: demoUser.id,
      institutionName: "HDFC Bank Ltd",
      accountType: "SAVINGS",
      accountNumberMask: "XX4419",
      currency: "INR",
      balance: new Decimal("150000"),
      isSimulated: true,
      isConnected: false,
      status: "ACTIVE",
    },
  });

  const dematAccount = await prisma.financialAccount.create({
    data: {
      userId: demoUser.id,
      institutionName: "Zerodha Broking Ltd",
      accountType: "DEMAT",
      accountNumberMask: "1208160000000000",
      currency: "INR",
      balance: new Decimal("230500"),
      isSimulated: true,
      isConnected: false,
      status: "ACTIVE",
    },
  });

  // Holdings in Demat Account
  const niftyInst = await prisma.instrument.findUnique({ where: { symbol: "NIFTY50_INDEX" } });
  const sgbInst = await prisma.instrument.findUnique({ where: { symbol: "SGB_SERIES_VI" } });
  const ppfInst = await prisma.instrument.findUnique({ where: { symbol: "PPF_SCHEME" } });

  if (niftyInst) {
    await prisma.holdingsSnapshot.create({
      data: {
        accountId: dematAccount.id,
        instrumentId: niftyInst.id,
        units: new Decimal("850"),
        averageBuyPrice: new Decimal("165.20"),
        currentPrice: new Decimal("184.4250"),
        valuation: new Decimal("156761.25"),
        currency: "INR",
        sourceType: HoldingSourceType.SIMULATED,
      },
    });

    await prisma.investmentTransaction.create({
      data: {
        accountId: dematAccount.id,
        instrumentId: niftyInst.id,
        transactionType: TransactionType.SIP,
        units: new Decimal("54.22"),
        unitPrice: new Decimal("184.4250"),
        totalAmount: new Decimal("10000.00"),
        currency: "INR",
        transactionDate: new Date("2026-10-05"),
        status: "SETTLED",
        isSimulated: true,
      },
    });
  }

  if (sgbInst) {
    await prisma.holdingsSnapshot.create({
      data: {
        accountId: dematAccount.id,
        instrumentId: sgbInst.id,
        units: new Decimal("10"),
        averageBuyPrice: new Decimal("5200.00"),
        currentPrice: new Decimal("7250.00"),
        valuation: new Decimal("72500.00"),
        currency: "INR",
        sourceType: HoldingSourceType.SIMULATED,
      },
    });
  }

  // Seed PPF Account
  const ppfAccount = await prisma.financialAccount.create({
    data: {
      userId: demoUser.id,
      institutionName: "State Bank of India (PPF)",
      accountType: "PPF",
      accountNumberMask: "XX8901",
      currency: "INR",
      balance: new Decimal("120000"),
      isSimulated: true,
      isConnected: false,
      status: "ACTIVE",
    },
  });

  if (ppfInst) {
    await prisma.holdingsSnapshot.create({
      data: {
        accountId: ppfAccount.id,
        instrumentId: ppfInst.id,
        units: new Decimal("1200"),
        averageBuyPrice: new Decimal("100"),
        currentPrice: new Decimal("100"),
        valuation: new Decimal("120000"),
        currency: "INR",
        sourceType: HoldingSourceType.SIMULATED,
      },
    });
  }

  console.log("✓ Demo user (demo@bloom.invest / BloomDemo@2026), goals, accounts & holdings seeded!");
  console.log("🎉 Seed finished successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

