"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowLeft } from "lucide-react";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "how-it-works", label: "How It Works" },
  { id: "onboarding", label: "Onboarding" },
  { id: "treasury", label: "Treasury & Deposits" },
  { id: "payroll", label: "Running Payroll" },
  { id: "earn", label: "Earn (Yield Vault)" },
  { id: "vesting", label: "Token Vesting" },
  { id: "withdrawals", label: "Withdrawals" },
  { id: "privacy", label: "Privacy & Security" },
  { id: "architecture", label: "Architecture" },
];

export default function DocsPage() {
  const [active, setActive] = useState("overview");
  const [mobileNav, setMobileNav] = useState(false);

  const scrollTo = (id: string) => {
    setActive(id);
    setMobileNav(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNav(!mobileNav)} className="lg:hidden p-1.5">
              {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-semibold text-lg">Warden Docs</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Launch App
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          ${mobileNav ? "fixed inset-0 top-14 z-30 bg-white dark:bg-zinc-950" : "hidden"}
          lg:block lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-64 lg:shrink-0
          border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto
        `}>
          <nav className="p-4 space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  active === s.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 px-6 lg:px-16 py-10 max-w-4xl">
          <div className="prose prose-zinc dark:prose-invert max-w-none
            prose-headings:scroll-mt-20
            prose-h1:text-3xl prose-h1:font-bold prose-h1:tracking-tight
            prose-h2:text-2xl prose-h2:font-semibold prose-h2:tracking-tight prose-h2:border-b prose-h2:border-zinc-200 prose-h2:dark:border-zinc-800 prose-h2:pb-2
            prose-h3:text-lg prose-h3:font-semibold
            prose-p:leading-7 prose-p:text-zinc-600 prose-p:dark:text-zinc-400
            prose-li:text-zinc-600 prose-li:dark:text-zinc-400
            prose-strong:text-zinc-900 prose-strong:dark:text-zinc-100
            prose-code:text-sm prose-code:bg-zinc-100 prose-code:dark:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          ">

            {/* ─── Overview ─── */}
            <section id="overview">
              <h1>Warden</h1>
              <p className="text-xl text-zinc-500 dark:text-zinc-400 !mt-2">
                Private payroll infrastructure for organizations. Pay your team without exposing salaries, amounts, or wallet addresses on-chain.
              </p>

              <div className="not-prose grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
                {[
                  { title: "Private Payments", desc: "Salaries are transferred through a zero-knowledge privacy pool. No one can see who paid whom or how much." },
                  { title: "Yield on Idle Funds", desc: "Treasury funds earn yield in DeFi vaults while waiting to be distributed, all without leaving the privacy layer." },
                  { title: "Token Vesting", desc: "Set up cliff-based vesting schedules. Tokens vest linearly and are released privately to employees." },
                ].map((c) => (
                  <div key={c.title} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                    <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{c.title}</div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ─── How It Works ─── */}
            <section id="how-it-works" className="pt-12">
              <h2>How It Works</h2>
              <p>
                Warden combines <strong>on-chain smart contracts</strong> with <strong>Unlink&apos;s zero-knowledge privacy pool</strong> to make payroll completely private. Here&apos;s the high-level flow:
              </p>

              {/* Mermaid-style diagram as styled divs */}
              <div className="not-prose my-8 overflow-x-auto">
                <div className="flex items-center gap-3 min-w-[600px]">
                  <FlowBox label="Employer" sub="Deposits USDC" />
                  <Arrow />
                  <FlowBox label="Privacy Pool" sub="ZK-shielded balance" accent />
                  <Arrow />
                  <FlowBox label="Private Transfer" sub="No public trace" accent />
                  <Arrow />
                  <FlowBox label="Employee" sub="Receives funds" />
                </div>
              </div>

              <h3>The Privacy Model</h3>
              <p>
                Traditional payroll on a blockchain is fully transparent &mdash; anyone can see every transfer, every salary, every wallet. Warden solves this using a <strong>privacy pool</strong>:
              </p>
              <ol>
                <li><strong>Deposit</strong> &mdash; USDC enters the privacy pool and becomes shielded. The deposit transaction is public, but once inside the pool, the funds are indistinguishable.</li>
                <li><strong>Transfer</strong> &mdash; Inside the pool, funds move between accounts using zero-knowledge proofs. No external observer can see the sender, recipient, or amount.</li>
                <li><strong>Withdraw</strong> &mdash; When an employee withdraws, USDC exits the pool to their wallet. The withdrawal is public, but it cannot be linked back to the original deposit or the employer.</li>
              </ol>

              <div className="not-prose my-8 overflow-x-auto">
                <div className="flex items-start gap-3 min-w-[700px]">
                  <FlowBox label="Public" sub="Deposit $10,000" />
                  <Arrow />
                  <div className="flex-1 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-4 text-center">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Zero-Knowledge Privacy Pool</div>
                    <div className="flex items-center justify-center gap-3">
                      <MiniBox label="$2,000" />
                      <MiniBox label="$3,500" />
                      <MiniBox label="$4,500" />
                    </div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">Transfers are invisible to outside observers</div>
                  </div>
                  <Arrow />
                  <FlowBox label="Public" sub="Withdraw $3,500" />
                </div>
              </div>

              <p>
                The key insight: <strong>deposits and withdrawals are unlinkable</strong>. Even though both are visible on-chain, zero-knowledge proofs ensure no one can connect a specific withdrawal to a specific deposit.
              </p>
            </section>

            {/* ─── Onboarding ─── */}
            <section id="onboarding" className="pt-12">
              <h2>Onboarding</h2>

              <h3>For Employers</h3>
              <ol>
                <li><strong>Sign up</strong> with email, Google, or a wallet (MetaMask, etc.)</li>
                <li><strong>Create your organization</strong> &mdash; set a name and choose between a Team or DAO structure</li>
                <li>A <strong>privacy pool account</strong> is automatically generated for your organization</li>
                <li>Start inviting employees via email invite links</li>
              </ol>

              <h3>For Employees</h3>
              <ol>
                <li>Receive an <strong>invite link</strong> from your employer</li>
                <li><strong>Sign up</strong> with email, Google, or a wallet</li>
                <li>Complete your profile (name, wallet address for withdrawals)</li>
                <li>A <strong>private account</strong> is automatically created for receiving payments</li>
              </ol>

              <div className="not-prose my-8 overflow-x-auto">
                <div className="flex items-center gap-3 min-w-[500px]">
                  <FlowBox label="Invite Link" sub="Employer creates" />
                  <Arrow />
                  <FlowBox label="Employee Signs Up" sub="Email or wallet" />
                  <Arrow />
                  <FlowBox label="Profile Setup" sub="Name & wallet" />
                  <Arrow />
                  <FlowBox label="Ready" sub="Can receive pay" accent />
                </div>
              </div>
            </section>

            {/* ─── Treasury ─── */}
            <section id="treasury" className="pt-12">
              <h2>Treasury &amp; Deposits</h2>
              <p>
                The treasury is your organization&apos;s <strong>private balance</strong>. Before you can run payroll, you need to deposit USDC into the privacy pool.
              </p>

              <h3>How Deposits Work</h3>
              <ol>
                <li>Navigate to <strong>Treasury</strong> in the dashboard</li>
                <li>Click <strong>Deposit</strong> and enter the amount</li>
                <li>USDC is transferred from your connected wallet</li>
                <li>The funds enter the <strong>Unlink privacy pool</strong> and become shielded</li>
                <li>Your privacy pool balance updates within ~1-2 minutes</li>
              </ol>

              <div className="not-prose my-8 overflow-x-auto">
                <div className="flex items-center gap-3 min-w-[500px]">
                  <FlowBox label="Your Wallet" sub="USDC (Base Sepolia)" />
                  <Arrow label="Transfer" />
                  <FlowBox label="Relay Wallet" sub="Intermediate step" />
                  <Arrow label="Approve + Deposit" />
                  <FlowBox label="Privacy Pool" sub="Shielded balance" accent />
                </div>
              </div>

              <h3>Withdrawals</h3>
              <p>
                You can withdraw USDC from the privacy pool back to any EVM wallet address at any time. The withdrawal is processed via a zero-knowledge proof and takes ~1-2 minutes.
              </p>
            </section>

            {/* ─── Payroll ─── */}
            <section id="payroll" className="pt-12">
              <h2>Running Payroll</h2>
              <p>
                Payroll is the core feature of Warden. Every payment happens inside the privacy pool, so <strong>no one outside your organization can see salary amounts or recipients</strong>.
              </p>

              <h3>Step-by-Step</h3>
              <ol>
                <li>Go to <strong>Payroll</strong> in the dashboard</li>
                <li>Select the employees to include in this pay run</li>
                <li>Review the amounts (pulled from each employee&apos;s configured salary)</li>
                <li>Click <strong>Run Payroll</strong></li>
                <li>Warden generates zero-knowledge proofs and executes private transfers</li>
                <li>Each employee&apos;s private balance is credited within ~2-3 minutes</li>
              </ol>

              <div className="not-prose my-8 overflow-x-auto">
                <div className="flex items-center gap-3 min-w-[600px]">
                  <FlowBox label="Treasury Pool" sub="$50,000 USDC" />
                  <Arrow label="ZK Transfer" />
                  <div className="space-y-2">
                    <MiniBox label="Alice: $5,000" wide />
                    <MiniBox label="Bob: $4,200" wide />
                    <MiniBox label="Carol: $6,800" wide />
                  </div>
                </div>
              </div>

              <h3>What Employees See</h3>
              <p>
                Employees see their balance update in the <strong>Portal</strong>. They can view payment history and withdraw to their personal wallet at any time. They never see other employees&apos; salaries or the organization&apos;s total treasury.
              </p>

              <h3>For DAOs</h3>
              <p>
                If your organization is set up as a DAO, payroll runs require <strong>multi-sig approval</strong> from configured approvers before execution.
              </p>
            </section>

            {/* ─── Earn ─── */}
            <section id="earn" className="pt-12">
              <h2>Earn (Yield Vault)</h2>
              <p>
                Idle funds sitting in the privacy pool don&apos;t earn anything. The <strong>Earn</strong> feature lets you put those funds to work in a DeFi yield vault &mdash; all while maintaining privacy.
              </p>

              <h3>How It Works</h3>
              <ol>
                <li>Go to <strong>Earn</strong> in the dashboard or portal</li>
                <li>Enter the amount to deposit into the yield vault</li>
                <li>Behind the scenes, Warden creates a <strong>disposable wallet (Burner Wallet)</strong></li>
                <li>Funds are privately withdrawn from the pool to the burner</li>
                <li>The burner deposits USDC into the vault smart contract</li>
                <li>You receive <strong>lpUSD</strong> tokens as proof of deposit</li>
              </ol>

              <div className="not-prose my-8 overflow-x-auto">
                <div className="flex items-center gap-3 min-w-[700px]">
                  <FlowBox label="Privacy Pool" sub="Your balance" />
                  <Arrow label="Private withdraw" />
                  <FlowBox label="Burner Wallet" sub="Disposable EOA" accent />
                  <Arrow label="Deposit" />
                  <FlowBox label="Yield Vault" sub="EarnVault contract" />
                  <Arrow label="Receive" />
                  <FlowBox label="lpUSD" sub="Proof of deposit" />
                </div>
              </div>

              <h3>Why Burner Wallets?</h3>
              <p>
                A <strong>burner wallet</strong> is a temporary, disposable Ethereum account. It exists only to interact with the DeFi vault on your behalf. This way:
              </p>
              <ul>
                <li>Your main wallet or identity is never exposed to the vault contract</li>
                <li>The burner cannot be traced back to your privacy pool account</li>
                <li>After the interaction, the burner&apos;s private key is encrypted and stored securely</li>
                <li>When you withdraw, the same burner is restored to redeem your lpUSD</li>
              </ul>

              <h3>Withdrawing from the Vault</h3>
              <ol>
                <li>Click <strong>Withdraw</strong> on the Earn page</li>
                <li>The stored burner wallet is restored</li>
                <li>lpUSD is burned, USDC is returned to the burner</li>
                <li>The burner deposits USDC back into the privacy pool</li>
                <li>Your pool balance increases &mdash; funds are private again</li>
              </ol>

              <div className="not-prose my-8 overflow-x-auto">
                <div className="flex items-center gap-3 min-w-[700px]">
                  <FlowBox label="lpUSD" sub="Burn tokens" />
                  <Arrow />
                  <FlowBox label="Burner Wallet" sub="Gets USDC back" accent />
                  <Arrow label="Permit2 + Deposit" />
                  <FlowBox label="Privacy Pool" sub="Balance restored" />
                </div>
              </div>
            </section>

            {/* ─── Vesting ─── */}
            <section id="vesting" className="pt-12">
              <h2>Token Vesting</h2>
              <p>
                Warden supports <strong>cliff-based linear vesting</strong> for employee token grants. Vested tokens are released privately through the same zero-knowledge pool.
              </p>

              <h3>Creating a Vesting Schedule</h3>
              <ol>
                <li>Go to <strong>Vesting</strong> in the dashboard</li>
                <li>Select an employee and configure:
                  <ul>
                    <li><strong>Total amount</strong> &mdash; total tokens to vest</li>
                    <li><strong>Cliff period</strong> &mdash; months before any tokens vest (e.g., 12 months)</li>
                    <li><strong>Vesting period</strong> &mdash; total duration over which tokens vest (e.g., 48 months)</li>
                    <li><strong>Start date</strong></li>
                  </ul>
                </li>
                <li>Click <strong>Create</strong></li>
              </ol>

              <h3>How Vesting Works</h3>
              <div className="not-prose my-8 p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-4">Example: 48,000 USDC over 48 months with 12-month cliff</div>
                <div className="relative h-8 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium">
                    Cliff (12mo)
                  </div>
                  <div className="absolute left-1/4 top-0 bottom-0 right-0 bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-xs font-medium text-white dark:text-zinc-900">
                    Linear vesting (36mo)
                  </div>
                </div>
                <div className="flex justify-between mt-3 text-xs text-zinc-500">
                  <span>Month 0: $0 vested</span>
                  <span>Month 12: $12,000 vested</span>
                  <span>Month 48: $48,000 fully vested</span>
                </div>
              </div>

              <ul>
                <li><strong>Before cliff</strong>: No tokens are vested. If the employee leaves, nothing is owed.</li>
                <li><strong>At cliff</strong>: A proportional amount vests immediately (12/48 = 25% in the example).</li>
                <li><strong>After cliff</strong>: Tokens vest linearly each month (1/48 of total per month).</li>
              </ul>

              <h3>Releasing Vested Tokens</h3>
              <p>
                Admins can release vested tokens at any time by clicking <strong>Release</strong> on the vesting schedule. Only the amount that has vested (minus already released) will be transferred privately to the employee&apos;s account.
              </p>
            </section>

            {/* ─── Withdrawals ─── */}
            <section id="withdrawals" className="pt-12">
              <h2>Withdrawals</h2>
              <p>
                Both employers and employees can withdraw USDC from the privacy pool to any Ethereum wallet address.
              </p>

              <h3>For Employees</h3>
              <ol>
                <li>Go to <strong>Withdraw</strong> in the portal</li>
                <li>Enter the amount and destination wallet address</li>
                <li>A zero-knowledge proof is generated</li>
                <li>USDC appears in your wallet within ~1-2 minutes</li>
              </ol>

              <h3>For Employers</h3>
              <ol>
                <li>Go to <strong>Treasury</strong> in the dashboard</li>
                <li>Click <strong>Withdraw</strong>, enter amount and destination</li>
                <li>Funds exit the privacy pool to the specified address</li>
              </ol>

              <div className="not-prose my-8 overflow-x-auto">
                <div className="flex items-center gap-3 min-w-[500px]">
                  <FlowBox label="Privacy Pool" sub="Shielded balance" accent />
                  <Arrow label="ZK Proof" />
                  <FlowBox label="Relayer" sub="Processes withdrawal" />
                  <Arrow label="On-chain" />
                  <FlowBox label="Your Wallet" sub="USDC received" />
                </div>
              </div>

              <p>
                <strong>Important</strong>: Withdrawals cannot be linked to deposits. An observer sees USDC leaving the pool to your address, but cannot determine where it originally came from or who sent it.
              </p>
            </section>

            {/* ─── Privacy ─── */}
            <section id="privacy" className="pt-12">
              <h2>Privacy &amp; Security</h2>

              <h3>What Is Private</h3>
              <div className="not-prose my-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    "Salary amounts",
                    "Who pays whom",
                    "Employee wallet addresses (within the pool)",
                    "Total payroll spend",
                    "Individual payment history",
                    "Yield vault deposits (via burner wallets)",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="text-green-600 dark:text-green-400 mt-0.5">&#10003;</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <h3>What Is Visible On-Chain</h3>
              <div className="not-prose my-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    "Total amount deposited into the pool (by any address)",
                    "Total amount withdrawn from the pool (to any address)",
                    "Vault TVL (total locked in yield vault)",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="text-zinc-400 dark:text-zinc-500 mt-0.5">&#9679;</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <h3>Security Measures</h3>
              <ul>
                <li><strong>Encrypted keys</strong> &mdash; All private keys and mnemonics are encrypted with AES-256-GCM before storage</li>
                <li><strong>Privy authentication</strong> &mdash; Login via email, Google, or wallet with Privy&apos;s enterprise-grade auth</li>
                <li><strong>Burner wallets</strong> &mdash; DeFi interactions use disposable wallets that are destroyed after use</li>
                <li><strong>Role-based access</strong> &mdash; Admins and employees have strictly separated permissions</li>
                <li><strong>Audit logs</strong> &mdash; Every treasury operation is logged with timestamps and user attribution</li>
              </ul>
            </section>

            {/* ─── Architecture ─── */}
            <section id="architecture" className="pt-12">
              <h2>Architecture</h2>

              <div className="not-prose my-8 p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-6">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">System Overview</div>

                <div className="grid grid-cols-3 gap-4">
                  <ArchBlock title="Frontend" items={["Next.js 14 (App Router)", "Privy Auth (email/wallet)", "Tailwind CSS + shadcn/ui"]} />
                  <ArchBlock title="Backend" items={["Next.js API Routes", "MongoDB (Mongoose)", "Unlink SDK (Node.js worker)"]} />
                  <ArchBlock title="Blockchain" items={["Base Sepolia (L2)", "EarnVault (Solidity)", "Unlink Privacy Pool"]} />
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Data Flow</div>
                  <div className="flex items-center gap-3 overflow-x-auto min-w-[600px]">
                    <FlowBox label="User" sub="Browser" />
                    <Arrow />
                    <FlowBox label="Next.js API" sub="Auth + Business Logic" />
                    <Arrow />
                    <FlowBox label="Unlink Worker" sub="SDK Operations" accent />
                    <Arrow />
                    <FlowBox label="Base Sepolia" sub="On-chain Settlement" />
                  </div>
                </div>
              </div>

              <h3>Smart Contracts</h3>
              <div className="not-prose my-6 space-y-3">
                {[
                  { name: "EarnVault", addr: "0xe61Ca5eA39a41959b4F5747aA4596837b20fEB6C", desc: "Deposit USDC, receive lpUSD 1:1. Burn lpUSD to redeem." },
                  { name: "TreasuryFactory", addr: "0xbCb4DbEB0c386D1ab35f953FD72C823595130204", desc: "Deploys per-org treasury contracts via CREATE2." },
                  { name: "USDC", addr: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", desc: "Circle USDC on Base Sepolia testnet." },
                ].map((c) => (
                  <div key={c.name} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{c.name}</span>
                      <code className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded">{c.addr.slice(0, 6)}...{c.addr.slice(-4)}</code>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{c.desc}</p>
                  </div>
                ))}
              </div>

              <h3>Key Technologies</h3>
              <ul>
                <li><strong>Unlink Protocol</strong> &mdash; Zero-knowledge privacy pool for shielded token transfers</li>
                <li><strong>Privy</strong> &mdash; Web3 authentication supporting email, social login, and wallet connections</li>
                <li><strong>Base (Coinbase L2)</strong> &mdash; Low-cost Ethereum L2 for fast, cheap transactions</li>
                <li><strong>Viem</strong> &mdash; TypeScript library for Ethereum interactions</li>
                <li><strong>Permit2</strong> &mdash; Uniswap&apos;s token approval protocol for secure vault deposits</li>
              </ul>
            </section>

            <div className="pt-16 pb-8 border-t border-zinc-200 dark:border-zinc-800 mt-16">
              <p className="text-sm text-zinc-400 text-center">
                Built during a hackathon. Deployed on Base Sepolia testnet.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Diagram Components ─── */

function FlowBox({ label, sub, accent }: { label: string; sub: string; accent?: boolean }) {
  return (
    <div className={`shrink-0 rounded-xl px-4 py-3 text-center border ${
      accent
        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
    }`}>
      <div className={`text-sm font-medium ${accent ? "" : "text-zinc-900 dark:text-zinc-100"}`}>{label}</div>
      <div className={`text-xs mt-0.5 ${accent ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"}`}>{sub}</div>
    </div>
  );
}

function MiniBox({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 ${wide ? "w-full text-center" : ""}`}>
      {label}
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      {label && <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{label}</span>}
      <div className="w-8 h-px bg-zinc-300 dark:bg-zinc-700 relative">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[5px] border-l-zinc-300 dark:border-l-zinc-700 border-y-[3px] border-y-transparent" />
      </div>
    </div>
  );
}

function ArchBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{title}</div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-xs text-zinc-500 dark:text-zinc-400">{item}</li>
        ))}
      </ul>
    </div>
  );
}
