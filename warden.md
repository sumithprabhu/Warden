# Warden - Private Payroll System

> Confidential payroll powered by Unlink's zero-knowledge privacy pool on Base Sepolia.
> Hackathon project - 48 hours.

---

## 1. Product Vision

Warden replaces traditional payroll with **private payments**. Employers fund a privacy pool, add employees, and run payroll — all amounts, recipients, and frequencies stay hidden on-chain via Unlink's ZK infrastructure. No one — not competitors, not other employees, not chain observers — can see who gets paid what.

Warden serves two customer types in one product:
- **Teams & Startups** — crypto-native companies paying contributors in USDC
- **DAOs** — decentralized orgs running governance-gated private payroll

**Tagline:** _"Payroll that nobody can see."_

---

## 2. Core Features

### 2.1 Authentication & Onboarding
- **Privy auth** — email OTP, social login (Google, Twitter), or wallet connect
- Privy auto-creates embedded wallets for users without one (zero-friction onboarding)
- Two roles: **Admin** (employer) and **Employee/Contributor**
- On signup, generate an Unlink mnemonic per user, store encrypted in DB
- Invite-link flow for employees (admin sends link, employee signs up via Privy)
- **ENS resolution on invite** — admin can enter `yashu.eth` instead of a raw wallet address; ENS resolves to the underlying address automatically

### 2.2 Admin Dashboard
| Feature | Description |
|---------|-------------|
| **Organization Setup** | Create org, set name, logo, token address, org type (Team or DAO) |
| **Treasury Overview** | View Unlink pool balance, EVM wallet balance, deposit/withdraw funds |
| **Employee Management** | Add/remove employees, set salary, payment frequency, Unlink address auto-generated |
| **ENS Identity** | Add contributors by ENS name — resolves and stores underlying address |
| **Payroll Runs** | One-click batch payroll via Unlink multi-recipient transfer |
| **DAO Approval Mode** | For DAO orgs: payroll run requires multi-sig approval before executing |
| **Payroll History** | Full log of past runs with status (processed/pending/failed) |
| **Manual Payments** | Ad-hoc bonus, reimbursement, or contractor milestone transfers |
| **Vesting Schedules** | Set token vesting for employees with cliff + linear unlock |
| **Department Groups** | Organise employees into departments, run payroll per department |

### 2.3 Employee Portal
| Feature | Description |
|---------|-------------|
| **Balance** | View private Unlink balance |
| **Payment History** | See incoming payments with dates and statuses |
| **Payslips** | AI-generated PDF payslip per payment period — downloadable, never stored on-chain |
| **Withdraw** | Cash out from privacy pool to any EVM wallet or ENS name |
| **Vesting Tracker** | Visual cliff + unlock progress for vested allocations |
| **Profile** | View Unlink address, ENS name (if set), update personal info |

### 2.4 Payroll Engine
- **Scheduled Payroll**: Admin sets frequency (weekly/biweekly/monthly), system runs batch transfer
- **Multi-recipient Transfer**: Single Unlink SDK call pays all employees at once
- **DAO Mode**: Payroll run enters PENDING_APPROVAL state, designated approvers sign off before execution
- **Status Tracking**: Poll each payroll transaction to completion
- **Retry Logic**: Failed transfers get queued for retry
- **Department Payroll**: Run payroll for a single department without affecting others


### 2.6 Treasury Management
- **Deposit**: Admin deposits ERC-20 tokens from EVM wallet into Unlink pool
- **Balance Monitoring**: Warn when pool balance is below next payroll amount
- **Withdraw**: Pull unused funds back to EVM wallet
- **Runway Calculator**: Based on current burn rate, AI shows how many months of runway remain in the treasury

### 2.7 DAO Mode
- Org type toggle: **Team** or **DAO** on setup
- DAO orgs have a configurable **approver list** (wallet addresses or ENS names)
- Payroll proposals show total amount + employee count (not individual salaries — privacy preserved)
- Approvers sign off via wallet signature
- Once threshold met → Unlink executes private disbursement
- Full approval audit trail in DB (who approved, when) — nothing on-chain reveals amounts

### 2.8 Vesting Schedules
- Admin sets: total allocation, cliff period, vesting duration, start date
- System auto-releases vested tokens on schedule via Unlink
- Employee sees visual progress bar: locked / unlocked / claimed
- Cliff not yet reached → tokens locked, no transfer possible
- On cliff date → first tranche auto-releases privately via Unlink

### 2.9 Notifications
- Email notifications via Resend:
  - Payroll executed → admin confirmation + each employee notified
  - Low treasury warning (< 1 payroll run remaining)
  - Vesting unlock triggered
  - DAO approval requested
  - Invite link generated

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, ShadCN UI, Tailwind CSS, Recharts |
| **Backend** | Next.js API Routes (Route Handlers) |
| **Database** | MongoDB via Mongoose ODM |
| **Auth** | Privy (`@privy-io/react-auth` + `@privy-io/server-auth`) — email OTP, social, wallet |
| **Payments** | Unlink SDK (`@unlink-xyz/sdk`) + viem |
| **ENS** | viem ENS resolution (`getEnsAddress`) on Base / mainnet |
| **PDF Generation** | `@react-pdf/renderer` for AI-generated payslips |
| **Email** | Resend for transactional notifications |
| **Blockchain** | Base Sepolia (testnet) |
| **Encryption** | AES-256-GCM for mnemonic storage |
| **Deployment** | Vercel (frontend + API) + MongoDB Atlas (free tier) |

---

## 4. Database Schema (MongoDB / Mongoose)

```ts
// ===== User =====
const UserSchema = new Schema({
  privyId:           { type: String, required: true, unique: true }, // Privy DID
  email:             { type: String, sparse: true },
  name:              { type: String },
  role:              { type: String, enum: ['ADMIN', 'EMPLOYEE'], default: 'EMPLOYEE' },
  ensName:           { type: String },                               // e.g. "yashu.eth"
  encryptedMnemonic: { type: String, required: true },               // AES-256-GCM
  unlinkAddress:     { type: String },                               // cached bech32m
  evmAddress:        { type: String },                               // from Privy or ENS
  organizationId:    { type: Schema.Types.ObjectId, ref: 'Organization' },
}, { timestamps: true });

// ===== Organization =====
const OrganizationSchema = new Schema({
  name:           { type: String, required: true },
  logo:           { type: String },
  orgType:        { type: String, enum: ['TEAM', 'DAO'], default: 'TEAM' },
  tokenAddress:   { type: String, required: true },
  tokenSymbol:    { type: String, default: 'USDC' },
  tokenDecimals:  { type: Number, default: 18 },
  evmPrivateKey:  { type: String, required: true },                  // encrypted
  approvers:      [{ evmAddress: String, ensName: String }],         // DAO mode
  createdBy:      { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ===== Employee =====
const EmployeeSchema = new Schema({
  userId:          { type: Schema.Types.ObjectId, ref: 'User', unique: true },
  organizationId:  { type: Schema.Types.ObjectId, ref: 'Organization' },
  departmentId:    { type: Schema.Types.ObjectId, ref: 'Department' },
  employeeType:    { type: String, enum: ['FULL_TIME', 'CONTRACTOR'], default: 'FULL_TIME' },
  salary:          { type: String, required: true },                 // wei
  payFrequency:    { type: String, enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'], default: 'MONTHLY' },
  isActive:        { type: Boolean, default: true },
}, { timestamps: true });

// ===== Department =====
const DepartmentSchema = new Schema({
  name:           { type: String, required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
}, { timestamps: true });

// ===== Payroll =====
const PayrollSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  departmentId:   { type: Schema.Types.ObjectId, ref: 'Department' },
  status:         { type: String, enum: ['PENDING', 'PENDING_APPROVAL', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  totalAmount:    { type: String },
  employeeCount:  { type: Number },
  unlinkTxId:     { type: String },
  approvals:      [{ approverAddress: String, signedAt: { type: Date, default: Date.now } }],
  executedAt:     { type: Date },
}, { timestamps: true });

// ===== Payment =====
const PaymentSchema = new Schema({
  payrollId:      { type: Schema.Types.ObjectId, ref: 'Payroll' },
  employeeUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  amount:         { type: String },
  unlinkTxId:     { type: String },
  status:         { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  payslipGenerated: { type: Boolean, default: false },
}, { timestamps: true });

// ===== Vesting =====
const VestingSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  employeeUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  totalAmount:    { type: String },
  cliffMonths:    { type: Number },
  vestingMonths:  { type: Number },
  startDate:      { type: Date },
  releasedAmount: { type: String, default: '0' },
  status:         { type: String, enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'ACTIVE' },
}, { timestamps: true });

// ===== Invite =====
const InviteSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  email:          { type: String },
  ensName:        { type: String },
  token:          { type: String, unique: true },
  salary:         { type: String },
  payFrequency:   { type: String, enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'], default: 'MONTHLY' },
  employeeType:   { type: String, enum: ['FULL_TIME', 'CONTRACTOR'], default: 'FULL_TIME' },
  departmentId:   { type: Schema.Types.ObjectId, ref: 'Department' },
  used:           { type: Boolean, default: false },
  expiresAt:      { type: Date },
}, { timestamps: true });
```

---

## 5. API Routes

### Auth (Privy-managed)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/verify` | Verify Privy token, create/fetch user in MongoDB, assign role |
| POST | `/api/auth/onboard` | First-time setup: generate Unlink mnemonic, create org (admin) or accept invite (employee) |

### Organization
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/org` | Create organization |
| GET | `/api/org` | Get current user's org |
| PUT | `/api/org` | Update org settings |

### Employees
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/employees` | List all employees |
| POST | `/api/employees/invite` | Create invite link (supports ENS name) |
| PUT | `/api/employees/[id]` | Update employee salary/frequency/department |
| DELETE | `/api/employees/[id]` | Deactivate employee |

### Departments
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/departments` | List departments |
| POST | `/api/departments` | Create department |
| DELETE | `/api/departments/[id]` | Delete department |

### Payroll
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/payroll/run` | Execute payroll (or submit for DAO approval) |
| POST | `/api/payroll/[id]/approve` | DAO approver signs off on payroll |
| GET | `/api/payroll` | List payroll history |
| GET | `/api/payroll/[id]` | Payroll details + payments |
| GET | `/api/payroll/upcoming` | Preview next payroll |

### Treasury
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/treasury/balance` | Unlink pool + EVM wallet balance |
| POST | `/api/treasury/deposit` | Deposit into privacy pool |
| POST | `/api/treasury/withdraw` | Withdraw from pool |
| GET | `/api/treasury/transactions` | Unlink transaction history |

### Vesting
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/vesting` | Create vesting schedule |
| GET | `/api/vesting` | List all vesting schedules |
| POST | `/api/vesting/[id]/release` | Trigger vested token release |

### AI
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/ai/forecast` | Budget forecast + runway projection |
| POST | `/api/ai/anomaly-check` | Scan upcoming payroll for anomalies |
| POST | `/api/ai/payslip` | Generate PDF payslip for a payment |
| POST | `/api/ai/query` | Natural language payroll query |

### Employee Self-Service
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/me/balance` | Unlink balance |
| GET | `/api/me/payments` | Payment history |
| POST | `/api/me/withdraw` | Withdraw to EVM wallet or ENS name |
| GET | `/api/me/payslips/[id]` | Download AI-generated payslip PDF |
| GET | `/api/me/vesting` | View vesting schedule + progress |

### ENS
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/ens/resolve?name=yashu.eth` | Resolve ENS name to EVM address |

---

## 6. Frontend Routes & Pages

### Public Pages
| Route | Page |
|-------|------|
| `/` | Landing page |
| `/login` | Privy login (email OTP, Google, Twitter, wallet connect) |
| `/onboard` | Post-login: admin creates org OR employee accepts invite |
| `/invite/[token]` | Employee invite acceptance (auto-redirects to Privy login then onboard) |

### Admin Pages
| Route | Page |
|-------|------|
| `/dashboard` | Overview: treasury, runway, upcoming payroll, anomaly alerts |
| `/dashboard/employees` | Employee list with ENS names, dept, salary, type |
| `/dashboard/employees/invite` | Invite form: email or ENS, salary, dept, type |
| `/dashboard/departments` | Department management |
| `/dashboard/payroll` | Payroll history |
| `/dashboard/payroll/run` | Run payroll: anomaly check → preview → confirm → execute |
| `/dashboard/payroll/[id]/approve` | DAO approval view |
| `/dashboard/treasury` | Balance, deposit, withdraw, runway |
| `/dashboard/vesting` | Vesting schedule management |
| `/dashboard/ai` | AI assistant: NL queries, forecasts, benchmark suggestions |
| `/dashboard/settings` | Org settings, approver list (DAO mode) |

### Employee Pages
| Route | Page |
|-------|------|
| `/portal` | Balance, recent payments, vesting snapshot |
| `/portal/payments` | Full payment history + payslip downloads |
| `/portal/vesting` | Vesting progress with cliff + unlock timeline |
| `/portal/withdraw` | Withdraw to wallet or ENS name |
| `/portal/profile` | Unlink address, ENS name, personal info |

---

## 7. Architecture Diagram

```
                         ┌──────────────────────┐
                         │     Next.js App       │
                         │  (Vercel / Frontend)  │
                         └──────────┬───────────┘
                                    │
          ┌─────────────────────────┼──────────────────────────┐
          │                         │                          │
    ┌─────▼─────┐           ┌───────▼──────┐          ┌───────▼──────┐
    │  Privy     │           │ Payroll/     │          │  AI API      │
    │  Auth API  │           │ Treasury     │          │  Routes      │
    └─────┬──────┘           │  Routes     │          │  (Claude)    │
          │                 └───────┬──────┘          └───────┬──────┘
          │                         │                         │
          ▼                         ▼                         ▼
    ┌──────────────────────────────────────────────────────────────┐
    │               Mongoose ODM / MongoDB Atlas                    │
    │     Users, Orgs, Employees, Payrolls, Vestings, Depts        │
    └──────────────────────────────┬───────────────────────────────┘
                                   │
               ┌───────────────────┼───────────────────┐
               │                   │                   │
        ┌──────▼──────┐    ┌───────▼──────┐   ┌───────▼──────┐
        │ Unlink SDK   │    │   viem ENS   │   │  Claude API  │
        │ (ZK Payroll) │    │  Resolution  │   │  (AI layer)  │
        └──────┬───────┘    └──────────────┘   └───────┬──────┘
               │                                       │
               ▼                                       ▼
    ┌──────────────────────────┐           ┌────────────────────┐
    │  Base Sepolia            │           │  PDF Payslip       │
    │  - Privacy Pool          │           │  Generation        │
    │  - ZK Proofs             │           │  (@react-pdf)      │
    │  - ERC-20 Transfers      │           └────────────────────┘
    └──────────────────────────┘
```

---

## 8. Unlink Integration Details

### Client Factory

```ts
export async function createUnlinkClient(userMnemonic: string) {
  const evmAccount = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({ account: evmAccount, chain: baseSepolia, transport: http(process.env.RPC_URL) });
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(process.env.RPC_URL) });

  return createUnlink({
    engineUrl: "https://staging-api.unlink.xyz",
    apiKey: process.env.UNLINK_API_KEY!,
    account: unlinkAccount.fromMnemonic({ mnemonic: userMnemonic }),
    evm: unlinkEvm.fromViem({ walletClient, publicClient }),
  });
}
```

### Payroll Execution Flow

```ts
// 1. AI anomaly check before execution
const anomalies = await runAnomalyCheck(employees);
if (anomalies.length > 0) return { status: 'FLAGGED', anomalies };

// 2. DAO mode: submit for approval if org type is DAO
if (org.orgType === 'DAO') {
  await createPayrollProposal(payrollId);
  return { status: 'PENDING_APPROVAL' };
}

// 3. Execute multi-recipient private transfer
const result = await adminUnlink.transfer({
  token: org.tokenAddress,
  transfers: employees.map(emp => ({
    recipientAddress: emp.unlinkAddress,
    amount: emp.salary,
  })),
});

// 4. Poll for completion + trigger payslip generation
const confirmed = await adminUnlink.pollTransactionStatus(result.txId);
if (confirmed) await generatePayslipsForRun(payrollId);
```

### Privy Auth Flow

```tsx
// app/providers.tsx — wrap app with PrivyProvider
'use client';
import { PrivyProvider } from '@privy-io/react-auth';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'google', 'twitter', 'wallet'],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

```ts
// lib/auth.ts — server-side token verification
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(process.env.NEXT_PUBLIC_PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);

export async function verifyPrivyToken(authHeader: string) {
  const token = authHeader.replace('Bearer ', '');
  const { userId } = await privy.verifyAuthToken(token);
  return userId; // Privy DID — use as privyId in MongoDB
}
```

```tsx
// Client-side login hook usage
import { usePrivy } from '@privy-io/react-auth';

function LoginButton() {
  const { login, ready, authenticated, user } = usePrivy();
  if (!ready) return null;
  if (authenticated) redirect('/dashboard');
  return <button onClick={login}>Sign In</button>;
}
```

### ENS Resolution

```ts
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const ensClient = createPublicClient({ chain: mainnet, transport: http() });

export async function resolveENS(name: string): Promise<string | null> {
  return await ensClient.getEnsAddress({ name });
}
```

---

## 9. AI Integration Details

### Budget Forecaster
```ts
// Sends last 6 months of payroll data to Claude
// Returns: projected monthly burn, runway in months, trend analysis
const forecast = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  messages: [{
    role: "user",
    content: `Given this payroll history: ${JSON.stringify(payrollHistory)}
    and current treasury balance: ${treasuryBalance}
    Return JSON: { monthlyBurn, runwayMonths, trend, recommendation }`
  }]
});
```

### Anomaly Detection
```ts
// Runs before every payroll execution
// Checks: duplicate addresses, outlier amounts, inactive employees, sudden salary changes
const check = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  messages: [{
    role: "user",
    content: `Scan this payroll for anomalies: ${JSON.stringify(payrollData)}
    Flag: duplicates, outliers (>2x median), inactive users, new additions.
    Return JSON: { anomalies: [{type, severity, description, employeeId}] }`
  }]
});
```

### AI Payslip Generator
```ts
// Generates structured payslip data → rendered to PDF via @react-pdf/renderer
const payslip = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  messages: [{
    role: "user",
    content: `Generate a professional payslip for:
    Employee: ${name}, Role: ${role}, Period: ${period}, Amount: ${amount} USDC
    Org: ${orgName}. Return JSON: { header, period, grossPay, netPay, notes }`
  }]
});
```

---

## 10. Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://...   # MongoDB Atlas connection string

# Auth (Privy)
NEXT_PUBLIC_PRIVY_APP_ID=...    # From Privy Dashboard
PRIVY_APP_SECRET=...            # Server-side verification

# Blockchain
EVM_PRIVATE_KEY=0x...           # Org treasury wallet
RPC_URL=https://sepolia.base.org

# Unlink
UNLINK_API_KEY=...              # From hackaton-apikey.vercel.app

# Encryption
MNEMONIC_ENCRYPTION_KEY=...     # 32-byte hex for AES-256-GCM

# AI
ANTHROPIC_API_KEY=...           # Claude API for AI features

# Email
RESEND_API_KEY=...              # Transactional notifications
```

---

## 11. UI/UX Design Decisions

- **Rebrand landing page**: Warden branding, privacy-first messaging, dark theme
- **Dashboard layout**: Sidebar navigation, main content area
- **Color scheme**: Dark OKLCH theme — fits privacy/security positioning
- **Anomaly alerts**: Red banner on payroll run page if AI flags issues
- **DAO approval flow**: Clear approval status with signer progress (e.g. "2/3 approved")
- **Vesting UI**: Visual timeline with cliff marker + unlock progress bar
- **ENS display**: Show ENS names everywhere instead of raw addresses
- **AI assistant panel**: Slide-in panel on dashboard for NL queries
- **Data tables**: ShadCN Table + sorting/filtering
- **Loading states**: Skeleton loaders, progress indicators for payroll execution
- **Charts**: Recharts for burn rate, payroll history, runway projection

---

## 12. Implementation Timeline (48 hours)

### Phase 1: Foundation (Hours 0-5)
- [ ] MongoDB Atlas cluster + Mongoose models + connection utility
- [ ] Privy setup (PrivyProvider, app ID, server-auth verification)
- [ ] Unlink client factory + mnemonic encryption
- [ ] ENS resolver utility
- [ ] Claude API client setup
- [ ] Rebrand landing page to Warden

### Phase 2: Auth & Org Setup (Hours 5-9)
- [ ] Privy login page (email OTP, Google, wallet connect)
- [ ] Post-login onboarding flow (create org or accept invite)
- [ ] Org creation with type toggle (Team / DAO)
- [ ] Employee invite flow with ENS support
- [ ] Auth middleware (verify Privy token on API routes)
- [ ] Role-based routing (admin -> /dashboard, employee -> /portal)

### Phase 3: Admin Core (Hours 9-16)
- [ ] Dashboard overview (treasury, runway, upcoming payroll)
- [ ] Employee management (list, invite, edit, departments)
- [ ] Treasury (balance, deposit, withdraw)
- [ ] Department management

### Phase 4: Payroll Engine (Hours 16-22)
- [ ] Payroll preview + AI anomaly check
- [ ] Multi-recipient Unlink execution
- [ ] DAO approval flow (submit → approve → execute)
- [ ] Payroll history + detail view

### Phase 5: AI Features (Hours 22-28)
- [ ] Budget forecaster + runway chart
- [ ] Anomaly detection integration on payroll run
- [ ] AI payslip generation + PDF download
- [ ] Natural language query panel

### Phase 6: Employee Portal (Hours 28-34)
- [ ] Employee dashboard (balance, payments, vesting)
- [ ] Payment history + payslip downloads
- [ ] Vesting tracker with visual timeline
- [ ] Withdraw flow (supports ENS name input)

### Phase 7: Vesting (Hours 34-38)
- [ ] Admin vesting schedule creation
- [ ] Cliff + linear unlock logic
- [ ] Auto-release via Unlink on unlock date

### Phase 8: Polish & Deploy (Hours 38-48)
- [ ] Email notifications via Resend
- [ ] Error handling + edge cases
- [ ] Loading states everywhere
- [ ] Mobile responsive tweaks
- [ ] Deploy to Vercel + MongoDB Atlas
- [ ] End-to-end demo testing
- [ ] Demo script preparation

---

## 13. Key Hackathon Differentiators

1. **Real ZK privacy**: Actual zero-knowledge proofs via Unlink — not just encrypted DB fields
2. **AI anomaly detection**: Every payroll run is scanned before execution — catches errors before money moves
3. **AI budget intelligence**: Runway projections and burn rate forecasting built in
4. **ENS-native UX**: Pay `yashu.eth` not `0x1234...` — human identity layer throughout
5. **DAO + Team in one**: Same product serves Web3-native DAOs and regular crypto startups
6. **Vesting built-in**: Token vesting with cliff + linear unlock, privately settled via Unlink
7. **AI payslips**: Professional PDF payslips generated per payment — no on-chain exposure
8. **Production-grade UI**: ShadCN + dark theme, not a hackathon-looking app

---

## 14. Bounties Targeted

| Sponsor | Track | Why it fits |
|---------|-------|-------------|
| **Unlink** | Best Private Application — $3,000 | Core privacy layer — payroll, multi-recipient, withdraw |
| **ENS** | Best ENS Integration for AI Agents / Most Creative — $2,500 | ENS as identity layer for employees and contributors throughout the product |

**Realistic total: ~$5,500**

---

## 15. Demo Flow (for judges)

1. Show landing page — Warden branding, privacy messaging
2. Admin signs up, creates org "Acme Corp" (Team mode)
3. Admin deposits test USDC into privacy pool
4. Admin invites 3 employees — one by ENS name (`alice.eth`), two by email
5. Employees accept invites and sign up
6. Admin runs payroll → AI anomaly check passes → preview screen → confirm
7. Unlink executes multi-recipient private transfer
8. Show on-chain: **nothing visible** about who got what
9. Employee logs in → sees balance → downloads AI-generated PDF payslip
10. Employee withdraws to their EVM wallet
11. Switch to DAO mode demo: payroll proposal → approver signs → executes privately
12. Show AI budget forecast: burn rate chart + runway projection
13. Highlight: full Gusto-like payroll experience, complete on-chain privacy

---

*Built for ETHGlobal Pragma Cannes — April 2026*
*Powered by Unlink Protocol on Base Sepolia*
