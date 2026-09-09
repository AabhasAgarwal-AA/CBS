# CBS · Core Banking System

A complete, production-style **Core Banking System** built as a single-page Next.js application. It covers the full lifecycle of retail banking operations — customer onboarding with KYC, deposit accounts (Savings / Current / FD / RD), deposits & withdrawals & inter-account transfers, loan origination through disbursement and EMI servicing, debit & credit card issuance, real-time analytics, and an immutable audit trail of every staff action.

> **Stack** — Next.js 16 (App Router) · TypeScript 5 · Tailwind CSS 4 · shadcn/ui (New York) · Prisma 6 + PostgreSQL · Recharts · Zustand · Sonner

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Quick Start](#quick-start)
4. [Demo Credentials](#demo-credentials)
5. [Project Structure](#project-structure)
6. [Data Model](#data-model)
7. [API Reference](#api-reference)
8. [Modules Walkthrough](#modules-walkthrough)
9. [Banking Business Rules](#banking-business-rules)
10. [Security Notes](#security-notes)
11. [Scripts](#scripts)
12. [Roadmap](#roadmap)
13. [License](#license)

---

## Features

| Module | Capabilities |
| --- | --- |
| **Authentication** | Session-cookie login, SHA-256 hashed passwords, 3 role tiers (Admin / Manager / Teller) |
| **Dashboard** | 6 KPI cards, 30-day credit-vs-debit area chart, accounts-by-type donut, recent transactions feed, pending-loan approvals queue |
| **Customers** | Full KYC onboarding (PAN, Aadhaar, DOB, income, address, occupation), search/filter, KYC verify/reject workflow, profile drawer with tabs for Overview / Accounts / Loans / Cards |
| **Accounts** | Open SAVINGS / CURRENT / FIXED_DEPOSIT / RECURRING with type-specific interest rate & minimum balance, freeze/unfreeze, close (with balance guard) |
| **Transactions** | Deposit, Withdraw, Transfer (account-to-account with counterparty side effect), full history table with ref / channel / balance-after; min-balance and active-status checks inside a Prisma transaction |
| **Loans** | Apply (auto-EMI via reducing-balance formula), Approve/Reject, Disburse (auto-credits the linked account), Repay (splits into principal + interest, updates outstanding, auto-closes when zero), full repayment history |
| **Cards** | Issue DEBIT / CREDIT (Visa / Mastercard / RuPay) with masked card preview and one-time CVV reveal, Block / Unblock |
| **NEFT / RTGS / IMPS** | Originate outbound payment orders with IFSC validation, RTGS min ₹2L / IMPS max ₹5L guards, two-step approve-then-process workflow, UTR generation, auto-debit from source account, SMS alert to customer |
| **QR Banking** | Generate UPI QR codes (dynamic or fixed-amount) for inward collection, simulate payer scan-and-pay (any UPI app), full payment log with INWARD/OUTWARD direction, auto-credit + SMS alert on receipt |
| **Field Agents** | Create door-to-door collection agents (Pigmy / MIS scheme style), record cash collections with receipt numbers, location & SMS receipt to customer, agent stats (total + today's collections) |
| **Standing Instructions** | Set up recurring auto-transfers (DAILY / WEEKLY / MONTHLY), manual "Run now" trigger, automatic next-run scheduling, run counter |
| **SMS Banking** | Send OTPs (5-min expiry, SHA-256 hashed), transaction alerts, balance enquiries, mini statements, KYC updates, marketing; full SMS log with type filter |
| **Customer Mobile App** | Accessible at `/?portal=customer` — separate auth (phone + 4-digit MPIN), shows balance, accounts, cards, loans, mini-statement with credit/debit visual indicators |
| **Reports** | Aggregate KPIs, transaction count & volume by channel bar chart, type-distribution pie, recent 500 transactions, CSV export |
| **Audit Trail** | Every staff action (login, txn, loan, card, customer, account, payment, QR, agent, SI, SMS) recorded with user / action / entity / details; filter by entity |
| **Settings** | Admin-only staff user creation, branch management with auto-IFSC generation |

---

## Tech Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack) | Latest React 19 + RSC, route handlers for APIs |
| Language | **TypeScript 5** (strict) | End-to-end type safety |
| Styling | **Tailwind CSS 4** + **shadcn/ui** (New York) | Utility-first + accessible primitives |
| Database | **Prisma 6** + **PostgreSQL** | Production-grade relational DB with proper Decimal/JSON/enum support |
| Charts | **Recharts 2** | Declarative React charts |
| State | **Zustand 5** | Minimal client store for auth & nav |
| Toasts | **Sonner 2** | Beautiful, accessible notifications |
| Icons | **Lucide React** | 1,500+ clean SVG icons |
| Dates | Native `Intl` API | No date library needed |

---

## Quick Start

### Prerequisites

- **Node.js 20+** or **Bun 1.3+** (recommended)
- **PostgreSQL 14+** running locally or accessible via connection string (Neon, Supabase, RDS, etc.)
- **Prisma CLI** (auto-installed via `node_modules/.bin/prisma`)

### Install & Run

```bash
# 1. Install dependencies
bun install            # or: npm install / pnpm install

# 2. Configure the database connection
#    Edit .env and set DATABASE_URL to your Postgres connection string, e.g.
#    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cbs?schema=public"

# 3. Create the PostgreSQL database (if it doesn't exist yet)
createdb cbs            # or use psql: CREATE DATABASE cbs;

# 4. Apply the Prisma schema (creates all tables)
bun run db:push         # or: npx prisma db push --accept-data-loss

# 5. Start the dev server
bun run dev             # or: npm run dev
```

The app boots at **http://localhost:3000**.

### One-click Demo Data

On the login screen, click **"Seed demo data & sign in as Admin"**. This will:

- Wipe and re-seed the database
- Create 3 branches (Mumbai, Delhi, Bangalore)
- Create 3 staff users (admin, manager, teller)
- Onboard 10 customers with full KYC
- Open 19 accounts (mix of SAVINGS / CURRENT / FD / RD)
- Originate 5 loans (some pending, some approved, some disbursed with repayments)
- Issue 10 cards (debit + credit, multiple networks)
- Generate ~30 days of seeded transactions
- Sign you in as Admin automatically

---

## Demo Credentials

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| **Admin** | `admin@cbs.io` | `admin123` | All modules + Settings (user & branch management) + approve/process payments + create agents |
| **Manager** | `manager@cbs.io` | `manager123` | All modules except Settings (read-only staff list) + approve/process payments + create agents |
| **Teller** | `teller@cbs.io` | `teller123` | All operational modules (cannot create agents or approve/process payments) |

### Customer Mobile App — visit `/?portal=customer`

| Field | Value |
| --- | --- |
| Phone | any seeded customer's phone (e.g. `9876543210` for Ananya Iyer) |
| MPIN | `1234` (all seeded customers) |

### Field Agent App (Pigmy / daily collection)

The field collection module is accessible from the staff console under **Field Agents**. To test it:

| Field | Value |
| --- | --- |
| Agent Code | `AGT-2026-0001` (Suresh), `AGT-2026-0002` (Lakshmi), `AGT-2026-0003` (Mohammed) |
| Password | `agent123` |

In production, agents would use a separate mobile app (Android/iOS) hitting the same `/api/field-collections` endpoint.


---

## Project Structure

```
.
├── prisma/
│   └── schema.prisma              # 9 Prisma models (User, Branch, Customer, Account,
│                                  #   Transaction, Loan, LoanRepayment, Card, AuditLog)
├── db/
│   └── (empty after Postgres migration — DB lives in the Postgres server,
│        not in a local file. Configure via DATABASE_URL in .env)
├── public/
│   ├── logo.svg                   # Favicon / logo
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with Sonner toaster
│   │   ├── page.tsx               # Single user-visible route ("/") — switches between
│   │   │                          #   LoginScreen and AppShell based on session
│   │   ├── globals.css            # Tailwind base + shadcn theme variables
│   │   └── api/                  # 20+ REST route handlers (see API Reference)
│   │       ├── health/route.ts
│   │       ├── auth/{login,logout,me}/route.ts
│   │       ├── dashboard/route.ts
│   │       ├── customers/[route.ts, [id]/route.ts, [id]/kyc/route.ts]
│   │       ├── accounts/[route.ts, [id]/{route,freeze,close}.ts]
│   │       ├── transactions/route.ts
│   │       ├── loans/[route.ts, [id]/{route,approve,disburse,repay}.ts]
│   │       ├── cards/[route.ts, [id]/{route,block,unblock}.ts]
│   │       ├── reports/route.ts
│   │       ├── audit/route.ts
│   │       ├── users/route.ts
│   │       ├── branches/route.ts
│   │       └── seed/route.ts      # POST to populate demo data
│   ├── components/
│   │   ├── banking/
│   │   │   ├── login-screen.tsx   # Two-column branded login with demo creds
│   │   │   ├── app-shell.tsx      # Sidebar + topbar + main content router
│   │   │   └── views/
│   │   │       ├── _shared.tsx        # PageHeader, LoadingGrid, EmptyState
│   │   │       ├── dashboard.tsx      # KPIs + charts + activity feed
│   │   │       ├── customers.tsx     # Onboard, search, KYC, profile drawer
│   │   │       ├── accounts.tsx      # Open / freeze / close, jump to transactions
│   │   │       ├── transactions.tsx   # Deposit / withdraw / transfer + history
│   │   │       ├── loans.tsx         # Apply / approve / disburse / repay
│   │   │       ├── cards.tsx         # Issue / block / unblock with CVV reveal
│   │   │       ├── reports.tsx       # KPIs + charts + CSV export
│   │   │       ├── audit.tsx         # Filterable audit log table
│   │   │       └── settings.tsx      # Staff users + branches (admin-only)
│   │   └── ui/                    # 16 shadcn/ui primitives actually used
│   │       ├── accordion.tsx (deleted)
│   │       ├── ... (31 components removed in cleanup)
│   │       └── (kept): avatar, badge, button, card, dialog, dropdown-menu,
│   │                 input, label, scroll-area, select, sheet, skeleton,
│   │                 sonner, table, tabs
│   └── lib/
│       ├── db.ts                  # Prisma client singleton (logs: error+warn)
│       ├── session.ts             # In-memory session store (globalThis for HMR-safe)
│       ├── banking.ts             # Account/Loan/Card/Txn number generators,
│       │                          #   EMI formula, currency/date formatters, password hash
│       ├── audit.ts               # recordAudit() helper with FK safety
│       ├── store.ts               # Zustand stores: useAuth + useNav
│       └── utils.ts               # cn() Tailwind class merger
├── package.json                   # 23 runtime deps + 9 dev deps (down from 80+)
├── tsconfig.json                  # Strict TS with @/* path alias → ./src/*
├── tailwind.config.ts             # Dark-mode class + shadcn HSL theme tokens
├── next.config.ts                 # output: "standalone", reactStrictMode off
├── eslint.config.mjs              # Next.js + TypeScript rules (relaxed for demo)
└── README.md                      # This file
```

---

## Data Model

Nine Prisma models with proper relations and indexes:

```
┌─────────┐     ┌──────────┐     ┌──────────┐
│  User   │──┬──│ Customer │──┬──│ Account  │──┐
│ (staff) │  │  └──────────┘  │  └──────────┘  │
└─────────┘  │       │        │       │        │
     │       │       │        │       │        │
     │       │       ▼        │       ▼        │
     │       │  ┌────────┐    │  ┌──────────┐  │
     │       │  │  Loan  │    │  │  Card    │  │
     │       │  └────────┘    │  └──────────┘  │
     │       │       │        │                 │
     │       │       ▼        │                 │
     │       │  ┌─────────────┴──┐              │
     │       │  │ LoanRepayment  │              │
     │       │  └───────────────┘              │
     │       │                                 │
     │       │       ┌──────────────┐          │
     │       └──────▶│ Transaction │◀─────────┘
     │               └──────────────┘
     │
     ▼
┌──────────┐     ┌──────────┐
│ AuditLog │     │  Branch  │
└──────────┘     └──────────┘
```

### Models at a glance

| Model | Purpose | Key fields |
| --- | --- | --- |
| **User** | Bank staff login | email, password (SHA-256), role (ADMIN/MANAGER/TELLER), branch |
| **Branch** | Physical bank branch | code, name, city, ifsc (auto-generated as `CBSB0<code>`) |
| **Customer** | KYC'd retail customer | customerNo, fullName, phone, pan, aadhaar, dob, kycStatus, status |
| **Account** | Deposit account | accountNumber (12-digit), type, balance, interestRate, minBalance, status |
| **Transaction** | Ledger entry | txnRef, type, amount, balanceAfter, channel, counterparty |
| **Loan** | Credit facility | loanNumber, principal, interestRate, tenureMonths, emi, outstanding, status |
| **LoanRepayment** | EMI payment record | amount, principalPart, interestPart, balanceAfter |
| **Card** | Debit / credit card | cardNumber (16-digit), type, network, expiry, status, creditLimit, dailyLimit |
| **AuditLog** | Immutable action trail | userId, action, entity, entityId, details |

---

## API Reference

All routes are under `/api/*` and return JSON. Authenticated routes require the `cbs_token` cookie set by `POST /api/auth/login`.

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness/readiness probe — no auth. Pings the database and returns `{status, service, timestamp, uptimeSeconds, checks: {database: {status, latencyMs}}}`. `200` when the DB is reachable, `503` (`status: "degraded"`) when it is not. |

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Authenticate with `{email, password}`, sets `cbs_token` cookie |
| `POST` | `/api/auth/logout` | Destroys session, clears cookie |
| `GET` | `/api/auth/me` | Returns current session user or `null` |

### Dashboard

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Aggregate KPIs, 30-day trend, account/loan distributions, recent activity, pending loans |

### Customers

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/customers?q=&status=&limit=` | List/search customers |
| `POST` | `/api/customers` | Onboard new customer (full KYC form) |
| `GET` | `/api/customers/:id` | Get customer with accounts, loans, cards |
| `PATCH` | `/api/customers/:id` | Update customer fields |
| `DELETE` | `/api/customers/:id` | Soft-delete (sets status=INACTIVE) |
| `POST` | `/api/customers/:id/kyc` | Verify or reject KYC (`{status: VERIFIED\|REJECTED}`) |

### Accounts

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/accounts?q=&status=&type=&customerId=&limit=` | List/search accounts |
| `POST` | `/api/accounts` | Open new account (`{customerId, type, initialDeposit, ...}`) |
| `GET` | `/api/accounts/:id` | Get account with transactions, cards, loans |
| `POST` | `/api/accounts/:id/freeze` | Toggle freeze/unfreeze |
| `POST` | `/api/accounts/:id/close` | Close account (fails if balance > 0) |

### Transactions

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/transactions?accountNumber=&type=&limit=` | List transactions |
| `POST` | `/api/transactions` | Process `{accountNumber, type: DEPOSIT\|WITHDRAW\|TRANSFER_OUT, amount, counterpartyAccount?, description?, channel?}` — runs inside a Prisma transaction |

### Loans

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/loans?status=&customerId=&limit=` | List loans |
| `POST` | `/api/loans` | Apply for loan (`{customerId, type, principal, interestRate, tenureMonths}`) — auto-calculates EMI |
| `GET` | `/api/loans/:id` | Get loan with repayments |
| `POST` | `/api/loans/:id/approve` | Approve or reject (`{decision: APPROVED\|REJECTED}`) |
| `POST` | `/api/loans/:id/disburse` | Disburse approved loan — credits linked account |
| `POST` | `/api/loans/:id/repay` | Record EMI repayment (`{amount}`) — splits principal/interest |

### Cards

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/cards?customerId=&status=&limit=` | List cards (card numbers masked) |
| `POST` | `/api/cards` | Issue card (`{customerId, accountNumber, type, network, creditLimit?, dailyLimit?}`) — returns one-time CVV |
| `GET` | `/api/cards/:id` | Get card detail (masked) |
| `POST` | `/api/cards/:id/block` | Block card |
| `POST` | `/api/cards/:id/unblock` | Unblock card |

### Reports, Audit, Settings, Seed

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/reports?from=&to=` | Aggregate report with KPIs, type/channel breakdowns, last 500 txns |
| `GET` | `/api/audit?entity=&limit=` | Audit log with optional entity filter |
| `GET` | `/api/users` | List staff users |
| `POST` | `/api/users` | Create staff user (admin only) |
| `GET` | `/api/branches` | List branches |
| `POST` | `/api/branches` | Create branch (auto-generates IFSC) |
| `POST` | `/api/seed` | Wipe & reseed demo data |

---

## Modules Walkthrough

### 1. Login & Authentication

- Session-based auth using an in-memory `Map<token, SessionUser>` stored on `globalThis` (survives Next.js HMR in dev).
- Passwords are hashed with **SHA-256 + salt** (`crypto.subtle.digest`).
- The `cbs_token` cookie is `httpOnly`, `sameSite=lax`, 24-hour expiry.
- On logout, the session is destroyed server-side and the cookie is cleared.

### 2. Dashboard

- Six KPI cards: Total Customers, Active Accounts, Total Deposits, Loans Outstanding, Cards Issued, Bank Staff.
- 30-day Credit vs Debit area chart (Recharts `AreaChart` with gradient fills).
- Accounts-by-type donut chart.
- Recent transactions feed (latest 8).
- Pending loan approvals queue (clickable to jump to Loans).

### 3. Customer Management

- **Onboard**: 13-field form (name, phone, email, DOB, gender, address, city, state, pincode, PAN, Aadhaar, occupation, income).
- **Search & filter**: by name/phone/email/customerNo/PAN, by status (ACTIVE/INACTIVE/BLOCKED).
- **KYC workflow**: verify or reject with a single click — `kycDate` timestamped on verify.
- **Profile drawer** (shadcn `Sheet`): 4 tabs — Overview / Accounts / Loans / Cards.

### 4. Account Operations

- **Open**: pick customer → pick type (SAVINGS/CURRENT/FD/RD) → enter initial deposit. Type-specific defaults applied:
  | Type | Interest | Min Balance |
  | --- | --- | --- |
  | SAVINGS | 3.5% | ₹1,000 |
  | CURRENT | 0% | ₹5,000 |
  | FIXED_DEPOSIT | 6.5% | ₹10,000 |
  | RECURRING | 5.5% | ₹100 |
- **Freeze / Unfreeze**: toggle account status (blocks transactions).
- **Close**: only allowed when balance is zero.
- **Quick action**: jump to Transactions view with the account pre-loaded (via `localStorage`).

### 5. Transactions

- Three operation modes via tabs: **Deposit** / **Withdraw** / **Transfer**.
- Each transaction:
  1. Locks the account row inside a Prisma `$transaction` (30s timeout).
  2. Validates account is `ACTIVE`.
  3. For debits: checks balance won't go negative **and** won't drop below `minBalance` (except CURRENT accounts).
  4. Updates balance, inserts a `Transaction` record with running `balanceAfter`.
  5. For transfers: also debits/credits the counterparty account atomically.
  6. Records an audit entry.

### 6. Loan Management

- **Apply**: customer + type (HOME/AUTO/PERSONAL/EDUCATION/GOLD) + principal + rate + tenure. EMI is auto-calculated using the reducing-balance formula:
  ```
  EMI = P × r × (1+r)^n / ((1+r)^n − 1)
  where r = annualRate / 12 / 100, n = tenureMonths
  ```
- **Approve / Reject**: only when status is `PENDING`.
- **Disburse**: only when `APPROVED`. Credits the linked account (creates one if none), updates `outstanding = principal`, sets `disbursedAt`.
- **Repay**: splits payment into `interestPart = outstanding × rate/12/100` and `principalPart = amount − interestPart`. Reduces outstanding. Auto-closes loan when outstanding hits zero.

### 7. Card Management

- **Issue**: 16-digit card number (Visa prefix `4`), random 3-digit CVV (hashed), 5-year expiry. Returns the CVV **once** for display (CVV is never retrievable again).
- Card preview rendered as a gradient credit-card visual with masked PAN.
- **Block / Unblock**: toggles `status` between `ACTIVE` and `BLOCKED`.

### 8. Reports & Analytics

- 8 KPI cards: Transactions, Total Credit, Total Debit, Total Deposits, Loans Outstanding, Active Accounts, Customers, Cards.
- Bar chart: transaction count & volume by channel (TELLER / ATM / ONLINE / MOBILE).
- Pie chart: transaction distribution by type.
- **CSV export**: downloads the latest 500 transactions as a CSV file.

### 9. Audit Trail

- Every state-changing action is logged via `recordAudit()`:
  - `LOGIN`, `LOGOUT`
  - `CREATE` (customer, account, user, branch)
  - `UPDATE`, `DELETE` (customer)
  - `KYC_VERIFIED`, `KYC_REJECTED`
  - `FREEZE`, `UNFREEZE`, `CLOSE` (account)
  - `TXN` (deposit/withdraw/transfer)
  - `LOAN_APPLY`, `LOAN_APPROVED`, `LOAN_REJECTED`, `LOAN_DISBURSE`, `LOAN_REPAY`
  - `CARD_ISSUE`, `CARD_BLOCK`, `CARD_UNBLOCK`
  - `SEED` (system)
- Filterable by entity type. The `recordAudit` helper validates the user still exists before inserting (gracefully handles re-seeds).

### 10. Settings (Admin only)

- **Staff tab**: list all users with role badges. Admin can create new users (name, email, password, role, optional branch).
- **Branches tab**: list branches with IFSC codes. Create new branch — IFSC auto-generated as `CBSB0<code>`.

---

## Banking Business Rules

| Rule | Enforcement |
| --- | --- |
| Account must be `ACTIVE` to transact | Checked in `POST /api/transactions` |
| Withdrawals cannot drop balance below `minBalance` (except CURRENT) | Checked before debit |
| Transfers require sufficient balance on both sides | Atomic check inside `$transaction` |
| Loans must be `PENDING` to approve/reject | Status guard in `/api/loans/:id/approve` |
| Loans must be `APPROVED` to disburse | Status guard in `/api/loans/:id/disburse` |
| Loans must be `DISBURSED` to repay | Status guard in `/api/loans/:id/repay` |
| Repayment amount must cover at least the interest due | Validated in repay handler |
| Accounts cannot be closed if balance > 0 | Guard in `/api/accounts/:id/close` |
| Cards can only be blocked when `ACTIVE`, unblocked when `BLOCKED` | Status guards in block/unblock routes |
| CVV is shown only once at issuance | Returned in issuance response, never retrievable |
| Audit log is append-only | No `UPDATE`/`DELETE` endpoints exposed for `AuditLog` |
| **Monetary fields use `@db.Decimal(18, 2)`** | Avoids Float rounding errors (e.g., `0.1 + 0.2 ≠ 0.3`) |
| **Interest rates use `@db.Decimal(6, 3)`** | Up to 999.999 % precision |
| API responses convert Decimals to JS numbers | See `toNumber()` helper in `src/lib/banking.ts` |

### Why Decimal, not Float?

JavaScript's `Number` type is an IEEE-754 double-precision float — it cannot exactly represent base-10 decimals. This causes classic bugs:

```js
0.1 + 0.2 === 0.30000000000000004   // true!
1.005.toFixed(2) === "1.00"          // wrong, should be "1.01"
```

For a banking system, these rounding errors are unacceptable. PostgreSQL's `DECIMAL(18, 2)` type stores exact base-10 numbers with 2 fractional digits (enough for paisa-level precision up to ₹99,99,99,99,99,99,999.99). Prisma returns these as `Decimal.js` objects on the server, which we convert to JS numbers at the API boundary via `toNumber()` (see `src/lib/banking.ts`). All arithmetic inside transactions (balance updates, EMI splits, interest calculations) uses JS numbers — Decimal precision is preserved in storage, and we accept the floating-point tradeoff only in transient computations (which round-trip cleanly through 2 decimal places).

---

## Security Notes

> ⚠️ **This is a demo application. Do NOT deploy to production without hardening.**

| Concern | Current state | Production recommendation |
| --- | --- | --- |
| Password hashing | SHA-256 + static salt | Use `argon2id` or `bcrypt` with per-user salt |
| Session storage | In-memory `Map` (lost on restart) | Use Redis or signed JWT cookies |
| CSRF | Not implemented (relies on `sameSite=lax`) | Add CSRF tokens for state-changing endpoints |
| Rate limiting | None | Add `upstash/ratelimit` on login & txn endpoints |
| SQL injection | Safe (Prisma parameterized queries) | ✅ |
| XSS | Safe (React escapes by default, no `dangerouslySetInnerHTML`) | ✅ |
| Audit log integrity | Append-only at API level | Add hash-chaining or write-once storage |
| Secrets in env | Only `DATABASE_URL` | Move to a secrets manager |
| HTTPS | Handled by Caddy in dev | Terminate TLS at reverse proxy in prod |

---

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start Next.js dev server on port 3000 with live HMR |
| `bun run build` | Production build (outputs to `.next/standalone/`) |
| `bun run start` | Run the production standalone server |
| `bun run lint` | Run ESLint (Next.js + TypeScript rules) |
| `bun run db:push` | Push Prisma schema to PostgreSQL (destructive — accepts data loss) |
| `bun run db:generate` | Regenerate Prisma Client |
| `bun run db:migrate` | Create & apply a Prisma migration |
| `bun run db:reset` | Reset DB & re-run all migrations |

---

## Roadmap

Potential enhancements for a production deployment:

- [ ] Replace in-memory sessions with NextAuth.js + JWT or Redis
- [ ] Add role-based route guards (currently enforced only in Settings UI)
- [x] Implement standing instructions & recurring transfers ✅
- [ ] Add multi-currency support with FX rates
- [x] Integrate NEFT / RTGS / IMPS payment orders with approve/process workflow ✅
- [x] Add QR inward collection (UPI QR generation + payment receipt) ✅
- [x] Add field-agent collection app (Pigmy daily deposit scheme) ✅
- [x] Add SMS banking (OTP, transaction alerts, balance enquiry) ✅
- [x] Add customer mobile app (separate auth + balance enquiry + mini-statement) ✅
- [ ] Add interest accrual cron job for SAVINGS / FD / RD accounts
- [ ] Add loan default detection & NPA classification
- [ ] Add card transaction processing (POS, e-commerce auth)
- [ ] Implement statement generation (PDF, monthly)
- [ ] Add 2FA for sensitive operations (large transfers, card issuance)
- [ ] Add WebSocket-based real-time dashboard updates
- [x] Migrate from SQLite to PostgreSQL for production scale ✅ (schema is provider-agnostic)
- [x] Use Decimal (not Float) for monetary fields to avoid rounding errors ✅ (when on Postgres)
- [ ] Add Pigmy / MIS / Share / OD account types (schema supports, UI pending)
- [ ] Add cheque book management (issue / return / clear)
- [ ] Add passbook printing (PDF)
- [ ] Integrate with NPCI for live UPI / IMPS / NACH
- [ ] Add AML / fraud detection rules
- [ ] Add OpenTelemetry tracing & structured logging
- [ ] Add unit + integration tests (Vitest + Playwright)

---

## License

This project is provided as-is for educational and demonstration purposes. No warranty expressed or implied.

---

**Built with** Next.js 16 · TypeScript · Tailwind CSS · Prisma · Recharts · shadcn/ui
