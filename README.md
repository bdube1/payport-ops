# PayPort Ops Console

Internal operations dashboard for managing transactions, attention queue, and platform health.

## Requirements
- Node.js 18+
- PayPort Gateway running on localhost:8080

## Setup & Run

```bash
npm install
npm run dev
```

Opens at **http://localhost:3001**

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | KPI cards, attention queue, provider status |
| `/attention` | All transactions needing manual action |
| `/transactions` | Search & filter all transactions |
| `/transactions/:ref` | Full transaction detail, timeline, retry/refund |
| `/products` | Product catalogue and payment methods |

## Key Features

- **Retry Fulfilment** — available on FULFILMENT_FAILED and MANUAL_FULFILMENT transactions
- **Initiate Refund** — available on failed/timed-out transactions with required reason
- **Audit Timeline** — every state change with timestamp and actor
- **Auto-refresh** — dashboard refreshes every 30 seconds
- **Provider Status** — live status indicators for all integrated providers

## Configuration

Edit `.env` to change the gateway URL:

```
VITE_API_URL=http://localhost:8080
```

## Build for Production

```bash
npm run build
```
