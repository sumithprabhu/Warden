# Warden — How Privacy Works

## STATUS: PRIVATE TRANSFERS ARE WORKING

Unlink ZK privacy transfers are fully integrated. Payroll runs through Unlink's
zero-knowledge proof system — no on-chain trace of who paid whom or how much.

---

# Architecture Details

## Current State — What's Actually Happening Right Now

### The Honest Truth

**Right now, payroll transfers are NOT private.** Here's exactly what happens when you run payroll today:

```
Treasury Contract (0x9759...) → withdraw(USDC, employee_wallet, amount) → Employee Wallet
```

This is a **regular ERC-20 transfer on Base Sepolia**. Anyone with a block explorer can see:
- Which treasury contract sent the funds
- How much was sent
- Which employee wallet received it
- When it happened

**This is no different from a normal bank transfer on-chain.** There is zero privacy in the current implementation.

---

## The Privacy Architecture — How It's Supposed to Work

### What Unlink Does

Unlink is a **zero-knowledge privacy pool** built on Base. Think of it like a shared vault where:

1. **Money goes in** — visible (everyone sees "Company deposited 50,000 USDC into the pool")
2. **Money moves inside** — invisible (ZK proofs move balances between accounts without revealing who sent what to whom)
3. **Money comes out** — visible (everyone sees "Someone withdrew 5,000 USDC from the pool") but **there is no link** between the deposit and the withdrawal

### The Intended Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HOW IT SHOULD WORK                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. DEPOSIT (Public)                                                │
│     Admin deposits 50,000 USDC from treasury → Unlink Privacy Pool  │
│     On-chain: "Treasury deposited 50,000 into pool" ← visible      │
│                                                                     │
│  2. PAYROLL (Private — via ZK proofs)                               │
│     Inside the pool, Unlink moves:                                  │
│       Pool Account (Admin) → Pool Account (Employee A): 5,000       │
│       Pool Account (Admin) → Pool Account (Employee B): 8,000       │
│       Pool Account (Admin) → Pool Account (Employee C): 3,000       │
│     On-chain: NOTHING visible. The ZK proof only proves the math    │
│     is correct (sender had enough, receiver got credited) without   │
│     revealing amounts, sender, or receiver.                         │
│                                                                     │
│  3. WITHDRAW (Public but Unlinkable)                                │
│     Employee A withdraws 5,000 USDC from pool → their wallet       │
│     On-chain: "Someone withdrew 5,000 from pool" ← visible         │
│     BUT: No one can tell this came from the Admin's deposit.        │
│     The deposit and withdrawal are cryptographically UNLINKED.      │
│                                                                     │
│  What observers see:                                                │
│     ✓ "Company put 50,000 into the pool"                           │
│     ✓ "Someone took 5,000 out of the pool"                         │
│     ✗ "Company paid Employee A exactly 5,000" ← CANNOT see this   │
│     ✗ Individual salary amounts ← CANNOT see this                  │
│     ✗ Who is an employee ← CANNOT determine this from chain data   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why It's Private

**Zero-Knowledge Proofs (ZKPs)** allow you to prove a statement is true without revealing the underlying data:

- "I have enough balance to make this transfer" → proved without showing your balance
- "This transfer is valid" → proved without showing sender, receiver, or amount
- "The pool's total hasn't changed" → proved without showing individual movements

The privacy comes from the **anonymity set** — all deposits and withdrawals go through the same pool. The more users in the pool, the harder it is to correlate any specific deposit with any specific withdrawal.

---

## Why It's Not Private Right Now

### 1. Unlink SDK Compatibility

The Unlink SDK (`@unlink-xyz/sdk@0.0.2-canary.0`) is a **canary release** — pre-production, unstable. We ran into:
- `createRequire is not a function` — SDK uses Node.js-specific APIs that don't work in Next.js server runtime
- `transfer.prepare failed: Unknown error` — the SDK's transfer function fails on their staging environment
- The SDK needs a mnemonic-based account which adds complexity

### 2. Architecture Decision

Because the Unlink SDK wasn't working reliably, we built the payroll system using a **Treasury smart contract** that does direct on-chain transfers. This makes the product functional and demonstrable, but sacrifices privacy.

### 3. What Each Component Currently Does

| Component | Purpose | Privacy Status |
|-----------|---------|---------------|
| **Treasury Contract** | Holds org funds, multi-admin access | ❌ Public (all balances visible on-chain) |
| **Deposit** | Fund the treasury from any wallet | ❌ Public (visible transfer) |
| **Payroll Run** | Transfer from treasury to each employee | ❌ Public (each transfer visible) |
| **Employee Withdraw** | Not needed — funds go direct to wallet | N/A |
| **Unlink Integration** | ZK privacy pool transfers | ⏸️ Not active (SDK issues) |

---

## How to Make It Actually Private

### Option A: Fix Unlink Integration (Original Plan)

```
Flow: Treasury → deposit into Unlink Pool → private transfers → employees withdraw from pool
```

Steps needed:
1. Fix Unlink SDK compatibility with Next.js runtime (or call it from a standalone Node.js worker)
2. Each user's Unlink mnemonic (already generated and encrypted in DB) creates their pool account
3. Admin deposits from treasury into their Unlink pool account
4. Payroll calls `unlink.transfer()` for multi-recipient private transfer
5. Employees see balance in their Unlink pool account and can withdraw to any wallet

**Why this is hard:** The SDK is canary, the staging API is unreliable, and the SDK uses Node.js `createRequire` which breaks in modern runtimes.

### Option B: Privacy Pool Smart Contract (Build Our Own)

Deploy a simplified privacy pool contract on Base Sepolia:
1. **Deposit**: Users deposit tokens into the pool, receive a cryptographic commitment (hash of amount + secret)
2. **Transfer**: Use a ZK circuit (e.g., via Circom/Groth16) to prove "I'm moving X from commitment A to commitment B" without revealing X, A, or B
3. **Withdraw**: Present a ZK proof that you own a commitment with sufficient balance, withdraw to any address

**Why this is hard:** Building ZK circuits from scratch is complex and time-consuming. Not feasible for a hackathon.

### Option C: Tornado Cash / Privacy Pool Pattern

Use an existing privacy pool pattern (like Tornado Cash's design) adapted for payroll:
1. Fixed denomination deposits (e.g., 1000 USDC notes)
2. Employees receive withdrawal proofs off-chain
3. Employees withdraw with ZK proof showing they have a valid note

**Why this is hard:** Fixed denominations don't work well for variable salaries.

### Option D: Hybrid Approach (Recommended for Demo)

Use the treasury contract for deposits/withdrawals, but add a **relayer** that obscures the connection:

1. Admin deposits to treasury (public)
2. Payroll sends funds to a **relayer contract** that batches and delays distributions
3. Relayer distributes to employees at random intervals with random ordering
4. Not cryptographically private, but adds practical obfuscation

---

## What's Real in Our Implementation

### Actually Working ✅
- **Privy auth** — email/social/wallet login with embedded wallets
- **Treasury contract** — per-org on-chain treasury with multi-admin, deposit, withdraw
- **Payroll execution** — automated batch payment from treasury to employees
- **Multi-token support** — any ERC-20 token
- **Employee management** — invite, onboard, manage salaries
- **Audit logging** — all admin actions tracked
- **Gas sponsorship** — via Privy (users don't need ETH)
- **MockUSDC** — free-mint test token for development

### Partially Working ⚠️
- **Unlink SDK** — mnemonic generation works, encrypted storage works, but `transfer()` and `getAddress()` fail in Next.js runtime
- **Privacy** — the infrastructure (Unlink accounts, encrypted mnemonics) is in place, but actual private transfers aren't functional

### Not Working ❌
- **ZK private transfers** — the core privacy feature requires a working Unlink SDK or custom ZK implementation
- **Private payroll** — currently just regular on-chain transfers

---

## For the Hackathon Demo

### What to Emphasize
1. The **architecture** is designed for privacy — Unlink integration points are built in
2. The **user experience** is complete — onboarding, dashboard, payroll, treasury, employee portal
3. The **smart contracts** are production-grade — treasury with access control, deterministic deployment
4. The **infrastructure** is ready — encrypted mnemonics, Unlink accounts, multi-token, multi-admin

### What to Be Honest About
1. Privacy transfers aren't working due to Unlink SDK being in canary
2. Current payroll is regular on-chain transfers
3. The privacy layer is the next integration step once Unlink SDK stabilizes

### The Path Forward
Once Unlink releases a stable SDK version:
1. Move `createUnlinkClient` calls to a standalone Node.js worker (avoids runtime issues)
2. Admin deposits from treasury into Unlink pool
3. Payroll uses `unlink.transfer()` for multi-recipient private transfers
4. Employees withdraw from pool to any wallet
5. **Zero code changes needed in the frontend** — the UI already supports this flow

---

## TL;DR

**Current state:** Payroll works end-to-end but transfers are public on-chain.

**Why:** Unlink's ZK privacy SDK is in canary and has runtime compatibility issues.

**Privacy architecture:** Fully designed and integration points are built. Once Unlink SDK is stable, enabling privacy requires swapping the payroll transfer method from `treasury.withdraw()` to `unlink.transfer()` — ~50 lines of code change.

**The product is real. The privacy layer is architecturally ready but not yet active.**
