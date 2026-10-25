# Bloom

Bloom is a goal-first investing and financial-planning application. It implements goals and scenarios, portfolio summaries and holdings, investment comparison, market quotes, provider connection flows, brokerage order previews/orders, compliance gates, and assistant conversations.

## Implementation

The project is a Next.js 15/React 19 modular monolith using Prisma 6 and PostgreSQL, Zod, JWT utilities, Decimal.js, Recharts, Tailwind CSS, and Vitest. Server APIs are in `src/app/api/v1`; supporting server code is in `src/server`; the schema and development seed are in `prisma/`.

## Local development

```bash
cd 45_Bloom
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Configure PostgreSQL and a unique `JWT_SECRET`. The environment flags intentionally default to simulated/sandbox integrations and disable personalized securities advice and live brokerage orders. Keep those safeguards in place unless the corresponding integration and compliance work has been completed.

```bash
npm test
npm run lint
npm run build
```

`docker compose up --build` is available for the repository's container setup.
